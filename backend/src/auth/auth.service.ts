import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { SignJWT } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  OTP_MAX_PER_HOUR,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
  getJwtSecret,
  getOtpHashSecret,
} from './auth.constants.js';
import { OtpDeliveryService } from './otp-delivery.service.js';

type VerifyOutcome =
  | { kind: 'invalid' | 'locked' | 'wrong' | 'blocked' }
  | {
      kind: 'success';
      userId: string;
      sessionId: string;
      refreshToken: string;
    };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpDelivery: OtpDeliveryService,
  ) {}

  async sendOtp(phoneE164: string): Promise<{ message: string; expiresIn: number }> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const [recentCount, latest] = await Promise.all([
      this.prisma.otpChallenge.count({
        where: { phoneE164, createdAt: { gte: hourAgo } },
      }),
      this.prisma.otpChallenge.findFirst({
        where: { phoneE164 },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    if (recentCount >= OTP_MAX_PER_HOUR) {
      throw new HttpException(
        'تجاوزت عدد طلبات رمز التحقق المسموح بها',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (
      latest &&
      now.getTime() - latest.createdAt.getTime() <
        OTP_RESEND_COOLDOWN_SECONDS * 1000
    ) {
      throw new HttpException(
        'انتظر قليلاً قبل طلب رمز جديد',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(phoneE164, code);
    const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);

    const challenge = await this.prisma.otpChallenge.create({
      data: { phoneE164, codeHash, expiresAt },
      select: { id: true },
    });

    try {
      await this.otpDelivery.sendCode(phoneE164, code, OTP_TTL_SECONDS);
    } catch (error) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      throw error;
    }

    return {
      message: 'تم تجهيز رمز التحقق',
      expiresIn: OTP_TTL_SECONDS,
    };
  }

  async verifyOtp(
    phoneE164: string,
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    user: { id: string; displayName: string; status: string };
  }> {
    const now = new Date();
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = this.hashToken(refreshToken);

    const outcome = await this.prisma.$transaction(async (tx): Promise<VerifyOutcome> => {
      const challenge = await tx.otpChallenge.findFirst({
        where: {
          phoneE164,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: 5 },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!challenge) return { kind: 'invalid' };

      const expectedHash = this.hashOtp(phoneE164, code);
      const expected = Buffer.from(expectedHash, 'hex');
      const actual = Buffer.from(challenge.codeHash, 'hex');

      if (
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      ) {
        await tx.otpChallenge.updateMany({
          where: {
            id: challenge.id,
            consumedAt: null,
            attempts: { lt: 5 },
          },
          data: { attempts: { increment: 1 } },
        });
        return { kind: 'wrong' };
      }

      const consumed = await tx.otpChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: 5 },
        },
        data: { consumedAt: now },
      });

      // Atomic conditional update ensures a valid OTP can establish only one session,
      // even if two verify requests race.
      if (consumed.count !== 1) return { kind: 'invalid' };

      let user = await tx.user.findUnique({
        where: { phoneE164 },
        select: { id: true, status: true },
      });

      if (user && user.status !== 'ACTIVE') {
        return { kind: 'blocked' };
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            phoneE164,
            phoneVerifiedAt: now,
            profile: {
              create: { displayName: 'مستخدم جديد', locale: 'ar' },
            },
          },
          select: { id: true, status: true },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: { phoneVerifiedAt: now },
          select: { id: true, status: true },
        });
      }

      const session = await tx.authSession.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          expiresAt: new Date(
            now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
          ),
          lastUsedAt: now,
        },
        select: { id: true },
      });

      return {
        kind: 'success',
        userId: user.id,
        sessionId: session.id,
        refreshToken,
      };
    });

    if (outcome.kind === 'wrong') {
      throw new UnauthorizedException('رمز التحقق غير صحيح');
    }
    if (outcome.kind === 'blocked') {
      throw new ForbiddenException('هذا الحساب غير متاح');
    }
    if (outcome.kind !== 'success') {
      throw new UnauthorizedException('رمز التحقق منتهي أو غير صالح');
    }

    const accessToken = await this.createAccessToken(
      outcome.userId,
      outcome.sessionId,
    );
    const user = await this.getSafeUser(outcome.userId);

    return {
      accessToken,
      refreshToken: outcome.refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        displayName: user.profile?.displayName ?? 'مستخدم',
        status: user.status,
      },
    };
  }

  async refreshSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
  }> {
    const oldHash = this.hashToken(refreshToken);
    const now = new Date();

    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: oldHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { status: true } },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('الجلسة منتهية أو غير صالحة');
    }

    const nextRefreshToken = randomBytes(48).toString('base64url');
    const nextHash = this.hashToken(nextRefreshToken);
    const nextExpiry = new Date(
      now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const rotated = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: oldHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        refreshTokenHash: nextHash,
        expiresAt: nextExpiry,
        lastUsedAt: now,
      },
    });

    if (rotated.count !== 1) {
      throw new UnauthorizedException('تم استخدام رمز تجديد الجلسة مسبقاً');
    }

    return {
      accessToken: await this.createAccessToken(session.userId, session.id),
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: this.hashToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.getSafeUser(userId);
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('الحساب غير متاح');
    }

    const points = await this.prisma.pointTransaction.aggregate({
      where: { userId },
      _sum: { pointsDelta: true },
    });

    return {
      id: user.id,
      phone: user.phoneE164,
      status: user.status,
      profile: user.profile,
      points: points._sum.pointsDelta ?? 0,
      createdAt: user.createdAt,
    };
  }

  private async getSafeUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneE164: true,
        status: true,
        createdAt: true,
        profile: {
          select: { displayName: true, avatarUrl: true, locale: true },
        },
      },
    });
    if (!user) throw new UnauthorizedException('الحساب غير موجود');
    return user;
  }

  private async createAccessToken(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(getJwtSecret());
  }

  private hashOtp(phone: string, code: string): string {
    return createHmac('sha256', getOtpHashSecret())
      .update(`${phone}:${code}`)
      .digest('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

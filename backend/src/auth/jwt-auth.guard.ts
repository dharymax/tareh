import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import { getJwtSecret } from './auth.constants.js';
import type { AuthenticatedUser } from './current-user.decorator.js';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('رمز الدخول مطلوب');
    }

    try {
      const token = header.slice('Bearer '.length).trim();
      const { payload } = await jwtVerify(token, getJwtSecret(), {
        algorithms: ['HS256'],
      });
      const userId = payload.sub;
      const sessionId = typeof payload.sid === 'string' ? payload.sid : null;

      if (!userId || !sessionId) {
        throw new UnauthorizedException('رمز الدخول غير صالح');
      }

      const session = await this.prisma.authSession.findFirst({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { status: 'ACTIVE' },
        },
        select: { id: true, userId: true },
      });

      if (!session) throw new UnauthorizedException('انتهت الجلسة أو تم إلغاؤها');

      request.user = { userId: session.userId, sessionId: session.id };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('رمز الدخول غير صالح أو منتهي الصلاحية');
    }
  }
}

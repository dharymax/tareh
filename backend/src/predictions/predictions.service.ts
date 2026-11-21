import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type PredictionInput = {
  homeGoals: number;
  awayGoals: number;
};

type LockedMatch = {
  kickoff_at: Date;
  status: string;
  database_now: Date;
};

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, matchId: string, score: PredictionInput) {
    return this.saveBeforeKickoff(userId, matchId, score);
  }

  async update(userId: string, predictionId: string, score: PredictionInput) {
    const existing = await this.prisma.prediction.findFirst({
      where: { id: predictionId, userId },
      select: { id: true, matchId: true },
    });
    if (!existing) throw new NotFoundException('التوقع غير موجود');

    return this.saveBeforeKickoff(userId, existing.matchId, score);
  }

  async listMine(userId: string, limit = 25, cursor?: string) {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const rows = await this.prisma.prediction.findMany({
      where: { userId },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        homeGoals: true,
        awayGoals: true,
        submittedAt: true,
        updatedAt: true,
        match: {
          select: {
            id: true,
            kickoffAt: true,
            status: true,
            homeScore: true,
            awayScore: true,
            league: { select: { id: true, name: true, logoUrl: true } },
            homeTeam: { select: { id: true, name: true, logoUrl: true } },
            awayTeam: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        results: {
          select: {
            points: true,
            resultType: true,
            settledAt: true,
            scoringRule: { select: { version: true } },
          },
          orderBy: { settledAt: 'desc' },
          take: 1,
        },
      },
    });

    const hasMore = rows.length > safeLimit;
    const data = hasMore ? rows.slice(0, safeLimit) : rows;
    return {
      data,
      meta: {
        count: data.length,
        nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
      },
    };
  }

  async getMatchPredictionSummary(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, kickoffAt: true },
    });
    if (!match) throw new NotFoundException('المباراة غير موجودة');

    const totalPredictions = await this.prisma.prediction.count({
      where: { matchId },
    });

    // Aggregate-only: never expose users' exact selections before kickoff.
    return {
      matchId,
      totalPredictions,
      kickoffAt: match.kickoffAt,
    };
  }

  private async saveBeforeKickoff(
    userId: string,
    matchId: string,
    score: PredictionInput,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // Serialize writes against the match row and use the database clock.
        const matches = await tx.$queryRaw<LockedMatch[]>(
          Prisma.sql`SELECT kickoff_at, status, clock_timestamp() AS database_now
            FROM matches
            WHERE id = ${matchId}::uuid
            FOR UPDATE`,
        );

        const match = matches[0];
        if (!match) throw new NotFoundException('المباراة غير موجودة');

        const kickoffAt = new Date(match.kickoff_at);
        const databaseNow = new Date(match.database_now);
        if (match.status !== 'SCHEDULED' || kickoffAt.getTime() <= databaseNow.getTime()) {
          throw new BadRequestException('انتهى وقت التوقع لهذه المباراة');
        }

        return tx.prediction.upsert({
          where: { userId_matchId: { userId, matchId } },
          create: {
            userId,
            matchId,
            homeGoals: score.homeGoals,
            awayGoals: score.awayGoals,
          },
          update: {
            homeGoals: score.homeGoals,
            awayGoals: score.awayGoals,
            updatedAt: databaseNow,
          },
          select: {
            id: true,
            matchId: true,
            homeGoals: true,
            awayGoals: true,
            submittedAt: true,
            updatedAt: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}

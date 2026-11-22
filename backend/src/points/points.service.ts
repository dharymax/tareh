import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { calculatePredictionPoints } from './scoring.js';

type LockedMatch = {
  id: string;
  kickoff_at: Date;
  status: string;
  home_score: number | null;
  away_score: number | null;
  result_confirmed_at: Date | null;
  database_now: Date;
};

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  async finalizeMatch(
    matchId: string,
    actorUserId: string,
    homeScore: number,
    awayScore: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedMatch[]>(Prisma.sql`
        SELECT id, kickoff_at, status, home_score, away_score,
               result_confirmed_at, clock_timestamp() AS database_now
        FROM matches
        WHERE id = ${matchId}::uuid
        FOR UPDATE
      `);

      const match = rows[0];
      if (!match) throw new NotFoundException('المباراة غير موجودة');

      if (['CANCELLED', 'POSTPONED', 'ABANDONED'].includes(match.status)) {
        throw new BadRequestException('لا يمكن اعتماد نتيجة مباراة ملغاة أو متوقفة');
      }

      if (match.status !== 'FINISHED') {
        throw new BadRequestException('يجب أن تكون حالة المباراة منتهية قبل اعتماد النتيجة');
      }

      if (match.kickoff_at.getTime() > match.database_now.getTime()) {
        throw new BadRequestException('لا يمكن اعتماد نتيجة مباراة لم يبدأ موعدها');
      }

      if (match.result_confirmed_at) {
        if (match.home_score === homeScore && match.away_score === awayScore) {
          throw new ConflictException('تم اعتماد نتيجة هذه المباراة مسبقاً');
        }
        throw new ConflictException(
          'المباراة معتمدة مسبقاً؛ تصحيح النتيجة يتطلب إجراء تسوية عكسية مستقلاً',
        );
      }

      const scoringRule = await tx.scoringRule.findFirst({
        where: { isActive: true },
        orderBy: { version: 'desc' },
      });
      if (!scoringRule) {
        throw new BadRequestException('لم يتم إعداد قواعد احتساب النقاط');
      }

      const predictions = await tx.prediction.findMany({
        where: { matchId },
        select: {
          id: true,
          userId: true,
          homeGoals: true,
          awayGoals: true,
        },
        orderBy: { id: 'asc' },
      });

      await tx.match.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          homeScore,
          awayScore,
          resultConfirmedAt: match.database_now,
        },
      });

      let pointsAwarded = 0;
      let exactScores = 0;

      for (const prediction of predictions) {
        const result = calculatePredictionPoints(
          {
            homeGoals: prediction.homeGoals,
            awayGoals: prediction.awayGoals,
          },
          { homeGoals: homeScore, awayGoals: awayScore },
          {
            exactScorePoints: scoringRule.exactScorePoints,
            correctOutcomePoints: scoringRule.correctOutcomePoints,
            correctTotalGoalsPoints: scoringRule.correctTotalGoalsPoints,
          },
        );

        const savedResult = await tx.predictionResult.create({
          data: {
            predictionId: prediction.id,
            scoringRuleId: scoringRule.id,
            points: result.points,
            resultType: result.resultType,
          },
          select: { id: true },
        });

        await tx.pointTransaction.create({
          data: {
            userId: prediction.userId,
            predictionResultId: savedResult.id,
            pointsDelta: result.points,
            reason: 'SETTLEMENT',
            idempotencyKey: `match:${matchId}:prediction:${prediction.id}:rule:${scoringRule.version}`,
          },
        });

        pointsAwarded += result.points;
        if (result.resultType === 'EXACT_SCORE') exactScores += 1;
      }

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'MATCH_RESULT_FINALIZED',
          entityType: 'MATCH',
          entityId: matchId,
          beforeData: {
            status: match.status,
            homeScore: match.home_score,
            awayScore: match.away_score,
          },
          afterData: {
            status: 'FINISHED',
            homeScore,
            awayScore,
            scoringRuleVersion: scoringRule.version,
            settledPredictions: predictions.length,
            pointsAwarded,
          },
        },
      });

      return {
        matchId,
        status: 'FINISHED',
        homeScore,
        awayScore,
        scoringRuleVersion: scoringRule.version,
        settledPredictions: predictions.length,
        exactScores,
        pointsAwarded,
        finalizedAt: match.database_now.toISOString(),
      };
    });
  }
}

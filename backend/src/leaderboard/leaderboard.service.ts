import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { getAdenPeriodRange, type LeaderboardPeriod } from './aden-period.js';

type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  exact_score_count: number;
  first_reached_at: Date | null;
};

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobal(period: LeaderboardPeriod = 'all', limit = 50) {
    const range = period === 'all' ? undefined : getAdenPeriodRange(period);
    return this.queryLeaderboard({ range, limit });
  }

  async getSeason(seasonId: string, limit = 50) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true },
    });
    if (!season) throw new NotFoundException('الموسم غير موجود');
    return this.queryLeaderboard({ seasonId, limit });
  }

  private async queryLeaderboard(input: {
    range?: { start: Date; end: Date };
    seasonId?: string;
    limit: number;
  }) {
    const seasonJoins = input.seasonId
      ? Prisma.sql`
          INNER JOIN predictions p ON p.id = pr.prediction_id
          INNER JOIN matches m ON m.id = p.match_id
        `
      : Prisma.empty;

    const whereClause = input.seasonId
      ? Prisma.sql`WHERE m.season_id = ${input.seasonId}::uuid`
      : input.range
        ? Prisma.sql`WHERE pt.created_at >= ${input.range.start}
                      AND pt.created_at < ${input.range.end}`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<LeaderboardRow[]>(Prisma.sql`
      WITH scoped_transactions AS (
        SELECT
          pt.user_id,
          pt.id,
          pt.points_delta,
          pt.reason::text AS reason,
          pt.created_at,
          pr.result_type::text AS result_type
        FROM point_transactions pt
        INNER JOIN prediction_results pr ON pr.id = pt.prediction_result_id
        ${seasonJoins}
        ${whereClause}
      ),
      totals AS (
        SELECT
          user_id,
          SUM(points_delta)::int AS total_points,
          GREATEST(SUM(
            CASE
              WHEN reason = 'SETTLEMENT' AND result_type = 'EXACT_SCORE' THEN 1
              WHEN reason = 'REVERSAL' AND result_type = 'EXACT_SCORE' THEN -1
              ELSE 0
            END
          ), 0)::int AS exact_score_count
        FROM scoped_transactions
        GROUP BY user_id
      ),
      running AS (
        SELECT
          scoped.user_id,
          scoped.created_at,
          SUM(scoped.points_delta) OVER (
            PARTITION BY scoped.user_id
            ORDER BY scoped.created_at, scoped.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS running_points,
          totals.total_points
        FROM scoped_transactions scoped
        INNER JOIN totals ON totals.user_id = scoped.user_id
      ),
      reached AS (
        SELECT
          user_id,
          MIN(created_at) FILTER (WHERE running_points >= total_points) AS first_reached_at
        FROM running
        GROUP BY user_id
      )
      SELECT
        users.id AS user_id,
        profiles.display_name,
        profiles.avatar_url,
        totals.total_points,
        totals.exact_score_count,
        reached.first_reached_at
      FROM totals
      INNER JOIN users ON users.id = totals.user_id
      LEFT JOIN user_profiles profiles ON profiles.user_id = users.id
      LEFT JOIN reached ON reached.user_id = users.id
      WHERE users.status = 'ACTIVE' AND totals.total_points > 0
      ORDER BY
        totals.total_points DESC,
        totals.exact_score_count DESC,
        reached.first_reached_at ASC NULLS LAST,
        profiles.display_name ASC NULLS LAST,
        users.id ASC
      LIMIT ${input.limit}
    `);

    return {
      data: rows.map((row, index) => ({
        rank: index + 1,
        user: {
          id: row.user_id,
          displayName: row.display_name ?? 'مستخدم طارح',
          avatarUrl: row.avatar_url,
        },
        points: row.total_points,
        exactScorePredictions: row.exact_score_count,
        firstReachedAt: row.first_reached_at?.toISOString() ?? null,
      })),
      meta: { count: rows.length, limit: input.limit },
    };
  }
}

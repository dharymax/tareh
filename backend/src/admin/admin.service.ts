import { Injectable } from '@nestjs/common';
import { MatchStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const { start, end } = this.getYemenTodayRange();

    const [
      totalUsers,
      activeUsers,
      matchesToday,
      liveMatches,
      totalPredictions,
      pendingResultReview,
      latestSync,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.match.count({ where: { kickoffAt: { gte: start, lt: end } } }),
      this.prisma.match.count({
        where: {
          status: {
            in: [MatchStatus.LIVE, MatchStatus.HALF_TIME, MatchStatus.PAUSED],
          },
        },
      }),
      this.prisma.prediction.count(),
      this.prisma.match.count({
        where: {
          status: MatchStatus.FINISHED,
          resultConfirmedAt: null,
        },
      }),
      this.prisma.syncLog.findFirst({
        orderBy: { startedAt: 'desc' },
        select: {
          providerCode: true,
          resourceType: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          recordsRead: true,
          recordsWritten: true,
        },
      }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      matches: {
        today: matchesToday,
        live: liveMatches,
        awaitingResultReview: pendingResultReview,
      },
      predictions: { total: totalPredictions },
      providerSync: latestSync,
      generatedAt: new Date().toISOString(),
    };
  }

  private getYemenTodayRange(): { start: Date; end: Date } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Aden',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const date = `${values.year}-${values.month}-${values.day}`;
    const start = new Date(`${date}T00:00:00+03:00`);

    return {
      start,
      end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    };
  }
}

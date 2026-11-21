import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type MatchListQuery = {
  date?: string;
  leagueId?: string;
  status?: string;
  cursor?: string;
  limit: number;
};

type DateRangeQuery = {
  from?: string;
  to?: string;
  limit: number;
};

const LIVE_STATUSES: MatchStatus[] = [
  MatchStatus.LIVE,
  MatchStatus.HALF_TIME,
  MatchStatus.PAUSED,
];

const SELECT_MATCH = {
  id: true,
  kickoffAt: true,
  status: true,
  homeScore: true,
  awayScore: true,
  resultConfirmedAt: true,
  lastProviderUpdateAt: true,
  league: { select: { id: true, name: true, logoUrl: true } },
  homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
  awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
} satisfies Prisma.MatchSelect;

@Injectable()
export class FootballService {
  constructor(private readonly prisma: PrismaService) {}

  async listLeagues(enabledOnly = true) {
    return this.prisma.league.findMany({
      where: enabledOnly ? { isEnabled: true } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        country: { select: { name: true, iso2: true } },
        seasons: {
          where: { isCurrent: true },
          select: { id: true, name: true, startsOn: true, endsOn: true },
          take: 1,
        },
      },
    });
  }

  async getLeague(leagueId: string) {
    const league = await this.prisma.league.findFirst({
      where: { id: leagueId, isEnabled: true },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        country: { select: { name: true, iso2: true } },
        seasons: {
          orderBy: { startsOn: 'desc' },
          select: { id: true, name: true, startsOn: true, endsOn: true, isCurrent: true },
        },
      },
    });
    if (!league) throw new NotFoundException('البطولة غير موجودة');
    return league;
  }

  async listTeams(query: { leagueId?: string; search?: string }) {
    const search = query.search?.trim();
    return this.prisma.team.findMany({
      where: {
        isEnabled: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(query.leagueId
          ? {
              OR: [
                { homeMatches: { some: { leagueId: query.leagueId } } },
                { awayMatches: { some: { leagueId: query.leagueId } } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
      select: { id: true, name: true, shortName: true, logoUrl: true },
    });
  }

  async listMatches(query: MatchListQuery) {
    const status = this.parseStatus(query.status);
    const range = query.date ? this.parseDate(query.date) : undefined;
    const where: Prisma.MatchWhereInput = {
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(status ? { status } : {}),
      ...(range ? { kickoffAt: { gte: range.start, lt: range.end } } : {}),
    };

    const matches = await this.prisma.match.findMany({
      where,
      select: SELECT_MATCH,
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = matches.length > query.limit;
    const data = hasMore ? matches.slice(0, query.limit) : matches;
    return {
      data,
      meta: {
        nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
        count: data.length,
        lastUpdatedAt: this.latestUpdate(data),
      },
    };
  }

  async listLiveMatches() {
    return this.prisma.match.findMany({
      where: { status: { in: LIVE_STATUSES } },
      select: SELECT_MATCH,
      orderBy: { kickoffAt: 'asc' },
      take: 100,
    });
  }

  async listTodayMatches() {
    const range = this.yemenTodayRange();
    return this.prisma.match.findMany({
      where: { kickoffAt: { gte: range.start, lt: range.end } },
      select: SELECT_MATCH,
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }

  async listUpcomingMatches(query: DateRangeQuery) {
    const now = new Date();
    const from = query.from ? new Date(query.from) : now;
    const to = query.to ? new Date(query.to) : new Date(now.getTime() + 14 * 86400000);
    this.assertValidDate(from, 'from');
    this.assertValidDate(to, 'to');
    if (from >= to) throw new BadRequestException('from must be earlier than to');

    return this.prisma.match.findMany({
      where: {
        kickoffAt: { gte: from, lt: to },
        status: MatchStatus.SCHEDULED,
      },
      select: SELECT_MATCH,
      orderBy: { kickoffAt: 'asc' },
      take: query.limit,
    });
  }

  async getMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        ...SELECT_MATCH,
        season: { select: { id: true, name: true } },
        events: {
          orderBy: [{ minute: 'asc' }, { addedMinute: 'asc' }],
          select: {
            id: true,
            minute: true,
            addedMinute: true,
            eventType: true,
            detail: true,
            team: { select: { id: true, name: true } },
            player: { select: { id: true, name: true } },
          },
        },
        statistics: {
          select: { teamId: true, statisticKey: true, statisticValue: true },
        },
      },
    });
    if (!match) throw new NotFoundException('المباراة غير موجودة');
    return match;
  }

  async getMatchStatistics(matchId: string) {
    const matchExists = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true },
    });
    if (!matchExists) throw new NotFoundException('المباراة غير موجودة');
    return this.prisma.matchStatistic.findMany({
      where: { matchId },
      orderBy: [{ teamId: 'asc' }, { statisticKey: 'asc' }],
      select: {
        teamId: true,
        statisticKey: true,
        statisticValue: true,
        updatedAt: true,
      },
    });
  }

  async getMatchEvents(matchId: string) {
    const matchExists = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true },
    });
    if (!matchExists) throw new NotFoundException('المباراة غير موجودة');
    return this.prisma.matchEvent.findMany({
      where: { matchId },
      orderBy: [{ minute: 'asc' }, { addedMinute: 'asc' }],
      select: {
        id: true,
        minute: true,
        addedMinute: true,
        eventType: true,
        detail: true,
        team: { select: { id: true, name: true } },
        player: { select: { id: true, name: true } },
      },
    });
  }

  private parseStatus(value?: string): MatchStatus | undefined {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    if (!Object.values(MatchStatus).includes(normalized as MatchStatus)) {
      throw new BadRequestException('Invalid match status');
    }
    return normalized as MatchStatus;
  }

  private parseDate(value: string): { start: Date; end: Date } {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new BadRequestException('date must use YYYY-MM-DD');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const start = new Date(`${value}T00:00:00+03:00`);
    this.assertValidDate(start, 'date');
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      throw new BadRequestException('date must be a real calendar date');
    }
    return { start, end: new Date(start.getTime() + 86400000) };
  }

  private yemenTodayRange(): { start: Date; end: Date } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Aden',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
    );
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    return this.parseDate(date);
  }

  private assertValidDate(value: Date, field: string): void {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
  }

  private latestUpdate(rows: Array<{ lastProviderUpdateAt: Date | null }>): string | null {
    const latest = rows.reduce<Date | null>((value, row) => {
      if (!row.lastProviderUpdateAt) return value;
      if (!value || row.lastProviderUpdateAt > value) return row.lastProviderUpdateAt;
      return value;
    }, null);
    return latest?.toISOString() ?? null;
  }
}

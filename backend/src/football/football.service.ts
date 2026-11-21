import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { adenDayRange, currentAdenDateKey, dateRange } from './date-range.js';
import {
  MatchesQueryDto,
  TeamsQueryDto,
  UpcomingMatchesQueryDto,
} from './dto/matches-query.dto.js';

const MATCH_CARD_INCLUDE = {
  league: { select: { id: true, name: true, logoUrl: true } },
  homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
  awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
} satisfies Prisma.MatchInclude;

@Injectable()
export class FootballService {
  constructor(private readonly prisma: PrismaService) {}

  async listLeagues() {
    const data = await this.prisma.league.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
      include: {
        country: { select: { iso2: true, name: true } },
        seasons: {
          where: { isCurrent: true },
          select: { id: true, name: true, startsOn: true, endsOn: true },
          take: 1,
        },
      },
    });
    return { data, meta: { count: data.length, generatedAt: new Date().toISOString() } };
  }

  async getLeague(id: string) {
    const league = await this.prisma.league.findFirst({
      where: { id, isEnabled: true },
      include: {
        country: true,
        seasons: { orderBy: { startsOn: 'desc' } },
      },
    });
    if (!league) throw new NotFoundException('League not found');
    return { data: league };
  }

  async listTeams(query: TeamsQueryDto) {
    const where: Prisma.TeamWhereInput = { isEnabled: true };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.leagueId) {
      where.OR = [
        { homeMatches: { some: { leagueId: query.leagueId } } },
        { awayMatches: { some: { leagueId: query.leagueId } } },
      ];
    }
    const data = await this.prisma.team.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit ?? 50,
      include: { country: { select: { iso2: true, name: true } } },
    });
    return { data, meta: { count: data.length, generatedAt: new Date().toISOString() } };
  }

  async getTeam(id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, isEnabled: true },
      include: { country: true },
    });
    if (!team) throw new NotFoundException('Team not found');
    return { data: team };
  }

  async listMatches(query: MatchesQueryDto) {
    const where: Prisma.MatchWhereInput = {};
    if (query.leagueId) where.leagueId = query.leagueId;
    if (query.status) where.status = query.status as MatchStatus;
    if (query.date) where.kickoffAt = adenDayRange(query.date);

    const rows = await this.prisma.match.findMany({
      where,
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      take: (query.limit ?? 20) + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: MATCH_CARD_INCLUDE,
    });
    const hasMore = rows.length > (query.limit ?? 20);
    const data = hasMore ? rows.slice(0, query.limit ?? 20) : rows;
    const lastUpdatedAt = data.reduce<Date | null>((latest, match) => {
      const value = match.lastProviderUpdateAt;
      return value && (!latest || value > latest) ? value : latest;
    }, null);

    return {
      data,
      meta: {
        limit: query.limit ?? 20,
        hasMore,
        nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
        lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
        timezone: 'Asia/Aden',
      },
    };
  }

  async listLiveMatches() {
    const data = await this.prisma.match.findMany({
      where: { status: { in: [MatchStatus.LIVE, MatchStatus.HALF_TIME, MatchStatus.PAUSED] } },
      orderBy: [{ kickoffAt: 'desc' }, { id: 'asc' }],
      include: MATCH_CARD_INCLUDE,
      take: 100,
    });
    return { data, meta: { count: data.length, timezone: 'Asia/Aden' } };
  }

  async listTodayMatches() {
    const today = currentAdenDateKey();
    const data = await this.prisma.match.findMany({
      where: { kickoffAt: adenDayRange(today) },
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      include: MATCH_CARD_INCLUDE,
      take: 100,
    });
    return { data, meta: { count: data.length, date: today, timezone: 'Asia/Aden' } };
  }

  async listUpcomingMatches(query: UpcomingMatchesQueryDto) {
    const from = query.from ?? currentAdenDateKey();
    const defaultEnd = new Date(adenDayRange(from).gte.getTime() + 7 * 24 * 60 * 60 * 1000);
    const to = query.to ?? currentAdenDateKey(defaultEnd);
    const range = dateRange(from, to);

    const where: Prisma.MatchWhereInput = {
      kickoffAt: range,
      status: { in: [MatchStatus.SCHEDULED, MatchStatus.POSTPONED] },
    };
    if (query.leagueId) where.leagueId = query.leagueId;

    const data = await this.prisma.match.findMany({
      where,
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      include: MATCH_CARD_INCLUDE,
      take: 100,
    });
    return { data, meta: { count: data.length, from, to, timezone: 'Asia/Aden' } };
  }

  async getMatch(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        league: { include: { country: true } },
        season: true,
        homeTeam: true,
        awayTeam: true,
        events: { orderBy: [{ minute: 'asc' }, { addedMinute: 'asc' }] },
        statistics: { include: { team: true } },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    return { data: match, meta: { timezone: 'Asia/Aden' } };
  }

  async getMatchStatistics(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      select: { id: true, statistics: { include: { team: true } } },
    });
    if (!match) throw new NotFoundException('Match not found');
    return { data: match.statistics };
  }

  async getMatchEvents(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      select: { id: true, events: { orderBy: [{ minute: 'asc' }, { addedMinute: 'asc' }] } },
    });
    if (!match) throw new NotFoundException('Match not found');
    return { data: match.events };
  }
}

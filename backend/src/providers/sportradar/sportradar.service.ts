import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MatchStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { mapSportradarStatus } from './sportradar-status.js';

const PROVIDER_CODE = 'sportradar';
const YEMEN_COUNTRY_ISO2 = 'YE';

type JsonObject = Record<string, unknown>;

type CompetitionSummary = {
  id: string;
  name: string;
  categoryName: string | null;
  countryCode: string | null;
};

type SeasonSummary = {
  id: string;
  name: string;
  year: string | null;
  startDate: string | null;
  endDate: string | null;
  disabled: boolean;
};

type ParsedCompetitor = {
  id: string;
  name: string;
  shortName: string | null;
};

type ParsedSportEvent = {
  id: string;
  kickoffAt: Date;
  status: MatchStatus;
  home: ParsedCompetitor;
  away: ParsedCompetitor;
  homeScore: number | null;
  awayScore: number | null;
  competitionId: string | null;
  competitionName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  countryCode: string | null;
};

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

function toRecords(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    const record = asObject(item);
    return record ? [record] : [];
  });
}

function readString(
  record: JsonObject | null,
  key: string,
): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function readInteger(
  record: JsonObject | null,
  key: string,
): number | null {
  const value = record?.[key];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function parseDateTime(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSportEvent(
  item: JsonObject,
  fallbackCompetitionId?: string,
  fallbackSeasonId?: string,
): ParsedSportEvent | null {
  const sportEvent = asObject(item.sport_event) ?? item;
  const context =
    asObject(sportEvent.sport_event_context) ??
    asObject(item.sport_event_context);
  const competition = asObject(context?.competition);
  const season = asObject(context?.season);
  const category = asObject(context?.category);
  const status = asObject(item.sport_event_status) ??
    asObject(sportEvent.sport_event_status);

  const eventId = readString(sportEvent, 'id');
  const kickoffAt = parseDateTime(readString(sportEvent, 'start_time'));
  const competitors = toRecords(sportEvent.competitors);
  const homeRecord =
    competitors.find((competitor) => readString(competitor, 'qualifier') === 'home') ??
    null;
  const awayRecord =
    competitors.find((competitor) => readString(competitor, 'qualifier') === 'away') ??
    null;

  const parseCompetitor = (
    competitor: JsonObject | null,
  ): ParsedCompetitor | null => {
    const id = readString(competitor, 'id');
    const name = readString(competitor, 'name');
    if (!id || !name) return null;
    const abbreviation =
      readString(competitor, 'abbreviation') ??
      readString(competitor, 'short_name');
    return {
      id,
      name: name.slice(0, 160),
      shortName: abbreviation?.slice(0, 40) ?? null,
    };
  };

  const home = parseCompetitor(homeRecord);
  const away = parseCompetitor(awayRecord);
  if (!eventId || !kickoffAt || !home || !away) return null;

  const overallStatus = readString(status, 'status');
  const detailedStatus = readString(status, 'match_status');

  return {
    id: eventId,
    kickoffAt,
    status: mapSportradarStatus(overallStatus, detailedStatus),
    home,
    away,
    homeScore: readInteger(status, 'home_score'),
    awayScore: readInteger(status, 'away_score'),
    competitionId:
      readString(competition, 'id') ?? fallbackCompetitionId ?? null,
    competitionName: readString(competition, 'name'),
    seasonId: readString(season, 'id') ?? fallbackSeasonId ?? null,
    seasonName: readString(season, 'name'),
    countryCode: readString(category, 'country_code')?.toUpperCase() ?? null,
  };
}

@Injectable()
export class SportradarService {
  constructor(private readonly prisma: PrismaService) {}

  async getConnectionStatus() {
    const response = await this.getJson('competitions');
    const competitions = toRecords(response.competitions);

    const yemenCompetitions: CompetitionSummary[] = competitions.flatMap(
      (competition) => {
        const category = asObject(competition.category);
        const countryCode = readString(category, 'country_code')?.toUpperCase() ?? null;
        const categoryName = readString(category, 'name');
        if (countryCode !== 'YEM' && categoryName?.toLowerCase() !== 'yemen') {
          return [];
        }
        const id = readString(competition, 'id');
        const name = readString(competition, 'name');
        if (!id || !name) return [];
        return [{ id, name, categoryName, countryCode }];
      },
    );

    return {
      provider: 'Sportradar Soccer API v4',
      connected: true,
      accessLevel: this.getAccessLevel(),
      availableCompetitions: competitions.length,
      yemenCompetitions,
      hasYemenCoverage: yemenCompetitions.length > 0,
    };
  }

  async getCompetitionSeasons(competitionId: string) {
    this.assertCompetitionId(competitionId);
    const response = await this.getJson(
      `competitions/${competitionId}/seasons`,
    );
    const seasons: SeasonSummary[] = toRecords(response.seasons).flatMap(
      (season) => {
        const id = readString(season, 'id');
        const name = readString(season, 'name');
        if (!id || !name) return [];
        return [{
          id,
          name,
          year: readString(season, 'year'),
          startDate: readString(season, 'start_date'),
          endDate: readString(season, 'end_date'),
          disabled: season.disabled === true,
        }];
      },
    );

    return { competitionId, seasons };
  }

  async syncSeason(input: {
    competitionId: string;
    seasonId: string;
  }) {
    this.assertCompetitionId(input.competitionId);
    this.assertSeasonId(input.seasonId);

    const startedAt = new Date();
    const log = await this.prisma.syncLog.create({
      data: {
        providerCode: PROVIDER_CODE,
        resourceType: 'season_schedule',
        startedAt,
        status: 'RUNNING',
      },
      select: { id: true },
    });

    try {
      const seasonResponse = await this.getCompetitionSeasons(
        input.competitionId,
      );
      const providerSeason = seasonResponse.seasons.find(
        (season) => season.id === input.seasonId,
      );
      if (!providerSeason || providerSeason.disabled) {
        throw new BadRequestException(
          'The selected season is not available for this competition.',
        );
      }

      const scheduleResponse = await this.getJson(
        `seasons/${input.seasonId}/schedules`,
      );
      const parsedEvents = toRecords(scheduleResponse.sport_events)
        .map((item) =>
          parseSportEvent(item, input.competitionId, input.seasonId),
        )
        .filter(
          (event): event is ParsedSportEvent =>
            event !== null &&
            event.competitionId === input.competitionId &&
            event.seasonId === input.seasonId,
        );

      if (parsedEvents.length === 0) {
        throw new BadGatewayException(
          'Sportradar returned no usable fixtures for the selected season.',
        );
      }

      const firstEvent = parsedEvents[0];
      if (!firstEvent) {
        throw new BadGatewayException('The season schedule is empty.');
      }

      const syncedAt = new Date();
      const startsOn = parseDateOnly(providerSeason.startDate);
      const endsOn = parseDateOnly(providerSeason.endDate);
      const currentTime = syncedAt.getTime();
      const isCurrent =
        (!startsOn || startsOn.getTime() <= currentTime) &&
        (!endsOn || endsOn.getTime() >= currentTime);
      const uniqueTeams = new Set<string>();

      const result = await this.prisma.$transaction(async (tx) => {
        const country =
          firstEvent.countryCode === 'YEM'
            ? await tx.country.upsert({
                where: { iso2: YEMEN_COUNTRY_ISO2 },
                create: { iso2: YEMEN_COUNTRY_ISO2, name: 'Yemen' },
                update: { name: 'Yemen' },
                select: { id: true },
              })
            : null;

        const league = await tx.league.upsert({
          where: {
            providerCode_providerKey: {
              providerCode: PROVIDER_CODE,
              providerKey: input.competitionId,
            },
          },
          create: {
            providerCode: PROVIDER_CODE,
            providerKey: input.competitionId,
            name: (firstEvent.competitionName ?? input.competitionId).slice(0, 160),
            isEnabled: true,
            ...(country ? { countryId: country.id } : {}),
          },
          update: {
            name: (firstEvent.competitionName ?? input.competitionId).slice(0, 160),
            isEnabled: true,
            ...(country ? { countryId: country.id } : {}),
          },
          select: { id: true },
        });

        if (isCurrent) {
          await tx.season.updateMany({
            where: { leagueId: league.id, isCurrent: true },
            data: { isCurrent: false },
          });
        }

        const season = await tx.season.upsert({
          where: {
            leagueId_name: {
              leagueId: league.id,
              name: providerSeason.name.slice(0, 80),
            },
          },
          create: {
            leagueId: league.id,
            name: providerSeason.name.slice(0, 80),
            startsOn,
            endsOn,
            isCurrent,
          },
          update: { startsOn, endsOn, isCurrent },
          select: { id: true },
        });

        let matchesWritten = 0;
        for (const event of parsedEvents) {
          const home = await this.upsertTeam(tx, event.home, country?.id);
          const away = await this.upsertTeam(tx, event.away, country?.id);
          uniqueTeams.add(event.home.id);
          uniqueTeams.add(event.away.id);

          const where = {
            providerCode_providerKey: {
              providerCode: PROVIDER_CODE,
              providerKey: event.id,
            },
          };
          const existing = await tx.match.findUnique({
            where,
            select: { resultConfirmedAt: true },
          });
          const resultAlreadyConfirmed = existing?.resultConfirmedAt !== null &&
            existing?.resultConfirmedAt !== undefined;

          await tx.match.upsert({
            where,
            create: {
              providerCode: PROVIDER_CODE,
              providerKey: event.id,
              leagueId: league.id,
              seasonId: season.id,
              homeTeamId: home.id,
              awayTeamId: away.id,
              kickoffAt: event.kickoffAt,
              status: event.status,
              homeScore: event.homeScore,
              awayScore: event.awayScore,
              lastProviderUpdateAt: syncedAt,
            },
            update: {
              leagueId: league.id,
              seasonId: season.id,
              homeTeamId: home.id,
              awayTeamId: away.id,
              kickoffAt: event.kickoffAt,
              status: resultAlreadyConfirmed
                ? MatchStatus.FINISHED
                : event.status,
              ...(resultAlreadyConfirmed
                ? {}
                : {
                    homeScore: event.homeScore,
                    awayScore: event.awayScore,
                  }),
              lastProviderUpdateAt: syncedAt,
            },
          });
          matchesWritten += 1;
        }

        return {
          leagueId: league.id,
          seasonId: season.id,
          leagueName: firstEvent.competitionName ?? input.competitionId,
          seasonName: providerSeason.name,
          teamsWritten: uniqueTeams.size,
          matchesWritten,
        };
      });

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'SUCCESS',
          recordsRead: parsedEvents.length,
          recordsWritten: result.matchesWritten,
        },
      });

      return {
        provider: PROVIDER_CODE,
        status: 'SUCCESS',
        ...result,
        note: 'Imported scores are not confirmed automatically; an authorized manager must review and finalize finished matches.',
      };
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'FAILED',
          errorMessage: this.errorMessage(error).slice(0, 500),
        },
      });
      throw error;
    }
  }

  async syncLiveMatches() {
    const startedAt = new Date();
    const log = await this.prisma.syncLog.create({
      data: {
        providerCode: PROVIDER_CODE,
        resourceType: 'live_schedules',
        startedAt,
        status: 'RUNNING',
      },
      select: { id: true },
    });

    try {
      const response = await this.getJson('schedules/live/schedules');
      const liveEvents = toRecords(response.sport_events)
        .map((item) => parseSportEvent(item))
        .filter((event): event is ParsedSportEvent => event !== null);
      const syncedAt = new Date();

      const updatedMatches = await this.prisma.$transaction(async (tx) => {
        let updated = 0;
        for (const event of liveEvents) {
          const where = {
            providerCode_providerKey: {
              providerCode: PROVIDER_CODE,
              providerKey: event.id,
            },
          };
          const existing = await tx.match.findUnique({
            where,
            select: { id: true, resultConfirmedAt: true },
          });
          if (!existing) continue;

          if (existing.resultConfirmedAt) {
            await tx.match.update({
              where: { id: existing.id },
              data: { lastProviderUpdateAt: syncedAt },
            });
            continue;
          }

          await tx.match.update({
            where: { id: existing.id },
            data: {
              status: event.status,
              ...(event.homeScore === null ? {} : { homeScore: event.homeScore }),
              ...(event.awayScore === null ? {} : { awayScore: event.awayScore }),
              lastProviderUpdateAt: syncedAt,
            },
          });
          updated += 1;
        }
        return updated;
      });

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'SUCCESS',
          recordsRead: liveEvents.length,
          recordsWritten: updatedMatches,
        },
      });

      return {
        provider: PROVIDER_CODE,
        status: 'SUCCESS',
        liveEventsRead: liveEvents.length,
        existingMatchesUpdated: updatedMatches,
        note: 'Only matches already imported from Sportradar are updated.',
      };
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'FAILED',
          errorMessage: this.errorMessage(error).slice(0, 500),
        },
      });
      throw error;
    }
  }

  private async upsertTeam(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    competitor: ParsedCompetitor,
    countryId?: string,
  ) {
    return tx.team.upsert({
      where: {
        providerCode_providerKey: {
          providerCode: PROVIDER_CODE,
          providerKey: competitor.id,
        },
      },
      create: {
        providerCode: PROVIDER_CODE,
        providerKey: competitor.id,
        name: competitor.name,
        shortName: competitor.shortName,
        isEnabled: true,
        ...(countryId ? { countryId } : {}),
      },
      update: {
        name: competitor.name,
        ...(competitor.shortName ? { shortName: competitor.shortName } : {}),
        isEnabled: true,
        ...(countryId ? { countryId } : {}),
      },
      select: { id: true },
    });
  }

  private async getJson(path: string): Promise<JsonObject> {
    const apiKey = process.env.SPORTRADAR_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'SPORTRADAR_API_KEY is not configured on the backend.',
      );
    }

    const accessLevel = this.getAccessLevel();
    const language = process.env.SPORTRADAR_LANGUAGE?.trim() || 'en';
    const baseUrl = (
      process.env.SPORTRADAR_API_BASE_URL?.trim() ||
      'https://api.sportradar.com/soccer'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/${accessLevel}/v4/${language}/${path}.json`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-api-key': apiKey,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new BadGatewayException(
        'Could not reach Sportradar. Check backend network access and API URL.',
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ServiceUnavailableException(
        'Sportradar rejected the API key or this key has no Soccer v4 access.',
      );
    }
    if (response.status === 429) {
      throw new ServiceUnavailableException(
        'Sportradar request quota or QPS limit was reached. Wait before retrying.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        `Sportradar returned HTTP ${response.status} for the requested feed.`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new BadGatewayException('Sportradar returned invalid JSON.');
    }
    const record = asObject(body);
    if (!record) {
      throw new BadGatewayException('Sportradar returned an unexpected response.');
    }
    return record;
  }

  private getAccessLevel(): 'trial' | 'production' {
    return process.env.SPORTRADAR_ACCESS_LEVEL?.trim().toLowerCase() ===
      'production'
      ? 'production'
      : 'trial';
  }

  private assertCompetitionId(value: string): void {
    if (!/^sr:competition:\d+$/.test(value)) {
      throw new BadRequestException('Invalid Sportradar competition ID.');
    }
  }

  private assertSeasonId(value: string): void {
    if (!/^sr:season:\d+$/.test(value)) {
      throw new BadRequestException('Invalid Sportradar season ID.');
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown Sportradar sync error.';
  }
}

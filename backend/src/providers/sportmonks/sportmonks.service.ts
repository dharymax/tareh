import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MatchStatus, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { mapSportmonksStatus } from './sportmonks-status.js';

const PROVIDER_CODE = 'sportmonks';
const INCLUDE_FIXTURE_DATA =
  'participants;state;scores;league;season;events;statistics';

type JsonObject = Record<string, unknown>;

type SportmonksLeague = {
  id: number;
  name: string;
  shortCode: string | null;
  logoUrl: string | null;
  countryName: string | null;
  countryIso2: string | null;
  currentSeason: SportmonksSeason | null;
};

type SportmonksSeason = {
  id: number;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  isCurrent: boolean;
};

type SportmonksParticipant = {
  id: number;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  location: 'home' | 'away' | null;
};

type SportmonksFixture = {
  id: number;
  kickoffAt: Date;
  status: MatchStatus;
  home: SportmonksParticipant;
  away: SportmonksParticipant;
  homeScore: number | null;
  awayScore: number | null;
  leagueId: number;
  leagueName: string | null;
  leagueLogoUrl: string | null;
  seasonId: number;
  seasonName: string | null;
  countryName: string | null;
  countryIso2: string | null;
  events: JsonObject[];
  statistics: JsonObject[];
};

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as JsonObject;
}

function relationObject(value: unknown): JsonObject | null {
  const relation = asObject(value);
  return asObject(relation?.data) ?? relation;
}

function records(value: unknown): JsonObject[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const record = asObject(item);
      return record ? [record] : [];
    });
  }
  const wrapper = asObject(value);
  return Array.isArray(wrapper?.data)
    ? records(wrapper.data)
    : [];
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function relationRecords(value: unknown): JsonObject[] {
  return records(value);
}

function parseDate(value: unknown, timestamp: unknown): Date | null {
  const seconds = numberValue(timestamp);
  if (seconds !== null) {
    const fromTimestamp = new Date(seconds * 1000);
    if (!Number.isNaN(fromTimestamp.getTime())) return fromTimestamp;
  }

  const raw = stringValue(value);
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractScore(
  scores: JsonObject[],
  participant: 'home' | 'away',
): number | null {
  const relevant = scores.filter((item) => {
    const score = relationObject(item.score);
    return stringValue(score?.participant)?.toLowerCase() === participant;
  });

  const preferred =
    relevant.find((item) => (stringValue(item.description) ?? '').toUpperCase() === 'CURRENT') ??
    relevant.find((item) => (stringValue(item.description) ?? '').toUpperCase() === 'FULL_TIME') ??
    relevant[relevant.length - 1];

  const value = relationObject(preferred?.score);
  return numberValue(value?.goals);
}

function parseLeague(item: JsonObject): SportmonksLeague | null {
  const id = numberValue(item.id);
  const name = stringValue(item.name);
  if (id === null || !name) return null;
  const country = relationObject(item.country);
  const current = relationObject(item.currentSeason ?? item.currentseason);
  return {
    id,
    name: name.slice(0, 160),
    shortCode: stringValue(item.short_code),
    logoUrl: stringValue(item.image_path),
    countryName: stringValue(country?.name),
    countryIso2: stringValue(country?.iso2)?.toUpperCase() ?? null,
    currentSeason: current
      ? parseSeason(current)
      : null,
  };
}

function parseSeason(item: JsonObject): SportmonksSeason | null {
  const id = numberValue(item.id);
  const name = stringValue(item.name);
  if (id === null || !name) return null;
  return {
    id,
    name: name.slice(0, 80),
    startsOn: stringValue(item.starting_at),
    endsOn: stringValue(item.ending_at),
    isCurrent: item.is_current === true || item.finished === false,
  };
}

function parseParticipant(item: JsonObject): SportmonksParticipant | null {
  const id = numberValue(item.id);
  const name = stringValue(item.name);
  if (id === null || !name) return null;
  const meta = relationObject(item.meta);
  const location = stringValue(meta?.location)?.toLowerCase();
  return {
    id,
    name: name.slice(0, 160),
    shortName: stringValue(item.short_code)?.slice(0, 40) ?? null,
    logoUrl: stringValue(item.image_path),
    location: location === 'home' || location === 'away' ? location : null,
  };
}

function parseFixture(item: JsonObject): SportmonksFixture | null {
  const id = numberValue(item.id);
  const kickoffAt = parseDate(item.starting_at, item.starting_at_timestamp);
  const participants = relationRecords(item.participants)
    .map(parseParticipant)
    .filter((value): value is SportmonksParticipant => value !== null);
  const home = participants.find((team) => team.location === 'home');
  const away = participants.find((team) => team.location === 'away');
  const league = relationObject(item.league);
  const season = relationObject(item.season);
  const state = relationObject(item.state);
  const scores = relationRecords(item.scores);

  if (id === null || !kickoffAt || !home || !away) return null;

  return {
    id,
    kickoffAt,
    status: mapSportmonksStatus(
      stringValue(state?.state) ?? stringValue(state?.name),
      stringValue(state?.developer_name),
    ),
    home,
    away,
    homeScore: extractScore(scores, 'home'),
    awayScore: extractScore(scores, 'away'),
    leagueId: numberValue(item.league_id) ?? numberValue(league?.id) ?? 0,
    leagueName: stringValue(league?.name),
    leagueLogoUrl: stringValue(league?.image_path),
    seasonId: numberValue(item.season_id) ?? numberValue(season?.id) ?? 0,
    seasonName: stringValue(season?.name),
    countryName: stringValue(relationObject(league?.country)?.name),
    countryIso2: stringValue(relationObject(league?.country)?.iso2)?.toUpperCase() ?? null,
    events: relationRecords(item.events),
    statistics: relationRecords(item.statistics),
  };
}

@Injectable()
export class SportmonksService {
  constructor(private readonly prisma: PrismaService) {}

  async getConnectionStatus() {
    const leagues = await this.getLeagues();
    return {
      provider: 'SportMonks Football API v3',
      connected: true,
      accessLevel: 'account subscription',
      availableLeagues: leagues.length,
      leagues,
    };
  }

  async getImportedLeagues() {
    return this.prisma.league.findMany({
      where: { providerCode: PROVIDER_CODE },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        country: { select: { name: true } },
      },
    });
  }

  async getLeagues(): Promise<SportmonksLeague[]> {
    const response = await this.getJson(
      'leagues?include=country;currentSeason&per_page=50&page=1',
    );
    return records(response.data)
      .map(parseLeague)
      .filter((league): league is SportmonksLeague => league !== null);
  }

  async getLeagueSeasons(leagueId: number) {
    this.assertProviderId(leagueId, 'leagueId');
    const response = await this.getJson(
      `leagues/${leagueId}?include=country;seasons`,
    );
    const leagueRecord = asObject(response.data);
    if (!leagueRecord) throw new BadGatewayException('SportMonks returned no league data.');

    const league = parseLeague(leagueRecord);
    const seasonRelation = relationObject(leagueRecord.seasons);
    const seasons = relationRecords(seasonRelation?.data ?? leagueRecord.seasons)
      .map(parseSeason)
      .filter((season): season is SportmonksSeason => season !== null);

    if (seasons.length === 0 && league?.currentSeason) {
      seasons.push(league.currentSeason);
    }

    return {
      league: league
        ? {
            id: league.id,
            name: league.name,
            countryName: league.countryName,
            logoUrl: league.logoUrl,
          }
        : { id: leagueId, name: stringValue(leagueRecord.name) ?? String(leagueId) },
      seasons: seasons.sort((left, right) =>
        Number(right.isCurrent) - Number(left.isCurrent) ||
        right.name.localeCompare(left.name),
      ),
    };
  }

  async syncSeason(input: { leagueId: number; seasonId: number }) {
    this.assertProviderId(input.leagueId, 'leagueId');
    this.assertProviderId(input.seasonId, 'seasonId');

    const sync = await this.prisma.syncLog.create({
      data: {
        providerCode: PROVIDER_CODE,
        resourceType: 'season_fixtures',
        startedAt: new Date(),
        status: 'RUNNING',
      },
      select: { id: true },
    });

    try {
      const available = await this.getLeagueSeasons(input.leagueId);
      const providerSeason = available.seasons.find(
        (season) => season.id === input.seasonId,
      );
      if (!providerSeason) {
        throw new BadRequestException('The selected season is not available for this league.');
      }

      const leagueResponse = await this.getJson(
        `leagues/${input.leagueId}?include=country`,
      );
      const leagueRecord = asObject(leagueResponse.data);
      const league = leagueRecord ? parseLeague(leagueRecord) : null;
      if (!league) throw new BadGatewayException('SportMonks returned invalid league details.');

      const fixtures: SportmonksFixture[] = [];
      let paginationLimitReached = false;
      for (let page = 1; page <= 40; page += 1) {
        const response = await this.getJson(
          `fixtures/seasons/${input.seasonId}?include=${INCLUDE_FIXTURE_DATA}&per_page=50&page=${page}`,
        );
        const pageFixtures = records(response.data)
          .map(parseFixture)
          .filter(
            (fixture): fixture is SportmonksFixture =>
              fixture !== null &&
              fixture.seasonId === input.seasonId &&
              fixture.leagueId === input.leagueId,
          );
        fixtures.push(...pageFixtures);
        const meta = asObject(response.meta);
        const pagination = asObject(meta?.pagination);
        const hasMore =
          pagination?.has_more === true || pagination?.hasMore === true;
        if (!hasMore) break;
        if (page === 40) paginationLimitReached = true;
      }

      if (paginationLimitReached) {
        throw new BadGatewayException(
          'The selected season exceeds the 2,000-fixture import safety limit. Import a narrower date range or contact support.',
        );
      }

      if (fixtures.length === 0) {
        throw new BadGatewayException(
          'No usable fixtures were returned for this season. Check that the selected season is covered by the subscription.',
        );
      }

      const syncedAt = new Date();
      const startsOn = parseDateOnly(providerSeason.startsOn);
      const endsOn = parseDateOnly(providerSeason.endsOn);
      const isCurrent = providerSeason.isCurrent ||
        ((!startsOn || startsOn <= syncedAt) && (!endsOn || endsOn >= syncedAt));
      const uniqueTeams = new Set<number>();
      const result = await this.prisma.$transaction(async (tx) => {
        const country = await this.upsertCountry(
          tx,
          league.countryName,
          league.countryIso2,
        );
        const localLeague = await tx.league.upsert({
          where: {
            providerCode_providerKey: {
              providerCode: PROVIDER_CODE,
              providerKey: String(league.id),
            },
          },
          create: {
            providerCode: PROVIDER_CODE,
            providerKey: String(league.id),
            name: league.name,
            logoUrl: league.logoUrl,
            isEnabled: true,
            ...(country ? { countryId: country.id } : {}),
          },
          update: {
            name: league.name,
            ...(league.logoUrl ? { logoUrl: league.logoUrl } : {}),
            isEnabled: true,
            ...(country ? { countryId: country.id } : {}),
          },
          select: { id: true },
        });

        if (isCurrent) {
          await tx.season.updateMany({
            where: { leagueId: localLeague.id, isCurrent: true },
            data: { isCurrent: false },
          });
        }

        const localSeason = await tx.season.upsert({
          where: {
            leagueId_name: {
              leagueId: localLeague.id,
              name: providerSeason.name,
            },
          },
          create: {
            leagueId: localLeague.id,
            name: providerSeason.name,
            startsOn,
            endsOn,
            isCurrent,
          },
          update: { startsOn, endsOn, isCurrent },
          select: { id: true },
        });

        let matchesWritten = 0;
        let eventsWritten = 0;
        let statisticsWritten = 0;
        for (const fixture of fixtures) {
          const home = await this.upsertTeam(tx, fixture.home, country?.id);
          const away = await this.upsertTeam(tx, fixture.away, country?.id);
          uniqueTeams.add(fixture.home.id);
          uniqueTeams.add(fixture.away.id);

          const where = {
            providerCode_providerKey: {
              providerCode: PROVIDER_CODE,
              providerKey: String(fixture.id),
            },
          };
          const existing = await tx.match.findUnique({
            where,
            select: { id: true, resultConfirmedAt: true },
          });
          const confirmed = Boolean(existing?.resultConfirmedAt);

          const localMatch = await tx.match.upsert({
            where,
            create: {
              providerCode: PROVIDER_CODE,
              providerKey: String(fixture.id),
              leagueId: localLeague.id,
              seasonId: localSeason.id,
              homeTeamId: home.id,
              awayTeamId: away.id,
              kickoffAt: fixture.kickoffAt,
              status: fixture.status,
              homeScore: fixture.homeScore,
              awayScore: fixture.awayScore,
              lastProviderUpdateAt: syncedAt,
            },
            update: {
              leagueId: localLeague.id,
              seasonId: localSeason.id,
              homeTeamId: home.id,
              awayTeamId: away.id,
              kickoffAt: fixture.kickoffAt,
              status: confirmed ? MatchStatus.FINISHED : fixture.status,
              ...(confirmed ? {} : {
                homeScore: fixture.homeScore,
                awayScore: fixture.awayScore,
              }),
              lastProviderUpdateAt: syncedAt,
            },
            select: { id: true },
          });
          matchesWritten += 1;

          if (!confirmed) {
            eventsWritten += await this.upsertEvents(
              tx,
              localMatch.id,
              fixture,
              home.id,
              away.id,
            );
            statisticsWritten += await this.upsertStatistics(
              tx,
              localMatch.id,
              fixture,
              home.id,
              away.id,
            );
          }
        }

        return {
          leagueId: localLeague.id,
          seasonId: localSeason.id,
          leagueName: league.name,
          seasonName: providerSeason.name,
          teamsWritten: uniqueTeams.size,
          matchesWritten,
          eventsWritten,
          statisticsWritten,
        };
      }, { maxWait: 10_000, timeout: 300_000 });

      await this.prisma.syncLog.update({
        where: { id: sync.id },
        data: {
          finishedAt: new Date(),
          status: 'SUCCESS',
          recordsRead: fixtures.length,
          recordsWritten: result.matchesWritten,
        },
      });

      return {
        provider: PROVIDER_CODE,
        status: 'SUCCESS',
        ...result,
        note: 'Final scores are imported as pending review. They are not confirmed and points are not settled until an authorized manager approves them.',
      };
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: sync.id },
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
    const sync = await this.prisma.syncLog.create({
      data: {
        providerCode: PROVIDER_CODE,
        resourceType: 'inplay_livescores',
        startedAt: new Date(),
        status: 'RUNNING',
      },
      select: { id: true },
    });

    try {
      const response = await this.getJson(
        `livescores/inplay?include=${INCLUDE_FIXTURE_DATA}`,
      );
      const fixtures = records(response.data)
        .map(parseFixture)
        .filter((fixture): fixture is SportmonksFixture => fixture !== null);
      const syncedAt = new Date();

      const updated = await this.prisma.$transaction(async (tx) => {
        let count = 0;
        for (const fixture of fixtures) {
          const existing = await tx.match.findUnique({
            where: {
              providerCode_providerKey: {
                providerCode: PROVIDER_CODE,
                providerKey: String(fixture.id),
              },
            },
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

          const updatedMatch = await tx.match.update({
            where: { id: existing.id },
            data: {
              status: fixture.status,
              ...(fixture.homeScore === null ? {} : { homeScore: fixture.homeScore }),
              ...(fixture.awayScore === null ? {} : { awayScore: fixture.awayScore }),
              lastProviderUpdateAt: syncedAt,
            },
            select: { id: true, homeTeamId: true, awayTeamId: true },
          });
          await this.upsertEvents(tx, updatedMatch.id, fixture, updatedMatch.homeTeamId, updatedMatch.awayTeamId);
          await this.upsertStatistics(tx, updatedMatch.id, fixture, updatedMatch.homeTeamId, updatedMatch.awayTeamId);
          count += 1;
        }
        return count;
      }, { maxWait: 10_000, timeout: 60_000 });

      await this.prisma.syncLog.update({
        where: { id: sync.id },
        data: {
          finishedAt: new Date(),
          status: 'SUCCESS',
          recordsRead: fixtures.length,
          recordsWritten: updated,
        },
      });

      return {
        provider: PROVIDER_CODE,
        status: 'SUCCESS',
        liveFixturesRead: fixtures.length,
        importedMatchesUpdated: updated,
      };
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: sync.id },
        data: {
          finishedAt: new Date(),
          status: 'FAILED',
          errorMessage: this.errorMessage(error).slice(0, 500),
        },
      });
      throw error;
    }
  }

  private async upsertCountry(
    tx: Prisma.TransactionClient,
    name: string | null,
    iso2: string | null,
  ) {
    if (!name) return null;
    if (iso2 && /^[A-Z]{2}$/.test(iso2)) {
      return tx.country.upsert({
        where: { iso2 },
        create: { iso2, name: name.slice(0, 100) },
        update: { name: name.slice(0, 100) },
        select: { id: true },
      });
    }
    const existing = await tx.country.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    return existing ?? tx.country.create({
      data: { name: name.slice(0, 100) },
      select: { id: true },
    });
  }

  private async upsertTeam(
    tx: Prisma.TransactionClient,
    participant: SportmonksParticipant,
    countryId?: string,
  ) {
    return tx.team.upsert({
      where: {
        providerCode_providerKey: {
          providerCode: PROVIDER_CODE,
          providerKey: String(participant.id),
        },
      },
      create: {
        providerCode: PROVIDER_CODE,
        providerKey: String(participant.id),
        name: participant.name,
        shortName: participant.shortName,
        logoUrl: participant.logoUrl,
        isEnabled: true,
        ...(countryId ? { countryId } : {}),
      },
      update: {
        name: participant.name,
        ...(participant.shortName ? { shortName: participant.shortName } : {}),
        ...(participant.logoUrl ? { logoUrl: participant.logoUrl } : {}),
        isEnabled: true,
        ...(countryId ? { countryId } : {}),
      },
      select: { id: true },
    });
  }

  private async upsertEvents(
    tx: Prisma.TransactionClient,
    matchId: string,
    fixture: SportmonksFixture,
    homeTeamId: string,
    awayTeamId: string,
  ): Promise<number> {
    let written = 0;
    for (const event of fixture.events) {
      const id = numberValue(event.id);
      if (id === null) continue;
      const participantId = numberValue(event.participant_id);
      const eventTeam = participantId === fixture.home.id
        ? homeTeamId
        : participantId === fixture.away.id
          ? awayTeamId
          : null;
      const type = relationObject(event.type);
      const eventType = (
        stringValue(type?.name) ??
        (numberValue(event.type_id) !== null ? `type_${numberValue(event.type_id)}` : 'other')
      ).slice(0, 40);
      await tx.matchEvent.upsert({
        where: {
          matchId_providerEventKey: {
            matchId,
            providerEventKey: String(id),
          },
        },
        create: {
          matchId,
          providerEventKey: String(id),
          minute: numberValue(event.minute),
          addedMinute: numberValue(event.extra_minute),
          eventType,
          teamId: eventTeam,
          playerId: null,
          detail: {
            playerName: stringValue(event.player_name),
            relatedPlayerName: stringValue(event.related_player_name),
            result: stringValue(event.result),
            info: stringValue(event.info),
            addition: stringValue(event.addition),
          },
        },
        update: {
          minute: numberValue(event.minute),
          addedMinute: numberValue(event.extra_minute),
          eventType,
          teamId: eventTeam,
          detail: {
            playerName: stringValue(event.player_name),
            relatedPlayerName: stringValue(event.related_player_name),
            result: stringValue(event.result),
            info: stringValue(event.info),
            addition: stringValue(event.addition),
          },
        },
      });
      written += 1;
    }
    return written;
  }

  private async upsertStatistics(
    tx: Prisma.TransactionClient,
    matchId: string,
    fixture: SportmonksFixture,
    homeTeamId: string,
    awayTeamId: string,
  ): Promise<number> {
    let written = 0;
    for (const item of fixture.statistics) {
      const participantId = numberValue(item.participant_id);
      const teamId = participantId === fixture.home.id
        ? homeTeamId
        : participantId === fixture.away.id
          ? awayTeamId
          : null;
      if (!teamId) continue;
      const type = relationObject(item.type);
      const key = (
        stringValue(type?.name) ??
        (numberValue(item.type_id) !== null ? `type_${numberValue(item.type_id)}` : null)
      )?.slice(0, 60);
      if (!key) continue;
      const data = relationObject(item.data);
      const value = data?.value ?? item.value ?? null;
      const statisticValue = { value: value as Prisma.InputJsonValue | null };

      await tx.matchStatistic.upsert({
        where: {
          matchId_teamId_statisticKey: { matchId, teamId, statisticKey: key },
        },
        create: {
          matchId,
          teamId,
          statisticKey: key,
          statisticValue,
        },
        update: { statisticValue },
      });
      written += 1;
    }
    return written;
  }

  private async getJson(path: string): Promise<JsonObject> {
    const token = process.env.SPORTMONKS_API_TOKEN?.trim();
    if (!token) {
      throw new ServiceUnavailableException(
        'SPORTMONKS_API_TOKEN is not configured on the backend.',
      );
    }

    const baseUrl = (
      process.env.SPORTMONKS_API_BASE_URL?.trim() ||
      'https://api.sportmonks.com/v3/football'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: token,
        },
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new BadGatewayException('Could not reach SportMonks. Check the API host and backend network.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new ServiceUnavailableException(
        'SportMonks rejected the token or the requested data is not included in the subscription.',
      );
    }
    if (response.status === 429) {
      throw new ServiceUnavailableException(
        'SportMonks request quota was reached. Wait for the hourly reset before retrying.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(`SportMonks returned HTTP ${response.status}.`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new BadGatewayException('SportMonks returned invalid JSON.');
    }
    const record = asObject(body);
    if (!record) throw new BadGatewayException('SportMonks returned an unexpected response.');
    const errors = records(record.errors);
    if (errors.length > 0) {
      const first = errors[0];
      throw new BadGatewayException(
        stringValue(first?.message) ?? 'SportMonks returned an API error.',
      );
    }
    return record;
  }

  private assertProviderId(value: number, field: string): void {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown SportMonks sync error.';
  }
}

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as JsonObject;
}

function list(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asObject(item);
    return record ? [record] : [];
  });
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(fc|afc|cf|sc|the)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

function similarity(left: string, right: string): number {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  return 0;
}

@Injectable()
export class TheSportsDbService {
  constructor(private readonly prisma: PrismaService) {}

  async getConnectionStatus() {
    const response = await this.getJson('all_sports.php');
    const sports = list(response.sports);
    return {
      provider: 'TheSportsDB v1',
      connected: true,
      accessLevel: 'public free key',
      rateLimitPerMinute: 30,
      availableSports: sports.length,
      role: 'league and team metadata / badge enrichment; not a live-score source on the free key',
    };
  }

  async enrichLeague(localLeagueId: string) {
    const league = await this.prisma.league.findUnique({
      where: { id: localLeagueId },
      include: { country: true },
    });
    if (!league) throw new NotFoundException('League not found.');
    if (!league.country?.name) {
      throw new BadRequestException(
        'This league has no country stored. Import it from SportMonks with country data first.',
      );
    }

    const countryQuery = new URLSearchParams({
      c: league.country.name,
      s: 'Soccer',
    });
    const leagueSearch = await this.getJson(
      `search_all_leagues.php?${countryQuery.toString()}`,
    );
    const candidates = list(leagueSearch.leagues);
    const providerLeague = candidates
      .map((candidate) => ({
        candidate,
        score: similarity(
          league.name,
          stringValue(candidate.strLeague) ?? '',
        ),
      }))
      .filter((item) => item.score >= 0.85)
      .sort((left, right) => right.score - left.score)[0]?.candidate;

    if (!providerLeague) {
      return {
        provider: 'thesportsdb',
        status: 'NO_LEAGUE_MATCH',
        localLeague: league.name,
        country: league.country.name,
        candidates: candidates.map((item) => ({
          id: stringValue(item.idLeague),
          name: stringValue(item.strLeague),
        })),
        message:
          'No exact or near-exact TheSportsDB league name was found in this country. Existing SportMonks fixture data was not changed.',
      };
    }

    const sportsDbLeagueId = stringValue(providerLeague.idLeague);
    const sportsDbLeagueName = stringValue(providerLeague.strLeague);
    if (!sportsDbLeagueId || !sportsDbLeagueName) {
      throw new BadGatewayException('TheSportsDB returned an invalid league record.');
    }

    const [leagueDetails, teamResponse, localTeams] = await Promise.all([
      this.getJson(`lookupleague.php?id=${encodeURIComponent(sportsDbLeagueId)}`),
      this.getJson(
        `search_all_teams.php?l=${encodeURIComponent(sportsDbLeagueName)}`,
      ),
      this.prisma.team.findMany({
        where: {
          OR: [
            { homeMatches: { some: { leagueId: localLeagueId } } },
            { awayMatches: { some: { leagueId: localLeagueId } } },
          ],
        },
        select: { id: true, name: true, logoUrl: true },
        distinct: ['id'],
      }),
    ]);

    const providerLeagueDetails = list(leagueDetails.leagues)[0] ?? providerLeague;
    const leagueBadge =
      stringValue(providerLeagueDetails.strBadge) ??
      stringValue(providerLeague.strBadge) ??
      stringValue(providerLeagueDetails.strLogo);
    const providerTeams = list(teamResponse.teams).slice(0, 10);

    let teamsMatched = 0;
    const updatedTeams: Array<{ localName: string; providerName: string }> = [];
    const usedProviderIds = new Set<string>();

    for (const localTeam of localTeams) {
      const match = providerTeams
        .map((candidate) => ({
          candidate,
          score: similarity(
            localTeam.name,
            stringValue(candidate.strTeam) ?? '',
          ),
        }))
        .filter((item) => item.score >= 0.85)
        .sort((left, right) => right.score - left.score)[0];

      if (!match) continue;
      const providerTeamId = stringValue(match.candidate.idTeam);
      const badge =
        stringValue(match.candidate.strTeamBadge) ??
        stringValue(match.candidate.strBadge);
      if (!providerTeamId || !badge || usedProviderIds.has(providerTeamId)) continue;

      await this.prisma.team.update({
        where: { id: localTeam.id },
        data: { logoUrl: badge },
      });
      usedProviderIds.add(providerTeamId);
      teamsMatched += 1;
      updatedTeams.push({
        localName: localTeam.name,
        providerName: stringValue(match.candidate.strTeam) ?? localTeam.name,
      });
    }

    if (leagueBadge) {
      await this.prisma.league.update({
        where: { id: localLeagueId },
        data: { logoUrl: leagueBadge },
      });
    }

    return {
      provider: 'thesportsdb',
      status: 'SUCCESS',
      localLeague: league.name,
      providerLeague: sportsDbLeagueName,
      country: league.country.name,
      leagueBadgeUpdated: Boolean(leagueBadge),
      teamsReturned: providerTeams.length,
      localTeams: localTeams.length,
      teamsMatched,
      updatedTeams,
      limitNote:
        'The free V1 team-list endpoint is limited to 10 returned teams. Only exact/near-exact name matches with a badge are updated.',
    };
  }

  private async getJson(path: string): Promise<JsonObject> {
    const apiKey = process.env.THESPORTSDB_API_KEY?.trim() || '123';
    const baseUrl = (
      process.env.THESPORTSDB_BASE_URL?.trim() ||
      'https://www.thesportsdb.com/api/v1/json'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/${encodeURIComponent(apiKey)}/${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new BadGatewayException('Could not reach TheSportsDB.');
    }

    if (response.status === 429) {
      throw new ServiceUnavailableException(
        'TheSportsDB free API limit (30 requests/minute) was reached. Wait before retrying.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(`TheSportsDB returned HTTP ${response.status}.`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new BadGatewayException('TheSportsDB returned invalid JSON.');
    }
    const record = asObject(body);
    if (!record) throw new BadGatewayException('TheSportsDB returned an unexpected response.');
    return record;
  }
}

import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MatchStatus, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type JsonRecord = Record<string, any>;
type ProviderStatus = {
  configured: boolean;
  reachable: boolean;
  provider: string;
  message: string;
  checkedAt: string;
};

@Injectable()
export class SportsProvidersService {
  private readonly logger = new Logger(SportsProvidersService.name);
  private readonly sportmonksBaseUrl = 'https://api.sportmonks.com/v3/football';
  private readonly sportsDbBaseUrl = 'https://www.thesportsdb.com/api/v1/json';
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly prisma: PrismaService) {}

  private cacheGet<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private cacheSet(key: string, value: unknown, ttlSeconds: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  private async cachedRequest<T>(
    key: string,
    url: URL,
    headers: Record<string, string>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = this.cacheGet<T>(key);
    if (cached !== undefined) return cached;
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    const request = (async () => {
      let response: Response;
      try {
        response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
      } catch (error) {
        this.logger.warn(`Sports provider network error for ${key}: ${String(error)}`);
        throw new ServiceUnavailableException('تعذر الاتصال بمزود البيانات الرياضية');
      }
      if (response.status === 429) {
        throw new ServiceUnavailableException('تجاوز مزود البيانات حد الطلبات؛ أعد المحاولة لاحقاً');
      }
      if (!response.ok) {
        this.logger.warn(`Sports provider returned HTTP ${response.status} for ${key}`);
        if (response.status >= 500) throw new BadGatewayException('مزود البيانات الرياضية غير متاح حالياً');
        throw new ServiceUnavailableException('تعذر جلب البيانات من مزود البيانات الرياضية');
      }
      const body = (await response.json()) as T;
      this.cacheSet(key, body, ttlSeconds);
      return body;
    })();

    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async sportmonksGet<T>(path: string, cacheSeconds = 60): Promise<T> {
    const token = process.env.SPORTMONKS_API_TOKEN;
    if (!token) throw new ServiceUnavailableException('SPORTMONKS_API_TOKEN غير مضبوط');
    const url = new URL(`${this.sportmonksBaseUrl}${path}`);
    return this.cachedRequest<T>(
      `sportmonks:${path}`,
      url,
      { Authorization: token, Accept: 'application/json' },
      cacheSeconds,
    );
  }

  async sportmonksStatus(): Promise<ProviderStatus> {
    if (!process.env.SPORTMONKS_API_TOKEN) {
      return { provider: 'sportmonks', configured: false, reachable: false, message: 'لم يتم ضبط SPORTMONKS_API_TOKEN', checkedAt: new Date().toISOString() };
    }
    try {
      const body = await this.sportmonksGet<JsonRecord>('/leagues?per_page=1', 60);
      return { provider: 'sportmonks', configured: true, reachable: Array.isArray(body.data), message: Array.isArray(body.data) ? 'الاتصال ناجح' : 'استجابة غير متوقعة', checkedAt: new Date().toISOString() };
    } catch (error) {
      return { provider: 'sportmonks', configured: true, reachable: false, message: error instanceof Error ? error.message : 'فشل الاتصال', checkedAt: new Date().toISOString() };
    }
  }

  async sportsDbStatus(): Promise<ProviderStatus> {
    const key = process.env.THESPORTSDB_API_KEY ?? '123';
    try {
      const url = new URL(`${this.sportsDbBaseUrl}/${encodeURIComponent(key)}/all_sports.php`);
      const body = await this.cachedRequest<JsonRecord>('thesportsdb:status', url, { Accept: 'application/json' }, 300);
      return { provider: 'thesportsdb', configured: true, reachable: Array.isArray(body.sports), message: Array.isArray(body.sports) ? 'الاتصال ناجح' : 'استجابة غير متوقعة', checkedAt: new Date().toISOString() };
    } catch (error) {
      return { provider: 'thesportsdb', configured: true, reachable: false, message: error instanceof Error ? error.message : 'فشل الاتصال', checkedAt: new Date().toISOString() };
    }
  }

  async status(): Promise<{ data: ProviderStatus[]; generatedAt: string }> {
    const data = await Promise.all([this.sportmonksStatus(), this.sportsDbStatus()]);
    return { data, generatedAt: new Date().toISOString() };
  }

  async listSportmonksLiveScores(): Promise<JsonRecord> {
    return this.sportmonksGet<JsonRecord>('/livescores?include=participants;scores;league;state', 30);
  }

  async listSportmonksFixtures(dateFrom: string, dateTo: string): Promise<JsonRecord> {
    this.assertDate(dateFrom);
    this.assertDate(dateTo);
    return this.sportmonksGet<JsonRecord>(`/fixtures/between/${dateFrom}/${dateTo}?include=participants;scores;league;season;state&per_page=50`, 120);
  }

  async searchSportsDbTeam(name: string): Promise<JsonRecord> {
    const normalized = name.trim();
    if (normalized.length < 2 || normalized.length > 80) {
      throw new ServiceUnavailableException('اسم الفريق يجب أن يكون بين حرفين و80 حرفاً');
    }
    const key = process.env.THESPORTSDB_API_KEY ?? '123';
    const url = new URL(`${this.sportsDbBaseUrl}/${encodeURIComponent(key)}/searchteams.php`);
    url.searchParams.set('t', normalized);
    return this.cachedRequest<JsonRecord>(`thesportsdb:team:${normalized.toLocaleLowerCase()}`, url, { Accept: 'application/json' }, 86_400);
  }

  async syncSportmonks(dateFrom?: string, dateTo?: string) {
    const now = new Date();
    const from = dateFrom ?? new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const to = dateTo ?? new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
    this.assertDate(from);
    this.assertDate(to);
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    if (start > end || end.getTime() - start.getTime() > 31 * 86_400_000) {
      throw new ServiceUnavailableException('فترة المزامنة يجب ألا تتجاوز 31 يوماً');
    }

    const log = await this.prisma.syncLog.create({
      data: { providerCode: 'sportmonks', resourceType: 'leagues_fixtures', startedAt: new Date(), status: 'RUNNING' },
    });

    let leaguesRead = 0;
    let leaguesWritten = 0;
    let fixturesRead = 0;
    let fixturesWritten = 0;

    try {
      for (let page = 1; page <= 20; page += 1) {
        const response = await this.sportmonksGet<JsonRecord>(`/leagues?include=country;currentSeason&per_page=50&page=${page}`, 300);
        const rows = Array.isArray(response.data) ? response.data as JsonRecord[] : [];
        leaguesRead += rows.length;
        for (const league of rows) {
          if (!league.id || !league.name) continue;
          const leagueId = String(league.id);
          const country = league.country as JsonRecord | null;
          const currentSeason = (league.currentseason ?? league.currentSeason) as JsonRecord | null;
          const countryData = country?.name
            ? { name: String(country.name), iso2: typeof country.iso2 === 'string' ? country.iso2 : null }
            : undefined;
          const existingCountry = countryData?.iso2
            ? await this.prisma.country.findUnique({ where: { iso2: countryData.iso2 }, select: { id: true } })
            : null;
          const savedLeague = await this.prisma.league.upsert({
            where: { providerCode_providerKey: { providerCode: 'sportmonks', providerKey: leagueId } },
            create: {
              providerCode: 'sportmonks',
              providerKey: leagueId,
              name: String(league.name).slice(0, 160),
              logoUrl: typeof league.image_path === 'string' ? league.image_path : null,
              countryId: existingCountry?.id ?? null,
              isEnabled: true,
            },
            update: {
              name: String(league.name).slice(0, 160),
              logoUrl: typeof league.image_path === 'string' ? league.image_path : null,
              ...(existingCountry?.id ? { countryId: existingCountry.id } : {}),
            },
          });
          leaguesWritten += 1;

          if (countryData?.iso2 && !existingCountry) {
            await this.prisma.country.upsert({
              where: { iso2: countryData.iso2 },
              create: { name: countryData.name.slice(0, 100), iso2: countryData.iso2 },
              update: { name: countryData.name.slice(0, 100) },
            });
            const savedCountry = await this.prisma.country.findUnique({ where: { iso2: countryData.iso2 }, select: { id: true } });
            if (savedCountry) await this.prisma.league.update({ where: { id: savedLeague.id }, data: { countryId: savedCountry.id } });
          }

          if (currentSeason?.id && currentSeason?.name) {
            await this.prisma.season.upsert({
              where: { leagueId_name: { leagueId: savedLeague.id, name: String(currentSeason.name).slice(0, 80) } },
              create: {
                leagueId: savedLeague.id,
                name: String(currentSeason.name).slice(0, 80),
                startsOn: currentSeason.starting_at ? new Date(`${currentSeason.starting_at}T00:00:00Z`) : null,
                endsOn: currentSeason.ending_at ? new Date(`${currentSeason.ending_at}T00:00:00Z`) : null,
                isCurrent: currentSeason.is_current !== false,
              },
              update: {
                startsOn: currentSeason.starting_at ? new Date(`${currentSeason.starting_at}T00:00:00Z`) : null,
                endsOn: currentSeason.ending_at ? new Date(`${currentSeason.ending_at}T00:00:00Z`) : null,
                isCurrent: currentSeason.is_current !== false,
              },
            });
          }
        }
        const pagination = response.pagination as JsonRecord | undefined;
        if (!pagination?.has_more || rows.length === 0) break;
      }

      for (let page = 1; page <= 20; page += 1) {
        const response = await this.sportmonksGet<JsonRecord>(
          `/fixtures/between/${from}/${to}?include=participants;scores;league;season;state&per_page=50&page=${page}`,
          90,
        );
        const rows = Array.isArray(response.data) ? response.data as JsonRecord[] : [];
        fixturesRead += rows.length;
        for (const fixture of rows) {
          const leagueExternalId = fixture.league_id;
          const participants = Array.isArray(fixture.participants) ? fixture.participants as JsonRecord[] : [];
          const home = participants.find((item) => item.meta?.location === 'home');
          const away = participants.find((item) => item.meta?.location === 'away');
          if (!fixture.id || !leagueExternalId || !home?.id || !away?.id || !fixture.starting_at) continue;

          const league = await this.prisma.league.findUnique({
            where: { providerCode_providerKey: { providerCode: 'sportmonks', providerKey: String(leagueExternalId) } },
            select: { id: true },
          });
          if (!league) continue;

          const saveTeam = async (team: JsonRecord) => this.prisma.team.upsert({
            where: { providerCode_providerKey: { providerCode: 'sportmonks', providerKey: String(team.id) } },
            create: {
              providerCode: 'sportmonks',
              providerKey: String(team.id),
              name: String(team.name ?? 'Unknown team').slice(0, 160),
              shortName: typeof team.short_code === 'string' ? team.short_code.slice(0, 40) : null,
              logoUrl: typeof team.image_path === 'string' ? team.image_path : null,
              isEnabled: true,
            },
            update: {
              name: String(team.name ?? 'Unknown team').slice(0, 160),
              shortName: typeof team.short_code === 'string' ? team.short_code.slice(0, 40) : null,
              logoUrl: typeof team.image_path === 'string' ? team.image_path : null,
            },
          });
          const homeTeam = await saveTeam(home);
          const awayTeam = await saveTeam(away);

          let seasonId: string | null = null;
          if (fixture.season_id) {
            const season = await this.prisma.season.findFirst({
              where: { leagueId: league.id, name: { contains: String(fixture.season_id) } },
              select: { id: true },
            });
            seasonId = season?.id ?? null;
          }

          const kickoff = this.parseProviderDate(String(fixture.starting_at));
          const state = fixture.state as JsonRecord | undefined;
          const status = this.mapMatchStatus(state);
          const scores = Array.isArray(fixture.scores) ? fixture.scores as JsonRecord[] : [];
          const currentScores = scores.filter((score) => String(score.description ?? '').toUpperCase() === 'CURRENT');
          const scoreFor = (participantId: unknown) => {
            const row = currentScores.find((score) => String(score.participant_id) === String(participantId));
            const goals = row?.score?.goals;
            return Number.isInteger(goals) ? Number(goals) : null;
          };
          const homeScore = scoreFor(home.id);
          const awayScore = scoreFor(away.id);
          await this.prisma.match.upsert({
            where: { providerCode_providerKey: { providerCode: 'sportmonks', providerKey: String(fixture.id) } },
            create: {
              providerCode: 'sportmonks',
              providerKey: String(fixture.id),
              leagueId: league.id,
              seasonId,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              kickoffAt: kickoff,
              status,
              homeScore,
              awayScore,
              lastProviderUpdateAt: new Date(),
            },
            update: {
              leagueId: league.id,
              seasonId,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              kickoffAt: kickoff,
              status,
              homeScore,
              awayScore,
              lastProviderUpdateAt: new Date(),
            },
          });
          fixturesWritten += 1;
        }
        const pagination = response.pagination as JsonRecord | undefined;
        if (!pagination?.has_more || rows.length === 0) break;
      }

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'SUCCESS',
          recordsRead: leaguesRead + fixturesRead,
          recordsWritten: leaguesWritten + fixturesWritten,
        },
      });
      return {
        provider: 'sportmonks',
        dateRange: { from, to },
        leagues: { read: leaguesRead, written: leaguesWritten },
        fixtures: { read: fixturesRead, written: fixturesWritten },
        note: 'تم تحديث النتائج دون اعتمادها لتسوية نقاط التوقعات.',
      };
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: 'FAILED',
          recordsRead: leaguesRead + fixturesRead,
          recordsWritten: leaguesWritten + fixturesWritten,
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown sync error',
        },
      });
      throw error;
    }
  }

  private assertDate(value: string): void {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
      throw new ServiceUnavailableException('صيغة التاريخ يجب أن تكون YYYY-MM-DD');
    }
  }

  private parseProviderDate(value: string): Date {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(/Z$|[+-]\\d{2}:?\\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
    if (Number.isNaN(date.getTime())) throw new ServiceUnavailableException('تاريخ مباراة غير صالح من المزود');
    return date;
  }

  private mapMatchStatus(state?: JsonRecord): MatchStatus {
    const label = [state?.developer_name, state?.short_name, state?.name]
      .filter(Boolean).join(' ').toUpperCase();
    if (/LIVE|IN PLAY|1ST HALF|2ND HALF|EXTRA TIME|PENALT/.test(label)) return MatchStatus.LIVE;
    if (/HALF TIME|HALFTIME/.test(label)) return MatchStatus.HALF_TIME;
    if (/BREAK|INTERRUPT|SUSPEND/.test(label)) return MatchStatus.PAUSED;
    if (/FINISHED|FULL TIME|FT|AFTER PENALT/.test(label)) return MatchStatus.FINISHED;
    if (/POSTPON/.test(label)) return MatchStatus.POSTPONED;
    if (/CANCEL|ABANDON/.test(label)) return MatchStatus.CANCELLED;
    return MatchStatus.SCHEDULED;
  }
}

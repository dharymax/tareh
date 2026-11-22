import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

type JsonRecord = Record<string, unknown>;
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
        response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(12_000),
        });
      } catch (error) {
        this.logger.warn(`Sports provider network error for ${key}: ${String(error)}`);
        throw new ServiceUnavailableException('تعذر الاتصال بمزود البيانات الرياضية');
      }

      if (response.status === 429) {
        throw new ServiceUnavailableException('تجاوز مزود البيانات حد الطلبات؛ أعد المحاولة لاحقاً');
      }
      if (!response.ok) {
        this.logger.warn(`Sports provider returned HTTP ${response.status} for ${key}`);
        if (response.status >= 500) {
          throw new BadGatewayException('مزود البيانات الرياضية غير متاح حالياً');
        }
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

  async sportmonksStatus(): Promise<ProviderStatus> {
    const token = process.env.SPORTMONKS_API_TOKEN;
    if (!token) {
      return {
        provider: 'sportmonks',
        configured: false,
        reachable: false,
        message: 'لم يتم ضبط SPORTMONKS_API_TOKEN',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const url = new URL(`${this.sportmonksBaseUrl}/leagues`);
      url.searchParams.set('per_page', '1');
      const body = await this.cachedRequest<JsonRecord>(
        'sportmonks:status',
        url,
        { Authorization: token, Accept: 'application/json' },
        60,
      );
      return {
        provider: 'sportmonks',
        configured: true,
        reachable: true,
        message: typeof body.message === 'string' ? body.message : 'الاتصال ناجح',
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: 'sportmonks',
        configured: true,
        reachable: false,
        message: error instanceof Error ? error.message : 'فشل الاتصال',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async sportsDbStatus(): Promise<ProviderStatus> {
    const key = process.env.THESPORTSDB_API_KEY ?? '123';
    try {
      const url = new URL(`${this.sportsDbBaseUrl}/${encodeURIComponent(key)}/all_sports.php`);
      const body = await this.cachedRequest<JsonRecord>(
        'thesportsdb:status',
        url,
        { Accept: 'application/json' },
        300,
      );
      return {
        provider: 'thesportsdb',
        configured: true,
        reachable: Array.isArray(body.sports),
        message: Array.isArray(body.sports) ? 'الاتصال ناجح' : 'استجابة غير متوقعة',
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: 'thesportsdb',
        configured: true,
        reachable: false,
        message: error instanceof Error ? error.message : 'فشل الاتصال',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async status(): Promise<{ data: ProviderStatus[]; generatedAt: string }> {
    const data = await Promise.all([
      this.sportmonksStatus(),
      this.sportsDbStatus(),
    ]);
    return { data, generatedAt: new Date().toISOString() };
  }

  async listSportmonksLiveScores(): Promise<JsonRecord> {
    const token = process.env.SPORTMONKS_API_TOKEN;
    if (!token) throw new ServiceUnavailableException('SPORTMONKS_API_TOKEN غير مضبوط');

    const url = new URL(`${this.sportmonksBaseUrl}/livescores`);
    url.searchParams.set('include', 'participants;scores;league;state');
    return this.cachedRequest<JsonRecord>(
      'sportmonks:livescores',
      url,
      { Authorization: token, Accept: 'application/json' },
      30,
    );
  }

  async listSportmonksFixtures(dateFrom: string, dateTo: string): Promise<JsonRecord> {
    const token = process.env.SPORTMONKS_API_TOKEN;
    if (!token) throw new ServiceUnavailableException('SPORTMONKS_API_TOKEN غير مضبوط');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      throw new ServiceUnavailableException('صيغة التاريخ يجب أن تكون YYYY-MM-DD');
    }

    const url = new URL(`${this.sportmonksBaseUrl}/fixtures/between/${dateFrom}/${dateTo}`);
    url.searchParams.set('include', 'participants;scores;league;season;state');
    return this.cachedRequest<JsonRecord>(
      `sportmonks:fixtures:${dateFrom}:${dateTo}`,
      url,
      { Authorization: token, Accept: 'application/json' },
      120,
    );
  }

  async searchSportsDbTeam(name: string): Promise<JsonRecord> {
    const normalized = name.trim();
    if (normalized.length < 2 || normalized.length > 80) {
      throw new ServiceUnavailableException('اسم الفريق يجب أن يكون بين حرفين و80 حرفاً');
    }
    const key = process.env.THESPORTSDB_API_KEY ?? '123';
    const url = new URL(`${this.sportsDbBaseUrl}/${encodeURIComponent(key)}/searchteams.php`);
    url.searchParams.set('t', normalized);
    return this.cachedRequest<JsonRecord>(
      `thesportsdb:team:${normalized.toLocaleLowerCase()}`,
      url,
      { Accept: 'application/json' },
      86_400,
    );
  }
}

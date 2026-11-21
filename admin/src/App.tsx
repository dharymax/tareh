import { useEffect, useMemo, useState } from 'react';
import { apiGet, ApiError } from './api/client';
import type { LeaguesResponse, TodayMatchesResponse, MatchStatus } from './types/football';

const statusLabels: Record<MatchStatus, string> = {
  SCHEDULED: 'قادمة',
  LIVE: 'مباشرة',
  HALF_TIME: 'استراحة',
  PAUSED: 'متوقفة',
  FINISHED: 'انتهت',
  POSTPONED: 'مؤجلة',
  CANCELLED: 'ملغاة',
  ABANDONED: 'لم تكتمل',
};

function formatAdenTime(value: string): string {
  return new Intl.DateTimeFormat('ar-YE', {
    timeZone: 'Asia/Aden',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function formatAdenDate(value: string): string {
  return new Intl.DateTimeFormat('ar-YE', {
    timeZone: 'Asia/Aden',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export default function App() {
  const [matches, setMatches] = useState<TodayMatchesResponse | null>(null);
  const [leagues, setLeagues] = useState<LeaguesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [matchResponse, leagueResponse] = await Promise.all([
          apiGet<TodayMatchesResponse>('/matches/today', controller.signal),
          apiGet<LeaguesResponse>('/leagues', controller.signal),
        ]);
        setMatches(matchResponse);
        setLeagues(leagueResponse);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof ApiError ? cause.message : 'حدث خطأ غير متوقع أثناء تحميل البيانات.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const liveCount = useMemo(
    () => matches?.data.filter((match) => ['LIVE', 'HALF_TIME', 'PAUSED'].includes(match.status)).length ?? 0,
    [matches],
  );

  const todayLabel = new Intl.DateTimeFormat('ar-YE', {
    timeZone: 'Asia/Aden',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/tareh-icon.png" alt="شعار طارح" />
          <div>
            <strong>طارح</strong>
            <span>TAREH ADMIN</span>
          </div>
        </div>

        <div className="sidebar-label">القائمة الرئيسية</div>
        <nav className="nav-list" aria-label="القائمة الرئيسية">
          <a className="nav-item active" href="#overview"><span>▦</span> نظرة عامة</a>
          <a className="nav-item" href="#matches"><span>⚽</span> المباريات</a>
          <a className="nav-item" href="#leagues"><span>🏆</span> البطولات</a>
          <a className="nav-item" href="#teams"><span>◉</span> الفرق</a>
          <a className="nav-item" href="#users"><span>♙</span> المستخدمون</a>
          <a className="nav-item" href="#predictions"><span>☷</span> التوقعات</a>
          <a className="nav-item" href="#reports"><span>▤</span> التقارير</a>
          <a className="nav-item" href="#settings"><span>⚙</span> الإعدادات</a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>واجهة أولية — المصادقة الإدارية قيد التطوير</span>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">لوحة التحكم</p>
            <h1>نظرة عامة</h1>
            <p className="muted">{todayLabel}</p>
          </div>
          <div className="admin-avatar" aria-label="مدير النظام">م</div>
        </header>

        <section className="notice" role="status">
          <span className="notice-mark">!</span>
          <div>
            <strong>نسخة التطوير الأولية</strong>
            <p>هذه الواجهة غير مخصصة للإدارة الإنتاجية بعد. لا تتوفر حالياً مصادقة المدير أو صلاحيات التعديل.</p>
          </div>
        </section>

        <section className="stats-grid" aria-label="إحصائيات اليوم">
          <article className="stat-card">
            <span className="stat-caption">مباريات اليوم</span>
            <strong>{loading ? '—' : matches?.data.length ?? 0}</strong>
            <span className="stat-foot">حسب بيانات الخادم</span>
          </article>
          <article className="stat-card">
            <span className="stat-caption">مباريات مباشرة</span>
            <strong>{loading ? '—' : liveCount}</strong>
            <span className="stat-foot">مباشر / استراحة / متوقفة</span>
          </article>
          <article className="stat-card">
            <span className="stat-caption">البطولات النشطة</span>
            <strong>{loading ? '—' : leagues?.data.length ?? 0}</strong>
            <span className="stat-foot">مفعلة في قاعدة البيانات</span>
          </article>
          <article className="stat-card">
            <span className="stat-caption">حالة API</span>
            <strong className={error ? 'api-state down' : loading ? 'api-state' : 'api-state up'}>
              {loading ? 'جارٍ' : error ? 'غير متصل' : 'متصل'}
            </strong>
            <span className="stat-foot">قراءة عامة فقط</span>
          </article>
        </section>

        <section className="panel" id="matches">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Football</p>
              <h2>مباريات اليوم</h2>
            </div>
            <span className="date-pill">{todayLabel}</span>
          </div>

          {loading && <div className="empty-state">جارٍ تحميل المباريات من الخادم…</div>}
          {error && (
            <div className="error-state">
              <strong>تعذر تحميل البيانات</strong>
              <p>{error}</p>
              <p className="small-help">تأكد من تشغيل Backend على المنفذ 3000 وضبط VITE_API_BASE_URL.</p>
            </div>
          )}
          {!loading && !error && matches?.data.length === 0 && (
            <div className="empty-state">
              <span className="empty-ball">⚽</span>
              <strong>لا توجد مباريات مسجلة لهذا اليوم</strong>
              <p>ستظهر المباريات هنا بعد ربط مزود البيانات ومزامنة جدول المباريات.</p>
            </div>
          )}
          {!loading && !error && matches && matches.data.length > 0 && (
            <div className="match-list">
              {matches.data.map((match) => (
                <article className="match-row" key={match.id}>
                  <div className="match-league">{match.league.name}</div>
                  <div className="team home-team">
                    <span>{match.homeTeam.name}</span>
                    {match.homeTeam.logoUrl && <img src={match.homeTeam.logoUrl} alt="" loading="lazy" />}
                  </div>
                  <div className="match-score">
                    {match.homeScore ?? '–'} <span>:</span> {match.awayScore ?? '–'}
                  </div>
                  <div className="team away-team">
                    {match.awayTeam.logoUrl && <img src={match.awayTeam.logoUrl} alt="" loading="lazy" />}
                    <span>{match.awayTeam.name}</span>
                  </div>
                  <div className="match-meta">
                    <span className={match.status === 'LIVE' ? 'live-tag' : 'status-tag'}>
                      {statusLabels[match.status]}
                    </span>
                    <time dateTime={match.kickoffAt}>{formatAdenTime(match.kickoffAt)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
          {matches && (
            <p className="last-update">بيانات اليوم: {formatAdenDate(`${matches.meta.date}T12:00:00+03:00`)} — المنطقة الزمنية: صنعاء</p>
          )}
        </section>
      </main>
    </div>
  );
}

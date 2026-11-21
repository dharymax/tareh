import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type ApiState = 'checking' | 'online' | 'offline';

type Session = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; displayName: string; status: string };
};

type Dashboard = {
  users: { total: number; active: number };
  matches: { today: number; live: number; awaitingResultReview: number };
  predictions: { total: number };
  providerSync: null | {
    providerCode: string;
    resourceType: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    recordsRead: number;
    recordsWritten: number;
  };
  generatedAt: string;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? 'http://localhost:3000/api/v1';

const navigation = [
  { icon: '⌂', label: 'نظرة عامة', active: true },
  { icon: '⚽', label: 'المباريات', active: false },
  { icon: '▤', label: 'البطولات والفرق', active: false },
  { icon: '♙', label: 'المستخدمون', active: false },
  { icon: '◎', label: 'التوقعات والنقاط', active: false },
  { icon: '◷', label: 'سجل المزامنة', active: false },
  { icon: '⚙', label: 'الإعدادات', active: false },
];

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { message?: string | string[]; error?: { message?: string } };
    const message = body.message ?? body.error?.message;
    return Array.isArray(message) ? message.join('، ') : message ?? 'تعذر تنفيذ الطلب.';
  } catch {
    return 'تعذر تنفيذ الطلب.';
  }
}

async function fetchDashboard(accessToken: string): Promise<Response> {
  return fetch(`${apiBase}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
}

function normalizeYemenPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('967')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return national.length === 9 && national.startsWith('7') ? `+967${national}` : '';
}

function LoginPanel({ onLogin }: { onLogin: (session: Session) => void }) {
  const [phone, setPhone] = useState('');
  const [sentPhone, setSentPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeYemenPhone(phone);
    if (!normalized) {
      setError('أدخل رقم هاتف يمني صحيحاً مثل 777123456.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setSentPhone(normalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال رمز التحقق.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!sentPhone || !/^\d{6}$/.test(code)) {
      setError('أدخل رمز التحقق المكوّن من ستة أرقام.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: sentPhone, code }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json() as Session;
      onLogin(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر التحقق من الرمز.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell" dir="rtl">
      <section className="login-card">
        <div className="login-brand-mark">ط</div>
        <span className="login-eyebrow">TAREH SPORTS ADMIN</span>
        <h1>لوحة إدارة طارح</h1>
        <p>سجّل الدخول باستخدام حساب إداري مخوّل.</p>
        {!sentPhone ? (
          <form onSubmit={sendOtp}>
            <label htmlFor="admin-phone">رقم الهاتف</label>
            <input
              id="admin-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="777123456"
              autoComplete="tel"
              disabled={busy}
            />
            <button type="submit" disabled={busy}>
              {busy ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <div className="login-destination">أرسلنا طلب التحقق إلى {sentPhone}</div>
            <label htmlFor="admin-otp">رمز التحقق</label>
            <input
              id="admin-otp"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={busy}
            />
            <button type="submit" disabled={busy || code.length !== 6}>
              {busy ? 'جارٍ التحقق...' : 'تأكيد الدخول'}
            </button>
            <button className="text-button" type="button" disabled={busy} onClick={() => {
              setSentPhone('');
              setCode('');
              setError('');
            }}>
              تغيير رقم الهاتف
            </button>
          </form>
        )}
        {error && <div className="login-error" role="alert">{error}</div>}
        <small>رمز التطوير يظهر في سجل الخادم فقط. الإنتاج يتطلب مزود SMS مفعّلاً.</small>
      </section>
    </main>
  );
}

function App() {
  const [apiState, setApiState] = useState<ApiState>('checking');
  const [checkedAt, setCheckedAt] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    const checkApi = async () => {
      try {
        const response = await fetch(`${apiBase}/health/ready`, { cache: 'no-store' });
        if (!response.ok) throw new Error('API readiness check failed');
        if (active) setApiState('online');
      } catch {
        if (active) setApiState('offline');
      } finally {
        if (active) setCheckedAt(new Date().toLocaleTimeString('ar-YE'));
      }
    };
    void checkApi();
    const interval = window.setInterval(checkApi, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setDashboard(null);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setDashboardError('');
      setNotAuthorized(false);
      try {
        let response = await fetchDashboard(session.accessToken);
        let currentSession = session;

        if (response.status === 401) {
          const refreshResponse = await fetch(`${apiBase}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: session.refreshToken }),
          });
          if (!refreshResponse.ok) throw new Error('انتهت الجلسة. سجّل الدخول مجدداً.');
          const refreshed = await refreshResponse.json() as {
            accessToken: string; refreshToken: string; tokenType: string; expiresIn: number;
          };
          currentSession = { ...session, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
          if (active) setSession(currentSession);
          response = await fetchDashboard(currentSession.accessToken);
        }

        if (response.status === 403) {
          setNotAuthorized(true);
          throw new Error('الحساب لا يملك دوراً إدارياً. اطلب من مالك الخادم منحه الصلاحية.');
        }
        if (!response.ok) throw new Error(await readError(response));
        const body = await response.json() as { data: Dashboard };
        if (active) setDashboard(body.data);
      } catch (cause) {
        if (active) setDashboardError(cause instanceof Error ? cause.message : 'تعذر تحميل لوحة التحكم.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [session]);

  const logout = async () => {
    if (session?.refreshToken) {
      try {
        await fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      } catch {
        // Local session is still cleared if the API is unavailable.
      }
    }
    setSession(null);
    setDashboard(null);
    setDashboardError('');
  };

  if (!session) return <LoginPanel onLogin={setSession} />;

  const statusLabel = apiState === 'online'
    ? 'الخادم وقاعدة البيانات متصلان'
    : apiState === 'offline'
      ? 'الخادم غير متصل'
      : 'جارٍ فحص الاتصال';

  const stats: Array<[string, string, string, string]> = [
    ['إجمالي المستخدمين', dashboard ? String(dashboard.users.total) : '—', '♙', dashboard ? `${dashboard.users.active} نشط` : 'بانتظار البيانات'],
    ['مباريات اليوم', dashboard ? String(dashboard.matches.today) : '—', '⚽', 'توقيت صنعاء'],
    ['المباريات المباشرة', dashboard ? String(dashboard.matches.live) : '—', '◉', 'مباشرة الآن'],
    ['التوقعات المرسلة', dashboard ? String(dashboard.predictions.total) : '—', dashboard ? '◎' : '◎', 'توقعات مجانية'],
  ];

  return (
    <div className="app-shell" dir="rtl">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ط</div>
          <div><strong>طارح</strong><span>TAREH SPORTS</span></div>
        </div>
        <div className="side-caption">القائمة الرئيسية</div>
        <nav>
          {navigation.map((item) => (
            <a className={item.active ? 'nav-item active' : 'nav-item'} href="#"
              key={item.label} onClick={(event) => event.preventDefault()}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              {item.active && <i />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{session.user.displayName.slice(0, 1) || 'م'}</span>
          <div><strong>{session.user.displayName}</strong><small>حساب إداري</small></div>
          <button className="logout-small" type="button" onClick={logout}>خروج</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">TAREH / ADMIN</span>
            <h1>نظرة عامة</h1>
          </div>
          <div className="top-actions">
            <span className={`status-pill ${apiState}`}><b />{statusLabel}</span>
            <button className="icon-button" type="button" aria-label="تسجيل الخروج" onClick={logout}>↪</button>
          </div>
        </header>

        <section className="welcome-card">
          <div>
            <span className="welcome-kicker">لوحة التحكم</span>
            <h2>مرحباً بك في طارح</h2>
            <p>إدارة مباريات كرة القدم والتوقعات المجانية من مكان واحد.</p>
          </div>
          <div className="welcome-ball">⚽</div>
          <div className="welcome-glow" />
        </section>

        {dashboardError && (
          <div className={notAuthorized ? 'admin-alert warning' : 'admin-alert'}>
            {dashboardError}
          </div>
        )}

        <div className="section-heading">
          <div><h2>ملخص المنصة</h2><p>{loading ? 'جارٍ تحميل إحصائيات المنصة...' : dashboard ? `آخر تحديث ${new Date(dashboard.generatedAt).toLocaleTimeString('ar-YE')}` : 'لا توجد بيانات متاحة حالياً.'}</p></div>
          <span className="muted-chip">{notAuthorized ? 'صلاحية غير كافية' : dashboard ? 'بيانات فعلية من الخادم' : 'بانتظار الاتصال'}</span>
        </div>

        <section className="stats-grid">
          {stats.map(([label, value, icon, note]) => (
            <article className="stat-card" key={label}>
              <div className="stat-top"><span>{label}</span><b>{icon}</b></div>
              <strong>{value}</strong>
              <small>{note}</small>
            </article>
          ))}
        </section>

        <section className="bottom-grid">
          <article className="panel">
            <div className="panel-heading"><div><h3>حالة الخدمات</h3><p>مراقبة أولية للاتصال</p></div><span className="live-dot" /></div>
            <div className="service-row"><span>واجهة Backend API وقاعدة البيانات</span><strong className={apiState}>{statusLabel}</strong></div>
            <div className="service-row"><span>نتائج بانتظار المراجعة</span><strong className="pending">{dashboard?.matches.awaitingResultReview ?? '—'}</strong></div>
            <div className="service-row"><span>مزود البيانات الرياضية</span><strong className="pending">{dashboard?.providerSync ? dashboard.providerSync.providerCode : 'لم يتم اختياره'}</strong></div>
            <div className="service-foot">آخر فحص: {checkedAt || '—'}</div>
          </article>
          <article className="panel">
            <div className="panel-heading"><div><h3>الخطوات التالية</h3><p>متطلبات ما قبل التشغيل</p></div></div>
            <ul className="todo-list">
              <li><span className="todo-check">1</span><div><b>اختيار مزود بيانات كرة القدم</b><small>مقارنة التغطية والتكلفة وحقوق العرض</small></div></li>
              <li><span className="todo-check">2</span><div><b>ضبط إرسال OTP للإنتاج</b><small>اختبار رسائل التحقق إلى +967</small></div></li>
              <li><span className="todo-check">3</span><div><b>استكمال إدارة البطولات والفرق</b><small>ربط وظائف الإدارة بالـ API</small></div></li>
            </ul>
          </article>
        </section>

        <footer>طارح © 2026 · منصة رياضية مجانية · جميع الحقوق محفوظة</footer>
      </main>
    </div>
  );
}

export default App;

import { useEffect, useState } from 'react';

type ApiState = 'checking' | 'online' | 'offline';

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

function App() {
  const [apiState, setApiState] = useState<ApiState>('checking');
  const [checkedAt, setCheckedAt] = useState<string>('');

  useEffect(() => {
    let active = true;
    const checkApi = async () => {
      try {
        const response = await fetch(`${apiBase}/health/live`, { cache: 'no-store' });
        if (!response.ok) throw new Error('API health check failed');
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

  const statusLabel = apiState === 'online'
    ? 'الخادم متصل'
    : apiState === 'offline'
      ? 'الخادم غير متصل'
      : 'جارٍ فحص الاتصال';

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
          <span className="avatar">م</span>
          <div><strong>مدير النظام</strong><small>Super Admin</small></div>
          <span className="more">•••</span>
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
            <button className="icon-button" type="button" aria-label="الإشعارات">♧</button>
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

        <div className="section-heading">
          <div><h2>ملخص المنصة</h2><p>ستظهر الإحصائيات بعد تفعيل وحدات البيانات.</p></div>
          <span className="muted-chip">بيانات غير مفعّلة بعد</span>
        </div>

        <section className="stats-grid">
          {[
            ['إجمالي المستخدمين', '—', '♙'],
            ['مباريات اليوم', '—', '⚽'],
            ['المباريات المباشرة', '—', '◉'],
            ['التوقعات المرسلة', '—', '◎'],
          ].map(([label, value, icon]) => (
            <article className="stat-card" key={label}>
              <div className="stat-top"><span>{label}</span><b>{icon}</b></div>
              <strong>{value}</strong>
              <small>بانتظار ربط واجهة البيانات</small>
            </article>
          ))}
        </section>

        <section className="bottom-grid">
          <article className="panel">
            <div className="panel-heading"><div><h3>حالة الخدمات</h3><p>مراقبة أولية للاتصال</p></div><span className="live-dot" /></div>
            <div className="service-row"><span>واجهة Backend API</span><strong className={apiState}>{statusLabel}</strong></div>
            <div className="service-row"><span>قاعدة البيانات</span><strong className="pending">تحتاج فحص الجاهزية</strong></div>
            <div className="service-row"><span>مزود البيانات الرياضية</span><strong className="pending">لم يتم اختياره</strong></div>
            <div className="service-foot">آخر فحص: {checkedAt || '—'}</div>
          </article>
          <article className="panel">
            <div className="panel-heading"><div><h3>الخطوات التالية</h3><p>متطلبات ما قبل التشغيل</p></div></div>
            <ul className="todo-list">
              <li><span className="todo-check">1</span><div><b>اختيار مزود بيانات كرة القدم</b><small>مقارنة التغطية والتكلفة وحقوق العرض</small></div></li>
              <li><span className="todo-check">2</span><div><b>إنشاء أول ترحيل لقاعدة البيانات</b><small>بعد تشغيل PostgreSQL محلياً</small></div></li>
              <li><span className="todo-check">3</span><div><b>بناء وحدات المباريات</b><small>ربط البطولات والفرق والنتائج</small></div></li>
            </ul>
          </article>
        </section>

        <footer>طارح © 2026 · منصة رياضية مجانية · جميع الحقوق محفوظة</footer>
      </main>
    </div>
  );
}

export default App;

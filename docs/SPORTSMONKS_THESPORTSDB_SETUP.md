# ربط SportMonks وTheSportsDB في طارح

## توزيع المهام بين المزودين

- **SportMonks Football API v3** هو المصدر الأساسي للبطولات المتاحة في الاشتراك، المواسم، جدول المباريات، الفرق، النتائج، النتائج المباشرة، أحداث المباراة وإحصاءاتها.
- **TheSportsDB V1** هو مصدر مساعد لإثراء شعارات البطولات والأندية والبيانات الوصفية. لا نستخدم المفتاح المجاني 123 كمصدر للنتائج المباشرة؛ خدمة Livescores موثقة في V2 المدفوع.

## 1. جهّز رمز SportMonks

1. افتح [MySportmonks API Tokens](https://my.sportmonks.com/api/tokens).
2. احذف الرمز الذي أرسلته سابقاً في المحادثة وأنشئ رمزاً جديداً؛ رموز SportMonks لا تنتهي تلقائياً ولا تظهر ثانية بعد إنشائها.
3. انسخ الرمز الجديد إلى ملف backend/.env فقط.

~~~env
SPORTMONKS_API_TOKEN=YOUR_NEW_TOKEN
SPORTMONKS_API_BASE_URL=https://api.sportmonks.com/v3/football
~~~

لا تضع الرمز في Android أو لوحة Admin أو GitHub أو ملفاً يتم رفعه إلى المستودع. Backend يرسله عبر ترويسة Authorization.

## 2. إعداد TheSportsDB

لا تحتاج إلى إنشاء حساب للحصول على المفتاح العام المجاني. يستخدم التكامل المفتاح 123 افتراضياً. يمكن ترك القيم كما يلي في backend/.env:

~~~env
THESPORTSDB_API_KEY=123
THESPORTSDB_BASE_URL=https://www.thesportsdb.com/api/v1/json
~~~

المفتاح 123 عام وليس مفتاح حساب خاصاً. حد TheSportsDB المجاني المعلن هو 30 طلباً في الدقيقة، مع حدود نتائج مختلفة حسب endpoint.

## 3. تشغيل المشروع

من مجلد المشروع:

~~~powershell
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
~~~

وفي نافذتين منفصلتين:

~~~powershell
npm run dev:api
~~~

~~~powershell
npm run dev:admin
~~~

افتح Admin على [http://localhost:5173](http://localhost:5173) وسجّل الدخول بحساب SUPER_ADMIN أو SPORTS_MANAGER.

## 4. استيراد بطولة وموسم من SportMonks

من لوحة Admin، في قسم «مزودو البيانات الرياضية»:

1. تأكد أن SportMonks يظهر «متصل».
2. اختر إحدى البطولات التي يعيدها حسابك.
3. اختر الموسم المطلوب.
4. اضغط «استيراد الموسم».
5. راجع عدد الفرق والمباريات والأحداث والإحصاءات التي تم استيرادها.

الباقة المجانية الحالية من SportMonks توفر Danish Superliga وScottish Premiership فقط، بحد 3,000 طلب لكل كيان في الساعة. لا يظهر الدوري الإنجليزي أو دوري أبطال أوروبا في الخطة المجانية لمجرد أن API يدعمهما عموماً؛ يجب أن يكونا ضمن اشتراك الحساب.

## 5. تحديث النتائج المباشرة

اضغط «تحديث المباريات المباشرة» في لوحة Admin. هذه العملية تستخدم /livescores/inplay وتحدّث فقط المباريات التي سبق استيرادها من SportMonks.

التحديث يدوي في هذه النسخة، ولا توجد جدولة خلفية لتجنب استهلاك حصة API دون تحديد فترة التحديث المناسبة.

## 6. إثراء شعارات الأندية عبر TheSportsDB

بعد استيراد موسم SportMonks:

1. افتح قسم TheSportsDB.
2. اختر البطولة التي استوردتها.
3. اضغط «إثراء شعارات البطولة والأندية».

يحاول Backend مطابقة اسم البطولة ضمن بطولات كرة القدم المسجلة في البلد نفسه، ثم يجلب الفرق من TheSportsDB ويطابق الأسماء قبل تحديث الشعارات. لا تتغير المواعيد أو النتائج أو معرفات SportMonks.

**حد مهم:** قائمة الفرق المجانية في V1 محدودة بعشرة عناصر للطلب؛ لذلك قد لا يتم إثراء كل فرق البطولة. ستعرض لوحة Admin عدد الفرق التي تمت مطابقتها. لا يجري أي تغيير على الفريق إذا لم يُعثر على تطابق موثوق وشعار.

## 7. ماذا يحدث عند اعتماد النتيجة؟

SportMonks يستورد حالة المباراة والنتيجة التي يرسلها المزود. النتيجة النهائية تبقى في قائمة مراجعة Admin ولا تُعتمد تلقائياً. يجب أن يراجعها مدير مخوّل ويعتمدها من قسم مراجعة النتائج، وعندها فقط يتم احتساب النقاط.

TheSportsDB لا يغيّر حالة المباراة ولا النتيجة ولا رصيد النقاط.

## 8. واجهات Backend المضافة

جميع المسارات التالية إدارية وتتطلب Bearer token مع دور SUPER_ADMIN أو SPORTS_MANAGER:

- GET /api/v1/admin/providers/sportmonks/connection
- GET /api/v1/admin/providers/sportmonks/leagues
- GET /api/v1/admin/providers/sportmonks/leagues/:leagueId/seasons
- GET /api/v1/admin/providers/sportmonks/imported-leagues
- POST /api/v1/admin/providers/sportmonks/sync-season — body: { leagueId: 271, seasonId: 17328 }
- POST /api/v1/admin/providers/sportmonks/sync-live
- GET /api/v1/admin/providers/thesportsdb/connection
- POST /api/v1/admin/providers/thesportsdb/enrich-league/:localLeagueUuid

## 9. قيود النسخة الحالية

- باقة SportMonks المجانية محدودة بالبطولات التي يعرضها حسابك؛ تحقق من القائمة داخل Admin ولا تفترض توفر الدوريات الأوروبية الكبرى.
- TheSportsDB Free V1 مساعد للشعارات والبيانات الوصفية. لا نستخدمه للنتائج المباشرة.
- مزامنة SportMonks يدوية، وليست تلقائية.
- تُخزّن أحداث المباراة والإحصاءات في قاعدة البيانات. عرض التشكيلات في واجهة الهاتف ولوحة المباراة لم يُنفّذ بعد في هذه المرحلة.
- أي نتيجة نهائية مستوردة تحتاج إلى اعتماد يدوي قبل تسوية النقاط.

## مراجع المزودين

- [SportMonks Authentication](https://docs.sportmonks.com/v3/welcome/authentication)
- [SportMonks Free Plan](https://www.sportmonks.com/football-api/free-plan/)
- [SportMonks Leagues](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues)
- [SportMonks Fixtures](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures)
- [SportMonks Livescores](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/livescores)
- [SportMonks Rate Limits](https://docs.sportmonks.com/v3/api/rate-limit)
- [TheSportsDB V1 API Documentation](https://www.thesportsdb.com/docs/api)
- [TheSportsDB Free API](https://www.thesportsdb.com/API.php)

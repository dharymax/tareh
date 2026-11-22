# مزودو البيانات الرياضية في طارح

## التصميم

- Sportmonks هو المصدر الأساسي للمباريات والنتائج المباشرة ضمن الدوريات والموارد التي تسمح بها الخطة.
- TheSportsDB مصدر تكميلي للبحث عن بيانات الفرق والشعارات والصور المتاحة.
- لا يتصل تطبيق Android أو لوحة الإدارة مباشرة بمزود خارجي؛ تمر جميع الاتصالات عبر Backend.
- لا يتم نسخ مفاتيح API إلى التطبيق أو إلى مستودع Git.
- لا يتم اعتبار TheSportsDB مصدراً للنتائج المباشرة في الخطة المجانية.

## متغيرات البيئة

أضفها إلى أسرار بيئة تشغيل backend:

- `SPORTMONKS_API_TOKEN`: رمز Sportmonks الخاص بالخادم.
- `THESPORTSDB_API_KEY`: المفتاح المسموح به؛ الافتراضي العام V1 هو `123`.

انسخ `backend/.env.example` إلى `backend/.env` للتطوير المحلي فقط. لا ترفع `.env`.

## نقاط API الإدارية

جميع المسارات التالية تحت `/api/v1` وتتطلب JWT ودور SUPER_ADMIN أو SPORTS_MANAGER:

- `GET /admin/sports-providers/status`: فحص اتصال المزودين.
- `GET /admin/sports-providers/sportmonks/live`: قراءة livescores من Sportmonks.
- `GET /admin/sports-providers/sportmonks/fixtures?from=YYYY-MM-DD&to=YYYY-MM-DD`: جلب مباريات فترة لا تتجاوز 31 يوماً.
- `GET /admin/sports-providers/thesportsdb/team?name=Arsenal`: البحث عن فريق في TheSportsDB.

## الكاش وحدود الطلبات

الكاش داخل الذاكرة يحمي من تكرار الطلبات المتزامنة ويقلل عدد الاتصالات:
- Livescores: 30 ثانية.
- Fixtures: 120 ثانية.
- حالة Sportmonks: 60 ثانية.
- حالة TheSportsDB: 5 دقائق.
- البحث عن فريق: 24 ساعة.

هذا كاش محلي لكل نسخة Backend؛ عند تشغيل عدة نسخ، يوصى بنقله إلى Redis. تعامل الخدمة مع HTTP 429 برسالة واضحة، ولا تعيد المحاولة فوراً.

## ملاحظات التطوير

هذه الإضافة توفر طبقة اتصال واستكشاف أولية ولا تنفذ مزامنة تلقائية إلى جداول League/Team/Match بعد. قبل كتابة مزامنة الإنتاج، يجب تنفيذ mapping صريح لحالات المباريات، وربط معرفات المزود في حقول providerCode/providerKey، والتحقق من حالات الباقة لكل دوري. كما يجب ألا يؤدي تحديث نتيجة آلياً إلى اعتمادها نهائياً أو تسوية النقاط دون مسار مراجعة النتائج المعتمد في طارح.

## الفحص

بعد نشر متغيرات البيئة وتشغيل backend:
1. سجل الدخول بحساب إداري.
2. اطلب `GET /api/v1/admin/sports-providers/status`.
3. اختبر استدعاء Sportmonks live وfixtures.
4. اختبر البحث عن فريق في TheSportsDB.

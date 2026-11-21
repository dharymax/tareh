# طارح | TAREH

منصة عربية لمتابعة كرة القدم والنتائج والإحصائيات والتوقعات الرياضية المجانية.

> الإصدار الأول مجاني بالكامل: لا توجد مراهنات أو رهانات مالية أو احتمالات أو إيداعات أو سحوبات أو تحويل للنقاط إلى أموال.

## حالة التطوير

- [x] وثيقة PRD وقاعدة البيانات وعقود API.
- [x] NestJS Backend + PostgreSQL + Prisma.
- [x] Docker Compose لخدمات PostgreSQL وRedis محلياً.
- [x] واجهات قراءة البطولات والفرق والمباريات.
- [x] Android Kotlin + Jetpack Compose shell.
- [x] ربط Android بواجهة مباريات اليوم.
- [x] لوحة إدارة React RTL تقرأ بيانات المباريات والبطولات.
- [x] GitHub Actions للتحقق من Backend وAdmin وAndroid.
- [ ] مزود بيانات كرة القدم الفعلي (بانتظار اختيار/تعاقد).
- [ ] OTP وتسجيل الحسابات.
- [ ] إرسال التوقعات واحتساب النقاط من خلال API.
- [ ] وظائف إدارة محمية بالمصادقة والصلاحيات.
- [ ] الإشعارات والتخزين المحلي دون اتصال.

## التقنيات

| الجزء | التقنية |
|---|---|
| Android | Kotlin, Jetpack Compose, Material 3 |
| Admin | React, TypeScript, Vite |
| Backend | NestJS, Node.js, TypeScript |
| Database | PostgreSQL, Prisma |
| Cache | Redis |
| Infrastructure | Docker, Gradle, GitHub Actions |

## التشغيل المحلي

### 1. المتطلبات
- Node.js 24.15+
- npm
- Docker Desktop / Docker Engine مع Compose
- JDK 17 أو 21
- Android SDK Platform 36

### 2. قاعدة البيانات والخدمات
من جذر المستودع:

**PowerShell**
```powershell
Copy-Item .env.example .env
docker compose up -d postgres redis
```

**macOS/Linux**
```bash
cp .env.example .env
docker compose up -d postgres redis
```

غيّر كلمات المرور الافتراضية قبل استخدام أي بيئة مشتركة.

### 3. Backend
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

الفحوص:
- http://localhost:3000/api/v1/health/live
- http://localhost:3000/api/v1/health/ready
- http://localhost:3000/api/v1/matches/today
- http://localhost:3000/api/v1/leagues

### 4. لوحة الإدارة
في نافذة طرفية أخرى:

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

افتح http://localhost:5173.

هذه نسخة تطوير للعرض والقراءة العامة؛ واجهات إدارة التعديل والمصادقة الإدارية لم تُفعّل بعد.

### 5. Android
افتح مجلد `android/` في Android Studio. استخدم المحاكي القياسي؛ عنوان API الافتراضي لنسخة Debug هو:

`http://10.0.2.2:3000/api/v1`

على Windows:

```powershell
cd android
.\gradlew.bat assembleDebug
```

على Linux/macOS:

```bash
cd android
./gradlew assembleDebug
```

لجهاز فعلي على الشبكة المحلية، مرّر عنوان الكمبيوتر:
`-PTAREH_DEBUG_API_BASE_URL=http://192.168.1.10:3000/api/v1`

استبدل عنوان IP بعنوان جهاز التطوير الفعلي.

## الوثائق
- [PRD](docs/PRD.md)
- [Database Design](docs/DATABASE.md)
- [API Contract](docs/API.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Brand Guidelines](docs/BRAND.md)

## المشروع في GitHub
- المستودع: https://github.com/dharymax/tareh
- Pull Request التطوير: https://github.com/dharymax/tareh/pull/2

## الشعار
أيقونة التطبيق المشتقة من الشعار المعتمد:
`assets/brand/tareh-icon-256.png`

## قواعد المنتج
- النقاط افتراضية للترتيب فقط ولا تحمل قيمة مالية.
- لا تُضف رهانات أو احتمالات أو حركات مالية أو سحباً أو استرداداً نقدياً.
- لا تُعرض بيانات وهمية على أنها مباريات حقيقية.
- لا تُضمّن مفاتيح مزودي البيانات في تطبيق Android أو المتصفح.
- أي تغيير في نموذج العمل يتطلب مراجعة قانونية ومواصفات مستقلة قبل التطوير.

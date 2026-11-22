# TAREH — Local testing guide (Windows)

This guide prepares the Android app and Admin dashboard for testing against a local backend. It uses a physical Android phone on the same private Wi-Fi network as the development PC.

## Requirements

- Windows 10/11
- Node.js 22.12 or newer and npm 10+
- JDK 17 for Android builds
- Android SDK Platform 36 and Android Build Tools 36
- Android Studio / Android SDK Platform Tools (ADB)
- Docker Desktop with Compose
- An Android phone with USB debugging enabled, or a configured Wi-Fi ADB connection

## 1. Download and install dependencies

Clone the repository, then from its root folder:

```powershell
npm install
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

Open the root `.env` and `backend/.env` files. Keep the database name, user, password and port consistent. Change the local JWT and OTP hash secrets to random values of at least 32 characters.

Add the SportMonks token only to `backend/.env` when running the API directly with Node (do not commit either .env file):

```env
SPORTMONKS_API_TOKEN=YOUR_NEW_TOKEN
SPORTMONKS_API_BASE_URL=https://api.sportmonks.com/v3/football
THESPORTSDB_API_KEY=123
THESPORTSDB_BASE_URL=https://www.thesportsdb.com/api/v1/json
```

The SportMonks token must be stored on the backend only. If a token was pasted into a chat or other shared location, delete it in MySportmonks and create a replacement token. TheSportsDB key 123 is the public free V1 key. The root `.env` file is used by Docker Compose; copy the provider settings there too if you run the API container.

## 2. Start PostgreSQL and Redis

From the repository root:

```powershell
docker compose up -d postgres redis
docker compose ps
```

Wait until PostgreSQL reports healthy.

## 3. Initialize the database

Open a PowerShell terminal in the repository root:

```powershell
npm run db:migrate
npm run db:seed
```

The seed command creates the standard roles and the default scoring rule.

## 4. Start the Backend API

Open a new PowerShell terminal in the repository root:

```powershell
npm run dev:api
```

The API listens on all network interfaces at port 3000. Check it from the development PC:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health/ready
```

Keep this terminal open. Development OTP codes are written to this terminal's log and are deliberately not returned by the HTTP API.

## 5. Register the first administrator

1. Start the Android app or open the Admin page and request an OTP for your Yemeni number.
2. Copy the six-digit development OTP from the Backend terminal.
3. Verify the OTP. This creates the user account if it does not exist.
4. Open a second PowerShell terminal and run the following from the `backend` folder, replacing the phone number with the exact E.164 number used during registration:

```powershell
cd backend
$env:ADMIN_PHONE_E164 = "+9677XXXXXXXX"
npm run admin:grant-superuser
Remove-Item Env:ADMIN_PHONE_E164
cd ..
```

5. Sign out of the Admin page and sign in again. The account now has the `SUPER_ADMIN` role.

Do not grant this role to ordinary users.

## 6. Start the Admin dashboard

Open another PowerShell terminal at the repository root:

```powershell
npm run dev:admin
```

On the development PC, open:

[http://localhost:5173](http://localhost:5173)

Sign in using the same phone number. The OTP appears in the Backend terminal.

The dashboard includes a SportMonks panel for checking the token, listing leagues included in the subscription, choosing a season, importing fixtures and updating live scores. A separate TheSportsDB panel can enrich imported league/team badge URLs.

If the browser is on a different PC, set `VITE_API_BASE_URL` to the backend PC's LAN URL before starting Vite, e.g. `http://192.168.1.25:3000/api/v1`.

## 7. Import one SportMonks free-plan competition for testing

In the Admin dashboard:

1. Find **مزودو البيانات الرياضية**.
2. Confirm SportMonks status is **متصل**.
3. The free plan currently includes Danish Superliga and Scottish Premiership. Select whichever leagues are actually returned by your account.
4. Select an available season.
5. Click **استيراد الموسم**.
6. Confirm that the API reports teams, fixtures, events and statistics imported.
7. Under TheSportsDB select the imported local league and click **إثراء شعارات البطولة والأندية**. Review the number of successful team matches.

Start with one league and one season. Coverage depends on the active SportMonks subscription and can change; do not assume paid leagues are available in the free plan.

## 8. Build an APK for a physical phone

The Android app must use the development PC's LAN IP, not `localhost` and not the emulator-only address `10.0.2.2`.

Find the PC's IPv4 address:

```powershell
ipconfig
```

Use the IPv4 address of the Wi-Fi/Ethernet adapter that is on the same network as the Android phone. For example, if it is `192.168.1.25`, build with:

```powershell
.\gradlew.bat :android:app:assembleDebug --no-daemon "-PtarehApiBaseUrl=http://192.168.1.25:3000/api/v1/"
```

The debug build includes a debug-only network security rule that permits HTTP requests to a development machine on the local network. This rule is not included in the release variant.

If Windows Firewall blocks the connection, open an elevated PowerShell and allow the API port on private networks only:

```powershell
New-NetFirewallRule -DisplayName "TAREH local API test" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Connect the Android phone to the same Wi-Fi network and install the APK:

```powershell
adb devices
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

Open TAREH, register/sign in with the same or another test phone number, and confirm that upcoming fixtures appear. Save a test prediction on a scheduled match.

For an Android emulator running on the same PC, you can use the default API address `http://10.0.2.2:3000/api/v1/` and omit the Gradle property.

## 9. Test result review in Admin

A result enters the review queue only after the provider reports it as finished. Refresh live data with the SportMonks provider panel, then open the review section.

Check the proposed score before clicking **اعتماد النتيجة**. This action settles points and is not a reversible test operation in the current version. Use a dedicated test database and test accounts; do not finalize real matches unless you intend to distribute their points.

## Important licensing note

Before public launch, review each provider's terms and display rights. SportMonks tokens are private and must remain server-side. TheSportsDB V1 is an attribution/data service; confirm its terms for the intended display of badges and metadata.

## Troubleshooting

- **401/403 from SportMonks:** verify the token in MySportmonks and that the Free Football API is active.
- **No leagues:** the free plan currently covers Danish Superliga and Scottish Premiership; confirm the leagues returned by your account.
- **No seasons:** select another season or verify the selected league has seasons in the active subscription.
- **TheSportsDB finds no team logos:** names may differ from the provider database or a league may not be matched; no unmatched team is modified.
- **Phone cannot reach API:** ensure same Wi-Fi, use the PC's LAN IPv4, allow TCP 3000 on Private firewall profile, and rebuild using that IP.
- **Admin says not authorized:** register the account first, run `admin:grant-superuser` for that phone number, then sign out and back in.
- **No matches in the app:** verify that a season import succeeded and that the API returns rows from `GET /api/v1/matches/upcoming`.

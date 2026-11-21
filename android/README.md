# TAREH Android

Native Android application built with Kotlin and Jetpack Compose.

## Requirements
- Android Studio Otter or newer with Android Gradle Plugin 8.13 support.
- JDK 17 or newer (JDK 21 is suitable).
- Android SDK Platform 36.
- Gradle 8.13 (the checked-in wrapper downloads the configured distribution).

## Open and run
Open the `android/` directory in Android Studio and allow Gradle Sync to finish. Select the `app` configuration and run on an emulator or device.

Windows PowerShell:

    .\gradlew.bat assembleDebug

macOS/Linux:

    ./gradlew assembleDebug

## Connect to the local backend
1. At the repository root, copy `.env.example` to `.env`.
2. Start PostgreSQL and Redis: `docker compose up -d postgres redis`.
3. Start the NestJS backend in another terminal: `cd backend; npm install; npm run prisma:generate; npm run prisma:deploy; npm run dev`.
4. Run the app on the Android emulator. Debug builds default to `http://10.0.2.2:3000/api/v1`, which reaches the host computer from the standard Android emulator.
5. For a physical device on the same LAN, pass a reachable computer address:
   - Windows PowerShell, from the `android/` directory: `..\\gradlew.bat assembleDebug -PTAREH_DEBUG_API_BASE_URL=http://192.168.1.10:3000/api/v1`.
   - macOS/Linux, from the `android/` directory: `./gradlew assembleDebug -PTAREH_DEBUG_API_BASE_URL=http://192.168.1.10:3000/api/v1`.
   Replace the sample IP with the computer's LAN address and allow the backend port through the local firewall.

For a release build, set `TAREH_API_BASE_URL` as a Gradle project property to the deployed HTTPS API URL. Release builds disallow cleartext HTTP.

## Current implementation
- Arabic RTL Compose application shell.
- Premium dark navy/gold design system.
- Supplied TAREH logo.
- Bottom navigation.
- Live call to the public `GET /matches/today` backend endpoint.
- Loading, retry, server-error and empty states.
- Match status, score and kickoff display in Asia/Aden time.

## Not yet implemented
- Authentication and OTP.
- Persistent offline cache.
- Detailed match screen and statistics UI.
- Free prediction submission and user leaderboard.
- Push notification registration.

Do not add cash wallets, deposits, withdrawals, betting odds or real-money wagering to this free release.

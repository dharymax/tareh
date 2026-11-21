# TAREH Android App

Native Android client built with Kotlin and Jetpack Compose.

## Toolchain
- JDK 17
- Android Gradle Plugin 9.3.1
- Gradle 9.5.0
- Kotlin 2.4.21
- compileSdk 37, minSdk 26
- Compose BOM 2026.11.01

The project uses the conventional Kotlin Android Gradle plugin with AGP's built-in Kotlin temporarily disabled for version compatibility. Do not remove the matching Gradle properties without reviewing the Android build configuration.

## Run
Open this repository in Android Studio and sync Gradle. For local emulator development, the API URL defaults to `http://10.0.2.2:3000/api/v1/`.

For a physical device or hosted API, pass:
```bash
-PtarehApiBaseUrl=https://YOUR_API_HOST/api/v1/
```

The app currently includes the home/matches foundation and reads today's matches from `GET /api/v1/matches/today`. Other navigation destinations are staged for later phases.

## Security
- No provider API credentials are embedded in the app.
- Cleartext networking is limited to the Android emulator host (10.0.2.2) for local development.
- Use HTTPS for staging and production.
- Prediction eligibility and scoring must always be verified by the backend.

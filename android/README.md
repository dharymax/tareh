# TAREH Android App

Native Android client built with Kotlin and Jetpack Compose, with Arabic RTL UI and a premium dark navy/gold theme.

## Toolchain
- JDK 17
- Android Gradle Plugin 8.13.2
- Gradle Wrapper 8.13
- Kotlin 2.4.21 with the Compose compiler plugin
- compileSdk 36, targetSdk 36, minSdk 26
- Compose BOM 2025.11.00
- Retrofit 3 and Kotlin Coroutines

The Android toolchain is intentionally pinned to AGP 8.13.2 / Gradle 8.13 to remain compatible with Android Studio Otter. Do not raise compileSdk to 37 or use Compose 1.12+ until the installed Android Studio and AGP are upgraded together; Compose 1.12 requires compileSdk 37 and AGP 9.

## Current implementation
- Arabic OTP login for Yemen +967.
- Secure access/refresh token storage encrypted with Android Keystore (AES-GCM).
- Refresh-token rotation on app startup after access-token expiry.
- Today's matches loaded from the TAREH backend.
- Dark premium home screen with loading, error and empty states.
- Profile placeholder with logout.
- Official app logo from `assets/brand/tareh-logo.png`.

## Run
Open the repository root in Android Studio and sync Gradle. For local emulator development, the API URL defaults to `http://10.0.2.2:3000/api/v1/`.

For a physical device or hosted API, pass:
```bash
./gradlew :android:app:assembleDebug -PtarehApiBaseUrl=https://YOUR_API_HOST/api/v1/
```

## OTP development note
The backend's development OTP adapter writes the test code to the backend terminal only. The Android app never receives an OTP in the send-code response. Production delivery is intentionally disabled until a real SMS provider is configured and verified for +967.

## Security
- No provider API credentials are embedded in the app.
- Tokens are encrypted with an AES key held by Android Keystore.
- Cleartext networking is limited to the Android emulator host (10.0.2.2) for local development.
- Use HTTPS for staging and production.
- Prediction eligibility and scoring are always verified by the backend.
- The product release is free and has no money movement, betting or cash redemption.

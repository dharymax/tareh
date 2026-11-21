# TAREH Android

Native Android application built with Kotlin and Jetpack Compose.

## Requirements
- Android Studio compatible with Android Gradle Plugin 8.13.2.
- JDK 17 or newer (JDK 21 is suitable).
- Android SDK Platform 36.
- Gradle 8.13.

## Open and run
Open the `android/` directory in Android Studio and allow Gradle Sync to finish. Select the `app` configuration and run it on an emulator or device.

The Gradle distribution configuration is in `gradle/wrapper/gradle-wrapper.properties`. If wrapper scripts are not present in the checkout, generate them once from the Android directory using `gradle wrapper --gradle-version 8.13`, or create the wrapper through Android Studio.

## Current implementation
- Arabic RTL Compose application shell.
- Premium dark navy/gold design system.
- TAREH supplied logo.
- Bottom navigation structure.
- Honest empty state until football data is connected.

## Not yet implemented
- Authentication and OTP.
- Repository and API integration.
- Offline cache.
- Match screens and statistics.
- Free prediction submission and user leaderboard.
- Push notification registration.

Do not add cash wallets, deposits, withdrawals, betting odds or real-money wagering to this free release.

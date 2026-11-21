plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

val debugApiBaseUrl = providers.gradleProperty("TAREH_DEBUG_API_BASE_URL")
    .orElse("http://10.0.2.2:3000/api/v1")
val releaseApiBaseUrl = providers.gradleProperty("TAREH_API_BASE_URL")
    .orElse("https://api.tareh.example/api/v1")

android {
    namespace = "com.tareh.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.tareh.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        manifestPlaceholders["allowCleartextTraffic"] = "false"
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"${debugApiBaseUrl.get()}\"")
            manifestPlaceholders["allowCleartextTraffic"] = "true"
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"\u0024{releaseApiBaseUrl.get()}\"")
            manifestPlaceholders["allowCleartextTraffic"] = "false"
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.kotlinx.coroutines.android)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    debugImplementation(libs.androidx.compose.ui.tooling)
    testImplementation(libs.junit)
}

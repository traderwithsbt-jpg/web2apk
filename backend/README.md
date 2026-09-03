# Web2APK Builder

This is a self-hosted Website URL -> Android APK builder.

## Requirements
- Linux VPS/server recommended
- Node.js 20+
- Java 17+
- Android SDK with platform 35 + build-tools installed
- Gradle 8.9+ (or set GRADLE_CMD)
- `ANDROID_HOME` configured

## Start
1. `cd backend`
2. `npm install`
3. `npm start`

Set `PUBLIC_BASE_URL=https://your-builder-domain.example` in production.

## Important
The builder creates a debug APK. For Play Store/production distribution, configure a release keystore and signing pipeline.

The website mirroring step copies the main HTML and same-origin static assets it can identify. Highly dynamic sites, login-protected pages, server-side sessions, DRM, service workers, cross-origin resources, payment flows, and anti-bot protected sites may not mirror correctly. In those cases the generated app can still be adapted to load the original URL instead.

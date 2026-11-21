# Local Development Setup

## Requirements
- Node.js 22.12+ on the 22.x line
- npm 10+
- Docker Engine / Docker Desktop with Compose
- JDK 17 and Android SDK 36 for the Android app

## 1. Configure environment

Clone https://github.com/dharymax/tareh.git and enter the repository directory.

Copy .env.example to .env.
Copy backend/.env.example to backend/.env.

Use the same local PostgreSQL credentials in both environment files. Change sample passwords before exposing any service beyond localhost. Replace the sample JWT and OTP hash secrets with unique random values for every shared environment.

## 2. Start PostgreSQL and Redis

Run: docker compose up -d postgres redis
Then inspect: docker compose ps

The local development ports are bound to 127.0.0.1.

## 3. Install dependencies and generate Prisma Client

Run: npm install
Then: npm --workspace @tareh/backend run prisma:generate

## 4. Apply database migrations

Run: npm --workspace @tareh/backend run prisma:deploy

For a new schema change during local development, create a reviewed migration with:
npm --workspace @tareh/backend run prisma:migrate -- --name descriptive_change

## 5. Seed reference roles and scoring policy

Run: npm run db:seed

The seed is idempotent. It creates the initial role definitions and scoring-rule version 1; it does not create or promote an administrator account.

## 6. Run the API

Run: npm run dev:api

Health endpoints:
- http://localhost:3000/api/v1/health/live
- http://localhost:3000/api/v1/health/ready

In development, the OTP test code is written to the backend terminal. The send-OTP HTTP response does not return the code.

## 7. Run the Admin dashboard

Run: npm run dev:admin

The current dashboard is an initial shell with a live API status indicator. Full administrative workflows and RBAC-protected APIs are not implemented yet.

## 8. Run checks

- npm run build:api
- npm run test:api
- npm --workspace @tareh/backend run lint
- npm --workspace @tareh/backend run typecheck
- npm run build:admin

For Android, run: ./gradlew :android:app:assembleDebug

For a custom API URL, append:
-PtarehApiBaseUrl=https://YOUR_API_HOST/api/v1/

## Important notes
- Production OTP delivery is disabled until a real SMS provider is selected and verified for +967.
- No real football fixtures appear until a commercial data provider or a permitted manual data source is configured.
- Keep secrets out of Git.
- Use separate Development, Staging and Production environments.
- Backups must be tested by restoring to a separate database.
- This release contains no betting, odds, deposits, withdrawals, money movement or cash redemption.

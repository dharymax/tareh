# TAREH Backend

NestJS 12 API on Node.js 24.15+, PostgreSQL and Prisma ORM 7.

## Requirements
- Node.js 24.15.0 or newer.
- Docker Desktop or Docker Engine with Compose.
- npm.

## Local setup
From the repository root:

    cp .env.example .env
    docker compose up -d postgres redis
    cd backend
    npm install
    npm run prisma:generate
    npm run prisma:deploy
    npm run dev

On Windows PowerShell:

    Copy-Item .env.example .env

The backend loads the root .env when commands are run from the backend directory.

## URLs
- Liveness: http://localhost:3000/api/v1/health/live
- Readiness (checks PostgreSQL): http://localhost:3000/api/v1/health/ready

## Commands
- npm run dev — development server with reload.
- npm run build — generate Prisma Client and compile TypeScript.
- npm run typecheck — TypeScript check.
- npm test — scoring unit tests.
- npm run prisma:generate — generate Prisma Client.
- npm run prisma:migrate — create/apply a development migration.
- npm run prisma:deploy — apply committed migrations.

Do not commit .env or real provider credentials. Placeholder credentials must be changed for any shared environment.

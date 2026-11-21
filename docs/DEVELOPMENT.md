# Local Development Setup

## Requirements
- Node.js 22.12+ on the 22.x line
- npm 10+
- Docker Engine / Docker Desktop with Compose

## 1. Configure environment
```bash
git clone https://github.com/dharymax/tareh.git
cd tareh
cp .env.example .env
cp backend/.env.example backend/.env
```
Use the same local PostgreSQL credentials in both files. Change the sample password before exposing any service beyond localhost.

## 2. Start local services
```bash
docker compose up -d postgres redis
docker compose ps
```

## 3. Install dependencies and generate Prisma Client
```bash
npm install
npm --workspace @tareh/backend run prisma:generate
```

## 4. Create the first database migration
```bash
npm --workspace @tareh/backend run prisma:migrate -- --name init
```
Review and commit the generated migration directory.

## 5. Run the API
```bash
npm run dev:api
```
- GET http://localhost:3000/api/v1/health/live
- GET http://localhost:3000/api/v1/health/ready

## 6. Run checks
```bash
npm run build:api
npm run test:api
npm --workspace @tareh/backend run lint
npm --workspace @tareh/backend run typecheck
```

## Notes
- The repository now includes the backend foundation; Android and Admin are not yet complete applications.
- Verify OTP delivery to +967 before selecting a production SMS provider.
- Keep secrets out of Git.
- Use independent staging and production environments.
- Prisma ORM 7 requires the PostgreSQL driver adapter configured by the backend service.

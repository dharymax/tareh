# TAREH Implementation Plan

Estimated planning window: 10–12 weeks for a small experienced team. This is a planning estimate, not a delivery guarantee.

## Phase 0 — prerequisites
- Confirm free sports-only scope and exclusions.
- Evaluate provider coverage, licensing, quota, latency and commercial display rights.
- Verify OTP delivery to +967.
- Decide hosting, backups, domain and secret storage.
- Confirm privacy, retention and account deletion requirements.

## Weeks 1–2 — foundation
- Create monorepo structure.
- Docker Compose for local PostgreSQL and Redis.
- NestJS application skeleton.
- Prisma schema and migrations.
- Health/readiness endpoints.
- CI for lint, type-check and tests.
- Auth, OTP adapter and RBAC.

Exit criteria: migrations run from empty database; protected endpoints enforce roles; CI passes.

## Weeks 3–4 — football data
- Provider adapter interface.
- Competition/season/team synchronization.
- Fixture synchronization and deduplication.
- Match status/result updates.
- Sync logs, retries and stale-data indication.

Exit criteria: provider sync is idempotent; failure and quota limits are observable; source IDs are traceable.

## Weeks 5–6 — Android foundation and football
- Compose theme and RTL design system.
- Navigation and session handling.
- Home, match list and match detail.
- Repository/API layer and loading/error/empty states.
- Cache fixtures for intermittent connections.

Exit criteria: app renders provider-backed matches and shows last refresh time.

## Weeks 7–8 — predictions and ranking
- Create/update prediction rules.
- Database race-condition protection.
- Result finalization workflow.
- Versioned scoring service.
- Idempotent settlement and reversal ledger.
- Leaderboard queries/projections.
- Role-protected final-result confirmation and atomic point settlement.

Exit criteria: tests prove no post-kickoff submissions and no duplicate point settlement.

## Weeks 9–10 — admin and notifications
- Admin login and RBAC.
- Final-result confirmation and point settlement.
- Dashboard, users, competitions, teams and matches.
- Result review/finalization.
- Sync monitoring and audit log.
- FCM device registration and notification jobs.

Exit criteria: admin changes are permission-checked and audited.

## Weeks 11–12 — hardening and release
- Integration and end-to-end tests.
- Load tests for match lists and leaderboards.
- Security review and dependency checks.
- Backup restore drill.
- Staging deployment and limited pilot.
- Production checklist and rollback plan.

## Work breakdown by workstream
Backend:
- Auth, users, football, providers, predictions, scoring, leaderboard, notifications, admin, audit.

Android:
- Auth, home, fixtures, match detail, prediction, history, leaderboard, profile, notifications.

Admin:
- Dashboard, users, football data, result review, provider health, reports, RBAC.

Infrastructure:
- Containers, reverse proxy, TLS, migrations, CI/CD, secrets, backups, monitoring.

## Definition of done
- Acceptance criteria in PRD pass.
- No secrets in source control.
- Tests cover critical domain rules.
- Monitoring and backups configured.
- Restore tested.
- Production API uses TLS.
- Store listing and privacy policy reviewed.
- No money movement, wager, odds or cash redemption functionality exists in this release.

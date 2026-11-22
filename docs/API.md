# TAREH API Contract

Base path: /api/v1  
Format: JSON  
Authentication: Bearer access token for private endpoints. OTP initiation/verification and public football reads are unauthenticated.  
Locale: Arabic (ar).  
Storage time: UTC. Client display time: Asia/Aden.

## Implemented endpoints

### Health
- GET /health/live — process liveness.
- GET /health/ready — database readiness.

### Authentication
- POST /auth/send-otp — body: { "phone": "+967..." }.
- POST /auth/verify-otp — body: { "phone": "+967...", "code": "123456" }.
- POST /auth/refresh — body: { "refreshToken": "..." }; rotates the refresh token.
- POST /auth/logout — body: { "refreshToken": "..." }; revokes the session.
- GET /auth/me — Bearer auth; returns current account/profile and point balance.

OTP codes are HMAC-SHA256 hashed at rest, expire after the configured TTL (default five minutes), allow at most five verification attempts and are consumed atomically. A phone number is limited to three OTP requests per hour with a 60-second resend cooldown.

Development: the placeholder delivery adapter writes the test code to the backend process log only; the HTTP response never includes the OTP. Production: sending is disabled and returns HTTP 503 until a real SMS provider is configured and delivery to Yemen (+967) is verified.

Access tokens are HS256 JWTs with a 15-minute lifetime. Refresh tokens are random opaque values stored only as SHA-256 hashes, have a 30-day lifetime and rotate on refresh. Logout revokes the current refresh session.

### Admin (authenticated and role-protected)
- GET /admin/dashboard — requires SUPER_ADMIN or SPORTS_MANAGER.
- GET /admin/matches/pending-review — requires SUPER_ADMIN or SPORTS_MANAGER; returns finished matches awaiting result confirmation.
- POST /admin/matches/:matchId/finalize — requires SUPER_ADMIN or SPORTS_MANAGER; body: { "homeScore": 2, "awayScore": 1 }. Only accepts finished matches whose result has not already been confirmed. Result settlement and point transactions are committed atomically, with an audit record.

### Sports data providers (admin-only)

All provider endpoints require Bearer authentication and the SUPER_ADMIN or SPORTS_MANAGER role.

**SportMonks Football API v3 (primary fixtures/results source)**

- GET /admin/providers/sportmonks/connection — checks the server-side API token and returns the competitions available to the account.
- GET /admin/providers/sportmonks/leagues — lists leagues available to the subscription, with country and current-season summary.
- GET /admin/providers/sportmonks/leagues/:leagueId/seasons — lists seasons for a SportMonks league ID.
- GET /admin/providers/sportmonks/imported-leagues — lists local leagues previously imported from SportMonks.
- POST /admin/providers/sportmonks/sync-season — body: { "leagueId": 271, "seasonId": 17328 }; imports the selected season's teams, fixtures, scores, events and statistics.
- POST /admin/providers/sportmonks/sync-live — refreshes currently in-play fixtures that have already been imported.

**TheSportsDB V1 (secondary metadata and badge enrichment)**

- GET /admin/providers/thesportsdb/connection — verifies access to the free V1 catalogue.
- POST /admin/providers/thesportsdb/enrich-league/:localLeagueUuid — attempts country/league/team-name matching and updates local league/team badge URLs when a trustworthy match is found. The free V1 team-list endpoint returns at most 10 records per request.

SportMonks final scores are imported as pending review; they are not automatically confirmed and prediction points are not settled. TheSportsDB is not used for live scores on the free V1 key. Provider tokens are read only from backend environment variables; the TheSportsDB public key defaults to 123. Sync is manually triggered in this version.

### Football (public read)
- GET /leagues?enabled=true|false
- GET /leagues/:leagueId
- GET /teams?leagueId=&search=
- GET /matches?date=&leagueId=&status=&cursor=&limit=
- GET /matches/live
- GET /matches/today
- GET /matches/upcoming?from=&to=&limit=
- GET /matches/:matchId
- GET /matches/:matchId/statistics
- GET /matches/:matchId/events

Match list endpoints use cursor pagination where applicable. Dates supplied by clients use YYYY-MM-DD and are interpreted in Yemen time for the date filter. API timestamps are ISO-8601 UTC.

### Leaderboard (public aggregate data)
- GET /leaderboard/global?period=all|week|month&limit=50
- GET /leaderboard/season/:seasonId?limit=50

Weekly periods begin Monday 00:00 in Asia/Aden; monthly periods use the local calendar month. Public ranking data contains display name and avatar only, never phone numbers. Points are derived from the point transaction ledger.

### Free predictions
- POST /predictions — Bearer auth; body: { "matchId": "uuid", "homeGoals": 2, "awayGoals": 1 }.
- PATCH /predictions/:predictionId — Bearer auth; owner only; body: { "homeGoals": 2, "awayGoals": 1 }.
- GET /predictions/me?limit=25&cursor= — Bearer auth; current user's paginated prediction history.
- GET /predictions/match/:matchId — public aggregate count only.

Prediction writes derive user identity from the validated access token; clients cannot provide userId. The API validates goals from 0–30, locks the match row inside a PostgreSQL transaction, and accepts a prediction only while the match status is SCHEDULED and kickoff is still in the future according to the database clock. A unique (userId, matchId) constraint permits one prediction per user and match. The public match summary never reveals individual picks.

## Planned endpoints (not implemented yet)

The following modules remain on the roadmap and must not be treated as available until implemented and tested:

- User profile editing and user statistics.
- Team detail and standings.
- Resettlement/reversal workflow for correcting a result after it has already been confirmed.
- Notification inbox and device-token registration.
- User/football management, audit log management and broader RBAC-protected write routes.

## Match status enum
SCHEDULED, LIVE, HALF_TIME, PAUSED, FINISHED, POSTPONED, CANCELLED, ABANDONED.

## Scoring policy
- Exact score: 5 points.
- Correct outcome: 3 points.
- Correct total goals only when outcome is wrong: 2 points.
- Otherwise: 0 points.

Apply only the highest matching category. Goal difference is intentionally not a separate category because a correct goal difference necessarily implies the same match outcome.

## Security requirements
- HTTPS in deployed environments.
- Never trust client-provided user ID, kickoff, match status or final score.
- Do not expose phone numbers or provider secrets in public responses.
- Validate ownership and role on every protected resource.
- OTP provider secrets and sports provider API keys must remain server-side.
- Keep production credentials out of source control.

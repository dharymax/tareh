# TAREH API Contract

Base path: /api/v1  
Format: JSON  
Authentication: Bearer access token, except OTP initiation/verification and public endpoints.  
Locale: Arabic (ar).  
Time format: ISO-8601 UTC; clients render in Asia/Aden.

## Standard response
Success:
```json
{ "data": {}, "meta": { "requestId": "uuid" } }
```
Error:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "بيانات غير صالحة", "details": [] }, "meta": { "requestId": "uuid" } }
```

## Authentication
- POST /auth/send-otp — body: { "phone": "+967..." }; public; rate limited.
- POST /auth/verify-otp — body: { "phone": "+967...", "code": "123456" }; returns access/refresh tokens.
- POST /auth/refresh — rotate refresh token.
- POST /auth/logout — revoke refresh token.
- GET /auth/me — current authenticated account.

OTP codes are HMAC-SHA256 hashed at rest, expire after the configured TTL (default 5 minutes), allow at most five verification attempts and are consumed atomically. A phone number is limited to three OTP requests per hour with a 60-second resend cooldown.

Development: the placeholder delivery adapter writes the test code to the backend process log only; the HTTP response never includes the OTP. Production: sending is intentionally disabled and returns a service-unavailable error until a real SMS provider is configured and delivery to +967 is verified.

Access tokens are HS256 JWTs with a 15-minute lifetime. Refresh tokens are random opaque values stored only as SHA-256 hashes, have a 30-day lifetime and rotate on refresh. Logout revokes the current refresh session.

## Users
- GET /users/me
- PATCH /users/me — allow-listed display name/avatar fields only.
- GET /users/me/statistics
- GET /users/me/predictions?cursor=&limit=

## Football
- GET /leagues?enabled=true
- GET /leagues/:leagueId
- GET /teams?leagueId=&search=
- GET /teams/:teamId
- GET /matches?date=&leagueId=&status=&cursor=&limit=
- GET /matches/live
- GET /matches/today
- GET /matches/upcoming?from=&to=
- GET /matches/:matchId
- GET /matches/:matchId/statistics
- GET /matches/:matchId/events

Public list endpoints must paginate and return lastUpdatedAt when data may be stale.

## Free predictions
- POST /predictions — body: { "matchId": "uuid", "homeGoals": 2, "awayGoals": 1 }.
- PATCH /predictions/:predictionId — same score fields; only before lock.
- GET /predictions/me
- GET /predictions/match/:matchId — return aggregate counts only; do not reveal active users' exact predictions before kickoff.
- GET /predictions/:predictionId — owner or authorized admin only.

Prediction write requests should support an Idempotency-Key header. The backend determines kickoff lock time and validates the match status inside a database transaction.

## Leaderboards
- GET /leaderboard/global?period=all|week|month
- GET /leaderboard/season/:seasonId
- GET /leaderboard/me

## Notifications
- GET /notifications?cursor=&limit=
- PATCH /notifications/:notificationId/read
- POST /devices/register — { "token": "...", "platform": "ANDROID" }
- DELETE /devices/:deviceId

## Admin — requires RBAC
- GET /admin/dashboard
- GET /admin/users?search=&status=&cursor=
- PATCH /admin/users/:userId/status
- POST /admin/leagues
- PATCH /admin/leagues/:leagueId
- POST /admin/teams
- PATCH /admin/teams/:teamId
- POST /admin/matches
- PATCH /admin/matches/:matchId
- POST /admin/matches/:matchId/finalize
- GET /admin/predictions?matchId=
- POST /admin/matches/:matchId/recalculate-points
- GET /admin/sync-logs
- POST /admin/sync/trigger
- GET /admin/audit-logs

## Admin permissions
Use explicit permissions, not only UI hiding:
- users.read / users.manage
- football.read / football.manage
- results.finalize
- predictions.read
- points.resettle
- provider.manage
- notifications.send
- reports.read
- roles.manage
- audit.read

## Match status enum
SCHEDULED, LIVE, HALF_TIME, PAUSED, FINISHED, POSTPONED, CANCELLED, ABANDONED.

## Scoring
Settlement only after trusted final result is confirmed:
- Exact score: 5.
- Correct outcome: 3.
- Correct total goals (with an incorrect outcome): 2.
- Otherwise: 0.
Apply highest matching category only. Store scoring-rule version. Do not use goal difference as a separate category because it necessarily implies the same outcome.

## Security and operations
- HTTPS only in deployed environments.
- Rate limit authentication and prediction writes.
- Never trust client-provided kickoff/status/score.
- Do not expose phone numbers or provider secrets in public responses.
- Validate ownership and role on every protected resource.
- Return consistent error codes and request IDs.


## Implemented free prediction endpoints
- POST /predictions — Bearer auth; body: { "matchId": "uuid", "homeGoals": 2, "awayGoals": 1 }.
- PATCH /predictions/:predictionId — Bearer auth; owner only; body: { "homeGoals": 2, "awayGoals": 1 }.
- GET /predictions/me — Bearer auth; paginated history for the current user.
- GET /predictions/match/:matchId — public aggregate count only.

Prediction writes derive the user identity from the validated access token; clients cannot provide userId. The API validates goals from 0 to 30, locks the match row inside a PostgreSQL transaction, and accepts a prediction only while the match status is SCHEDULED and its kickoff is still in the future according to the database clock. A unique (userId, matchId) constraint permits one prediction per user and match. The public match summary never reveals individual picks.

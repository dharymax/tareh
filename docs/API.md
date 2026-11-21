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

OTP codes must be hashed at rest, expire quickly, be single-use and have attempt limits. Select an OTP provider only after testing delivery to +967.

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
- Correct total goals, only when the outcome is incorrect: 2.
- Otherwise: 0.
Apply highest matching category only. Store scoring-rule version.

## Security and operations
- HTTPS only in deployed environments.
- Rate limit authentication and prediction writes.
- Never trust client-provided kickoff/status/score.
- Do not expose phone numbers or provider secrets in public responses.
- Validate ownership and role on every protected resource.
- Return consistent error codes and request IDs.

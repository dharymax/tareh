# TAREH — Product Requirements Document

- Version: 1.0
- Date: 2026-11-21
- Product: طارح (TAREH)
- Initial market: Yemen
- Locale: Arabic, RTL
- Platforms: Android app + Web Admin
- Release: Free MVP

## 1. Product vision
TAREH is an Arabic football companion for fixtures, live scores, match information, statistics and free score predictions using non-monetary points.

## 2. Scope and explicit exclusions
Included:
- Account registration and authentication.
- Football competitions, seasons, teams, fixtures and results.
- Match details, events and available statistics.
- Free score predictions.
- Points, prediction history and leaderboards.
- Push notifications.
- Administrative dashboard and audit trail.

Excluded from this release:
- Real-money betting or wagering.
- Deposits, withdrawals or cash wallets.
- Odds or stake-based returns.
- Buying predictions or paid entry to prediction contests.
- Cash redemption, transfer or sale of points.
- Referral schemes that pay based on wagering.

Points are game-ranking units only and have no cash value.

## 3. User roles
### User
Register, manage profile, browse matches, submit/edit a prediction before kickoff, view points and leaderboards, manage notification preferences.

### Super Admin
Manage users, roles, competitions, teams, matches, provider settings, scoring rules, notifications, reports and audit logs.

### Sports Manager
Manage football data and review match status/results within assigned permissions.

### Content Manager
Manage competition and team presentation data; cannot alter points or security roles.

### Support Agent
Review user requests and account status; read-only access to prediction and scoring history.

## 4. Android screens
1. Splash and session restoration.
2. Phone authentication with OTP (provider must support +967 and be verified before selection).
3. Home: live, today's, upcoming and completed matches.
4. Match list with date and competition filters.
5. Match detail: teams, kickoff, status, score, events and available statistics.
6. Free prediction: home goals and away goals.
7. Prediction history.
8. Leaderboards: weekly, monthly and season.
9. User profile and statistics.
10. Notification inbox and settings.

## 5. Prediction rules
- One active prediction per user and match.
- Prediction may be created or edited only before the server-calculated lock time.
- Default lock time is official kickoff time.
- Server is authoritative for kickoff and match status; never trust client time.
- Reject predictions when match is live, finished, postponed, cancelled or otherwise closed.
- Store creation and update timestamps.
- Keep an immutable scoring/settlement history.
- Scoring is performed only after a trusted final result is confirmed.

## 6. Initial scoring policy
Use one highest applicable category only:
- Exact score: 5 points.
- Correct outcome (home win/draw/away win): 3 points.
- Correct total goals (while the match outcome is wrong): 2 points.
- Otherwise: 0 points.

Do not add categories together. Store a scoring-rule version with every settlement. Total goals replaces goal difference because a correct goal difference necessarily implies a correct match outcome.

## 7. Leaderboards
- All-time, weekly, monthly and season.
- Primary sort: total points descending.
- Tie-breakers: exact-score predictions descending, then earliest timestamp reaching the total.
- Publish only aggregate public profile fields; do not expose phone numbers.

## 8. Admin dashboard
- Overview: users, active users, matches today/live, predictions, pending result review, sync health.
- User management and role assignments.
- Competition, season and team management.
- Match management and result review.
- Provider configuration and sync logs.
- Prediction review and controlled resettlement.
- Notification composer.
- Reports and audit logs.

Sensitive actions require explicit permissions and audit records.

## 9. Data provider
Implement a provider-adapter interface; do not couple domain services to one vendor.
Candidate vendors for evaluation: API-Football, Sportradar, Genius Sports.
Before contracting, verify competition coverage, update latency, historical data, API quotas, commercial display rights, logo rights, support, service levels and permitted use in a free consumer app.
Never embed provider API keys in Android or browser code.

## 10. Non-functional requirements
- Arabic RTL throughout the consumer app and admin.
- Asia/Aden display timezone; store timestamps in UTC.
- Graceful behaviour on weak/intermittent networks.
- Cache public fixture data and show last-updated timestamp.
- Pagination for match lists and histories.
- Server-side authorization and validation.
- Rate limiting, audit logs, backups and tested restores.
- Responsive admin dashboard.
- Accessibility: scalable text, adequate contrast and semantic labels.

## 11. Acceptance criteria
- User can authenticate and access profile.
- Competitions, teams and fixtures load from backend.
- Live/status/score updates are traceable to provider sync.
- Duplicate predictions are prevented by database constraint.
- Prediction is rejected at/after lock time, including concurrent requests.
- Points are settled once and are reproducible from stored rule version.
- Resettlement is auditable and never silently edits historical ledger entries.
- Leaderboards match settled point totals.
- Admin endpoints enforce server-side role checks.
- Backup restore and core security tests pass.

## 12. Release boundary
Release only the free sports product. Do not implement money movement, betting, odds, stake or cash redemption features. Any future change in business model requires separate legal review and a new product specification.


## Implemented prediction security note
The current API derives the user from the verified JWT, validates score fields between 0 and 30, locks the match row during the write transaction, and rejects requests after kickoff or when the match is not SCHEDULED. Public match prediction summaries expose only a total count, not individual selections.

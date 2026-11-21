# Sportradar Soccer API v4 setup

## 1. Confirm product access, licensing and coverage

The integration uses the **Sportradar Soccer API v4** product. A Marketplace account or a key for another Sportradar product is not sufficient by itself; the key must be enabled for Soccer API v4.

**Important legal/product restriction:** Sportradar's current Master Terms (last updated November 13, 2026) restrict a free trial to internal evaluation; trial data/content must not be published or displayed to app users. The terms also require prior written approval for use in a betting, gaming, gambling or wagering capacity, and separately restrict prediction-market, trading, financial-product or similar use without prior written consent. TAREH's free non-cash prediction points do not automatically establish that the use is permitted. Obtain written confirmation from Sportradar and the correct production license/order form before showing the data publicly or launching prediction features that rely on it. Until then, use the trial only for private technical evaluation.

Before importing a competition, use Sportradar's [Coverage Matrix](https://coverage-matrix.sportradar.com/) to verify the specific competition and season. Check that the level includes fixture and score coverage. A competition name in the catalog does not guarantee live scores, events or detailed statistics.

## 2. Configure the backend key

Never add the API key to Android, Admin frontend, source code, a committed .env file, or a public GitHub commit. The Git repository is public.

For a local backend started from the `backend` directory, copy `.env.example` to `.env` and set:

```env
SPORTRADAR_API_KEY=YOUR_SOCCER_API_KEY
SPORTRADAR_ACCESS_LEVEL=trial
SPORTRADAR_LANGUAGE=en
SPORTRADAR_API_BASE_URL=https://api.sportradar.com/soccer
```

Use `trial` for a trial key and change `SPORTRADAR_ACCESS_LEVEL` to `production` only when Sportradar has issued production Soccer API access.

When running Docker Compose from the repository root, put the same variables in the root `.env` file. Compose passes them only to the API container.

Restart the API after changing the environment.

## 3. Check the connection and Yemen coverage

Use an admin access token belonging to a user with `SUPER_ADMIN` or `SPORTS_MANAGER`.

```http
GET /api/v1/admin/providers/sportradar/connection
Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN
```

The response includes:
- `connected`: whether the key successfully accessed the Soccer competitions feed.
- `availableCompetitions`: total competitions returned by the key.
- `yemenCompetitions`: competitions categorized under Yemen.
- `hasYemenCoverage`: whether any Yemen competition was returned by the catalog.

If `hasYemenCoverage` is false, do not choose a different country's competition as a replacement for the Yemeni league. Check the Coverage Matrix and confirm the required competition/season with Sportradar.

## 4. Select a season

For a competition ID returned by the previous request:

```http
GET /api/v1/admin/providers/sportradar/competitions/sr:competition:123/seasons
Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN
```

Choose an enabled season and copy its exact `id` value.

## 5. Import the season

```http
POST /api/v1/admin/providers/sportradar/sync-season
Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN
Content-Type: application/json

{
  "competitionId": "sr:competition:123",
  "seasonId": "sr:season:456"
}
```

This imports the season's league, teams and fixtures to PostgreSQL. The operation is safe to repeat: provider IDs are used as stable upsert keys.

Imported finished matches are marked `FINISHED`, but their result is **not automatically confirmed** and prediction points are not distributed. A `SUPER_ADMIN` or `SPORTS_MANAGER` must review and finalize the score in the existing Admin result-review flow.

## 6. Refresh live scores

```http
POST /api/v1/admin/providers/sportradar/sync-live
Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN
```

This updates live scores/status only for matches already imported from Sportradar. This release does not schedule automatic polling; call the endpoint deliberately or add a controlled server-side scheduler after confirming the subscription quota and required refresh interval.

## 7. Verify data in TAREH

After a successful import, verify:

- `GET /api/v1/leagues`
- `GET /api/v1/matches/upcoming`
- `GET /api/v1/matches/today`
- `GET /api/v1/matches/live`

## Trial limits and request usage

Sportradar documents default trial limits of a 30-day trial, 1,000 requests per rolling 30 days and 1 request per second. The season import uses one season-list request and one season-schedule request. The live refresh uses one request. Avoid repeatedly testing the endpoints; check usage in the Sportradar account.

## Official references

- [Soccer API basics](https://developer.sportradar.com/soccer/docs/soccer-ig-api-basics)
- [API authentication](https://developer.sportradar.com/getting-started/docs/authentication)
- [Competitions feed](https://developer.sportradar.com/soccer/reference/soccer-competitions)
- [Competition seasons feed](https://developer.sportradar.com/soccer/reference/soccer-competition-seasons)
- [Season schedule feed](https://developer.sportradar.com/soccer/reference/soccer-season-schedule)
- [Live schedules feed](https://developer.sportradar.com/soccer/reference/soccer-live-schedules)
- [Coverage Matrix](https://coverage-matrix.sportradar.com/)

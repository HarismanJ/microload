# LiftLog E2E Tests

Playwright covers the highest-value real Supabase-backed user journeys:

- Workout critical path: sign in, start an empty workout, log Bench Press, finish, and verify persisted rows.
- Workout draft/resume: leave an unfinished workout in local storage, restart the app, resume it, and finish.
- Workout cancel/discard: abandon an in-progress workout and verify no session remains.
- Suggested routine start: start the `Push` routine, log a Bench Press set, and verify persistence.
- Nutrition create/log/delete: create a custom food, add it to the log, delete it, and verify the database.
- Home calendar/history: complete a workout and verify today's detail view shows sets and volume.

## Setup

Use a dedicated Supabase test project or disposable test user. Do not point this at production.

Required environment variables:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
E2E_USER_EMAIL=liftlog-e2e@example.com
E2E_USER_PASSWORD=...
```

`E2E_SUPABASE_SERVICE_ROLE_KEY` can be used instead of `SUPABASE_SERVICE_ROLE_KEY`.

Optional:

```sh
E2E_EXERCISE_NAME="Bench Press"
PLAYWRIGHT_PORT=4174
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4174
```

The config loads `.env.e2e`, `.env.local`, and `.env` before running, so local-only E2E variables can live in an ignored env file. The suite creates or updates the fixture auth user, resets that user's workout and nutrition data before each test and after the run, and skips cleanly if the required variables are missing.

Keep this suite local/manual until CI has a dedicated Supabase test project and safe CI secrets.

## Commands

```sh
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

Install browsers once per machine if Playwright asks for them:

```sh
npx playwright install chromium
```

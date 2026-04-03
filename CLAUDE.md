# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build (outputs to /dist)
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test suite exists in this project.

## What this app is

**microload** — a mobile-first weightlifting tracker with strength rankings, nutrition logging, and a competitive "battles" system. Deployed as a web app and wrapped in Capacitor for iOS/Android.

## Architecture

### Navigation & routing
`App.jsx` is the entire shell. There is no React Router — navigation is a `useState` tab switcher over `TAB_ORDER = ['home', 'workout', 'ranks', 'nutrition']`. All tab components are lazy-loaded. Tab direction (forward/backward) is tracked for swipe animations.

### Data layer
All persistence goes through **Supabase** (Postgres + RLS). There is no ORM or query layer — components call `supabase.from(...)` directly. The Supabase client is a singleton from `src/lib/supabase.js`.

### Caching (`src/lib/cache.js`)
Two-tier cache used throughout to avoid redundant Supabase fetches:
- **In-memory** (`getCached` / `setCached`): 30-min TTL, lost on page reload
- **localStorage snapshots** (`getStartupSnapshot` / `setStartupSnapshot`): persists across sessions under the key prefix `liftlog:startup-snapshot:`

After any mutation, call `invalidateCache(...keys)` with the affected cache keys (e.g. `'ranks'`, `'home'`, `'profile'`). Components check the cache first and fall back to a Supabase fetch.

### Strength math (`src/lib/`)
- `orm.js` — Brzycki/Epley average for 1RM estimation
- `liftMath.js` — weight unit conversion (kg ↔ lbs), bodyweight-relative load, `weightForOrm()`
- `strengthStandards.js` — large static dataset of gender/bodyweight tier thresholds used by the Ranks page

### Ranks page (`src/components/Ranks.jsx`)
Self-contained heavy component. Key internal concepts:
- `MUSCLE_GROUPS` — maps muscle group keys to SVG muscle names used by `react-body-highlighter`
- `buildMuscleGroupRank()` — aggregates lift ranks into a per-muscle-group score using weighted decay
- `muscleRevealCount` / `muscleShimmer` / `muscleLoadingActive` — three states that orchestrate the muscle chart animation sequence (loading pulse → staggered color reveal → shimmer sweep)
- `muscleChartSignature` — a string derived from all group ranks, used as a `useEffect` dependency to re-trigger the animation when data changes

### Theming
Six dark themes defined as CSS variable sets in `src/styles/theme.css`. Active theme stored in `localStorage` under `liftlog:theme` and applied as a `data-theme` attribute on `<html>`. `ThemeContext` (`src/context/ThemeContext.jsx`) exposes `theme` and `setTheme`.

### Mobile specifics
- Capacitor plugins: `LocalNotifications` (rest timer), camera/barcode for nutrition scanning
- iOS keyboard fix: `focusout` listener scrolls `window` to prevent viewport shift
- `capacitor.config.json` disables native scroll on iOS; Android uses `adjustResize`
- Touch swipe detection on the tab shell ignores inputs, buttons, draggables, and elements with `data-tab-swipe-ignore="true"`

### Battles system (`src/lib/battles.js`)
Async invite/respond/recap flow stored in Supabase. `App.jsx` polls for pending invites, active rooms, and unseen results on mount and tab focus.

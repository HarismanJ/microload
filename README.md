# microload

A mobile-first fitness tracking app for iOS and Android, built by Harisman Jeyakanthan. Covers workout logging, strength ranking, nutrition tracking, and more — designed and tested on a real device throughout.

Built with assistance from Claude (Anthropic).

---

## Stack

- **React 19 + Vite** — frontend
- **Supabase** — Postgres database, auth, and row-level security
- **Capacitor** — iOS and Android packaging
- **Custom CSS** — no component library, full theme system via CSS variables

---

## Features

### Workout Tracker
- Start empty workouts or launch from saved routines
- Exercise picker with search by name, category, and equipment
- Log sets with weight + reps, kg/lbs unit toggle per exercise
- Swipe-to-delete sets, drag-to-reorder exercises
- Rest timer per exercise, global workout timer — both use absolute timestamps so they survive app backgrounding
- Pre-fills first set from your previous session for each exercise
- Per-exercise notes
- Cancel / finish confirmation flow with a post-workout summary screen

### Routines
- Built-in suggested routines plus user-created routines
- Create, edit, and delete routines via a routine builder
- Start any routine directly from the workout tab

### Strength Ranks
- Strength standards across ~190 exercises
- 27 tiers from Iron to Elite, scored by bodyweight ratio
- 1RM Calculator — estimate your one-rep max from any working set
- Exercise detail pages with muscle map diagrams
- Two modes: Current (rolling 21-day activity window) and All-Time (best ever)

### Workout Summary
- Post-workout breakdown with rank-up animations and achievement unlocks

### Nutrition
- Unified daily food log feed
- Calorie ring, macro bars, and micronutrient breakdown
- Food search, recent foods, and custom food creation
- Daily date navigation
- Calories burned tracking synced from workout sessions

### Home Dashboard
- Today's nutrition and calorie burn widgets
- Bodyweight graph
- Workout streak tracker

### Profile
- Edit name, username, age, gender, bodyweight, unit preference, default rest time
- Set nutrition goals (calories, protein, carbs, fat)
- Workout calendar — tap any day to see the full workout and nutrition log
- Achievements page
- Bug report form (native, in-app)

### Themes
- 6 full themes — Obsidian, Forest, Navy, Twilight, Crimson, Dusk
- Saved to Supabase for cross-device sync, with localStorage fallback for instant load

### iOS / Android
- Safe area insets for Dynamic Island, home indicator, and landscape notches
- Native local notifications for rest timers
- Deep link support for password reset flow
- Android notification icon uses the app logo

---

## Database Schema (key tables)

| Table | Purpose |
|---|---|
| `profiles` | User settings, goals, bodyweight, theme |
| `exercises` | Exercise library with muscles and equipment |
| `workout_sessions` | Each workout with timestamps and notes |
| `workout_sets` | Individual sets with weight, reps, unit, estimated 1RM |
| `user_routines` | Saved user routines |
| `foods` | Food database (global + user-created) |
| `nutrition_logs` | Daily food log entries |

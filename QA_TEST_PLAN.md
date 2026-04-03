# microload — QA Test Plan

## Authentication

| # | Test | Expected |
|---|------|----------|
| A1 | Sign up with a new email | Account created, navigates to home |
| A2 | Sign in with valid credentials | Authenticated, home tab loads |
| A3 | Sign in with wrong password | Error message shown, no navigation |
| A4 | Sign out | Returns to auth screen, session cleared |
| A5 | Reload app while signed in | Session restored from Supabase, no re-login needed |
| A6 | Open app with no internet | Cached data loads from localStorage snapshot |

---

## Navigation & Tab System

| # | Test | Expected |
|---|------|----------|
| N1 | Tap each tab | Correct screen loads, forward animation |
| N2 | Tap back to previous tab | Backward animation |
| N3 | Swipe left between tabs | Tab advances forward |
| N4 | Swipe right between tabs | Tab goes backward |
| N5 | Swipe on an input field | Should NOT trigger tab change |
| N6 | Swipe on a button | Should NOT trigger tab change |
| N7 | Swipe < 40px horizontally | Should NOT trigger tab change |
| N8 | Navigate to workout tab while workout active | Shows active workout (not start screen) |
| N9 | Tap active tab while already on it | No animation, stays put |

---

## Home

| # | Test | Expected |
|---|------|----------|
| H1 | Open app with no workouts logged | "No recent workout" empty state |
| H2 | Open app with no nutrition logged today | Calories show 0 / goal |
| H3 | Open app with no bodyweight logged | Bodyweight section shows prompt |
| H4 | Tap nutrition card | Navigates to Nutrition tab |
| H5 | Log bodyweight (valid number) | Saved, chart updates |
| H6 | Log bodyweight with 0 | Rejected (no save) |
| H7 | Log bodyweight with negative | Rejected |
| H8 | Log bodyweight with letters | Rejected |
| H9 | Delete only bodyweight log | Profile bodyweight set to null |
| H10 | Delete one bodyweight log when multiple exist | Profile bodyweight becomes second-latest |
| H11 | Toggle kg/lbs on weight chart | Values convert correctly |
| H12 | Filter weight logs by 1w, 1m, 1y | Chart range changes accordingly |
| H13 | Tap calendar day with a workout | Day detail opens, shows exercises |
| H14 | Tap calendar day with no workout | Nothing or empty state |
| H15 | Check streak counter | Correct count of consecutive workout days |
| H16 | Streak with a gap day | Resets to 0 or shows current streak |

---

## Workout — Starting

| # | Test | Expected |
|---|------|----------|
| W1 | Start empty workout | Timer starts, exercise picker appears |
| W2 | Start workout from template | Template exercises pre-loaded |
| W3 | Start workout when a draft exists | "Resume or start new" dialog shown |
| W4 | Resume saved workout | Previous exercises, sets, timer restored |
| W5 | Background app mid-workout, return | Timer still accurate (absolute endTime) |
| W6 | Kill and reopen app mid-workout | Draft restored, workout resumable |
| W7 | Draft is 4 days old | Expired draft detected, session deleted, start fresh |
| W8 | Start workout, immediately cancel | Confirms cancellation, no session saved |

---

## Workout — Exercise Management

| # | Test | Expected |
|---|------|----------|
| W9 | Search for an exercise | Filtered results shown |
| W10 | Search returns no results | "No results" empty state |
| W11 | Add multiple exercises at once | All added to workout in order |
| W12 | Add 0 exercises and tap Add | Add button disabled |
| W13 | Create custom exercise with unique name | Saved, appears in list |
| W14 | Create custom exercise with duplicate name | Error shown (23505) |
| W15 | Drag to reorder exercises | Order persists in state |
| W16 | Drag partially then cancel | Order restored from dragStartOrderRef |
| W17 | Swipe a set row left > 70% width | Set deleted with animation |
| W18 | Swipe a set row left < 70% width | Set stays (snap back) |
| W19 | Remove all sets from an exercise | Exercise stays, shows "Add Set" |
| W20 | Add more than 10 sets to one exercise | All added correctly |

---

## Workout — Logging Sets

| # | Test | Expected |
|---|------|----------|
| W21 | Enter valid weight + reps, tap Done | Set marked complete, rest timer starts |
| W22 | Tap Done with empty weight | Done button disabled |
| W23 | Tap Done with empty reps | Done button disabled |
| W24 | Tap Done with 0 reps | Done button disabled |
| W25 | Enter 101 reps | Done button disabled (>MAX_REPS) |
| W26 | Enter weight outside valid range for equipment | Done button disabled |
| W27 | Toggle kg/lbs on a set with a value | Weight converts correctly |
| W28 | Toggle kg/lbs on empty set | No crash, stays empty |
| W29 | Add notes to exercise | Notes show on the exercise card |
| W30 | Edit default rest time via wheel picker | New value used for subsequent sets |
| W31 | Open exercise notes on multiple exercises at once | Each notes field is independent |
| W32 | Log set for bodyweight exercise (no bodyweight stored) | Uses 70kg default, no crash |

---

## Workout — Rest Timer

| # | Test | Expected |
|---|------|----------|
| W33 | Complete a set | Rest timer overlay appears at bottom |
| W34 | Rest timer overlay — can still scroll workout list | Exercises visible above overlay |
| W35 | Rest timer overlay — doesn't cover cancel/finish buttons | Buttons accessible while resting |
| W36 | Tap Skip on rest timer | Timer dismissed |
| W37 | Tap −5s on rest timer | Countdown decrements by 5 |
| W38 | Tap −5s when <5s remains | Timer goes to 0 and dismisses cleanly |
| W39 | Tap +5s on rest timer | Countdown increments by 5 |
| W40 | Background app during rest timer | Timer still accurate on return |
| W41 | Rest timer reaches 0 | Overlay dismisses, notification fires |
| W42 | Complete another set during rest | Rest timer resets to new exercise's rest time |

---

## Workout — Finishing

| # | Test | Expected |
|---|------|----------|
| W43 | Finish workout with all sets done | WorkoutSummary shown, sets saved |
| W44 | Finish workout with some incomplete sets | Warning shown, can confirm or go back |
| W45 | Finish workout with 0 sets logged | Summary still shows (0 volume) |
| W46 | Finish workout — achievement unlocked | Achievement shown in summary |
| W47 | Finish workout — rank-up triggered | Rank-up shown in summary |
| W48 | Dismiss workout summary | Returns to home or relevant tab |
| W49 | Cancel workout, confirm | Session deleted, draft cleared |
| W50 | Cancel workout, dismiss dialog | Workout continues |
| W51 | Cancel/finish buttons tapped immediately after tab switch | Buttons responsive (no delay block) |

---

## Workout — Battles

| # | Test | Expected |
|---|------|----------|
| WB1 | Receive battle invite | Toast notification appears |
| WB2 | Accept battle invite | Battle workout starts, opponent panel shown |
| WB3 | Decline battle invite | Invite dismissed |
| WB4 | Complete sets during battle | Events published to room |
| WB5 | Opponent completes sets | Events appear in battle feed in real time |
| WB6 | Toggle battle feed visibility | Panel hides/shows |
| WB7 | Finish battle workout | WorkoutSummary shows battle result |
| WB8 | Opponent finishes before you | "Waiting for opponent" state shown |
| WB9 | No shared exercises with opponent | Shared metrics show "—" |
| WB10 | Battle with 0 shared exercises | "Metrics unavailable" note shown |
| WB11 | Challenge a friend (from Profile) | Invite sent, pending state shown |
| WB12 | Battle room stale for >48 hours | Auto-cancelled with inactivity verdict |
| WB13 | Both players cancel | Tie/cancelled verdict |
| WB14 | Neither player has bodyweight | Uses 70kg fallback, note shown in summary |

---

## Ranks

| # | Test | Expected |
|---|------|----------|
| R1 | Open Ranks with no sets logged | All exercises show "Unranked" |
| R2 | Open Ranks with no bodyweight | Prompt to log bodyweight shown |
| R3 | Log bodyweight from Ranks | Ranks recalculate with new bodyweight |
| R4 | Log bodyweight with 0 or letters | Rejected |
| R5 | Filter by muscle group | Only relevant exercises shown |
| R6 | Click same muscle group again | Filter deselects |
| R7 | Click a muscle on the body model | Exercises filter to that muscle |
| R8 | Search for exercise | Filtered results |
| R9 | Search returns nothing | Empty state |
| R10 | Tap exercise info button | Exercise detail drawer opens |
| R11 | Import top set (valid weight + reps) | ORM calculated and saved |
| R12 | Import top set with reps > 5 | Rejected or warned (unreliable ORM range) |
| R13 | Import top set below your current ORM | No update (must beat previous) |
| R14 | Swipe exercise to hide it | Exercise hidden from list |
| R15 | Exercise not in strength standards | Shows unranked, no crash |
| R16 | Muscle body animation loads | Loading pulse → staggered color reveal → shimmer |
| R17 | Muscle animation: loading ends before reveal | Pulse runs 1s extra, then smoothly transitions |
| R18 | Data changes (new workout logged) | Animation re-triggers with new rank colors |

---

## Nutrition

| # | Test | Expected |
|---|------|----------|
| NU1 | Navigate to today | Today's food log loads |
| NU2 | Navigate to past date | Past logs shown |
| NU3 | Try to navigate to tomorrow | Next button disabled |
| NU4 | Add food via search | Food added to log |
| NU5 | Add food via barcode scan | Scanned food appears in picker |
| NU6 | Add custom food | Custom food created, added to log |
| NU7 | Add food with 0 servings | Not added or ignored |
| NU8 | Add food with decimal servings (0.5) | Macros calculated correctly |
| NU9 | Delete a food entry | Removed from log, totals update |
| NU10 | View macros when over goal | Over-goal shown in red |
| NU11 | View sugar/saturated fat at goal | Shows correctly (max type: red if over) |
| NU12 | Set nutrition goals to 0 | No crash, totals still display |
| NU13 | Edit goals and save | Goals persist after page reload |
| NU14 | Edit goals and cancel | No change |
| NU15 | Filter by macro (protein) | Only protein-focused view |
| NU16 | Sort ascending/descending | Order changes correctly |
| NU17 | No food logged | Empty state with "Add first food" |
| NU18 | Calorie ring at 100% | Ring shows full, green |
| NU19 | Calorie ring over 100% | Ring shows overflow indicator or stays full |

---

## Profile

| # | Test | Expected |
|---|------|----------|
| P1 | Edit name and save | Name updates everywhere |
| P2 | Set username to one that's taken | Error: "That username is already in use." |
| P3 | Set username to unique value | Saved successfully |
| P4 | Change gender | Ranks recalculate with gender-specific standards |
| P5 | Change unit preference kg→lbs | All weights convert, profile saves |
| P6 | Change unit preference lbs→kg | All weights convert, profile saves |
| P7 | Change unit when no weight logs exist | Profile bodyweight converts, no crash |
| P8 | Set age to 0 or negative | Accepted or validated |
| P9 | Change default rest time | New value used in workout |
| P10 | Switch theme | App color scheme changes instantly |
| P11 | Save theme preference | Theme persists after reload |
| P12 | View achievements | Achievement grid loads |
| P13 | View friends list | Friends shown |
| P14 | Add a friend | Friend request sent |
| P15 | Remove a friend | Friend removed |
| P16 | View workout calendar | Calendar loads with heatmap |
| P17 | Tap workout calendar day | Day detail view opens |

---

## Achievements & Rank-ups

| # | Test | Expected |
|---|------|----------|
| AC1 | Log 1st ever workout | "First session" achievement unlocks |
| AC2 | Log 10th workout | "10 sessions" achievement unlocks |
| AC3 | Reach bench ORM target for gender | Strength achievement unlocks |
| AC4 | Improve ORM but still below target | No achievement |
| AC5 | Log food on 1 day | "First food log" achievement unlocks |
| AC6 | Hit 10k kg cumulative volume | Volume achievement unlocks |
| AC7 | Multiple achievements in one workout | All shown in summary |
| AC8 | Achievement already unlocked | Not shown again in summary |
| AC9 | Rank-up on an exercise | Shown in workout summary |
| AC10 | Rank-up on multiple exercises | All shown in summary |

---

## Cache & Persistence

| # | Test | Expected |
|---|------|----------|
| C1 | Load app — data loads from localStorage snapshot | Fast cold start, no spinner flash |
| C2 | Log a workout, immediately check home | Home updates (cache invalidated) |
| C3 | Add food, switch to home | Nutrition card updates |
| C4 | Log a rank improvement, check Ranks | Ranks show updated tier |
| C5 | Clear localStorage manually, reload | App fetches fresh from Supabase |
| C6 | Open app in private/incognito mode | Memory cache only, still functional |
| C7 | Startup snapshot > 15 min old | Re-fetches from Supabase on load |

---

## Network / Offline

| # | Test | Expected |
|---|------|----------|
| OL1 | Disconnect internet, open app | Cached data shows, no crash |
| OL2 | Try to save a set while offline | Error surfaced to user |
| OL3 | Try to finish workout while offline | Error shown, draft preserved |
| OL4 | Reconnect mid-workout | Subsequent actions work normally |
| OL5 | Battle invite arrives while offline | Loads when connection restored |

---

## Known Fragile Areas — Focus Attention Here

| # | Area | What to stress-test |
|---|------|---------------------|
| F1 | Rest overlay | Tap Done on a set — overlay must appear, stay visible, not cover buttons |
| F2 | Muscle animation | Switch to Ranks immediately after login — loading → reveal transition must not jump |
| F3 | Unit toggle mid-set | Toggle kg/lbs while a value is in the weight input |
| F4 | Draft recovery | Force-kill app during an active workout, reopen — verify exact state restored |
| F5 | Battle real-time sync | Both players log sets simultaneously — check no events are lost |
| F6 | Swipe gesture vs scroll | Scroll nutrition/ranks list vertically — verify it doesn't accidentally swipe tabs |
| F7 | Cancel/finish buttons | Tap them within 100ms of completing a set — must not be blocked |
| F8 | Bodyweight exercise ORM | Log a pull-up without bodyweight stored — verify 70kg fallback, no crash |

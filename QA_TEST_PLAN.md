# microload — QA Test Plan

## Authentication

| # | Test | Expected |
|---|------|----------|
| A1 | Sign up with a new email | Account created, navigates to home | Verified
| A2 | Sign in with valid credentials | Authenticated, home tab loads | Verified
| A3 | Sign in with wrong password | Error message shown, no navigation | Verified
| A4 | Sign out | Returns to auth screen, session cleared | Verified
| A5 | Reload app while signed in | Session restored from Supabase, no re-login needed | Verified
| A6 | Open app with no internet | Cached data loads from localStorage snapshot | Verified
| A7 | Sign up — password and confirm password match | Account created successfully |
| A8 | Sign up — password and confirm password don't match | "Passwords do not match." error shown, no API call made |
| A9 | Sign up — confirm password field visible | Confirm Password input appears below Password |
| A10 | Tap eye icon on Password field | Password toggles between hidden and visible |
| A11 | Tap eye icon on Confirm Password field | Confirm password toggles independently |
| A12 | Eye icons are independent | Showing one doesn't affect the other |
| A13 | Tap "Forgot password?" on sign in screen | Forgot password screen opens |
| A14 | Forgot password — enter any email, tap Send | "Check your email for a password reset link." shown |
| A15 | Forgot password — enter email not in DB | Same success message (no user enumeration) |
| A16 | Forgot password — tap Back to Sign In | Returns to sign in screen, fields cleared |
| A17 | Forgot password — email field present, password field hidden | Only email input visible on forgot screen |

---

## Navigation & Tab System

| # | Test | Expected |
|---|------|----------|
| N1 | Tap each tab | Correct screen loads, forward animation | Verified
| N2 | Tap back to previous tab | Backward animation | Verified
| N3 | Swipe left between tabs | Tab advances forward | Verified
| N4 | Swipe right between tabs | Tab goes backward | Verified
| N5 | Swipe on an input field | Should NOT trigger tab change | Verified
| N6 | Swipe on a button | Should NOT trigger tab change | Verified
| N7 | Swipe < 40px horizontally | Should NOT trigger tab change | Verified
| N8 | Navigate to workout tab while workout active | Shows active workout (not start screen) | Verified
| N9 | Tap active tab while already on it | No animation, stays put | Verified
| N10 | Swipe left/right in the area between sets in Workout | Should NOT trigger tab change (exercise block is swipe-ignored) |

---

## Home

| # | Test | Expected |
|---|------|----------|
| H1 | Open app with no workouts logged | "No recent workout" empty state | Verified
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
| H17 | Open app fresh with no weight history | Ghost line chart draws left-to-right, then erases left-to-right, then "No weight history yet" label appears |
| H18 | Switch to Home tab (no weight history, animation already played) | No animation — only "No weight history yet" label shown |
| H19 | Background app and return (no weight history) | Ghost chart animation plays again |
| H20 | Open app fresh with no nutrition logged | Macro bars pulse/glow briefly |
| H21 | Switch to Home tab (no nutrition, animation already played) | No bar glow animation on tab switch |
| H22 | Background app and return (no nutrition) | Bar glow animation plays again |
| H23 | Log weight — return to Home | Ghost chart no longer appears (replaced by real chart) |
| H24 | Log food — return to Home | Bar glow no longer appears (data present) |

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
| W7 | Draft is 13 hours old (solo) | Expired draft detected, session deleted, start fresh |
| W8 | Draft is 11 hours old (solo) | Draft still valid, resume offered |
| W9 | Start workout, immediately cancel | Confirms cancellation, no session saved |

---

## Workout — Exercise Management

| # | Test | Expected |
|---|------|----------|
| W10 | Search for an exercise | Filtered results shown |
| W11 | Search returns no results | "No results" empty state |
| W12 | Add multiple exercises at once | All added to workout in order |
| W13 | Add 0 exercises and tap Add | Add button disabled |
| W14 | Create custom exercise with unique name | Saved, appears in list |
| W15 | Create custom exercise with duplicate name | Error shown (23505) |
| W16 | Drag to reorder exercises | Order persists in state |
| W17 | Drag partially then cancel | Order restored from dragStartOrderRef |
| W18 | Swipe a set row left > 70% width | Set deleted with animation |
| W19 | Swipe a set row left < 70% width | Set stays (snap back) |
| W20 | Swipe set row to delete while near edge of exercise block | Tab swipe does NOT trigger |
| W21 | Remove all sets from an exercise | Exercise stays, shows "Add Set" |
| W22 | Add more than 10 sets to one exercise | All added correctly |

---

## Workout — Logging Sets

| # | Test | Expected |
|---|------|----------|
| W23 | Enter valid weight + reps, tap Done | Set marked complete, rest timer starts |
| W24 | Tap Done with empty weight | Done button disabled |
| W25 | Tap Done with empty reps | Done button disabled |
| W26 | Tap Done with 0 reps | Done button disabled |
| W27 | Enter 101 reps | Done button disabled (>MAX_REPS) |
| W28 | Enter weight outside valid range for equipment | Done button disabled |
| W29 | Toggle kg/lbs on a set with a value | Weight converts correctly |
| W30 | Toggle kg/lbs on empty set | No crash, stays empty |
| W31 | Add notes to exercise | Notes show on the exercise card |
| W32 | Edit default rest time via wheel picker | New value used for subsequent sets |
| W33 | Open exercise notes on multiple exercises at once | Each notes field is independent |
| W34 | Log set for bodyweight exercise (no bodyweight stored) | Uses 70kg default, no crash |

---

## Workout — Rest Timer

| # | Test | Expected |
|---|------|----------|
| W35 | Complete a set | Rest timer overlay appears at bottom |
| W36 | Rest timer overlay — can still scroll workout list | Exercises visible above overlay |
| W37 | Rest timer overlay — doesn't cover cancel/finish buttons | Buttons accessible while resting |
| W38 | Tap Skip on rest timer | Timer dismissed |
| W39 | Tap −5s on rest timer | Countdown decrements by 5 |
| W40 | Tap −5s when <5s remains | Timer goes to 0 and dismisses cleanly |
| W41 | Tap +5s on rest timer | Countdown increments by 5 |
| W42 | Background app during rest timer | Timer still accurate on return |
| W43 | Rest timer reaches 0 | Overlay dismisses, notification fires |
| W44 | Complete another set during rest | Rest timer resets to new exercise's rest time |

---

## Workout — Finishing

| # | Test | Expected |
|---|------|----------|
| W45 | Finish workout with all sets done | WorkoutSummary shown, sets saved |
| W46 | Finish workout with some incomplete sets | Warning shown, can confirm or go back |
| W47 | Finish workout with 0 sets logged | Summary still shows (0 volume) |
| W48 | Finish workout — achievement unlocked | Achievement shown in summary |
| W49 | Finish workout — rank-up triggered | Rank-up shown in summary |
| W50 | Dismiss workout summary | Returns to home or relevant tab |
| W51 | Cancel workout, confirm | Session deleted, draft cleared |
| W52 | Cancel workout, dismiss dialog | Workout continues |
| W53 | Cancel/finish buttons tapped immediately after tab switch | Buttons responsive (no delay block) |

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
| WB12 | Battle draft is 25 hours old | Expired draft, battle voided |
| WB13 | Battle draft is 23 hours old | Draft still valid, resume offered |
| WB14 | Both players cancel | Tie/cancelled verdict |
| WB15 | Neither player has bodyweight | Uses 70kg fallback, note shown in summary |

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
| R19 | Add a second chest exercise at lower rank than first | Chest muscle group rank stays close to the highest (decay penalises lower ranks heavily) |
| R20 | All tier badges visible in legend | Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Elite all render correctly |
| R21 | Badge colors match tier (spot-check) | Gold = amber, Diamond = deep blue, Grandmaster = deep purple, Elite = red |

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
| OL6 | Lose connection for >3 seconds | Amber offline banner appears: "No internet — changes won't save" |
| OL7 | Lose connection for <3 seconds (brief blip) | No banner shown (debounce prevents false positive) |
| OL8 | Regain connection after being offline | Green "Back online" banner flashes briefly, then disappears |
| OL9 | Regain connection without ever having gone offline | No "Back online" banner shown |
| OL10 | Open app already offline | Offline banner appears after 3-second debounce |

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
| F9 | Set swipe vs tab swipe | Swipe to delete a set near the edge of the exercise block — tab must NOT change |
| F10 | Home empty animations | Kill and reopen app — both ghost chart and bar glow must play; tab-switch must NOT replay them |
| F11 | Offline banner debounce | Toggle airplane mode rapidly — banner must not flash on brief disconnects |
| F12 | Forgot password flow | Submit reset for unknown email — must always show success (no user enumeration) |

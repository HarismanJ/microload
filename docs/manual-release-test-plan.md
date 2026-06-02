# Manual Release Test Plan

Use this after automated checks pass and before submitting/publishing a release build. The goal is not to repeat every automated test. The goal is to catch device, store, permission, payment, ad, network, and cross-user issues that automated tests can miss.

## Preconditions

- [ ] Production migration `20260531000100_fix_battle_result_rpc_ambiguity.sql` has been applied if testing production battle completion.
- [ ] Automated checks passed on the exact release candidate:
  - [ ] `npm run lint`
  - [ ] `npm run test:coverage`
  - [ ] `npm run build`
  - [ ] `npm run test:rls`
  - [ ] `npm run test:e2e`
  - [ ] `npm run load:comprehensive` against E2E/staging only
- [ ] Test accounts are not personal/admin accounts.
- [ ] You have at least two normal user accounts available for battle/friend tests.
- [ ] If using production, test lightly. Do not run load tests against production.
- [ ] Confirm which backend the app build points to before starting:
  - [ ] Staging/E2E build points to the E2E Supabase project.
  - [ ] Production build points to production Supabase.

## Test Matrix

Run the full plan on at least one release-like mobile build. For a stronger pass, split it across:

- [ ] iPhone physical device
- [ ] Android
- [ ] Fresh install state
- [ ] Existing install/update state
- [ ] Light mode
- [ ] Dark mode if supported by the app/system
- [ ] Good network
- [ ] Poor network or briefly toggled airplane mode

## Install And Launch

- [✓ ] Fresh install opens without crash.
- [✓ ] App icon, app name, splash screen, and launch screen are correct.
- [✓ ] App does not show development-only debug UI.
- [✓ ] First launch does not show blank screens or infinite loading.
- [✓ ] Force quit and reopen restores to a sensible state.
- [✓ ] Background the app for 30 seconds, return, and verify it still responds.
- [✓ ] Rotate the device if orientation is supported. Verify layout is not broken.
- [✓ ] Increase system text size one or two levels. Verify main screens remain usable.
- [✓ ] Try with low power mode enabled. Verify no obvious broken behavior.

## Authentication

### Signup

- [✓ ] Create a new account with a valid email and password.
- [✓ ] Try an invalid email. Verify error is understandable and no account is created.
- [✓ ] Try a weak/invalid password. Verify error is understandable.
- [✓ ] Tap signup twice quickly. Verify no duplicate/broken state.
- [ ] Signup with poor network. Verify the app recovers or shows a clear error.
- [✓ ] After signup, profile row is created and the app enters the expected first-user state.
- [✓ ] Sign in with Apple and Google

### Login And Session

- [✓ ] Log out, then log back in.
- [✓ ] Try wrong password. Verify error and no partial login.
- [✓ ] Close and reopen app while logged in. Verify session persists.
- [✓ ] Reinstall app. Verify session behavior is expected.
- [✓ ] Log out from a loaded screen. Verify private data disappears.
- [✓ ] Use account A, log out, then account B. Verify account A data does not appear.

### Password/Recovery If Exposed

- [✓ ] Start password reset flow.
- [✓ ] Use an invalid/nonexistent email.
- [✓ ] Return from email/deep link if supported.
- [✓ ] Verify app handles expired/invalid reset link gracefully.

## Onboarding And Profile

- [✓ ] Complete onboarding from a fresh account.
- [✓ ] Skip optional fields if allowed.
- [✓ ] Enter minimum valid values.
- [✓ ] Enter large but valid bodyweight/name values.
- [✓ ] Change username/full name/bodyweight/unit preference.
- [✓ ] Save profile with poor network. Verify no silent data loss.
- [✓ ] Return to profile after app restart and verify persisted values.
- [✓ ] Verify profile stats are not obviously wrong on a new account.
- [✓ ] Verify friend/public profile view does not expose private fields.

## Workout Core Flow

### Start Workout

- [✓ ] Start an empty workout if allowed. Verify expected behavior.
- [✓ ] Start a workout from the main workout screen.
- [✓ ] Add one exercise.
- [✓ ] Add multiple exercises.
- [✓ ] Search exercises using exact name, partial name, and mixed case.
- [✓ ] Open exercise detail from picker if supported.
- [✓ ] Cancel exercise picker and verify workout state is preserved.
- [✓ ] Start workout, background app, return, and verify state is still intact.

### Sets

- [✓ ] Add a normal weighted set.
- [✓ ] Add multiple sets for the same exercise.
- [✓ ] Edit reps.
- [✓ ] Edit weight.
- [✓ ] Change unit if exposed.
- [✓ ] Add a warmup set if exposed.
- [✓ ] Add/remove dropset or superset if exposed.
- [✓ ] Delete a set.
- [✓ ] Delete an exercise with sets.
- [✓ ] Enter zero/invalid reps and verify validation.
- [✓ ] Enter very high reps/weight and verify validation or safe handling.
- [✓ ] Tap controls quickly several times. Verify no duplicate broken rows.
- [✓ ] Navigate away and back mid-workout. Verify unsaved workout state.

### Rest Preferences

- [✓ ] Change rest timer/preference for an exercise.
- [✓ ] Verify the changed rest preference appears when that exercise is used again.
- [✓ ] Set a very short rest value.
- [✓ ] Set a longer rest value.
- [✓ ] Restart app and verify preference persists.

### Finish Workout
- [✓ ] Finish a simple workout with one exercise and one set.
- [✓ ] Finish a larger workout with multiple exercises and sets.
- [✓ ] Verify workout summary opens.
- [✓ ] Verify calories/volume/duration are sane.
- [✓ ] Verify workout appears in history/calendar/profile.
- [✓ ] Verify sets appear in workout detail.
- [✓ ] Finish while network is poor. Verify no duplicate session or missing sets.
- [✓ ] Tap finish twice quickly. Verify only one finished workout is created.
- [ ] Force quit immediately after finishing, reopen, and verify workout is saved.

## PRs, Ranks, Progression

- [ ] Complete a workout that should create or improve a PR.
- [ ] Verify PR appears in achievement/rank/profile surfaces.
- [ ] Complete a workout that should not improve a PR. Verify old PR remains.
- [ ] Verify estimated 1RM/rank values look sane.
- [ ] Edit/delete a workout if supported and verify PR behavior is understandable.
- [ ] View friend profile/rank surface and verify only allowed data appears.
- [ ] Use bodyweight-related rank flow if supported. Verify missing bodyweight prompts behave correctly.

## Training Plans

### Plan Creation

- [ ] Open plan builder.
- [ ] Create a strength plan.
- [ ] Create a hypertrophy/general plan if options exist.
- [ ] Try minimum allowed days/week.
- [ ] Try maximum allowed days/week.
- [ ] Try minimum session length.
- [ ] Try maximum session length.
- [ ] Select equipment combinations.
- [ ] Enter avoid/focus preferences if exposed.
- [ ] Generate preview.
- [ ] Save plan.
- [ ] Close plan builder mid-flow and reopen.
- [ ] Edit an existing plan.
- [ ] Delete a plan.

### Plan Workout

- [ ] Start a workout from plan day 1.
- [ ] Complete the plan workout.
- [ ] Verify completed plan day/week metadata appears correctly.
- [ ] Start a second plan day.
- [ ] Verify next recommended day/week behavior.
- [ ] Complete plan workout after modifying exercises/sets.
- [ ] Verify plan workouts appear in normal workout history.
- [ ] Verify deleting a plan does not delete already completed workouts.

## Battle And Social

Use two separate accounts, ideally on two devices/simulators.

### Friend/Public Profile

- [ ] Search for another user.
- [ ] Open public profile.
- [ ] Send friend request if supported.
- [ ] Accept/decline friend request if supported.
- [ ] Verify non-friend cannot see private-only information.
- [ ] Verify friend visibility behaves as expected.

### Battle Invite

- [ ] Account A sends battle invite to account B.
- [ ] Account B receives/sees invite.
- [ ] Account B accepts.
- [ ] Verify both users see an active battle room.
- [ ] Account B declines a second invite if possible.
- [ ] Try sending duplicate pending invite. Verify app handles it safely.
- [ ] Try battle invite after app restart.

### Battle Workout

- [ ] Both users start/log workout in the battle.
- [ ] Account A logs an exercise and set.
- [ ] Account B sees live or refreshed event if supported.
- [ ] Account B logs an exercise and set.
- [ ] Account A removes/edits a set if supported and verify sync behavior.
- [ ] One user backgrounds app mid-battle and returns.
- [ ] One user finishes first. Verify battle waits for the other user.
- [ ] Other user finishes. Verify result finalizes.
- [ ] Verify winner/points/recap are sane.
- [ ] Verify result can be marked seen.
- [ ] Verify battle appears in any profile/head-to-head surface.
- [ ] Try poor network during battle events. Verify no stuck active room.

### Battle Edge Cases

- [ ] User cancels workout/battle if supported.
- [ ] One user force quits mid-battle and returns.
- [ ] Both users finish nearly at the same time.
- [ ] Tap finish multiple times.
- [ ] Reopen app after result is finalized.
- [ ] Verify no other user's battle data appears in the wrong account.

## Nutrition

- [ ] Add manual food log.
- [ ] Add custom food.
- [ ] Search/select saved custom food.
- [ ] Log multiple servings.
- [ ] Edit serving amount if supported.
- [ ] Delete a nutrition log.
- [ ] Verify daily totals update.
- [ ] Verify micronutrient fields do not break UI when empty.
- [ ] Verify previous-day logging if supported.
- [ ] Switch date forward/back and verify correct logs show.
- [ ] Enter invalid calories/macros and verify validation.
- [ ] Create then delete custom food. Verify logs remain understandable.

## Bodyweight And Charts

- [ ] Add bodyweight log.
- [ ] Add multiple bodyweight logs on different dates.
- [ ] Add same-day bodyweight twice if allowed. Verify expected behavior.
- [ ] Switch kg/lb preference and verify display.
- [ ] Verify chart renders with one data point.
- [ ] Verify chart renders with many data points.
- [ ] Delete/edit bodyweight log if supported.
- [ ] Verify bodyweight-dependent workout/rank screens update.

## Calendar, History, And Detail Screens

- [ ] Calendar shows completed workout day.
- [ ] Calendar shows nutrition day.
- [ ] Calendar shows bodyweight day.
- [ ] Open a workout day with no data. Verify empty state.
- [ ] Open a workout day with workout, nutrition, and bodyweight data.
- [ ] Open workout detail and verify exercises/sets match what was logged.
- [ ] Navigate between months.
- [ ] Pull/refresh if supported.
- [ ] Return from detail screen using back gesture/button.

## Ads

Use the release-like ad configuration intended for test/review.

- [ ] Ad gate appears only where expected.
- [ ] Post-workout ad flow does not block saving workout.
- [ ] Watch ad and continue to summary.
- [ ] Dismiss/close ad if allowed.
- [ ] Simulate ad unavailable/no fill if possible. Verify user is not stuck.
- [ ] Poor network during ad load. Verify user can recover.
- [ ] Background app during ad, return, and verify state.
- [ ] Verify no real production test clicks are made if using live ads.

## Purchases And Paywall

Use sandbox/TestFlight purchase accounts.

- [ ] Paywall opens.
- [ ] Products load with correct names/prices.
- [ ] Purchase monthly/annual/lifetime as applicable.
- [ ] Cancel purchase sheet. Verify app remains usable and not unlocked.
- [ ] Complete purchase. Verify entitlement unlocks.
- [ ] Force quit and reopen. Verify entitlement persists.
- [ ] Restore purchases.
- [ ] Restore with no purchases. Verify clear message.
- [ ] Lose network during product load. Verify clear recovery.
- [ ] Verify paywalled actions are blocked when not subscribed.
- [ ] Verify paywalled actions are available when subscribed.

## Legal And Settings

- [ ] Terms of service opens.
- [ ] Privacy policy opens.
- [ ] Links are readable on mobile.
- [ ] External links open correctly if any.
- [ ] Settings save correctly.
- [ ] Settings survive app restart.
- [ ] Delete account flow works if exposed.
- [ ] Delete account asks for confirmation.
- [ ] Deleted account cannot see old private data.
- [ ] Account deletion removes or anonymizes expected backend data.

## Network And Failure Recovery

Run these on a few important flows: login, finish workout, nutrition log, plan save, battle event, battle finish.

- [ ] Turn on airplane mode before action. Verify clear error.
- [ ] Turn on airplane mode immediately after tapping save/finish. Verify no duplicate or corrupt data.
- [ ] Restore network and retry. Verify success.
- [ ] Rapidly tap primary action. Verify idempotent behavior.
- [ ] Leave screen during save. Verify app recovers.
- [ ] Kill app during save. Verify next launch is sane.
- [ ] Verify loading spinners do not run forever.

## Abuse And Break-It Testing

Run these with a test account after the normal happy paths pass. The goal is to act like an impatient or malicious user and verify the app fails safely.

### Large And Weird Inputs

- [ ] Paste a very long username/full name, around 500 to 2,000 characters. Verify validation, truncation, or clear error.
- [ ] Paste emoji-heavy names and notes.
- [ ] Paste symbols and punctuation into names/notes: quotes, slashes, angle brackets, SQL-like text, and JSON-like text.
- [ ] Paste multi-line text into fields that should be single-line.
- [ ] Enter leading/trailing spaces in names and search fields. Verify trimming or sane display.
- [ ] Enter only spaces in required text fields. Verify it cannot save as blank.
- [ ] Enter extremely long workout notes if notes are exposed.
- [ ] Enter extremely long plan preferences/avoid text if exposed.
- [ ] Enter extremely long food names and custom food fields.
- [ ] Enter extremely long battle/search text if any search/input field exists there.
- [ ] Verify no field causes layout overflow, hidden buttons, or unreadable screens.

### Numeric Extremes

- [ ] Workout reps: try 0, negative, decimal, very large, and non-number text.
- [ ] Workout weight: try 0, negative, decimal, very large, and non-number text.
- [ ] Duration/cardio fields: try 0, negative, very large, and decimal values.
- [ ] Rest timer/preference: try 0, very large, and invalid values.
- [ ] Bodyweight: try 0, negative, very large, decimal, and non-number text.
- [ ] Nutrition calories/macros: try 0, negative, very large, decimal, and non-number text.
- [ ] Serving count: try 0, negative, huge, decimal, and blank.
- [ ] Plan days/weeks/session minutes: try min, max, below min, above max if UI allows.
- [ ] Verify invalid values do not save corrupted data.

### Button Spam And Duplicate Actions

- [ ] Tap signup/login repeatedly while request is loading.
- [ ] Tap save profile repeatedly.
- [ ] Tap start workout repeatedly.
- [ ] Tap add exercise repeatedly.
- [ ] Tap add set repeatedly.
- [ ] Tap delete set/exercise repeatedly.
- [ ] Tap finish workout repeatedly.
- [ ] Tap watch ad/continue repeatedly.
- [ ] Tap save training plan repeatedly.
- [ ] Tap delete training plan repeatedly.
- [ ] Tap send battle invite repeatedly.
- [ ] Tap accept battle invite repeatedly on both devices if possible.
- [ ] Tap finish battle workout repeatedly.
- [ ] Tap nutrition log save repeatedly.
- [ ] Tap purchase/restore repeatedly in sandbox.
- [ ] Verify duplicate taps do not create duplicate sessions, duplicate battle rooms, duplicate purchases, duplicate logs, or stuck UI.

### Rapid Navigation

- [ ] Navigate away immediately after tapping save.
- [ ] Open and close modals quickly.
- [ ] Switch tabs repeatedly during an active workout.
- [ ] Switch tabs repeatedly during an active battle.
- [ ] Open workout detail, go back, reopen, repeat.
- [ ] Open plan builder, close, reopen, save.
- [ ] Open paywall, close, reopen, start purchase, cancel.
- [ ] Use OS back gesture while save/loading states are active.
- [ ] Verify the app does not lose state or show stale data.

### Network Interruption During Writes

- [ ] Turn on airplane mode immediately after tapping finish workout.
- [ ] Turn on airplane mode immediately after tapping save plan.
- [ ] Turn on airplane mode immediately after sending battle invite.
- [ ] Turn on airplane mode immediately after accepting battle invite.
- [ ] Turn on airplane mode immediately after logging a battle set.
- [ ] Turn on airplane mode immediately after final battle finish.
- [ ] Turn on airplane mode immediately after logging nutrition.
- [ ] Restore network and retry. Verify no duplicate or half-created records.

### Multi-Device And Race Conditions

- [ ] Log into the same account on two devices. Start/edit workout on both if possible.
- [ ] Finish the same active workout from two devices if possible.
- [ ] Account A sends invite while account B sends invite back at nearly the same time.
- [ ] Account B accepts invite while Account A cancels or navigates away if supported.
- [ ] Both battle users finish at nearly the same time.
- [ ] One user force quits while the other finishes battle.
- [ ] Verify final state is consistent after both apps restart.

### Storage, Session, And Stale State

- [ ] Force quit during active workout and reopen.
- [ ] Force quit during active battle and reopen.
- [ ] Force quit during ad gate and reopen.
- [ ] Force quit during purchase sheet or immediately after purchase if possible.
- [ ] Log out while a workout is active if UI allows.
- [ ] Clear/reinstall app and log back in.
- [ ] Verify no stale private data flashes before the correct account loads.

### Security-Looking Inputs

- [ ] Put `<script>alert(1)</script>` into names/notes where text is allowed.
- [ ] Put SQL-like text such as `' OR 1=1 --` into names/search fields.
- [ ] Put JSON-like text into notes/preferences.
- [ ] Put URL text into names/notes.
- [ ] Verify text displays as text, not executable markup.
- [ ] Verify search still works and no app crash occurs.

## Privacy And Cross-User Checks

Use account A and account B.

- [ ] Account B cannot see account A private workouts unless explicitly allowed.
- [ ] Account B cannot see account A private nutrition/bodyweight data.
- [ ] Account B cannot edit account A profile.
- [ ] Account B cannot respond to account A's invite as a third user.
- [ ] Account B cannot write battle events into a room they are not part of.
- [ ] Logging out from account A and into account B does not show stale account A UI.
- [ ] Push/realtime updates, if visible, are scoped to the correct user.

## Production Migration Smoke

After applying `20260531000100_fix_battle_result_rpc_ambiguity.sql` to production, do only a tiny production smoke:

- [ ] Confirm SQL ran successfully.
- [ ] With two test production accounts, create one battle.
- [ ] Accept the battle.
- [ ] Log one small workout for each user.
- [ ] Finish both workouts.
- [ ] Verify battle result finalizes without RPC error.
- [ ] Verify no unexpected production data was created beyond the two test accounts' rows.
- [ ] Clean up test accounts/data if desired.

Do not run `load:*` scripts against production.

## Release Decision

Release is reasonable when:

- [ ] All automated checks pass.
- [ ] Full manual smoke passes on release-like mobile build.
- [ ] Production migration smoke passes.
- [ ] No P0/P1 issues remain.
- [ ] Any known P2/P3 issues are documented and acceptable for launch.

Block release if:

- [ ] Workout completion can lose data.
- [ ] Auth can show the wrong user's data.
- [ ] Battle result finalization fails after migration.
- [ ] Purchases unlock incorrectly.
- [ ] Ads can trap the user before/after saving.
- [ ] App crashes on launch, login, workout finish, or paywall.
- [ ] Legal links are missing or broken.

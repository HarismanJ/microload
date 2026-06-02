# microload — Launch Checklist

Living document. Updated 2026-05-30.

Legend: ✅ done · ⏳ in progress · ❌ not started · 🚧 blocked on another item

---

## TL;DR — what's actually blocking submission

The hard blockers, in dependency order:

1. **Apple Developer Program enrollment** ($99/yr) → required for App Store Connect record
2. **Google Play Developer enrollment** ($25 one-time) → required for Play Console record
3. **RevenueCat real production keys** — currently test keys in [src/lib/purchases.js:6-7](src/lib/purchases.js#L6-L7)
4. **In-app purchase products** configured in App Store Connect + Play Console + bound in RevenueCat
5. **Terms of Service** written, hosted, linked in-app
6. **Screenshots, app description, age rating, support URL** for both stores

Everything else (code, AdMob, privacy policy) is done.

---

## Code & repo

### Lint / tests / CI
- ✅ 0 lint errors (was 7)
- ✅ 22 lint warnings remaining (non-blocking)
- ✅ Unit + component + E2E tests passing (~1000+ tests, ~95% line coverage)
- ✅ Coverage gate at 55% lines in CI

### Repo hygiene (optional, only if going public)
- ❌ Move planning docs out of root: `HANDOFF.md`, `ultimate-final-audit.md`, `plangeneratorattack.md`, `progressionengineattack.md`, `confidence-signal-overhaul.md`, `eslint-dead.txt`
- ❌ `package.json` version still `0.0.0` — cosmetic; iOS/Android use their own version fields (`1.0` / build `1`)

---

## AdMob

### Code (`src/lib/admob.js`)
- ✅ Real ad unit IDs (iOS interstitial + rewarded, Android interstitial + rewarded)
- ✅ Env-based test/prod switch: `IS_TESTING = import.meta.env.DEV`
- ✅ ATT (App Tracking Transparency) request before init (iOS)
- ✅ UMP (Google User Messaging Platform) GDPR consent flow
- ✅ `canRequestAds` gate on `showWorkoutCompleteAd()` + `showRewardedAd()`
- ✅ `showAdPrivacyOptions()` revocation API exported
- ✅ Triggered from: workout complete (3 paths), barcode quota exceeded

### Native config
- ✅ iOS: `GADApplicationIdentifier` in `Info.plist`
- ✅ iOS: `NSUserTrackingUsageDescription` (ATT prompt copy)
- ✅ iOS: `SKAdNetworkItems` — 50 entries from Google's live list
- ✅ Android: AdMob `APPLICATION_ID` in `AndroidManifest.xml`

### In-app UI
- ✅ "Manage Ad Consent" button in Profile screen → calls `showAdPrivacyOptions()` (revocation requirement)

### AdMob dashboard
- ✅ Both apps registered (iOS + Android)
- ✅ 4 ad units created with matching IDs
- ✅ Privacy Policy URL attached to both apps
- ✅ GDPR consent message published + deployed to ad units
- ✅ ATT IDFA pre-prompt message published

### AdMob — blocked on store accounts
- 🚧 Link AdMob app → App Store Connect listing (requires App Store Connect record)
- 🚧 Link AdMob app → Play Console listing (requires Play Console record)
- 🚧 AdMob automated review (~24-48h after both links verified) — until then ad units return no-fill

### Bundled SDK versions (auto via `@capacitor-community/admob` v8)
- iOS: Google-Mobile-Ads-SDK 12.14, GoogleUserMessagingPlatform 3.1
- Android: play-services-ads 24.9+, user-messaging-platform 4.0.0

---

## RevenueCat (subscriptions)

### Code (`src/lib/purchases.js`)
- ✅ `initPurchases()` wired in App.jsx
- ✅ `loginUser`, `logoutUser`, `refreshPremiumStatus`, `purchasePackage`, `restorePurchases` wired
- ✅ Local persistence with `liftlog:premium` (last-known entitlement, never downgrades on error)
- ✅ Entitlement ID: `microload Pro`
- ✅ **Real production API keys in [src/lib/purchases.js:6-7](src/lib/purchases.js#L6-L7)** — `appl_…` for iOS, `goog_…` for Android

### RevenueCat dashboard (you must do)
- ❌ Create RevenueCat project
- ❌ Add iOS app (paste App Store Connect bundle ID `com.harisman.microload` + shared secret + App Store Connect API key)
- ❌ Add Android app (paste Play Console service account JSON + package name `com.harisman.microload`)
- ❌ Create the in-app purchase products in App Store Connect + Play Console first
- ❌ In RevenueCat: create product offerings + bind to `microload Pro` entitlement
- ❌ Grab real `appl_…` (iOS) and `goog_…` (Android) public API keys
- ❌ Paste them into [src/lib/purchases.js:5-8](src/lib/purchases.js#L5-L8)

---

## Privacy & legal

### Privacy Policy
- ✅ Written: [docs/privacy-policy.md](docs/privacy-policy.md)
- ✅ Hosted: Notion public page
- ✅ URL: `https://picturesque-lunch-7de.notion.site/microload-Privacy-Policy-3710203c6238800eaec3ed35a9925bab`
- ✅ Linked from in-app Profile screen ("Privacy Policy" button)
- ❌ To paste into App Store Connect → App Privacy → Privacy Policy URL
- ❌ To paste into Play Console → App content → Privacy Policy

### Terms of Service
- ✅ Written: [docs/terms-of-service.md](docs/terms-of-service.md) — 24 sections, covers IAP/subscriptions, fitness disclaimers, Apple/Google addenda, Ontario governing law
- ✅ Hosted: Notion public page
- ✅ URL: `https://picturesque-lunch-7de.notion.site/microload-Terms-of-Service-3710203c6238800986d7c6c165ae2e95`
- ✅ Linked from in-app Profile screen ("Terms of Service" button)
- ❌ To paste into App Store Connect → if a EULA URL field is offered (optional; Apple's default EULA otherwise applies)
- ❌ To paste into Play Console → if a custom EULA is desired (Google does not require)

---

## Apple side (iOS)

### Apple Developer enrollment
- ✅ **Enrolled in Apple Developer Program** ($99/yr)
- ⏳ Confirm enrollment is fully active in App Store Connect before proceeding

### App Store Connect
- ❌ Create app record with bundle ID `com.harisman.microload`
- ❌ App name: microload
- ❌ Primary category: Health & Fitness
- ❌ Age rating questionnaire (no objectionable content; will rate 4+ or 12+ depending on ad classification)
- ❌ Support URL (your own domain, email link via mailto:, or Notion page)
- ❌ Privacy Policy URL (paste from above)
- ❌ App Privacy questionnaire — fully fill out based on what's in [docs/privacy-policy.md](docs/privacy-policy.md) §3 and §6
- ❌ Create in-app purchase products (subscription tiers for microload Pro)

### iOS build
- ✅ Version `MARKETING_VERSION = 1.0`
- ✅ Build `CURRENT_PROJECT_VERSION = 1`
- ❌ Sign in to Xcode with Apple Developer account
- ❌ Generate signing certificates / provisioning profiles
- ❌ `npm run build && npx cap sync ios && cd ios/App && pod install`
- ❌ Open in Xcode → Archive → Upload to App Store Connect → TestFlight
- ❌ Test on real device via TestFlight (verify ATT prompt, GDPR flow not shown in Canada, etc.)
- ❌ Submit for review

### Screenshots (App Store)
- ❌ Required sizes: 6.7" (1290x2796), 6.5" (1284x2778 or 1242x2688), 5.5" (1242x2208)
- ❌ Minimum 3 screenshots per size; recommend 5-8
- ❌ Suggested: home/dashboard, workout in progress, ranks page, nutrition log, profile with achievements

---

## Google side (Android)

### Google Play Developer enrollment
- ✅ **Enrolled in Google Play Developer** ($25 one-time)
- ⏳ Confirm identity verification has completed

### Play Console
- ❌ Create app record with package name `com.harisman.microload`
- ❌ App name: microload
- ❌ Default language, category (Health & Fitness)
- ❌ Content rating questionnaire (IARC)
- ❌ Target audience and content
- ❌ **Data safety form** (the Play equivalent of Apple's privacy questionnaire) — fill from [docs/privacy-policy.md](docs/privacy-policy.md) §3 and §6
- ❌ Privacy Policy URL (paste from above)
- ❌ Create in-app products (subscription tiers for microload Pro)

### Android build
- ✅ `versionCode 1`, `versionName "1.0"`
- ✅ Min SDK / target SDK from plugins
- ❌ Generate signing keystore (keep it safe — losing it locks you out of updating the app forever)
- ❌ Configure signing in `android/app/build.gradle`
- ❌ `npm run build && npx cap sync android`
- ❌ Open in Android Studio → Build → Generate Signed Bundle (AAB)
- ❌ Upload to Play Console → Internal testing track
- ❌ Test on real device via internal testing
- ❌ Submit for review

### Screenshots (Play Store)
- ❌ Required: phone screenshots, 16:9 or 9:16 ratio, 320–3840px on each side
- ❌ Minimum 2 screenshots; recommend 4-8
- ❌ Optional: 7" tablet, 10" tablet screenshots
- ❌ Feature graphic: 1024x500 (highly recommended)

---

## Post-submission

### Apple review
- 24h–7 days typical (most apps 24-48h)
- Common rejection causes for fitness/ads apps:
  - Privacy Policy URL not loading (test it in incognito)
  - Account deletion not findable (it's there: Profile → Delete Account ✅)
  - Subscription auto-renewal terms unclear in app
  - Permission strings (NSCameraUsageDescription, NSUserTrackingUsageDescription) not specific enough
  - Test build crashed during review (unlikely — your suite is solid)

### Google review
- 1–7 days, but newer accounts often get 14-day "extended review" for the first release
- Common issues:
  - Data safety form mismatch with actual code
  - Missing native permission rationale
  - APK signing issues

### After both approved
- Link AdMob → App Store Connect + Play Console listings → triggers AdMob review (24-48h)
- AdMob approves → real ads start serving on next user session
- Real revenue starts flowing

---

## Quick command reference

```bash
# Lint
npm run lint

# Tests
npm test
npm run test:e2e

# Build for stores
npm run build
npx cap sync                  # both platforms
npx cap sync ios              # iOS only
npx cap sync android          # Android only

# Open IDE
npx cap open ios              # Xcode (needs Mac)
npx cap open android          # Android Studio

# iOS pods (after cap sync)
cd ios/App && pod install && cd -
```

---

## Living notes / decisions log

- 2026-05-30: Decided to ship with always-visible "Manage Ad Consent" button (no `hasAdPrivacyOptions` gate). Acceptable UX; revisit if non-EU users complain.
- 2026-05-30: AdMob `IS_TESTING` flipped to `import.meta.env.DEV` — can never accidentally ship test ads.
- 2026-05-30: Skipping test-device registration for AdMob. Risk-managed by "no tapping own ads" policy; if accidental click, halt ad testing for the day.
- 2026-05-30: Privacy policy v1 hosted on Notion. Source of truth in `docs/privacy-policy.md` so we can switch hosts later if needed.

# Privacy Policy

**Effective date:** May 30, 2026
**Last updated:** May 30, 2026

This Privacy Policy describes how Harisman Jeyakanthan ("we", "us", "our", or the "Operator") collects, uses, discloses, and protects personal information when you use the microload mobile and web application (the "App"). microload is operated as a sole-proprietor product by an individual based in Canada, and this Policy is written to comply with the Canadian Personal Information Protection and Electronic Documents Act (PIPEDA), the EU/UK General Data Protection Regulation (GDPR), the California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA), and Apple App Store and Google Play data-handling requirements.

If you have any questions about this Policy or your personal information, contact us at **harismanjeyakanthan@gmail.com**.

---

## 1. Who we are

For the purposes of GDPR and PIPEDA, the data controller (or "person responsible" in the Canadian sense) for microload is:

> **Harisman Jeyakanthan**
> Sole proprietor, Canada
> Contact: harismanjeyakanthan@gmail.com

microload is an independent indie project, not a corporation. There is no separate legal entity behind the App.

## 2. Scope

This Policy applies to:

- the microload iOS app (distributed via the Apple App Store),
- the microload Android app (distributed via Google Play),
- any web version of microload that we host, and
- any communications between you and us about the App.

This Policy does **not** apply to third-party services that you choose to connect or that we integrate with — those services have their own privacy policies, summarized in Section 7.

## 3. The information we collect

We collect only what is necessary to provide the App's features. We never sell your personal information.

### 3.1 Account information

When you create an account we collect:

- **Email address** (required for sign-in via email/password, or provided automatically by Sign in with Apple or Sign in with Google).
- **Authentication identifiers** from Apple or Google when you use social sign-in. We receive a stable user identifier but not your Apple/Google password.
- **Display name and username** that you choose.

Passwords for email/password accounts are never stored in plaintext; authentication is handled by our processor Supabase using industry-standard hashing.

### 3.2 Profile information

You optionally provide:

- Age (year), gender, body weight, unit preference (kg/lbs), default rest time, preferred theme.
- Daily nutrition goals (calories, protein, carbohydrates, fats, and micronutrients).

### 3.3 Fitness and health data

When you use the App we record:

- Workout sessions, including start and end timestamps, exercises, sets, reps, weights, perceived effort, drop sets, and free-text exercise notes.
- Estimated one-rep-maxes derived from your sets.
- Body weight history.
- Achievements, rank progressions, and strength-tier scores.
- Optional training plans you build or accept.
- Personal records (PRs) per exercise.

Some of this information may be considered "sensitive" or "health" data in certain jurisdictions. We treat it as sensitive regardless of jurisdiction.

### 3.4 Nutrition data

When you log meals we record:

- Foods consumed, meal types, serving sizes, dates and times, and the calorie/macro/micronutrient snapshot at the time of logging.
- Custom foods and recipes you create.
- Barcode-scan lookups (the barcode itself is sent to a third-party nutrition database — see Section 7).

### 3.5 Social features

If you use friends or head-to-head workout features we record:

- Friend requests, friendships, and friendship status changes.
- Workout battles (invites, room state, per-set events, summary outcomes, head-to-head history).
- Items you choose to share with friends (e.g. routines).

Other users in your friend list can see information you have chosen to make visible to them, including your username, display name, rank tier, workout activity in a shared battle, and similar profile information. They cannot see your raw nutrition logs, body weight history, or personal contact information.

### 3.6 Subscription and purchase data

If you subscribe to microload Pro:

- We use our processor **RevenueCat** to verify and manage your subscription. RevenueCat receives a pseudonymous user identifier tied to your microload account, plus the purchase receipts from Apple or Google.
- We do **not** receive or store your credit card number, Apple ID, or Google account billing details. Those are handled entirely by Apple or Google.
- We store, on our servers, whether your subscription is active and the entitlement tier.

### 3.7 Advertising data (free tier)

If you use the App without a microload Pro subscription, we may show ads served by **Google AdMob**. AdMob may collect:

- Advertising identifier (IDFA on iOS, AAID on Android), subject to your operating-system permission.
- Approximate location derived from IP address.
- Device identifiers and ad-interaction events.

You can limit ad personalization at any time via your device's "Allow apps to request to track" setting (iOS) or "Reset advertising ID / opt out of personalized ads" setting (Android). When personalization is disabled, you will still see ads, but they will be contextual rather than personalized.

### 3.8 Diagnostic and crash data

We use **Sentry** to capture errors and crashes so we can fix bugs. Sentry receives:

- Stack traces, breadcrumbs (e.g. "workout started", "set completed"), the screen you were on when the error occurred, app version, OS version, and device model.
- A pseudonymous user identifier (your microload account ID) so we can correlate a bug report you send us with the relevant logs.

We do not configure Sentry to record session replays of user interface content or to capture your input. Sentry retention is limited to our default plan (typically 30–90 days).

### 3.9 Device and technical information

When you connect to our backend, our processor Supabase logs technical information for security and abuse prevention, including:

- IP address, request timestamps, HTTP method, user-agent string.
- App version and OS version (when provided by the App).

### 3.10 Camera (optional)

If you use the barcode-scanning feature in the nutrition tracker, the App requests camera access. The camera feed is processed locally on your device to extract a numeric barcode; **no image or video is ever uploaded or stored** by us. The extracted barcode digits are then sent to a third-party nutrition lookup service (see Section 7).

### 3.11 Notifications (optional)

If you grant permission, the App may schedule local notifications to alert you when a rest timer ends. These notifications are scheduled and delivered entirely on your device and do **not** involve us or any push-notification server.

### 3.12 Local storage

The App stores some preferences and a workout draft in the device's local storage (UserDefaults on iOS, SharedPreferences on Android, localStorage on web). This local data never leaves your device unless you sign in and sync.

## 4. How we use your information

We use your information to:

1. **Provide the core functionality** of the App — recording workouts, computing rank progressions, syncing nutrition logs across devices.
2. **Authenticate you** and keep your account secure.
3. **Personalize your experience** based on your preferences and goals.
4. **Process and verify subscriptions** through Apple, Google, and RevenueCat.
5. **Show ads** (free tier only) through Google AdMob.
6. **Diagnose and fix bugs** through Sentry crash reports.
7. **Protect the integrity of the service** — detect abuse, prevent fraud and spam, enforce our Terms of Service.
8. **Communicate with you** when you contact us for support.

We do **not** use your information for advertising profiling on behalf of any third party other than Google AdMob, and we do not sell or rent your personal information to anyone.

## 5. Legal bases for processing (GDPR / UK GDPR)

If you are in the EU or UK, we rely on the following legal bases under Article 6 GDPR:

- **Performance of a contract** (Art. 6(1)(b)) — for providing the App's features and processing your subscription.
- **Consent** (Art. 6(1)(a)) — for optional features such as personalized advertising, camera access, and notifications. You may withdraw consent at any time.
- **Legitimate interests** (Art. 6(1)(f)) — for security logging, fraud prevention, and minimal product analytics. We have balanced these interests against your rights and consider them necessary and proportionate.
- **Legal obligation** (Art. 6(1)(c)) — when we must retain information to comply with law (e.g. tax records related to subscriptions).

For health-related data (Art. 9 GDPR), we rely on your **explicit consent** when you create an account and enter body weight, nutrition, or workout data.

## 6. Sharing your information

We share personal information only with the third-party processors listed below, only to the extent necessary, and under appropriate contractual safeguards (data processing agreements, standard contractual clauses where applicable).

### 6.1 Processors we use

| Processor | Purpose | Data shared | Region |
|---|---|---|---|
| **Supabase** | Database, authentication, file hosting | Account, profile, fitness, nutrition, social, technical/log data | United States and/or EU (depending on project region) |
| **Apple** | Sign in with Apple, In-App Purchases, App Store delivery | Authentication identifiers, purchase receipts, device info | Global |
| **Google** | Sign in with Google, In-App Purchases (Android), Google Play delivery, AdMob | Authentication identifiers, purchase receipts, advertising identifiers, device info | Global |
| **RevenueCat** | Subscription management and receipt validation | Pseudonymous user identifier, purchase receipts, entitlement state | United States |
| **Sentry** | Error and crash diagnostics | Pseudonymous user identifier, stack traces, breadcrumbs, device/OS metadata | United States or EU (Sentry SaaS) |
| **USDA FoodData Central** | Nutrition database for food search and barcode lookup | Search terms (food names) or barcode digits, plus your device's IP address (because the call is made directly from your device). No name, email, or account identifier is sent. | United States (US federal API) |
| **Open Food Facts** | Barcode-based food lookup (fallback when USDA has no match) | Numeric barcode digits, plus your device's IP address (because the call is made directly from your device). No name, email, or account identifier is sent. | France (EU) |

We do not share personal information with any other recipient except as required by law (Section 6.2) or with your explicit consent.

### 6.2 Legal disclosures

We may disclose your information if we are legally required to do so by a valid order from a court or government authority in a jurisdiction where we operate, or where we believe in good faith that disclosure is necessary to:

- comply with a legal obligation,
- protect and defend our rights or property,
- prevent or investigate possible wrongdoing in connection with the App,
- protect the personal safety of users or the public.

We will challenge overly broad or improper requests where possible, and notify you of a request when we are not legally prohibited from doing so.

### 6.3 Business transfers

microload is currently operated by an individual and there is no anticipated sale. If the App is ever acquired, merged, or transferred to a successor, your personal information may be transferred as part of that transaction. We will notify you in-App and by email at least 30 days before such a transfer takes effect, and your rights under this Policy will continue to apply.

## 7. International data transfers

Your information may be stored or processed in countries other than Canada, including the United States and the European Union, where our processors are located. We rely on:

- **Standard Contractual Clauses (SCCs)** approved by the European Commission for transfers from the EU/UK to other regions, and
- **PIPEDA's accountability principle** for cross-border transfers from Canada.

You acknowledge that data-protection laws in destination countries may differ from those in your country of residence. We require all our processors to apply protections substantially equivalent to those guaranteed under PIPEDA and GDPR.

## 8. How long we keep your information

We retain personal information only as long as necessary for the purposes described in this Policy:

- **Account, profile, fitness, and nutrition data**: for as long as your account exists. You may delete your account at any time from within the App (Profile → Delete account), which triggers irreversible deletion of your data from our database typically within 30 days.
- **Diagnostic/crash data**: 30–90 days (Sentry default retention).
- **Authentication and security logs**: typically 30 days (Supabase default), longer if needed to investigate a specific security incident.
- **Subscription records**: for the duration of the subscription plus any retention period required by Apple, Google, or applicable tax law.
- **Backup snapshots**: residual data in encrypted backups may persist for up to 30 days after account deletion, after which backups are rotated and the data is overwritten.

If you simply stop using the App without deleting your account, your data will remain until you request deletion. We may, at our discretion, send you an inactivity notice before deleting inactive accounts after a long period (currently no such automatic deletion is implemented).

## 9. Your rights

Regardless of where you live, we extend the following rights to all users of microload:

- **Access** — request a copy of the personal information we hold about you.
- **Rectification** — correct inaccurate or incomplete information.
- **Erasure / deletion** — delete your account and personal information. You can do this yourself in-App at any time (Profile → Delete account). You may also email us to request deletion.
- **Restriction of processing** — ask us to limit how we use your information while a dispute or request is being resolved.
- **Portability** — request a machine-readable export of your data. Email us and we will provide a JSON or CSV export within 30 days.
- **Objection** — object to processing based on legitimate interests.
- **Withdraw consent** — where processing is based on consent, withdraw it at any time. Withdrawal does not affect the lawfulness of processing prior to withdrawal.

### 9.1 Additional rights for EU/UK residents (GDPR)

You have the right to lodge a complaint with your local data-protection authority. In the EU, find yours at [edpb.europa.eu](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en). In the UK, contact the [Information Commissioner's Office](https://ico.org.uk/).

### 9.2 Additional rights for California residents (CCPA/CPRA)

In addition to the rights above, you have the right to:

- **Know** the categories and specific pieces of personal information we have collected about you in the past 12 months.
- **Opt-out of "sale" or "sharing"** of your personal information. We do **not** sell personal information for money, and we do not "share" personal information for cross-context behavioural advertising as defined under CPRA, other than the advertising-identifier sharing with Google AdMob that you can opt out of via your device settings.
- **Non-discrimination** for exercising your rights. We will not refuse service or charge a different price because you exercise a privacy right.

To exercise any of these rights, email **harismanjeyakanthan@gmail.com**. We will verify your identity (typically by confirming you control the account email) and respond within 30 days (45 days for complex requests under CCPA).

### 9.3 Additional rights for Canadian residents (PIPEDA)

You have the right to file a complaint with the [Office of the Privacy Commissioner of Canada](https://www.priv.gc.ca/en/) if you believe we have not addressed a concern adequately.

## 10. Security

We take reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, and destruction. These measures include:

- TLS/HTTPS encryption for all data in transit between the App and our backend.
- Encryption at rest in our database (Supabase managed-Postgres default encryption).
- Password hashing with bcrypt-equivalent algorithms (handled by Supabase Auth).
- Row-Level Security (RLS) policies in the database, audited to ensure users can only access their own data and information explicitly shared with them through social features.
- Server-side enforcement of authentication on all API endpoints.
- Restricted access to production systems, limited to the Operator.

No security measure is perfect. While we strive to protect your information, we cannot guarantee absolute security. If we become aware of a personal-data breach that affects you, we will notify you and the appropriate authorities as required by law.

## 11. Children's privacy

microload is intended for users **aged 13 and older**. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child under 13 has provided us with personal information, please contact us at harismanjeyakanthan@gmail.com and we will delete the information promptly.

EU residents under 16 (and residents of other jurisdictions where the digital-consent age is higher) should obtain a parent's or guardian's consent before using the App.

## 12. Cookies and similar technologies

The native iOS and Android versions of the App do not use HTTP cookies. The App uses local on-device storage (UserDefaults on iOS, SharedPreferences on Android, localStorage on web) to:

- remember your sign-in token and theme preference,
- cache routines and exercise data for offline use,
- temporarily store an in-progress workout draft so you do not lose data if the app is interrupted.

The web version of the App may also use:

- a session cookie set by Supabase Auth to keep you signed in;
- local storage entries with the prefix `liftlog:` or `microload:` for client-side cache and preferences.

We do not use third-party tracking cookies on any version of the App.

## 13. Third-party services

When you tap a link in the App that leads to a third-party website (for example, an "open source licenses" link or a USDA source link), that third party will be subject to its own privacy policy. We are not responsible for the privacy practices of any third party.

## 14. Changes to this Policy

We may update this Policy from time to time to reflect changes in our practices, the App's features, or applicable law. When we make a material change we will:

1. update the "Last updated" date at the top,
2. publish a notice in the App's profile screen at next launch, and
3. for changes that meaningfully expand the use of personal information, request your renewed consent before the change takes effect.

We will not retroactively use information collected before a change in ways that the previous version of the Policy would not have permitted, without your explicit consent.

## 15. Contact

If you have questions, concerns, or requests under this Policy, contact:

**Harisman Jeyakanthan**
Email: **harismanjeyakanthan@gmail.com**

We aim to respond to all privacy inquiries within 7 days, and to formal data-rights requests within 30 days (45 days for complex requests under CCPA).

---

*This Policy was last updated on May 30, 2026.*

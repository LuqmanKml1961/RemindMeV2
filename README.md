# RemindMe (PWA)

A local-first reminder app - installable on laptop, iOS, and Android from one codebase. No accounts, no cloud: reminders, medications, vault entries, and to-dos live entirely in your browser's storage (IndexedDB).

This is the PWA rewrite of the original native Android app (Kotlin/Compose, see the sibling `RemindMe` repo). Feature parity: time-based reminders with quick presets, medical entries with multiple medications, monthly bills with an amount, recurrence (daily/weekly/monthly/yearly/every N days), share-via-link import, a notification-free Vault (People / Home & Vehicle / Property), a to-do list, auto-delete on completion, and onboarding.

Live deployment: `https://remind-me-v2.vercel.app`

---

## Changelog

Newest first. This log covers notable feature, UX, and PWA changes; see git history for full detail.

### 2026-09-03 — Motion & high-refresh polish (`improve/pwa-perfection`)

> Shipped on the `improve/pwa-perfection` branch (commit `48a769a`), **not yet merged into `main`**.

- **Fluid view transitions**: every page now animates in/out via the View Transitions API (new `PageTransition` wrapper).
- **Compositor-only animations**: only `transform`/`opacity` are animated (sheet-up, fade-in, press-on-tap), so everything runs on the GPU — silky on high-refresh displays with no layout thrash. Route changes use a short, clean cross-fade (no overlapping-page jank).
- **Reduced-motion support**: a `prefers-reduced-motion` media query disables all animations, transitions, and view transitions for users who opt out of motion (accessibility).

### 2026-09-03 — Production PWA polish (`ab74408`, merged into `main`)

- Offline-first service worker rewrite (`public/sw.js`) with an explicit `/offline` fallback page and an offline banner.
- New `/offline`, error, not-found, global-error, and loading UI states.
- SEO / sharing metadata: `opengraph-image`, `robots.txt`, `sitemap.xml`, `apple-icon`.
- Enhanced `manifest.webmanifest` and stricter security headers.

### 2026-09-03 — Fix push notifications on mobile (`6bc4ca3`, merged into `main`)

- Push notifications now work on iOS/Android (home-screen installed) and Windows.
- `requestNotificationPermissionAndSubscribe()` no longer falsely reports success when subscribing actually failed; Settings independently verifies a real subscription exists.

---

## Table of contents

- [Why there's a tiny backend](#why-theres-a-tiny-backend)
- [How it all fits together](#how-it-all-fits-together)
- [Codebase guide](#codebase-guide)
- [Local development](#local-development)
- [Deploying - full walkthrough](#deploying--full-walkthrough)
- [Troubleshooting](#troubleshooting)
- [Testing](#testing)

---

## Why there's a tiny backend

Everything you enter - reminders, medications, vault data, to-dos - is stored **only** in your browser (Dexie/IndexedDB). Nothing about that data ever leaves your device.

The one thing the browser genuinely cannot do on its own is **wake itself up after being killed** to show a notification - there's no web equivalent of Android's `AlarmManager`. The only mechanism that survives a fully-closed browser/app on both Android and iOS (16.4+, home-screen-installed) is **Web Push**, and Web Push requires a server to hold your push subscription and fire the push at the right time.

So there's a minimal Next.js API + database that stores **only**: your push subscription, and for each upcoming reminder, its title/body text and trigger time. That's it - no medications, no vault content, no to-dos ever touch the server.

## Notifications: what to expect per platform

- **Android (Chrome)**: works after closing the app/tab; the browser's push service wakes the service worker in the background.
- **iOS (Safari, 16.4+)**: you must **Add to Home Screen** first and open the app from there - regular Safari tabs cannot receive push. Once installed, grant notification permission from inside the app (Settings → Enable Notifications).
- **Windows/desktop**: works while Chrome is allowed to run in the background. Check Chrome's `chrome://settings/system` → **"Continue running background apps when Google Chrome is closed"** is on, otherwise a fully-quit browser can't receive push.

---

## How it all fits together

```
┌──────────────────────────┐        ┌────────────────────────────────────┐
│  Browser (your device)   │        │  Vercel (Next.js app)              │
│                          │        │                                    │
│  IndexedDB (Dexie)       │        │  API routes (app/api/push/*)       │
│  - reminders             │        │  - subscribe / unsubscribe         │
│  - medications           │        │  - schedule / cancel               │
│  - vault entries         │        │  - dispatch                        │
│  - todos                 │        │  - vapid-public-key                │
│  - preferences           │        │            │                       │
│         │                │        │            ▼                       │
│         │ create/edit ───┼───────►│  Turso (libSQL) database           │
│         │ a reminder     │        │  - push_subscriptions              │
│         │                │        │  - scheduled_triggers              │ 
│  Service worker (sw.js)  │        │    (title/body/time only -         │
│  - caches the app shell  │        │     never your reminder content)   │
│  - shows notifications ◄─┼────────┼── web-push sends the actual push   │
│    even if the app/tab   │        │            ▲                       │
│    is fully closed       │        │            │                       │
└──────────────────────────┘        │  cron-job.org pings /api/push/     │
                                    │  dispatch every minute, which      │
                                    │  finds due triggers and sends      │
                                    │  the push for each one             │
                                    └────────────────────────────────────┘
```

**Data flow when you create a reminder with a due date:**

1. `lib/db/reminders.ts` → `createReminder()` saves it to IndexedDB (source of truth).
2. It calls `lib/push/client.ts` → `syncReminderSchedule()`, which - only if notifications are enabled on this device - `POST`s the reminder's title/body/due-time (not the medications or vault data) to `/api/push/schedule`, which upserts a row into the `scheduled_triggers` table.
3. Every minute, an external cron service calls `POST /api/push/dispatch`. It reads all triggers whose time has passed, calls `web-push` to send each one via the browser vendor's push service (Google's FCM for Chrome, Apple's push service for Safari, etc.), and either reschedules (if recurring) or deletes the trigger.
4. The actual push message reaches the device's OS-level push service, which wakes `public/sw.js` (even if the browser/app was fully closed) to call `showNotification()`.
5. Tapping the notification opens the app to that reminder.

**Data flow when you share a reminder:**

The reminder's data is embedded directly in the share link's URL fragment (`/import#<base64url JSON>`), not looked up from a server. This means importing works cross-device with zero backend involvement - see [`lib/domain/share.ts`](#libdomain).

---

## Codebase guide

### `app/` - pages and API routes (Next.js App Router)

| Path | What it does |
| --- | --- |
| `app/layout.tsx` | Root layout: registers the service worker (`components/PwaRegister.tsx`), renders the bottom nav, sets PWA metadata (manifest link, theme color). |
| `app/page.tsx` | Home screen. Redirects to `/onboarding` if the user hasn't seen it yet; otherwise lists active/completed reminders via a live Dexie query. |
| `app/create/page.tsx` | Create/edit reminder form - type (General/Medical/Monthly), title, description, medications editor, due-date presets, recurrence picker, auto-delete toggle. |
| `app/todo/page.tsx` | Simple to-do list (add, toggle complete, delete). |
| `app/vault/page.tsx` | Vault CRUD - People / Home & Vehicle / Property categories, search, no notifications ever. |
| `app/settings/page.tsx` | Notification permission status + enable button, auto-delete default toggle, replay onboarding. |
| `app/onboarding/page.tsx` | First-run feature tour; "Get Started" requests notification permission and marks onboarding seen. |
| `app/import/page.tsx` | Reads the share link's URL fragment, decodes it, shows a preview, and imports on confirm. |
| `app/api/push/subscribe/route.ts` | Saves a device's push subscription (endpoint + keys) to the database. |
| `app/api/push/unsubscribe/route.ts` | Deletes a device's subscription and all its scheduled triggers. |
| `app/api/push/schedule/route.ts` | Upserts one scheduled trigger (reminder id, title, body, trigger time, recurrence) for a device. |
| `app/api/push/cancel/route.ts` | Deletes one scheduled trigger (reminder completed/deleted/dated cleared). |
| `app/api/push/dispatch/route.ts` | The cron target: finds due triggers, sends each push, reschedules recurring ones or deletes one-offs. Protected by `CRON_SECRET` if set. |
| `app/api/push/vapid-public-key/route.ts` | Returns the server's VAPID public key so the client can subscribe - see [why this isn't a build-time env var](#why-the-vapid-public-key-is-fetched-not-baked-in) below. |

### `components/`

| File | What it does |
| --- | --- |
| `Brutal.tsx` | The design system primitives - `BrutalButton`, `BrutalCard`, `BrutalInput`, `BrutalTextarea`, `BrutalLabel`, `BrutalChip`. Hard 2px borders, no rounded corners, uppercase bold labels - ported from the original app's Compose "brutalist" theme. |
| `BottomNav.tsx` | The Home/Todo/Vault/Settings tab bar; hides itself on `/onboarding` and `/import`. |
| `PwaRegister.tsx` | Client component that registers `public/sw.js` on mount. |
| `ReminderCard.tsx` | One reminder in the list: shows medications/amount depending on type, overdue highlighting (re-checked every 30s via a small `useNow` hook), complete checkbox, edit/share/delete actions. |
| `ShareDialog.tsx` | The share modal - "Copy Link" (via `lib/clipboard.ts`) and native "Share" (via the Web Share API when available). |

### `lib/domain/`

Pure logic with no browser/server dependencies - the equivalent of the original Kotlin app's `domain` package.

| File | What it does |
| --- | --- |
| `types.ts` | The data model: `Reminder`, `Medication`, `RecurrenceRule`, `VaultReference`, `TodoItem`, `Preferences`. |
| `recurrence.ts` | `computeNextDue()` - given a last-due date and a recurrence rule, returns the next occurrence (daily/weekly/monthly/yearly/every-N-days). Used both client-side (when a reminder fires locally) and server-side (when the dispatch cron reschedules a recurring push). |
| `share.ts` | `encodeShareFragment()` / `decodeShareFragment()` - base64url-encodes a reminder's data for the share link's URL fragment (`#...`), which the browser never sends to any server. This is the fix for the original Android app's bug where share links only worked if the recipient already had the reminder in their own local database. |

### `lib/db/` - the IndexedDB layer (Dexie)

| File | What it does |
| --- | --- |
| `dexie.ts` | Defines the `RemindMeDB` class (four tables: `reminders`, `vaultReferences`, `todos`, `preferences`) and a `newId()` helper. |
| `reminders.ts` | `createReminder`, `updateReminder`, `deleteReminder`, `setCompleted` (handles auto-delete-on-complete), `importReminder`. Every create/update also calls into `lib/push/client.ts` to keep the server-side schedule in sync. |
| `todos.ts` | `createTodo`, `updateTodo`, `deleteTodo`, `toggleTodo`. |
| `vault.ts` | `createVaultReference`, `updateVaultReference`, `deleteVaultReference`. |
| `preferences.ts` | A single "singleton" row holding `autoDeleteDefault`, `hasSeenOnboarding`, and a randomly-generated `deviceId` (used to key push subscriptions/schedules server-side - there are no user accounts, so this anonymous per-browser id is how the server knows which subscription belongs to which set of scheduled reminders). |

Pages read data reactively via `dexie-react-hooks`' `useLiveQuery` - the UI updates automatically whenever the underlying IndexedDB data changes, no manual refetching.

### `lib/push/` - the notification pipeline

| File | Runs where | What it does |
| --- | --- | --- |
| `client.ts` | Browser | `getNotificationReadiness()` (checks platform support / iOS install requirement / permission state), `requestNotificationPermissionAndSubscribe()` (the actual subscribe flow), `hasActiveSubscription()` (double-checks a real subscription exists rather than trusting permission state alone), `syncReminderSchedule()` / `cancelReminderSchedule()` (called by `lib/db/reminders.ts` on every create/update/delete). |
| `store.ts` | Server only (`import "server-only"`) | All database access for push delivery - `saveSubscription`, `deleteSubscription`, `getSubscription`, `upsertTrigger`, `cancelTrigger`, `getDueTriggers`, `rescheduleTrigger`. Lazily creates the libSQL client (see [below](#why-the-libsql-client-is-created-lazily)) and auto-creates its two tables on first use. |
| `send.ts` | Server only | Wraps the `web-push` library - configures VAPID details once, sends one push, and reports back whether the subscription is dead (404/410 from the push service) so the caller can clean it up. |

### `lib/api/withErrors.ts`

Wraps every push API route handler in a try/catch that logs server-side and returns `{ error: message }` as JSON instead of letting an unhandled exception produce Next.js's default **empty 500 response with no body** - which is nearly impossible to debug against a deployed app with no direct log access. This one change is what turned "the deploy is broken, no idea why" into an immediately readable error message during setup.

### `lib/uuid.ts` and `lib/clipboard.ts`

Small platform-compatibility shims:
- `uuid()` falls back from `crypto.randomUUID()` (which only exists in secure contexts - HTTPS or `localhost`) to `crypto.getRandomValues()`-based generation, so the app still works when opened over a plain-HTTP LAN address during local device testing.
- `copyToClipboard()` falls back from `navigator.clipboard.writeText()` (same secure-context restriction) to the classic `document.execCommand('copy')` technique.

Neither matters once deployed (Vercel is always HTTPS), but both were needed to test on a phone over the local network during development.

### `public/`

- `sw.js` - the service worker. Caches the app shell for basic offline support, and (the actual point of all this) listens for `push` events to call `showNotification()` and `notificationclick` events to focus/open the app. This keeps running even when no tab is open.
- `manifest.webmanifest` - PWA metadata (name, icons, standalone display mode, theme color).
- `icons/` - generated by `scripts/generate-icons.mjs` (a brutalist "R" monogram rasterized to the required sizes, including maskable variants for Android's adaptive icons).

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values - see below
npm run dev
```

Open http://localhost:3000.

### Generate VAPID keys (one-time)

```bash
npx web-push generate-vapid-keys
```

Put the values in `.env.local`:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

`VAPID_SUBJECT` **must** be either `mailto:someone@example.com` or a full `https://...` URL - a bare email address fails validation inside the `web-push` library with `Vapid subject is not a valid URL`.

### Local push-scheduling database

By default `DATABASE_URL` is unset and falls back to a local SQLite file (`local.db`, gitignored) via `@libsql/client` - no external account needed for development.

### Manually testing "fires after the app is killed"

1. `npm run dev`, open the app, complete onboarding (grants notification permission + subscribes).
2. Create a reminder due ~1 minute out.
3. Close the tab (or, on a real device, kill the app entirely).
4. Trigger a dispatch cycle by calling the endpoint yourself:
   ```bash
   curl -X POST http://localhost:3000/api/push/dispatch
   ```
   In production this is called automatically every minute by cron-job.org (see below).
5. You should get a real system notification; tapping it opens the app to that reminder.

---

## Deploying - full walkthrough

This records exactly what was needed to get the live deployment (`https://remind-me-v2.vercel.app`) working, gotchas included.

### 1. Import the repo into Vercel

Link `https://github.com/LuqmanKml1961/RemindMeV2` as a new Vercel project.

### 2. Provision a database (Turso)

`local.db` will **not** persist on Vercel's serverless filesystem - you need a real hosted libSQL database.

Easiest path: use Vercel's storage marketplace to add a Turso database to the project.
- **Environments**: enable **Production** and **Preview**. Leave **Development** unchecked (local dev uses the `local.db` fallback).
- **Create database branch for deployment**: check **Preview** only, leave **Production** unchecked - each preview deployment gets its own throwaway data, production stays on the one stable database.
- **Custom Prefix**: whatever prefix you pick, the app checks for both `DATABASE_URL`/`DATABASE_AUTH_TOKEN` **and** `DATABASE_TURSO_DATABASE_URL`/`DATABASE_TURSO_AUTH_TOKEN` (see `lib/push/store.ts`), because that's what this project's integration actually generated. If you use a different prefix, either update those two `resolveUrl`/`resolveAuthToken` functions to match, or just rename the prefix to `DATABASE` to land on the plain names.

### 3. Set the remaining environment variables

In Vercel → Settings → Environment Variables → **Production**:

| Name | Value | Notes |
| --- | --- | --- |
| `VAPID_PUBLIC_KEY` | from `npx web-push generate-vapid-keys` | **No** `NEXT_PUBLIC_` prefix - see below for why. |
| `VAPID_PRIVATE_KEY` | from the same command | Keep secret. |
| `VAPID_SUBJECT` | `mailto:you@example.com` | Must include the `mailto:` prefix - a bare email address fails. |
| `CRON_SECRET` | any random string, e.g. `openssl rand -base64 18` | Locks down `/api/push/dispatch` so randoms can't trigger it. |

### 4. Deploy, and make sure it's a *fresh* deployment

After saving new env vars, **create a new deployment** (push a commit, or use Vercel's redeploy - but note that reusing an old deployment's build can carry over stale env var snapshots; if in doubt, push a trivial commit to force a genuinely new build). `next build` fails outright if `DATABASE_URL` ends up as an empty string rather than unset - this was hit once already and is why `lib/push/store.ts` treats an empty string the same as unset (`||` instead of `??`) and creates the libSQL client lazily instead of at module load, so a bad value can't crash the build.

### 5. Schedule the dispatch call

Vercel's Hobby plan only allows **daily** cron jobs, which defeats the purpose of timely reminders. This app relies on an external service to call `POST /api/push/dispatch` on a schedule instead. [**cron-job.org**](https://cron-job.org) (free) is what this deployment actually uses:

1. Sign up, click **Create cronjob**.
2. **URL**: `https://<your-domain>/api/push/dispatch`
3. **Schedule**: every 1 minute.
4. Under the job's **Advanced** section: **Request method** → `POST`, and add a custom header **Name**: `Authorization`, **Value**: `Bearer <CRON_SECRET>` (the same value from step 3).
5. Save, then use **"Perform test run"** to confirm it returns `200` with a body like `{"checked":0,"sent":0}`.

Note: cron-job.org **automatically disables a job** after too many consecutive failures (this happened once during setup, from a misconfigured `VAPID_SUBJECT`). If you get an email saying your job was disabled, fix the underlying error first (test the endpoint manually with `curl`), then go re-enable the job - it will not resume on its own.

Alternative: upgrade to Vercel Pro and add a `crons` block to a `vercel.json` for a fully native solution instead of an external service.

### Why the VAPID public key is fetched, not baked in

A VAPID key pair is public-key cryptography - the **public** key is genuinely meant to be visible in the browser (it's what `pushManager.subscribe()` sends to identify the server). The natural Next.js approach would be a `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var, inlined into the client bundle at build time.

Two problems came up with that in practice:
1. **Vercel's dashboard refuses to save it.** Its secret-scanning heuristic flags the key's value as looking like a secret (it's a long base64url string) and blocks saving it under a `NEXT_PUBLIC_`-prefixed name, even though this specific value isn't actually sensitive.
2. **Build-time inlining is fragile.** A `NEXT_PUBLIC_*` var only takes effect if it was present *during the build* - adding or changing it afterward silently does nothing until a fresh deployment happens. This caused a real, hard-to-diagnose bug: the app looked like it worked (permission granted) but never actually subscribed, because the key was empty in that build.

The fix: `VAPID_PUBLIC_KEY` (no prefix, a normal server-only env var - no dashboard warning) is served at request time via `GET /api/push/vapid-public-key`, and the client fetches it before subscribing. This also means the key can be rotated without a redeploy.

### Why the libSQL client is created lazily

Next.js imports every API route module during the build's static-analysis pass ("Collecting page data"), before any real request happens. `lib/push/store.ts` originally called `createClient(...)` at module load - so when `DATABASE_URL` was present but set to an **empty string** (not unset) in Vercel, the build itself crashed with `LibsqlError: URL_INVALID`. Now the client is only constructed on first actual use, and `||` (not `??`) treats an empty string the same as unset - falling back to `local.db` instead of crashing.

---

## Troubleshooting

Real issues hit while standing this deployment up, roughly in the order they'd bite you:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `next build` fails with `LibsqlError: URL_INVALID: The URL '' is not in a valid format` | `DATABASE_URL` is set in Vercel but empty | Already fixed in code (lazy client + `\|\|` fallback) - if you see this again, check the env var actually has a value. |
| `/api/push/dispatch` (or any push route) returns a `500` with an **empty body** | An unhandled exception - no error detail without this | Already fixed (`lib/api/withErrors.ts` wraps every route). If you see an empty 500 again on a *new* route, it's not wrapped - apply the same pattern. |
| `/api/push/dispatch` returns `{"error":"ConnectionFailed(\"Unable to open connection to local database local.db: 14\")"}` | `DATABASE_URL`/`DATABASE_AUTH_TOKEN` (or the `DATABASE_TURSO_*` equivalents) aren't actually set for **Production** | Check Settings → Environment Variables → Production has real (non-empty) values, then redeploy. |
| Vercel won't save `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - warns about exposing a public value and asks to remove the prefix or convert to "Config" | Vercel's secret-value heuristic | Not applicable anymore - the app now uses `VAPID_PUBLIC_KEY` (no prefix) instead, precisely to avoid this. |
| Settings page shows "Enabled" but no subscription ever reaches the server (`push_subscriptions` table stays empty) | `requestNotificationPermissionAndSubscribe()` used to silently return `"ready"` even when subscribing failed | Fixed - it now returns `"not-configured"` on any failure, and Settings independently verifies a real subscription exists rather than trusting `Notification.permission` alone. |
| `/api/push/dispatch` returns `{"error":"Vapid subject is not a valid URL. you@example.com"}` | `VAPID_SUBJECT` was set to a bare email address | It must be `mailto:you@example.com` (with the prefix) or a full URL. |
| cron-job.org email: *"your cronjob has been disabled automatically because of too many failed executions"* | Whatever was causing `/api/push/dispatch` to 500 (see rows above) went unnoticed because nobody was watching the cron job's history | Fix the underlying 500 first (curl the endpoint manually with the `Authorization` header to confirm `200`), **then** manually re-enable the job on cron-job.org - it does not resume on its own. |
| cron-job.org test run returns `401 Unauthorized` | The `Authorization` header wasn't actually saved/sent | On cron-job.org, custom headers live under the job's **Advanced** tab as separate Name/Value fields (or one combined `Name: Value` line depending on the UI) - make sure it's saved there, not just typed and left uncommitted, and that request method is `POST`. |
| curl works from a terminal but `localhost` in a real browser can't reach the local dev server | The dev server may be bound to a network namespace or interface the browser can't route to | Bind explicitly with `next dev -H 0.0.0.0`, and if `localhost` still fails, try the machine's LAN IP address instead (shown as "Network:" in the `next dev` output). |
| `crypto.randomUUID is not a function`, or `navigator.clipboard` is `undefined`, when testing over a local network address | Both APIs require a secure context (HTTPS or exactly `localhost`) - a plain-HTTP LAN address doesn't qualify | Already handled - `lib/uuid.ts` and `lib/clipboard.ts` have fallbacks. Doesn't affect the real HTTPS deployment. |

---

## Architecture summary

- **Storage**: Dexie (IndexedDB) - `lib/db/*`. Source of truth for all personal data, offline-capable.
- **Domain logic**: `lib/domain/*` - recurrence math, share-link encode/decode.
- **Share/import**: the reminder's data is embedded directly in the share link's URL fragment (base64url JSON after `#`), never sent to any server. This fixes a bug in the original Android app, where the share link only worked if the recipient happened to already have the reminder in their own local database.
- **Push**: `lib/push/client.ts` (subscribe/permission flow), `lib/push/store.ts` + `lib/push/send.ts` (server-only), `app/api/push/*`, `public/sw.js` (service worker: push + notificationclick handlers, plus basic offline app-shell caching).
- **UI**: brutalist look ported from the original app's Compose theme (`components/Brutal.tsx`, palette in `app/globals.css`), light/dark via `prefers-color-scheme`.

## Testing

```bash
npm run build   # type-checks + production build
npm run lint
```

## License

All rights reserved.

# RemindMe (PWA)

A local-first reminder app - installable on laptop, iOS, and Android from one codebase. No accounts, no cloud: reminders, medications, vault entries, and to-dos live entirely in your browser's storage (IndexedDB).

This is the PWA rewrite of the original native Android app (Kotlin/Compose, see the sibling `RemindMe` repo). Three things, each answering one question:

| | One-line meaning | Alerts? |
| --- | --- | --- |
| **Reminder** | "Alert me at a time." Four kinds: **Once** (auto-deletes when done), **Repeat** (daily/weekly/monthly/yearly/every N days), **Medical** (medication list), **Money** (amount). | Always |
| **To-do** | "Lists of things to do." Each list has a title and description and holds its own tasks (Groceries → milk, eggs…). | Optional — "Remind me" on a task creates a linked Reminder |
| **Vault** | "Things I want to remember. Peek when I forget." (People / Home & Vehicle / Property) | Never |

Any reminder or any to-do list can be **shared as a link** (WhatsApp, copy, or any app); the recipient taps it and it lands in their own RemindMe — no accounts anywhere.

Live deployment: `https://remind-me-v2.vercel.app`

---

## Changelog

Newest first. This log covers notable feature, UX, and PWA changes; see git history for full detail.

### 2026-09-13 — To-do lists; no more duplicate reminders from a double tap

- **To-do is now lists of tasks.** `/todo` shows the lists (title, description, "2 of 5 done"); `/todo/<id>` is the checklist inside one list, with the same add / edit / tick / delete / "Remind me" / Share as before. Sharing sends one list; importing creates a new list on the recipient's device. Existing tasks are moved into a list called "My tasks" by the Dexie v2 upgrade (`lib/db/dexie.ts`).
- **Save is locked while a reminder is being saved** (`app/create/page.tsx`). Saving also syncs the push schedule with the server, which can take a moment on a slow connection; tapping Save repeatedly in that window created one reminder per tap. The button now shows a spinner and both buttons are disabled until the save finishes.

### 2026-09-13 — Grey chin fixed; manifest colours dark-first

- The grey "chin" under the bottom bar was `html`/`body` still painted `var(--card)` from the old grounded-bar design, showing behind Android's gesture bar in the edge-to-edge fullscreen mode; they are now `var(--background)` like the page (see Platform UI notes).
- Manifest `theme_color` / `background_color` are `#0c0b09` (dark-first: the splash and any opaque bar match the dark app). Verified on device that in `standalone` mode Chrome paints the status bar from the manifest's static `theme_color` and ignores the page's `<meta name="theme-color">` — one reason `standalone` was rejected. `components/ThemeColor.tsx` keeps a single `<meta name="theme-color">` equal to the resolved theme's background for browser tabs; the media-query pair of tags is gone.

### 2026-09-13 — Status bar back, icons that actually update

- **`display` stays `fullscreen`** (`display_override: ["fullscreen", "standalone"]`). Verified on the author's Android phone: in this mode Chrome draws the app edge-to-edge *with* the status bar still visible over the content — the intended look. `standalone` was tried and rejected: it replaces the transparent bars with an opaque Chrome-painted status bar and navigation bar (the latter showed as a grey "chin" that no page CSS can change). The layout's `env(safe-area-inset-*)` padding is what keeps content clear of the bars in fullscreen.
- **Icon URLs are versioned** (`/icons/icon-192.png?v=2` etc. in the manifest, `<head>`, service worker notifications, and in-app uses). Icons are served `immutable` for a day, and Chrome only refreshes an installed app's icon and splash when the manifest's icon URL changes — so a same-URL artwork swap was invisible to it. **Bump `?v=` whenever the artwork changes.** The manifest itself is now `max-age=0, must-revalidate` so Chrome's update check always sees the current one.
- `<head>` icon links (favicon, 192/512, `apple-touch-icon`) are all declared in `app/layout.tsx` with the same `?v=`: on this Next version an explicit `metadata.icons` replaces the links the `app/icon.png` / `app/apple-icon.png` conventions would emit, so they must be listed there.
- Platform limits, for the record: Chrome checks an installed app's manifest at most about once a day and applies icon/name/display changes on a later launch, so allow a day or two. **iOS never updates an installed web app's icon** — remove it from the Home Screen and add it again.

### 2026-09-13 — Updates that install themselves (`improve/production-hardening`)

Deploys used to require clearing site data or reinstalling the app: the service worker only changed when someone edited its cache-name constant by hand, and the page only looked for a new worker at load — an installed app resumed from memory never noticed a deploy. Now:

- **Every build ships a byte-different worker.** The source lives in `sw/sw.js`; `scripts/build-sw.mjs` (run by `predev`/`prebuild`, so `npm run dev` / `npm run build` / Vercel all do it) writes `public/sw.js` (gitignored) with the commit SHA stamped in. The cache names carry the SHA, so `activate` drops every cache from the previous build.
- **The app checks for updates when it comes back to the foreground** (and hourly while open), via `registration.update()` in `components/PwaRegister.tsx`.
- **When the new worker takes control**, the app reloads immediately if it's in the background; if it's on screen it shows a "RemindMe was updated — Refresh" toast and reloads on its own the next time it's brought to the foreground, so a half-typed form is never thrown away.

Verified in headless Chromium: rewrite `public/sw.js` on disk while the app is open → foreground → toast, old caches gone → next foreground → reload onto the new worker.

### 2026-09-13 — Logo, date & time picker, to-do flow (`improve/production-hardening`)

Reviewed every screen as real phone screenshots (iPhone 14 and Pixel 7 profiles, light and dark, via headless Chromium) before and after.

- **Logo**: the "R + clock" mark (`public/logo.svg`) is now the source for every icon. `scripts/generate-icons.mjs` rasterizes it into the manifest icons, maskable variants (mark scaled to 86% so Android's circular mask never clips the legs), `app/apple-icon.png`, the favicon (`app/icon.png`, Next.js file convention — the old `favicon.ico` is gone), and a white-on-transparent status-bar badge cut from the light path. The desktop rail, onboarding hero and OG image use it. Unreferenced `public/icon.png` / `public/icons/apple-touch-icon.png` removed.
- **Date & time picker** (`components/ui/date-picker.tsx`): the popover with 28 px calendar cells and two 24/60-option `<select>`s is replaced by a shadcn `Dialog`: Today / Tomorrow / In a week chips, a 36 px-cell calendar (past days disabled), a native `<input type="time">` so iOS and Android open their own wheel, and Morning / Noon / Evening / Night chips. Edits live in a draft until **Done**; **Clear** removes the time.
- **To-do add** follows the Reminder page: a **New** button in the header opens a "New task" dialog (each Add saves and clears so several can be entered in a row). The always-visible "Add a task…" bar, which read as a search field, is gone. Share moved to an icon button beside New.
- **Polish from the screenshots**: equal-height Kind cards on Create, banner titles that read as sentences ("Notifications are off", "Install to get notifications"), one-row Vault categories (People / Home & Vehicle / Property), 20 px checkboxes on reminder cards and task rows.

### 2026-09-13 — Onboarding that explains the app (`improve/production-hardening`)

The old intro was a feature list with a "Get Started" button. It is now four short screens with Back / Next / Skip and step dots: **what it is** (Reminder / To-do / Vault, one line each) → **how to create one** (the four kinds, as cards) → **how to share** (WhatsApp, copy, any app) → **get notified** (the notification step from the trust pass). Skip jumps to the notification step rather than past it. Replayable from Settings → "Replay Guide".

### 2026-09-13 — Share reminders *and* to-do lists (`improve/production-hardening`)

- **Share a to-do list**: the To-do page has a "Share list" button that sends every open task as one link. The recipient previews the list on `/import` and adds the tasks to their own To-do — the "my mother is away next week, here's the list" case.
- **Same link format, backwards compatible**: list links carry `kind: "todo"` in the fragment; reminder links (which predate it) carry no `kind` and keep working. `decodeSharedContent()` in `lib/domain/share.ts` dispatches between the two.
- **WhatsApp first**: the share dialog (`components/ShareDialog.tsx`, now shared by reminders and lists) leads with "Send on WhatsApp" (`wa.me/?text=…`), then Copy, then the native share sheet where the browser has one.

### 2026-09-13 — Back to the root: clear kinds, clear links (`improve/production-hardening`)

The three features now each answer one question — **Reminder**: "alert me at a time"; **To-do**: "a checklist, alerts optional"; **Vault**: "things I want to remember, no alerts" — and the UI says so.

- **Reminder kinds** (`lib/domain/kind.ts`): the unexplained General / Medical / Monthly buttons are replaced by four kinds with one-line descriptions in the form — **Once** (alerts one time, auto-deletes when done), **Repeat**, **Medical**, **Money**. Kinds are *derived* from the existing `type` + `recurrence` fields, so no data migrates and old reminders show the right kind. Home filters by kind; cards show the kind badge.
- **To-do → reminder, one direction**: a task has a "Remind me" bell that opens the reminder form prefilled and links the two (`TodoItem.reminderId`). The row then shows the alert time; completing the task completes its reminder (and stops the push). Deleting a reminder only *unlinks* its task instead of deleting it. The reverse "Also add to to-do list" switch on the reminder form is gone — it was the source of the confusion.
- **Vault** copy explains what it's for; it is otherwise unchanged.

### 2026-09-13 — Notifications you can trust (`improve/production-hardening`)

Enabling push used to be a blind, multi-second wait ("Get Started" awaited the browser prompt, the push service and the server with no loading state, and swallowed every failure), and "Enabled" was inferred from `Notification.permission` rather than proven. Now:

- **Onboarding** has a dedicated "Get notified" step (`components/NotificationSetup.tsx`): a visible loading state while the permission → subscribe → server chain runs, the honest outcome (On / Off / Blocked / Install first / Failed) with what to do about it, and a **Skip for now** that never blocks first use.
- **Settings** has a real **on/off switch**. Off genuinely unsubscribes (server via `/api/push/unsubscribe`, then the browser subscription, then the stored token) and flags active reminders `pushSyncPending` so turning it back on reschedules them. Status is always derived from a live subscription (`getVerifiedNotificationReadiness()`), never from permission alone.
- **Send test notification** (`POST /api/push/test`, device-token protected) pushes through the real pipeline — VAPID → push service → device — so closed-app delivery can be proven on the actual phone instead of guessed. The result distinguishes "sent", "subscription expired", "server couldn't send" (VAPID/config) and "couldn't reach server".
- **Home** shows a shadcn `Alert` whenever reminders can't alert a closed app, linking to Settings.
- New shadcn primitives: `alert`, `spinner`.

### 2026-09-13 — Production validation pass (`improve/production-hardening`)

A full audit of the codebase against the Next.js 16 production checklist. Lint, type-check, unit tests, and the production build were already clean; the fixes below address the remaining real defects found by reading every module.

- **Offline notification tap** (`public/sw.js`): tapping a notification navigates to `/?reminder=<id>`. Offline, the service worker matched that exact URL against the cache, missed, and served the `/offline` page even though `/` was cached. Navigation fallback now matches with `ignoreSearch`.
- **Settings hydration mismatch** (`app/settings/page.tsx`): notification readiness was computed during the first render, so the prerendered HTML (`needs-permission`) disagreed with the client (`needs-install` on iOS Safari, `ready` after enabling). Readiness is now resolved after mount.
- **Dispatch auth** (`app/api/push/dispatch/route.ts`): the constant-time comparison guarded on string length but compared bytes, so a same-length multibyte `Authorization` header produced a 500 instead of a 401. It now compares byte lengths.
- **`VAPID_SUBJECT` fallback** (`lib/push/send.ts`): an empty-string value now falls back like an unset one, matching how `DATABASE_URL` is handled.
- **Tooling**: `vitest.config.ts` → `.mts` (silences the CommonJS warning), `engines.node >= 20.9.0` declared (Next 16 requirement), CI runs with read-only token permissions and cancels superseded runs, and `lib/api/withErrors.ts` now has unit tests.
- **Known limitation, unchanged**: `/api/push/subscribe` is anonymous and unthrottled. Proper rate limiting on serverless needs a shared store (e.g. Vercel KV / Upstash); it is deliberately not bolted on here.

### 2026-09-11 — Exact-time local notifications

Push notifications previously couldn't arrive faster than the server's ~1-minute dispatch cron. Now they fire at the **exact** due-second while your device is awake:

- New client plan + service-worker timer layer (`lib/notify/plan.ts`, `components/ExactTimeNotifier.tsx`, `public/sw.js`): the app hands upcoming due-times to the service worker, which arms a `setTimeout` per occurrence and shows the notification precisely on time — no more up-to-~60s lag.
- The text/tag/icon are shared with the server push path, so when the ~1-min cron still arrives (or when the browser was killed and no timer survived), the notification **replaces** rather than duplicates.
- One-off reminders cancel their server trigger once they've fired locally, so the cron push doesn't re-surface the same reminder a minute later.
- Recurring reminders pre-arm their next occurrences within a 7-day window; the server keeps the chain going from there.
- The server cron/web-push pipeline is unchanged and still covers the fully-killed-browser case.

### 2026-09-09 — Bottom nav fixes for iOS and Android (`6854301`, `913003b`, `be009d3`, merged into `main`)

> Fixes two platform-specific bottom-bar issues (pushed commits on `main`; the earlier ones in this list came from the `improve/pwa-perfection` branch).

- **iOS — bottom navigation bar**: the bar is now a floating rounded "pill" (`inset-x-4`, rounded-2xl, `bg-card/95` + `backdrop-blur`, `shadow-xl`) positioned with `env(safe-area-inset-bottom)` clearance, so it sits above the home-indicator gesture area and reads correctly on a notched iPhone (installed PWA) instead of colliding with the bottom edge.
- **Android — gap between the bar and the bottom**: the pill now uses `bottom-[max(calc(env(safe-area-inset-bottom)+12px),24px)]`, guaranteeing at least a 24px gap on Android (where `safe-area-inset-bottom` is 0), so the bar is no longer flush against the screen bottom.
- **Gesture area blending**: the app background moved from `<main>` onto `<body>` (`be009d3`), so the area below the bar / around gestures blends seamlessly into the page background.

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
- [Platform UI notes (iOS vs Android)](#platform-ui-notes-ios-vs-android)
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

- **While the app/service worker is alive (any platform)**: exact-time delivery. Reminders fire at the precise second they're due via a local service-worker timer, instead of waiting for the server's ~1-minute dispatch cron.
- **Android (Chrome)**: after you close the app/tab, Chrome keeps the service worker (and its timers) alive in the background, so notifications still arrive near the exact second. If you **force-stop Chrome** (or battery optimization kills it — see Troubleshooting), delivery stops until you reopen the browser; when Chrome comes back, the server push delivers within ~1 minute.
- **iOS (Safari, 16.4+)**: you must **Add to Home Screen** first and open the app from there - regular Safari tabs cannot receive push. Once installed, grant notification permission from inside the app (Settings → Enable Notifications). When the app is closed, iOS suspends the service-worker timers, so delivery relies on the server push (~1 minute).
- **Windows/desktop**: works while Chrome is allowed to run in the background. Check Chrome's `chrome://settings/system` → **"Continue running background apps when Google Chrome is closed"** is on, otherwise a fully-quit browser can't receive push.

---

## Platform UI notes (iOS vs Android)

> Read this before touching the **bottom navigation bar** (`components/BottomNav.tsx`) or anything position/safe-area related. The layout is deliberately tuned so it looks correct on **both** a notched iPhone (installed PWA) and an Android phone — naive fixes tend to break one platform trying to fix the other.

### Top takeaways

1. **The bottom nav is a compact full-width grounded bar** (`components/BottomNav.tsx`): `fixed bottom-0`, solid `bg-card`, top border. **Do NOT add `env(safe-area-inset-bottom)` padding to the bar** — on iOS the layout viewport ends at the top of the home-indicator zone (782→812 on a real iPhone 17), so `env()` padding renders as empty space *inside* the bar.
2. **The "gap" under the bar is the clipped home-indicator zone, painted with the `html`/`body` background.** With the floating pill, `html`/`body` are `var(--background)` in `app/globals.css` — the same colour as `<main>` — so that strip (and, on Android, the strip behind the gesture bar) is indistinguishable from the page. (When the bar was a grounded full-width bar, this was `var(--card)` so the strip blended into the bar instead; a mismatch here shows up as a grey "chin" at the bottom.)
3. **Measured on a real iPhone 17: `innerHeight` (812) = `screen.height` (874) minus top inset (~28px) minus `env-bottom` (34px).** Content placed below `innerHeight` is clipped — negative offsets "cut off clean", JS offsets hid the whole bar once.
4. **Do NOT fix with device emulators.** Edge DevTools reported `env()=0` and `innerHeight==screen.height`, which contradicted the real device. Trust only installed-PWA measurements from a real phone.
5. **Test on BOTH platforms after any change.** Minimum matrix: a notched iPhone (X/11/12/13/14/15/16/17) opened as an **installed Home Screen app**, and an Android phone in Chrome.

### Adjusting the bar

All in `components/BottomNav.tsx` (mobile block):

- **Strip below the bar** → bridged by the `html`/`body` background in `globals.css`, which must equal the page background (`var(--background)`) — if a coloured band ever appears under the bar, that identity is what to change.
- **Page background** → `<main>` in `app/layout.tsx` carries `bg-background` + `min-h-[100dvh]` so the visible page keeps the app background color above the bar.
- **Icons clear of the bottom** → the inner `pt-1.5`/`pb-2` + button `h-11`.
- **Page content clearing the bar** → main's `pb-28` in `app/layout.tsx`.

### Background (so you don't undo it)

The bar was originally a floating capsule; attempts to change its iOS position all failed on a real iPhone 17: JS `screen.height − innerHeight` negative offset (nav vanished), Tailwind `bottom-[-env(...)]` (invalid CSS → nav jumped to top), inline `calc(-1 * env(...))` (bar clipped at the viewport edge), `env()`-as-bar-padding (dead space *inside* the bar). On-device diagnostics (real iPhone 17, installed PWA): `innerH=812`, `screenH=874`, `env-bottom=34px`. Conclusion: a capsule can never fill the home-indicator zone, and `env()` padding can't either — so we use a **full-width grounded bar + card-colored body background** so the clipped zone blends into the bar (2026-09-07, commits `fa78f77` → `f92381e`).

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
| `app/page.tsx` | Home screen. Redirects to `/onboarding` if the user hasn't seen it yet; otherwise lists active/completed reminders via a live Dexie query, filterable by kind, with a banner when notifications can't reach a closed app. |
| `app/create/page.tsx` | Create/edit reminder form - kind (Once/Repeat/Medical/Money, see `lib/domain/kind.ts`), title, description, medications editor, due-date presets, recurrence picker, auto-delete toggle. Opened as `/create?todo=<id>` from a to-do task, it prefills the title and links the task on save. |
| `app/todo/page.tsx` | To-do lists overview: create / edit / delete lists (title + description), progress per list, tap to open. |
| `app/todo/[id]/page.tsx` | One list's checklist (add, edit, toggle, delete), "Remind me" per task, "Share list" for its open tasks. |
| `app/vault/page.tsx` | Vault CRUD - People / Home & Vehicle / Property categories, search, no notifications ever. |
| `app/settings/page.tsx` | Notifications on/off switch (status always derived from a live subscription) + "Send test notification", auto-delete default toggle, dark mode, replay onboarding. |
| `app/onboarding/page.tsx` | Four-screen guided intro: what it is → how to create → how to share → get notified (`components/NotificationSetup.tsx`). Skippable; marks onboarding seen at the end. |
| `app/import/page.tsx` | Reads the share link's URL fragment, decodes a reminder or a to-do list, shows a preview, and imports on confirm. |
| `app/api/push/subscribe/route.ts` | Saves a device's push subscription (endpoint + keys) to the database. |
| `app/api/push/unsubscribe/route.ts` | Deletes a device's subscription and all its scheduled triggers. |
| `app/api/push/schedule/route.ts` | Upserts one scheduled trigger (reminder id, title, body, trigger time, recurrence) for a device. |
| `app/api/push/cancel/route.ts` | Deletes one scheduled trigger (reminder completed/deleted/dated cleared). |
| `app/api/push/dispatch/route.ts` | The cron target: finds due triggers, sends each push, reschedules recurring ones, and re-queues one-off send failures (bounded retries) so notifications aren't silently dropped. Requires `CRON_SECRET` - unset means dispatch refuses to run (503). GET is a no-op; only an authenticated POST dispatches. |
| `app/api/push/vapid-public-key/route.ts` | Returns the server's VAPID public key so the client can subscribe - see [why this isn't a build-time env var](#why-the-vapid-public-key-is-fetched-not-baked-in) below. |
| `app/api/push/test/route.ts` | Device-token protected. Sends one real push to the calling device so closed-app delivery can be proven end-to-end from Settings. |

### `components/`

| File | What it does |
| --- | --- |
| `components/ui/` | shadcn/base-ui primitives (button, card, input, switch, badge, …) - the current design system, replacing a previous standalone `Brutal.tsx` set. |
| `BottomNav.tsx` | The Home/Todo/Vault/Settings tab bar; hides itself on `/onboarding` and `/import`. |
| `PwaRegister.tsx` | Registers `/sw.js`, re-checks for a new worker whenever the app returns to the foreground (and hourly), and once a new worker takes control reloads — immediately in the background, otherwise via a "Refresh" toast plus an automatic reload on the next foreground. |
| `NotificationSetup.tsx` | The onboarding "Get notified" step: enable button with a visible loading state, the honest outcome, Skip. Also exports the shared status copy used by Settings and the Home banner. |
| `NotificationBanner.tsx` | Home-page `Alert` shown whenever reminders can't alert a closed app, linking to Settings. |
| `ReminderCard.tsx` | One reminder in the list: shows medications/amount depending on type, overdue highlighting (re-checked every 30s via a small `useNow` hook), complete checkbox, edit/share/delete actions. |
| `ShareDialog.tsx` | The share modal for reminders and to-do lists - "Send on WhatsApp" (`wa.me`), "Copy" (via `lib/clipboard.ts`), and "Other apps" (Web Share API when available). |

### `lib/domain/`

Pure logic with no browser/server dependencies - the equivalent of the original Kotlin app's `domain` package.

| File | What it does |
| --- | --- |
| `types.ts` | The data model: `Reminder`, `Medication`, `RecurrenceRule`, `VaultReference`, `TodoList`, `TodoItem`, `Preferences`. |
| `recurrence.ts` | `computeNextDue()` - given a last-due date and a recurrence rule, returns the next occurrence (daily/weekly/monthly/yearly/every-N-days). Used both client-side (when a reminder fires locally) and server-side (when the dispatch cron reschedules a recurring push). |
| `kind.ts` | `reminderKind()` derives Once / Repeat / Medical / Money from a reminder's `type` + `recurrence` (nothing is stored); `REMINDER_KINDS` carries the labels and one-line descriptions shown in the form and onboarding. |
| `share.ts` | `encodeShareFragment()` / `encodeTodoListFragment()` / `decodeSharedContent()` - base64url-encodes a reminder or a to-do list for the share link's URL fragment (`#...`), which the browser never sends to any server. List links carry `kind: "todo"`; reminder links predate that field and still decode. This is the fix for the original Android app's bug where share links only worked if the recipient already had the reminder in their own local database. |

### `lib/db/` - the IndexedDB layer (Dexie)

| File | What it does |
| --- | --- |
| `dexie.ts` | Defines the `RemindMeDB` class (five tables: `reminders`, `vaultReferences`, `todoLists`, `todos`, `preferences`), the v2 upgrade that moves pre-existing tasks into a "My tasks" list, and a `newId()` helper. |
| `reminders.ts` | `createReminder`, `updateReminder`, `deleteReminder` (unlinks any to-do that pointed at it), `setCompleted` (handles auto-delete-on-complete), `importReminder`, `retryPendingSchedules`. Every create/update also calls into `lib/push/client.ts` to keep the server-side schedule in sync. |
| `todos.ts` | Lists: `createTodoList`, `updateTodoList`, `deleteTodoList` (removes its tasks too). Tasks: `createTodo`, `updateTodo`, `deleteTodo`, `toggleTodo` (also completes/un-completes a linked reminder), `linkTodoToReminder`, `importTodoList` (a shared list becomes a new list). |
| `vault.ts` | `createVaultReference`, `updateVaultReference`, `deleteVaultReference`. |
| `preferences.ts` | A single "singleton" row holding `autoDeleteDefault`, `hasSeenOnboarding`, a randomly-generated `deviceId` (used to key push subscriptions/schedules server-side - there are no user accounts, so this anonymous per-browser id is how the server knows which subscription belongs to which set of scheduled reminders), and a server-issued `pushToken` that authorizes schedule/cancel requests. |

Pages read data reactively via `dexie-react-hooks`' `useLiveQuery` - the UI updates automatically whenever the underlying IndexedDB data changes, no manual refetching.

### `lib/push/` - the notification pipeline

| File | Runs where | What it does |
| --- | --- | --- |
| `client.ts` | Browser | `getNotificationReadiness()` (checks platform support / iOS install requirement / permission state), `requestNotificationPermissionAndSubscribe()` (the actual subscribe flow - also stores the server-issued `pushToken`), `hasActiveSubscription()` (double-checks a real subscription exists rather than trusting permission state alone), `syncReminderSchedule()` / `cancelReminderSchedule()` (called by `lib/db/reminders.ts` on every create/update/delete). Failed syncs mark the reminder `pushSyncPending`; `retryPendingSchedules()` re-drives them on app load, when connectivity returns, and after enabling notifications. `getVerifiedNotificationReadiness()` is what every status display uses ("ready" only with a live subscription); `disableNotifications()` unsubscribes server-then-browser and flags active reminders pending; `sendTestNotification()` calls `/api/push/test`. |
| `store.ts` | Server only (`import "server-only"`) | All database access for push delivery - `saveSubscription` (mints a per-device token), `deleteSubscription`, `getSubscription`, `verifyDevice`, `upsertTrigger`, `cancelTrigger`, `claimDueTriggers` (atomic claim, bounded by a per-run backlog cap). Lazily creates the libSQL client (see [below](#why-the-libsql-client-is-created-lazily)), auto-creates/migrates its tables on first use, and retries a failed init instead of bricking the process. |
| `send.ts` | Server only | Wraps the `web-push` library - configures VAPID details once, sends one push, and reports back whether the subscription is dead (404/410 from the push service) so the caller can clean it up. |

### `lib/api/withErrors.ts`

Wraps every push API route handler in a try/catch that logs server-side and returns a JSON error instead of letting an unhandled exception produce Next.js's default **empty 500 response with no body**. In development the full error message is returned (invaluable during setup); in production, 5xx responses are masked to `internal server error` so internal DB/path details never leak to clients. This one change is what turned "the deploy is broken, no idea why" into an immediately readable error message during setup.

### `lib/uuid.ts` and `lib/clipboard.ts`

Small platform-compatibility shims:
- `uuid()` falls back from `crypto.randomUUID()` (which only exists in secure contexts - HTTPS or `localhost`) to `crypto.getRandomValues()`-based generation, so the app still works when opened over a plain-HTTP LAN address during local device testing.
- `copyToClipboard()` falls back from `navigator.clipboard.writeText()` (same secure-context restriction) to the classic `document.execCommand('copy')` technique.

Neither matters once deployed (Vercel is always HTTPS), but both were needed to test on a phone over the local network during development.

### `public/`

- `sw.js` - the service worker, **generated** from `sw/sw.js` by `scripts/build-sw.mjs` with the build's commit SHA stamped in (gitignored; `npm run dev` and `npm run build` regenerate it). Caches the app shell for basic offline support, and (the actual point of all this) listens for `push` events to call `showNotification()` and `notificationclick` events to focus/open the app. This keeps running even when no tab is open. Edit `sw/sw.js`, never `public/sw.js`.
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
   curl -X POST http://localhost:3000/api/push/dispatch -H "Authorization: Bearer <CRON_SECRET>"
   ```
   Set `CRON_SECRET` in `.env.local` first — the endpoint refuses to run without it (returns `503`). In production this is called automatically every minute by cron-job.org (see below).
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
| `CRON_SECRET` | any random string, e.g. `openssl rand -base64 18` | **Required** — locks down `/api/push/dispatch`. Without it the endpoint refuses to dispatch (returns `503`). Give the same value to cron-job.org's `Authorization` header. |

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
| Notifications fire late / not at the set time | Server dispatch runs once per minute, and Android battery optimization (Doze) defers or batches push messages | The app now fires exact-time local notifications while awake (see changelog 2026-09-11); for the fully-killed case, set Chrome to **Battery → Unrestricted** and disable **Restrict background data**, and don't force-stop Chrome — swipe it away from Recents instead |
| No notification at all after force-stopping Chrome / the installed app | Force-stopping (or an aggressive OEM "clear all") blocks the OS push service until the browser is reopened; notifications never fire locally because the browser is dead | Open Chrome again once after force-stopping — if you're not seeing this in normal use, check the battery-optimization row above |
| `next build` fails with `LibsqlError: URL_INVALID: The URL '' is not in a valid format` | `DATABASE_URL` is set in Vercel but empty | Already fixed in code (lazy client + `\|\|` fallback) - if you see this again, check the env var actually has a value. |
| `/api/push/dispatch` (or any push route) returns a `500` with an **empty body** | An unhandled exception - no error detail without this | Already fixed (`lib/api/withErrors.ts` wraps every route). If you see an empty 500 again on a *new* route, it's not wrapped - apply the same pattern. |
| `/api/push/dispatch` returns a `500` with `{"error":"internal server error"}` (production) or the full `ConnectionFailed(...)` detail (development) | `DATABASE_URL`/`DATABASE_AUTH_TOKEN` (or the `DATABASE_TURSO_*` equivalents) aren't actually set for **Production** | Check Settings → Environment Variables → Production has real (non-empty) values, then redeploy. |
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
- **Share/import**: the reminder's (or to-do list's) data is embedded directly in the share link's URL fragment (base64url JSON after `#`), never sent to any server. This fixes a bug in the original Android app, where the share link only worked if the recipient happened to already have the reminder in their own local database.
- **Push**: `lib/push/client.ts` (subscribe/permission flow), `lib/push/store.ts` + `lib/push/send.ts` (server-only), `app/api/push/*`, `public/sw.js` (service worker: push + notificationclick handlers, plus basic offline app-shell caching).
- **UI**: brutalist look ported from the original app's Compose theme (`components/ui/` shadcn primitives, palette in `app/globals.css`), light/dark via `prefers-color-scheme`.

## Testing

```bash
npm run build   # type-checks + production build
npm run lint
npm run test    # unit tests (vitest) for domain logic and the API error boundary
```

## License

All rights reserved.

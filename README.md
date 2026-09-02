# RemindMe (PWA)

A local-first reminder app — installable on laptop, iOS, and Android from one codebase. No accounts, no cloud: reminders, medications, vault entries, and to-dos live entirely in your browser's storage (IndexedDB).

This is the PWA rewrite of the original native Android app (Kotlin/Compose, see the sibling `RemindMe` repo). Feature parity: time-based reminders with quick presets, medical entries with multiple medications, monthly bills with an amount, recurrence (daily/weekly/monthly/yearly/every N days), share-via-link import, a notification-free Vault (People / Home & Vehicle / Property), a to-do list, auto-delete on completion, and onboarding.

## Why there's a tiny backend

Everything you enter — reminders, medications, vault data, to-dos — is stored **only** in your browser (Dexie/IndexedDB). Nothing about that data ever leaves your device.

The one thing the browser genuinely cannot do on its own is **wake itself up after being killed** to show a notification — there's no web equivalent of Android's `AlarmManager`. The only mechanism that survives a fully-closed browser/app on both Android and iOS (16.4+, home-screen-installed) is **Web Push**, and Web Push requires a server to hold your push subscription and fire the push at the right time.

So there's a minimal Next.js API + database that stores **only**: your push subscription, and for each upcoming reminder, its title/body text and trigger time. That's it — no medications, no vault content, no to-dos ever touch the server.

## Notifications: what to expect per platform

- **Android (Chrome)**: works after closing the app/tab; the browser's push service wakes the service worker in the background.
- **iOS (Safari, 16.4+)**: you must **Add to Home Screen** first and open the app from there — regular Safari tabs cannot receive push. Once installed, grant notification permission from inside the app (Settings → Enable Notifications).
- **Desktop**: works while the browser is installed/running in the background (most browsers keep a lightweight push listener alive even with the window closed, depending on OS-level background app permissions).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in VAPID keys — see below
npm run dev
```

Open http://localhost:3000.

### Generate VAPID keys (one-time, for push)

```bash
npx web-push generate-vapid-keys
```

Put the values in `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

### Local push-scheduling database

By default `DATABASE_URL` is unset and falls back to a local SQLite file (`local.db`, gitignored) via `@libsql/client` — no external account needed for development. It stores only push subscriptions and scheduled trigger times (see above).

### Manually testing "fires after the app is killed"

1. `npm run dev`, open the app, complete onboarding (grants notification permission + subscribes).
2. Create a reminder due ~1 minute out.
3. Close the tab (or, on a real device, kill the app entirely).
4. Trigger a dispatch cycle by calling the endpoint yourself:
   ```bash
   curl -X POST http://localhost:3000/api/push/dispatch
   ```
   In production this is called on a schedule by an external pinger (see Deploying below).
5. You should get a real system notification; tapping it opens the app to that reminder.

## Deploying

This app runs anywhere Node.js/Next.js runs. For Vercel specifically:

1. `vercel link` / import the repo in the Vercel dashboard.
2. Set the environment variables from `.env.example` in the Vercel project settings (production VAPID keys — reuse the local dev ones, or generate new ones), including a `CRON_SECRET` (any random string) to lock down the dispatch endpoint.
3. Provision a persistent database for push scheduling — `local.db` will **not** persist on Vercel's serverless filesystem. Easiest option: [Turso](https://turso.tech) (libSQL-hosted, same client library — just set `DATABASE_URL`/`DATABASE_AUTH_TOKEN`, no code changes), or any other libSQL-compatible host.
4. Deploy.
5. **Scheduling the dispatch call.** Vercel's Hobby plan only allows daily cron jobs, which defeats the purpose of timely reminders. This app relies on an external service to call `POST /api/push/dispatch` on a schedule instead — [cron-job.org](https://cron-job.org) (free) works well:
   - Sign up, create a new cron job.
   - URL: `https://<your-deployed-domain>/api/push/dispatch`
   - Method: `POST`
   - Schedule: every 1 minute
   - Add a custom header: `Authorization: Bearer <CRON_SECRET>` (the same value you set in Vercel's env vars)

   Alternatively, upgrade to Vercel Pro and add a `crons` block to a `vercel.json` for a fully native solution.

## Architecture

- **Storage**: Dexie (IndexedDB) — `lib/db/*`. Source of truth for all personal data, offline-capable.
- **Domain logic**: `lib/domain/*` — recurrence math, share-link encode/decode.
- **Share/import**: the reminder's data is embedded directly in the share link's URL fragment (base64url JSON after `#`), never sent to any server — `lib/domain/share.ts`, `app/import/page.tsx`. This fixes a bug in the original Android app, where the share link only worked if the recipient happened to already have the reminder in their own local database.
- **Push**: `lib/push/client.ts` (subscribe/permission flow), `lib/push/store.ts` + `lib/push/send.ts` (server-only), `app/api/push/*` (subscribe/unsubscribe/schedule/cancel/dispatch), `public/sw.js` (service worker: push + notificationclick handlers, plus basic offline app-shell caching).
- **UI**: brutalist look ported from the original app's Compose theme (`components/Brutal.tsx`, palette in `app/globals.css`), light/dark via `prefers-color-scheme`.

## Testing

```bash
npm run build   # type-checks + production build
npm run lint
```

## License

All rights reserved.

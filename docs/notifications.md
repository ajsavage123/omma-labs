# Notification System — Architecture & Developer Guide

## Overview

The notification system delivers alerts to workspace members through two complementary channels:

1. **In-App (Real-time)** — Supabase Realtime `postgres_changes` subscriptions push events to connected browser tabs. Displayed as in-app toasts and listed in the `NotificationCenterWidget`.
2. **Web Push (Background)** — Supabase Edge Function `send-push` sends Web Push notifications via VAPID to subscribed browsers even when the app is closed. Delivered through the service worker (`sw-notifications.js`).

---

## Architecture Diagram

```
Supabase DB change (INSERT / UPDATE)
         │
         ▼
 Postgres Trigger / Edge Function
         │
    ┌────┴────────────────────────────┐
    │                                 │
    ▼                                 ▼
Supabase Realtime              send-push Edge Function
(postgres_changes)              (VAPID / Web Push API)
         │                                 │
         ▼                                 ▼
GlobalNotificationManager       Browser Push Subscription
  workspaceNotificationService       │
  (dedup, debounce, dispatch)        ▼
         │                      sw-notifications.js
         ▼                      (background notification)
   workspace-notification-received
   (CustomEvent on window)
         │
    ┌────┴───────────────────┐
    │                        │
    ▼                        ▼
NotificationCenterWidget  GlobalNotificationManager
(bell badge + list)       (throttled toast)
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/utils/notificationService.ts` | Low-level: permission check, Web Audio chime, `showNotification()` |
| `src/utils/notificationPermissions.ts` | Centralized permission management — `requestOnce()` |
| `src/services/workspaceNotificationService.ts` | Business logic: dedup (sessionStorage), debounce, formatPayload |
| `src/services/pushNotificationService.ts` | Web Push subscribe/unsubscribe with VAPID key validation |
| `src/services/errorLogger.ts` | Centralized error logger (dev: console groups, prod: Sentry-ready) |
| `src/components/NotificationCenterWidget.tsx` | Bell button + notification dropdown (ARIA-accessible) |
| `src/components/GlobalNotificationManager.tsx` | Supabase Realtime subscriptions + throttled toasts |
| `public/sw-notifications.js` | Service worker: handles `push` and `notificationclick` events |
| `supabase/functions/send-push/index.ts` | Edge Function: sends Web Push via web-push library |

---

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_VAPID_PUBLIC_KEY` | ✅ Yes | Base64-URL encoded VAPID public key (P-256, 65 bytes decoded) |
| `VAPID_PRIVATE_KEY` | ✅ Yes (Edge Function) | VAPID private key — **never expose to client** |
| `VAPID_SUBJECT` | ✅ Yes (Edge Function) | `mailto:` or URL identifying the push server |
| `VITE_SENTRY_DSN` | ❌ Optional | Sentry DSN for production error reporting |

### Generating VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the public key to `.env` as `VITE_VAPID_PUBLIC_KEY` and the private key to Supabase Edge Function secrets.

---

## Service Worker Registration

`main.tsx` handles registration:

- **Development**: registers `/sw-notifications.js` directly via `navigator.serviceWorker.register`.
- **Production**: uses `vite-plugin-pwa`'s `registerSW()` which registers the Workbox-generated service worker. `sw-notifications.js` must still be in `/public` and is imported in the Workbox SW.

To verify registration, open Chrome DevTools → **Application** → **Service Workers**.

---

## Permission Flow

Notification permission is **never auto-requested on page load**. Instead:

1. The user clicks **"Enable Push"** in the `NotificationCenterWidget` header.
2. `pushNotificationService.subscribeToPushNotifications()` is called.
3. The browser's native permission prompt appears.
4. On grant, the push subscription is saved to `user_push_subscriptions` in Supabase.

The `notificationPermissions.requestOnce()` helper enforces a single-prompt-per-session guard to prevent repeated prompts if the component re-mounts.

---

## Deduplication

- Notification IDs are stored in a `Set` persisted to `sessionStorage` under the key `ws_notif_recent_ids`.
- The set is capped at 100 entries (oldest 50 are pruned when exceeded).
- `clearNotificationDedup()` is exported from `workspaceNotificationService` — **call it on logout** to reset state.
- An additional fingerprint check (`title || body`) suppresses exact-duplicate payloads from batch DB updates.

---

## Toast Throttling

`GlobalNotificationManager` enforces:
- **Max 3 toasts per 5-second window.**
- Identical messages (same title + body) are grouped into one toast with a `(×N)` counter.

---

## Database Schema Notes

### `user_push_subscriptions`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK to `auth.users` |
| `endpoint` | text | Push endpoint URL |
| `p256dh_key` | text | Public key for encryption |
| `auth_key` | text | Auth secret |

- **Unique constraint**: `(user_id, endpoint)` — prevents duplicates.
- **RLS policies**: users can only read/write their own rows (migration: `20240804_user_push_subscriptions_unique_rls.sql`).

---

## Testing

### Unit Tests
```bash
npm test
```
- `tests/unit/vapidKey.test.ts` — verifies `urlBase64ToUint8Array` decodes to 65 bytes.

### Manual Checklist
- [ ] Click "Enable Push" → browser permission dialog appears.
- [ ] Permission granted → no second prompt on same session reload.
- [ ] Trigger a Supabase INSERT on `notifications` → bell badge increments.
- [ ] Rapid chat messages → toasts are grouped, not flooding the screen.
- [ ] Open DevTools → Application → Service Workers → verify SW is registered.
- [ ] Tab away from app → send push via Supabase → background notification appears.
- [ ] On Safari / Firefox without PushManager → "Enable Push" button is hidden.
- [ ] Press Escape → notification panel closes.
- [ ] Tab through notification items → each item is keyboard-focusable with Enter click.

---

## Deployment Checklist

1. Set `VITE_VAPID_PUBLIC_KEY` in `.env.production`.
2. Set `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in Supabase Edge Function secrets.
3. Run the migration `20240804_user_push_subscriptions_unique_rls.sql` in Supabase SQL editor.
4. Deploy Edge Function: `supabase functions deploy send-push`.
5. Ensure `public/sw-notifications.js` is included in the Vite build output.
6. Verify RLS is enabled on `user_push_subscriptions` in the Supabase dashboard.

# New: background PC receiver

See `PC-RECEIVER-SETUP.md` for the central-server migration, Windows receiver setup, builds and validation limits.

# Voice, microphone announcements, and templates — 28 October 2026

Update BOTH app folders and copy all supplied `pb_migrations` files into your existing installation. Keep your existing `pb_data` and environment settings. Stop PocketBase, run `pocketbase.exe migrate up`, then restart it with `pocketbase.exe serve --http=0.0.0.0:8090`. The new migration is `1793235600_announcements.js`; it adds optional announcement/audio/signaling fields and preserves collection permissions.

Run `npm ci` in each app folder before `npm run dev` (this also installs the missing local Vite executable). Refresh every display after updating.

## New controls

- Predefined spoken alerts include the alert type and targeted location(s), or all locations. English voice is the default; Siren Only remains available.
- Download template buttons beside the bulk upload controls generate Excel workbooks with upload headers and a separate Instructions sheet.
- Online display cards are soft green; offline cards are soft red.
- Step 3 → Custom announcement → Record and broadcast: request microphone access, record, stop, preview, then broadcast. Maximum recording is 5 minutes / 20 MB. Repeat interval is the gap AFTER each playback; 0 means once. Presets: once, 1, 10, 20, 30 minutes. Total duration supports 10/20/30, custom minutes, or infinity. A once-only recording ends after playback.
- Step 3 → Custom announcement → Live announcement: starts a microphone stream to selected displays, shows actual connection count, and has Stop live announcement. Keep the controller page open. Total duration also limits live sessions. Players stop a stale live stream within approximately 20–23 seconds if the controller closes or loses contact.

## Microphone and speaker setup

Use `http://localhost:3000` on the admin PC for the microphone, or serve the admin over HTTPS with a trusted certificate. Browsers block microphone access from plain HTTP LAN addresses such as `http://192.168.0.238:3000`. Allow microphone permission in the browser and select the intended input in browser/system settings. For HTTPS deployments, PocketBase must also be reachable through HTTPS to avoid mixed-content blocking.

The display needs working speakers. If autoplay is blocked, click Enable audio on that display. Test playback volume before operational use. Recordings play without a siren.

Live audio uses one WebRTC connection per target display with PocketBase signaling. This version is designed for devices on a reachable LAN; no external STUN/TURN relay is configured. Wi-Fi client isolation, firewall rules, or separate networks can prevent peer connections even if PocketBase is reachable. The connection counter exposes this. Large display groups require sufficient admin CPU and bandwidth. Refreshing the admin ends its live microphone session; clear the saved session before starting another.

Recorded audio is stored on the targeted display records and removed when the announcement is cleared/expired. Existing PocketBase file and record access policies still apply.

## Verification for this update

Both production builds pass. Browser checks cover spoken type/location, templates and exact spreadsheet headers, soft status cards, phone layout, recording preview/upload, recorded player without a siren, duration expiry, and live signaling/Stop using simulated peers. The recording-upload check uses a simulated recorder. Real WebRTC microphone capture produced an offer but this test environment supplied no ICE network candidates; actual live audio delivery and speaker playback are therefore NOT verified here. No changes have been applied to your live database. Test one updated screen on your LAN after migrating, including Record → preview → broadcast, Live → connected count → speak → Stop, and expiry.


# Birthday layout and timed-alert update — 28 October 2026

This update includes the earlier sidebar/monitor redesign plus:
- Balanced birthday photo/text layout, smaller readable role text, and subdued confetti behind the content.
- Move dropdown listing registered display names and locations (selecting one moves the current display to that location).
- Broadcast duration: 10, 20, 30 minutes, custom whole minutes (1–1440), or infinity/until cleared. Default: 10 minutes.
- Timed alerts expire on updated players even if the admin browser is closed. The database is cleared when reachable; disconnected screens clear locally and retry synchronization on their heartbeat. The devices' clocks must be correct.
- Voice plays without the siren underneath. After speech: 2 seconds quiet, a 2-second siren burst at 25% volume, then 8 seconds quiet before the next message. Siren-only mode uses 2-second bursts with 8-second gaps.

Apply BOTH new migrations if you have not applied the previous update. If that update is already installed, add `pb_migrations/1793232000_alert_expiry.js`, update both app folders, then stop PocketBase and run `pocketbase.exe migrate up` from your existing project root. Restart PocketBase and both apps; refresh every display. Do not replace your existing `pb_data` folder.

The new migration adds `current_alert_expires` and `current_alert_id`. Install it before using timed alerts. Infinity alerts retain manual Clear controls. Older players must be updated for reliable automatic expiry and audio behavior.

Real speaker volume, browser speech voices, and autoplay permission still need checking on your physical display. These cannot be judged from a headless browser.

---

# Signage UI update

## Apply to your existing installation

1. Stop the admin/display development servers and PocketBase.
2. Extract this archive. Copy its `admin-panel` and `display-window` source files over the corresponding folders in your existing project. Copy `pb_migrations/1793142000_display_playback_metadata.js` into your existing `pb_migrations` folder.
3. Keep your existing `pb_data` folder, PocketBase executable, and local environment settings. Do not delete or replace the database. This archive contains no database.
4. From your existing project root, run:

```cmd
pocketbase.exe migrate up
pocketbase.exe serve --http=0.0.0.0:8090
```

The migration adds optional `current_duration` and `current_scope` fields to displays. It does not delete records or change collection permissions.

5. In a separate terminal:

```cmd
cd admin-panel
npm ci
npm run dev
```

6. In another terminal:

```cmd
cd display-window
npm ci
npm run dev
```

7. Refresh the admin and every display browser. In display setup, use `http://192.168.0.238:8090` as the backend, not port 3000. Admin remains at port 3000; display remains at port 5173 (check the terminal).

Admin now defaults to the hostname in its browser URL plus port 8090. To use a different backend, set `VITE_POCKETBASE_URL` in `admin-panel/.env.local` and restart the admin server. The emergency iframe uses the same address. The old `VITE_PB_URL` variable was not used by the supplied source and remains unused.

## Changes

- Toggle navigation with the hamburger button. Desktop content expands when navigation is hidden; phones use an overlay sidebar.
- Removed Live Playlist from navigation.
- Compact display cards replace the wide table. Duration reports image/birthday seconds and PDF seconds per page. Videos show “Full video”; alerts show “Until cleared”. This is playback duration, not uptime or an elapsed countdown.
- Playback target reports Global or the configured location, as reported by the updated player. Old players show “Not reported” until updated.
- Actions dropdown: Refresh, Move, Alert, Remove, plus Clear alert when relevant. Move, Alert and Remove use dialogs.
- Player honors global/location content filtering and location moves, including moves made while it was offline.
- Compact responsive forms, event log, About page, entry screen, and emergency controls.
- Emergency location cards support one or multiple locations, with an exclusive Global option and Next button. Selecting a location targets all registered displays at that location.
- Delivery failures are reported. Clear targets the successful recipients, including after controller-page reload. Older saved alerts without recipient IDs must be cleared from Display Monitor.
- Fixed the display project's existing Vite/legacy-plugin version mismatch.

## Validation

- Admin production build: passed.
- Display production build: passed (existing bundle-size and browsers-data warnings remain).
- Chromium checks with simulated backend responses: sidebar toggle; removed playlist navigation; Move submission; no horizontal page overflow at 1440, 768 and 390 px for monitor/forms/location picker; mobile Event Log and About; multiple selection waits for Next; global exclusivity; disabled Next with no targets; single/multiple delivery; targeted clear after reload. No JavaScript page errors in these checks.
- This was not connected to your live PocketBase database or physical screens. Apply the migration and verify one display end to end on your LAN before using the updated emergency controls operationally.

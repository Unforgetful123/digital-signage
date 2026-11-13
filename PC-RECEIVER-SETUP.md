# VRL PC Receiver — setup and verification

This adds a separate background Windows app. Ordinary PCs do not need a browser, Node.js, signage playlist, or their own PocketBase server. Keep your existing admin server and database.

## 1. Update the central server once

Back up your existing `pb_data` before applying a schema migration. Copy `pb_migrations/1793872800_pc_receiver.js` into the server's existing `pb_migrations` folder. Keep all previous migrations.

Stop PocketBase, then run from that existing server folder:

```powershell
.\pocketbase.exe migrate up
.\pocketbase.exe serve --http=0.0.0.0:8090
```

The new migration only adds optional `device_role` (`display` or `pc_receiver`) to `displays`. Existing records remain signage displays. It does not change collection permissions or delete data. This release assumes the earlier announcements/expiry migrations supplied in this project are installed.

Update these admin files from this source package:

- `admin-panel/src/components/DisplayMonitor.jsx`
- `admin-panel/src/components/DisplayMonitor.css` (unchanged unless you have edited it locally; no replacement required for this feature)

Restart your development admin app, or rebuild it with `npm run build` for a production deployment. The monitor now labels PCs and has an All devices / Signage displays / PC receivers filter. Existing location and Global broadcasts target both types. Direct monitor alerts get unique broadcast IDs.

## 2. Run the ready-built Windows receiver on each PC

Download `VRL-PC-Receiver-1.0.0-Windows-x64.zip` and extract its ENTIRE contents into a permanent folder, for example:

```text
C:\Users\YOURNAME\AppData\Local\VRLogical\PCReceiver
```

Run `VRL PC Receiver.exe` from inside that folder. Do not run it inside the ZIP, copy only the EXE, or move the folder after enabling startup. The surrounding files are required. This is an unsigned Windows x64 portable build, not a Setup installer; it has not been executed on Windows here.

On first launch enter:

- Central server: `http://192.168.0.104:8090` (replace with the actual current PocketBase IP).
- PC name: a recognizable name such as `Reception-PC-01`.
- Location: EXACTLY match the location used in your admin panel, such as `Reception`.

Click **Activate receiver**. The window hides to the system tray. Startup at Windows sign-in is enabled by default after registration; change it in the tray menu or receiver status page. Startup uses the current user's account; each user session has its own receiver identity.

No microphone permission is needed on receiving PCs. Automatic audio is enabled in this Electron app. Keep speakers connected and Windows volume/output configured correctly.

## 3. Send a test broadcast

In the admin monitor confirm the PC appears as **PC Receiver** and Online. Open Emergency Operations, choose an alert, select its location, and Broadcast. A large alert window appears above normal applications and speaks the type/location/message, followed by short siren bursts. Siren-only uses the selected voice setting.

For recorded or live announcements, the receiver opens a smaller announcement window. The broadcaster still needs microphone access on localhost/HTTPS. Live audio uses LAN WebRTC connections with no TURN relay; client isolation/firewall restrictions can prevent audio even when API requests work.

Clear/Stop the broadcast from the admin panel or let it expire. The popup returns to the background. Closing the popup or clicking **Hide window** hides it but keeps the audio and listener running. Use **Quit receiver** from the tray to stop the application entirely.

## 4. How reconnection behaves

The app subscribes to its own display record and also polls every 3 seconds. It sends a heartbeat every 15 seconds. API requests have an 8-second timeout. On reconnection or resume, it re-reads that record and displays any active, unexpired broadcast. A registered PC offline when the admin sends a broadcast can receive it on reconnection if the record still contains that broadcast; PCs registered afterward do not inherit historical broadcasts.

Finite alerts expire locally even without the server. Infinite emergency alerts remain active until the clear command is received. Live sessions stop locally after a stale broadcaster heartbeat (approximately 25 seconds). Once-only recordings close when playback ends, and are suppressed for that session; restarting the receiver can replay them if the server still holds the same active broadcast. The admin's Clear button clears the broadcast record.

Removing a PC in Display Monitor stops reception and opens its registration screen. Registration is not silently recreated. Use Connection settings to update an existing receiver's server IP/name/location; server changes must point to the same database containing its ID. Moving a PC through the admin monitor updates its location automatically.

## 5. Build an installer on a Windows development PC (optional)

Install Node.js, then run from this source project's root:

```powershell
cd display-window
npm ci
cd ..\pc-receiver
npm ci
npm test
npm run build:win
```

The NSIS installer will be in `pc-receiver\release`. This uses the project's Electron 32.0.1 runtime. It builds locally and does not publish to GitHub. No database or server executable is bundled with the receiver.

For development after building the UI:

```powershell
npm run build:ui
npm start
```

Startup registration is available only in packaged Windows builds. The receiver uses a sandboxed renderer, context isolation, no renderer Node integration, and narrow sender-validated IPC. External navigation and new windows are blocked.

## Verification and remaining checks

Passed here:

- Node lifecycle tests for expiry, malformed expiry, stale live sessions, heartbeat deduplication, replacement alerts, completion suppression, IPC sender checks, and native-window decisions using mocked Electron APIs.
- Browser integration against a mock backend: registration, device type, automatic HTML audio playback, targeted alert/location, local expiry while disconnected, recorded playback/end, live offer/answer signaling using simulated peers, clear, reconnect, identity after refresh, responsive layout, and removed registration.
- Admin browser test: location targets include the matching PC and TV; Global includes all registered devices.
- Admin and display/receiver production builds; Windows portable package construction and archive integrity.

Not verified here: execution of the Windows EXE, real system tray and sign-in startup behavior, actual speaker output, Windows focus restrictions, or live WebRTC audio across physical PCs. Test on one PC before wider rollout: register → sign out/in → broadcast while using another app → listen → clear → disconnect/reconnect network → expiry → live speak/Stop. Keep Windows awake and the user signed in. This app cannot display over the Windows lock screen/UAC secure desktop or wake a powered-off PC.

The NSIS build could not finish in this Linux environment because Wine is unavailable. The failed installer is not included. Use the portable Windows package, or build the installer on Windows with the command above.

# Salah Tracker — Privacy Policy (draft, WO-13)

_This is a draft for the store listing (spec §10.2). It must be hosted at a
public URL before release. Nothing here is a claim about a build that has
not been tested — the OS-backup restore claim in particular must be verified
on a test device before release._

## What Salah Tracker does

Salah Tracker is a prayer tracker. When a prayer window ends, the app asks
"did you pray?" A miss becomes a dated qaza you can settle later. That is
the whole loop.

## Data stays on your device

- All data stays on the device. There is no account and no server.
- There is no analytics SDK and no crash-reporting SDK. The app sends no
  data anywhere.
- Location is used on the device only, to calculate prayer times. It is
  never sent anywhere by the app. No background location is ever collected.
- Backup files are created only when you export them (Settings → Export
  backup). The file contains your prayer log, your prayer events and your
  settings, and nothing else. It is yours to keep, share or delete.
- The opt-in pilot report (Settings → Send pilot report) shares only
  counts: app version, days active, average prayers answered per day, qaza
  created per week and qaza settled per week. It contains no dates of
  individual prayers, no location and no identifiers. You see the exact
  report before anything is shared, and sharing goes through the operating
  system's share sheet only.

## Operating-system backups

The operating system may include app data in its own backup (Android Auto
Backup, iCloud device backup) according to your device settings. Verify
restore on a test device before claiming it.

## Permissions

| Permission | Why |
|---|---|
| Notifications | The check-in question after each prayer window ends. Android 13+ asks at runtime; iOS asks in onboarding. |
| Location, while in use | Prayer times, calculated on the device. Coarse location is enough. No background location, ever. |

## Deleting your data

Settings → Delete all data removes every prayer log and event from the
device. Uninstalling the app also removes its data, subject to the
operating system's own backup behaviour above.

## Attribution

City list from GeoNames, license CC BY 4.0.

## Contact

_Contact address to be added by the product owner before release._

# Release checklist (WO-13)

Copied from spec §13, with owners and status. Nothing here is done until
Gate G4 passes.

- [ ] Application id (Android) and bundle id (iOS) decided before the
      first EAS build. They cannot change after publishing (O-5).
      Owner: product owner. Status: **open** — placeholder
      `com.example.salahtracker` (TODO(O-5)) is still in `app.json`.
- [ ] App icon and splash (open item in DESIGN.md).
      Owner: designer. Status: **open** — the repo ships stock Expo
      placeholder icons in `packages/mobile/assets/`.
- [ ] Privacy policy hosted at a public URL, matching spec §10.2.
      Owner: product owner. Status: **draft written**
      (`docs/privacy-policy.md`); not hosted.
- [ ] Store data-safety form: no data collected, location processed on
      device only. Status: **draft written** (`docs/store-listing.md`).
- [ ] Permission explanations written for both stores.
      Status: **draft written** (`docs/store-listing.md`).
- [ ] Target API level meets the current Play requirement. Check at
      release time. Status: **open**.
- [ ] Check the Play Console rules for new developer accounts
      (closed-testing tester count and duration) and plan the account
      type early (O-6). Status: **open**.
- [ ] Signed release build through EAS, tested from the store track,
      not a debug build. Status: **open**.
- [ ] Soak test table attached to the release notes.
      Status: **open** — the 24-hour soak (spec §11.3) has not been run.
- [ ] Store listing text and screenshots (English first).
      Status: **listing drafted** (`docs/store-listing.md`); screenshots
      not taken (need the reference phone).
- [ ] iOS: Apple Developer Program enrollment, Info.plist strings,
      TestFlight build. Status: **open** (iOS after milestone M5).

## Gates still outstanding

- **Gate G1 (human):** S1 spike results in `docs/S1-RESULTS.md`. Not run.
  WO-10 step 2 is not built until G1 passes.
- **Gate G3 (human):** dev build on three phones, M-04 and M-10 confirmed
  in `STATUS.md`. Not run.
- **Gate G4 (human):** 24-hour soak table, official timetable comparison
  (O-1, Islamic Foundation Bangladesh), application ids, icon, review of
  the English strings. Not run. Only then build a release candidate.

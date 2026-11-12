# Spike S1 — Notification delivery test protocol

**Status: implemented, not device-verified.** The harness is the dev screen
`app/dev/s1.tsx` (WO-10 step 1 only). A human must run this on real phones;
do not record a pass without that evidence. Stop at Gate G1 after this step.

## Devices

| # | Device | OS / skin |
|---|--------|-----------|
| 1 | Pixel (stock Android) | Baseline |
| 2 | Samsung (One UI) | Common, aggressive battery modes |
| 3 | Xiaomi / Redmi (HyperOS or MIUI) | Most aggressive background limits |

## Steps

1. Install the development build on the phone (EAS dev build, not Expo Go).
2. Open the S1 screen (dev route `dev/s1`), tap **Schedule 10 check-ins**.
   Ten real check-in notifications are scheduled, one per minute, with the
   real category `PRAYER_CHECKIN` (actions **Prayed** / **Not prayed**,
   `opensAppToForeground: false`).
3. Turn battery saver **on**, turn the screen **off**, leave the phone alone
   for **3 hours**. Do not open the app.
4. Record the actual delivery time of each of the 10 notifications against
   its planned time in the table below.
5. Tap **Prayed** on a notification with the app swiped away; open the app
   and check the answer was stored. Repeat for 20 attempts across the three
   devices (the harness itself writes nothing — counting needs the real
   handler from WO-10 step 2, so record attempts by opening the app after
   each tap and noting whether Today shows the prayer answered).
6. Reboot the phone. Check the S1 log: scheduled notifications survive the
   reboot (re-open the S1 screen and tap **Refresh log**).

## Results table

| Device | #1 | #2 | #3 | #4 | #5 | #6 | #7 | #8 | #9 | #10 | Reboot survives? |
|--------|----|----|----|----|----|----|----|----|----|-----|------------------|
| Pixel | | | | | | | | | | | |
| Samsung | | | | | | | | | | | |
| Xiaomi | | | | | | | | | | | |

(Write the actual delivery time, or the delay in minutes, in each cell.)

## Pass criteria (spec §6.8)

1. **Timing:** every notification appears within ±2 minutes of its planned time.
2. **Actions:** tapping **Prayed** with the app swiped away writes the answer
   in at least 19 of 20 attempts (check by opening the app).
3. **Reboot:** scheduled notifications survive a reboot.

| Criterion | Result (pass / fail) | Notes |
|-----------|----------------------|-------|
| 1. Timing ±2 min | | |
| 2. Prayed writes ≥19/20 | | Attempts passed: __ / 20 |
| 3. Survives reboot | | |

## Fallbacks if criterion 2 fails (in order)

(a) Set `opensAppToForeground: true` so the tap opens a one-tap confirmation
screen that applies the answer.
(b) Write a small native action receiver for the stuck platform.

Record the outcome in `docs/S1-RESULTS.md` and update the spec before
milestone M2. Do not build the rest of WO-10 on assumptions.

# Salah Tracker — Design System v1.0

Use this file instead of re-describing the design in every outline or prompt. Say "follow DESIGN.md" and use `tokens.css` (web) or `tokens.ts` (mobile). Do not invent colors, sizes or status styles outside this file.

Visual reference with live specimens: the published reference page.

---

## 1. Principles

1. **One loop.** Every screen serves: window closes, app asks, a miss becomes a dated qaza, the user settles it. If a UI element does not help this loop, it is secondary.
2. **Never punish.** Qaza is amber, not red. Copy is encouraging. Red is only for destructive actions and system errors.
3. **Status is never color alone.** Every status shows icon + label + color.
4. **Calm and quick.** One hero action per screen. Few colors per screen. Fast taps.
5. **Local-first honesty.** The UI always says where the data lives and whether sync is on, failed, or off. Sync problems are a warning, never a blocker.

## 2. Color

Canonical palette: emerald (from the v4 mockups). Every color has one meaning.

| Token | Light | Dark | Use |
|---|---|---|---|
| `pri` | #166534 | #4ADE80 | Primary actions, current prayer, active tab, links |
| `priH` | #14532D | #22C55E | Primary pressed/hover |
| `priL` | #DCFCE7 | #052E16 | Primary tint backgrounds |
| `onPri` | #FFFFFF | #052E16 | Text/icons placed on `pri` |
| `heroFrom` / `heroTo` | #166534 / #14532D | #166534 / #0F3D22 | Today hero gradient, text is `onHero` |
| `recFrom` / `recTo` | #3F6212 / #365314 | #3F6212 / #1A2E05 | Recovery hero gradient, text is `onRec` (#FFFFFF / #F7FEE7) |
| `suc` `sucL` `sucT` | #22C55E #DCFCE7 #166534 | #4ADE80 #052E16 #4ADE80 | On time |
| `war` `warL` `warT` | #CA8A04 #FEF3C7 #854D0E | #FBBF24 #422006 #FBBF24 | Qaza, sync warning |
| `inf` `infL` `infT` | #4F46E5 #E0E7FF #3730A3 | #A5B4FC #1E1B4B #A5B4FC | Settled |
| `acc` `accL` `accT` | #65A30D #ECFCCB #3F6212 | #A3E635 #1A2E05 #A3E635 | Recovery hero, milestones |
| `err` `errL` `errT` | #DC2626 #FEE2E2 #991B1B | #F87171 #450A0A #F87171 | Destructive, errors only |
| `bg` `srf` `srf2` | #F7F9F4 #FCFDFB #EEF1EA | #0D1512 #16211B #121A16 | Page, card, inset |
| `bd` `bd2` | #E5E7EB #D1D5DB | #2A3A30 #3D4F43 | Hairline, stronger border |
| `t1` `t2` `t3` | #1F2937 #4B5563 #6B7280 | #F8FAFC #B6C2CE #8A99A8 | Primary, secondary, tertiary text |

**Three-part status rule.** Base color (`suc`, `war`...) is for dots, bars, fills. `*L` is the tint background. `*T` is the only color allowed for text or icons placed on a tint. Never put base `suc`/`war`/`acc` text on a tint: it fails contrast (2.1 to 2.9). This was a bug in v2 and v4.

**`t3` is for hints and disabled text only**, never for anything the user must read to act.

Heatmap: `h0` (none) to `h4` (all five on time), one hue, brighter means better in dark mode.

## 3. Status language (the core of the app)

| Status | Fill | Tint | Text | Icon | Label EN | Label BN |
|---|---|---|---|---|---|---|
| pending | `t3` | `srf2` | `t2` | circle | Pending | বাকি |
| current | `pri` | `priL` | `pri` | dot | Now | এখন |
| on_time | `suc` | `sucL` | `sucT` | check | On time | সময়মতো |
| qaza | `war` | `warL` | `warT` | alert | Qaza | কাজা |
| settled | `inf` | `infL` | `infT` | undo (↺) | Settled | আদায় হয়েছে |

Calendar day dots add a **shape** so they work without color: all on time = filled dot (`suc`), some qaza = hollow ring (`war`), no data = small neutral dot (`bd2`), today = `pri` outline on the cell.

The mapping lives in one function (`statusStyle` in `tokens.ts`). No screen defines its own status colors.

## 4. Typography

Fonts: **Inter** (UI), **Noto Sans Bengali** (any Bengali text), **Noto Naskh Arabic** (dua text).

| Role | Size / weight | Use |
|---|---|---|
| display | 32 / 800 | Hero prayer name, one per screen |
| titleL | 24 / 700 | Big stat values |
| title | 20 / 700 | Screen titles |
| heading | 16 / 700 | Card titles, sheet titles |
| body | 14 / 500 | Default text, list rows |
| label | 13 / 600 | Buttons, form labels, row titles |
| caption | 12 / 500 | Secondary text, timestamps |
| micro | 11 / 600 | Tab labels, chip times. **Minimum size in the app.** |

Rules:
- Countdowns, times, counts: `font-variant-numeric: tabular-nums`.
- Bengali: line-height +0.1 (1.6 for body), never uppercase, never negative letter-spacing, weight 500 or higher at 12px and below.
- Language = Bengali shows Bengali digits (৭, ২৭ মিনিট) via `Intl.NumberFormat('bn-BD')`. English shows Latin digits.
- Arabic dua: 18px minimum, line-height 2, right-to-left, translation below at `caption`.
- Dates always show the day name: "3 August, Monday" / "৩ আগস্ট, সোমবার".
- Support OS font scaling to 130% without clipping: no fixed-height text containers.

## 5. Space, shape, elevation, motion

- **Spacing** (4px base): 4, 8, 12, 16, 20, 24, 32, 40, 48. Use gap, not margins, between siblings.
- **Radius:** xs 8 (chips, small buttons), sm 12 (inputs, rows), md 16 (cards), lg 24 (hero, sheets), pill (badges, toggles, floating nav).
- **Elevation:** cards sit on a 1px border, not a shadow. `sh-1` for resting cards on web, `sh-2` for popovers, `sh-3` only for the web floating nav and modals.
- **Motion:** 150ms for taps and hovers, 250ms for expand/collapse and screen content. Easing `cubic-bezier(.4,0,.2,1)`. The only looping animation is the pulse on the current prayer dot. Respect reduced motion: no transitions, no pulse.

## 6. Layout

- Mobile: 16px side gutter, bottom tab bar 58px + safe area, five tabs: Today, Recovery, Journey, Insights, Settings.
- Web: top bar 56px, content max 960px with 32px gutter, floating pill nav at the bottom center with the same five items.
- Journey = calendar + selected-day detail + streaks + heatmap + milestones. On mobile the calendar is collapsed by default and expands from a header row. On web the calendar and day detail sit side by side.
- Touch targets: 44 x 44px minimum, including tab items, toggles, back buttons and the small "Settle" button.
- Tap-to-edit anywhere a date appears is not required. Dates open the day detail only from the calendar and the Qaza dates list.

## 7. Components

Build these once, reuse everywhere.

| Component | Rules |
|---|---|
| **Button primary** | `pri` fill, `onPri` text, label 14/600, height 48, radius sm. One per screen. |
| **Button on hero** | White fill, `pri` text, height 44, radius xs+1 (9). Only inside hero cards. |
| **Button small** | `pri` fill, 44px tall hit area, label 11/600. For "Settle". |
| **Button secondary** | `srf` fill, 1.5px `bd2` border, `t1` text. |
| **Button danger** | `errL` fill, `errT` text. Only for sign out, delete local data. |
| **Link** | `t2` text, 13px, 44px tall tap area, underline on hover. |
| **Hero card** | Gradient `heroFrom`→`heroTo`, text `onHero`, radius lg, padding 18. Contains label (11 caps), display name, countdown (15/500), end time, one action. Today uses the `hero` gradient. Recovery uses the `rec` gradient (lime family, dark enough for white text). |
| **Prayer strip** | 5 equal chips. Each: name (micro), time (micro), status icon. Current chip has 2px `pri` border and pulsing dot. Chip shows icon + color, never color only. |
| **Status pill** | Tint background, `*T` text, icon + label, radius pill, height 28. |
| **Qaza row** | Icon tile (36, radius sm, `warL`/`warT`), prayer name (label), count or "All clear" (caption), chevron. Tap opens Qaza dates. |
| **Date row** | Date tile (day number + month, `warL`), "28 July, Sunday", prayer and time, small Settle button. |
| **Calendar cell** | Day number, status dot below (shape + color), selected = `priL` fill, today = `pri` outline. |
| **Day prayer row** | Prayer, time, status pill. Only qaza rows show a Settle button. |
| **Toggle** | 44 x 26, `pri` when on, thumb 22. |
| **Segmented control** | Inset `srf2`, 36px segments, selected = `srf` + weight 600. Used for theme and language. |
| **Banner** | Tint background, icon, title (label), detail (caption). Variants: ok, warn. Never blocks. |
| **Empty state** | Icon tile, title (heading), one sentence, one primary button. Always offers the next action. |
| **Progress bar** | 6px, `bd` track, `pri` fill, radius 3. |
| **Streak badge** | `accL` pill with flame icon, `accT` text. |
| **Dua card** | `priL` background, Arabic text, translation, context line ("After Asr"). |
| **Milestone row** | Round icon tile + title (label) + description (caption). |
| **Notification** | OS-native. Fires when a prayer window ends. Title "Asr time has ended", body "Did you pray Asr?", two actions: Prayed / Not prayed. Isha's arrives quietly (it lands at Fajr). Cannot be styled beyond icon and text. |
| **Widget** | Small: next prayer + countdown. Medium: adds five-prayer strip and total qaza. Uses `srf`, `pri`, `t1` only. |
| **BottomSheet** | Modal sheet with drag handle, title, content and a Close button. Radius lg top corners, padding 18. Used for day-detail actions and range add. |
| **Snackbar with Undo** | Shown after Mark as prayed, Mark completed and Settle, for 5 seconds. "{message}. Undo" — Undo calls `setStatus(previous, { undo: true })`. Sits above the tab bar. |

Focus: 2px `focus` outline, 2px offset, on every interactive element.

## 8. Voice and copy

Write plainly, from the user's side. Encourage, never scold. Short sentences. State what happens.

| Moment | English | Bengali |
|---|---|---|
| Notification question | Did you pray {Prayer}? | আপনি কি আজকের '{নামাজ}' পড়েছেন? |
| Action: yes | Prayed | পড়েছি |
| Action: no | Not prayed | পড়িনি |
| Auto-logged | Marked as qaza. Tap to correct. | কাজা হিসেবে রাখা হয়েছে। ঠিক করতে ট্যাপ করুন। |
| Settle | Settle | আদায় করেছি |
| Recovery progress | You've recovered 6 prayers this week. Keep going. | এই সপ্তাহে ৬টি নামাজ আদায় করেছেন। চালিয়ে যান। |
| No qaza | All clear. | কোনো কাজা নেই। |
| Streak broken | New streak starts today. | আজ থেকে নতুন ধারাবাহিকতা শুরু। |
| Sync failed | Sync failed. We'll retry. Your data is safe on this device. | সিঙ্ক হয়নি। আবার চেষ্টা হবে। ডেটা এই ডিভাইসে নিরাপদ আছে। |
| Offline | You're offline. Your data is safe on this device. | আপনি অফলাইনে আছেন। ডেটা এই ডিভাইসে নিরাপদ। |

Bengali tab names: আজ, কাজা আদায়, যাত্রা, পরিসংখ্যান, সেটিংস. Prayer names: ফজর, যোহর, আসর, মাগরিব, এশা. The notification question and the two action labels come from the product owner. The other Bengali strings are drafts and need a native review before release.

Do not use: "failed", "missed", "behind", "overdue", "penalty", "lost streak". Use "qaza", "to recover", "new streak".

## 9. Accessibility

Measured contrast (WCAG AA needs 4.5 for text):

| Pair | Light | Dark |
|---|---|---|
| `t1` on `bg` | 13.9 | 17.7 |
| `t2` on `srf` | 7.4 | 9.2 |
| `t3` on `srf` | 4.7 | 5.7 |
| `onPri` on `pri` | 7.1 | 8.6 |
| `onHero` on hero start | 7.1 | 6.8 |
| `onHero` on hero end | 9.1 | 11.7 |
| `onRec` on recovery start / end | 7.1 / 8.7 | 6.8 / 14.1 |
| `sucT` on `sucL` | 6.5 | 8.6 |
| `warT` on `warL` | 6.2 | 8.7 |
| `infT` on `infL` | 8.1 | 8.0 |
| `accT` on `accL` | 6.5 | 9.7 |
| `errT` on `errL` | 6.8 | 5.8 |
| `focus` on `bg` | 6.7 | 10.6 |

Known exception: base `suc` as a dot or bar on a light card is 2.2:1. That is acceptable only because every status also has an icon and a label, and calendar dots add a shape.

Also required: 44px targets, visible focus, screen-reader labels on every icon-only control ("Previous month"), status announced as text ("Fajr, qaza"), no information in color alone, reduced-motion support, font scaling to 130%.

## 10. Platform mapping

| Need | Web (Next.js PWA) | Mobile (Expo) |
|---|---|---|
| Tokens | `tokens.css` | `tokens.ts` |
| Theme | `data-theme` + `prefers-color-scheme` | `useColorScheme()` + settings override, pick `colors[theme]` |
| Fonts | Google Fonts link | `expo-font`: Inter, Noto Sans Bengali, Noto Naskh Arabic |
| Icons | One inline SVG set, 20px, 1.75 stroke | Same SVG set via `react-native-svg` |
| Status styling | CSS classes from `statusStyle` | `statusStyle(colors[theme])` |
| Navigation | Floating pill nav | Bottom tab bar |

Icon set: stroke icons, 20px, 1.75 stroke, rounded caps: mosque, pin, flame, check, alert, undo, clock, calendar, bell, refresh, chevron (left/right/down), cloud, sign-out, download, upload. Emoji are placeholders in the mockups only and must be replaced by this set in the real app.

## 11. Decisions already made

- Palette: emerald (v4). Teal (v2) is retired.
- Journey replaces the separate Calendar tab. Calendar and day detail live inside it.
- Settings is the fifth tab (mobile) and fifth nav item (web).
- App name: Salah Tracker.
- Default on sign-out: keep local data. (Confirm before release.)
- Encryption: not in v1.

## 12. Open items

- App icon and splash (needs design; suggested: `pri` field with a simple crescent or dome glyph).
- Native review of the draft Bengali strings.
- Widget artwork for iOS and Android.
- Final dua list per prayer and its source references.
- Whether the "Not prayed" action should require a confirm tap (current decision: no).

## 13. Change rules

- New color: needs a role, a tint, a text-safe variant and a dark value, all contrast-checked.
- New component: reuse tokens only. If a value is not in this file, add it here first.
- A token changes in `tokens.css` and `tokens.ts` in the same commit, and this file is updated with it.

# HomeKeeper (MVP)

Live at https://chive55.github.io/homekeeper/

A mobile-first web app that builds a personalized home maintenance schedule from a
short onboarding quiz, then keeps you on track with due/overdue/upcoming tasks,
completion history, and undo. It also includes a premium Home Inventory section
for documenting valuables (price, serial number, photos) so an insurance claim
is never a guessing game.

## How to run

No backend, no build step, no dependencies. Two options:

**Option A, quickest:** open `index.html` directly in a browser (double-click it).
Everything works except the service worker, which browsers disable on `file://`.

**Option B, full PWA behavior:** serve the folder over HTTP, then open the URL:

```bash
cd ~/workspace/your_files/product-ideas/home-maintenance-companion/app
python3 -m http.server 8080
# open http://localhost:8080
```

On a phone, use "Add to Home Screen" after opening the served URL to install it
as a standalone app.

## Project structure

| File | What it is |
|---|---|
| `index.html` | App shell. Loads `engine.js` then `app.js`. PWA meta tags live here. |
| `styles.css` | Mobile-first light theme. 480px centered column, 48px tap targets. |
| `engine.js` | Pure task logic with no DOM: the ~40-task template library, applicability rules, due-date scheduling, completion rollover, undo, and bucketing. Also exports for Node so the logic is unit testable. |
| `app.js` | UI wiring: onboarding wizard, dashboard, history, premium placeholders, localStorage persistence, badge, service worker registration. |
| `manifest.json` | PWA manifest (name, icons, theme color, standalone display). |
| `service-worker.js` | Caches the app shell (cache-first, same-origin GETs only, versioned `hmc-v1` cache). |
| `icon.svg` / `icon-180.png` | App icons. The PNG is generated; replace both with final brand art before launch. |

## Data model (localStorage key `hmc_state_v1`)

```js
{
  version: 1,
  onboarded: true,
  profile: {
    homeType: 'house' | 'townhouse' | 'condo' | 'apartment',
    ageRange: 'under-5' | '5-15' | '15-30' | 'over-30',
    climate: 'hot-humid' | 'hot-dry' | 'temperate' | 'cold' | 'coastal',
    systems: {
      hvac: 'forced-air' | 'heat-pump' | 'boiler' | 'none',
      waterHeater, gutters, fireplace, sumpPump, dishwasher,
      washerDryer, lawn, irrigation, smokeCo, garageDoor // booleans
    }
  },
  tasks: [{
    id, templateId, title, howTo: [steps],
    frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual',
    frequencyLabel, nextDueAt: ISOString, lastCompletedAt, createdAt,
    snoozedUntil: ISOString | null,   // pushes visibility out, never changes the schedule
    notify: { enabled: true, daysBefore: 1, channel: 'push' }  // reminder-ready stub
  }],
  history: [{
    id, taskId, title, completedAt: ISOString, prevDueAt: ISOString,
    action: 'done' | 'skipped'
  }],
  notifyInterest: { warranties: true, ... },  // premium "notify me" taps
  prefs: {
    notifications: { enabled: false, remindAt: '08:00', daysAhead: 1 }
  }
}
```

Frequencies map to day counts (30 / 91 / 182 / 365). Completing a task sets
`nextDueAt` to completion date + period. Snoozing sets `snoozedUntil`, which
only affects which bucket a task appears in, never its schedule. Skipping logs a
`skipped` history entry and rolls the schedule forward like a completion.
History entries keep `prevDueAt` so the most recent entry can be undone.

## Home Inventory (premium)

The Inventory tab documents the things you own for insurance claims. Each item
stores: name, category (appliance, electronics, furniture, tools, jewelry,
other), room, purchase date, price paid, serial number, an optional warranty
expiry date, notes, an item photo, and an optional receipt photo.

Features:

- **List view** with thumbnail cards, search across name / category / room /
  serial, and a header showing total documented value ("Your inventory: $X
  across N items") plus on-device storage usage.
- **Detail view** with full-size photos, all fields, Edit, and Delete
  (with confirmation).
- **Claim report export:** a print-friendly report listing every item with
  thumbnail, price paid, purchase date, and serial number, plus the total value
  and a generated-on date line. Print it or save it as PDF and hand it to
  your insurer.
- **Storage meter:** the list header shows approximate localStorage usage and
  warns at ~4.5 MB (localStorage caps around 5 MB) that old receipt photos may
  need to go.

### Inventory data model (localStorage key `homekeeper_inventory_v1`)

```js
[{
  id: 'inv_...',            // generated
  createdAt: ISOString,
  name,                     // required
  category: 'appliance' | 'electronics' | 'furniture' | 'tools' | 'jewelry' | 'other',
  room,                     // free text with datalist suggestions
  purchaseDate: 'yyyy-mm-dd' | '',
  price: '12.50' | '',      // stored as entered, formatted on display
  serial,
  warrantyExpires: 'yyyy-mm-dd' | '',
  notes,
  photo: dataURL | null,        // compressed JPEG, see below
  receiptPhoto: dataURL | null  // compressed JPEG, see below
}]
```

This key is fully separate from the task data (`hmc_state_v1`); clearing one
never touches the other.

### Photo compression

Raw camera photos are never stored. Every photo passes through
`compressPhoto()` in `app.js` before it reaches localStorage:

- Drawn to a `<canvas>` capped at 1280px on the longest side.
- Exported as JPEG at quality 0.8 via `canvas.toDataURL('image/jpeg', 0.8)`.
- EXIF orientation is respected through `createImageBitmap` with
  `imageOrientation: 'from-image'`, with an `<img>` fallback for older browsers.

A typical phone photo (3-5 MB) compresses to roughly 150-400 KB, so a few dozen
documented items fit comfortably. If a save ever fails with the storage quota
exceeded, the form stays open with a message suggesting the user remove a
receipt photo and try again.

## Reminders: how they attach later

The data model is reminder-ready today:

- Every task has an ISO `nextDueAt` timestamp and a `notify` preference object
  (`{ enabled, daysBefore, channel }`).
- `app.js` has a commented `scheduleReminder(task)` hook plus
  `refreshReminderModel()`, which already runs on every state change
  (done / snooze / skip / regenerate). The hook validates the model shape at
  MVP and is the single place where real scheduling plugs in.
- Global defaults live in `prefs.notifications`
  (`{ enabled, remindAt: '08:00', daysAhead: 1 }`).

To ship reminders later, in order of effort:

1. **In-app badge (done):** the header "N need attention" badge is the MVP
   stand-in and already works.
2. **Local notifications:** ask `Notification` permission on first dashboard
   visit, then in `scheduleReminder` use the service worker to schedule a
   notification at `effectiveDue - daysBefore`. Fully client-side, no backend.
3. **True push:** add a backend that stores Web Push subscriptions and sends
   reminders server-side from the same `nextDueAt` timestamps.

## What's stubbed for later

- **Push / local reminders:** see "Reminders" above. Not wired at MVP.
- **Premium features:** Home Inventory is built and functional. Contractor
  contacts and AI troubleshooting remain visible locked cards. "Notify me"
  records interest in `notifyInterest` on-device only. No functionality behind
  them yet.
- **Profile editing:** "Edit home profile" in the History tab restarts onboarding
  from scratch (clears tasks and history). A future version should regenerate
  tasks while preserving history.
- **Icons:** placeholder art. Generate proper maskable PNGs (192px, 512px) before
  any store or public listing.

## Resetting during testing

In the browser console: `localStorage.removeItem('hmc_state_v1')` then reload,
or use "Edit home profile" at the bottom of the History tab. To clear only the
inventory: `localStorage.removeItem('homekeeper_inventory_v1')`.

# DA Assignment + Front-Desk Op Assignment — Build Spec

**Target project:** opboard
**Build & test in the local sandbox first** (`npm run dev`, data dir `~/.opboard-data`). Do NOT deploy to the office Pi until the user has tested in the sandbox and approved.

This spec describes two related features:
1. **DA (Dental Assistant) assignment** — assign DAs to providers + floaters, manage a DA roster, display DA badges on all views.
2. **Front-desk op assignment** — let the front desk assign/move ops (currently master-only), with anti-clobber locking.

---

## 0. Guardrails (read first)

- **Preserve existing stability mechanisms.** This app has hardened socket sync, atomic writes, `enforceOpInvariant()`, and zombie-op healing. Do not weaken or bypass any of them. New write paths must go through the same invariant/validation logic that op mutations use.
- **Two reset paths must stay separate.** The existing **daily op reset** must NOT be modified and must NOT touch DA assignments. DA assignments clear on a **separate weekly schedule** (Friday 11:59 PM). Implement DA reset as its own scheduled action; leave the daily op-reset code alone.
- **Socket sync:** every DA mutation and every front-desk op mutation must emit the same socket events that keep master / front desk / TV / op tablets in sync. Mirror the existing `emitSocket()` pattern. Missing emits = desync bugs.
- **Optimistic UI:** assignments apply locally immediately, then sync via Socket.io.
- **Confirm before large refactors.** If a change requires touching `enforceOpInvariant()` or the core state-merge logic, surface it to the user first rather than refactoring silently.

---

## 1. Data model

### 1.1 DA roster (new persistent state)

A list of DA objects, persisted in the same state store as the rest of the app:

```
daRoster: [
  { id: "<stable-uuid>", name: "Sarah", color: "#1D9E75", isGuest: false },
  { id: "<stable-uuid>", name: "Mike",  color: "#378ADD", isGuest: false },
  ...
  { id: "guest-1", name: "Guest One", color: "#97C459", isGuest: true, defaultName: "Guest One" },
]
```

- `id` is stable and never reused (assignments reference it).
- `color` is a hex string from the fixed 10-color palette, OR the string `"none"` (see §1.3).
- `isGuest: true` rows are guest slots (see guest rules below).
- `defaultName` (guests only) is the name the guest reverts to on the weekly reset (§6.1).
- Non-guest DAs are freely added/removed.
- **Default roster on first run:** 4 placeholder DAs (e.g. "DA 1".."DA 4" or leave the user's current names if any) + **one** guest ("Guest One"). Confirm default DA names with user if unclear; placeholders are fine.

**Guest rules:**
- Start with **one** guest, "Guest One" — this first guest is **always present and NOT deletable** (renameable + recolorable only).
- Additional guests can be **added** via a `+` control (§2.1). Added guests default to "Guest Two", "Guest Three", … (next sequential), stored as their `defaultName`. Added guests **ARE deletable** (trash icon).
- Guests are assignable to provider/floater slots exactly like regular DAs.
- **Name reverts weekly; color persists** (§6.1).

### 1.2 The 10-color palette (fixed)

Use these 10 distinct colors. Each DA picks one; **no two DAs may share a color** (except `"none"`, which any number may hold).

```
Teal    #1D9E75
Blue    #378ADD
Pink    #D4537E
Purple  #7F77DD
Coral   #D85A30
Green   #97C459
Red     #E24B4A
Amber   #EF9F27
Mint    #5DCAA5
Stone   #B4B2A9
```

(Names are for the dropdown label; values are what's stored.)

### 1.3 "None" color

- `color: "none"` is always selectable and frees up whatever color the DA had.
- A DA with `color: "none"` still appears everywhere they're assigned, rendered as a **neutral gray outline badge** (transparent fill, gray border, gray text) — see §4.3.
- Purpose: temporarily release a color so another DA can take it while the first DA decides.

### 1.4 DA assignments (new persistent state)

Each DA is assigned to **exactly one slot or none** — never two places.

```
daAssignments: {
  // provider slots: provider name -> ordered array of DA ids
  providers: {
    "Dr. Tang": ["<da-id-main>", "<da-id-support>", ...],   // index 0 = Main, 1 = Support, 2+ = extra
    "Dr. Ngo":  ["<da-id>", "<da-id>"],
    "Jordan":   []                                            // empty is fine
  },
  // floaters: ordered array of DA ids (no fixed cap; UI starts with one + an add button)
  floaters: ["<da-id>", ...]
}
```

**Single-spot invariant:** a given DA `id` may appear in **at most one** location across all provider arrays and the floater array. Assigning a DA who is already placed must first remove them from their previous location (move semantics, not copy). Enforce this in a single helper that every assignment action calls.

### 1.5 Provider type

**Assumption (Option A):** providers are just names; there is NO doctor/hygienist type concept. The user did not confirm an existing type field. Treat all providers identically — every provider column gets the same DA slots + `+` button. Jordan (a hygienist) simply tends to have empty slots.

> If, while reading the code, you discover an existing provider-type/role concept, STOP and tell the user before building on Option A — they may prefer hygienists to default to no slots.

---

## 2. Admin roster editor (in the existing admin menu)

Add a **DA Roster** section to the admin menu (same place other admin settings live; admin PIN gating as existing).

### 2.1 Layout

Two sub-sections:

**A. DAs** (non-guest rows)
- Each row: color swatch · name (editable text) · color dropdown · delete (trash) icon.
- An **"Add DA"** button below the list appends a new DA (blank/placeholder name, auto-assigned an unused color, or `"none"` if all taken).

**B. Guests — edit name & color** (separate sub-section, visually divided)
- Starts with **one** guest row, "Guest One": color swatch · **editable name field** · color dropdown. **No delete icon** on this first guest (always present).
- A **`+`** control below the guest row adds another guest (default name "Guest Two", "Guest Three", … sequential). Added guest rows DO have a delete (trash) icon.
- Helper text: "Rename guests for temps or fill-ins; assignable like any DA. Names reset weekly."

### 2.2 Color dropdown behavior

- Shows the 10 palette colors + a **"None"** option.
- A color already used by another DA is shown **with an X through it (struck out / disabled)** — NOT merely dimmed — and cannot be selected.
- The DA's own current color is shown as selected/highlighted.
- Selecting "None" sets `color:"none"` and frees the prior color immediately (other DAs' dropdowns update).
- Swatch-grid or dropdown-list presentation both acceptable; match the app's existing control style.

### 2.3 Roster edit rules

- **Renaming** a DA updates their badge everywhere live (re-render).
- **Changing color** updates badges everywhere live.
- **Deleting** a non-guest DA: if they are currently assigned anywhere, **auto-vacate** that slot (remove their id from the provider/floater array) as part of the delete. No orphaned references.
- **Guest One** (the first guest) cannot be deleted (no trash control); it can be renamed and recolored. **Added guests** (via `+`) can be deleted; deleting an assigned added-guest auto-vacates their slot.
- Enforce unique colors at write time (the struck-out dropdown prevents collisions; also validate server-side).

---

## 3. Unified DA assignment board

### 3.1 How it opens

- **Tapping any provider's name** (on the **master** OR **front-desk** view) opens ONE unified assignment board (a modal/panel) — not a per-provider panel.
- The board shows **all providers at once**, so DAs can be assigned/swapped across providers without opening multiple panels.
- The **TV never opens this** — TV is display-only, no touch.

### 3.2 Board contents

- **One column per scheduled provider**, each showing its DA slots:
  - Slot 0 labeled **MAIN**, slot 1 labeled **SUPPORT**, slots 2+ unlabeled (or "DA 3" etc.).
  - Filled slots show the DA badge; empty slots show a dashed placeholder.
  - A **`+`** button (plus icon only, no text) under the slots adds another DA slot to that provider.
- **Floaters zone** (visually distinct, amber-tinted): shows current floater badge(s) + a **`+`** button to add another floater. Starts with room for one; `+` allows more (future-proofing; rarely >1).
- **Roster tray** at the bottom: all DAs as tappable badges. DAs already placed somewhere are shown dimmed (still tappable to move them).

### 3.3 Interaction — Model 1 (tap DA, then tap slot)

1. Tap a DA in the roster tray → it becomes "selected" (highlighted).
2. Tap a destination slot (a provider Main/Support/extra slot, or a floater `+`/slot) → the selected DA is placed there.
3. **Move semantics:** if the DA was already in another slot, they vacate it automatically (single-spot invariant §1.4).
4. **Displacement:** if the destination slot was occupied, decide behavior — recommended: the displaced DA returns to the roster tray (becomes unassigned). Keep it simple and predictable; document whichever you implement.
5. Tapping an already-assigned DA's badge in a slot removes them from that slot (returns to roster).
6. A **Clear** affordance per provider (and/or a global clear) is optional but helpful.
7. **Done/close** dismisses the board.

All interactions are tap-based (no drag) so they work identically on master and front-desk tablets.

### 3.4 Concurrency lock (anti-clobber) — REQUIRED

- Extend the existing **note-lock pattern** to cover **DA assignment**. While one device has the DA assignment board open in an editing state for a given scope, the other device attempting to edit shows the existing "🔒 in use" indicator (same UX as note locks today).
- Lock granularity: simplest acceptable is a single "DA assignment" lock (whole board). If the note-lock infra is naturally per-op, adapt it to a per-"DA-board" lock. Do not invent a heavier system than needed.
- Lock must release on close/timeout exactly like note locks (reuse the existing timeout/`resetTimeout` mechanism).

---

## 4. Display changes (master, front desk, AND TV)

### 4.1 Header restructure

Current header (all three views) centers the app title with a small subtitle (TV / MAIN / FRONT DESK) beneath it. Change to:

- **Left:** logo + practice name (unchanged).
- **Center:** app title (e.g. "PATIENT BOARD" / current title) with **`FLOATER: <name>`** as the subtitle directly beneath it.
  - If 2 floaters: `FLOATER: Name1, Name2`.
  - If no floater: subtitle is **blank** (empty, no "FLOATER:" label shown).
- **Right:** the date + time (as today) with the **view label (TV / MAIN / FRONT DESK)** moved to sit **directly below the date/time**, right-justified.

So the view label leaves the center and goes far-right under the clock; the floater name takes the center subtitle slot.

### 4.2 Provider header DA badges

In each provider column header (all three views):

- DA badges are **right-justified** within the provider header, **stacked vertically**:
  - Top = Main DA, second = Support DA, additional below in slot order.
- The provider name stays left-justified (as today); badges sit on the right side of the same header band.
- Because of width, names stack rather than sitting inline.
- On the **TV**, consider slightly smaller badge text than the tablets if space is tight, but keep legible at distance. (Provider name font was recently reduced 50% — badges should fit beneath/right of it without overflow.)

### 4.3 Badge rendering

- **Filled badge:** rounded rect, background = DA's color, text = DA's first name.
- **Font color auto-picked by luminance:** compute the badge color's relative luminance; if light → use a dark text color (e.g. the darkest shade of that hue family or near-black); if dark → use white. Implement a small `pickTextColor(hex)` helper (standard WCAG luminance formula). This must run for every badge so any roster color is legible.
- **"None" color badge:** transparent/near-transparent fill, **gray outline border**, gray text — clearly "needs a color" but still shows the name.
- Badges appear wherever the DA is assigned: provider headers (provider slots) and the center floater subtitle (floaters).

---

## 5. Front-desk op assignment

### 5.1 Capability

- The **front-desk** view gains the ability to **assign and move ops to providers**, mirroring the **master** tablet **exactly** (same gestures/affordances the master uses — match whatever the current master flow is; do not invent a different interaction).
- This includes assigning an unassigned op to a provider and moving an op between providers, to the same extent the master can.

> Before implementing, inspect how the master assigns/moves ops today and replicate that interaction on the front desk. If the master uses drag, mirror drag; if tap-menu, mirror tap-menu. Keep them identical so staff trained on one know the other.

### 5.2 Concurrency lock (anti-clobber) — REQUIRED

- Extend the **note-lock pattern** to **op assignment** as well, so the master and front desk cannot simultaneously edit the same op's assignment and clobber each other.
- Same "🔒 in use" UX and same timeout/release behavior as existing note locks.
- All front-desk op mutations go through the same `enforceOpInvariant()` / validation path as master op mutations. No bypass.

### 5.3 Optional toggle (recommended, not required)

- Consider gating "front desk can assign ops" behind an admin toggle (matching the app's admin-settings pattern), so it can be enabled/disabled without a code change. If quick to add, include it; if it complicates the build, note it as a follow-up.

---

## 6. Reset logic

### 6.1 Weekly reset (Friday 11:59 PM)

At **Friday 11:59 PM** (local time, America/Los_Angeles — match the timezone the app already uses), a single weekly reset performs BOTH of the following:

**(a) Clear all DA assignments.**
- Empty all provider DA arrays and the floater array in `daAssignments`.
- The **roster itself is NOT cleared** (DAs and their colors persist; only their provider/floater assignments reset).

**(b) Revert guest names to their defaults.**
- For every guest row (`isGuest: true`), set `name = defaultName` ("Guest One", "Guest Two", …).
- **Color does NOT revert** — each guest keeps its current color across the reset. Name only.
- Added guests are NOT removed by the reset (only their names revert); they persist until manually deleted.

Implement as a **single scheduled action** (both (a) and (b) together) that is **separate** from the daily op reset. Reuse the app's existing scheduling mechanism (the same approach used for the daily reset / weekly review timing), but as an independent trigger.

### 6.2 Daily op reset — DO NOT TOUCH

- The existing daily op reset must continue to work unchanged and must **not** affect DA assignments. DAs persist across daily op resets; they only clear on the Friday 11:59 PM weekly trigger.
- Verify: after a simulated daily reset, `daAssignments` is untouched.

---

## 7. Edge cases (must all be handled)

1. **DA assigned then deleted from roster** → auto-vacate their slot(s); no orphan ids remain in `daAssignments`.
2. **DA color set to "None" while assigned** → badge live-switches to gray outline everywhere; the freed color becomes selectable for others.
3. **Two devices editing DA assignments at once** → note-lock-style "🔒 in use"; no overwrite. (§3.4)
4. **Two devices editing the same op assignment at once** → note-lock-style "🔒 in use"; no overwrite. (§5.2)
5. **Provider removed from the schedule while holding DAs** → those DAs become **unassigned** (removed from that provider's array, returned to roster availability).
6. **Daily op reset** → DA assignments persist (only weekly reset clears them). (§6.2)
7. **Single-spot invariant** → assigning an already-placed DA moves them (vacates prior slot); a DA never appears in two slots. (§1.4)
8. **All colors taken, new DA added** → new DA defaults to `color:"none"` (gray badge) until a color frees up.
9. **Guest renamed for a temp, then weekly reset fires** → guest `name` reverts to `defaultName` ("Guest One", etc.); guest **color is unchanged**; if the guest was assigned, the assignment clears as part of (a) but the row remains in the roster. (§6.1)
10. **Added guest deleted while assigned** → auto-vacate their slot (same as DA deletion). "Guest One" can never be deleted.

---

## 8. Build & test order (suggested)

Build incrementally; verify each stage in the sandbox before the next. Keep each stage a separate commit so problems are easy to isolate.

1. **Data model + roster persistence** — `daRoster`, `daAssignments` in state; load/save; defaults. Verify persistence across restart.
2. **Admin roster editor** — DAs add/remove, guests rename, color dropdown with struck-out taken colors + "None". Verify unique-color enforcement.
3. **Badge component** — `pickTextColor(hex)` luminance helper; filled + "none" gray rendering. Unit-check a few colors.
4. **Display: header restructure + provider-header badges** — all three views (master, FD, TV). Verify floater subtitle + view-label-right.
5. **Unified assignment board** — open from provider name (master + FD); all providers; tap-DA-tap-slot; `+` buttons; floater zone; single-spot move semantics.
6. **DA assignment lock** — note-lock extended; "🔒 in use" across two browser tabs.
7. **Front-desk op assignment** — mirror master interaction; op-assignment lock; invariant path. Verify two-tab anti-clobber.
8. **Weekly reset** — Friday 11:59 PM clears assignments AND reverts guest names (colors persist); daily reset leaves DAs intact. (Test by temporarily triggering the scheduled function.)
9. **Full edge-case pass** — walk all of §7.

### Testing the sandbox multi-device behavior
Open multiple browser tabs against `localhost:3000` — `/` (master), `/frontdesk`, `/tv` — to simulate the devices and verify real-time sync and locks between them.

---

## 9. Out of scope for this build (do not implement)

- **Unassigned-op highlighting** — explicitly deferred. Remind the user about it only if the project is modified further.
- **Provider-type (doctor/hygienist) system** — not built unless an existing concept is found (§1.5).
- Renaming "Patient Board" back to "Op Board" — separate trivial task, not part of this.

---

## 10. Definition of done

- Roster fully manageable in admin (DAs add/remove, guests rename, unique colors, "None").
- Tapping any provider name on master or front desk opens the unified board; DAs assign/swap across providers + floaters with single-spot semantics.
- DA badges show correctly (auto font color; gray for "none") in provider headers on master, FD, and TV; floaters show in the center header subtitle; view label sits under the clock on the right.
- Front desk can assign/move ops exactly like master.
- DA-assignment and op-assignment are both protected by note-lock-style anti-clobber with "🔒 in use".
- Friday 11:59 PM clears DA assignments and reverts guest names (colors persist); daily op reset does not.
- All §7 edge cases pass in the sandbox.
- Nothing deployed to the Pi until the user tests in the sandbox and approves.

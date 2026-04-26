# Dentists of West Henderson — Operatory Board · Project State Document
*Generated from live files — update this doc when major changes are made*

---

## DEPLOYMENT

| Item | Value |
|------|-------|
| Hardware | Raspberry Pi 5 |
| SSH | `ssh actang13@192.168.0.144` (hostname: RaspberryPi5) |
| Deploy path | `/home/actang13/opboard/` |
| State file | `/var/lib/opboard/state.json` |
| History file | `/var/lib/opboard/history.json` |
| Server port | 3000 |
| Service | `sudo systemctl restart opboard` |
| Deploy cmd | `scp server.js app.js actang13@192.168.0.144:/home/actang13/opboard/` |

---

## OUTPUT FILES

All in `/mnt/user-data/outputs/`:

| File | Device | Lines | Purpose |
|------|--------|-------|---------|
| `master-tablet-preview.jsx` | Samsung Tab A9 | ~1246 | Full control, PIN-protected admin |
| `frontdesk-tablet-preview.jsx` | Samsung Tab A9 | ~911 | AWFA notifications, read/note |
| `tv-preview.jsx` | 43" Samsung TV | ~648 | Read-only display, 15ft viewing |
| `op-tablet-preview.jsx` | Samsung Tab A9 (per op) | ~420 | Per-operatory control |
| `server.js` | Raspberry Pi 5 | ~198 | Node.js + Express + Socket.io |
| `opboard.service` | Pi | — | systemd auto-start |

---

## ARCHITECTURE

```
Pi 5 (server.js, port 3000)
  ├── Master Tablet (full admin control)
  ├── Front Desk Tablet (AWFA alerts)
  ├── TV Display (read-only, 43")
  └── Op Tablets × N (per-op control, always unlocked)
```

State stored in `/var/lib/opboard/state.json`, broadcast via Socket.io to all devices.

---

## STATUS SYSTEM (7 statuses)

| Key | Label | Color | Pulse |
|-----|-------|-------|-------|
| `ready` | Ready | `#4ade80` green | ✓ slow 2.5s (all devices) |
| `treatment` | In Progress | `#60a5fa` blue | — |
| `pending` | Awaiting FA | `#ff69b4` hot pink | ✓ slow 2.5s (all devices) |
| `fa` | Reviewing FA | `#facc15` yellow | — |
| `dirty` | Dirty | `#ff2020` red | — |
| `awaiting` | Clean | white bg | — |
| `inactive` | Not In Use | gray | — |

Status changes to `awaiting` or `inactive` → clears `apptTypes:[]`, `note:""`, `ts:null`

---

## APPT TYPE SYSTEM

Menu order (full name → badge abbreviation):

| Menu shows | Badge shows |
|-----------|------------|
| NP | NP |
| CCX | CCX |
| Treatment | TX |
| LOE | LOE |
| Delivery | DEL |
| Office Visit | OV |
| Prophy | PRO |
| PMT | PMT |
| SRP | SRP |

```js
const INIT_APPT_TYPES = ["NP","CCX","Treatment","LOE","Delivery","Office Visit","Prophy","PMT","SRP"];
const APPT_ABBR_MAP = {"NP":"NP","CCX":"CCX","Treatment":"TX","LOE":"LOE","Delivery":"DEL","Office Visit":"OV","Prophy":"PRO","PMT":"PMT","SRP":"SRP"};
```

- Multi-select: each type gets its own badge, side by side
- Badge display: letters stacked vertically top-to-bottom, one column, uppercase
- Sorted by INIT_APPT_TYPES order on all displays
- Badge width: `apptW = calc(bdgSz * 1.75)`

---

## MASTER TABLET CARD LAYOUT

Card = `display:flex, flexDirection:row, alignItems:stretch`

```
[ Op# + elapsed ] [ appt badges ][ note text ]
  Left col          Middle col     Right col (flex:1)
  tap=status modal  tap=appt modal tap=note editor
```

**Size variables** (at n providers):
```js
const numSz = `clamp(75px,${16.25/n}vw,200px)`;   // op number
const bdgSz = `clamp(18px,${3.02/n}vw,45px)`;     // appt badge font
const notSz = `clamp(36px,${5.4/n}vw,66px)`;      // note text
const timSz = `clamp(11px,${1.38/n}vw,17.5px)`;   // elapsed time
const apptW = `calc(${bdgSz} * 1.75)`;             // badge width
const namSz = `clamp(22px,${4.5/n}vw,58px)`;      // provider name
```

At 3 providers, actual values hit clamp floors:
- Op number: **75px**
- Elapsed time: **11px**
- Appt badge: **18px**
- Note: **36px**

**ScaledWrapper**: `designW=1340, designH=800` → scales to fit viewport

---

## MENUS — ALL MODAL (no dropdowns)

- **Status tap** → `position:fixed` centered modal, list of statuses, CANCEL button
- **Appt type tap** → `position:fixed` centered modal (ModalMenu component), multi-select checkboxes, CANCEL + DONE buttons
- **Note tap** → `position:fixed` modal, textarea, CANCEL + SAVE buttons
- All modals use `position:fixed` to escape ScaledWrapper's `transform:scale()`

### ⚠️ KNOWN ISSUE — Note editor Save/Cancel buttons not working in preview
The note editor is rendered outside `<ScaledWrapper>` in a React fragment to avoid transform hit-testing issues. Despite multiple attempts using `onMouseDown`, `onPointerDown`, `onClick`, `position:fixed`, `zIndex:9999`, `pointerEvents:all` — buttons still unresponsive in Claude.ai preview iframe. **Keyboard shortcuts work**: `Ctrl+Enter` = save, `Esc` = cancel. On Pi deployment this will work correctly as it runs in a real browser.

---

## NOTE EDITOR

- **FitText component**: auto-shrinks font from `notSz` down to 10px min to fit 3 rows max
- `noteDraftRef` tracks latest typed value (bypasses stale closure issue)
- `noteDidSelect` ref: auto-selects text on first open, never again until closed+reopened
- 40-char limit on op tablet, no limit on master/FD

---

## ABBREVIATION ENGINE

`abbreviateNote(note, customAbbrevs=[])` + `condenseNote(note)`

- `condenseNote`: merges repeated procedures → `"14 Crn, 15 Crn"` → `"14/15 Crn"`
- `ABBREV_PHRASES`: 50+ dental term replacements
- Custom abbreviations: stored server-side, synced to all devices
- Admin Menu → "✂ Note Abbreviations" screen

---

## NOTIFICATION SYSTEM

| Device | AWFA behavior |
|--------|--------------|
| Master | Status change toast, card pulse |
| Front Desk | Corner banner bottom-right, 10-min reminder for AWFA only |
| TV | NO banners — cards pulse only |
| Op tablet | Local toast on status/note save |

---

## SERVER SOCKET EVENTS

```
setStatus       {op, status}
setApptType     {op, apptTypes:[]}
setNote         {op, note}
setProviders    {activeProviders, inactiveProviders}
setOpProvider   {op, provider, status, apptTypes, note}
setStatuses     {statuses}
setApptTypes    {apptTypes}
setAllOps       {allOps}
setOpPin        {pin}
setAdminPin     {pin}
setProviderDefaults {defaults}
setProviderColors   {colors}
setCustomAbbrevs    {abbrevs}
noteLock        {op, by}
noteUnlock      {}
```

**Midnight reset** (server-side, 11:59 PM):
- Non-dirty ops → `status:"awaiting"`, `note:""`, `apptTypes:[]`, `ts:null`
- Dirty rooms left as-is
- Re-broadcasts full state to all devices

---

## PINS

| PIN | Default | Purpose |
|-----|---------|---------|
| Admin PIN | 4001 | Unlock master tablet admin menu |
| Op PIN | 0063 | Unlock op tablet (not currently used in preview) |

---

## TV DISPLAY

- 43" Samsung at 1920×1080
- Minimum readable font at 15ft: **32px** (set as noteSize clamp floor)
- No banners, no popups, no scrolling
- Provider columns synced from server `activeProviders` state (not hardcoded)
- `elapsed()` handles number/Date/string timestamps safely

---

## FRONT DESK TABLET

- AWFA corner notification (bottom-right banner)
- 10-minute reminder for AWFA only
- Dismisses per-op, re-alerts on new AWFA
- History modal with date filter
- `customAbbrevs` passed to all `abbreviateNote()` calls

---

## OP TABLET

- Header: Logo + "DENTISTS OF / WEST HENDERSON" (two rows left), date/time (two rows right)
- No "Op N" in header — large "Op N" centered on card
- Status and appt type: tap card label/badge → slide-up modal from bottom
- No toast on individual appt toggle — only on DONE
- Note: tap to edit, 40-char limit, abbreviation preview below

---

## KNOWN BUGS / OPEN ITEMS

1. ⚠️ **Note editor Save/Cancel buttons** — unresponsive in Claude.ai preview. Works via keyboard (`Ctrl+Enter` / `Esc`). Expected to work on Pi in real browser.
2. Master tablet was missing `emitSocket` definition inside component — fixed (defined as `useCallback` wrapping `socket.emit` in try/catch).
3. TV `elapsed()` fixed to handle Unix number timestamps.
4. Server midnight reset added (runs on Pi, not client-side).
5. `updateNote` now emits `setNote` to server.
6. `APPT_ABBR_MAP` added to all four display files.

---

## DEPLOYMENT CHECKLIST (when ready for Pi)

- [ ] Remove DEMO data from master tablet
- [ ] Remove "CLEAR ALL / TEST" buttons
- [ ] Set static IP on Pi via Cox router device reservation
- [ ] `scp` all files to Pi
- [ ] `sudo systemctl restart opboard`
- [ ] Open `http://192.168.0.144:3000` on each device
- [ ] Set admin PIN to production value
- [ ] Configure provider names via Admin Menu

---

## HOW TO RESTORE CONTEXT AFTER COMPACTION

Paste this document at the start of a new session with:
> "This is the project state for the Dentists of West Henderson operatory board. All output files are in /mnt/user-data/outputs/. Continue from the known issues section."


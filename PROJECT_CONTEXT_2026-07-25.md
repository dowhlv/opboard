# PROJECT_CONTEXT — opboard (2026-07-25)

Written for an LLM that has never seen this codebase and cannot run grep. Every
statement describes what the code *does*, verbatim where it matters. Where a file
or feature named in the task prompt does not exist, this document says so
explicitly.

"opboard" is a real-time operatory (dental chair) status board. A Node/Express +
socket.io server holds one shared in-memory `state` object, persists it to disk,
and broadcasts it to four browser views: a master admin tablet (`/`), a
front-desk tablet (`/frontdesk`), a waiting-room TV (`/tv`), and per-chair op
tablets (`/op/:num`). All views are single-file React components transpiled in
the browser by Babel standalone (no build step).

---

## SECTION 1 — FILE MAP

Line counts are exact (`wc -l`).

| File | Lines | What it is |
|------|------:|-----------|
| `server.js` | 601 | Express + socket.io server; shared state, persistence, history, daily reset, HTML templating with version stamp. |
| `public/index.html` | 25 | Master view entry point. Loads `master-tablet-preview.jsx`, renders `<MasterTablet>`. |
| `public/frontdesk.html` | 25 | Front-desk entry point. Loads `frontdesk-tablet-preview.jsx`, renders `<FrontDeskTablet>`. |
| `public/tv.html` | 25 | TV entry point. Loads `tv-preview.jsx`, renders `<TVDisplay>`. |
| `public/op.html` | 25 | Op-tablet entry point. Loads `op-tablet-preview.jsx`, renders `<OpTablet>`. |
| `public/master-tablet-preview.jsx` | 2052 | Master admin board. Provider columns, drag reassign/reorder, note+procedure editor, admin PIN menu, history, assignments, ready queue. Component `MasterTablet`. |
| `public/frontdesk-tablet-preview.jsx` | 1744 | Front-desk board. Same board layout as master minus admin menu; AWFA queue + 10-min stuck reminder + chime. Component `FrontDeskTablet`. |
| `public/tv-preview.jsx` | 746 | Read-only waiting-room display. Larger fonts, RDY banner, corner notification, procedure/appt badges. Component `TVDisplay`. |
| `public/op-tablet-preview.jsx` | 458 | Single-chair tablet keyed off `/op/:num`. Status/appt/note editing for one op; disabled/no-provider overlays. Component `OpTablet`. |
| `public/dentists-logo.webp` | (1620 B binary) | Clinic logo image, referenced as `/dentists-logo.webp` in all four views. |
| `package.json` | 9 | npm scripts + deps (express, socket.io). No build tooling. |
| `package-lock.json` | (38050 B) | Lockfile. |
| `.gitignore` | 7 | Ignores `node_modules/`, `*.old`, `*.log`, `state.json`, `history.json`, `.DS_Store`, `tmp/`. |
| `README.md` | 1 | Just `# opboard`. |
| `PROJECT_STATE.md` | (8722 B) | Prior project-state doc. **Not read for this document; do not modify per instructions.** |
| `DA_ASSIGNMENT_SPEC.md` | (19330 B) | Untracked spec describing a proposed "floater/DA assignment" feature. Describes future work; **not implemented in the code as of this snapshot** (see §8). |
| `tmp/phase2_recovery.js` | 157 | Test/scratch script. Gitignored. Not served, not required by server. |
| `tmp/phase2_sim.js` | 226 | Test/scratch script. Gitignored. |
| `tmp/server_test.js` | 601 | Test/scratch script. Gitignored. |

**Files named in the task prompt that are NOT present in the codebase:**
- `src/` directory — **not present in codebase.** All `.jsx` live only in `public/`.
- `manifest.json` — **not present in codebase.**
- `sw.js` (service worker) — **not present in codebase.** No PWA/service-worker registration exists anywhere.
- No other config files (no `.babelrc`, `webpack`, `vite`, `tsconfig`, `.env`, etc.) exist. Babel runs in-browser via CDN.

---

## SECTION 2 — SOURCE OF TRUTH

**There is no `src/` directory and there are no duplicated `.jsx` pairs.** Each
of the four views has exactly one `.jsx` file, all in `public/`. Nothing is
diverged because nothing is duplicated.

What the running app loads (each HTML file names exactly one JSX module via a
`?v={{VERSION}}` cache-buster, where `{{VERSION}}` is replaced server-side by the
git short hash — see §3):

| Route | HTML entry file | JSX it references | Component rendered |
|-------|-----------------|-------------------|--------------------|
| `/` and SPA fallback | `public/index.html` | `/master-tablet-preview.jsx` | `MasterTablet` |
| `/frontdesk` | `public/frontdesk.html` | `/frontdesk-tablet-preview.jsx` | `FrontDeskTablet` |
| `/tv` | `public/tv.html` | `/tv-preview.jsx` | `TVDisplay` |
| `/op/:num` | `public/op.html` | `/op-tablet-preview.jsx` | `OpTablet` |

All four HTML files are byte-for-byte identical except for three lines: the
`<title>`, the JSX `src`, and the `React.createElement(...)` component name. See
§6 for verbatim heads.

**Cross-file code duplication (relevant because there is no shared module):** the
following are copy-pasted into multiple JSX files rather than imported. They can
and do diverge:

- `ABBREV_PHRASES` + `abbreviateNote()` — present in all four JSX files. The op
  file's `abbreviateNote` does NOT call `condenseNote` (op has no `condenseNote`);
  master/frontdesk/tv all call `condenseNote` at the end.
- `condenseNote()` — present in master, frontdesk, tv. **Absent in op.**
- `FitText` — present in master, frontdesk, tv. **Absent in op** (op uses raw
  `-webkit-line-clamp`, see §4).
- `PROCEDURE_LIBRARY`, `APPT_PREPOPULATE`, `prepopulateFromApptTypes`,
  `applySaveTriggers`, `ProcedureChecklist` — present in master and frontdesk
  only. tv has `sortProcedures` and renders procedure badges but has no library/
  editor. op has none of these.
- `STATUSES` constant differs per file (see §5/§4): op includes an `inactive`
  entry with `numColor:"#555"`, tv/frontdesk include `inactive` with different
  colors, master's `INIT_STATUSES` has **no `inactive` entry** (its inactive
  styling is derived at render time). Status **labels also differ**: master/tv
  use `"In Progress"`/`"Vacant Clean"` etc. for the `treatment` key label but
  master's `abbr` for `treatment` is `"In Progress"`, while op/frontdesk/tv use
  `abbr:"Reserved"` for `treatment`. See §5 for the exact per-file values.
- `APPT_ABBR_MAP` — present in all four (identical values).

---

## SECTION 3 — SERVER (`server.js`)

Runtime: `express@^5.2.1`, `socket.io@^4.8.3`, Node built-ins `fs`, `http`,
`path`, `child_process`. Listens on **port 3000**, host `0.0.0.0` (line 600-601).

### Data directory & files
- `HISTORY_DIR = process.env.OPBOARD_DATA_DIR || '/var/lib/opboard'` (line 5).
  `npm run dev` sets `OPBOARD_DATA_DIR=$HOME/.opboard-data`.
- `STATE_FILE = ${HISTORY_DIR}/state.json` (line 7).
- `HISTORY_FILE = ${HISTORY_DIR}/history.json` (line 6).
- Directory is `mkdirSync(...,{recursive:true})` on boot (line 22-24).

### Version stamp
`SERVER_VERSION` = `git rev-parse --short HEAD` at startup (line 14), or
`t<base36 timestamp>` if git fails (line 16). Injected into every HTML response
by replacing `{{VERSION}}` (line 584) and broadcast in every state payload as
`version` (line 347). Clients snapshot the first `version` they see; on any later
mismatch they call `location.reload()` (present in all four JSX socket handlers).

### `state` object — full schema with defaults (lines 235-265)

```js
state = {
  ops: {},                        // { [opId]: OpRecord }  (see below)
  activeProviders:   ['Dr. Tang','Dr. Ngo','Jordan'],
  inactiveProviders: [],
  statuses: [ /* 6 status objects, see below */ ],
  apptTypes: ['NP','CCX','Tx','LOE','Delivery','Office Visit','Prophy','PMT','SRP'],
  historyRetentionDays: 120,
  adminPin: '4001',
  customAbbrevs: [],              // [{full, abbr}]
  providerDefaults: { 'Dr. Tang':'show','Dr. Ngo':'show','Jordan':'show' },
  providerColors:   { 'Dr. Tang':'#fff','Dr. Ngo':'#fff','Jordan':'#fff' },
  allOps: Array.from({length:14},(_,i)=>({id:i+1,enabled:true})),  // ops 1..14 all enabled
  readyPopupDismissed: {},        // { [opId]: dismissedAtMs }
  awfaPopupDismissed:  {},        // { [opId]: dismissedAtMs }
  opPin: '0063',                  // op tablet PIN (default); NOT enforced by any served JSX (see §8)
  queueOrder: [],                 // shared AWFA/ready ordering: [opId,...]
  providerOpOrder: {},            // { [provider]: [opId,...] } — resets daily
  lastResetDate: null,            // local 'YYYY-MM-DD' of last completed daily reset
  customProcedureTally: {},       // { procedureName(lowercased,trimmed): count } — persists across days
}
```

`state.statuses` (server default, lines 240-245) — six objects, each with keys
`key,label,abbr,numColor,bg,border,glow,menuBg,menuBorder,menuHover`. Example
first entry:
```js
{key:'ready', label:'Ready', abbr:'Ready', numColor:'#4ade80',
 bg:'rgba(34,197,94,0.12)', border:'rgba(34,197,94,0.45)',
 glow:'0 0 28px rgba(74,222,128,0.35)', menuBg:'rgba(34,197,94,0.18)',
 menuBorder:'rgba(34,197,94,0.6)', menuHover:'rgba(34,197,94,0.28)'}
```
Keys and labels in order: `ready`→"Ready", `treatment`→"In Progress",
`pending`→"Awaiting FA", `fa`→"Reviewing FA", `dirty`→"Vacant Dirty",
`awaiting`→"Vacant Clean".

**`OpRecord` shape** (created by `setOpProvider`, line 456; reset by `dailyReset`,
lines 190-201): `{ provider, status, apptTypes:[], note:'', procedures:[],
needsCheckout:false, ts, noteUpdatedAt }`. A `procedure` item is
`{code, name, done, doneAt, auto?}`. `ts` is always normalized to a number for
broadcast (line 349-350) and on load (line 70-73).

### Example `state.json` (illustrative — matches the schema the server writes)
```json
{
  "ops": {
    "1": { "provider": "Dr. Tang", "status": "ready", "apptTypes": ["NP"],
           "note": "14 Crn", "procedures": [
             {"code":"EXM","name":"Exam","done":true,"doneAt":1690000000000},
             {"code":"XRY","name":"X-Ray","done":false,"doneAt":null,"auto":true}],
           "needsCheckout": false, "ts": 1690000000000, "noteUpdatedAt": 1690000000000 },
    "2": { "provider": null, "status": "awaiting", "apptTypes": [], "note": "",
           "procedures": [], "needsCheckout": false, "ts": null, "noteUpdatedAt": null }
  },
  "activeProviders": ["Dr. Tang","Dr. Ngo","Jordan"],
  "inactiveProviders": ["OS"],
  "statuses": [ /* as above */ ],
  "apptTypes": ["NP","CCX","Tx","LOE","Delivery","Office Visit","Prophy","PMT","SRP"],
  "historyRetentionDays": 120,
  "adminPin": "4001",
  "customAbbrevs": [{"full":"crown","abbr":"Crn"}],
  "providerDefaults": {"Dr. Tang":"show"},
  "providerColors": {"Dr. Tang":"#4ade80"},
  "allOps": [{"id":1,"enabled":true}, {"id":2,"enabled":false}],
  "readyPopupDismissed": {"1": 1690000300000},
  "awfaPopupDismissed": {},
  "opPin": "0063",
  "queueOrder": [1,4],
  "providerOpOrder": {"Dr. Tang":[4,1]},
  "lastResetDate": "2026-07-25",
  "customProcedureTally": {"night guard reline": 3}
}
```

`history.json` is a flat array of `{ ts, op, status, apptTypes, provider }`
(appended by `logHistory`, line 163).

### Persistence / robustness
- `loadState()` (44-117): merges saved data **into** defaults (defaults-first
  merge, line 53-57) so new default fields survive. Type-guards each top-level
  array/object field and resets a corrupt one to default (62-68). Normalizes
  `ts` to number (70-73). One-shot idempotent migration: appt-type label
  `"Treatment"` → `"Tx"` (74-88). If the parsed file has an invalid shape (ops
  missing/not object) or JSON parse fails, the corrupt file is **renamed aside**
  (`preserveCorruptFile`, 30-42) and defaults are booted; a permission error
  logs guidance and boots defaults without renaming.
- `writeFileAtomic()` (122-135): write to `<file>.tmp`, `fsync`, `rename` over
  target, then `fsync` the directory (crash-safe on SD card).
- `saveState()` (139-147): debounced, at most once per **2000 ms**.
- `flushAndExit()` on SIGTERM/SIGINT (554-563): clears the debounce and writes
  synchronously before `process.exit(0)`.
- `uncaughtException` / `unhandledRejection` handlers just log; process stays
  alive (567-572).
- `cleanupOnStartup()` (301-343): heals "zombie" ops (provider null but non-reset
  fields), prunes stale `readyPopupDismissed`/`awfaPopupDismissed`/`queueOrder`.
- `enforceOpInvariant(op)` (278-297): invariant is *provider===null ⇒
  status='awaiting', empty apptTypes/note/procedures, needsCheckout=false, no
  popup-dismissed entries, and op removed from every `providerOpOrder` array*.
  Called at the tail of every op-mutation handler.

### Config validation rules (socket setters)
Every op-id is validated by `isValidOp` (269-273): positive integer that exists
in `state.allOps`. Config setters reject wrong-typed payloads *before* storing:
- `setStatuses`/`setApptTypes`/`setAllOps`/`setCustomAbbrevs`: require `Array.isArray` (477-484).
- `setProviderDefaults`/`setProviderColors`: require plain object (`isPlainObj`, 476, 482-483).
- `setProviders`: requires both `activeProviders` and `inactiveProviders` arrays; then unassigns any op held by a provider no longer in either list (434-453).
- `setQueueOrder`: filters to valid ops and maps to Number (508).
- `setProviderOpOrder`: requires `provider` truthy and `order` array (509-514).
- `logCustomProcedure`/`removeCustomProcedureEntry`: require `name` string; key is `name.trim().toLowerCase()` (487-507).

### Socket.io events — full inventory
All handlers are wrapped by `on()` (379-382), which supplies a default `{}`
payload and try/catches the body so one bad message can't crash the process.
Direction is **C→S** (client emits, server handles) unless noted. Every mutating
handler ends with `saveState(); broadcastState();`.

**Server → all clients:**
- `state` (broadcast) — full normalized state + `version`; `ops[*].ts` coerced
  to Number. Emitted on connect (374), on `requestState`, and after every
  mutation (`broadcastState`, 346-352).

**Client → server (handled in `io.on('connection')`, 372-551):**

| Event | Payload | Effect / mutation |
|-------|---------|-------------------|
| `requestState` | `{}` | Re-broadcasts full state to all. |
| `setStatus` | `{op,status}` | Sets `ops[op].status`, `ts=Date.now()`. If status ∈ {`awaiting`,`inactive`} clears apptTypes/note/procedures/needsCheckout. Enforces invariant, logs history. |
| `setApptType` | `{op,apptTypes}` | Sets `ops[op].apptTypes` (array). |
| `setNote` | `{op,note}` | Sets `ops[op].note`, `noteUpdatedAt=Date.now()`. |
| `setProcedures` | `{op,procedures}` | Sets `ops[op].procedures` (array). |
| `setNeedsCheckout` | `{op,value}` | Sets `ops[op].needsCheckout=!!value`. |
| `setProviders` | `{activeProviders,inactiveProviders}` | Replaces both provider lists; unassigns ops of unknown providers. |
| `setOpProvider` | `{op,provider,status?,apptTypes?,note?}` | Creates op record if missing; sets provider; optionally status/apptTypes/note; if BOTH apptTypes and note are passed also clears procedures+needsCheckout (fresh patient). `ts=Date.now()`. |
| `setStatuses` | `{statuses}` | Replaces `state.statuses` (array-checked). |
| `setApptTypes` | `{apptTypes}` | Replaces `state.apptTypes`. |
| `setAllOps` | `{allOps}` | Replaces `state.allOps`. |
| `setOpPin` | `{pin}` | Sets `state.opPin` (no type check). |
| `setAdminPin` | `{pin}` | Sets `state.adminPin` (no type check). |
| `setProviderDefaults` | `{defaults}` | Replaces `state.providerDefaults` (object-checked). |
| `setProviderColors` | `{colors}` | Replaces `state.providerColors` (object-checked). |
| `setCustomAbbrevs` | `{abbrevs}` | Replaces `state.customAbbrevs`. |
| `logCustomProcedure` | `{name}` | `customProcedureTally[key]++`. |
| `clearCustomProcedureTally` | `{}` | Empties tally. |
| `removeCustomProcedureEntry` | `{name}` | Deletes one tally key. |
| `setQueueOrder` | `{order}` | Sets `state.queueOrder` (valid ops only). |
| `setProviderOpOrder` | `{provider,order}` | Sets `state.providerOpOrder[provider]=order`. |
| `reassignOp` | `{op,provider}` | Changes ONLY provider (preserves ts/status/apptTypes/note); enforces invariant. |
| `noteLock` | `{op,by}` | Records `lockedOp` for this socket; `socket.broadcast.emit('noteLock',{op,by})` to **other** clients only. |
| `noteUnlock` | `{op}` (op may be undefined) | Clears this socket's lock if it matches; `socket.broadcast.emit('noteUnlock',{op})` to others. |
| `dismissReadyPopup` | `{op}` | `readyPopupDismissed[op]=Date.now()`. |
| `clearReadyPopupDismissed` | `{op}` | Deletes `readyPopupDismissed[op]`. |
| `dismissAwfaPopup` | `{op}` | `awfaPopupDismissed[op]=Date.now()`. |
| `clearAwfaPopupDismissed` | `{op}` | Deletes `awfaPopupDismissed[op]`. |
| `disconnect` | — | If socket held a note lock, broadcasts `noteUnlock` for it. |

**Server → other clients (relayed, not stored):** `noteLock {op,by}`,
`noteUnlock {op}` (via `socket.broadcast.emit`).

### REST endpoints (574-598)
- `GET /` → `sendHtml('index.html')`
- `GET /frontdesk` → `sendHtml('frontdesk.html')`
- `GET /tv` → `sendHtml('tv.html')`
- `GET /op/:num` → `sendHtml('op.html')` (the `:num` is read client-side from the URL, not by the server)
- `express.static(public, {index:false})` — serves JSX/images/socket.io client. `index:false` prevents raw HTML with unreplaced `{{VERSION}}`.
- `GET /{*path}` (SPA fallback) → `sendHtml('index.html')`

`sendHtml(htmlFile)` (578-587): reads the file, sets `Content-Type: text/html`,
`Cache-Control: no-store`, replaces all `{{VERSION}}` with `SERVER_VERSION`,
sends. No other REST/JSON endpoints exist.

### Midnight reset behavior
- `scheduleNextDailyReset()` (225-234): schedules a `setTimeout` for the next
  **00:01 local time**, recomputed each run to avoid drift. On fire it runs
  `pruneHistory()` then `dailyReset()` then re-schedules.
- `dailyReset()` (188-208): for every op **except those with status `dirty`**,
  clears provider→null, status→`awaiting`, apptTypes→[], note→'', procedures→[],
  needsCheckout→false, ts→null, noteUpdatedAt→null. Also empties
  `providerOpOrder` and sets `lastResetDate` to today's local `YYYY-MM-DD`. Saves
  and broadcasts. (`dirty` ops are intentionally preserved.)
- `pruneHistory()` (169-182): drops history entries older than
  `historyRetentionDays` (default 120) days.
- `catchUpDailyReset()` (212-223, called at 366 after `io` exists): on startup,
  if `lastResetDate !== today` and the clock is already past 00:01, runs
  `pruneHistory()` + `dailyReset()` so a reset missed while the server was down
  still happens.

---

## SECTION 4 — VIEWS

### 4.1 Master (`/`) — `MasterTablet` (master-tablet-preview.jsx)

**Design canvas: 1340 × 800** (`ScaledWrapper designW={1340} designH={DESIGN_H}`,
`DESIGN_H=800`, line 1299; `S.root` is `1340px × 800px`, line 2023).

**Verbatim `ScaledWrapper` (lines 101-114):**
```jsx
function ScaledWrapper({children,designW=1340,designH=800}){
  const[scale,setScale]=useState(1);
  useEffect(()=>{
    const u=()=>setScale(Math.min(window.innerWidth/designW,window.innerHeight/designH));
    u();window.addEventListener("resize",u);return()=>window.removeEventListener("resize",u);
  },[designW,designH]);
  return(
    <div style={{width:"100vw",height:"100vh",overflow:"hidden",background:"#0a0a0c",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div data-scaled-inner style={{width:designW,height:designH,transform:`scale(${scale})`,transformOrigin:"center center",flexShrink:0,position:"relative"}}>
        {children}
      </div>
    </div>
  );
}
```

**Per-column sizing helpers** (computed inside the `providerCols.map`, lines
1360-1365, `n` = number of active provider columns):
- `numSz = clamp(75px, ${16.25/n}vw, 200px)` — op number
- `bdgSz = clamp(18px, ${3.02/n}vw, 45px)` — appt badge letters
- `notSz = clamp(36px, ${5.4/n}vw, 66px)` — note (parsed min px → `FitText` `maxSz`)
- `timSz = clamp(11px, ${1.38/n}vw, 17.5px)` — elapsed timer
- `namSz = clamp(22px, ${4.5/n}vw, 58px)` — provider name
- `apptW = calc(${bdgSz} * 1.75)` — appt badge column width
- Appt letter shrink multipliers by count (line 1509): `>8 → ×0.35`, `>6 → ×0.4`, `>4 → ×0.5`, `>2 → ×0.65`, else `bdgSz`.
- `S.headerTitle` fixed `28px` (line 2025).

**Named font-size constants / style objects** (`S`, lines 2022-2034):
`headerTitle 28px`; card `borderRadius 9px`; misc modal fonts are inline literals.

**Overflow / clamp / nowrap / line-clamp flags (master):**
- `S.root` `overflow:"visible"` (2023) — note: master root is *visible*, unlike FD/TV which are hidden.
- Card `overflow:"hidden"` (inline, line 1421). Cards are the drag/reorder overlay containers.
- `whiteSpace:"nowrap"` on elapsed timer (1470) and procedure badges (1532), provider name via `S.provName`? (no — `provName` has no nowrap).
- `-webkit-line-clamp`: **via `FitText`** for the note (lines 1539-1553). `FitText` (685-713) uses `display:"-webkit-box"`, `WebkitBoxOrient:"vertical"`, `WebkitLineClamp:maxRows` (default 3) and JS-shrinks `font-size` until content fits — it **never truncates**. The note IS FitText.
- No `text-overflow:ellipsis` in master.

### 4.2 Front Desk (`/frontdesk`) — `FrontDeskTablet` (frontdesk-tablet-preview.jsx)

**Design canvas: 1340 × 800** (`ScaledWrapper designW={1340} designH={800}`, line
1168; `S.root` 1340×800, line 1719).

**Verbatim `ScaledWrapper` (line 107, single line in source):**
```jsx
function ScaledWrapper({children,designW=1340,designH=800}){const[scale,setScale]=useState(1);useEffect(()=>{const u=()=>setScale(Math.min(window.innerWidth/designW,window.innerHeight/designH));u();window.addEventListener("resize",u);return()=>window.removeEventListener("resize",u);},[designW,designH]);return(<div style={{width:"100vw",height:"100vh",overflow:"hidden",background:"#0a0a0c",display:"flex",alignItems:"center",justifyContent:"center"}}><div data-scaled-inner style={{width:designW,height:designH,transform:`scale(${scale})`,transformOrigin:"center center",flexShrink:0}}>{children}</div></div>);}
```

**Per-column sizing helpers** (lines 1238-1243) — identical formulas to master:
`numSz clamp(75px,${16.25/n}vw,200px)`, `bdgSz clamp(18px,${3.02/n}vw,45px)`,
`notSz clamp(36px,${5.4/n}vw,66px)`, `timSz clamp(11px,${1.38/n}vw,17.5px)`,
`namSz clamp(22px,${4.5/n}vw,58px)`, `apptW calc(${bdgSz} * 1.75)`. Appt letter
shrink multipliers identical (line 1378). `S.headerTitle` fixed `22px` (1721).
Reminder popup uses its own clamps (see §5, lines 1503-1509):
`clamp(20px,3vw,32px)`, `clamp(80px,14vw,140px)`, `clamp(24px,4vw,40px)`,
`clamp(18px,2.5vw,28px)`, `clamp(14px,2vw,20px)`. `CornerNotification` (unused in
FD render path? it is defined 354-420) uses clamps; `NO OPS ASSIGNED`
`clamp(16px,2vw,28px)` (1257).

**Overflow / clamp / nowrap / line-clamp flags (frontdesk):**
- `S.root` `overflow:"hidden"` (1719); `css` sets `html,body{overflow:hidden}` (1733).
- Card `overflow:"hidden"` (1297).
- `whiteSpace:"nowrap"` on timer (1344), procedure badges (1403), offline banner span (1176).
- Note uses **`FitText`** (1410-1420) → `-webkit-line-clamp` (maxRows 3). The note IS FitText.
- `CornerNotification` note span uses `overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"` (397-398) — that component exists but is not mounted in the FD return tree (FD uses the bottom `activePopup` banner + `currentAwfaPopup` full-screen modal instead).

### 4.3 TV (`/tv`) — `TVDisplay` (tv-preview.jsx)

**Design canvas: 1920 × 1080** (`ScaledWrapper designW={1920} designH={1080}`,
line 507; `S.root` 1920×1080, line 699).

**Verbatim `ScaledWrapper` (lines 184-198):**
```jsx
function ScaledWrapper({ children, designW = 1920, designH = 1080 }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth/designW, window.innerHeight/designH));
    update(); window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [designW, designH]);
  return (
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden", background:"#080a0c", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:designW, height:designH, transform:`scale(${scale})`, transformOrigin:"center center", flexShrink:0 }}>
        {children}
      </div>
    </div>
  );
}
```
(Note: TV's ScaledWrapper does **not** add `data-scaled-inner` and has no
`position:relative` on the inner div — it has no drag system.)

**Per-column sizing helpers** (inside `providerCols.map`, lines 576-585). Let
`safeN=Math.max(n,1)`, `maxRooms=Math.max(rooms.length,3)`, `rowScale=3/maxRooms`:
- `numSize  = clamp(60px, ${15/safeN*rowScale}vw, 480px)` — op number
- `badgeSize = clamp(33px, ${14.4/safeN*rowScale}vw, 240px)` — (declared; used indirectly)
- `apptSize = clamp(20px, ${4.4/safeN*rowScale}vw, 120px)` — appt badge letters
- `noteSize = clamp(20px, ${5/safeN*rowScale}vw, 60px)` — note; its parsed max px seeds `FitText` `maxSz`
- `timerSize = clamp(14px, ${2/safeN*rowScale}vw, 50px)` — elapsed
- `nameSize = clamp(24px, ${5/safeN}vw, 72px)` — provider name (no `rowScale`)
- Appt letter shrink multipliers by count (line 630): `>8 → ×0.3`, `>6 → ×0.4`, `>4 → ×0.45`, `>2 → ×0.55`, else `×0.85`.
- Procedure badges: **fixed** `clamp(20px,2vw,28px)` (line 643).
- `S.headerTitle` `clamp(24px,3.2vw,48px)` (line 701).
- Corner notification (`CornerNotification`, 348-414) uses clamp fonts:
  `clamp(11px,1.2vw,16px)`, `clamp(10px,1vw,13px)`, `clamp(40px,6vw,80px)`,
  `clamp(14px,1.5vw,20px)`, `clamp(11px,1.1vw,14px)`, `clamp(9px,0.9vw,12px)`.
- Header datetime `clamp(14px,1.4vw,22px)` (533). `NO OPS ASSIGNED` `clamp(16px,2vw,28px)` (592).

**Overflow / clamp / nowrap / line-clamp flags (tv):**
- `S.root` `overflow:"hidden"` (699); `css` `html,body{overflow:hidden}` (716).
- Card `overflow:"hidden"` (`S.card`, 710) and the inner tile row `overflow:"hidden"` (615, 623).
- `whiteSpace:"nowrap"` on timer (619) and procedure badges (643).
- Corner-notification note span: `overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"` (391-392).
- Note uses **`FitText`** (line 650) → `-webkit-line-clamp` (maxRows 3). The note IS FitText.

### 4.4 Op (`/op/:num`) — `OpTablet` (op-tablet-preview.jsx)

**Design canvas: 390 × 844** (`ScaledWrapper designW={390} designH={844}`, line
192; inner card fixed `390px × 844px`, line 193). This is the only portrait
canvas.

**Verbatim `ScaledWrapper` (lines 35-56):**
```jsx
function ScaledWrapper({designW,designH,children}){
  const [scale,setScale]=useState(1);
  const ref=useRef(null);
  useEffect(()=>{
    const update=()=>{
      if(!ref.current)return;
      const{width:w,height:h}=ref.current.getBoundingClientRect();
      setScale(Math.min(w/designW,h/designH));
    };
    update();
    const ro=new ResizeObserver(update);
    if(ref.current)ro.observe(ref.current);
    return()=>ro.disconnect();
  },[designW,designH]);
  return(
    <div ref={ref} style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0a0c',overflow:'hidden'}}>
      <div style={{width:designW,height:designH,transform:`scale(${scale})`,transformOrigin:'center center',position:'relative',flexShrink:0}}>
        {children}
      </div>
    </div>
  );
}
```
**Op's `ScaledWrapper` is the only one that uses `ResizeObserver`** (all three
others use a `window` "resize" listener). It has no `designW`/`designH` defaults.

**Named font-size constants (op):** op has no `S` style object and no per-column
helpers — all sizes are inline literal `px`. Notable fixed values: op number
`96px` (240), status label `28px` (249), elapsed `20px` (257), appt badge `16px`
(270), note `15px` (288), overlay op number `72px` (438), overlay heading `28px`
(443). Header date `12px`/time `14px` (211/215). Provider name `22px` (226).

**Overflow / clamp / nowrap / line-clamp flags (op):**
- ScaledWrapper outer `overflow:'hidden'` (50); main card `overflow:'hidden'` (194).
- `whiteSpace:'nowrap'` on header date/time (212/216), appt badge span (273), toast (427).
- **Note uses raw `-webkit-line-clamp` (NOT FitText):** lines 288-293 —
  `display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
  overflow:'hidden'`, `maxWidth:'300px'`. Op is the **only view whose note can
  truncate** (2-line clamp, no auto-shrink). `FitText` does not exist in this file.
- No `text-overflow:ellipsis`, no `clamp()` CSS function anywhere in op (all sizes are fixed px).

---

## SECTION 5 — USER-VISIBLE STRINGS (exhaustive inventory)

Format: `file:line — "string"`. Dynamic template pieces shown with `{...}`.
Excludes CSS color/font tokens and non-rendered constants except where the
literal is what the user reads.

### Shared status abbreviations (rendered as legend/menu/board labels)
- Master `INIT_STATUSES` abbr (118-123): `"Ready"`, `"In Progress"`, `"Awaiting FA"`, `"Reviewing FA"`, `"Dirty"`, `"Clean"`. Labels: `"Ready"`,`"In Progress"`,`"Awaiting FA"`,`"Reviewing FA"`,`"Vacant Dirty"`,`"Vacant Clean"`.
- Frontdesk `STATUSES` abbr (110): `"Ready"`,`"Reserved"`,`"Awaiting FA"`,`"Reviewing FA"`,`"Dirty"`,`"Clean"`,`"Not In Use"`.
- TV `STATUSES` (202-208): abbr `"Ready"`,`"Reserved"`,`"Awaiting FA"`,`"Reviewing FA"`,`"Dirty"`,`"Clean"`,`"Not In Use"`; labels include `"Vacant Dirty"`,`"Vacant Clean"`,`"Not in Use"`.
- Op `STATUSES` (67-73): abbr `"Ready"`,`"Reserved"`,`"Awaiting FA"`,`"Reviewing FA"`,`"Dirty"`,`"Clean"`,`"Not In Use"`.
- Appt type option labels (all files): `"NP"`,`"CCX"`,`"Tx"`,`"LOE"`,`"Delivery"`,`"Office Visit"`,`"Prophy"`,`"PMT"`,`"SRP"`. Board abbreviations via `APPT_ABBR_MAP`: `TX,DEL,OV,PRO` etc.

### master-tablet-preview.jsx
- 257 `"STATUS HISTORY"`; 258 `"Average Time Elapsed"`; 210 tabs `"Today"`,`"7 Days"`,`"30 Days"`,`"Custom"`; 275 `"START"`; 282 `"END"`; 303 `"—"`; 310 `"Close"`.
- 327 `"CUSTOM PROCEDURE LOG"`; 328 `"Review monthly to identify procedures to add to the main checklist"`; 331 `"No custom procedures logged yet"`; 337 `"Remove this entry?"`; 339 `"CANCEL"`; 341 `"REMOVE"`; 357 `"Are you sure you want to clear all entries?"`; 360 `"CANCEL"`; 362 `"CONFIRM CLEAR"`; 369 `"Go Back"`; 373 `"Clear Log"`.
- 398 `"APPT TYPE · OP {op}"`; 401 `"Tap to select"`; 432 `"CANCEL"`; 436 `"✓ DONE"`.
- 462 `"↕"` (drag glyph); 470 `"Edit"`; 471 `"✓"`; 472 `"✕"`; 479 placeholder `"New item name..."`; 482 `"+ ADD"`.
- 504 `"ADMIN ACCESS"`; 505 `"ENTER PIN TO CONTINUE"`; 511 placeholder `"····"`; 513 `"Incorrect PIN"`; 515 `"UNLOCK"`.
- 524-530 admin menu items: `"Edit Ops"`/"Enable or disable operatory rooms"; `"Edit Providers"`/"Add, remove, rename and reorder providers"; `"Edit Status"`/"Add, remove, rename and reorder statuses"; `"Edit Appt Types"`/"Add, remove, rename and reorder appointment types"; `"Edit Colors"`/"Customize status and appt type colors"; `"Status History"`/"View historical status timeline"; `"Custom Procedure Log"`/"Review custom-typed procedures to promote to the checklist".
- 538 `"≡ ADMIN MENU"`; 539 `"✕"`; 551 `"›"`.
- 561 `"← Back"`.
- 572 `"⊟ EDIT OPS"`; 573 `"Toggle ops on/off. Disabled ops won't appear in Assignments."`; 587 `"Green = active · Grey = disabled"`.
- 600 `"👤 EDIT PROVIDERS"`; 601 `"Drag ↕ to reorder · Click Edit to rename · ✕ to remove"`; 603 `"ACTIVE"`; 608 `"INACTIVE"`.
- 620 `"◈ EDIT STATUS"`; 621 same drag hint.
- 632 `"📋 EDIT APPT TYPES"`; 633 drag hint.
- 644 `"🎨 EDIT COLORS"`; 645 `"Click a color swatch to change it"`; 646 `"statuses"`.
- 674 `"SOMETHING WENT WRONG"`; 675 `"An unexpected error occurred"` (fallback); 676 `"TAP TO RELOAD"` (ErrorBoundary).
- 748 `"DONE"`/`"PENDING"` (procedure row state); 753 `"✕"`; 762 `"+ Add procedure"`; 772 group labels uppercased (EXAM/DIRECT/INDIRECT/REMOVABLE/ANESTHESIA); 769 section names (GP/HYG/OS/Endo/Ortho/X-Ray); 785-786 procedure code+name; 798 `"OTHER"`; 803 placeholder `"Custom procedure…"`; 806 `"+ ADD"`; 811 `"✕ Close"`.
- Procedure library names (128-140), rendered in the picker: Exam, Probe, Fill, Curodont, Sealant, Enamelplasty, Bite Adjust, Crown, Bridge, Inlay, Onlay, Indirect Del, Temporary, Recement, Nightguard Scan, Retainer Scan, Denture Scan, Wax Rims, Framework, Try-in w/ Teeth, Denture Delivery, RPD Delivery, NG Delivery, Adjust, Anesthetize, Prophy, Polish, Scaling & RP, Perio Maintenance, Adjunct, Arrestin, Ext+Graft+Mem, Extraction, Graft+Mem, Suture, Implant, 2nd Stage, Implant Crown Scan, Pulp Debride, Spark Consult, Spark Attachment, Aligner Delivery, X-Ray, CBCT, Bitewing, Periapical, Intra-oral Photos.
- 1308 `"PATIENT BOARD"`; 1309 `"MAIN"`.
- 1327 `"⚠ READY"`; 1331 `"OP {op}"`; 1342 `"+{n} MORE"`; 1352 `"VIEW QUEUE"`.
- 1379 `"NO OPS ASSIGNED"`.
- 1495 `"—"` (empty appt badge); 1540 note fallback `"Procedures & Note"`; 1572/1579 `"NEEDS CHECKOUT"`.
- 1601 `"ASSIGNMENTS"` (footer button); 1604 `"≡"` (menu button).
- 1618 `"STATUS · OP {op}"`; 1635 `"✓"`; 1644 `"CANCEL"`.
- 1657 `"NOTE · OP {op}"`; 1664 `"Clear Procedures"`; 1686 placeholder `"Enter note..."`; 1691 `"Cancel"`; 1693 `"SAVE"`.
- 1723 `"ASSIGNMENTS"` (modal title); 1727 `"ACTIVE PROVIDERS"`; 1734 title `"Inactivate {p}"`; 1737 `"−"`; 1775 `"INACTIVE PROVIDERS"`; 1777 `"None"`; 1790 `"CANCEL"`; 1811 `"ACCEPT"`.
- 1824 `"Move Op {op} from {from} to {to}?"`; 1828 `"DECLINE"`; 1830 `"CONFIRM"`.
- 1842 `"Transfer Op {op}?"`; 1845 `"Currently assigned to"`; 1852 `"DECLINE"`; 1853 `"CONFIRM"`.
- 1873 `"Inactivate/Activate {name}?"`; 1877-1878 `"This provider will be removed/added from/to the operatory status board."`; 1882 `"DECLINE"`; 1883 `"CONFIRM"`.
- 1971 `"READY QUEUE"`; 1972 `"BACK"`; 1974 `"DRAG ↕ TO REORDER URGENCY · STATUS CHANGE REMOVES OP FROM QUEUE"`; 1976 `"No ops ready"`; 1998 `"↕"`; 1999 `"OP {op}"`; 2001 `"{n}m"`.
- 2012 `"READY"`; 2013 `"OP {op}"`; 2014 `"TAP TO DISMISS"`.
- 1523 note toast `"🔒 In use"`.

### frontdesk-tablet-preview.jsx
- 193 `"STATUS HISTORY"`; 194 `"Average Time Elapsed"`; 198 tabs `"Today/7 Days/30 Days/Custom"`; 211 `"START"`; 218 `"END"`; 239 `"—"`; 246 `"Close"` (HistoryModal, same as master).
- 267 `"APPT TYPE · OP {op}"`; 270 `"Tap to select"`; 301 `"CANCEL"`; 305 `"✓ DONE"` (ModalMenu).
- 339 `"↕"`; 342 `"AWAITING FA"`/`"READY"`; QueueItem shows `"Op {op}"`.
- 374 `"⚠ {statusLabel}"`; 383 `"Op {op}"`; 407 `"TAP TO DISMISS"`; 414 `"+{n} MORE"` (CornerNotification — defined but not mounted).
- 486 `"DONE"`/`"PENDING"`; 500 `"+ Add procedure"`; 536 `"OTHER"`; 541 placeholder `"Custom procedure…"`; 544 `"+ ADD"`; 549 `"✕ Close"` (ProcedureChecklist — identical library to master).
- 1176 `"⚠ OFFLINE · DOWN SINCE {time} ⚠"`.
- 1184 `"PATIENT BOARD"`; 1185 `"FRONT DESK"`.
- 1207 `"⚠ AWAITING FA"` / `"✓ READY"`; 1211 `"OP {op}"`; 1222 `"+{n} MORE"`; 1231 `"VIEW QUEUE"`.
- 1257 `"NO OPS ASSIGNED"`; 1368 `"—"`; 1411 note fallback `"Procedures & Note"`; 1439/1446 `"NEEDS CHECKOUT"`.
- 1467 legend abbrs; 1473 `"◎ HISTORY"`; 1474 `"⚡ QUEUE ({n})"`.
- 1503 `"⚠ REMINDER"` (+` ({n} PENDING)` when count>1); 1505 `"Op {op}"`; 1507 `"{statusLabel}"`; 1508 `"{elapsed} — NO CHANGE"`; 1509 `"TAP TO DISMISS"`.
- 1394 note toast `"🔒 In use"`; showToast values e.g. 726 `"✓ Op {op} → {statusLabel}"`.
- 1532 `"NOTE · OP {op}"`; 1538 `"Clear Procedures"`; 1564 placeholder `"Add a note..."`; 1567 `"Board:"` + preview; 1568 `"{n}/40"`; 1573 `"CANCEL"`; 1584 `"SAVE NOTE"`.
- 1602 `"STATUS · OP {op}"`; 1619 `"✓"`; 1628 `"CANCEL"`.
- 1654 `"AWAITING FA"/"READY"` + `" QUEUE"`; 1656 `"← BACK"`; 1658 `"DRAG ↕ TO REORDER URGENCY · STATUS CHANGE REMOVES OP FROM QUEUE"`.
- 1690 `"AWAITING FA"`; 1691 `"OP {op}"`; 1692 `"TAP TO DISMISS"`.
- 1703 `"Move Op {op} from {from} to {to}?"`; 1707 `"DECLINE"`; 1709 `"CONFIRM"`.

### tv-preview.jsx
- 310 `"➡"` (swipe arrows, QueueItem — component defined but the TV render tree does not mount `QueueItem`; TV shows banners/modals only).
- 321 `"↕"`; 326 `"Op {op}"`; 328 `"AWAITING FA"/"PATIENT READY FOR TX"` (QueueItem, not mounted).
- 369 `"⚠ {statusLabel}"`; 383 `"Op {op}"`; 401 `"TAP TO DISMISS"`; 408 `"+{n} MORE"` (CornerNotification — defined; not mounted in TV return tree).
- 517 `"OFFLINE · DOWN SINCE {time}"` (with ⚠ glyphs 515/519).
- 527 `"PATIENT BOARD"`; 528 `"TV"`.
- 553 `"⚠ READY"`; 557 `"OP {op}"`; 561 `"{n}m"`; 569 `"+{n} MORE"` (RDY banner).
- 592 `"NO OPS ASSIGNED"`; 635 `"—"` (empty appt badge); 663 `"NEEDS CHECKOUT"`.
- 680 status legend abbrs.
- 688 `"READY"`; 689 `"OP {op}"` (full-screen ready modal).

### op-tablet-preview.jsx
- 242 `"Op {OP_NUMBER}"`; 251 status abbr; 259 elapsed; 279 `"tap to add appt type"`; 292 `"tap to add note..."`.
- 300 `"TAP STATUS OR APPT TYPE TO CHANGE"`.
- 310 `"SELECT STATUS"`; 325 `"✓"`.
- 341 `"APPT TYPE · TAP TO TOGGLE"`; 343 `"Selected: {list}"` / `"None"`; 371 `"CLEAR"`; 377 `"✓ DONE"`.
- 390 `"NOTE · OP {OP_NUMBER}"`; 398 placeholder `"Add a note..."`; 401 `"Board:"` + preview; 405 `"{n}/40"`; 412 `"CANCEL"`; 416 `"SAVE NOTE"`.
- 429 toast (`"✓ …"` values from 137/155/373).
- 441 `"OP {OP_NUMBER}"`; 445 `"OPERATORY INACTIVE"` / `"AWAITING ASSIGNMENT"`; 450-451 `"This operatory is currently disabled. Enable it from the Master tablet to begin using it."` / `"A provider must be assigned to this operatory before staff can update its status. Assign from Master → Assignments."`.
- Header image `alt="Dentists of West Henderson"` (206) — appears in all four views' logo `<img>`.

### HTML `<title>` strings (rendered in browser tab)
- index.html:6 `"Opboard - Main"`; frontdesk.html:6 `"Opboard - Front Desk"`; tv.html:6 `"Opboard - TV"`; op.html:6 `"Opboard - Op"`. Op also sets `document.title = "Opboard - Op {N}"` at runtime (op jsx line 107).

---

## SECTION 6 — HTML HEADS (verbatim) + manifest

**`public/index.html` `<head>` (lines 3-12):**
```html
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Opboard - Main</title>
  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0a0a0c;overflow:hidden;}</style>
</head>
```

**`public/frontdesk.html` `<head>` (lines 3-12):** identical to index except:
```html
  <title>Opboard - Front Desk</title>
```

**`public/tv.html` `<head>` (lines 3-12):** identical to index except:
```html
  <title>Opboard - TV</title>
```

**`public/op.html` `<head>` (lines 3-12):** identical to index except:
```html
  <title>Opboard - Op</title>
```

All four use React 18.3.1 (development build), ReactDOM 18.3.1 (development),
`@babel/standalone@7.24.7`, and the socket.io client served at
`/socket.io/socket.io.js`. There are **no** `<link rel="manifest">`,
`<link rel="icon">`, theme-color meta, or apple-touch tags. The Google Fonts
stylesheet (`Bebas Neue` + `DM Sans`) is injected from inside each JSX component
body (a `<link>` rendered into the DOM), not from `<head>`.

**`manifest.json`: not present in codebase.** No web app manifest exists.

---

## SECTION 7 — DEPLOYMENT

The systemd service `opboard` runs `node server.js` (per `package.json` `start`).
The version stamp / cache-busting design dictates what a change requires:

**Requires `sudo systemctl restart opboard` (server process reload):**
- Any edit to `server.js` (all server logic, state schema, socket handlers, REST routes, reset schedule).
- `package.json` / dependency changes.
- Anything that must change `SERVER_VERSION` deterministically at process start (the git hash is captured once at boot, line 14).

**Requires only a browser refresh (no restart), BUT note the auto-reload chain:**
- Editing a `public/*.jsx`, `public/*.html`, or `dentists-logo.webp` does **not**
  require a restart to be *served* (static middleware serves files fresh from
  disk; HTML is sent with `Cache-Control: no-store`, line 583). However, open
  clients only pick up new JSX when the `?v={{VERSION}}` query changes, and
  `{{VERSION}}` is the git hash captured at **server boot**. So:
  - If you edit JSX/HTML **without committing and without restarting**, a manual
    browser **hard refresh** of each device loads the new file (the HTML itself
    is `no-store`, and the JSX `?v=` is unchanged so the browser may serve a
    cached JSX — a hard refresh bypasses that).
  - The automatic cross-device reload (`location.reload()` on version mismatch)
    only fires when `SERVER_VERSION` changes, which requires a **new git commit
    + restart** (or a restart that recomputes the timestamp fallback). Without a
    restart, `SERVER_VERSION` is unchanged and connected tablets will not
    auto-reload.

Net: **JSX/HTML/asset content edits are picked up by a hard browser refresh
alone; to force every connected tablet to auto-reload, commit and
`sudo systemctl restart opboard` so the broadcast `version` changes.**

---

## SECTION 8 — KNOWN ISSUES / DEFERRED (current state)

- **`DA_ASSIGNMENT_SPEC.md` describes unimplemented work.** It specifies a
  "FLOATER: <name>" header subtitle and a DA (dental assistant) assignment
  system. No served JSX renders a "FLOATER" subtitle — all three board headers
  render fixed subtitles `MAIN` / `FRONT DESK` / `TV` (master 1309, frontdesk
  1185, tv 528). This feature is not built.
- **`opPin` is stored and settable server-side (`setOpPin`) but never enforced.**
  No served JSX reads `state.opPin` or presents an op-tablet PIN gate. `MASTER_PIN`
  in master is a **hardcoded client constant `"4001"`** (line 489) used by the
  admin PIN screen; it does **not** read `state.adminPin` (also default `"4001"`).
  Changing `state.adminPin` via `setAdminPin` has no effect on the master admin gate.
- **`master` `INIT_STATUSES` has no `inactive` entry** (lines 118-123); the six
  statuses are ready/treatment/pending/fa/dirty/awaiting. Inactive rendering in
  master is derived (`status==="inactive"` special-cased at render), and the
  status menu filters `s.key!=="inactive"`. FD/TV/op each define a 7th `inactive`
  status object with differing colors.
- **`rdyBannerPulse` animation is referenced but not defined in master.** Master's
  RDY banner sets `animation:'rdyBannerPulse 2.5s ...'` (line 1323) and the TV RDY
  banner references it too (line 549), but neither master's `css` (2036-2051) nor
  TV's `css` (714-746) defines `@keyframes rdyBannerPulse`. Only frontdesk's `css`
  defines it (line 1736). The banners therefore render statically (no pulse) in
  master and TV. Master's `css` also does not define `slowPulse` (used by FD/TV
  card animation) — master cards do not animate on ready/pending.
- **Unused/dead components:** `CornerNotification` is defined in both frontdesk
  (354-420) and tv (348-414) but is **not mounted** in either return tree.
  `QueueItem` in tv (244-343) is defined but not mounted (TV shows banner + modal
  only). `S.headerSub`, `S.legend`, `S.roomCol`/`S.cardRow` in tv, and
  `.menu-item`/`.analytics-btn` classes in master `css` are defined but not all
  used. FD's `S.footer` is defined but not used.
- **Note length limits differ by editor:** op and FD note textareas enforce
  `maxLength={40}` (op 393, FD 1550); master's note textarea has **no maxLength**
  (line 1672). So master can store notes longer than 40 chars that op/FD would
  truncate on next edit.
- **Op note can visually truncate** (2-line `-webkit-line-clamp`, no FitText);
  master/FD/TV notes auto-shrink via FitText and do not truncate (see §4).
- **`op` view has no PIN/lock and no admin affordances**; it edits a single op and
  shows overlays when the op is disabled (`allOps[*].enabled===false`) or has no
  provider.
- **Client/server `treatment` label mismatch:** server default label for
  `treatment` is `"In Progress"` (server 241) and master abbr is `"In Progress"`
  (118-119), but FD/TV/op hardcode abbr `"Reserved"` for the same key. Because
  the board views (FD/TV/op) receive `state.statuses` from the server, the label
  actually shown depends on whether a given view reads server statuses or its
  local constant: master reads `state.statuses`; FD/TV/op use their **local**
  `STATUSES` constant for status abbreviations (they do not call `setStatuses` on
  incoming state for their own labels — FD/tv/op ignore `state.statuses`), so a
  status renamed in the admin menu updates master but not FD/TV/op labels.

---

*End of PROJECT_CONTEXT_2026-07-25.md*

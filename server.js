const express = require('express');
// ── Status History Logging ────────────────────────────────────────────────────
const fs = require('fs');
const { execSync } = require('child_process');
const HISTORY_DIR  = process.env.OPBOARD_DATA_DIR || '/var/lib/opboard';
const HISTORY_FILE = `${HISTORY_DIR}/history.json`;
const STATE_FILE   = `${HISTORY_DIR}/state.json`;

// ── Version stamp ────────────────────────────────────────────────────────────
// Computed once at startup; injected into HTML responses and broadcast over the
// socket so clients can auto-reload on deploy.
let SERVER_VERSION;
try {
  SERVER_VERSION = execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore','pipe','ignore'] }).toString().trim();
} catch (e) {
  SERVER_VERSION = `t${Date.now().toString(36)}`;
  console.warn('git rev-parse failed, using timestamp version:', SERVER_VERSION);
}
console.log('Server version:', SERVER_VERSION);

// Ensure directory exists
if (!fs.existsSync(HISTORY_DIR)) {
  try { fs.mkdirSync(HISTORY_DIR, { recursive: true }); } catch(e) {}
}

// Load persisted state on startup
// IMPORTANT: merge saved data INTO defaults so new fields always have defaults
// Move a corrupt persisted file out of the way so it isn't overwritten on the
// next save. Returns true on rename success. Stays silent if the file is gone.
function preserveCorruptFile(path, kind) {
  try {
    if (!fs.existsSync(path)) return false;
    const corruptPath = path + '.' + kind + '.' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    fs.renameSync(path, corruptPath);
    console.error(`=> ${path} ${kind} — renamed to ${corruptPath}`);
    return true;
  } catch (renameErr) {
    console.error(`=> ${path} ${kind} AND COULD NOT BE RENAMED:`, renameErr.message);
    console.error('   Original file may be overwritten on next save.');
    return false;
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Snapshot the default shape before merging so we can fall back to a safe
      // default for any individual field that loads with a corrupt type.
      const defaults = state;
      if (data && data.ops && typeof data.ops === 'object') {
        // Defaults-first: saved data overrides defaults but new default keys are preserved
        state = {
          ...state,        // default shape with all new fields
          ...data,         // saved values override defaults
          ops: {...state.ops, ...data.ops}, // merge ops (preserve any new default ops)
        };
        // C1: guard against persisted corruption — a field loaded with the wrong
        // type would be broadcast and crash every client (e.g. statuses.map on a
        // non-array). Reset just that field to its safe default instead.
        const isPlainObj = v => v && typeof v === 'object' && !Array.isArray(v);
        if (!Array.isArray(state.statuses))      state.statuses = defaults.statuses;
        if (!Array.isArray(state.apptTypes))     state.apptTypes = defaults.apptTypes;
        if (!Array.isArray(state.allOps))        state.allOps = defaults.allOps;
        if (!Array.isArray(state.customAbbrevs)) state.customAbbrevs = defaults.customAbbrevs;
        if (!isPlainObj(state.providerDefaults)) state.providerDefaults = defaults.providerDefaults;
        if (!isPlainObj(state.providerColors))   state.providerColors = defaults.providerColors;
        if (!isPlainObj(state.customProcedureTally)) state.customProcedureTally = {};
        // Normalize all timestamps to numbers
        Object.keys(state.ops).forEach(k => {
          const ts = state.ops[k].ts;
          if (ts) state.ops[k].ts = Number(typeof ts === 'string' ? new Date(ts).getTime() : ts);
        });
        // One-shot migration: legacy "Treatment" appt-type label → "Tx".
        // Idempotent; runs again on every restart but is a no-op after first save.
        let migratedTx = 0;
        const fixArr = arr => {
          if (!Array.isArray(arr)) return arr;
          let changed = false;
          const out = arr.map(t => { if (t === 'Treatment') { changed = true; migratedTx++; return 'Tx'; } return t; });
          return changed ? out : arr;
        };
        if (Array.isArray(state.apptTypes)) state.apptTypes = fixArr(state.apptTypes);
        Object.values(state.ops).forEach(o => { if (o && Array.isArray(o.apptTypes)) o.apptTypes = fixArr(o.apptTypes); });
        if (migratedTx > 0) {
          console.log(`Migrated ${migratedTx} "Treatment" → "Tx" appt-type entries.`);
          saveState();
        }
        console.log(`State restored: ${Object.keys(state.ops).length} ops, ${(state.history||[]).length} history entries`);
      } else {
        // Parsed but the shape is unexpected (e.g. ops missing or not an object).
        // Preserve the file so a human can recover whatever's in it.
        console.error('═════════════════════════════════════════════════════════');
        console.error('STATE FILE HAS INVALID SHAPE (ops missing or not an object).');
        preserveCorruptFile(STATE_FILE, 'invalid');
        console.error('Booting with defaults. Recover manually from the renamed file.');
        console.error('═════════════════════════════════════════════════════════');
      }
    }
  } catch(e) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      // Can't read the file — don't try to rename it either. Just log and boot defaults.
      console.error('PERMISSION ERROR reading state file. Check /var/lib/opboard permissions.');
      console.error('Run: sudo chown actang13:actang13 /var/lib/opboard');
    } else if (e.code === 'ENOENT') {
      console.log('No state file found — starting fresh with defaults');
    } else {
      // JSON parse error or other unexpected failure. Preserve the corrupt file
      // before saveState gets a chance to overwrite it with defaults.
      console.error('═════════════════════════════════════════════════════════');
      console.error('STATE FILE CORRUPT —', e.code || e.name, '—', e.message);
      preserveCorruptFile(STATE_FILE, 'corrupt');
      console.error('Booting with defaults. Recover manually from the renamed file.');
      console.error('═════════════════════════════════════════════════════════');
    }
  }
}

// C2: crash-safe atomic write. Write to a temp file and fsync it, rename over
// the target, then fsync the directory — so both the file contents and the
// rename survive a power loss (the Pi runs off an SD card with no UPS).
function writeFileAtomic(filePath, data) {
  const tmp = filePath + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, filePath);
  const dfd = fs.openSync(HISTORY_DIR, 'r');
  try { fs.fsyncSync(dfd); }
  finally { fs.closeSync(dfd); }
}

// Save state atomically — debounced, max once per 2 seconds
let saveTimer = null;
function saveState() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      writeFileAtomic(STATE_FILE, JSON.stringify(state, null, 2));
    } catch(e) { console.error('Failed to save state:', e.message); }
  }, 2000);
}

// Log a status change to history.json (append only — pruning done at midnight)
function logHistory(op, status, apptTypes, provider) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      try {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      } catch(e) {
        // Don't silently overwrite a corrupt history file — preserve it for recovery.
        console.error('HISTORY FILE CORRUPT —', e.code || e.name, '—', e.message);
        preserveCorruptFile(HISTORY_FILE, 'corrupt');
        history = [];
      }
    }
    history.push({ ts: Date.now(), op: parseInt(op), status, apptTypes: apptTypes||[], provider });
    writeFileAtomic(HISTORY_FILE, JSON.stringify(history));
  } catch(e) { console.error('Failed to log history:', e.message); }
}

// Prune history once daily at midnight
function pruneHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return;
    const retentionDays = state.historyRetentionDays || 120;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const before = history.length;
    history = history.filter(h => h.ts > cutoff);
    if (history.length !== before) {
      writeFileAtomic(HISTORY_FILE, JSON.stringify(history));
      console.log(`History pruned: ${before - history.length} entries removed`);
    }
  } catch(e) { console.error('Failed to prune history:', e.message); }
}
// H1: local-time YYYY-MM-DD, used to record and compare the day a reset ran.
function localDateStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function dailyReset() {
  try {
    Object.keys(state.ops).forEach(k => {
      const op = state.ops[k];
      if (op.status === 'dirty') return;
      op.provider = null;
      op.status = 'awaiting';
      op.apptTypes = [];
      op.note = '';
      op.procedures = [];
      op.needsCheckout = false;
      op.ts = null;
      op.noteUpdatedAt = null;
    });
    state.providerOpOrder = {};
    state.lastResetDate = localDateStr();
    saveState();
    broadcastState();
    console.log('Daily reset complete:', new Date().toISOString());
  } catch(e) { console.error('Failed daily reset:', e.message); }
}
// H1: if the server was down at the scheduled 00:01 reset, that reset was
// silently skipped. On startup, run a catch-up if today's reset hasn't been
// recorded and the clock is already past 00:01.
function catchUpDailyReset() {
  try {
    const now = new Date();
    const today = localDateStr(now);
    const pastResetTime = now.getHours() > 0 || now.getMinutes() >= 1;
    if (state.lastResetDate !== today && pastResetTime) {
      console.log(`[startup] Missed daily reset (last: ${state.lastResetDate || 'never'}) — running catch-up.`);
      pruneHistory();
      dailyReset();
    }
  } catch(e) { console.error('Catch-up daily reset failed:', e.message); }
}
// Schedule daily reset at 00:01, recomputed each iteration to prevent drift
function scheduleNextDailyReset() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 1, 0);
  setTimeout(() => {
    pruneHistory();
    dailyReset();
    scheduleNextDailyReset();
  }, next - now);
}
scheduleNextDailyReset();
let state = {
  ops: {},
  activeProviders:   ['Dr. Tang','Dr. Ngo','Jordan'],
  inactiveProviders: [],
  statuses: [
    {key:'ready',    label:'Ready',        abbr:'Ready',       numColor:'#4ade80',bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.45)',  glow:'0 0 28px rgba(74,222,128,0.35)', menuBg:'rgba(34,197,94,0.18)',  menuBorder:'rgba(34,197,94,0.6)',  menuHover:'rgba(34,197,94,0.28)' },
    {key:'treatment',label:'In Progress',  abbr:'In Progress', numColor:'#60a5fa',bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.45)', glow:'0 0 28px rgba(96,165,250,0.35)', menuBg:'rgba(59,130,246,0.18)', menuBorder:'rgba(59,130,246,0.6)', menuHover:'rgba(59,130,246,0.28)'},
    {key:'pending',  label:'Awaiting FA',  abbr:'Awaiting FA', numColor:'#ff69b4',bg:'rgba(255,105,180,0.12)',border:'rgba(255,105,180,0.45)',glow:'0 0 28px rgba(255,105,180,0.5)', menuBg:'rgba(255,105,180,0.18)',menuBorder:'rgba(255,105,180,0.6)',menuHover:'rgba(255,105,180,0.28)'},
    {key:'fa',       label:'Reviewing FA', abbr:'Reviewing FA',numColor:'#facc15',bg:'rgba(234,179,8,0.10)',  border:'rgba(234,179,8,0.45)',  glow:'0 0 28px rgba(250,204,21,0.4)',  menuBg:'rgba(234,179,8,0.18)',  menuBorder:'rgba(234,179,8,0.6)',  menuHover:'rgba(234,179,8,0.28)' },
    {key:'dirty',    label:'Vacant Dirty', abbr:'Dirty',       numColor:'#ff2020',bg:'rgba(255,0,0,0.15)',    border:'rgba(255,0,0,0.55)',    glow:'0 0 28px rgba(255,0,0,0.5)',     menuBg:'rgba(255,0,0,0.18)',    menuBorder:'rgba(255,0,0,0.6)',    menuHover:'rgba(255,0,0,0.28)'   },
    {key:'awaiting', label:'Vacant Clean', abbr:'Clean',       numColor:'#111114',bg:'rgba(255,255,255,0.95)',border:'rgba(255,255,255,0.95)',glow:'0 0 28px rgba(255,255,255,0.4)', menuBg:'rgba(255,255,255,0.9)', menuBorder:'rgba(255,255,255,1)',  menuHover:'rgba(255,255,255,0.8)'},
  ],
  apptTypes: ['NP','CCX','Tx','LOE','Delivery','Office Visit','Prophy','PMT','SRP'],
  historyRetentionDays: 120,
  adminPin: '4001',
  customAbbrevs: [], // [{full, abbr}] user-defined abbreviations
  providerDefaults: {
    'Dr. Tang':'show','Dr. Ngo':'show','Jordan':'show',
  },
  providerColors: {
    'Dr. Tang':'#fff','Dr. Ngo':'#fff','Jordan':'#fff',
  },
  allOps: Array.from({length:14},(_,i)=>({id:i+1,enabled:true})),
  readyPopupDismissed: {},
  awfaPopupDismissed: {},
  opPin: '0063', // Default op tablet PIN
  queueOrder: [], // shared AWFA/ready ordering across tablets
  providerOpOrder: {}, // per-provider custom op order: {provider: [opId,...]}; resets daily
  lastResetDate: null, // H1: local YYYY-MM-DD of the last completed daily reset
  customProcedureTally: {}, // {procedureName(lowercased,trimmed): count}; persists across days for admin review
};
loadState();

// Treat an op id as valid only if it's a positive integer that exists in allOps.
function isValidOp(op) {
  const n = Number(op);
  if (!Number.isInteger(n) || n <= 0) return false;
  return Array.isArray(state.allOps) && state.allOps.some(o => o.id === n);
}

// Invariant: provider===null implies status='awaiting', empty apptTypes, empty note,
// and no readyPopupDismissed entry. Call at the tail of every op-mutation handler
// so no code path can leave an op in a "zombie" state that fires phantom popups.
function enforceOpInvariant(op) {
  const o = state.ops[op];
  if (!o || o.provider !== null) return;
  o.status = 'awaiting';
  o.apptTypes = [];
  o.note = '';
  o.procedures = [];
  o.needsCheckout = false;
  delete state.readyPopupDismissed[op];
  delete state.awfaPopupDismissed[op];
  // Drop this op from any per-provider order array so a stale position doesn't
  // resurface when the op is later reassigned.
  const opNum = Number(op);
  Object.keys(state.providerOpOrder || {}).forEach(prov => {
    const arr = state.providerOpOrder[prov];
    if (Array.isArray(arr)) {
      state.providerOpOrder[prov] = arr.filter(id => Number(id) !== opNum);
    }
  });
}

// One-shot at boot: heal any pre-existing zombies in persisted state and prune
// stale references in readyPopupDismissed / queueOrder. Self-healing safety net.
function cleanupOnStartup() {
  const zombieOps = [];
  Object.keys(state.ops).forEach(op => {
    const o = state.ops[op];
    if (!o || o.provider !== null) return;
    const isZombie = o.status !== 'awaiting'
      || (Array.isArray(o.apptTypes) && o.apptTypes.length > 0)
      || (o.note !== '' && o.note != null)
      || (Array.isArray(o.procedures) && o.procedures.length > 0)
      || (o.needsCheckout === true);
    if (isZombie) {
      zombieOps.push(op);
      enforceOpInvariant(op);
    }
  });
  let popupDropped = 0;
  Object.keys(state.readyPopupDismissed).forEach(op => {
    const o = state.ops[op];
    if (!o || o.provider === null || o.status !== 'ready') {
      delete state.readyPopupDismissed[op];
      popupDropped++;
    }
  });
  let awfaPopupDropped = 0;
  Object.keys(state.awfaPopupDismissed).forEach(op => {
    const o = state.ops[op];
    if (!o || o.provider === null || o.status !== 'pending') {
      delete state.awfaPopupDismissed[op];
      awfaPopupDropped++;
    }
  });
  let queueDropped = 0;
  if (Array.isArray(state.queueOrder)) {
    const before = state.queueOrder.length;
    state.queueOrder = state.queueOrder.filter(op => state.ops[op] && state.ops[op].provider !== null);
    queueDropped = before - state.queueOrder.length;
  }
  if (zombieOps.length || popupDropped || awfaPopupDropped || queueDropped) {
    console.log(`[startup] Cleaned ${zombieOps.length} zombie op states${zombieOps.length?` (ops ${zombieOps.join(', ')})`:''}, ${popupDropped} stale readyPopupDismissed, ${awfaPopupDropped} stale awfaPopupDismissed, ${queueDropped} stale queueOrder`);
    saveState();
  }
}
cleanupOnStartup();

// Normalize ts values for broadcast — always send as numbers
function broadcastState(){
  const normalized={...state,ops:{},version:SERVER_VERSION};
  Object.entries(state.ops).forEach(([k,v])=>{
    normalized.ops[k]={...v,ts:v.ts?Number(v.ts):null};
  });
  io.emit('state',normalized);
}



const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// H1: run a catch-up reset now if the scheduled one was missed while the
// server was down. Placed after `io` exists since dailyReset broadcasts.
catchUpDailyReset();

// ── Shared state (source of truth) ───────────────────────────────────────────


// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Connected:', socket.id);
  broadcastState();

  // C1: register every socket handler through `on` — it supplies a default
  // {} payload (so destructuring can't throw) and try/catches the handler
  // body, so one malformed message can never crash the process.
  const on = (event, handler) => socket.on(event, (payload = {}) => {
    try { handler(payload); }
    catch (e) { console.error(`Socket handler '${event}' failed:`, e && e.message); }
  });

  on('requestState', () => broadcastState());

  on('setStatus', ({op,status}) => {
    if(!isValidOp(op) || !state.ops[op]) return;
    state.ops[op].status = status;
    state.ops[op].ts = Date.now();
    // 'awaiting' is the "Vacant Clean" status (see STATUSES) — it, plus
    // 'inactive', means the room is reset for the next patient, so clear all
    // patient-specific fields. 'dirty' is intentionally excluded: the patient
    // just finished and the info is still relevant while the room is cleaned.
    if(['awaiting','inactive'].includes(status)){
      state.ops[op].apptTypes=[];
      state.ops[op].note='';
      state.ops[op].procedures=[];
      state.ops[op].needsCheckout=false;
    }
    enforceOpInvariant(op);
    logHistory(op, state.ops[op].status, state.ops[op].apptTypes, state.ops[op].provider);
    saveState();
    broadcastState();
  });
  on('setApptType', ({op,apptTypes}) => {
    if(!isValidOp(op) || !state.ops[op]) return;
    state.ops[op].apptTypes = Array.isArray(apptTypes) ? apptTypes : [];
    enforceOpInvariant(op);
    saveState();
    broadcastState();
  });
  on('setNote', ({op,note}) => {
    if(!isValidOp(op) || !state.ops[op]) return;
    state.ops[op].note = note;
    state.ops[op].noteUpdatedAt = Date.now();
    enforceOpInvariant(op);
    saveState();
    broadcastState();
  });
  on('setProcedures', ({op,procedures}) => {
    if(!isValidOp(op) || !state.ops[op]) return;
    state.ops[op].procedures = Array.isArray(procedures) ? procedures : [];
    enforceOpInvariant(op);
    saveState();
    broadcastState();
  });
  on('setNeedsCheckout', ({op, value}) => {
    if (!isValidOp(op) || !state.ops[op]) return;
    state.ops[op].needsCheckout = !!value;
    enforceOpInvariant(op);
    saveState();
    broadcastState();
  });
  on('setProviders',({activeProviders,inactiveProviders}) => {
    // Validate BEFORE touching state — a non-array here would corrupt state and
    // crash every client's activeProviders.map on the next broadcast.
    if(!Array.isArray(activeProviders) || !Array.isArray(inactiveProviders)) return;
    state.activeProviders=activeProviders;
    state.inactiveProviders=inactiveProviders;
    // Unassign any op held by a provider that no longer exists in either list
    // (e.g. deleted via Edit Providers ✕). Leaving the op assigned to a phantom
    // provider hides it from the board yet keeps firing READY/AWFA popups.
    const known = new Set([...(activeProviders||[]), ...(inactiveProviders||[])]);
    Object.keys(state.ops).forEach(op => {
      const o = state.ops[op];
      if (o && o.provider != null && !known.has(o.provider)) {
        o.provider = null;
        enforceOpInvariant(op);
      }
    });
    saveState();
    broadcastState();
  });
  on('setOpProvider',({op,provider,status,apptTypes,note}) => {
    if(!isValidOp(op)) return;
    if(!state.ops[op]) state.ops[op]={provider:null,status:'awaiting',apptTypes:[],note:'',procedures:[],needsCheckout:false,ts:null,noteUpdatedAt:null};
    state.ops[op].provider=provider;
    if(status!==undefined) state.ops[op].status=status;
    if(apptTypes!==undefined) state.ops[op].apptTypes=Array.isArray(apptTypes)?apptTypes:[];
    if(note!==undefined) state.ops[op].note=note;
    // M4: the Assignments/Transfer path passes apptTypes+note to start a fresh
    // patient. Clear procedures + needsCheckout too so the new patient doesn't
    // inherit the previous occupant's checklist. (Drag-reassign uses reassignOp,
    // which preserves everything and never passes these fields.)
    if(apptTypes!==undefined && note!==undefined){
      state.ops[op].procedures=[];
      state.ops[op].needsCheckout=false;
    }
    state.ops[op].ts=Date.now();
    enforceOpInvariant(op);
    saveState();
    broadcastState();
  });
  // C1: config setters reject malformed payloads (wrong type) before storing —
  // a non-array/non-object would persist and crash every client on broadcast.
  const isPlainObj = v => v && typeof v === 'object' && !Array.isArray(v);
  on('setStatuses', ({statuses})  => { if(!Array.isArray(statuses)) return; state.statuses=statuses; saveState(); broadcastState(); });
  on('setApptTypes',({apptTypes}) => { if(!Array.isArray(apptTypes)) return; state.apptTypes=apptTypes; saveState(); broadcastState(); });
  on('setAllOps',   ({allOps})    => { if(!Array.isArray(allOps)) return; state.allOps=allOps; saveState(); broadcastState(); });
  on('setOpPin',          ({pin})      => { state.opPin=pin; saveState(); broadcastState(); });
  on('setAdminPin',       ({pin})      => { state.adminPin=pin; saveState(); broadcastState(); });
  on('setProviderDefaults',({defaults}) => { if(!isPlainObj(defaults)) return; state.providerDefaults=defaults; saveState(); broadcastState(); });
  on('setProviderColors',  ({colors})   => { if(!isPlainObj(colors)) return; state.providerColors=colors; saveState(); broadcastState(); });
  on('setCustomAbbrevs',   ({abbrevs})  => { if(!Array.isArray(abbrevs)) return; state.customAbbrevs=abbrevs; saveState(); broadcastState(); });
  // Custom procedure tally — count freeform ("Other") procedure additions so the
  // admin can review which to promote to the main checklist. Persists across days.
  on('logCustomProcedure', ({name}) => {
    if (typeof name !== 'string') return;
    const key = name.trim().toLowerCase();
    if (!key) return;
    state.customProcedureTally[key] = (state.customProcedureTally[key] || 0) + 1;
    saveState();
    broadcastState();
  });
  on('clearCustomProcedureTally', () => {
    state.customProcedureTally = {};
    saveState();
    broadcastState();
  });
  on('removeCustomProcedureEntry', ({name}) => {
    if (typeof name !== 'string') return;
    const key = name.trim().toLowerCase();
    if (!key) return;
    delete state.customProcedureTally[key];
    saveState();
    broadcastState();
  });
  on('setQueueOrder',      ({order})    => { state.queueOrder = Array.isArray(order) ? order.filter(o => isValidOp(o)).map(Number) : []; saveState(); broadcastState(); });
  on('setProviderOpOrder', ({provider, order}) => {
    if (!provider || !Array.isArray(order)) return;
    state.providerOpOrder[provider] = order;
    saveState();
    broadcastState();
  });
  on('reassignOp', ({op, provider}) => {
    // Single-field update: changes provider only. Preserves ts, status,
    // apptTypes, note, noteUpdatedAt — used by the drag-reassign UX where
    // the op keeps its place in queues and keeps every other piece of state.
    // The invariant still applies: if a client passes provider=null, the
    // op is reset (no zombie state).
    if (!isValidOp(op)) return;
    if (!state.ops[op]) return;
    state.ops[op].provider = provider;
    enforceOpInvariant(op);
    saveState();
    broadcastState();
  });

  // Note locking — broadcast to all OTHER clients (not sender). Carry op id so
  // clients can scope lock state by op (multiple ops may be edited concurrently).
  // M3: track the op this socket currently holds locked so a mid-edit disconnect
  // can release it — otherwise other devices stay locked out forever.
  let lockedOp = null;
  on('noteLock',   ({op,by}) => { if(isValidOp(op)){ lockedOp=Number(op); socket.broadcast.emit('noteLock', {op:Number(op),by}); } });
  on('noteUnlock', ({op}={}) => {
    if(op===undefined || isValidOp(op)){
      if(op===undefined || Number(op)===lockedOp) lockedOp=null;
      socket.broadcast.emit('noteUnlock', {op:op===undefined?null:Number(op)});
    }
  });
  on('dismissReadyPopup',        ({op}) => { if(!isValidOp(op)) return; state.readyPopupDismissed[op]=Date.now(); saveState(); broadcastState(); });
  on('clearReadyPopupDismissed', ({op}) => { if(!isValidOp(op)) return; delete state.readyPopupDismissed[op]; saveState(); broadcastState(); });
  on('dismissAwfaPopup',         ({op}) => { if(!isValidOp(op)) return; state.awfaPopupDismissed[op]=Date.now(); saveState(); broadcastState(); });
  on('clearAwfaPopupDismissed',  ({op}) => { if(!isValidOp(op)) return; delete state.awfaPopupDismissed[op]; saveState(); broadcastState(); });
  on('disconnect', () => {
    // M3: if this socket dropped while holding a note lock, release it so other
    // devices clear their lock indicator instead of staying locked out forever.
    if(lockedOp!=null) socket.broadcast.emit('noteUnlock', {op:lockedOp});
    console.log('Disconnected:', socket.id);
  });
});

// Flush pending state on shutdown so nothing within the 2s debounce window is lost.
function flushAndExit() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try {
    writeFileAtomic(STATE_FILE, JSON.stringify(state, null, 2));
    console.log('State flushed on exit.');
  } catch(e) { console.error('Flush failed:', e.message); }
  process.exit(0);
}
process.on('SIGTERM', flushAndExit);
process.on('SIGINT',  flushAndExit);

// C1: keep the process alive if an error escapes a handler or a promise
// rejects unhandled — log it instead of letting Node exit.
process.on('uncaughtException', (e) => {
  console.error('UNCAUGHT EXCEPTION:', (e && e.stack) || e);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// ── Serve static files + catch-all for SPA routing ───────────────────────────
// Send an HTML file with {{VERSION}} replaced by SERVER_VERSION. Disables
// caching on the HTML itself so each request fetches a fresh token (and thus a
// fresh ?v= query string for the JSX modules referenced inside).
function sendHtml(htmlFile) {
  return (req, res) => {
    fs.readFile(path.join(__dirname, 'public', htmlFile), 'utf8', (err, data) => {
      if (err) return res.status(500).send('Failed to read ' + htmlFile);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(data.replace(/\{\{VERSION\}\}/g, SERVER_VERSION));
    });
  };
}
// Named HTML routes are registered first; they take precedence over the
// static middleware which would otherwise auto-serve public/index.html for `/`.
app.get('/', sendHtml('index.html'));
app.get('/frontdesk', sendHtml('frontdesk.html'));
app.get('/tv', sendHtml('tv.html'));
app.get('/op/:num', sendHtml('op.html'));
// Static assets (JSX, images, socket.io client). `index:false` prevents the
// static middleware from serving raw HTML files with unreplaced {{VERSION}}.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
// SPA fallback uses the same templated index.
app.get('/{*path}', sendHtml('index.html'));

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Opboard running on port ${PORT}`));

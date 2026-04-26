const express = require('express');
// ── Status History Logging ────────────────────────────────────────────────────
const fs = require('fs');
const HISTORY_DIR  = '/var/lib/opboard';
const HISTORY_FILE = `${HISTORY_DIR}/history.json`;
const STATE_FILE   = `${HISTORY_DIR}/state.json`;

// Ensure directory exists
if (!fs.existsSync(HISTORY_DIR)) {
  try { fs.mkdirSync(HISTORY_DIR, { recursive: true }); } catch(e) {}
}

// Load persisted state on startup
// IMPORTANT: merge saved data INTO defaults so new fields always have defaults
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (data && data.ops && typeof data.ops === 'object') {
        // Defaults-first: saved data overrides defaults but new default keys are preserved
        state = {
          ...state,        // default shape with all new fields
          ...data,         // saved values override defaults
          ops: {...state.ops, ...data.ops}, // merge ops (preserve any new default ops)
        };
        // Normalize all timestamps to numbers
        Object.keys(state.ops).forEach(k => {
          const ts = state.ops[k].ts;
          if (ts) state.ops[k].ts = Number(typeof ts === 'string' ? new Date(ts).getTime() : ts);
        });
        console.log(`State restored: ${Object.keys(state.ops).length} ops, ${(state.history||[]).length} history entries`);
      } else {
        console.log('Invalid/empty state file — using defaults');
      }
    }
  } catch(e) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      console.error('PERMISSION ERROR reading state file. Check /var/lib/opboard permissions.');
      console.error('Run: sudo chown actang13:actang13 /var/lib/opboard');
    } else if (e.code === 'ENOENT') {
      console.log('No state file found — starting fresh with defaults');
    } else {
      console.error('Could not load state, using defaults:', e.code, e.message);
    }
  }
}

// Save state atomically — debounced, max once per 2 seconds
let saveTimer = null;
function saveState() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const tmp = STATE_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, STATE_FILE);
    } catch(e) { console.error('Failed to save state:', e.message); }
  }, 2000);
}

// Log a status change to history.json (append only — pruning done at midnight)
function logHistory(op, status, apptTypes, provider) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch(e) {}
    }
    history.push({ ts: Date.now(), op: parseInt(op), status, apptTypes: apptTypes||[], provider });
    const tmp = HISTORY_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(history));
    fs.renameSync(tmp, HISTORY_FILE);
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
      const tmp = HISTORY_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(history));
      fs.renameSync(tmp, HISTORY_FILE);
      console.log(`History pruned: ${before - history.length} entries removed`);
    }
  } catch(e) { console.error('Failed to prune history:', e.message); }
}
// Schedule midnight pruning
const now = new Date();
const msUntilMidnight = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,1,0)-now;
setTimeout(()=>{ pruneHistory(); setInterval(pruneHistory, 24*60*60*1000); }, msUntilMidnight);

loadState();

// Normalize ts values for broadcast — always send as numbers
function broadcastState(){
  const normalized={...state,ops:{}};
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

// ── Shared state (source of truth) ───────────────────────────────────────────
let state = {
  ops: {
    1:  { status:'ready',    note:'New patient',    noteUpdatedAt:null,    ts: Number(Date.now()-120000),  apptTypes:['NP'],  provider:'Dr. Tang' },
    2:  { status:'treatment',note:'Crown prep',     ts: Date.now()-840000,  apptTypes:['Tx'],  provider:'Dr. Tang' },
    3:  { status:'dirty',    note:'',               ts: Date.now()-300000,  apptTypes:[],  provider:'Dr. Tang' },
    4:  { status:'ready',    note:'X-rays done',    ts: Date.now()-60000,   apptTypes:['OV'],  provider:'Dr. Tang' },
    5:  { status:'awaiting', note:'',               ts: Date.now()-150000,  apptTypes:[],  provider:'Dr. Tang' },
    6:  { status:'dirty',    note:'',               ts: Date.now()-200000,  apptTypes:[],  provider:'Dr. Ngo'  },
    7:  { status:'ready',    note:'',               ts: Date.now()-90000,   apptTypes:['OV'],  provider:'Dr. Ngo'  },
    8:  { status:'treatment',note:'Implant consult',ts: Date.now()-1200000, apptTypes:['Tx'],  provider:'Dr. Ngo'  },
    9:  { status:'awaiting', note:'',               ts: Date.now()-180000,  apptTypes:[],  provider:'Dr. Ngo'  },
    10: { status:'pending',  note:'SRP Q2',         ts: Date.now()-360000,  apptTypes:['SRP'], provider:'Dr. Ngo'  },
    11: { status:'treatment',note:'Root canal',     ts: Date.now()-2100000, apptTypes:['Tx'],  provider:'Jordan'   },
    12: { status:'awaiting', note:'',               ts: Date.now()-30000,   apptTypes:['OV'],  provider:'Jordan'   },
    13: { status:'awaiting', note:'',               ts: Date.now()-90000,   apptTypes:[],  provider:'Jordan'   },
    14: { status:'fa',       note:'Whitening',      ts: Date.now()-600000,  apptTypes:['LOE'], provider:'Jordan'   },
  },
  activeProviders:   ['Dr. Tang','Dr. Ngo','Jordan'],
  inactiveProviders: ['OS','Endo','Perio'],
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
    'OS':'hide','Endo':'hide','Perio':'hide',
  },
  providerColors: {
    'Dr. Tang':'#fff','Dr. Ngo':'#fff','Jordan':'#fff',
    'OS':'#fff','Endo':'#fff','Perio':'#fff',
  },
  allOps: Array.from({length:14},(_,i)=>({id:i+1,enabled:true})),
  opPin: '0063', // Default op tablet PIN
};

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Connected:', socket.id);
  broadcastState();

  socket.on('setStatus',   ({op,status})   => { if(state.ops[op]){ state.ops[op].status=status; state.ops[op].ts=Number(Date.now()); if(['awaiting','inactive'].includes(status)){state.ops[op].apptTypes=[];state.ops[op].note='';} logHistory(op,status,state.ops[op].apptTypes,state.ops[op].provider); saveState(); } io.emit('state',{...state,ops:Object.fromEntries(Object.entries(state.ops).map(([k,v])=>[ k,{...v,ts:v.ts?Number(v.ts):null}]))}); });
  socket.on('setApptType', ({op,apptTypes}) => { if(state.ops[op]){ state.ops[op].apptTypes=Array.isArray(apptTypes)?apptTypes:[]; saveState(); } broadcastState(); });
  socket.on('setNote',     ({op,note})     => { if(state.ops[op]){ state.ops[op].note=note; state.ops[op].noteUpdatedAt=Date.now(); saveState(); } broadcastState(); });
  socket.on('setProviders',({activeProviders,inactiveProviders}) => { state.activeProviders=activeProviders; state.inactiveProviders=inactiveProviders; broadcastState(); });
  socket.on('setOpProvider',({op,provider,status,apptTypes,note}) => {
    if(state.ops[op]){ state.ops[op].provider=provider; if(status!==undefined)state.ops[op].status=status; if(apptTypes!==undefined)state.ops[op].apptTypes=Array.isArray(apptTypes)?apptTypes:[]; if(note!==undefined)state.ops[op].note=note; state.ops[op].ts=Date.now(); }
    broadcastState();
  });
  socket.on('setStatuses', ({statuses})  => { state.statuses=statuses; broadcastState(); });
  socket.on('setApptTypes',({apptTypes}) => { state.apptTypes=apptTypes; broadcastState(); });
  socket.on('setAllOps',   ({allOps})    => { state.allOps=allOps; broadcastState(); });
  socket.on('setOpPin',          ({pin})      => { state.opPin=pin; saveState(); broadcastState(); });
  socket.on('setAdminPin',       ({pin})      => { state.adminPin=pin; saveState(); broadcastState(); });
  socket.on('setProviderDefaults',({defaults}) => { state.providerDefaults=defaults; saveState(); broadcastState(); });
  socket.on('setProviderColors',  ({colors})   => { state.providerColors=colors; saveState(); broadcastState(); });
  socket.on('setCustomAbbrevs',   ({abbrevs})  => { state.customAbbrevs=abbrevs; saveState(); broadcastState(); });

  // Note locking — broadcast to all OTHER clients (not sender)
  socket.on('noteLock',   ({op,by}) => { socket.broadcast.emit('noteLock',   {op,by}); });
  socket.on('noteUnlock', ()        => { socket.broadcast.emit('noteUnlock', {}); });

  socket.on('disconnect', () => console.log('Disconnected:', socket.id));
});

// ── Serve static files + catch-all for SPA routing ───────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/frontdesk', (req, res) => res.sendFile(path.join(__dirname, 'public', 'frontdesk.html')));
app.get('/tv', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tv.html')));
app.get('/op/:num', (req, res) => res.sendFile(path.join(__dirname, 'public', 'op.html')));
app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Opboard running on port ${PORT}`));

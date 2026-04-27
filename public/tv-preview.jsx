const APPT_ABBR_MAP={"NP":"NP","CCX":"CCX","Treatment":"TX","LOE":"LOE","Delivery":"DEL","Office Visit":"OV","Prophy":"PRO","PMT":"PMT","SRP":"SRP"};


// ── Dental Abbreviation Engine ────────────────────────────────────────────────
// Applied to card displays. Editors always show full unabbreviated text.
const ABBREV_PHRASES = [
  [/laser\s*(?:&|and)\s*irrigation/gi,'Adj'],
  [/full\s*mouth\s*series/gi,'FMS'],
  [/full\s*mouth/gi,'FM'],
  [/bite\s*adjustment/gi,'Bite Adj'],
  [/bite\s*adj/gi,'Bite Adj'],
  [/post[\s-]op/gi,'PO'],
  [/pre[\s-]op/gi,'PreOp'],
  [/new\s*patient/gi,'NP'],
  [/follow\s*up/gi,'FU'],
  [/scaling\s*(?:and\s*)?root\s*plan(?:ing)?/gi,'SRP'],
  [/root\s*canal/gi,'RCT'],
  [/\btooth\s*#?(\d)/gi,'$1'],
  [/\bemergency\b/gi,'LOE'],
  [/\benamelplasty\b/gi,'Enpl'],
  [/\bextractions?\b/gi,'Ext'],
  [/\bimplants?\b/gi,'Impl'],
  [/\bcrowns?\b/gi,'Crn'],
  [/\bbridges?\b/gi,'Br'],
  [/\bveneers?\b/gi,'Vnr'],
  [/\bfillings?\b/gi,'Fill'],
  [/\bfills?\b/gi,'Fill'],
  [/\bcomposites?\b/gi,'Comp'],
  [/\bam(?:a)?lgam\b/gi,'Amlg'],
  [/\bcleaning\b/gi,'Cln'],
  [/\bperiodontal\b/gi,'Perio'],
  [/\bprophylaxis\b/gi,'Prphy'],
  [/\bfluoride\b/gi,'Fl'],
  [/\bsealants?\b/gi,'Slt'],
  [/\bpanoramic\b/gi,'Pan'],
  [/\bbitewing\b/gi,'BW'],
  [/\bperiapical\b/gi,'PA'],
  [/\bimpressions?\b/gi,'Imp'],
  [/\badjustment\b/gi,'Adj'],
  [/\bconsultation\b/gi,'Consult'],
  [/\bsparks?\b/gi,'Sprk'],
  [/\btemporary\b/gi,'Tmp'],
  [/\bpermanent\b/gi,'Perm'],
  [/\banesthesia\b/gi,'Anes'],
  [/\bquadrants?\b/gi,'Qd'],
  [/\bquads?\b/gi,'Qd'],
  [/\bdentures?\b/gi,'Dntr'],
  [/\bpartials?\b/gi,'Part'],
  [/\borthodontics?\b/gi,'Ortho'],
  [/\bwhitening\b/gi,'Whtng'],
  [/\bbleaching\b/gi,'Blch'],
  [/\bsedation\b/gi,'Sed'],
  [/\bretainer\b/gi,'Ret'],
  [/\birrigation\b/gi,'Irr'],
  [/\bx-rays?\b/gi,'XR'],
  [/\bxrays?\b/gi,'XR'],
];

// ── Condense repeated abbreviated terms: "14 Crn, 15 Crn" → "14/15 Crn" ────
function condenseNote(note) {
  if (!note) return note;
  // Find patterns: number abbr, number abbr (same abbr) → number/number abbr
  // e.g. "14 Crn, 15 Crn, 16 Crn" → "14/15/16 Crn"
  let r = note;
  // Get all unique abbreviated terms in the note
  const termPattern = /\b(\d+\/)*\d+\s+([A-Z][a-zA-Z]+)/g;
  const terms = {};
  let m;
  while ((m = termPattern.exec(r)) !== null) {
    const abbr = m[2];
    if (!terms[abbr]) terms[abbr] = [];
    terms[abbr].push(m[0]);
  }
  // For any abbr that appears multiple times, merge tooth numbers
  Object.entries(terms).forEach(([abbr, matches]) => {
    if (matches.length < 2) return;
    const nums = matches.map(s => s.replace(/\s+[A-Z][a-zA-Z]+/, '').trim());
    const merged = nums.join('/') + ' ' + abbr;
    // Replace all occurrences with merged, remove duplicates
    let first = true;
    matches.forEach(orig => {
      r = r.replace(orig, first ? merged : '');
      first = false;
    });
    // Clean up any double commas/spaces left behind
    r = r.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/^,\s*|,\s*$/g, '').trim();
  });
  return r;
}
function abbreviateNote(note,customAbbrevs=[]){
  if(!note) return note;
  let r=note;
  (customAbbrevs||[]).forEach(({full,abbr})=>{
    if(full&&abbr){try{r=r.replace(new RegExp('\\b'+full.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'),abbr);}catch(e){}}
  });
  ABBREV_PHRASES.forEach(([re,abbr])=>{r=r.replace(re,abbr);});
  r=r.replace(/#(\d+)/g,'$1');
  r=r.replace(/\b(\d+)(?:\s*,\s*(\d+))+\b/g,m=>m.split(/\s*,\s*/).join('/'));
  r = r.replace(/  +/g,' ').trim();
  return condenseNote(r);
}


// ── Sound: generated via Web Audio API — no external file needed ──────────────
function playChimeTV(color="#4ade80"){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    // TV chime: deeper, more prominent tones for a large room
    const freqs=color==="#ff69b4"?[440,550,660]:[330,440,550];
    freqs.forEach((freq,i)=>{
      const osc=ctx.createOscillator();const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.type="triangle";osc.frequency.value=freq;
      const t=ctx.currentTime+i*0.25;
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(0.5,t+0.05);
      gain.gain.exponentialRampToValueAtTime(0.001,t+1.2);
      osc.start(t);osc.stop(t+1.3);
    });
  }catch(e){}
}
function playChime(color="#4ade80"){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = color === "#ff69b4" ? [880, 1100, 1320] : [660, 880, 1100];
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t); osc.stop(t + 0.65);
    });
  } catch(e) {}
}

// ── ScaledWrapper ─────────────────────────────────────────────────────────────
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

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 70" height="44">
  <g transform="translate(35,35)">
    <g fill="rgba(255,255,255,0.55)">
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(0)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(30)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(60)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(90)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(120)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(150)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(180)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(210)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(240)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(270)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(300)"/>
      <path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(330)"/>
    </g>
    <circle r="8" fill="rgba(255,255,255,0.7)"/>
  </g>
  <text x="82" y="30" font-family="Arial,sans-serif" font-size="24" font-weight="800" letter-spacing="2.5" fill="rgba(255,255,255,0.85)">DENTISTS</text>
  <text x="83" y="54" font-family="Arial,sans-serif" font-size="14" font-weight="400" letter-spacing="3.5" fill="rgba(255,255,255,0.55)">OF WEST HENDERSON</text>
</svg>`;

const STATUSES = [
  { key:"ready",    label:"Ready",        abbr:"Ready",  numColor:"#4ade80", bg:"rgba(34,197,94,0.15)",   border:"rgba(34,197,94,0.5)",    glow:"0 0 30px rgba(74,222,128,0.4)"  },
  { key:"treatment",label:"Reserved",  abbr:"Reserved",   numColor:"#60a5fa", bg:"rgba(59,130,246,0.15)",  border:"rgba(59,130,246,0.5)",   glow:"0 0 30px rgba(96,165,250,0.4)"  },
  { key:"pending",  label:"Awaiting FA",  abbr:"Awaiting FA", numColor:"#ff69b4", bg:"rgba(255,105,180,0.15)", border:"rgba(255,105,180,0.5)",  glow:"0 0 30px rgba(255,105,180,0.5)" },
  { key:"fa",       label:"Reviewing FA", abbr:"Reviewing FA",   numColor:"#facc15", bg:"rgba(234,179,8,0.12)",   border:"rgba(234,179,8,0.5)",    glow:"0 0 30px rgba(250,204,21,0.4)"  },
  { key:"dirty",    label:"Vacant Dirty", abbr:"Dirty",   numColor:"#ff2020", bg:"rgba(255,0,0,0.18)",     border:"rgba(255,0,0,0.6)",      glow:"0 0 30px rgba(255,0,0,0.5)"    },
  { key:"awaiting", label:"Vacant Clean", abbr:"Clean",   numColor:"#111114", bg:"rgba(255,255,255,0.95)", border:"rgba(255,255,255,0.95)", glow:"0 0 30px rgba(255,255,255,0.4)" },
  { key:"inactive", label:"Not in Use",   abbr:"Not In Use",  numColor:"#ffffff", bg:"rgba(80,80,90,0.40)",    border:"rgba(130,130,145,0.50)", glow:"none" },
];
const SM = Object.fromEntries(STATUSES.map(s=>[s.key,s]));

const elapsed = d => {
  if (!d) return "";
  const ms = typeof d === 'number' ? d : d instanceof Date ? d.getTime() : new Date(d).getTime();
  const s = Math.floor((Date.now()-ms)/1000);
  if (s<60) return "<1m"; if (s<3600) return `${Math.floor(s/60)}m`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
};

const DEMO = {
  1:{status:"ready",    note:"New patient",    ts:new Date(Date.now()-120000),  apptTypes:["NP"],  provider:"Dr. Tang"},
  2:{status:"treatment",note:"Crown prep",     ts:new Date(Date.now()-840000),  apptTypes:["Tx"],  provider:"Dr. Tang"},
  3:{status:"dirty",    note:"",               ts:new Date(Date.now()-300000),  apptTypes:[],  provider:"Dr. Tang"},
  4:{status:"ready",    note:"X-rays done",    ts:new Date(Date.now()-60000),   apptTypes:["OV"],  provider:"Dr. Tang"},
  6:{status:"dirty",    note:"",               ts:new Date(Date.now()-200000),  apptTypes:[],  provider:"Dr. Ngo" },
  7:{status:"ready",    note:"",               ts:new Date(Date.now()-90000),   apptTypes:["OV"],  provider:"Dr. Ngo" },
  8:{status:"treatment",note:"Implant consult",ts:new Date(Date.now()-1200000), apptTypes:["Tx"],  provider:"Dr. Ngo" },
  9:{status:"awaiting", note:"",               ts:new Date(Date.now()-180000),  apptTypes:[],  provider:"Dr. Ngo" },
  5:{status:"awaiting", note:"",  ts:new Date(Date.now()-180000), apptTypes:[], provider:"Dr. Tang"},
  10:{status:"pending", note:"SRP Q2",         ts:new Date(Date.now()-360000),  apptTypes:["SRP"], provider:"Dr. Ngo" },
  11:{status:"treatment",note:"Root canal",    ts:new Date(Date.now()-2100000), apptTypes:["Tx"],  provider:"Jordan"  },
  12:{status:"awaiting", note:"",               ts:new Date(Date.now()-30000),   apptTypes:["OV"],  provider:"Jordan"  },
  13:{status:"awaiting", note:"",               ts:new Date(Date.now()-90000),   apptTypes:[],  provider:"Jordan"  },
  14:{status:"fa",      note:"Whitening",      ts:new Date(Date.now()-600000),  apptTypes:["LOE"], provider:"Jordan"  },
};
const PROVIDERS = ["Dr. Tang","Dr. Ngo","Jordan"];
const INIT_ALL_OPS = Object.keys(DEMO).map(Number).map(id=>({id,enabled:true}));

// ── Popup Queue Item ──────────────────────────────────────────────────────────
function QueueItem({ item, ops, onDismiss, onDragStart, onDragEnter, isDragging }) {
  const [swipeX, setSwipeX]     = useState(0);
  const [swiping, setSwiping]   = useState(false);
  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const { op, type } = item;
  const cfg = SM.pending; // TV queue is AWFA only

  const DISMISS_PCT = 0.3;
  const width = () => containerRef.current?.offsetWidth || 600;
  const pct = Math.min(swipeX / width(), 1);
  const isDismissing = pct >= DISMISS_PCT;

  // Mouse swipe on the card body (NOT the drag handle)
  const onCardMouseDown = e => {
    e.preventDefault(); // prevent text selection
    startX.current = e.clientX; startY.current = e.clientY; setSwiping(true);
  };
  useEffect(() => {
    if (!swiping) return;
    const onMove = e => {
      const dx = e.clientX - startX.current;
      const dy = Math.abs(e.clientY - startY.current);
      if (dy > 24) { setSwipeX(0); setSwiping(false); return; }
      setSwipeX(Math.max(0, dx));
    };
    const onUp = () => {
      setSwiping(false);
      if (Math.min(swipeX / width(), 1) >= DISMISS_PCT) onDismiss(item.id);
      else setSwipeX(0);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [swiping, swipeX]);

  // Touch swipe
  const onTouchStart = e => { startX.current=e.touches[0].clientX; startY.current=e.touches[0].clientY; };
  const onTouchMove  = e => {
    const dx=e.touches[0].clientX-startX.current; const dy=Math.abs(e.touches[0].clientY-startY.current);
    if(dy>24){setSwipeX(0);return;} setSwipeX(Math.max(0,dx));
  };
  const onTouchEnd = () => { if(pct>=DISMISS_PCT) onDismiss(item.id); else setSwipeX(0); };

  const arrowCount = Math.max(1, Math.ceil(pct * 5));
  const showArrows = swipeX > 8;

  return (
    <div ref={containerRef}
      onDragEnter={() => onDragEnter(item.id)}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ position:"relative", overflow:"hidden", borderRadius:"12px",
        border:`2px solid ${isDismissing ? "rgba(220,50,50,0.9)" : cfg.numColor}`,
        background: isDismissing ? "rgba(220,50,50,0.25)" : cfg.bg,
        marginBottom:"10px", transform:`translateX(${swipeX}px)`,
        transition: swiping ? "none" : "transform 0.3s ease",
        opacity: isDragging ? 0.5 : 1, userSelect:"none" }}>

      {/* Animated right-pointing arrows */}
      {showArrows && (
        <div style={{ position:"absolute", left:"50px", top:"50%", transform:"translateY(-50%)", display:"flex", alignItems:"center", gap:"2px", zIndex:10, pointerEvents:"none" }}>
          {Array.from({length:arrowCount}).map((_,i)=>(
            <span key={i} style={{ fontSize:"32px", color: isDismissing ? "#ff4444" : cfg.numColor,
              opacity: 0.2 + (i / arrowCount) * 0.8,
              animation:"arrowPulse 0.5s ease-in-out infinite",
              animationDelay:`${i * 0.1}s`, display:"block", lineHeight:1 }}>{"➡"}</span>
          ))}
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", padding:"14px 20px", gap:"16px" }}>
        {/* Drag handle — ONLY this triggers HTML drag for reordering */}
        <div
          draggable
          onDragStart={e => { e.stopPropagation(); onDragStart(item.id); }}
          style={{ fontSize:"24px", color:cfg.numColor, cursor:"grab", flexShrink:0, padding:"4px 6px", borderRadius:"4px" }}
          title="Drag to reorder">↕</div>

        {/* Card body — mousedown here triggers swipe */}
        <div style={{ display:"flex", flex:1, alignItems:"center", gap:"16px", cursor: swiping ? "grabbing" : "grab" }}
          onMouseDown={onCardMouseDown}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"48px", lineHeight:1, color:cfg.numColor, flexShrink:0 }}>Op {op}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:cfg.numColor, opacity:0.8, letterSpacing:"0.1em" }}>
            {type === "awfa" ? "AWAITING FA" : "PATIENT READY FOR TX"}
          </div>
          {(ops[op]?.apptTypes||[]).length>0 && (
            <div style={{ fontSize:"20px", fontWeight:700, color:cfg.numColor, padding:"4px 14px", borderRadius:"6px", background:`${cfg.numColor}22`, border:`1px solid ${cfg.numColor}55` }}>
              {(ops[op].apptTypes||[]).join(' · ')}
            </div>
          )}
          {ops[op]?.note && (
            <div style={{ flex:1, fontSize:"18px", fontWeight:600, color:"rgba(255,255,255,0.7)" }}>{ops[op].note}</div>
          )}
          <div style={{ marginLeft:"auto", fontSize:"16px", fontWeight:600, color:cfg.numColor }}>{elapsed(ops[op]?.ts)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Main TV Component ─────────────────────────────────────────────────────────
// ── Corner Notification Banner Component (Option A) ──────────────────────────
// Replaces full-screen popup. Shows in bottom-right, doesn't cover board.
function CornerNotification({popup, ops, onDismiss, onShowQueue, queueCount, pulsing}){
  if(!popup) return null;
  const cfg = SM[popup.status]||SM.pending;
  const statusLabel = STATUSES.find(s=>s.key===popup.status)?.abbr||popup.status;
  const op = popup.op;
  const elapsedStr = ops[op]?.ts ? elapsed(ops[op].ts) : '';
  return(
    <div style={{
      position:"absolute", bottom:"80px", right:"20px", zIndex:600,
      width:"clamp(220px,22vw,320px)",
      background:cfg.bg, border:`2px solid ${cfg.numColor}`,
      borderRadius:"14px", padding:"14px 16px",
      boxShadow:`0 0 40px ${cfg.numColor}88, 0 8px 32px rgba(0,0,0,0.6)`,
      animation:pulsing?"awfaPulse 1.8s ease-in-out infinite":"none",
      cursor:"pointer", userSelect:"none",
    }} onClick={onDismiss}>
      {/* Header row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(11px,1.2vw,16px)",
          letterSpacing:"0.15em",color:cfg.numColor,opacity:0.75}}>
          ⚠ {statusLabel}
        </div>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"clamp(10px,1vw,13px)",
          color:cfg.numColor,opacity:0.6}}>{elapsedStr}</div>
      </div>
      {/* Op number */}
      <div style={{fontFamily:"'Bebas Neue',sans-serif",
        fontSize:"clamp(40px,6vw,80px)",lineHeight:0.9,
        color:cfg.numColor,textShadow:`0 0 20px ${cfg.numColor}`}}>
        Op {op}
      </div>
      {/* Appt type + note */}
      <div style={{marginTop:"6px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
        {(ops[op]?.apptTypes||[]).length>0&&(
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(14px,1.5vw,20px)",
            letterSpacing:"0.08em",color:cfg.numColor,
            background:`${cfg.numColor}22`,padding:"2px 10px",borderRadius:"5px",
            border:`1px solid ${cfg.numColor}55`}}>
            {(ops[op].apptTypes||[]).join(' · ')}
          </span>
        )}
        {ops[op]?.note&&(
          <span style={{fontSize:"clamp(11px,1.1vw,14px)",color:cfg.numColor,
            opacity:0.75,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",
            whiteSpace:"nowrap",maxWidth:"100%"}}>
            {ops[op].note}
          </span>
        )}
      </div>
      {/* Dismiss hint + queue count */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"10px",
        paddingTop:"8px",borderTop:`1px solid ${cfg.numColor}33`}}>
        <span style={{fontSize:"clamp(9px,0.9vw,12px)",color:cfg.numColor,opacity:0.5,
          fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>TAP TO DISMISS</span>
        {queueCount>1&&(
          <span onClick={e=>{e.stopPropagation();onShowQueue();}}
            style={{fontSize:"clamp(9px,0.9vw,12px)",color:cfg.numColor,opacity:0.8,
              fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.08em",
              background:`${cfg.numColor}22`,padding:"2px 8px",borderRadius:"5px",
              border:`1px solid ${cfg.numColor}44`,cursor:"pointer"}}>
            +{queueCount-1} MORE
          </span>
        )}
      </div>
    </div>
  );
}

function TVDisplay() {
  const [ops, setOps]   = useState(DEMO);
  const [allOpsState, setAllOpsState] = useState(INIT_ALL_OPS);
  const [antsOps, setAntsOps] = useState(new Set());

  const [,setTick]    = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [customAbbrevs, setCustomAbbrevs] = useState([]);
  const [providerColors, setProviderColors] = useState({});
  const [activeProviders, setActiveProviders] = useState(PROVIDERS); // synced from server // offline detection
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(()=>{const id=setInterval(()=>setTick(t=>t+1),60000);return()=>clearInterval(id);},[]);
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id);},[]);

  // ── Socket.io — receive-only (TV is display only) ────────────────────────
  useEffect(()=>{
    if(typeof socket==='undefined') return;
    const onState=state=>{
      if(state.customAbbrevs) setCustomAbbrevs(state.customAbbrevs);
      if(state.providerColors) setProviderColors(state.providerColors);
      if(state.activeProviders) setActiveProviders(state.activeProviders);
      if(state.allOps) setAllOpsState(state.allOps);
      if(state.ops) setOps(prev=>{
        const merged={...prev};
        Object.keys(state.ops).forEach(k=>{
          merged[k]={...state.ops[k],ts:state.ops[k].ts?new Date(state.ops[k].ts):null,noteUpdatedAt:state.ops[k].noteUpdatedAt||null};
        });
        return merged;
      });
      setLastUpdated(new Date());
    };
    socket.on('state',onState);
    socket.on('connect',()=>{setIsOnline(true);setLastUpdated(new Date());});
    socket.on('disconnect',()=>{setIsOnline(false);setLastDisconnected(new Date());});
    return()=>{socket.off('state',onState);socket.off('connect');socket.off('disconnect');};
  },[]);

  // Simulate offline toggle for preview — in production this uses socket connection events
  useEffect(()=>{
    const handleOnline=()=>{setIsOnline(true);setLastUpdated(new Date());};
    const handleOffline=()=>setIsOnline(false);
    window.addEventListener("online",handleOnline);
    window.addEventListener("offline",handleOffline);
    return()=>{window.removeEventListener("online",handleOnline);window.removeEventListener("offline",handleOffline);};
  },[]);
  const ALL_OPS = allOpsState.filter(o=>o.enabled).map(o=>o.id);
  const fmtDateTime=d=>{const mo=d.getMonth()+1,day=d.getDate(),yr=d.getFullYear();let h=d.getHours(),m=d.getMinutes(),ampm=h>=12?'PM':'AM';h=h%12||12;return`${mo}/${day}/${yr}  ${h}:${String(m).padStart(2,'0')} ${ampm}`;};
  const offlineMinutes=Math.floor((now-lastUpdated)/60000);
  // Queue is DERIVED from ops status — RDY ops only for TV

  const providerCols = PROVIDERS.map(p=>({name:p,rooms:ALL_OPS.filter(op=>ops[op]?.provider===p)})).filter(p=>p.rooms.length>0);
  const n = providerCols.length;
  const abbreviatedNotes=useMemo(()=>{
    const r={};
    ALL_OPS.forEach(op=>{r[op]=ops[op]?.note?abbreviateNote(ops[op].note,customAbbrevs):'';});
    return r;
  },[ops,customAbbrevs]);

  const[showKioskExit,setShowKioskExit]=useState(false);
  const exitKiosk=()=>{
    // In production: sends signal to close Chromium kiosk
    // Preview: just shows confirmation
    if(typeof window!=='undefined'&&window.location.hostname!=='localhost'&&window.location.hostname!=='127.0.0.1'){
      fetch('/api/exit-kiosk',{method:'POST'}).catch(()=>{});
    }
    setShowKioskExit(false);
  };

  return (
    <ScaledWrapper designW={1920} designH={1080}>
      <div style={S.root}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap"/>
        <style>{css}</style>

        {/* Offline Banner */}
        {!isOnline&&(
          <div style={{position:"absolute",top:0,left:0,right:0,zIndex:999,background:"rgba(220,38,38,0.95)",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:"16px",backdropFilter:"blur(4px)"}}>
            <span style={{fontSize:"28px"}}>⚠</span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",letterSpacing:"0.15em",color:"#fff"}}>
              OFFLINE · DOWN SINCE {lastDisconnected?lastDisconnected.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"UNKNOWN"}
            </span>
            <span style={{fontSize:"28px"}}>⚠</span>
          </div>
        )}

        {/* ── Header ── */}
        <div style={S.header}>
          <span dangerouslySetInnerHTML={{__html:LOGO_SVG}} style={{display:"flex",alignItems:"center",flexShrink:0}}/>
          <div style={{flex:1,display:"flex",justifyContent:"center"}}>
            <div style={S.headerTitle}>OPERATORY STATUS</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
            {/* Connection dot */}
            <div style={{width:"12px",height:"12px",borderRadius:"50%",background:isOnline?"#4ade80":"#ef4444",boxShadow:isOnline?"0 0 8px #4ade80":"0 0 8px #ef4444",flexShrink:0}}/>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"clamp(14px,1.4vw,22px)",fontWeight:600,letterSpacing:"0.06em",color:"rgba(255,255,255,0.75)",textAlign:"right"}}>
              {fmtDateTime(now)}
            </div>
          </div>
        </div>



        {/* ── Provider columns ── */}
        <div style={{...S.providerGrid, gridTemplateColumns:`repeat(${n},1fr)`}}>
          {providerCols.map(({name,rooms},ci)=>{
            const safeN=Math.max(n,1);
            const maxRooms=providerCols.length>0?Math.max(...providerCols.map(p=>p.rooms.length)):1;
            const numSize  =`clamp(120px,${30/safeN}vw,480px)`;
            const badgeSize=`clamp(66px,${14.4/safeN}vw,240px)`;
            const apptSize =`clamp(33px,${6.6/safeN}vw,120px)`;
            const noteSize =`clamp(32px,${5/safeN}vw,80px)`;  // 32px min — readable at 15ft
            const timerSize=`clamp(22px,${3/safeN}vw,50px)`;
            const nameSize =`clamp(48px,${10/safeN}vw,144px)`;
            const provColor=providerColors?.[name]||'#fff';
            return(
              <div key={name} style={S.providerCol}>
                <div style={{...S.providerName,fontSize:nameSize,color:provColor}}>{name}</div>
                <div style={{...S.providerDivider,background:provColor}}/>
                {rooms.length===0&&(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.3}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(16px,2vw,28px)",letterSpacing:"0.12em",color:"rgba(255,255,255,0.6)",textAlign:"center"}}>NO OPS ASSIGNED</div>
                  </div>
                )}
                <div style={{flex:1,minHeight:0,display:"grid",gridTemplateRows:`repeat(${maxRooms},1fr)`,gap:"8px"}}>
                  {rooms.map(op=>{
                    const{status,note,ts,apptTypes=[]}=ops[op]||{};
                    const cfg=SM[status]||SM.awaiting;
                    const isInactive=status==="inactive";
                    const cardAnim=(status==="ready"||status==="pending")&&!isInactive
                      ? "slowPulse 2.5s ease-in-out infinite" : "none";
                    const isLight=status==="awaiting";
                    const textCol=isLight?"#111114":cfg.numColor;
                    const noteCol=isLight?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.85)";
                    const emptyBorder=isLight?"2px solid rgba(0,0,0,0.25)":status==="dirty"?"2px solid rgba(255,255,255,0.7)":"2px solid transparent";
                    const emptyDashCol=isLight?"rgba(0,0,0,0.4)":status==="dirty"?"rgba(255,255,255,0.8)":"transparent";
                    const cleanWithAppt=status==="awaiting"&&apptTypes?.length>0&&!isInactive;
                    return(
                      <div key={op} className={antsOps.has(op)?"card-ants":""} style={{...S.card,
                        background:cfg.bg,
                        border:antsOps.has(op)?"none":cleanWithAppt?`3px dashed rgba(160,160,160,0.8)`:`2px solid ${cfg.border}`,
                        boxShadow:cleanWithAppt?"none":status==="awaiting"?"0 0 16px rgba(255,255,255,0.2)":"none",
                        opacity:isInactive?0.3:1,animation:cardAnim}}>
                        {/* Upper 60%: op + appt + status + timer */}
                        <div style={{position:"absolute",top:0,left:0,right:0,height:"60%",display:"flex",alignItems:"center",padding:"0 14px",gap:"clamp(8px,1vw,18px)",overflow:"hidden"}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:numSize,lineHeight:1,color:textCol,flexShrink:0,minWidth:"1.2ch"}}>{op}</span>
                          {!isInactive&&(apptTypes&&apptTypes.length>0
                            ? <div style={{display:"flex",gap:"4px",overflow:"hidden",flexShrink:1}}>
                                {[...(apptTypes||[])].sort((a,b)=>(STATUSES.indexOf?-1:0)||(typeof INIT_APPT_TYPES!=="undefined"?INIT_APPT_TYPES.indexOf(a)-INIT_APPT_TYPES.indexOf(b):0)).map(t=>(
                                  <span key={t} style={{fontSize:apptSize,fontWeight:700,padding:"4px 10px",borderRadius:"6px",background:`${textCol}22`,border:`2px solid ${textCol}55`,color:textCol,flexShrink:0,whiteSpace:"nowrap",textTransform:"uppercase"}}>{APPT_ABBR_MAP[t]||t}</span>
                                ))}
                              </div>
                            : <span style={{fontSize:apptSize,fontWeight:700,padding:"4px 12px",borderRadius:"6px",background:"transparent",border:emptyBorder,color:emptyDashCol,flexShrink:0}}>—</span>
                          )}
                          {!isInactive&&<span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:badgeSize,lineHeight:1,color:textCol,flexShrink:0,letterSpacing:"0.04em"}}>{cfg.abbr}</span>}
                          {ts&&!isInactive&&<span style={{marginLeft:"auto",fontSize:timerSize,fontWeight:700,color:textCol,flexShrink:0}}>{elapsed(ts)}</span>}
                        </div>
                        {/* Lower 40%: note */}
                        <div style={{position:"absolute",top:"60%",left:0,right:0,height:"40%",display:"flex",alignItems:"center",padding:"0 14px",overflow:"hidden"}}>
                          <span style={{fontSize:noteSize,fontWeight:700,color:note?noteCol:"transparent",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%"}}>{abbreviatedNotes[op]||""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {ci<providerCols.length-1&&<div style={S.colDivider}/>}
              </div>
            );
          })}
        </div>

        {/* ── Test buttons (demo only) ── */}
        { (
          <div style={{position:"absolute",bottom:"24px",left:"28px",display:"flex",gap:"12px",zIndex:500}}>
            <button onClick={()=>{
              const activeOps = ALL_OPS.filter(op=>ops[op]?.provider);
              const op = activeOps[Math.floor(Math.random()*activeOps.length)];
              setOps(p=>({...p,[op]:{...p[op],status:"ready",ts:new Date()}}));
              setPopups(p=>[...p,{id:Date.now(),op,type:"rdy",ts:new Date()}]);
            }} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.12em",padding:"8px 18px",borderRadius:"8px",background:"rgba(74,222,128,0.15)",border:"1px solid #4ade80",color:"#4ade80",cursor:"pointer"}}>+ RDY</button>
            <button onClick={()=>{
              // TEST ONLY — set all RDY ops back to Clean
              setOps(p=>{
                const updated={...p};
                ALL_OPS.forEach(op=>{ if(updated[op]?.status==='ready') updated[op]={...updated[op],status:'awaiting',ts:new Date()}; });
                return updated;
              });
            }} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.12em",padding:"8px 18px",borderRadius:"8px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>CLEAR ALL ⚠ TEST</button>
          </div>
        )}

        {/* ── Queue screen ── */}
        {showKioskExit&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#1a1a22",borderRadius:"16px",padding:"32px",width:"500px",textAlign:"center",border:"1px solid rgba(255,255,255,0.15)"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",letterSpacing:"0.12em",color:"#fff",marginBottom:"8px"}}>EXIT KIOSK MODE?</div>
              <div style={{fontSize:"14px",color:"rgba(255,255,255,0.4)",marginBottom:"24px"}}>This will close the TV display and return to the desktop.</div>
              <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
                <button onClick={()=>setShowKioskExit(false)} style={{padding:"12px 28px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"10px",color:"rgba(255,255,255,0.6)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.1em",cursor:"pointer"}}>CANCEL</button>
                <button onClick={exitKiosk} style={{padding:"12px 28px",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:"10px",color:"#ef4444",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.1em",cursor:"pointer"}}>EXIT KIOSK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScaledWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root: { position:"relative", width:"1920px", height:"1080px", background:"#080a0c", backgroundImage:"radial-gradient(ellipse at 20% 0%, rgba(59,130,246,0.08) 0%, transparent 50%)", fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column", padding:"18px 22px 14px", gap:"12px", boxSizing:"border-box", overflow:"hidden" },
  header: { display:"flex", alignItems:"center", borderBottom:"2px solid rgba(255,255,255,0.15)", paddingBottom:"12px", flexShrink:0, gap:"16px" },
  headerTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(24px,3.2vw,48px)", letterSpacing:"0.15em", color:"#fff" },
  headerSub: { fontSize:"clamp(10px,1.1vw,16px)", letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)", fontWeight:300 },
  legend: { marginLeft:"auto", display:"flex", gap:"20px", flexWrap:"wrap", alignItems:"center" },
  providerGrid: { flex:1, minHeight:0, display:"grid", gap:"0" },
  providerCol: { display:"flex", flexDirection:"column", gap:"8px", minHeight:0, padding:"0 14px", position:"relative" },
  providerName: { fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.12em", color:"#fff", flexShrink:0, whiteSpace:"nowrap" },
  providerDivider: { height:"3px", background:"#fff", flexShrink:0, borderRadius:"2px", marginBottom:"4px" },
  colDivider: { position:"absolute", right:0, top:0, bottom:0, width:"2px", background:"#fff", opacity:0.8 },
  roomCol: { flex:1, minHeight:0, display:"flex", flexDirection:"column", gap:"8px" },
  card: { borderRadius:"10px", padding:0, display:"flex", flexDirection:"column", flex:1, minHeight:0, transition:"all .25s", position:"relative", overflow:"hidden" },
  cardRow: { display:"flex", alignItems:"center", gap:"12px", width:"100%" },
};

const css = `
  * { box-sizing:border-box; margin:0; padding:0; }
  html,body { height:100%; overflow:hidden; }
  @keyframes awfaPulse { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
  @keyframes slowPulse { 0%,100%{opacity:1;} 50%{opacity:0.55;} }
  
  @keyframes arrowPulse { 0%,100%{transform:translateX(0);} 50%{transform:translateX(4px);} }
  @keyframes marchDash { to { stroke-dashoffset: -40; } }
  @keyframes antsMarch { to { background-position: 100% 0, 0 100%, 0 0, 100% 100%; } }
  .card-ants {
    background-image:
      repeating-linear-gradient(90deg, #fff 0, #fff 8px, transparent 8px, transparent 16px),
      repeating-linear-gradient(90deg, #fff 0, #fff 8px, transparent 8px, transparent 16px),
      repeating-linear-gradient(0deg,  #fff 0, #fff 8px, transparent 8px, transparent 16px),
      repeating-linear-gradient(0deg,  #fff 0, #fff 8px, transparent 8px, transparent 16px) !important;
    background-size: 200% 2px, 200% 2px, 2px 200%, 2px 200% !important;
    background-position: 0 0, 0 100%, 0 0, 100% 0 !important;
    background-repeat: no-repeat !important;
    animation: antsMarch 0.6s linear infinite !important;
    border: none !important;
  }
  @keyframes slideIn { from{opacity:0;transform:scale(0.92);} to{opacity:1;transform:scale(1);} }
  .popup-awfa { animation: popupFlashAwfa 2.5s ease-in-out infinite, slideIn .4s ease; }
  .popup-rdy  { animation: popupFlashRdy  2.5s ease-in-out infinite, slideIn .4s ease; }
  @keyframes popupFlashAwfa {
    0%,100% { background:#ff69b4; }
    50%     { background:#3d0a20; }
  }
  @keyframes popupFlashRdy {
    0%,100% { background:#4ade80; }
    50%     { background:#052210; }
  }
`;

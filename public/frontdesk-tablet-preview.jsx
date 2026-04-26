

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




function playChimeFD(color="#ff69b4"){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const freqs=color==="#ff69b4"?[880,1100,1320]:[660,880,1100];freqs.forEach((freq,i)=>{const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type="sine";osc.frequency.value=freq;const t=ctx.currentTime+i*0.18;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.3,t+0.04);gain.gain.exponentialRampToValueAtTime(0.001,t+0.6);osc.start(t);osc.stop(t+0.65);});}catch(e){}}

function ScaledWrapper({children,designW=1340,designH=800}){const[scale,setScale]=useState(1);useEffect(()=>{const u=()=>setScale(Math.min(window.innerWidth/designW,window.innerHeight/designH));u();window.addEventListener("resize",u);return()=>window.removeEventListener("resize",u);},[designW,designH]);return(<div style={{width:"100vw",height:"100vh",overflow:"hidden",background:"#0a0a0c",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:designW,height:designH,transform:`scale(${scale})`,transformOrigin:"center center",flexShrink:0}}>{children}</div></div>);}

const LOGO_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 70" height="36"><g transform="translate(35,35)"><g fill="rgba(255,255,255,0.55)"><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(0)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(30)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(60)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(90)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(120)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(150)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(180)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(210)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(240)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(270)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(300)"/><path d="M-5,-22 Q-6,-28 0,-30 Q6,-28 5,-22 L3,-10 Q0,-8 -3,-10 Z" transform="rotate(330)"/></g><circle r="8" fill="rgba(255,255,255,0.7)"/></g><text x="82" y="28" font-family="Arial,sans-serif" font-size="22" font-weight="800" letter-spacing="2.5" fill="rgba(255,255,255,0.85)">DENTISTS</text><text x="83" y="50" font-family="Arial,sans-serif" font-size="13" font-weight="400" letter-spacing="3.5" fill="rgba(255,255,255,0.55)">OF WEST HENDERSON</text></svg>`;

const STATUSES=[{key:"ready",abbr:"Ready",numColor:"#4ade80",bg:"rgba(34,197,94,0.12)",border:"rgba(34,197,94,0.45)",glow:"0 0 20px rgba(74,222,128,0.4)"},{key:"treatment",abbr:"Reserved",numColor:"#60a5fa",bg:"rgba(59,130,246,0.12)",border:"rgba(59,130,246,0.45)",glow:"0 0 20px rgba(96,165,250,0.4)"},{key:"pending",abbr:"Awaiting FA",numColor:"#ff69b4",bg:"rgba(255,105,180,0.12)",border:"rgba(255,105,180,0.45)",glow:"0 0 20px rgba(255,105,180,0.5)"},{key:"fa",abbr:"Reviewing FA",numColor:"#facc15",bg:"rgba(234,179,8,0.10)",border:"rgba(234,179,8,0.45)",glow:"0 0 20px rgba(250,204,21,0.4)"},{key:"dirty",abbr:"Dirty",numColor:"#ff2020",bg:"rgba(255,0,0,0.15)",border:"rgba(255,0,0,0.55)",glow:"0 0 20px rgba(255,0,0,0.5)"},{key:"awaiting",abbr:"Clean",numColor:"#111114",bg:"rgba(255,255,255,0.95)",border:"rgba(255,255,255,0.95)",glow:"0 0 20px rgba(255,255,255,0.4)"},{key:"inactive",abbr:"Not In Use",numColor:"#ffffff",bg:"rgba(80,80,90,0.40)",border:"rgba(130,130,145,0.50)",glow:"none"}];
const SM=Object.fromEntries(STATUSES.map(s=>[s.key,s]));
const elapsed=d=>{if(!d)return"";const s=Math.floor((Date.now()-d.getTime())/1000);if(s<60)return"<1m";if(s<3600)return`${Math.floor(s/60)}m`;return`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;};

const DEMO={1:{status:"ready",note:"New patient",ts:new Date(Date.now()-120000),apptTypes:["NP"],provider:"Dr. Tang"},2:{status:"treatment",note:"Crown prep",ts:new Date(Date.now()-840000),apptTypes:["Tx"],provider:"Dr. Tang"},3:{status:"dirty",note:"",ts:new Date(Date.now()-300000),apptTypes:[],provider:"Dr. Tang"},4:{status:"ready",note:"X-rays done",ts:new Date(Date.now()-60000),apptTypes:["OV"],provider:"Dr. Tang"},
  5:{status:"awaiting",note:"",ts:new Date(Date.now()-150000),apptTypes:[],provider:"Dr. Tang"},6:{status:"dirty",note:"",ts:new Date(Date.now()-200000),apptTypes:[],provider:"Dr. Ngo"},7:{status:"ready",note:"",ts:new Date(Date.now()-90000),apptTypes:["OV"],provider:"Dr. Ngo"},8:{status:"treatment",note:"Implant consult",ts:new Date(Date.now()-1200000), apptTypes:["Tx"],  provider:"Dr. Ngo" },
  9:{status:"awaiting", note:"",               ts:new Date(Date.now()-180000),  apptTypes:[],  provider:"Dr. Ngo" },
  9:{status:"awaiting", note:"",               ts:new Date(Date.now()-180000),  apptTypes:[],  provider:"Dr. Ngo" },10:{status:"pending",note:"SRP Q2",ts:new Date(Date.now()-360000),apptTypes:["SRP"],provider:"Dr. Ngo"},11:{status:"treatment",note:"Root canal",ts:new Date(Date.now()-2100000),apptTypes:["Tx"],provider:"Jordan"},12:{status:"awaiting", note:"",               ts:new Date(Date.now()-30000),   apptTypes:["OV"],  provider:"Jordan"  },
  13:{status:"awaiting", note:"",               ts:new Date(Date.now()-90000),   apptTypes:[],  provider:"Jordan"  },14:{status:"fa",note:"Whitening",ts:new Date(Date.now()-600000),apptTypes:["LOE"],provider:"Jordan"}};
const PROVIDERS=["Dr. Tang","Dr. Ngo","Jordan"];
const ALL_OPS=Object.keys(DEMO).map(Number);

// ── History Modal — working tabs + custom date range ─────────────────────────
function HistoryModal({ ops, statuses, allOps, onClose }) {
  const TABS = ["Today", "7 Days", "30 Days", "Custom"];
  const [tab, setTab] = useState("Today");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0,10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10));

  const getRangeMs = () => {
    const now = Date.now();
    if (tab === "Today")   return { from: new Date().setHours(0,0,0,0), to: now };
    if (tab === "7 Days")  return { from: now - 7*24*60*60*1000, to: now };
    if (tab === "30 Days") return { from: now - 30*24*60*60*1000, to: now };
    // Custom
    const from = new Date(startDate).getTime();
    const to   = new Date(endDate).getTime() + 86400000; // include end day
    return { from, to };
  };

  const computeStats = () => {
    const { from, to } = getRangeMs();
    const nowMs = Date.now();
    const groups = {};
    statuses.forEach(s => { groups[s.key] = []; });
    allOps.forEach(op => {
      const o = ops[op];
      if (!o || !o.ts || !o.provider) return;
      const t = o.ts.getTime();
      if (t >= from && t <= to) {
        // Elapsed = time since status was set (not time to range end)
        const mins = Math.floor((Math.min(nowMs, to) - t) / 60000);
        if (mins >= 0) groups[o.status]?.push(mins);
      }
    });
    return groups;
  };

  const groups   = computeStats();
  const maxAvg   = Math.max(...statuses.map(s => {
    const arr = groups[s.key];
    return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  }), 1);

  return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(4px)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}
      onMouseDown={onClose}>
      <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"24px",width:"520px",color:"#fff",fontFamily:"'DM Sans',sans-serif"}}
        onMouseDown={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",letterSpacing:"0.12em",marginBottom:"4px"}}>STATUS HISTORY</div>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",letterSpacing:"0.06em",marginBottom:"16px"}}>Average Time Elapsed</div>

        {/* Tab buttons */}
        <div style={{display:"flex",gap:"8px",marginBottom:tab==="Custom"?"12px":"16px"}}>
          {TABS.map(l=>(
            <button key={l}
              style={{flex:1,padding:"8px",background:tab===l?"rgba(255,255,255,0.12)":"transparent",border:`1px solid ${tab===l?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`,borderRadius:"6px",color:tab===l?"#fff":"rgba(255,255,255,0.4)",fontFamily:"'DM Sans',sans-serif",fontSize:"12px",cursor:"pointer",fontWeight:tab===l?700:400,transition:"all .15s"}}
              onMouseDown={e=>{e.stopPropagation();setTab(l);}}>
              {l}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {tab==="Custom" && (
          <div style={{display:"flex",gap:"12px",marginBottom:"16px",alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"10px",letterSpacing:"0.12em",color:"rgba(255,255,255,0.35)",marginBottom:"4px"}}>START</div>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{width:"100%",padding:"8px 10px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"7px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",outline:"none",cursor:"pointer"}}
                onMouseDown={e=>e.stopPropagation()}/>
            </div>
            <div style={{color:"rgba(255,255,255,0.3)",fontSize:"18px",paddingTop:"18px"}}>→</div>
            <div style={{flex:1}}>
              <div style={{fontSize:"10px",letterSpacing:"0.12em",color:"rgba(255,255,255,0.35)",marginBottom:"4px"}}>END</div>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                style={{width:"100%",padding:"8px 10px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"7px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",outline:"none",cursor:"pointer"}}
                onMouseDown={e=>e.stopPropagation()}/>
            </div>
          </div>
        )}

        {/* Status bars */}
        {statuses.map(s => {
          const arr    = groups[s.key];
          const avgMin = arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
          const pct    = (avgMin / maxAvg) * 90 + (avgMin > 0 ? 5 : 0);
          const dc     = s.key==="awaiting" ? "#fff" : s.numColor;
          return (
            <div key={s.key} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
              <span style={{fontSize:"11px",fontWeight:700,color:dc,width:"100px",textAlign:"right",whiteSpace:"nowrap"}}>{s.abbr}</span>
              <div style={{flex:1,height:"8px",background:"rgba(255,255,255,0.06)",borderRadius:"4px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:dc,borderRadius:"4px",transition:"width 0.5s ease"}}/>
              </div>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",width:"56px",textAlign:"right"}}>
                {avgMin > 0 ? `${avgMin}m` : "—"}
              </span>
            </div>
          );
        })}

        <button style={{marginTop:"16px",width:"100%",padding:"10px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"rgba(255,255,255,0.6)",fontFamily:"'DM Sans',sans-serif",cursor:"pointer",fontSize:"14px"}}
          onMouseDown={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── Floating menu — position computed from card's offsetTop in design space ──

// Queue Item — drag to reorder only, no swipe dismiss
// Items only leave queue when status changes
function QueueItem({item,ops,onDragStart,onDragEnter,isDragging}){
  const{op,type}=item;
  const cfg=type==="awfa"?SM.pending:SM.ready;
  return(
    <div onDragEnter={()=>onDragEnter(item.id)}
      style={{position:"relative",borderRadius:"10px",border:`2px solid ${cfg.numColor}`,background:cfg.bg,marginBottom:"8px",opacity:isDragging?0.5:1,userSelect:"none"}}>
      <div style={{display:"flex",alignItems:"center",padding:"10px 16px",gap:"12px"}}>
        <div draggable onDragStart={e=>{e.stopPropagation();onDragStart(item.id);}}
          style={{fontSize:"18px",color:cfg.numColor,cursor:"grab",flexShrink:0,padding:"3px 5px",borderRadius:"4px"}}
          title="Drag to reorder">↕</div>
        <div style={{display:"flex",flex:1,alignItems:"center",gap:"8px"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",lineHeight:1,color:cfg.numColor,flexShrink:0}}>Op {op}</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:cfg.numColor,opacity:0.8,letterSpacing:"0.1em"}}>{type==="awfa"?"AWAITING FA":"READY"}</div>
          {(ops[op]?.apptTypes||[]).length>0&&(ops[op].apptTypes||[]).map(t=><span key={t} style={{fontSize:"14px",fontWeight:700,color:cfg.numColor,padding:"2px 8px",borderRadius:"5px",background:`${cfg.numColor}22`,border:`1px solid ${cfg.numColor}55`,marginRight:"3px"}}>{t}</span>)}
          {ops[op]?.note&&<div style={{flex:1,fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{ops[op].note}</div>}
          <div style={{marginLeft:"auto",fontSize:"12px",fontWeight:600,color:cfg.numColor}}>{elapsed(ops[op]?.ts)}</div>
        </div>
      </div>
    </div>
  );
}

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
            {(ops[op].apptTypes||[]).join(" · ")}
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

// ── FitText: renders text that auto-shrinks to fit maxRows, never truncates ──
function FitText({text,maxSz,minSz=10,maxRows=3,color,fontFamily,fontWeight}){
  const ref=useRef(null);
  const[sz,setSz]=useState(maxSz);
  useEffect(()=>{
    const el=ref.current;
    if(!el||!text)return;
    let current=maxSz;
    el.style.fontSize=current+'px';
    // Shrink until content fits within maxRows * lineHeight
    while(current>minSz){
      const lineH=current*1.2;
      const maxH=lineH*maxRows;
      if(el.scrollHeight<=maxH+2)break;
      current=Math.max(minSz,current-1);
      el.style.fontSize=current+'px';
    }
    setSz(current);
  },[text,maxSz,maxRows,minSz]);
  return(
    <div ref={ref} style={{
      fontSize:sz+'px',color,fontFamily,fontWeight,
      lineHeight:1.2,wordBreak:"break-word",
      overflowWrap:"break-word",overflow:"hidden",
      display:"-webkit-box",WebkitBoxOrient:"vertical",
      WebkitLineClamp:maxRows,
      textAlign:"left",width:"100%"
    }}>{text}</div>
  );
}

function FrontDeskTablet(){
  const[ops,setOps]=useState(DEMO);
  const[antsOps,setAntsOps]=useState(new Set());
  const[dismissedOps,setDismissedOps]=useState(new Set());
  const[queueOrder,setQueueOrder]=useState([]);
  const[showQueue,setShowQueue]=useState(false);
  const[dragId,setDragId]=useState(null);
  const[dragOverId,setDragOverId]=useState(null);
  const[,setTick]=useState(0);
  const[noteEdit,setNoteEdit]=useState(null);
  const fdNoteTimeoutRef=useRef(null);
  const resetFDNoteTimeout=()=>{
    clearTimeout(fdNoteTimeoutRef.current);
    fdNoteTimeoutRef.current=setTimeout(()=>{
      // Auto-close without saving — original note in ops state is unchanged
      emitSocket('noteUnlock',{});
      setNoteEdit(null);
    },30000);
  };
  const[menu,setMenu]=useState(null);
  const[toast,setToast]=useState(null);
  const[customAbbrevs,setCustomAbbrevs]=useState([]);
  const[noteLocked,setNoteLocked]=useState(null);
  const[showHistory,setShowHistory]=useState(false);
  const[reminder,setReminder]=useState(null);
  const[notifStyle,setNotifStyle]=useState('corner'); // 'corner'|'topbar'|'cardonly'|'firstonly' // {op, status, elapsed} for 10-min warning
  const[dismissedReminders,setDismissedReminders]=useState(new Set()); // {op-status-ts} keys
  const soundTimer=useRef(null);
  const prevOpsRef=useRef({});
  const toastRef=useRef(null);

  const showToast=msg=>{setToast(msg);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),2000);};

  const emitSocket=(event,data)=>{ try{ if(typeof socket!=='undefined') socket.emit(event,data); }catch(e){} };

  // ── Socket.io — receive state from server ────────────────────────────────
  useEffect(()=>{
    if(typeof socket==='undefined') return;
    const onState=state=>{
      if(state.customAbbrevs) setCustomAbbrevs(state.customAbbrevs);
      if(state.ops) setOps(prev=>{
        const merged={...prev};
        Object.keys(state.ops).forEach(k=>{
          merged[k]={...state.ops[k],ts:state.ops[k].ts?new Date(state.ops[k].ts):null,noteUpdatedAt:state.ops[k].noteUpdatedAt||null};
        });
        return merged;
      });
      setLastUpdated(new Date());
    };
    socket.on('noteLock',({op,by})=>setNoteLocked({op,by}));
    socket.on('noteUnlock',()=>setNoteLocked(null));
    socket.on('state',onState);
    socket.on('connect',()=>{setIsOnline(true);setLastUpdated(new Date());});
    socket.on('disconnect',()=>{setIsOnline(false);setLastDisconnected(new Date());});
    const onUnload=()=>socket.emit('noteUnlock',{});
    window.addEventListener('beforeunload',onUnload);
    return()=>{socket.off('state',onState);socket.off('noteLock');socket.off('noteUnlock');socket.off('connect');socket.off('disconnect');window.removeEventListener('beforeunload',onUnload);};
  },[]);
  const APPT_TYPES=["NP","CCX","Treatment","LOE","Delivery","Office Visit","Prophy","PMT","SRP"];
const APPT_ABBR_MAP={"NP":"NP","CCX":"CCX","Treatment":"TX","LOE":"LOE","Delivery":"DEL","Office Visit":"OV","Prophy":"PRO","PMT":"PMT","SRP":"SRP"};
  const CLEAR_ON_STATUS=["awaiting","inactive"];
  const setStatus=(op,key)=>{
    const statusLabel=STATUSES.find(s=>s.key===key)?.abbr||key;
    setOps(p=>{
      const prev=p[op];
      const shouldClear=CLEAR_ON_STATUS.includes(key);
      return {...p,[op]:{...prev,status:key,ts:new Date(),
        note:shouldClear?"":prev.note,
        apptTypes:shouldClear?[]:prev.apptTypes,
      }};
    });
    showToast(`✓ Op ${op} → ${statusLabel}`);
    emitSocket('setStatus',{op,status:key});
    const _shouldClear=CLEAR_ON_STATUS.includes(key);
    if(_shouldClear){emitSocket('setNote',{op,note:""});emitSocket('setApptType',{op,apptTypes:[]});}
    setMenu(null);
  };
  const setApptType=(op,t)=>{
    setOps(p=>({...p,[op]:{...p[op],apptTypes:Array.isArray(t)?t:[]}}));
    showToast(`✓ Op ${op} → ${t||"No Appt Type"}`);
    emitSocket('setApptType',{op,apptTypes:t});
    setMenu(null);
  };

  useEffect(()=>{const id=setInterval(()=>setTick(t=>t+1),60000);return()=>clearInterval(id);},[]);
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id);},[]);

  // NoSleep — prevent screen sleep 7:45AM to 6:00PM
  useEffect(()=>{
    let wakeLock=null;
    const requestWake=async()=>{
      const h=new Date().getHours(),m=new Date().getMinutes();
      const mins=h*60+m;
      if(mins>=7*60+45&&mins<18*60){
        try{if('wakeLock' in navigator)wakeLock=await navigator.wakeLock.request('screen');}catch(e){}
      } else {
        if(wakeLock){try{await wakeLock.release();}catch(e){}wakeLock=null;}
      }
    };
    requestWake();
    const id=setInterval(requestWake,60000);
    return()=>{clearInterval(id);if(wakeLock)wakeLock.release().catch(()=>{});};
  },[]);
  const fmtDate=d=>{const mo=d.getMonth()+1,day=d.getDate(),yr=d.getFullYear();return `${mo}/${day}/${yr}`;};
  const fmtTime=d=>{let h=d.getHours(),m=d.getMinutes(),ampm=h>=12?"PM":"AM";h=h%12||12;return `${h}:${String(m).padStart(2,"0")} ${ampm}`;};
  const fmtDateTime=d=>{const mo=d.getMonth()+1,day=d.getDate(),yr=d.getFullYear();let h=d.getHours(),m=d.getMinutes(),ampm=h>=12?'PM':'AM';h=h%12||12;return`${mo}/${day}/${yr}   ${h}:${String(m).padStart(2,'0')} ${ampm}`;};
  const prevLen=useRef(0);

  // Queue = all AWFA ops, sorted by manual queueOrder then by timestamp
  const awfaOps=ALL_OPS.filter(op=>ops[op]?.provider&&ops[op]?.status==='pending');
  const popups=[...awfaOps]
    .sort((a,b)=>{
      const ai=queueOrder.indexOf(a), bi=queueOrder.indexOf(b);
      if(ai>=0&&bi>=0) return ai-bi; // both manually ordered
      if(ai>=0) return -1;            // a is ordered, b is new — b goes to end
      if(bi>=0) return 1;             // b is ordered, a is new — a goes to end
      return (ops[a].ts?new Date(ops[a].ts):0)-(ops[b].ts?new Date(ops[b].ts):0);
    })
    .map(op=>({id:op,op,type:'awfa',ts:ops[op].ts}));
  const queueCount=popups.length;

  // Sync queueOrder: add new ops at end, remove departed ops
  useEffect(()=>{
    setQueueOrder(prev=>{
      const current=new Set(awfaOps);
      const filtered=prev.filter(op=>current.has(op));
      const newOps=awfaOps.filter(op=>!prev.includes(op));
      return [...filtered,...newOps];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[awfaOps.length, awfaOps.join('-')]); // stable dep: changes only when ops enter/leave queue

  // When an op's status changes TO pending, remove it from dismissedOps so popup reappears
  useEffect(()=>{
    const prev=prevOpsRef.current;
    awfaOps.forEach(op=>{
      if(prev[op]?.status!=='pending'&&ops[op]?.status==='pending'){
        setDismissedOps(d=>{const n=new Set(d);n.delete(op);return n;});
      }
    });
    prevOpsRef.current={...ops};
  });

  // Active popup = first undismissed AWFA op
  const undismissedPopups=popups.filter(p=>!dismissedOps.has(p.op));
  const activePopup=undismissedPopups[0]||null;

  // Sound when new ops enter queue
  useEffect(()=>{
    if(popups.length===0){clearInterval(soundTimer.current);prevLen.current=0;return;}
    if(popups.length>prevLen.current){
      playChimeFD("#ff69b4");clearInterval(soundTimer.current);
      soundTimer.current=setInterval(()=>playChimeFD("#ff69b4"),60000);
    }
    prevLen.current=popups.length;
    return()=>{};
  },[popups.length]);

  // Dismiss = add op to dismissedOps — won't show again until status cycles
  const dismissFirst=()=>{
    if(!activePopup)return;
    if(activePopup)setDismissedOps(d=>new Set([...d,activePopup.op]));
  };

  const handleDragEnd=()=>{setDragId(null);setDragOverId(null);};

  const[isOnline,setIsOnline]=useState(true);
  const[lastUpdated,setLastUpdated]=useState(new Date());
  const[lastDisconnected,setLastDisconnected]=useState(null);
  useEffect(()=>{
    const on=()=>{setIsOnline(true);setLastUpdated(new Date());};
    const off=()=>setIsOnline(false);
    window.addEventListener("online",on);window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[]);

  // 10-min reminder — check every 30s for AWFA/FA/Ready ops stuck > 10 min
  useEffect(()=>{
    const REMINDER_STATUSES = ['pending']; // FD only reminders for AWFA
    const REMINDER_MS = 10 * 60 * 1000;
    const check = () => {
      const now = Date.now();
      const stuckOps = ALL_OPS.filter(op => {
        const d = ops[op];
        if(!d || !REMINDER_STATUSES.includes(d.status)) return false;
        const key = `${op}-${d.status}-${d.ts}`;
        if(dismissedReminders.has(key)) return false;
        return d.ts && (now - new Date(d.ts).getTime()) > REMINDER_MS;
      });
      if(stuckOps.length > 0) {
        const first = stuckOps[0];
        const d = ops[first];
        setReminder({op:first, status:d.status, ts:d.ts, count:stuckOps.length});
        playChimeFD("#ff69b4");
      } else {
        setReminder(null);
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  },[ops, dismissedReminders]);

  const providerCols=PROVIDERS.map(p=>({name:p,rooms:ALL_OPS.filter(op=>ops[op]?.provider===p)})).filter(p=>p.rooms.length>0);
  const n=providerCols.length;
  const abbreviatedNotes=useMemo(()=>{
    const r={};
    ALL_OPS.forEach(op=>{r[op]=ops[op]?.note?abbreviateNote(ops[op].note,customAbbrevs):'';});
    return r;
  },[ops,customAbbrevs]);
  const offlineMinutes=Math.floor((now-lastUpdated)/60000);

  return(
    <ScaledWrapper designW={1340} designH={800}>
      <div style={S.root}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap"/>
        <style>{css}</style>

        {/* Offline Banner */}
        {!isOnline&&(
          <div style={{position:"absolute",top:0,left:0,right:0,zIndex:999,background:"rgba(220,38,38,0.95)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:"12px"}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.15em",color:"#fff"}}>⚠ OFFLINE · DOWN SINCE {lastDisconnected?lastDisconnected.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"UNKNOWN"} ⚠</span>
          </div>
        )}

        {/* Header */}
        <div style={S.header}>
          <span dangerouslySetInnerHTML={{__html:LOGO_SVG}} style={{display:"flex",alignItems:"center",flexShrink:0}}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={S.headerTitle}>OPERATORY STATUS</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",letterSpacing:"0.18em",color:"rgba(255,255,255,0.3)",fontWeight:600,marginTop:"2px"}}>FRONT DESK</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
            <div style={{width:"9px",height:"9px",borderRadius:"50%",background:isOnline?"#4ade80":"#ef4444",boxShadow:isOnline?"0 0 6px #4ade80":"0 0 6px #ef4444"}}/>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:600,letterSpacing:"0.05em",color:"rgba(255,255,255,0.75)",textAlign:"right"}}>
              {fmtDate(now)}<span style={{display:"inline-block",width:"28px"}}></span>{fmtTime(now)}
            </div>
          </div>
          </div>


        <div style={{...S.grid,gridTemplateColumns:`repeat(${n},1fr)`}}>
          {providerCols.map(({name,rooms},ci)=>{
            const numSz=`clamp(75px,${16.25/n}vw,200px)`;
            const bdgSz=`clamp(18px,${3.02/n}vw,45px)`;
            const notSz=`clamp(36px,${5.4/n}vw,66px)`;
            const timSz=`clamp(11px,${1.38/n}vw,17.5px)`;
            const namSz=`clamp(22px,${4.5/n}vw,58px)`;
            const apptW=`calc(${bdgSz} * 1.75)`;
            return(
              <div key={name} style={S.col}>
                <div style={{...S.provName,fontSize:namSz}}>{name}</div>
                <div style={S.provDiv}/>
                {rooms.length===0&&(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.3}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:numSz,color:"rgba(255,255,255,0.3)"}}>—</div>
                  </div>
                )}
                <div style={S.roomCol}>
                  {rooms.map(op=>{
                    const{status,note,ts,apptTypes=[]}=ops[op]||{};
                    const cfg=SM[status]||SM.awaiting;
                    const isInactive=status==="inactive";
                    const cardAnim=(status==="ready"||status==="pending")&&!isInactive?"slowPulse 2.5s ease-in-out infinite":"none";
                    const isOpen=menu?.op===op&&menu?.type==="status";
                    const apptOpen=menu?.op===op&&menu?.type==="appt";
                    return(
                      <div key={op} className={antsOps.has(op)?"card-ants":""}
                        style={{...S.card,background:cfg.bg,
                          border:antsOps.has(op)?"none":`2px solid ${isOpen||apptOpen?cfg.numColor:cfg.border}`,
                          animation:cardAnim,opacity:isInactive?0.4:1,
                          padding:0,overflow:"hidden",display:"flex",flexDirection:"row",alignItems:"stretch"}}
                        onMouseDown={()=>setMenu(null)}>

                        {/* Left: op number + elapsed */}
                        <button
                          onMouseDown={e=>{e.stopPropagation();if(!isInactive)setMenu(isOpen?null:{op,type:"status"});}}
                          style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                            padding:"4px 8px",flexShrink:0,background:"transparent",border:"none",
                            cursor:isInactive?"default":"pointer",gap:"2px"}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:numSz,lineHeight:1,color:cfg.numColor}}>
                            {op}
                          </span>
                          {ts&&!isInactive&&(
                            <span style={{fontSize:timSz,fontWeight:700,color:cfg.numColor,opacity:0.7,whiteSpace:"nowrap",lineHeight:1}}>
                              {elapsed(ts)}
                            </span>
                          )}
                        </button>

                        {/* Right: appt badges + note */}
                        {!isInactive&&(
                          <div style={{flex:1,display:"flex",flexDirection:"row",
                            alignItems:"stretch",padding:"4px 6px",gap:"8px",minWidth:0,overflow:"hidden"}}>

                            {/* Appt badges — vertical letters */}
                            <button
                              onMouseDown={e=>{e.stopPropagation();setMenu(apptOpen?null:{op,type:"appt"});}}
                              style={{flexShrink:0,background:"transparent",border:"none",
                                padding:0,cursor:"pointer",alignSelf:"stretch",
                                display:"flex",alignItems:"stretch",gap:"2px",width:apptW}}>
                              {(apptTypes||[]).length===0&&(
                                <div style={{flex:1,borderRadius:"6px",
                                  background:cfg.key==="awaiting"?"rgba(0,0,0,0.12)":"rgba(255,255,255,0.08)",
                                  border:`1.5px solid ${cfg.key==="awaiting"?"rgba(0,0,0,0.3)":"rgba(255,255,255,0.25)"}`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  marginTop:"5%",marginBottom:"5%"}}>
                                  <span style={{fontSize:bdgSz,fontWeight:700,
                                    color:cfg.key==="awaiting"?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.35)"}}>—</span>
                                </div>
                              )}
                              {[...(apptTypes||[])].sort((a,b)=>APPT_TYPES.indexOf(a)-APPT_TYPES.indexOf(b)).map(t=>(
                                <div key={t} style={{width:apptW,flexShrink:0,borderRadius:"6px",
                                  background:`${cfg.numColor}22`,border:`1.5px solid ${cfg.numColor}55`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  flexDirection:"column",marginTop:"5%",marginBottom:"5%",
                                  overflow:"hidden",padding:"2px 2px"}}>
                                  {(APPT_ABBR_MAP[t]||t).toUpperCase().split('').map((ch,idx)=>(
                                    <span key={idx} style={{fontSize:bdgSz,fontWeight:800,
                                      color:cfg.numColor,lineHeight:1.05,display:"block",textAlign:"center"}}>
                                      {ch}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </button>

                            {/* Note — FitText */}
                            <button
                              onMouseDown={e=>{e.stopPropagation();if(menu){setMenu(null);return;}
                                if(noteLocked?.op===op&&noteLocked?.by!=="frontdesk"){showToast("🔒 In use");return;}
                                setNoteEdit({op,draft:note||""});emitSocket("noteLock",{op,by:"frontdesk"});resetFDNoteTimeout();}}
                              style={{flex:1,textAlign:"left",padding:0,background:"transparent",
                                border:"none",cursor:"pointer",alignSelf:"center",minWidth:0,
                                overflow:"hidden",display:"flex",alignItems:"center"}}>
                              <FitText
                                text={abbreviateNote(note,customAbbrevs)||"Add note"}
                                maxSz={parseInt(notSz.match(/(\d+)px/)?.[1]||"36")}
                                minSz={10}
                                maxRows={3}
                                color={note
                                  ? cfg.key==="awaiting"?"rgba(0,0,0,0.75)":"rgba(255,255,255,0.85)"
                                  : cfg.key==="awaiting"?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.18)"}
                                fontFamily="'DM Sans',sans-serif"
                                fontWeight={700}
                              />
                            </button>
                          </div>
                        )}
                        {isInactive&&<div style={{flex:1}}/>}
                      </div>
                    );
                  })}
                </div>
                {ci<providerCols.length-1&&<div style={S.colDiv}/>}
              </div>
            );
          })}
        </div>

        {/* AWFA Banner — shows at bottom when there are undismissed AWFA ops */}
        {activePopup && !showQueue && (
          <div style={{
            flexShrink:0,
            background: activePopup.type==='awfa' ? 'rgba(255,105,180,0.18)' : 'rgba(74,222,128,0.18)',
            borderTop: `2px solid ${activePopup.type==='awfa' ? '#ff69b4' : '#4ade80'}`,
            padding:'8px 20px',
            display:'flex',alignItems:'center',gap:'16px',
            animation:`${activePopup.type==='awfa' ? 'awfaBannerPulse' : 'rdyBannerPulse'} 2.5s ease-in-out infinite`
          }}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',letterSpacing:'0.15em',
              color: activePopup.type==='awfa' ? '#ff69b4' : '#4ade80',flexShrink:0}}>
              {activePopup.type==='awfa' ? '⚠ AWAITING FA' : '✓ READY'}
            </div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'28px',letterSpacing:'0.1em',
              color:'#fff',flexShrink:0}}>
              OP {activePopup.op}
            </div>
            {activePopup.ts && (
              <div style={{fontSize:'14px',fontWeight:700,color:'rgba(255,255,255,0.5)',flexShrink:0}}>
                {elapsed(activePopup.ts)}
              </div>
            )}
            <div style={{flex:1}}/>
            {undismissedPopups.length > 1 && (
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',
                color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',flexShrink:0}}>
                +{undismissedPopups.length - 1} MORE
              </div>
            )}
            <button onMouseDown={()=>{if(activePopup)setDismissedOps(d=>new Set([...d,activePopup.op]));}}
              style={{flexShrink:0,padding:'6px 16px',borderRadius:'7px',cursor:'pointer',
                background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.2)',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',letterSpacing:'0.1em',
                color:'rgba(255,255,255,0.7)'}}>
              DISMISS
            </button>
            <button onMouseDown={e=>{e.stopPropagation();setShowQueue(true);}}
              style={{flexShrink:0,padding:'6px 16px',borderRadius:'7px',cursor:'pointer',
                background: activePopup.type==='awfa' ? 'rgba(255,105,180,0.3)' : 'rgba(74,222,128,0.3)',
                border:`1px solid ${activePopup.type==='awfa' ? '#ff69b4' : '#4ade80'}`,
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',letterSpacing:'0.1em',
                color:'#fff'}}>
              VIEW QUEUE
            </button>
          </div>
        )}

        {/* Legend + buttons */}
        <div style={{display:"flex",alignItems:"center",gap:"12px",flexShrink:0,paddingTop:"4px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {/* Left: legend */}
          <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
            {STATUSES.filter(s=>s.key!=="inactive").map(s=>(
              <div key={s.key} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                <span style={{width:"10px",height:"10px",borderRadius:"50%",background:s.key==="awaiting"?"#fff":s.numColor,flexShrink:0}}/>
                <span style={{fontSize:"12px",fontWeight:700,color:s.key==="awaiting"?"#fff":s.numColor}}>{s.abbr}</span>
              </div>
            ))}
          </div>
          {/* Center: test buttons */}
          <div style={{flex:1,display:"flex",justifyContent:"center",gap:"8px"}}>
            <button onMouseDown={e=>{e.stopPropagation();const k=Object.keys(ops).filter(k=>ops[k]?.status!=='inactive');if(k.length){const op=parseInt(k[Math.floor(Math.random()*k.length)]);setOps(p=>({...p,[op]:{...p[op],status:'pending',ts:new Date()}}));}}}
              style={{fontSize:"11px",padding:"4px 10px",background:"rgba(255,105,180,0.15)",border:"1px solid rgba(255,105,180,0.4)",borderRadius:"6px",color:"#ff69b4",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.08em"}}>
              + AWFA
            </button>
            <button onMouseDown={e=>{e.stopPropagation();setOps(DEMO);}}
              style={{fontSize:"11px",padding:"4px 10px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.08em"}}>
              RESET
            </button>
          </div>
          {/* Right: queue + history */}
          <div style={{display:"flex",gap:"8px",flexShrink:0}}>
            <button className="analytics-btn" onMouseDown={e=>{e.stopPropagation();setShowHistory(true);}}>◎ HISTORY</button>
            <button className="analytics-btn" onMouseDown={e=>{e.stopPropagation();setShowQueue(true);}}>⚡ QUEUE ({popups.length})</button>
          </div>
        </div>

        
        {/* 10-min Reminder Popup */}
        {reminder&&!showQueue&&!activePopup&&(()=>{
          const cfg=SM[reminder.status]||SM.pending;
          const statusLabel=STATUSES.find(s=>s.key===reminder.status)?.abbr||reminder.status;
          const reminderElapsed=reminder.ts?elapsed(reminder.ts):"?";
          const reminderKey=`${reminder.op}-${reminder.status}-${reminder.ts}`;
          return(
            <div style={{position:"absolute",inset:0,zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"all"}}
              onClick={()=>{
                const newDismissed=new Set([...dismissedReminders,reminderKey]);
                setDismissedReminders(newDismissed);
                // Immediately find next stuck op
                // REMINDER_STATUSES already defined above (AWFA only)
                const next=ALL_OPS.find(op=>{
                  const d=ops[op];
                  if(!d||!REMINDER_STATUSES.includes(d.status))return false;
                  const k=`${op}-${d.status}-${d.ts}`;
                  if(newDismissed.has(k))return false;
                  return d.ts&&(Date.now()-new Date(d.ts).getTime())>10*60*1000;
                });
                if(next){const d=ops[next];setReminder({op:next,status:d.status,ts:d.ts});}
                else setReminder(null);
              }}>
              <div className={`popup-${reminder.status==="ready"?"rdy":"awfa"}`}
                style={{position:"relative",width:"62%",height:"60%",borderRadius:"20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px",cursor:"pointer",boxShadow:`0 0 100px ${cfg.numColor}99`,background:cfg.bg,border:`3px solid ${cfg.numColor}`}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(20px,3vw,32px)",letterSpacing:"0.15em",color:cfg.numColor,opacity:0.7}}>⚠ REMINDER{reminder.count>1?` (${reminder.count} PENDING)`:""}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(80px,14vw,140px)",lineHeight:1,color:cfg.numColor,textShadow:`0 0 40px ${cfg.numColor}`}}>
                  Op {reminder.op}
                </div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(24px,4vw,40px)",letterSpacing:"0.12em",color:cfg.numColor}}>{statusLabel}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(18px,2.5vw,28px)",color:cfg.numColor,opacity:0.8}}>{reminderElapsed} — NO CHANGE</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(14px,2vw,20px)",color:"rgba(255,255,255,0.5)",marginTop:"12px",letterSpacing:"0.1em"}}>TAP TO DISMISS</div>
              </div>
            </div>
          );
        })()}

        {/* Toast notification */}
        {toast&&(
          <div style={{position:"absolute",bottom:"80px",left:"50%",transform:"translateX(-50%)",
            background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.4)",
            borderRadius:"10px",padding:"8px 20px",fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"15px",letterSpacing:"0.1em",color:"#60a5fa",whiteSpace:"nowrap",
            zIndex:700,boxShadow:"0 0 16px rgba(96,165,250,0.2)",pointerEvents:"none"}}>
            {toast}
          </div>
        )}

        {/* Note Edit Modal */}
        {noteEdit&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseDown={()=>setNoteEdit(null)}>
            <div style={{background:"#1a1a22",borderRadius:"16px",padding:"24px",width:"400px",boxShadow:"0 32px 80px rgba(0,0,0,0.95)"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.15em",color:"rgba(255,255,255,0.4)",marginBottom:"16px"}}>NOTE · OP {noteEdit.op}</div>
              <textarea
                autoFocus
                ref={el=>{if(el&&!el.dataset.selected){el.dataset.selected='1';setTimeout(()=>{el.focus();el.select();},50);}}}
                value={noteEdit.draft}
                maxLength={40}
                onChange={e=>setNoteEdit(p=>({...p,draft:e.target.value.slice(0,40)}))}
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"10px",padding:"14px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"18px",fontWeight:600,resize:"none",outline:"none",minHeight:"100px"}}
                placeholder="Add a note..."
              />
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"4px"}}>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>Board: <span style={{color:"rgba(96,165,250,0.7)"}}>{abbreviateNote(noteEdit.draft,customAbbrevs)}</span></div>
                <div style={{fontSize:"12px",color:noteEdit.draft.length>35?"rgba(255,80,80,0.8)":"rgba(255,255,255,0.3)",fontWeight:600}}>{noteEdit.draft.length}/40</div>
              </div>
              <div style={{display:"flex",gap:"10px",marginTop:"14px"}}>
                <button onMouseDown={()=>setNoteEdit(null)}
                  style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"9px",color:"rgba(255,255,255,0.5)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.1em",cursor:"pointer"}}>
                  CANCEL
                </button>
                <button onMouseDown={()=>{
                  setOps(p=>({...p,[noteEdit.op]:{...p[noteEdit.op],note:noteEdit.draft,noteUpdatedAt:new Date()}}));
                  emitSocket('setNote',{op:noteEdit.op,note:noteEdit.draft});
                  emitSocket('noteUnlock',{});
                  clearTimeout(fdNoteTimeoutRef.current);
                  setNoteEdit(null);
                }}
                  style={{flex:2,padding:"12px",background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.4)",borderRadius:"9px",color:"#60a5fa",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.1em",cursor:"pointer"}}>
                  SAVE NOTE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Queue screen */}
        {showQueue&&(
          <div style={{position:"absolute",inset:0,background:"rgba(8,10,12,0.97)",zIndex:350,display:"flex",flexDirection:"column",padding:"24px 32px",gap:"12px"}} onDragEnd={handleDragEnd}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",letterSpacing:"0.15em",color:popups[0]?.type==="awfa"?"#ff69b4":"#4ade80"}}>
              {popups[0]?.type==="awfa"?"AWAITING FA":"READY"} QUEUE
            </div>
              <button onClick={()=>setShowQueue(false)} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.12em",padding:"8px 20px",borderRadius:"7px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)",cursor:"pointer"}}>← BACK</button>
            </div>
            <div style={{fontSize:"11px",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans',sans-serif",marginBottom:"4px"}}>DRAG ↕ TO REORDER URGENCY · STATUS CHANGE REMOVES FROM QUEUE</div>
            <div style={{flex:1,overflowY:"auto"}}>
              {popups.map(item=>(
                <QueueItem key={item.id} item={item} ops={ops} onDragStart={id=>{setDragId(id);}} onDragEnter={id=>{setDragOverId(id);}} isDragging={dragId===item.id}/>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScaledWrapper>
  );
}

const S={
  root:{position:"relative",width:"1340px",height:"800px",background:"#0a0a0c",backgroundImage:"radial-gradient(ellipse at 15% 0%, rgba(59,130,246,0.07) 0%, transparent 55%)",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",padding:"10px 14px 6px",gap:"6px",boxSizing:"border-box",overflow:"hidden"},
  header:{display:"flex",alignItems:"center",borderBottom:"2px solid rgba(255,255,255,0.15)",paddingBottom:"8px",flexShrink:0,gap:"10px"},
  headerTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",letterSpacing:"0.12em",color:"#fff"},
  headerSub:{fontSize:"9px",letterSpacing:"0.18em",color:"rgba(255,255,255,0.25)",fontWeight:300},
  grid:{flex:1,minHeight:0,display:"grid",gap:"0"},
  col:{display:"flex",flexDirection:"column",gap:"5px",minHeight:0,padding:"0 8px",position:"relative"},
  provName:{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.12em",color:"#fff",flexShrink:0},
  provDiv:{height:"3px",background:"#fff",flexShrink:0,borderRadius:"2px",marginBottom:"2px"},
  colDiv:{position:"absolute",right:0,top:0,bottom:0,width:"2px",background:"#fff",opacity:0.85},
  roomCol:{flex:1,minHeight:0,display:"flex",flexDirection:"column",gap:"5px"},
  footer:{flexShrink:0,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:"5px",display:"flex",justifyContent:"center"},
};
const css=`
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:100%;overflow:hidden;}
  .analytics-btn{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:0.18em;padding:6px 20px;border-radius:7px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);color:rgba(96,165,250,0.7);cursor:pointer;}
  @keyframes awfaBannerPulse{0%,100%{opacity:1;}50%{opacity:0.7;}}
@keyframes rdyBannerPulse{0%,100%{opacity:1;}50%{opacity:0.7;}}
  @keyframes slowPulse{0%,100%{opacity:1;}50%{opacity:0.55;}}
  
  .popup-awfa{animation:popupFlashAwfa 2.5s ease-in-out infinite,slideIn .4s ease;}
  .popup-rdy{animation:popupFlashRdy 2.5s ease-in-out infinite,slideIn .4s ease;}
  @keyframes popupFlashAwfa{0%,100%{background:#ff69b4;}50%{background:#3d0a20;}}
  @keyframes popupFlashRdy{0%,100%{background:#4ade80;}50%{background:#052210;}}
  @keyframes slideIn{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
`;

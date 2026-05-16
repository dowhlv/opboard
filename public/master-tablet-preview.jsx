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


const INIT_STATUSES=[
  {key:"ready",    label:"Ready",        abbr:"Ready",  numColor:"#4ade80",bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.45)",  glow:"0 0 28px rgba(74,222,128,0.35)", menuBg:"rgba(34,197,94,0.18)",  menuBorder:"rgba(34,197,94,0.6)",  menuHover:"rgba(34,197,94,0.28)" },
  {key:"treatment",label:"In Progress",  abbr:"In Progress",   numColor:"#60a5fa",bg:"rgba(59,130,246,0.12)", border:"rgba(59,130,246,0.45)", glow:"0 0 28px rgba(96,165,250,0.35)", menuBg:"rgba(59,130,246,0.18)", menuBorder:"rgba(59,130,246,0.6)", menuHover:"rgba(59,130,246,0.28)"},
  {key:"pending",  label:"Awaiting FA",  abbr:"Awaiting FA", numColor:"#ff69b4",bg:"rgba(255,105,180,0.12)",border:"rgba(255,105,180,0.45)",glow:"0 0 28px rgba(255,105,180,0.5)", menuBg:"rgba(255,105,180,0.18)",menuBorder:"rgba(255,105,180,0.6)",menuHover:"rgba(255,105,180,0.28)"},
  {key:"fa",       label:"Reviewing FA", abbr:"Reviewing FA",   numColor:"#facc15",bg:"rgba(234,179,8,0.10)",  border:"rgba(234,179,8,0.45)",  glow:"0 0 28px rgba(250,204,21,0.4)",  menuBg:"rgba(234,179,8,0.18)",  menuBorder:"rgba(234,179,8,0.6)",  menuHover:"rgba(234,179,8,0.28)" },
  {key:"dirty",    label:"Vacant Dirty", abbr:"Dirty",   numColor:"#ff2020",bg:"rgba(255,0,0,0.15)",    border:"rgba(255,0,0,0.55)",    glow:"0 0 28px rgba(255,0,0,0.5)",     menuBg:"rgba(255,0,0,0.18)",    menuBorder:"rgba(255,0,0,0.6)",    menuHover:"rgba(255,0,0,0.28)"   },
  {key:"awaiting", label:"Vacant Clean", abbr:"Clean",   numColor:"#111114",bg:"rgba(255,255,255,0.95)",border:"rgba(255,255,255,0.95)",glow:"0 0 28px rgba(255,255,255,0.4)", menuBg:"rgba(255,255,255,0.9)", menuBorder:"rgba(255,255,255,1)",  menuHover:"rgba(255,255,255,0.8)"},
];
const SM_DEFAULT=Object.fromEntries(INIT_STATUSES.map(s=>[s.key,s]));
const INIT_APPT_TYPES=["NP","CCX","Tx","LOE","Delivery","Office Visit","Prophy","PMT","SRP"];
const APPT_ABBR_MAP={"NP":"NP","CCX":"CCX","Tx":"TX","LOE":"LOE","Delivery":"DEL","Office Visit":"OV","Prophy":"PRO","PMT":"PMT","SRP":"SRP"};
const elapsed=d=>{if(!d)return"";const ms=typeof d==='number'?d:d instanceof Date?d.getTime():new Date(d).getTime();const s=Math.floor((Date.now()-ms)/1000);if(s<60)return"<1m";if(s<3600)return`${Math.floor(s/60)}m`;return`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;};

const DEMO={
  1: {status:"ready",    note:"New patient",    ts:new Date(Date.now()-120000),  apptTypes:["NP"],  provider:"Dr. Tang"},
  2: {status:"treatment",note:"Crown prep",     ts:new Date(Date.now()-840000),  apptTypes:["Tx"],  provider:"Dr. Tang"},
  3: {status:"dirty",    note:"",               ts:new Date(Date.now()-300000),  apptTypes:[],  provider:"Dr. Tang"},
  4: {status:"ready",    note:"X-rays done",    ts:new Date(Date.now()-60000),   apptTypes:["OV"],  provider:"Dr. Tang"},
  5: {status:"awaiting", note:"",               ts:new Date(Date.now()-150000),  apptTypes:[],  provider:"Dr. Tang"},
  6: {status:"dirty",    note:"",               ts:new Date(Date.now()-200000),  apptTypes:[],  provider:"Dr. Ngo" },
  7: {status:"ready",    note:"",               ts:new Date(Date.now()-90000),   apptTypes:["OV"],  provider:"Dr. Ngo" },
  8: {status:"treatment",note:"Implant consult",ts:new Date(Date.now()-1200000), apptTypes:["Tx"],  provider:"Dr. Ngo" },
  9: {status:"awaiting", note:"",               ts:new Date(Date.now()-180000),  apptTypes:[],  provider:"Dr. Ngo" },
  10:{status:"pending",  note:"SRP Q2",         ts:new Date(Date.now()-360000),  apptTypes:["SRP"], provider:"Dr. Ngo" },
  11:{status:"treatment",note:"Root canal",     ts:new Date(Date.now()-2100000), apptTypes:["Tx"],  provider:"Jordan"  },
  12:{status:"awaiting", note:"",               ts:new Date(Date.now()-30000),   apptTypes:["OV"],  provider:"Jordan"  },
  13:{status:"awaiting", note:"",               ts:new Date(Date.now()-90000),   apptTypes:[],  provider:"Jordan"  },
  14:{status:"fa",       note:"Whitening",      ts:new Date(Date.now()-600000),  apptTypes:["LOE"], provider:"Jordan"  },
};
const INIT_ACTIVE=["Dr. Tang","Dr. Ngo","Jordan"];
const INIT_INACTIVE=["OS","Endo","Perio"];
const INIT_ALL_OPS=Object.keys(DEMO).map(Number).map(id=>({id,enabled:true}));
const DESIGN_H=800;

// Server version snapshot at first state broadcast. A subsequent mismatch
// triggers location.reload() so deploys propagate to all open tablets.
let CLIENT_VERSION = null;

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
// ── Appt Type Modal — centered, multi-select with DONE button ────────────────
function ModalMenu({op, menuType, ops, onClose, onSetStatus, onSetApptType, statuses=INIT_STATUSES, apptTypes=INIT_APPT_TYPES}){
  const SM=Object.fromEntries((statuses||INIT_STATUSES).map(s=>[s.key,s]));
  const {status} = ops[op] || {};
  const cfg = SM[status] || SM.ready;
  // Local draft — selections are not committed to ops/server until DONE.
  // CANCEL or backdrop discard the draft.
  const [draft, setDraft] = useState(() => (ops[op]?.apptTypes || []).slice());
  return(
    <div style={{background:"#16161a",border:`1px solid ${cfg.numColor}44`,borderRadius:"16px",
      padding:"20px",width:"340px",fontFamily:"'DM Sans',sans-serif",
      boxShadow:`0 0 40px ${cfg.numColor}33, 0 16px 48px rgba(0,0,0,0.8)`}}
      onMouseDown={e=>e.stopPropagation()}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.15em",
        color:"rgba(255,255,255,0.4)",marginBottom:"4px",textAlign:"center"}}>
        APPT TYPE · OP {op}
      </div>
      <div style={{fontSize:"11px",color:cfg.numColor,textAlign:"center",marginBottom:"14px",opacity:0.7}}>
        {draft.length>0?draft.join(' · '):'Tap to select'}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        {(apptTypes||INIT_APPT_TYPES).map(t=>{
          const active=draft.includes(t);
          const accent=ops[op]?.status==="awaiting"?"#fff":cfg.numColor;
          return(
            <button key={t}
              style={{padding:"10px 14px",borderRadius:"10px",cursor:"pointer",textAlign:"left",
                background:active?(accent==="#fff"?accent:`${accent}22`):"rgba(255,255,255,0.04)",
                border:`2px solid ${active?accent+"55":"rgba(255,255,255,0.07)"}`,
                display:"flex",alignItems:"center",gap:"12px"}}
              onMouseDown={e=>{
                e.stopPropagation();
                setDraft(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t]);
              }}>
              <span style={{width:"16px",height:"16px",borderRadius:"4px",flexShrink:0,
                background:active?(accent==="#fff"?"#000":accent):"transparent",
                border:active?"none":"1px solid rgba(255,255,255,0.3)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"10px",color:accent==="#fff"?"#fff":"#000",fontWeight:700}}>{active?"✓":""}</span>
              <span style={{fontSize:"16px",fontWeight:700,flex:1,
                color:active?(accent==="#fff"?"#000":accent):"rgba(255,255,255,0.85)"}}>{t}</span>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",gap:"8px",marginTop:"14px"}}>
        <button onMouseDown={e=>{e.stopPropagation();onClose();}}
          style={{flex:1,padding:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:"8px",color:"rgba(255,255,255,0.5)",fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"14px",letterSpacing:"0.1em",cursor:"pointer"}}>CANCEL</button>
        <button onMouseDown={e=>{e.stopPropagation();onSetApptType(op,draft);onClose();}}
          style={{flex:2,padding:"10px",background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.4)",
            borderRadius:"8px",color:"#4ade80",fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"14px",letterSpacing:"0.1em",cursor:"pointer"}}>✓ DONE</button>
      </div>
    </div>
  );
}

// ── Editable draggable list — top-level to respect hooks rules ────────────────
function EditableList({ items, setItems, showColor }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [addVal,  setAddVal]  = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const newItem = v => typeof items[0]==="string" ? v : {label:v,abbr:v,key:v.toLowerCase().replace(/\s+/g,"_"),numColor:"#aaaaaa",bg:"rgba(170,170,170,0.12)",border:"rgba(170,170,170,0.4)",glow:"0 0 12px rgba(170,170,170,0.3)",menuBg:"rgba(170,170,170,0.15)",menuBorder:"rgba(170,170,170,0.5)",menuHover:"rgba(170,170,170,0.25)"};
  return (
    <div>
      {items.map((item, i) => {
        const label = typeof item==="string" ? item : item.label||item.abbr;
        const color = showColor ? (item.numColor||"#fff") : null;
        const isEditing = editIdx===i;
        return (
          <div key={i} draggable={!isEditing}
            onDragStart={()=>setDragIdx(i)} onDragEnter={()=>setOverIdx(i)}
            onDragEnd={()=>{ if(dragIdx!==null&&overIdx!==null&&dragIdx!==overIdx){const a=[...items];const[m]=a.splice(dragIdx,1);a.splice(overIdx,0,m);setItems(a);}setDragIdx(null);setOverIdx(null); }}
            onDragOver={e=>e.preventDefault()}
            style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",marginBottom:"6px",opacity:dragIdx===i?0.4:1,transition:"opacity .15s"}}>
            <span style={{color:"rgba(255,255,255,0.3)",cursor:"grab",flexShrink:0,fontSize:"16px"}}>↕</span>
            {color&&<span style={{width:"14px",height:"14px",borderRadius:"50%",background:color,flexShrink:0,boxShadow:`0 0 6px ${color}`}}/>}
            {isEditing
              ? <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){setItems(p=>p.map((x,j)=>j===i?(typeof x==="string"?editVal:{...x,label:editVal,abbr:editVal}):x));setEditIdx(null);}if(e.key==="Escape")setEditIdx(null);}}
                  style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:"6px",padding:"6px 10px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",outline:"none"}}/>
              : <span style={{flex:1,color:"#fff",fontSize:"14px",fontWeight:600}}>{label}</span>
            }
            {!isEditing&&<button onMouseDown={()=>{setEditIdx(i);setEditVal(label);}} style={{background:"none",border:"none",color:"rgba(96,165,250,0.7)",cursor:"pointer",fontSize:"13px",padding:"4px 8px"}}>Edit</button>}
            {isEditing&&<button onMouseDown={()=>{setItems(p=>p.map((x,j)=>j===i?(typeof x==="string"?editVal:{...x,label:editVal,abbr:editVal}):x));setEditIdx(null);}} style={{background:"rgba(74,222,128,0.15)",border:"1px solid rgba(74,222,128,0.4)",borderRadius:"5px",color:"#4ade80",cursor:"pointer",fontSize:"13px",padding:"4px 10px"}}>✓</button>}
            <button onMouseDown={()=>setItems(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"rgba(255,80,80,0.6)",cursor:"pointer",fontSize:"16px",padding:"4px"}}>✕</button>
          </div>
        );
      })}
      <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
        <input value={addVal} onChange={e=>setAddVal(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&addVal.trim()){setItems(p=>[...p,newItem(addVal.trim())]);setAddVal("");}}}
          placeholder="New item name..."
          style={{flex:1,padding:"9px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",outline:"none"}}/>
        <button onMouseDown={()=>{if(!addVal.trim())return;setItems(p=>[...p,newItem(addVal.trim())]);setAddVal("");}}
          style={{padding:"9px 16px",background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.35)",borderRadius:"8px",color:"#4ade80",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:"15px",letterSpacing:"0.1em"}}>+ ADD</button>
      </div>
    </div>
  );
}

// ── Master Menu (PIN-protected admin panel) ───────────────────────────────────
const MASTER_PIN = "4001";

function MasterMenu({ statuses, setStatuses, apptTypes, setApptTypes, allOps, setAllOps, providers, setProviders, inactiveProviders, setInactiveProviders, onClose, emitSocket, setShowHistory }) {
  const [pinInput, setPinInput]   = useState("");
  const [pinError, setPinError]   = useState(false);
  const [unlocked, setUnlocked]   = useState(false);
  const [screen, setScreen]       = useState(null);

  // ── PIN screen ──
  if (!unlocked) {
    return (
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center"}}
        onMouseDown={onClose}>
        <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"32px",width:"320px",textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}
          onMouseDown={e=>e.stopPropagation()}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",letterSpacing:"0.14em",color:"#fff",marginBottom:"8px"}}>ADMIN ACCESS</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"24px",letterSpacing:"0.06em"}}>ENTER PIN TO CONTINUE</div>
          <input type="password" maxLength={4} value={pinInput}
            ref={el=>{ if(el) setTimeout(()=>el.focus(),30); }}
            onChange={e=>{ setPinInput(e.target.value); setPinError(false); }}
            onKeyDown={e=>{ if(e.key==="Enter"){ if(pinInput===MASTER_PIN){setUnlocked(true);} else {setPinError(true);setPinInput("");} } }}
            style={{width:"100%",padding:"14px",fontSize:"28px",textAlign:"center",letterSpacing:"0.4em",background:"rgba(255,255,255,0.06)",border:`1px solid ${pinError?"rgba(255,80,80,0.7)":"rgba(255,255,255,0.2)"}`,borderRadius:"10px",color:"#fff",outline:"none",fontFamily:"'Bebas Neue',sans-serif"}}
            placeholder="····"
          />
          {pinError && <div style={{color:"rgba(255,80,80,0.9)",fontSize:"13px",marginTop:"10px"}}>Incorrect PIN</div>}
          <button style={{marginTop:"20px",width:"100%",padding:"12px",background:"rgba(96,165,250,0.12)",border:"1px solid rgba(96,165,250,0.35)",borderRadius:"9px",color:"#60a5fa",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.14em",cursor:"pointer"}}
            onMouseDown={()=>{ if(pinInput===MASTER_PIN){setUnlocked(true);} else {setPinError(true);setPinInput("");} }}>UNLOCK</button>
        </div>
      </div>
    );
  }

  // ── Menu select screen ──
  if (!screen) {
    const items = [
      { id:"ops",       label:"Edit Ops",        icon:"⊟", desc:"Enable or disable operatory rooms" },
      { id:"providers", label:"Edit Providers",  icon:"👤", desc:"Add, remove, rename and reorder providers" },
      { id:"statuses",  label:"Edit Status",     icon:"◈",  desc:"Add, remove, rename and reorder statuses" },
      { id:"appt",      label:"Edit Appt Types", icon:"📋", desc:"Add, remove, rename and reorder appointment types" },
      { id:"colors",    label:"Edit Colors",     icon:"🎨", desc:"Customize status and appt type colors" },
      { id:"history",   label:"Status History",  icon:"⏱",  desc:"View historical status timeline", action:true },
    ];
    return (
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center"}}
        onMouseDown={onClose}>
        <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"24px",width:"460px",fontFamily:"'DM Sans',sans-serif"}}
          onMouseDown={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",letterSpacing:"0.14em",color:"#fff"}}>≡ ADMIN MENU</div>
            <button onMouseDown={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:"20px",cursor:"pointer"}}>✕</button>
          </div>
          {items.map(item=>(
            <div key={item.id} onMouseDown={()=>{ if(item.action){onClose();setShowHistory(true);} else {setScreen(item.id);} }}
              style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px 16px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",marginBottom:"8px",cursor:"pointer",transition:"background .15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
              <span style={{fontSize:"22px",flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:"#fff",fontSize:"15px"}}>{item.label}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",marginTop:"2px"}}>{item.desc}</div>
              </div>
              <span style={{color:"rgba(255,255,255,0.25)",fontSize:"18px"}}>›</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const Back = () => (
    <button onMouseDown={()=>setScreen(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",cursor:"pointer",marginBottom:"14px",display:"flex",alignItems:"center",gap:"6px"}}>
      ← Back
    </button>
  );

  // ── Edit Ops ──
  if (screen==="ops") {
    return (
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"24px",width:"480px",maxHeight:"80%",overflowY:"auto",fontFamily:"'DM Sans',sans-serif"}}
          onMouseDown={e=>e.stopPropagation()}>
          <Back/>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.12em",color:"#fff",marginBottom:"16px"}}>⊟ EDIT OPS</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"14px"}}>Toggle ops on/off. Disabled ops won't appear in Assignments.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"10px"}}>
            {allOps.map(({id,enabled})=>(
              <button key={id} onMouseDown={()=>{
                const updated=allOps.map(o=>o.id===id?{...o,enabled:!o.enabled}:o);
                setAllOps(updated);
                emitSocket('setAllOps',{allOps:updated});
              }}
                style={{width:"56px",height:"48px",borderRadius:"9px",border:`2px solid ${enabled?"rgba(74,222,128,0.6)":"rgba(255,255,255,0.15)"}`,background:enabled?"rgba(74,222,128,0.12)":"rgba(255,255,255,0.03)",color:enabled?"#4ade80":"rgba(255,255,255,0.3)",fontSize:"18px",fontWeight:700,cursor:"pointer",position:"relative"}}>
                {id}
                {!enabled&&<span style={{position:"absolute",top:1,right:3,fontSize:"10px",color:"rgba(255,80,80,0.8)"}}>✕</span>}
              </button>
            ))}
          </div>
          <div style={{marginTop:"18px",fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>Green = active · Grey = disabled</div>
        </div>
      </div>
    );
  }

  // ── Edit Providers ──
  if (screen==="providers") {
    return (
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"24px",width:"480px",maxHeight:"80%",overflowY:"auto",fontFamily:"'DM Sans',sans-serif"}}
          onMouseDown={e=>e.stopPropagation()}>
          <Back/>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.12em",color:"#fff",marginBottom:"4px"}}>👤 EDIT PROVIDERS</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"16px"}}>Drag ↕ to reorder · Click Edit to rename · ✕ to remove</div>

          <div style={{fontSize:"11px",letterSpacing:"0.16em",color:"rgba(255,255,255,0.35)",fontWeight:600,marginBottom:"10px"}}>ACTIVE</div>
          <EditableList items={providers} setItems={(next)=>{const arr=typeof next==="function"?next(providers):next;setProviders(arr);emitSocket("setProviders",{activeProviders:arr,inactiveProviders});}} showColor={false}/>

          <div style={{height:"2px",background:"rgba(255,255,255,0.12)",margin:"18px 0 14px"}}/>

          <div style={{fontSize:"11px",letterSpacing:"0.16em",color:"rgba(255,255,255,0.35)",fontWeight:600,marginBottom:"10px"}}>INACTIVE</div>
          <EditableList items={inactiveProviders} setItems={setInactiveProviders} showColor={false}/>
        </div>
      </div>
    );
  }

  if (screen==="statuses") return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"24px",width:"500px",maxHeight:"82%",overflowY:"auto",fontFamily:"'DM Sans',sans-serif"}}
        onMouseDown={e=>e.stopPropagation()}>
        <Back/>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.12em",color:"#fff",marginBottom:"4px"}}>◈ EDIT STATUS</div>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"16px"}}>Drag ↕ to reorder · Click Edit to rename · ✕ to remove</div>
        <EditableList items={statuses} setItems={setStatuses} showColor={true}/>
      </div>
    </div>
  );

  if (screen==="appt") return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"24px",width:"500px",maxHeight:"82%",overflowY:"auto",fontFamily:"'DM Sans',sans-serif"}}
        onMouseDown={e=>e.stopPropagation()}>
        <Back/>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.12em",color:"#fff",marginBottom:"4px"}}>📋 EDIT APPT TYPES</div>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"16px"}}>Drag ↕ to reorder · Click Edit to rename · ✕ to remove</div>
        <EditableList items={apptTypes} setItems={setApptTypes} showColor={false}/>
      </div>
    </div>
  );

  if (screen==="colors") return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"24px",width:"520px",maxHeight:"82%",overflowY:"auto",fontFamily:"'DM Sans',sans-serif"}}
        onMouseDown={e=>e.stopPropagation()}>
        <Back/>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.12em",color:"#fff",marginBottom:"4px"}}>🎨 EDIT COLORS</div>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"16px"}}>Click a color swatch to change it</div>
        <div style={{fontSize:"11px",letterSpacing:"0.14em",color:"rgba(255,255,255,0.3)",marginBottom:"10px"}}>statuses</div>
        {statuses.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"10px"}}>
            <div style={{width:"28px",height:"28px",borderRadius:"50%",background:s.numColor,boxShadow:`0 0 8px ${s.numColor}`,flexShrink:0}}/>
            <span style={{flex:1,color:"#fff",fontSize:"14px",fontWeight:600}}>{s.abbr}</span>
            <input type="color" value={s.numColor}
              onChange={e=>{const c=e.target.value;setStatuses(prev=>prev.map((x,j)=>j===i?{...x,numColor:c,bg:`rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},0.12)`,border:`rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},0.45)`,glow:`0 0 28px rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},0.4)`,menuBg:`rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},0.18)`,menuBorder:`rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},0.6)`,menuHover:`rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},0.28)`}:x));}}
              style={{width:"44px",height:"32px",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.2)",cursor:"pointer",background:"none",padding:"2px"}}/>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}



// ── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return{hasError:true,error};}
  componentDidCatch(error,info){console.error('OpBoard Error:',error,info);}
  render(){
    if(this.state.hasError)return(
      <div style={{position:"fixed",inset:0,background:"#0a0a0c",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"20px",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{fontSize:"48px"}}>⚠</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",letterSpacing:"0.15em",color:"#ef4444"}}>SOMETHING WENT WRONG</div>
        <div style={{fontSize:"14px",color:"rgba(255,255,255,0.4)",maxWidth:"400px",textAlign:"center"}}>{this.state.error?.message||"An unexpected error occurred"}</div>
        <button onMouseDown={()=>window.location.reload()} style={{padding:"12px 32px",background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.4)",borderRadius:"10px",color:"#60a5fa",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.1em",cursor:"pointer"}}>TAP TO RELOAD</button>
      </div>
    );
    return this.props.children;
  }
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

function MasterTablet(){
  const[ops,setOps]=useState({});
  const[antsOps,setAntsOps]=useState(new Set());
  const[menu,setMenu]=useState(null);
  const[showAssign,setShowAssign]=useState(false);
  const[pendingAssignOps,setPendingAssignOps]=useState(null);
  const[pendingActiveProviders,setPendingActiveProviders]=useState(null);
  const[pendingInactiveProviders,setPendingInactiveProviders]=useState(null);
  const[showHistory,setShowHistory]=useState(false);
  const[noteEdit,setNoteEdit]=useState(null);
  const noteDraftRef=useRef(""); // always tracks latest draft value
  const noteDidSelect=useRef(false);
  const[activeProviders,setActiveProviders]=useState(INIT_ACTIVE);
  const[customAbbrevs,setCustomAbbrevs]=useState([]);
  const[providerColors,setProviderColors]=useState({});
  const [showQueue, setShowQueue] = useState(false);
  const [readyPopupDismissedState,setReadyPopupDismissedState]=useState({});
  const [popupTick,setPopupTick]=useState(0);
  // Unified drag (kind: 'reassign' for provider columns, 'queue' for queue overlay).
  const [drag,setDrag]=useState(null);
  const [dragOverCol,setDragOverCol]=useState(null);
  const [dragOverId,setDragOverId]=useState(null);
  const [confirmDragMove,setConfirmDragMove]=useState(null);
  const dragRef=useRef(null);
  const dragOverColRef=useRef(null);
  const dragOverIdRef=useRef(null);
  const holdTimerRef=useRef(null);
  useEffect(()=>{dragRef.current=drag;},[drag]);
  useEffect(()=>{dragOverColRef.current=dragOverCol;},[dragOverCol]);
  useEffect(()=>{dragOverIdRef.current=dragOverId;},[dragOverId]);
  const [queueOrder,setQueueOrder]=useState([]);
  const[noteLocked,setNoteLocked]=useState(null);
  const[masterToast,setMasterToast]=useState(null);
  const masterToastRef=useRef(null);
  const showMasterToast=msg=>{setMasterToast(msg);clearTimeout(masterToastRef.current);masterToastRef.current=setTimeout(()=>setMasterToast(null),2000);};
  const adminTimeoutRef=useRef(null);
  const countdownRef=useRef(null);
  const[adminCountdown,setAdminCountdown]=useState(null);
  const[showMaster,setShowMaster]=useState(false);
  const resetAdminTimeout=useCallback(()=>{
    clearTimeout(adminTimeoutRef.current);clearInterval(countdownRef.current);setAdminCountdown(null);
    adminTimeoutRef.current=setTimeout(()=>{
      let c=10;setAdminCountdown(c);
      countdownRef.current=setInterval(()=>{c--;setAdminCountdown(c);if(c<=0){clearInterval(countdownRef.current);setAdminCountdown(null);setShowMaster(false);}},1000);
    },50000);
  },[]);
  useEffect(()=>{if(!showMaster){clearTimeout(adminTimeoutRef.current);clearInterval(countdownRef.current);setAdminCountdown(null);}},[showMaster]);
  const[inactiveProviders,setInactiveProviders]=useState(INIT_INACTIVE);
  useEffect(()=>{
    if(showAssign){
      setPendingAssignOps({...ops});
      setPendingActiveProviders([...activeProviders]);
      setPendingInactiveProviders([...inactiveProviders]);
    } else {
      setPendingAssignOps(null);
      setPendingActiveProviders(null);
      setPendingInactiveProviders(null);
    }
  },[showAssign]);
  
  const[confirmProvider,setConfirmProvider]=useState(null);
  const[confirmTransfer,setConfirmTransfer]=useState(null);
  const[statuses,setStatuses]=useState(INIT_STATUSES);
  const[availableApptTypes,setAvailableApptTypes]=useState(INIT_APPT_TYPES);
  const[allOpsState,setAllOpsState]=useState([]);
  const[,setTick]=useState(0);
  const[now,setNow]=useState(new Date());

  useEffect(()=>{const id=setInterval(()=>setTick(t=>t+1),60000);return()=>clearInterval(id);},[]);
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id);},[]);
// Subscribe to server state broadcasts so master stays in sync with FD/TV
  useEffect(()=>{
    if(typeof socket==='undefined') return;
    const onState=state=>{
      if(state.version){
        if(CLIENT_VERSION===null) CLIENT_VERSION=state.version;
        else if(state.version!==CLIENT_VERSION){ location.reload(); return; }
      }
      if(state.allOps) setAllOpsState(state.allOps);
      if(state.activeProviders) setActiveProviders(state.activeProviders);
      if(state.inactiveProviders) setInactiveProviders(state.inactiveProviders);
      if(state.statuses) setStatuses(state.statuses);
      if(state.apptTypes) setAvailableApptTypes(state.apptTypes);
      if(state.customAbbrevs) setCustomAbbrevs(state.customAbbrevs);
      if(state.providerColors) setProviderColors(state.providerColors);
      if(state.readyPopupDismissed) setReadyPopupDismissedState(state.readyPopupDismissed);
      if(Array.isArray(state.queueOrder)) setQueueOrder(state.queueOrder);
      if(state.ops) setOps(prev=>{
        const merged={...prev};
        Object.keys(state.ops).forEach(k=>{
          merged[k]={...state.ops[k],ts:state.ops[k].ts?new Date(state.ops[k].ts):null,noteUpdatedAt:state.ops[k].noteUpdatedAt||null};
        });
        return merged;
      });
    };
    socket.on('state',onState);
    socket.on('noteLock',({op,by})=>setNoteLocked({op,by}));
    socket.on('noteUnlock',({op}={})=>setNoteLocked(prev=>(prev && (op===null||op===undefined||prev.op===op))?null:prev));
    socket.emit('requestState');
    const onUnload=()=>socket.emit('noteUnlock',{op:null});
    window.addEventListener('beforeunload',onUnload);
    return ()=>{
      socket.off('state',onState);
      socket.off('noteLock');
      socket.off('noteUnlock');
      window.removeEventListener('beforeunload',onUnload);
    };
  },[]);
  const SM=Object.fromEntries(statuses.map(s=>[s.key,s]));
  // emitSocket: safe wrapper — no-ops gracefully in preview where socket is undefined
  const emitSocket=useCallback((event,data)=>{
    try{if(typeof socket!=='undefined')socket.emit(event,data);}catch(e){}
  },[]);
  const enabledOps=allOpsState.filter(o=>o.enabled).map(o=>o.id);
  // RDY popup derivation — banner triggers only on ready status
  const readyOps = enabledOps
    .filter(op=>ops[op]?.provider&&ops[op]?.status==='ready')
    .map(op=>({op,ts:ops[op].ts}))
    .sort((a,b)=>{
      const ai=queueOrder.indexOf(a.op), bi=queueOrder.indexOf(b.op);
      if(ai>=0&&bi>=0)return ai-bi;
      if(ai>=0)return -1;
      if(bi>=0)return 1;
      return (a.ts?new Date(a.ts):0)-(b.ts?new Date(b.ts):0);
    });
  // Sync queueOrder: add new ops at end, remove departed ops
  useEffect(()=>{
    setQueueOrder(prev=>{
      const currentOps=readyOps.map(r=>r.op);
      const current=new Set(currentOps);
      const filtered=prev.filter(op=>current.has(op));
      const newOps=currentOps.filter(op=>!prev.includes(op));
      return [...filtered,...newOps];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[readyOps.length, readyOps.map(r=>r.op).join('-')]);
  const activePopup = readyOps[0] || null;
  // Tick every 30s to re-evaluate popup queue
  useEffect(()=>{const id=setInterval(()=>setPopupTick(t=>t+1),30000);return()=>clearInterval(id);},[]);
  // Ready popup modal queue: ops not dismissed within last 5 min
  const readyPopupQueue=readyOps.filter(p=>{
    const d=readyPopupDismissedState[p.op];
    return !d||(Date.now()-d>=5*60*1000);
  });
  // eslint-disable-next-line no-unused-vars
  const _popupTickDep=popupTick;
  const currentReadyPopup=readyPopupQueue[0]||null;

  // ── Unified drag system (reassign + queue) ────────────────────────────────
  // Tap-vs-drag arbitration: a touch/click on a card primes a gesture. The
  // gesture promotes to a drag when either (a) the 400ms hold fires, or
  // (b) the pointer moves ≥10px before release. Otherwise it resolves as a
  // tap, and the button's onClick fires its modal-opening action. The
  // dragPromotedRef flag tells onClick handlers to skip their action.
  const HOLD_MS = 400;
  const MOVE_PROMOTE_PX = 10;
  const primedRef = useRef(null);
  const dragPromotedRef = useRef(false);
  const cancelHold = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    primedRef.current = null;
  };
  const promoteToDrag = () => {
    const p = primedRef.current;
    if (!p || dragRef.current) return;
    primedRef.current = null;
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    dragPromotedRef.current = true;
    setMenu(null);
    setNoteEdit(prev => {
      if (prev) emitSocket('noteUnlock', { op: prev.op });
      return null;
    });
    setDrag({
      kind: p.kind, ...p.payload,
      startX: p.startX, startY: p.startY,
      originalLeft: p.rect.left, originalTop: p.rect.top,
      originalWidth: p.rect.width, originalHeight: p.rect.height,
      scale: p.scale, pointerX: p.startX, pointerY: p.startY,
    });
    if (navigator.vibrate) navigator.vibrate(40);
  };
  const primeDrag = (kind, payload, e) => {
    cancelHold();
    dragPromotedRef.current = false;
    const t = e.touches ? e.touches[0] : e;
    const startX = t.clientX, startY = t.clientY;
    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    const inner = document.querySelector('[data-scaled-inner]');
    const scale = inner ? inner.getBoundingClientRect().width / 1340 : 1;
    primedRef.current = { kind, payload, startX, startY, rect, scale };
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      promoteToDrag();
    }, HOLD_MS);
  };
  // While primed, ≥10px movement promotes to drag immediately.
  const maybePromoteOnMove = (e) => {
    const p = primedRef.current;
    if (!p || dragRef.current) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - p.startX;
    const dy = t.clientY - p.startY;
    if (Math.hypot(dx, dy) >= MOVE_PROMOTE_PX) promoteToDrag();
  };
  // onClick guard: returns true if onClick should skip its modal action.
  const consumeDragSuppressedClick = (e) => {
    if (dragPromotedRef.current) {
      dragPromotedRef.current = false;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      return true;
    }
    return false;
  };
  // Compute which provider column the dragged card has ≥50% overlap with.
  // Source provider is excluded so dropping back on the origin column cancels.
  const computeReassignDropTarget = (cardRect, sourceProvider) => {
    const cardArea = cardRect.width * cardRect.height;
    if (cardArea <= 0) return null;
    let best = null, bestArea = 0;
    document.querySelectorAll('[data-provider-col]').forEach(col => {
      const name = col.getAttribute('data-provider-col');
      if (name === sourceProvider) return;
      const r = col.getBoundingClientRect();
      const ix = Math.max(0, Math.min(cardRect.right, r.right) - Math.max(cardRect.left, r.left));
      const iy = Math.max(0, Math.min(cardRect.bottom, r.bottom) - Math.max(cardRect.top, r.top));
      const area = ix * iy;
      if (area > bestArea) { best = name; bestArea = area; }
    });
    return bestArea >= cardArea * 0.5 ? best : null;
  };
  // Window listeners attach once per drag (when drag goes null → object).
  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const cur = dragRef.current;
      if (!cur) return;
      if (e.cancelable && e.touches) e.preventDefault();
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;
      setDrag(d => d ? { ...d, pointerX: x, pointerY: y } : d);
      if (cur.kind === 'reassign') {
        const dx = x - cur.startX, dy = y - cur.startY;
        const cardRect = {
          left:   cur.originalLeft + dx,
          top:    cur.originalTop  + dy,
          right:  cur.originalLeft + dx + cur.originalWidth,
          bottom: cur.originalTop  + dy + cur.originalHeight,
          width:  cur.originalWidth,
          height: cur.originalHeight,
        };
        const targetCol = computeReassignDropTarget(cardRect, cur.sourceProvider);
        // Write the ref synchronously so onUp sees the latest value regardless of
        // when React commits the state-driven mirror.
        dragOverColRef.current = targetCol;
        setDragOverCol(targetCol);
      } else {
        const el = document.elementFromPoint(x, y);
        let qi = el?.closest('[data-queue-item-id]');
        // If nothing matched but the pointer is below the last row, treat it as a
        // drop on the last visible queue item (so "drop past the end" lands at end).
        if (!qi) {
          const items = document.querySelectorAll('[data-queue-item-id]');
          if (items.length) {
            const last = items[items.length - 1];
            const r = last.getBoundingClientRect();
            if (y > r.bottom) qi = last;
          }
        }
        const nextOver = qi ? Number(qi.getAttribute('data-queue-item-id')) : null;
        dragOverIdRef.current = nextOver;
        setDragOverId(nextOver);
      }
    };
    const onUp = () => {
      const cur = dragRef.current;
      if (cur) {
        if (cur.kind === 'reassign') {
          const target = dragOverColRef.current;
          if (target && target !== cur.sourceProvider) {
            setConfirmDragMove({ op: cur.op, from: cur.sourceProvider, to: target });
          }
        } else if (cur.kind === 'queue') {
          const overId = dragOverIdRef.current;
          if (overId !== null && overId !== cur.itemId) {
            setQueueOrder(prev => {
              const arr = [...prev];
              const fromIdx = arr.indexOf(cur.itemId);
              const toIdx   = arr.indexOf(overId);
              if (fromIdx < 0 || toIdx < 0) return prev;
              const [moved] = arr.splice(fromIdx, 1);
              arr.splice(toIdx, 0, moved);
              emitSocket('setQueueOrder', { order: arr });
              return arr;
            });
          }
        }
      }
      setDrag(null);
      setDragOverCol(null);
      setDragOverId(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [!!drag]);
  const commitReassign = () => {
    if (!confirmDragMove) return;
    const { op, to } = confirmDragMove;
    setOps(p => ({ ...p, [op]: { ...p[op], provider: to } }));
    emitSocket('reassignOp', { op, provider: to });
    setConfirmDragMove(null);
  };
  const dismissReadyPopup=()=>{
    if(!currentReadyPopup)return;
    emitSocket('dismissReadyPopup',{op:currentReadyPopup.op});
  };
  // Clear dismissal when op leaves ready (server-side). Run when the set of
  // ready ops changes — not on every unrelated ops field update.
  const readyOpsKey = readyOps.map(r=>r.op).join('-');
  useEffect(()=>{
    Object.keys(readyPopupDismissedState).forEach(op=>{
      if(ops[op]?.status!=='ready'){
        emitSocket('clearReadyPopupDismissed',{op:Number(op)});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[readyOpsKey]);
  
  const fmtDate=d=>`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
  const fmtTime=d=>{let h=d.getHours(),m=d.getMinutes(),ap=h>=12?"PM":"AM";h=h%12||12;return`${h}:${String(m).padStart(2,"0")} ${ap}`;};

  const setStatus=useCallback((op,key)=>{
  setOps(p=>({...p,[op]:{...p[op],status:key,ts:key==="inactive"?null:new Date()}}));
  emitSocket('setStatus',{op,status:key});
  setAntsOps(prev=>{const n=new Set(prev);n.delete(op);return n;});
  setMenu(null);
},[]);
  const setApptType=useCallback((op,newTypes)=>{
    setOps(p=>({...p,[op]:{...p[op],apptTypes:Array.isArray(newTypes)?newTypes:[]}}));
    emitSocket('setApptType',{op,apptTypes:Array.isArray(newTypes)?newTypes:[]});
    // No toast on individual toggle — keep menu open for multi-select
  },[]);
  const updateNote=useCallback((op,val)=>{setOps(p=>({...p,[op]:{...p[op],note:val}}));emitSocket('setNote',{op,note:val});},[]);

  const abbreviatedNotes=useMemo(()=>{
    const r={};
    Object.keys(ops).forEach(op=>{r[op]=ops[op]?.note?abbreviateNote(ops[op].note,customAbbrevs):'';});
    return r;
  },[ops,customAbbrevs]);
  const providerCols=activeProviders.map(p=>({name:p,rooms:enabledOps.filter(op=>ops[op]?.provider===p).sort((a,b)=>a-b)}));
  const n=providerCols.length;

  return(
    <ScaledWrapper designW={1340} designH={DESIGN_H}>
      <div data-root style={S.root} onMouseDown={()=>setMenu(null)}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap"/>
        <style>{css}</style>

        {/* Header */}
        <div data-header style={S.header}>
          <img src="/dentists-logo.webp" alt="Dentists of West Henderson" height="36" style={{display:"block",flexShrink:0}}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={S.headerTitle}>OPBOARD</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",letterSpacing:"0.18em",color:"rgba(255,255,255,0.3)",fontWeight:600,marginTop:"2px"}}>MAIN</div>
          </div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",fontWeight:600,color:"rgba(255,255,255,0.75)",flexShrink:0,textAlign:"right"}}>
            {fmtDate(now)}<span style={{display:"inline-block",width:"28px"}}/>{fmtTime(now)}
          </div>
        </div>
        {/* RDY Banner — shows at top when there are undismissed ready ops */}
        {activePopup && !showQueue && (
          <div style={{
            flexShrink:0,
            background:'rgba(74,222,128,0.18)',
            borderTop:'2px solid #4ade80',
            padding:'8px 20px',
            display:'flex',alignItems:'center',gap:'16px',
            animation:'rdyBannerPulse 2.5s ease-in-out infinite'
          }}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',letterSpacing:'0.15em',
              color:'#4ade80',flexShrink:0}}>
              ⚠ READY
            </div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'28px',letterSpacing:'0.1em',
              color:'#fff',flexShrink:0}}>
              OP {activePopup.op}
            </div>
            {activePopup.ts && (
              <div style={{fontSize:'14px',fontWeight:700,color:'rgba(255,255,255,0.5)',flexShrink:0}}>
                {Math.floor((Date.now()-new Date(activePopup.ts).getTime())/60000)}m
              </div>
            )}
            <div style={{flex:1}}/>
            {readyOps.length > 1 && (
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',
                color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',flexShrink:0}}>
                +{readyOps.length - 1} MORE
              </div>
            )}
            
            <button onMouseDown={e=>{e.stopPropagation();setShowQueue(true);}}
              style={{flexShrink:0,padding:'6px 16px',borderRadius:'7px',cursor:'pointer',
                background:'rgba(74,222,128,0.3)',
                border:'1px solid #4ade80',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',letterSpacing:'0.1em',
                color:'#fff'}}>
              VIEW QUEUE
            </button>
          </div>
        )}

        {/* Provider columns */}
        <div style={{...S.grid,gridTemplateColumns:`repeat(${n},minmax(0,1fr))`}}>
          {providerCols.map(({name,rooms},ci)=>{
            const numSz=`clamp(75px,${16.25/n}vw,200px)`;   // +25% → 75px min, 200px max
            const bdgSz=`clamp(18px,${3.02/n}vw,45px)`;     // +15% → 16*1.15=18.4≈18px
            const notSz=`clamp(36px,${5.4/n}vw,66px)`;      // +200% from 12px → 36px min
            const timSz=`clamp(11px,${1.38/n}vw,17.5px)`;   // +25% same ratio as numSz
            const namSz=`clamp(22px,${4.5/n}vw,58px)`;
            const apptW=`calc(${bdgSz} * 1.75)`;
            const isValidTarget = drag?.kind==='reassign' && dragOverCol===name && drag.sourceProvider!==name;
            const provCol = providerColors?.[name] || '#fff';
            return(
              <div key={name} data-provider-col={name}
                style={{...S.col,
                  background: isValidTarget ? `${provCol}1f` : undefined,
                  border:     isValidTarget ? `2px dashed ${provCol}` : undefined,
                  borderRadius: isValidTarget ? "8px" : undefined,
                  transition: "background .15s, border-color .15s"}}>
                <div style={{...S.provName,fontSize:namSz}}>{name}</div>
                <div style={S.provDiv}/>
                {rooms.length===0&&(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.3}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(16px,2vw,28px)",letterSpacing:"0.12em",color:"rgba(255,255,255,0.6)",textAlign:"center"}}>NO OPS ASSIGNED</div>
                  </div>
                )}
                <div style={{...S.roomCol,display:"grid",gridTemplateRows:`repeat(${Math.max(rooms.length,3)},1fr)`}}>
                  {rooms.map(op=>{
                    const{status,note,ts,apptTypes=[]}=ops[op]||{};
                    const cfg=SM[status]||SM.ready;
                    const isInactive=status==="inactive";
                    const isOpen=menu?.op===op&&menu?.type==="status";
                    const apptOpen=menu?.op===op&&menu?.type==="appt";
                    const isDragged = drag?.kind==='reassign' && drag.op===op;
                    const tx = isDragged ? (drag.pointerX - drag.startX) / drag.scale : 0;
                    const ty = isDragged ? (drag.pointerY - drag.startY) / drag.scale : 0;
                    return(
                      <div key={op} data-op={op}
                        className={antsOps.has(op)?"card-ants":""}
                        style={{...S.card,background:cfg.bg,
                          border:antsOps.has(op)?"none":`2px solid ${isOpen||apptOpen?cfg.numColor:cfg.border}`,
                          boxShadow:isDragged?"0 12px 32px rgba(0,0,0,0.6)":(isOpen||apptOpen)&&!isInactive?cfg.glow:status==="awaiting"?"0 0 14px rgba(255,255,255,0.15)":"none",
                          opacity:isInactive?0.4:1,position:"relative",padding:0,overflow:"hidden",
                          display:"flex",flexDirection:"row",alignItems:"stretch",
                          transform: isDragged ? `translate(${tx}px, ${ty}px)` : "none",
                          transition: isDragged ? "none" : "transform .2s",
                          zIndex: isDragged ? 1000 : "auto"}}
                        onMouseDownCapture={e=>{ if(!isInactive) primeDrag('reassign', { op, sourceProvider: name }, e); }}
                        onTouchStartCapture={e=>{ if(!isInactive) primeDrag('reassign', { op, sourceProvider: name }, e); }}
                        onMouseMoveCapture={maybePromoteOnMove}
                        onTouchMoveCapture={maybePromoteOnMove}
                        onMouseUpCapture={cancelHold}
                        onTouchEndCapture={cancelHold}
                        onMouseDown={e=>e.stopPropagation()}>

                        {/* Left column: op number + elapsed below it */}
                        <button className="num-btn"
                          onMouseDown={e=>e.stopPropagation()}
                          onClick={e=>{if(consumeDragSuppressedClick(e))return;e.stopPropagation();setMenu(isOpen?null:{op,type:"status"});}}
                          style={{display:"flex",flexDirection:"column",alignItems:"center",
                            justifyContent:"center",padding:"4px 8px",flexShrink:0,
                            background:"transparent",border:"none",cursor:"pointer",gap:"2px"}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:numSz,lineHeight:1,
                            color:cfg.numColor,textShadow:isOpen&&!isInactive?cfg.glow:"none"}}>
                            {op}
                          </span>
                          {ts&&!isInactive&&(
                            <span style={{fontSize:timSz,fontWeight:700,color:cfg.numColor,
                              opacity:0.7,whiteSpace:"nowrap",lineHeight:1}}>
                              {elapsed(ts)}
                            </span>
                          )}
                        </button>

                        {/* Right: appt badge (50% narrower than before) + note */}
                        {!isInactive&&(
                          <div style={{flex:1,display:"flex",flexDirection:"row",
                            alignItems:"center",padding:"4px 6px",gap:"8px",minWidth:0,overflow:"hidden"}}>

                            {/* Appt type — each type gets its own fixed-width badge, letters stacked top-to-bottom upright */}
                            <button className="appt-btn"
                              onMouseDown={e=>e.stopPropagation()}
                              onClick={e=>{if(consumeDragSuppressedClick(e))return;e.stopPropagation();setMenu(apptOpen?null:{op,type:"appt"});}}
                              style={{flexShrink:0,background:"transparent",border:"none",
                                padding:"4px 0",cursor:"pointer",alignSelf:(apptTypes||[]).length>2?"stretch":"center",
                                display:"grid",gridTemplateColumns:`repeat(${Math.min(Math.max((apptTypes||[]).length,1),2)},${apptW})`,gridAutoRows:"1fr",gap:"2px",minHeight:(apptTypes||[]).length>2?undefined:`calc(${numSz} + ${timSz} + 14px)`}}>
                              {(apptTypes||[]).length===0&&(
                                <div style={{borderRadius:"6px",
                                  background:cfg.key==="awaiting"?"rgba(0,0,0,0.12)":"rgba(255,255,255,0.08)",
                                  border:`1.5px solid ${cfg.key==="awaiting"?"rgba(0,0,0,0.3)":"rgba(255,255,255,0.25)"}`,
                                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  <span style={{fontSize:bdgSz,fontWeight:700,
                                    color:cfg.key==="awaiting"?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.35)"}}>
                                    —
                                  </span>
                                </div>
                              )}
                              {[...(apptTypes||[])].sort((a,b)=>
                                INIT_APPT_TYPES.indexOf(a)-INIT_APPT_TYPES.indexOf(b)
                              ).map(t=>(
                                <div key={t} style={{borderRadius:"6px",
                                  background:`${cfg.numColor}22`,
                                  border:`1.5px solid ${cfg.numColor}55`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  flexDirection:"column",
                                  overflow:"hidden",padding:"2px 2px"}}>
                                  {(APPT_ABBR_MAP[t]||t).toUpperCase().split('').map((ch,idx)=>(
                                    <span key={idx} style={{fontSize:(apptTypes||[]).length>8?`calc(${bdgSz} * 0.35)`:(apptTypes||[]).length>6?`calc(${bdgSz} * 0.4)`:(apptTypes||[]).length>4?`calc(${bdgSz} * 0.5)`:(apptTypes||[]).length>2?`calc(${bdgSz} * 0.65)`:bdgSz,fontWeight:800,
                                      color:cfg.numColor,lineHeight:1.05,display:"block",
                                      textAlign:"center"}}>
                                      {ch}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </button>

                            {/* Note — inline editor on card, no modal/overlay needed */}
                            {/* Note display — tap to open editor modal */}
                            <button
                              onMouseDown={e=>e.stopPropagation()}
                              onClick={e=>{if(consumeDragSuppressedClick(e))return;e.stopPropagation();if(menu){setMenu(null);return;}if(noteLocked?.op===op&&noteLocked?.by!=="master"){showMasterToast("🔒 In use");return;}noteDidSelect.current=false;noteDraftRef.current=note||"";setNoteEdit({op,draft:note});emitSocket('noteLock',{op,by:"master"});}}
                              style={{flex:1,textAlign:"left",
                                padding:0,background:"transparent",border:"none",
                                cursor:"pointer",alignSelf:"center",minWidth:0,overflow:"hidden",
                                display:"flex",alignItems:"center"}}>
                              <FitText
                                text={abbreviatedNotes[op]||"Add note"}
                                maxSz={parseInt(notSz.match(/(\d+)px/)?.[1]||"36")}
                                minSz={10}
                                maxRows={3}
                                color={note
                                  ? cfg.key==="awaiting"
                                    ? "rgba(0,0,0,0.75)"
                                    : "rgba(255,255,255,0.85)"
                                  : cfg.key==="awaiting"
                                    ? "rgba(0,0,0,0.25)"
                                    : "rgba(255,255,255,0.18)"}
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

        {/* Footer */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:"10px",flexShrink:0}}
          onMouseDown={e=>e.stopPropagation()}>
          <button className="assign-btn" onMouseDown={e=>{e.stopPropagation();setMenu(null);setShowAssign(true);}} style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
            ASSIGNMENTS
          </button>
          <button onMouseDown={e=>{e.stopPropagation();setMenu(null);setShowMaster(true);}}
            style={{position:"absolute",bottom:"10px",right:"16px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"8px",padding:"8px 12px",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:"20px",lineHeight:1}}>≡</button>
        </div>

        {/* Status menu — centered modal */}
        {menu && menu.type==='status' && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",
            zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseDown={()=>setMenu(null)}>
            <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",
              padding:"20px",width:"320px",fontFamily:"'DM Sans',sans-serif",
              boxShadow:"0 16px 48px rgba(0,0,0,0.8)"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.15em",
                color:"rgba(255,255,255,0.4)",marginBottom:"14px",textAlign:"center"}}>
                STATUS · OP {menu.op}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {statuses.filter(s=>s.key!=="inactive").map(s=>{
                  const active=ops[menu.op]?.status===s.key;
                  const dc=s.key==="awaiting"?(active?"#000":"#fff"):s.numColor;
                  return(
                    <button key={s.key}
                      style={{padding:"10px 14px",borderRadius:"10px",cursor:"pointer",textAlign:"left",
                        background:active?s.bg:"rgba(255,255,255,0.04)",
                        border:`2px solid ${active?s.border:"rgba(255,255,255,0.07)"}`,
                        display:"flex",alignItems:"center",gap:"12px"}}
                      onMouseDown={e=>{e.stopPropagation();setStatus(menu.op,s.key);setMenu(null);}}>
                      <span style={{width:"11px",height:"11px",borderRadius:"50%",flexShrink:0,
                        background:dc,boxShadow:`0 0 6px ${dc}`}}/>
                      <span style={{fontSize:"16px",fontWeight:700,flex:1,
                        color:active?dc:"rgba(255,255,255,0.85)",fontFamily:"'DM Sans',sans-serif"}}>{s.abbr}</span>
                      {active&&<span style={{fontSize:"13px",color:dc}}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <button onMouseDown={e=>{e.stopPropagation();setMenu(null);}}
                style={{marginTop:"12px",width:"100%",padding:"10px",
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:"8px",color:"rgba(255,255,255,0.45)",fontFamily:"'Bebas Neue',sans-serif",
                  fontSize:"14px",letterSpacing:"0.1em",cursor:"pointer"}}>CANCEL</button>
            </div>
          </div>
        )}

        {/* Appt type menu — centered modal for easy multi-select */}

        {noteEdit && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseDown={()=>{updateNote(noteEdit.op,noteEdit.draft);emitSocket('noteUnlock',{op:noteEdit.op});setNoteEdit(null);}}>
            <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.18)",borderRadius:"16px",padding:"24px",width:"500px",color:"#fff",fontFamily:"'DM Sans',sans-serif"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",marginBottom:"16px",color:"rgba(255,255,255,0.5)"}}>
                NOTE · OP {noteEdit.op}
              </div>
              <textarea
                autoFocus
                ref={el => { if (el && !noteDidSelect.current) { noteDidSelect.current = true; setTimeout(() => { el.focus(); el.select(); }, 10); } }}
                value={noteEdit.draft}
                onChange={e=>setNoteEdit(p=>({...p,draft:e.target.value}))}
                onKeyDown={e=>{
                  if(e.key==='Enter'&&!e.shiftKey){
                    e.preventDefault();
                    updateNote(noteEdit.op,noteEdit.draft);
                    emitSocket('noteUnlock',{op:noteEdit.op});
                    setNoteEdit(null);
                  }
                }}
                placeholder="Enter note..."
                style={{width:"100%",minHeight:"100px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"10px",padding:"14px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"20px",fontWeight:600,resize:"none",outline:"none",lineHeight:1.4}}
              />
              <div style={{display:"flex",gap:"10px",marginTop:"14px"}}>
                <button style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"8px",color:"rgba(255,255,255,0.5)",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",cursor:"pointer"}}
                  onMouseDown={()=>{emitSocket('noteUnlock',{op:noteEdit.op});setNoteEdit(null);}}>Cancel</button>
                <button style={{flex:2,padding:"12px",background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.4)",borderRadius:"8px",color:"#60a5fa",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>{updateNote(noteEdit.op,noteEdit.draft);emitSocket('noteUnlock',{op:noteEdit.op});setNoteEdit(null);}}>SAVE</button>
              </div>
            </div>
          </div>
        )}

        {menu && menu.type==='appt' && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",
            zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseDown={()=>setMenu(null)}>
            <ModalMenu
              key={`${menu.op}-appt`}
              op={menu.op}
              menuType="appt"
              ops={ops}
              onClose={()=>setMenu(null)}
              onSetStatus={setStatus}
              onSetApptType={setApptType}
              statuses={statuses}
              apptTypes={availableApptTypes}
            />
          </div>
        )}

        {/* ── Assignments Modal ── */}
        {showAssign && !confirmProvider && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(4px)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseDown={()=>setShowAssign(false)}>
            <div style={{background:"#16161a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"16px",padding:"16px 20px",width:"580px",maxHeight:"92vh",overflowY:"hidden",color:"#fff",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.12em",marginBottom:"12px",display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                ASSIGNMENTS
              </div>

              {/* Active Providers */}
              <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.35)",fontWeight:600,marginBottom:"8px",flexShrink:0}}>ACTIVE PROVIDERS</div>
              <div style={{flex:1,overflowY:"hidden"}}>
              {activeProviders.map(p=>(
                <div key={p} style={{marginBottom:"10px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"14px",letterSpacing:"0.1em",color:"rgba(255,255,255,0.85)"}}>{p}</div>
                    <button
                      title={`Inactivate ${p}`}
                      onMouseDown={e=>{e.stopPropagation();setConfirmProvider({name:p,action:"inactivate"});}}
                      style={{width:"24px",height:"24px",borderRadius:"50%",border:"1px solid rgba(255,80,80,0.5)",background:"rgba(255,80,80,0.1)",color:"rgba(255,100,100,0.9)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",lineHeight:1,fontWeight:300}}>
                      −
                    </button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                    {enabledOps.map(op=>{
const opData=pendingAssignOps?.[op]||ops[op];
                      const assigned=opData?.provider===p;
                      const takenBy=opData?.provider;
                      const takenByOther=takenBy&&takenBy!==p;
                      return(
                        <button key={op}
                          style={{width:"40px",height:"32px",borderRadius:"7px",
                            border:`1px solid ${assigned?"rgba(74,222,128,0.7)":takenByOther?"rgba(255,60,60,0.6)":"rgba(255,255,255,0.25)"}`,
                            background:assigned?"rgba(74,222,128,0.18)":takenByOther?"rgba(255,60,60,0.12)":"rgba(255,255,255,0.05)",
                            color:assigned?"#4ade80":takenByOther?"rgba(255,100,100,0.9)":"rgba(255,255,255,0.8)",
                            cursor:"pointer",fontSize:"13px",fontWeight:700}}
                          onMouseDown={e=>{
                            e.stopPropagation();
                            if(assigned){
                              setPendingAssignOps(prev=>({...prev,[op]:{...prev[op],provider:null}}));
                            } else if(takenByOther){
                              setConfirmTransfer({op,fromProvider:takenBy,toProvider:p});
                            } else {
                              setPendingAssignOps(prev=>({...prev,[op]:{...prev[op],provider:p,status:"awaiting",apptTypes:[],note:"",ts:new Date()}}));
                          }}}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              </div>

              {/* Divider */}
              <div style={{height:"1px",background:"rgba(255,255,255,0.15)",margin:"10px 0 8px",flexShrink:0}}/>

              {/* Inactive Providers */}
              <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.35)",fontWeight:600,marginBottom:"8px",flexShrink:0}}>INACTIVE PROVIDERS</div>
              {inactiveProviders.length===0 && (
                <div style={{fontSize:"12px",color:"rgba(255,255,255,0.2)",fontStyle:"italic",marginBottom:"8px",flexShrink:0}}>None</div>
              )}
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"6px",flexShrink:0}}>
                {inactiveProviders.map(p=>(                  
                  <button key={p}
                    onMouseDown={e=>{e.stopPropagation();setConfirmProvider({name:p,action:"activate"});}}
                    style={{padding:"6px 14px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.45)",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
                    {p}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:"10px",marginTop:"8px",flexShrink:0}}>
                <button style={{flex:1,padding:"10px",background:"rgba(255,80,80,0.12)",border:"1px solid rgba(255,80,80,0.4)",borderRadius:"8px",color:"rgba(255,120,120,0.95)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>setShowAssign(false)}>CANCEL</button>
                <button style={{flex:1,padding:"10px",background:"rgba(74,222,128,0.15)",border:"1px solid rgba(74,222,128,0.5)",borderRadius:"8px",color:"#4ade80",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>{
                    if(pendingAssignOps){
                      Object.keys(pendingAssignOps).forEach(op=>{
                        const oldProvider=ops[op]?.provider;
                        const newProvider=pendingAssignOps[op]?.provider;
                        if(oldProvider!==newProvider){
                          setOps(prev=>({...prev,[op]:pendingAssignOps[op]}));
                          emitSocket('setOpProvider',{op:Number(op),provider:newProvider,status:pendingAssignOps[op]?.status||'awaiting',apptTypes:pendingAssignOps[op]?.apptTypes||[],note:pendingAssignOps[op]?.note||''});
                        }
                      });
                    }
                    if(pendingActiveProviders){
                      setActiveProviders(pendingActiveProviders);
                      emitSocket('setProviders',{activeProviders:pendingActiveProviders,inactiveProviders:pendingInactiveProviders});
                    }
                    if(pendingInactiveProviders){
                      setInactiveProviders(pendingInactiveProviders);
                    }
                    setShowAssign(false);
                  }}>ACCEPT</button>
              </div>
          </div>
          </div>
        )}

        {/* ── Confirm drag-reassignment popup ── */}
        {confirmDragMove && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",zIndex:910,display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseDown={()=>setConfirmDragMove(null)}>
            <div style={{background:"#1e1e26",border:"1px solid rgba(255,160,0,0.4)",borderRadius:"16px",padding:"32px",width:"440px",textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontSize:"22px",fontWeight:700,color:"#fff",marginBottom:"18px",lineHeight:1.35}}>
                Move Op {confirmDragMove.op} from {confirmDragMove.from} to {confirmDragMove.to}?
              </div>
              <div style={{display:"flex",gap:"12px"}}>
                <button style={{flex:1,padding:"12px",background:"rgba(255,60,60,0.12)",border:"1px solid rgba(255,60,60,0.5)",borderRadius:"9px",color:"rgba(255,100,100,0.9)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>setConfirmDragMove(null)}>DECLINE</button>
                <button style={{flex:1,padding:"12px",background:"rgba(74,222,128,0.15)",border:"1px solid rgba(74,222,128,0.5)",borderRadius:"9px",color:"#4ade80",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={commitReassign}>CONFIRM</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Confirm transfer popup ── */}
        {confirmTransfer && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",zIndex:910,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#1e1e26",border:"1px solid rgba(255,160,0,0.4)",borderRadius:"16px",padding:"32px",width:"400px",textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontSize:"22px",fontWeight:700,color:"#fff",marginBottom:"8px"}}>
                Transfer Op {confirmTransfer.op}?
              </div>
              <div style={{fontSize:"15px",color:"rgba(255,255,255,0.5)",marginBottom:"6px"}}>
                Currently assigned to
              </div>
              <div style={{fontSize:"20px",fontWeight:700,color:"rgba(255,180,0,0.85)",marginBottom:"28px"}}>
                {confirmTransfer.fromProvider}
              </div>
              <div style={{display:"flex",gap:"12px"}}>
                <button style={{flex:1,padding:"12px",background:"rgba(255,60,60,0.12)",border:"1px solid rgba(255,60,60,0.5)",borderRadius:"9px",color:"rgba(255,100,100,0.9)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>setConfirmTransfer(null)}>DECLINE</button>
                <button style={{flex:1,padding:"12px",background:"rgba(74,222,128,0.15)",border:"1px solid rgba(74,222,128,0.5)",borderRadius:"9px",color:"#4ade80",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>{
                    const{op,toProvider}=confirmTransfer;
                    const updated={...(ops[op]||{}),provider:toProvider,status:"awaiting",apptTypes:[],note:"",ts:new Date()};
                    setOps(prev=>({...prev,[op]:updated}));
                    emitSocket('setOpProvider',{op:Number(op),provider:toProvider,status:'awaiting',apptTypes:[],note:''});
                    setPendingAssignOps(prev=>({...(prev||{...ops}),[op]:updated}));
                    setConfirmTransfer(null);
                  }}>CONFIRM</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Confirm inactivate/activate popup ── */}
        {confirmProvider && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#1e1e26",border:`1px solid ${confirmProvider.action==="inactivate"?"rgba(255,80,80,0.4)":"rgba(74,222,128,0.4)"}`,borderRadius:"16px",padding:"32px",width:"380px",textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontSize:"22px",fontWeight:700,color:"#fff",marginBottom:"8px"}}>
                {confirmProvider.action==="inactivate"?"Inactivate":"Activate"} {confirmProvider.name}?
              </div>
              <div style={{fontSize:"13px",color:"rgba(255,255,255,0.35)",marginBottom:"28px"}}>
                {confirmProvider.action==="inactivate"
                  ?"This provider will be removed from the operatory status board."
                  :"This provider will be added to the operatory status board."}
              </div>
              <div style={{display:"flex",gap:"12px"}}>
                <button style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"9px",color:"rgba(255,255,255,0.6)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>setConfirmProvider(null)}>DECLINE</button>
                <button style={{flex:1,padding:"12px",background:confirmProvider.action==="inactivate"?"rgba(255,80,80,0.15)":"rgba(74,222,128,0.15)",border:`1px solid ${confirmProvider.action==="inactivate"?"rgba(255,80,80,0.5)":"rgba(74,222,128,0.5)"}`,borderRadius:"9px",color:confirmProvider.action==="inactivate"?"rgba(255,100,100,0.9)":"#4ade80",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.12em",cursor:"pointer"}}
                  onMouseDown={()=>{
                    const {name, action} = confirmProvider;
                    if(action==="inactivate"){
                      const newActive=activeProviders.filter(p=>p!==name);
                      const newInactive=[...inactiveProviders,name];
                      setActiveProviders(newActive);
                      setInactiveProviders(newInactive);
                      emitSocket('setProviders',{activeProviders:newActive,inactiveProviders:newInactive});
                      // Immediately unassign all live ops held by this provider, and broadcast.
                      // Reset status/apptTypes/note so stale state doesn't keep firing READY/AWFA popups.
                      Object.keys(ops).forEach(op=>{
                        if(ops[op]?.provider===name){
                          const updated={...ops[op],provider:null,status:'awaiting',apptTypes:[],note:''};
                          setOps(prev=>({...prev,[op]:updated}));
                          emitSocket('setOpProvider',{op:Number(op),provider:null,status:'awaiting',apptTypes:[],note:''});
                        }
                      });
                      // Mirror to pending so other unconfirmed pending edits remain coherent
                      setPendingActiveProviders(newActive);
                      setPendingInactiveProviders(newInactive);
                      setPendingAssignOps(prev=>{
                        const base=prev||{...ops};
                        const updated={...base};
                        enabledOps.forEach(op=>{
                          if(updated[op]?.provider===name){
                            updated[op]={...updated[op],provider:null};
                          }
                        });
                        return updated;
                      });
                    } else {
                      const newInactive=inactiveProviders.filter(p=>p!==name);
                      const newActive=[...activeProviders,name];
                      setActiveProviders(newActive);
                      setInactiveProviders(newInactive);
                      emitSocket('setProviders',{activeProviders:newActive,inactiveProviders:newInactive});
                      setPendingActiveProviders(newActive);
                      setPendingInactiveProviders(newInactive);
                    }
                    setConfirmProvider(null);
                  }}>CONFIRM</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Note Edit Modal ── */}
        {masterToast&&(
          <div style={{position:"absolute",bottom:"30px",left:"50%",transform:"translateX(-50%)",
            background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.4)",
            borderRadius:"10px",padding:"10px 24px",fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"18px",letterSpacing:"0.12em",color:"#60a5fa",whiteSpace:"nowrap",
            zIndex:700,boxShadow:"0 0 16px rgba(96,165,250,0.2)",pointerEvents:"none"}}>
            {masterToast}
          </div>
        )}
        {showHistory && (
          <HistoryModal ops={ops} statuses={statuses} allOps={enabledOps} onClose={()=>setShowHistory(false)} />
        )}
        {showMaster && (
          <MasterMenu
            statuses={statuses}
            setStatuses={(next)=>setStatuses(prev=>{const arr=typeof next==="function"?next(prev):next;emitSocket("setStatuses",{statuses:arr});return arr;})}
            apptTypes={availableApptTypes}
            setApptTypes={(next)=>setAvailableApptTypes(prev=>{const arr=typeof next==="function"?next(prev):next;emitSocket("setApptTypes",{apptTypes:arr});return arr;})}
            allOps={allOpsState} setAllOps={setAllOpsState}
            providers={activeProviders}
            setProviders={(next)=>setActiveProviders(prev=>{const arr=typeof next==="function"?next(prev):next;emitSocket("setProviders",{activeProviders:arr,inactiveProviders});return arr;})}
            inactiveProviders={inactiveProviders}
            setInactiveProviders={(next)=>setInactiveProviders(prev=>{const arr=typeof next==="function"?next(prev):next;emitSocket("setProviders",{activeProviders,inactiveProviders:arr});return arr;})}
            onClose={()=>setShowMaster(false)}
            emitSocket={emitSocket}
            setShowHistory={setShowHistory}
          />
        )}
        {showQueue && (
          <div style={{position:"absolute",inset:0,background:"rgba(8,10,12,0.97)",zIndex:350,display:"flex",flexDirection:"column",padding:"24px 32px",gap:"12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",letterSpacing:"0.15em",color:"#4ade80"}}>READY QUEUE</div>
              <button onClick={()=>setShowQueue(false)} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.12em",padding:"8px 20px",borderRadius:"7px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)",cursor:"pointer"}}>BACK</button>
            </div>
            <div style={{fontSize:"11px",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans',sans-serif",marginBottom:"4px"}}>DRAG ↕ TO REORDER URGENCY · STATUS CHANGE REMOVES OP FROM QUEUE</div>
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"8px"}}>
              {readyOps.length===0 && (<div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",fontFamily:"'DM Sans',sans-serif",padding:"40px"}}>No ops ready</div>)}
              {readyOps.map(item=>{
                const isQDragged = drag?.kind==='queue' && drag.itemId===item.op;
                const qtx = isQDragged ? (drag.pointerX - drag.startX) / drag.scale : 0;
                const qty = isQDragged ? (drag.pointerY - drag.startY) / drag.scale : 0;
                return (
                <div key={item.op} data-queue-item-id={item.op}
                  style={{padding:"16px 20px",background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.3)",borderRadius:"10px",display:"flex",alignItems:"center",gap:"20px",userSelect:"none",
                    transform: isQDragged ? `translate(${qtx}px, ${qty}px)` : "none",
                    transition: isQDragged ? "none" : "transform .2s",
                    boxShadow: isQDragged ? "0 12px 32px rgba(0,0,0,0.6)" : "none",
                    zIndex: isQDragged ? 1000 : "auto",
                    // While dragging, ignore pointer hits on the dragged item so
                    // elementFromPoint can resolve to the item underneath.
                    pointerEvents: isQDragged ? "none" : "auto",
                    touchAction: "none"}}
                  onMouseDownCapture={e=>primeDrag('queue',{itemId:item.op},e)}
                  onTouchStartCapture={e=>primeDrag('queue',{itemId:item.op},e)}
                  onMouseMoveCapture={maybePromoteOnMove}
                  onTouchMoveCapture={maybePromoteOnMove}
                  onMouseUpCapture={cancelHold}
                  onTouchEndCapture={cancelHold}>
                  <div style={{fontSize:"22px",color:"#4ade80",flexShrink:0,padding:"3px 8px",borderRadius:"4px"}} title="Hold to reorder">↕</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",color:"#4ade80",letterSpacing:"0.05em",minWidth:"60px"}}>OP {item.op}</div>
                  <div style={{flex:1,fontFamily:"'DM Sans',sans-serif",fontSize:"16px",color:"#fff"}}>{ops[item.op]?.provider||""}</div>
                  {item.ts && (<div style={{fontSize:"14px",color:"rgba(255,255,255,0.5)",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.1em"}}>{Math.floor((Date.now()-new Date(item.ts).getTime())/60000)}m</div>)}
                </div>);
              })}
            </div>
          </div>
        )}
      </div>
        {currentReadyPopup && (
          <div onMouseDown={dismissReadyPopup}
            style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.78)",backdropFilter:"blur(4px)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <div style={{padding:"60px 100px",borderRadius:"24px",background:"rgba(74,222,128,0.18)",border:"3px solid #4ade80",boxShadow:"0 0 80px rgba(74,222,128,0.6)",textAlign:"center",fontFamily:"'Bebas Neue',sans-serif",minWidth:"480px"}}>
              <div style={{fontSize:"72px",letterSpacing:"0.15em",color:"#4ade80",lineHeight:1,marginBottom:"24px"}}>READY</div>
              <div style={{fontSize:"96px",letterSpacing:"0.1em",color:"#fff",lineHeight:1,marginBottom:"32px"}}>OP {currentReadyPopup.op}</div>
              <div style={{fontSize:"22px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.55)",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>TAP TO DISMISS</div>
            </div>
          </div>
        )}
    </ScaledWrapper>
  );
}

const S={
  root:{position:"relative",width:"1340px",height:"800px",background:"#0a0a0c",backgroundImage:"radial-gradient(ellipse at 15% 0%, rgba(59,130,246,0.07) 0%, transparent 55%)",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",padding:"12px 16px 10px",gap:"8px",boxSizing:"border-box",overflow:"visible"},
  header:{display:"flex",alignItems:"center",borderBottom:"2px solid rgba(255,255,255,0.15)",paddingBottom:"10px",flexShrink:0,gap:"12px"},
  headerTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",letterSpacing:"0.12em",color:"#fff"},
  grid:{flex:1,minHeight:0,display:"grid",gap:"0"},
  col:{display:"flex",flexDirection:"column",gap:"6px",minHeight:0,padding:"0 10px",position:"relative"},
  provName:{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.12em",color:"#fff",flexShrink:0},
  provDiv:{height:"3px",background:"#fff",flexShrink:0,borderRadius:"2px",marginBottom:"2px"},
  colDiv:{position:"absolute",right:0,top:0,bottom:0,width:"2px",background:"#fff",opacity:0.85},
  roomCol:{flex:1,minHeight:0,display:"flex",flexDirection:"column",gap:"6px"},
  card:{borderRadius:"9px",padding:"8px 12px",display:"flex",flexDirection:"column",justifyContent:"center",flex:1,minHeight:0,transition:"all .25s"},
  row:{display:"flex",alignItems:"flex-start",gap:"8px",width:"100%"},
};

const css=`
  *{box-sizing:border-box;margin:0;padding:0;}
  .note-input{background:transparent;border:none;outline:none;color:rgba(255,255,255,0.7);font-family:'DM Sans',sans-serif;font-weight:700;width:100%;cursor:text;resize:none;line-height:1.3;overflow:hidden;}
  .note-input::placeholder{color:rgba(255,255,255,0.2);font-weight:400;}
  .num-btn{cursor:pointer;transition:transform .12s,opacity .12s;background:none;border:none;padding:0;}
  .num-btn:hover{opacity:.8;transform:scale(1.05);}
  .appt-btn{user-select:none;transition:all .2s;}
  .menu-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:6px;cursor:pointer;transition:background .15s;border:1px solid transparent;}
  .assign-btn{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:0.2em;padding:10px 32px;border-radius:9px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.65);cursor:pointer;}
  .assign-btn:hover{background:rgba(255,255,255,0.1);color:#fff;}
  .analytics-btn{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:0.2em;padding:10px 32px;border-radius:9px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);color:rgba(96,165,250,0.7);cursor:pointer;}
  .analytics-btn:hover{background:rgba(96,165,250,0.14);color:#60a5fa;}
  @keyframes awfaPulse{0%,100%{opacity:1;}50%{opacity:0.6;}}
  @keyframes antsMarch{to{background-position:100% 0,0 100%,0 0,100% 100%;}}
  .card-ants{background-image:repeating-linear-gradient(90deg,#fff 0,#fff 8px,transparent 8px,transparent 16px),repeating-linear-gradient(90deg,#fff 0,#fff 8px,transparent 8px,transparent 16px),repeating-linear-gradient(0deg,#fff 0,#fff 8px,transparent 8px,transparent 16px),repeating-linear-gradient(0deg,#fff 0,#fff 8px,transparent 8px,transparent 16px)!important;background-size:200% 2px,200% 2px,2px 200%,2px 200%!important;background-position:0 0,0 100%,0 0,100% 0!important;background-repeat:no-repeat!important;animation:antsMarch 0.6s linear infinite!important;border:none!important;}
`;


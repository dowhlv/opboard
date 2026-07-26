

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

function ScaledWrapper({children,designW=1340,designH=800}){
  const [box,setBox]=useState(()=>({
    w: window.innerWidth  || designW,
    h: window.innerHeight || designH
  }));
  useEffect(()=>{
    let r1=0,r2=0,t1=0,t2=0;
    const measure=()=>{
      const w=Math.round(window.innerWidth||0);
      const h=Math.round(window.innerHeight||0);
      if(w<50||h<50) return;                        // reject transient garbage
      setBox(p=>(p.w===w&&p.h===h)?p:{w,h});        // no-op if unchanged
    };
    const resync=()=>{
      measure();
      cancelAnimationFrame(r1); cancelAnimationFrame(r2);
      clearTimeout(t1); clearTimeout(t2);
      r1=requestAnimationFrame(()=>{ measure(); r2=requestAnimationFrame(measure); });
      t1=setTimeout(measure,250);
      t2=setTimeout(measure,900);
    };
    const onVis=()=>{ if(!document.hidden) resync(); };
    resync();
    window.addEventListener("resize",resync);
    window.addEventListener("orientationchange",resync);
    window.addEventListener("pageshow",resync);
    window.addEventListener("focus",resync);
    document.addEventListener("visibilitychange",onVis);
    const vv=window.visualViewport;
    if(vv){ vv.addEventListener("resize",resync); vv.addEventListener("scroll",resync); }
    return()=>{
      cancelAnimationFrame(r1); cancelAnimationFrame(r2);
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("resize",resync);
      window.removeEventListener("orientationchange",resync);
      window.removeEventListener("pageshow",resync);
      window.removeEventListener("focus",resync);
      document.removeEventListener("visibilitychange",onVis);
      if(vv){ vv.removeEventListener("resize",resync); vv.removeEventListener("scroll",resync); }
    };
  },[designW,designH]);

  const scale=Math.min(box.w/designW,box.h/designH);
  return(
    <div style={{width:box.w+"px",height:box.h+"px",overflow:"hidden",
                 background:"#0a0a0c",display:"flex",alignItems:"center",
                 justifyContent:"center"}}>
      <div data-scaled-inner style={{width:designW,height:designH,
           transform:`scale(${scale})`,transformOrigin:"center center",
           flexShrink:0}}>
        {children}
      </div>
    </div>
  );
}


const STATUSES=[{key:"ready",abbr:"Ready",numColor:"#4ade80",bg:"rgba(34,197,94,0.12)",border:"rgba(34,197,94,0.45)",glow:"0 0 20px rgba(74,222,128,0.4)"},{key:"treatment",abbr:"Reserved",numColor:"#60a5fa",bg:"rgba(59,130,246,0.12)",border:"rgba(59,130,246,0.45)",glow:"0 0 20px rgba(96,165,250,0.4)"},{key:"pending",abbr:"Awaiting FA",numColor:"#ff69b4",bg:"rgba(255,105,180,0.12)",border:"rgba(255,105,180,0.45)",glow:"0 0 20px rgba(255,105,180,0.5)"},{key:"fa",abbr:"Reviewing FA",numColor:"#facc15",bg:"rgba(234,179,8,0.10)",border:"rgba(234,179,8,0.45)",glow:"0 0 20px rgba(250,204,21,0.4)"},{key:"dirty",abbr:"Dirty",numColor:"#ff2020",bg:"rgba(255,0,0,0.15)",border:"rgba(255,0,0,0.55)",glow:"0 0 20px rgba(255,0,0,0.5)"},{key:"awaiting",abbr:"Clean",numColor:"#111114",bg:"rgba(255,255,255,0.95)",border:"rgba(255,255,255,0.95)",glow:"0 0 20px rgba(255,255,255,0.4)"},{key:"inactive",abbr:"Not In Use",numColor:"#ffffff",bg:"rgba(80,80,90,0.40)",border:"rgba(130,130,145,0.50)",glow:"none"}];
const SM=Object.fromEntries(STATUSES.map(s=>[s.key,s]));
const elapsed=d=>{if(!d)return"";const ms=typeof d==='number'?d:d instanceof Date?d.getTime():new Date(d).getTime();const s=Math.floor((Date.now()-ms)/1000);if(s<60)return"<1m";if(s<3600)return`${Math.floor(s/60)}m`;return`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;};

const DEMO={1:{status:"ready",note:"New patient",ts:new Date(Date.now()-120000),apptTypes:["NP"],provider:"Dr. Tang"},2:{status:"treatment",note:"Crown prep",ts:new Date(Date.now()-840000),apptTypes:["Tx"],provider:"Dr. Tang"},3:{status:"dirty",note:"",ts:new Date(Date.now()-300000),apptTypes:[],provider:"Dr. Tang"},4:{status:"ready",note:"X-rays done",ts:new Date(Date.now()-60000),apptTypes:["OV"],provider:"Dr. Tang"},
  5:{status:"awaiting",note:"",ts:new Date(Date.now()-150000),apptTypes:[],provider:"Dr. Tang"},6:{status:"dirty",note:"",ts:new Date(Date.now()-200000),apptTypes:[],provider:"Dr. Ngo"},7:{status:"ready",note:"",ts:new Date(Date.now()-90000),apptTypes:["OV"],provider:"Dr. Ngo"},8:{status:"treatment",note:"Implant consult",ts:new Date(Date.now()-1200000), apptTypes:["Tx"],  provider:"Dr. Ngo" },
  9:{status:"awaiting", note:"",               ts:new Date(Date.now()-180000),  apptTypes:[],  provider:"Dr. Ngo" },10:{status:"pending",note:"SRP Q2",ts:new Date(Date.now()-360000),apptTypes:["SRP"],provider:"Dr. Ngo"},11:{status:"treatment",note:"Root canal",ts:new Date(Date.now()-2100000),apptTypes:["Tx"],provider:"Jordan"},12:{status:"awaiting", note:"",               ts:new Date(Date.now()-30000),   apptTypes:["OV"],  provider:"Jordan"  },
  13:{status:"awaiting", note:"",               ts:new Date(Date.now()-90000),   apptTypes:[],  provider:"Jordan"  },14:{status:"fa",note:"Whitening",ts:new Date(Date.now()-600000),apptTypes:["LOE"],provider:"Jordan"}};
const PROVIDERS=["Dr. Tang","Dr. Ngo","Jordan"];
const PROCEDURE_LIBRARY=[
  {section:"GP", groups:[
    {label:"Exam",      items:[{code:"EXM",name:"Exam"},{code:"PRB",name:"Probe"}]},
    {label:"Direct",    items:[{code:"FIL",name:"Fill"},{code:"CUR",name:"Curodont"},{code:"SEA",name:"Sealant"},{code:"ENP",name:"Enamelplasty"},{code:"BTAD",name:"Bite Adjust"}]},
    {label:"Indirect",  items:[{code:"CRN",name:"Crown"},{code:"BR",name:"Bridge"},{code:"INL",name:"Inlay"},{code:"ONL",name:"Onlay"},{code:"IDEL",name:"Indirect Del"},{code:"TMP",name:"Temporary"},{code:"REC",name:"Recement"}]},
    {label:"Removable", items:[{code:"NGSN",name:"Nightguard Scan"},{code:"RTSN",name:"Retainer Scan"},{code:"DNSN",name:"Denture Scan"},{code:"WAX",name:"Wax Rims"},{code:"FRM",name:"Framework"},{code:"TIWT",name:"Try-in w/ Teeth"},{code:"DDEL",name:"Denture Delivery"},{code:"RDEL",name:"RPD Delivery"},{code:"NDEL",name:"NG Delivery"},{code:"ADJS",name:"Adjust"}]},
    {label:"Anesthesia", items:[{code:"ANSTH", name:"Anesthetize"}]},
  ]},
  {section:"HYG",   groups:[{label:null, items:[{code:"PRO",name:"Prophy"},{code:"POL",name:"Polish"},{code:"SRP",name:"Scaling & RP"},{code:"PMT",name:"Perio Maintenance"},{code:"ADJ",name:"Adjunct"},{code:"ARS",name:"Arrestin"}]}]},
  {section:"OS",    groups:[{label:null, items:[{code:"XBM",name:"Ext+Graft+Mem"},{code:"EXT",name:"Extraction"},{code:"BM",name:"Graft+Mem"},{code:"SUT",name:"Suture"},{code:"IMP",name:"Implant"},{code:"SEC",name:"2nd Stage"},{code:"IMSN",name:"Implant Crown Scan"}]}]},
  {section:"Endo",  groups:[{label:null, items:[{code:"PDEB",name:"Pulp Debride"}]}]},
  {section:"Ortho", groups:[{label:null, items:[{code:"SPK",name:"Spark Consult"},{code:"ATT",name:"Spark Attachment"},{code:"ALI",name:"Aligner Delivery"}]}]},
  {section:"X-Ray", groups:[{label:null, items:[{code:"XRY",name:"X-Ray"},{code:"CT",name:"CBCT"},{code:"BW",name:"Bitewing"},{code:"PA",name:"Periapical"},{code:"IOP",name:"Intra-oral Photos"}]}]},
];
const INIT_ALL_OPS = Object.keys(DEMO).map(Number).map(id=>({id,enabled:true}));
// 10-minute "stuck" reminder configuration, used by both the periodic check
// effect and the inline reminder-dismiss onClick. Must be module-scope so both
// callsites resolve to the same binding.
const REMINDER_STATUSES = ['pending']; // FD only reminders for AWFA
const REMINDER_MS = 10 * 60 * 1000;

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

// ── ModalMenu — appt-type multi-select (ported from Master) ─────────────────
function ModalMenu({op, ops, onClose, onSetApptType, statuses, apptTypes}){
  const SM=Object.fromEntries(statuses.map(s=>[s.key,s]));
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
        {apptTypes.map(t=>{
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

// ── Floating menu — position computed from card's offsetTop in design space ──

// Queue Item — hold-to-drag for reorder. Drag visuals (transform, snap-back)
// are driven by the parent's `drag` state.
function QueueItem({item,ops,drag,shift,primeDrag,cancelHold,maybePromoteOnMove}){
  const{op,type}=item;
  const cfg=type==="awfa"?SM.pending:SM.ready;
  const isQDragged = drag?.kind==='queue' && drag.itemId===item.id;
  const qtx = isQDragged ? (drag.pointerX - drag.startX) / drag.scale : 0;
  const qty = isQDragged ? (drag.pointerY - drag.startY) / drag.scale : 0;
  return(
    <div data-queue-item-id={item.id}
      style={{position:"relative",borderRadius:"10px",border:`2px solid ${cfg.numColor}`,background:cfg.bg,marginBottom:"8px",userSelect:"none",
        transform: isQDragged ? `translate(${qtx}px, ${qty}px)` : (shift || "none"),
        transition: isQDragged ? "none" : "transform .2s",
        boxShadow: isQDragged ? "0 12px 32px rgba(0,0,0,0.6)" : "none",
        zIndex: isQDragged ? 1000 : "auto",
        // While dragging, ignore pointer hits on the dragged item so
        // elementFromPoint can resolve to the item underneath.
        pointerEvents: isQDragged ? "none" : "auto",
        touchAction: "none"}}
      onMouseDownCapture={e=>primeDrag('queue',{itemId:item.id},e)}
      onTouchStartCapture={e=>primeDrag('queue',{itemId:item.id},e)}
      onMouseMoveCapture={maybePromoteOnMove}
      onTouchMoveCapture={maybePromoteOnMove}
      onMouseUpCapture={cancelHold}
      onTouchEndCapture={cancelHold}>
      <div style={{display:"flex",alignItems:"center",padding:"10px 16px",gap:"12px"}}>
        <div style={{fontSize:"18px",color:cfg.numColor,flexShrink:0,padding:"3px 5px",borderRadius:"4px"}} title="Hold to reorder">↕</div>
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

// ── Procedure Checklist — green row = pending, red row = done; tap to toggle ──
function ProcedureChecklist({ procs, onChange, onLogCustom }){
  const [pickerOpen,setPickerOpen]=useState(false);
  const [customVal,setCustomVal]=useState("");
  const has=code=>procs.some(p=>p.code===code);
  // Toggle/remove by code (stable identity) — the rows render in sorted order so
  // the sorted index no longer matches the original procs index.
  const toggleDone=code=>onChange(procs.map(p=>p.code===code?{...p,done:!p.done,doneAt:!p.done?Date.now():null}:p));
  const addProc=(code,name)=>{ if(has(code))return; onChange([...procs,{code,name,done:false,doneAt:null}]); };
  // Freeform ("Other") addition: code is the uppercased name. Only this path
  // reports to the custom-procedure tally — preset library buttons never do.
  const submitCustom=()=>{
    const name=customVal.trim();
    if(!name){ setCustomVal(""); return; }
    const code=name.toUpperCase().replace(/\s+/g,'').slice(0,4);
    if(!has(code)){ addProc(code,name); if(onLogCustom) onLogCustom(name); }
    setCustomVal("");
  };
  return(
    <div style={{marginBottom:"14px"}}>
      {procs.length>0 && (
        <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"10px"}}>
          {/* Order is frozen at open time (procs is seeded already-sorted); we
              intentionally do NOT re-sort on every render so rows don't jump
              while the user toggles done/pending. Re-sorts on next open. */}
          {procs.map(p=>(
            <div key={p.code} onClick={e=>{e.stopPropagation();toggleDone(p.code);}}
              style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",cursor:"pointer",textAlign:"left",
                background:p.done?"rgba(255,80,80,0.18)":"rgba(74,222,128,0.18)",
                border:`2px solid ${p.done?"rgba(255,80,80,0.55)":"rgba(74,222,128,0.55)"}`,
                fontFamily:"'DM Sans',sans-serif"}}>
              <span style={{fontWeight:800,fontSize:"13px",letterSpacing:"0.04em",color:p.done?"#ff6b6b":"#4ade80",minWidth:"46px"}}>{p.code}</span>
              <span style={{flex:1,fontSize:"14px",fontWeight:600,color:"rgba(255,255,255,0.85)"}}>{p.name}</span>
              <span style={{fontSize:"10px",fontWeight:800,letterSpacing:"0.1em",color:p.done?"#ff6b6b":"#4ade80"}}>{p.done?"DONE":"PENDING"}</span>
              <button type="button"
                onMouseDown={e=>{e.stopPropagation();onChange(procs.filter(x=>x.code!==p.code));}}
                onMouseEnter={e=>e.currentTarget.style.color="rgba(255,100,100,0.8)"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}
                style={{fontSize:"16px",color:"rgba(255,255,255,0.3)",background:"none",border:"none",cursor:"pointer",padding:"0 4px"}}>✕</button>
            </div>
          ))}
        </div>
      )}
      {!pickerOpen ? (
        <button onMouseDown={e=>{e.stopPropagation();setPickerOpen(true);}}
          style={{width:"100%",padding:"10px",background:"rgba(96,165,250,0.10)",border:"1px solid rgba(96,165,250,0.35)",borderRadius:"9px",
            color:"#60a5fa",fontFamily:"'Bebas Neue',sans-serif",fontSize:"15px",letterSpacing:"0.12em",cursor:"pointer"}}>
          + Add procedure
        </button>
      ) : (
        <div style={{border:"1px solid rgba(255,255,255,0.12)",borderRadius:"10px",padding:"12px",background:"rgba(255,255,255,0.03)",maxHeight:"40vh",overflowY:"auto"}}>
          {PROCEDURE_LIBRARY.map((sec,si)=>(
            <div key={sec.section} style={{marginBottom:"10px"}}>
              {si>0 && <div style={{height:"1px",background:"rgba(255,255,255,0.12)",margin:"12px 0 10px"}}/>}
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",letterSpacing:"0.18em",color:"rgba(255,255,255,0.55)",marginBottom:"6px"}}>{sec.section}</div>
              {sec.groups.map((g,gi)=>(
                <div key={gi} style={{marginBottom:g.label?"8px":"4px"}}>
                  {g.label && <div style={{fontSize:"10px",letterSpacing:"0.16em",color:"rgba(255,255,255,0.4)",fontWeight:600,marginBottom:"4px"}}>{g.label.toUpperCase()}</div>}
                  <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                    {g.items.map(it=>{
                      const added=has(it.code);
                      return(
                        <button key={it.code} disabled={added}
                          onMouseDown={e=>{e.stopPropagation(); if(!added) addProc(it.code,it.name);}}
                          style={{display:"flex",flexDirection:"column",alignItems:"flex-start",
                            padding:"5px 8px",borderRadius:"6px",
                            background:added?"rgba(255,255,255,0.03)":"rgba(74,222,128,0.10)",
                            border:`1px solid ${added?"rgba(255,255,255,0.08)":"rgba(74,222,128,0.35)"}`,
                            cursor:added?"default":"pointer",opacity:added?0.4:1,
                            fontFamily:"'DM Sans',sans-serif"}}>
                          <span style={{fontWeight:800,fontSize:"11px",letterSpacing:"0.04em",color:added?"rgba(255,255,255,0.4)":"#4ade80"}}>{it.code}</span>
                          <span style={{fontSize:"10px",color:added?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.75)",fontWeight:600}}>{it.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {/* Freeform "Other" — type a custom procedure not in the library.
              This is the ONLY add path that reports to the custom-procedure tally. */}
          <div style={{height:"1px",background:"rgba(255,255,255,0.12)",margin:"12px 0 10px"}}/>
          <div style={{fontSize:"10px",letterSpacing:"0.16em",color:"rgba(255,255,255,0.4)",fontWeight:600,marginBottom:"4px"}}>OTHER</div>
          <div style={{display:"flex",gap:"6px"}}>
            <input value={customVal} onChange={e=>setCustomVal(e.target.value)}
              onMouseDown={e=>e.stopPropagation()}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();submitCustom();}}}
              placeholder="Custom procedure…"
              style={{flex:1,padding:"8px 10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",outline:"none"}}/>
            <button onMouseDown={e=>{e.stopPropagation();submitCustom();}}
              style={{padding:"8px 14px",background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.35)",borderRadius:"8px",color:"#4ade80",fontFamily:"'Bebas Neue',sans-serif",fontSize:"14px",letterSpacing:"0.1em",cursor:"pointer"}}>+ ADD</button>
          </div>
          <button onMouseDown={e=>{e.stopPropagation();setPickerOpen(false);}}
            style={{width:"100%",padding:"8px",marginTop:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",
              color:"rgba(255,255,255,0.6)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"13px",letterSpacing:"0.1em",cursor:"pointer"}}>
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}

function FrontDeskTablet(){
  const[ops,setOps]=useState({});
  const [allOpsState, setAllOpsState] = useState([]);
  const [activeProviders, setActiveProviders] = useState(PROVIDERS);
  const[antsOps,setAntsOps]=useState(new Set());
  const[queueOrder,setQueueOrder]=useState([]);
  const[providerOpOrder,setProviderOpOrder]=useState({});
  const[showQueue,setShowQueue]=useState(false);
  // Unified drag (kind: 'reassign' moves an op to another provider column,
  // 'reorder' reorders ops within one provider column, 'queue' for queue overlay).
  const [drag,setDrag]=useState(null);
  const [dragOverCol,setDragOverCol]=useState(null);
  const [dragOverId,setDragOverId]=useState(null);
  const [confirmDragMove,setConfirmDragMove]=useState(null);
  const dragRef=useRef(null);
  const dragOverColRef=useRef(null);
  const dragOverIdRef=useRef(null);
  const holdTimerRef=useRef(null);
  // Reorder committed-order system: during a reorder drag, reorderOrder holds the
  // current working order of ops in the source column. It starts as a copy of the
  // display order and only changes when the dragged card's center crosses an
  // adjacent card's midpoint (see onMove), giving stable, bounce-free slots.
  // reorderOrderRef mirrors it for synchronous reads in the window handlers;
  // reorderSlotsRef holds the fixed slot-center Ys captured at drag start;
  // reorderStartCenterRef is the dragged card's center at drag start;
  // reorderOriginalRef is the untouched starting order (to detect changes on drop).
  const [reorderOrder,setReorderOrder]=useState(null);
  const reorderOrderRef=useRef(null);
  const reorderOriginalRef=useRef(null);
  const reorderSlotsRef=useRef(null);
  const reorderStartCenterRef=useRef(null);
  // AWFA queue reorder: same committed-order geometry model as the column
  // reorder above, but for the Awaiting-FA queue modal rows. queueDragOrder is
  // the live slide preview; the refs mirror reorder* for synchronous reads on drop.
  const [queueDragOrder,setQueueDragOrder]=useState(null);
  const queueOrderRef=useRef(null);
  const queueOriginalRef=useRef(null);
  const queueSlotsRef=useRef(null);
  const queueStartCenterRef=useRef(null);
  useEffect(()=>{dragRef.current=drag;},[drag]);
  useEffect(()=>{dragOverColRef.current=dragOverCol;},[dragOverCol]);
  useEffect(()=>{dragOverIdRef.current=dragOverId;},[dragOverId]);
  const[,setTick]=useState(0);
  const[noteEdit,setNoteEdit]=useState(null);
  const fdNoteTimeoutRef=useRef(null);
  const resetFDNoteTimeout=(op)=>{
    clearTimeout(fdNoteTimeoutRef.current);
    fdNoteTimeoutRef.current=setTimeout(()=>{
      // Auto-close without saving — original note in ops state is unchanged.
      // Emit unlock for THIS op only; a no-op broadcast would erroneously clear lock
      // indicators other clients hold for unrelated ops.
      emitSocket('noteUnlock',{op});
      setNoteEdit(null);
    },30000);
  };
  const[menu,setMenu]=useState(null);
  const[toast,setToast]=useState(null);
  const[customAbbrevs,setCustomAbbrevs]=useState([]);
  const[noteLocked,setNoteLocked]=useState(null);
  const[showHistory,setShowHistory]=useState(false);
  const[reminder,setReminder]=useState(null);
  const[dismissedReminders,setDismissedReminders]=useState(new Set()); // {op-status-ts} keys
  const[awfaPopupDismissed,setAwfaPopupDismissed]=useState({}); // hydrated from server broadcast; mirrors readyPopupDismissed semantics
  const[popupTick,setPopupTick]=useState(0);
  const soundTimer=useRef(null);
  // Suppress the AWFA chime on the first state broadcast — refreshing the FD
  // tablet while ops are already AWFA shouldn't fire an alarm. Seed prevLen from
  // the initial snapshot so the subsequent chime effect sees no growth.
  const firstStateProcessedRef=useRef(false);
  const toastRef=useRef(null);

  const showToast=msg=>{setToast(msg);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),2000);};

  const emitSocket=(event,data)=>{ try{ if(typeof socket!=='undefined') socket.emit(event,data); }catch(e){console.error("FD emit failed:",e);} };
  const updateProcedures=(op,procedures)=>{setOps(p=>({...p,[op]:{...p[op],procedures}}));emitSocket('setProcedures',{op,procedures});};

  // ── Socket.io — receive state from server ────────────────────────────────
  useEffect(()=>{
    if(typeof socket==='undefined') return;
    const onState=state=>{
      if(state.version){
        if(CLIENT_VERSION===null) CLIENT_VERSION=state.version;
        else if(state.version!==CLIENT_VERSION){ location.reload(); return; }
      }
      if(state.allOps) setAllOpsState(state.allOps);
      if(state.customAbbrevs) setCustomAbbrevs(state.customAbbrevs);
      if(state.activeProviders) setActiveProviders(state.activeProviders);
      if(Array.isArray(state.queueOrder)) setQueueOrder(state.queueOrder);
      if(state.providerOpOrder) setProviderOpOrder(state.providerOpOrder);
      if(state.awfaPopupDismissed) setAwfaPopupDismissed(state.awfaPopupDismissed);
      if(state.ops) setOps(prev=>{        const merged={...prev};
        Object.keys(state.ops).forEach(k=>{
          merged[k]={...state.ops[k],ts:state.ops[k].ts?new Date(state.ops[k].ts):null,noteUpdatedAt:state.ops[k].noteUpdatedAt||null};
        });
        return merged;
      });
      // Fix 5: seed prevLen from first state so refresh-with-AWFA doesn't chime
      if(!firstStateProcessedRef.current && state.allOps && state.ops){
        firstStateProcessedRef.current=true;
        const enabledIds=state.allOps.filter(o=>o.enabled).map(o=>o.id);
        const initialAwfaCount=enabledIds.filter(op=>state.ops[op]?.provider && state.ops[op]?.status==='pending').length;
        prevLen.current=initialAwfaCount;
      }
      setLastUpdated(new Date());
    };
    socket.on('noteLock',({op,by})=>setNoteLocked({op,by}));
    socket.on('noteUnlock',({op}={})=>setNoteLocked(prev=>(prev && (op===null||op===undefined||prev.op===op))?null:prev));
    socket.on('state',onState);
    socket.emit('requestState');
    socket.on('connect',()=>{setIsOnline(true);setLastUpdated(new Date());});
    socket.on('disconnect',()=>{setIsOnline(false);setLastDisconnected(new Date());});
    const onUnload=()=>socket.emit('noteUnlock',{op:null});
    window.addEventListener('beforeunload',onUnload);
    return()=>{socket.off('state',onState);socket.off('noteLock');socket.off('noteUnlock');socket.off('connect');socket.off('disconnect');window.removeEventListener('beforeunload',onUnload);};
  },[]);
  const APPT_TYPES=["NP","CCX","Tx","LOE","Delivery","Office Visit","Prophy","PMT","SRP"];
const APPT_ABBR_MAP={"NP":"NP","CCX":"CCX","Tx":"TX","LOE":"LOE","Delivery":"DEL","Office Visit":"OV","Prophy":"PRO","PMT":"PMT","SRP":"SRP"};
const APPT_PREPOPULATE = {
  "NP":           [{code:"EXM",name:"Exam"},{code:"XRY",name:"X-Ray"},{code:"PRB",name:"Probe"}],
  "CCX":          [{code:"EXM",name:"Exam"},{code:"XRY",name:"X-Ray"},{code:"PRB",name:"Probe"}],
  "Tx":           [],
  "LOE":          [{code:"EXM",name:"Exam"},{code:"CT",name:"CBCT"},{code:"BW",name:"Bitewing"},{code:"PA",name:"Periapical"}],
  "Delivery":     [],
  "Office Visit": [{code:"EXM",name:"Exam"}],
  "Prophy":       [{code:"PRO",name:"Prophy"},{code:"POL",name:"Polish"}],
  "PMT":          [{code:"PMT",name:"Perio Maintenance"},{code:"POL",name:"Polish"}],
  "SRP":          [{code:"SRP",name:"Scaling & RP"},{code:"POL",name:"Polish"},{code:"ADJ",name:"Adjunct"}],
};
function prepopulateFromApptTypes(apptTypes){
  const out=[]; const seen=new Set();
  (apptTypes||[]).forEach(t=>(APPT_PREPOPULATE[t]||[]).forEach(p=>{if(!seen.has(p.code)){seen.add(p.code);out.push({code:p.code,name:p.name,done:false,doneAt:null,auto:true});}}));
  return out;
}
function applySaveTriggers(procs,openProcs){
  const out=(procs||[]).map(p=>({...p}));
  const has=c=>out.some(p=>p.code===c);
  // M8: only auto-add the X-rays when IMP/SEC was NEWLY added this session (not
  // present when the modal opened). Otherwise a user could never remove an
  // auto-added X-ray — it would reappear on every save while IMP/SEC stays.
  const hadAtOpen=c=>(openProcs||[]).some(p=>p.code===c);
  if(has("IMP")&&!hadAtOpen("IMP")) [["CT","CBCT"],["BW","Bitewing"],["PA","Periapical"]].forEach(([c,n])=>{if(!has(c))out.push({code:c,name:n,done:false,doneAt:null});});
  if(has("SEC")&&!hadAtOpen("SEC")) [["CT","CBCT"],["BW","Bitewing"]].forEach(([c,n])=>{if(!has(c))out.push({code:c,name:n,done:false,doneAt:null});});
  return out;
}
// Sort procedures for display/save: pending (done=false) first in their existing
// order, then completed (done=true) at the bottom ordered by completion time
// (oldest first). Array.prototype.sort is stable, so pending order is preserved.
function sortProcedures(procs){
  if(!Array.isArray(procs)) return [];
  return [...procs].sort((a,b)=>{
    if(!a.done && b.done) return -1;
    if(a.done && !b.done) return 1;
    if(a.done && b.done) return (a.doneAt||0)-(b.doneAt||0);
    return 0;
  });
}
  const CLEAR_ON_STATUS=["awaiting","inactive"];
  const setStatus=(op,key)=>{
    const statusLabel=STATUSES.find(s=>s.key===key)?.abbr||key;
    setOps(p=>{
      const prev=p[op];
      const shouldClear=CLEAR_ON_STATUS.includes(key);
      return {...p,[op]:{...prev,status:key,ts:new Date(),
        note:shouldClear?"":prev.note,
        apptTypes:shouldClear?[]:prev.apptTypes,
        procedures:shouldClear?[]:prev.procedures,
        needsCheckout:shouldClear?false:prev.needsCheckout,
      }};
    });
    showToast(`✓ Op ${op} → ${statusLabel}`);
    // Server-side setStatus clears note + apptTypes for awaiting/inactive, so no extra emits.
    emitSocket('setStatus',{op,status:key});
    setMenu(null);
  };
  const setApptType=(op,t)=>{
    const nt=Array.isArray(t)?t:[];
    const oldTypes=ops[op]?.apptTypes||[];
    setOps(p=>({...p,[op]:{...p[op],apptTypes:nt}}));
    emitSocket('setApptType',{op,apptTypes:nt});
    // M9: merge in prepopulate procedures for any NEWLY ADDED appt type (deduped
    // by code). Auto-populated pills carry auto:true (see prepopulateFromApptTypes)
    // so the deselect-prune below can distinguish them from manual pills.
    const added=nt.filter(x=>!oldTypes.includes(x));
    const removed=oldTypes.filter(x=>!nt.includes(x));
    const cur=ops[op]?.procedures||[];
    let next=[...cur]; let changed=false;
    if(added.length>0){
      const have=new Set(next.map(p=>p.code));
      prepopulateFromApptTypes(added).forEach(p=>{if(!have.has(p.code)){have.add(p.code);next.push(p);changed=true;}});
    }
    // Deselect-prune: dropping an appt type removes the pills it auto-populated,
    // UNLESS the pill is manual (!auto — also covers legacy pills with no auto
    // field), completed (done), or its code is still provided by a currently-
    // selected appt type.
    if(removed.length>0){
      const stillProvided=new Set(prepopulateFromApptTypes(nt).map(p=>p.code));
      const pruned=next.filter(p=>(!p.auto)||p.done||stillProvided.has(p.code));
      if(pruned.length!==next.length){next=pruned;changed=true;}
    }
    if(changed) updateProcedures(op,next);
    // No toast on individual toggle — keep menu open for multi-select; DONE button closes.
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
  const ALL_OPS=allOpsState.filter(o=>o.enabled).map(o=>o.id);
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


  // Active popup = first AWFA op
  const activePopup=popups[0]||null;
  // Tick every 30s to re-evaluate popup queue (5min reappear logic)
  useEffect(()=>{const id=setInterval(()=>setPopupTick(t=>t+1),30000);return()=>clearInterval(id);},[]);
  // AWFA popup modal queue: popups not dismissed within last 5 min
  const awfaPopupQueue=popups.filter(p=>{
    const d=awfaPopupDismissed[p.op];
    return !d||(Date.now()-d>=5*60*1000);
  });
  // eslint-disable-next-line no-unused-vars
  const _popupTickDep=popupTick;
  const currentAwfaPopup=awfaPopupQueue[0]||null;
  const dismissAwfaPopup=()=>{
    if(!currentAwfaPopup)return;
    emitSocket('dismissAwfaPopup',{op:currentAwfaPopup.op});
  };
  // Clear server-side dismissal when an op leaves AWFA status (fresh popup on re-entry).
  // Use a stable string dep so this fires only when the AWFA set changes, not every render.
  const awfaOpsKey = awfaOps.join('-');
  useEffect(()=>{
    Object.keys(awfaPopupDismissed).forEach(op=>{
      if(ops[op]?.status!=='pending'){
        emitSocket('clearAwfaPopupDismissed',{op:Number(op)});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[awfaOpsKey]);

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
    // Reorder: capture the source column's order and fixed slot-center Ys now,
    // while the cards are still in their pre-drag (un-transformed) positions.
    if (p.kind === 'reorder') {
      let col = null;
      document.querySelectorAll('[data-provider-col]').forEach(c => {
        if (c.getAttribute('data-provider-col') === p.payload.sourceProvider) col = c;
      });
      const cards = col ? Array.from(col.querySelectorAll('[data-op]')) : [];
      const order = cards.map(el => Number(el.getAttribute('data-op')));
      const centers = cards.map(el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; });
      const k0 = order.indexOf(p.payload.op);
      reorderOriginalRef.current = order.slice();
      reorderOrderRef.current = order.slice();
      reorderSlotsRef.current = centers;
      reorderStartCenterRef.current = k0 >= 0 ? centers[k0] : p.startY;
      setReorderOrder(order.slice());
    }
    // Queue: capture the AWFA queue rows' order + fixed slot-center Ys now, while
    // they're still in their pre-drag positions (parallels the reorder block).
    if (p.kind === 'queue') {
      const rows = Array.from(document.querySelectorAll('[data-queue-item-id]'));
      const order = rows.map(el => Number(el.getAttribute('data-queue-item-id')));
      const centers = rows.map(el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; });
      const k0 = order.indexOf(p.payload.itemId);
      queueOriginalRef.current = order.slice();
      queueOrderRef.current = order.slice();
      queueSlotsRef.current = centers;
      queueStartCenterRef.current = k0 >= 0 ? centers[k0] : p.startY;
      setQueueDragOrder(order.slice());
    }
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
  const maybePromoteOnMove = (e) => {
    const p = primedRef.current;
    if (!p || dragRef.current) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - p.startX;
    const dy = t.clientY - p.startY;
    if (Math.hypot(dx, dy) >= MOVE_PROMOTE_PX) promoteToDrag();
  };
  const consumeDragSuppressedClick = (e) => {
    if (dragPromotedRef.current) {
      dragPromotedRef.current = false;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      return true;
    }
    return false;
  };
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
      } else if (cur.kind === 'reorder') {
        // Reorder within a single provider column via a committed midpoint
        // threshold. The dragged card's center is its start center plus the
        // pointer delta; when it crosses the center (midpoint) of the adjacent
        // card in the committed order, swap the two. Slot centers are fixed, so
        // committed positions only change on a real crossing — no bounce.
        const committed = reorderOrderRef.current;
        const slots = reorderSlotsRef.current;
        if (committed && slots && slots.length) {
          const draggedCenterY = reorderStartCenterRef.current + (y - cur.startY);
          let k = committed.indexOf(cur.op);
          let changed = false;
          while (k > 0 && draggedCenterY < slots[k - 1]) {
            const tmp = committed[k - 1]; committed[k - 1] = committed[k]; committed[k] = tmp;
            k--; changed = true;
          }
          while (k < committed.length - 1 && draggedCenterY > slots[k + 1]) {
            const tmp = committed[k + 1]; committed[k + 1] = committed[k]; committed[k] = tmp;
            k++; changed = true;
          }
          if (changed) setReorderOrder(committed.slice());
        }
      } else if (cur.kind === 'queue') {
        // Same committed-midpoint model as 'reorder' above, applied to the AWFA
        // queue rows: the dragged row's center (start center + pointer delta)
        // swaps past adjacent rows' fixed centers. queueDragOrder drives the live
        // slide preview; queueOrderRef is read on drop. No elementFromPoint.
        const committed = queueOrderRef.current;
        const slots = queueSlotsRef.current;
        if (committed && slots && slots.length) {
          const draggedCenterY = queueStartCenterRef.current + (y - cur.startY);
          let k = committed.indexOf(cur.itemId);
          let changed = false;
          while (k > 0 && draggedCenterY < slots[k - 1]) {
            const tmp = committed[k - 1]; committed[k - 1] = committed[k]; committed[k] = tmp;
            k--; changed = true;
          }
          while (k < committed.length - 1 && draggedCenterY > slots[k + 1]) {
            const tmp = committed[k + 1]; committed[k + 1] = committed[k]; committed[k] = tmp;
            k++; changed = true;
          }
          if (changed) setQueueDragOrder(committed.slice());
        }
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
        } else if (cur.kind === 'reorder') {
          // Drop: persist the final committed order. If it matches the order at
          // drag start (a drag that committed nothing), leave state untouched so
          // the column simply restores to its original order. No confirmation popup.
          const committed = reorderOrderRef.current;
          const original = reorderOriginalRef.current;
          if (committed && original && committed.join(',') !== original.join(',')) {
            const arr = committed.slice();
            setProviderOpOrder(prev => ({ ...prev, [cur.sourceProvider]: arr }));
            emitSocket('setProviderOpOrder', { provider: cur.sourceProvider, order: arr });
          }
        } else if (cur.kind === 'queue') {
          // Drop: persist the final committed order if it changed (mirrors the
          // 'reorder' commit). Unconditional save + emit so it never snaps back.
          const committed = queueOrderRef.current;
          const original = queueOriginalRef.current;
          if (committed && original && committed.join(',') !== original.join(',')) {
            const arr = committed.slice();
            setQueueOrder(arr);
            emitSocket('setQueueOrder', { order: arr });
          }
        }
      }
      setDrag(null);
      setDragOverCol(null);
      setDragOverId(null);
      reorderOrderRef.current = null;
      reorderOriginalRef.current = null;
      reorderSlotsRef.current = null;
      reorderStartCenterRef.current = null;
      setReorderOrder(null);
      queueOrderRef.current = null;
      queueOriginalRef.current = null;
      queueSlotsRef.current = null;
      queueStartCenterRef.current = null;
      setQueueDragOrder(null);
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

  const[isOnline,setIsOnline]=useState(true);
  const[lastUpdated,setLastUpdated]=useState(new Date());
  const[lastDisconnected,setLastDisconnected]=useState(null);

  // 10-min reminder — check every 30s for AWFA ops stuck > 10 min.
  // Chime only fires when the active stuck set grows (transition), not on every tick.
  const prevStuckKeysRef = useRef(new Set());
  useEffect(()=>{
    const check = () => {
      const now = Date.now();
      const stuckOps = ALL_OPS.filter(op => {
        const d = ops[op];
        if(!d || !REMINDER_STATUSES.includes(d.status)) return false;
        const key = `${op}-${d.status}-${d.ts}`;
        if(dismissedReminders.has(key)) return false;
        return d.ts && (now - new Date(d.ts).getTime()) > REMINDER_MS;
      });
      const stuckKeys = new Set(stuckOps.map(op=>{const d=ops[op];return `${op}-${d.status}-${d.ts}`;}));
      const grew = [...stuckKeys].some(k=>!prevStuckKeysRef.current.has(k));
      prevStuckKeysRef.current = stuckKeys;
      if(stuckOps.length > 0) {
        const first = stuckOps[0];
        const d = ops[first];
        setReminder({op:first, status:d.status, ts:d.ts, count:stuckOps.length});
        if(grew) playChimeFD("#ff69b4");
      } else {
        setReminder(null);
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  },[ops, dismissedReminders]);

  // Prune dismissedReminders entries that no longer match a current op state.
  // Keys are produced as `${op}-${status}-${ts}`; we regenerate the live set of
  // valid keys from current ops and keep only the intersection.
  useEffect(()=>{
    const liveKeys = new Set(
      Object.keys(ops).map(op=>{const d=ops[op]; return `${op}-${d?.status}-${d?.ts}`;})
    );
    setDismissedReminders(prev=>{
      let changed=false;
      const next=new Set();
      prev.forEach(key=>{ if(liveKeys.has(key)) next.add(key); else changed=true; });
      return changed ? next : prev;
    });
  },[ops]);

  // Per-provider op order: use the custom providerOpOrder when one exists for
  // the provider, falling back to op-number order (same indexOf-with-fallback
  // pattern as queueOrder above). Ops absent from a custom order sort by number.
  const orderRooms=(arr,prov)=>{
    const custom=providerOpOrder?.[prov];
    return arr.slice().sort((a,b)=>{
      const ai=custom?custom.indexOf(a):-1, bi=custom?custom.indexOf(b):-1;
      if(ai>=0&&bi>=0)return ai-bi;
      if(ai>=0)return -1;
      if(bi>=0)return 1;
      return a-b;
    });
  };
  const providerCols=activeProviders.map(p=>({name:p,rooms:orderRooms(ALL_OPS.filter(op=>ops[op]?.provider===p),p)}));
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
          <img src="/dentists-logo.webp" alt="Dentists of West Henderson" height="36" style={{display:"block",flexShrink:0}}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={S.headerTitle}>OP BOARD</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",letterSpacing:"0.18em",color:"rgba(255,255,255,0.3)",fontWeight:600,marginTop:"2px"}}>FRONT DESK</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
            <div style={{width:"9px",height:"9px",borderRadius:"50%",background:isOnline?"#4ade80":"#ef4444",boxShadow:isOnline?"0 0 6px #4ade80":"0 0 6px #ef4444"}}/>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:600,letterSpacing:"0.05em",color:"rgba(255,255,255,0.75)",textAlign:"right"}}>
              {fmtDate(now)}<span style={{display:"inline-block",width:"28px"}}></span>{fmtTime(now)}
            </div>
          </div>
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
            {popups.length > 1 && (
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',
                color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',flexShrink:0}}>
                +{popups.length - 1} MORE
              </div>
            )}
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

        <div style={{...S.grid,gridTemplateColumns:`repeat(${n},1fr)`}}>
          {providerCols.map(({name,rooms},ci)=>{
            const numSz=`clamp(75px,${16.25/n}vw,200px)`;
            const bdgSz=`clamp(18px,${3.02/n}vw,45px)`;
            const notSz=`clamp(36px,${5.4/n}vw,66px)`;
            const timSz=`clamp(11px,${1.38/n}vw,17.5px)`;
            const namSz=`clamp(22px,${4.5/n}vw,58px)`;
            const apptW=`calc(${bdgSz} * 1.75)`;
            const isValidTarget = drag?.kind==='reassign' && dragOverCol===name && drag.sourceProvider!==name;
            const provCol = '#fff'; // FD doesn't render per-provider colors elsewhere; neutral highlight.
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
                    const{status,note,ts,apptTypes=[],procedures=[],needsCheckout}=ops[op]||{};
                    const cfg=SM[status]||SM.awaiting;
                    const isInactive=status==="inactive";
                    const cardAnim=(status==="ready"||status==="pending")&&!isInactive?"slowPulse 2.5s ease-in-out infinite":"none";
                    const isOpen=menu?.op===op&&menu?.type==="status";
                    const apptOpen=menu?.op===op&&menu?.type==="appt";
                    const isReorderDragged = drag?.kind==='reorder' && drag.op===op;
                    const isDragged = (drag?.kind==='reassign' && drag.op===op) || isReorderDragged;
                    // Reorder slide: each non-dragged card sits in its committed
                    // slot (reorderOrder, maintained by the midpoint system in
                    // onMove). The committed order differs from the display order
                    // by a single moved card, so every other card is displaced by
                    // at most one slot — translateY ±100% of its own height. The
                    // existing "transform .2s" transition animates the slide.
                    // isReorderTarget keeps the drop-gap highlight on the card
                    // directly below the dragged card in the committed order.
                    let reorderShift = "";
                    let isReorderTarget = false;
                    if (drag?.kind==='reorder' && reorderOrder && !isReorderDragged) {
                      const j = reorderOrder.indexOf(op);
                      const i = rooms.indexOf(op);
                      if (j>=0 && i>=0) {
                        if (j < i) reorderShift = "translateY(-100%)";
                        else if (j > i) reorderShift = "translateY(100%)";
                      }
                      const kd = reorderOrder.indexOf(drag.op);
                      if (kd>=0 && reorderOrder[kd+1]===op) isReorderTarget = true;
                    }
                    const tx = isDragged ? (drag.pointerX - drag.startX) / drag.scale : 0;
                    const ty = isDragged ? (drag.pointerY - drag.startY) / drag.scale : 0;
                    return(
                      <div key={op} data-op={op} className={antsOps.has(op)?"card-ants":""}
                        style={{...S.card,background:cfg.bg,
                          border:antsOps.has(op)?"none":`2px solid ${isOpen||apptOpen?cfg.numColor:cfg.border}`,
                          animation:cardAnim,opacity:isInactive?0.4:1,position:"relative",
                          padding:0,overflow:"hidden",display:"flex",flexDirection:"row",alignItems:"stretch",
                          transform: isDragged ? `translate(${tx}px, ${ty}px)` : reorderShift || "none",
                          transition: isDragged ? "none" : "transform .2s",
                          boxShadow: isDragged ? "0 12px 32px rgba(0,0,0,0.6)" : isReorderTarget ? "0 -5px 0 0 #4ade80, 0 0 14px rgba(74,222,128,0.45)" : undefined,
                          // While reorder-dragging, ignore pointer hits on the dragged
                          // card so elementFromPoint resolves to the card underneath.
                          pointerEvents: isReorderDragged ? "none" : undefined,
                          zIndex: isDragged ? 1000 : "auto"}}
                        onMouseDownCapture={e=>{ if(!isInactive) primeDrag('reassign', { op, sourceProvider: name }, e); }}
                        onTouchStartCapture={e=>{ if(!isInactive) primeDrag('reassign', { op, sourceProvider: name }, e); }}
                        onMouseMoveCapture={maybePromoteOnMove}
                        onTouchMoveCapture={maybePromoteOnMove}
                        onMouseUpCapture={cancelHold}
                        onTouchEndCapture={cancelHold}
                        onMouseDown={()=>setMenu(null)}>

                        {/* Grip handle (top-right) — drag from here to reorder
                            this op within its provider column. Its bubble-phase
                            mousedown re-primes the gesture as 'reorder', overriding
                            the card's capture-phase 'reassign' prime. */}
                        {!isInactive&&(
                          <div
                            onMouseDown={e=>{e.stopPropagation();primeDrag('reorder',{op,sourceProvider:name},e);promoteToDrag();}}
                            onTouchStart={e=>{e.stopPropagation();primeDrag('reorder',{op,sourceProvider:name},e);promoteToDrag();}}
                            onMouseMoveCapture={maybePromoteOnMove}
                            onTouchMoveCapture={maybePromoteOnMove}
                            onMouseUpCapture={cancelHold}
                            onTouchEndCapture={cancelHold}
                            title="Drag to reorder"
                            style={{position:"absolute",top:"1px",right:"3px",zIndex:5,
                              fontSize:"20px",lineHeight:1,color:cfg.numColor,opacity:0.4,
                              cursor:"grab",padding:"12px",minWidth:"44px",minHeight:"44px",boxSizing:"border-box",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              userSelect:"none",touchAction:"none"}}>⠿</div>
                        )}

                        {/* Left: op number + elapsed */}
                        <button
                          onMouseDown={e=>e.stopPropagation()}
                          onClick={e=>{if(consumeDragSuppressedClick(e))return;e.stopPropagation();if(!isInactive)setMenu(isOpen?null:{op,type:"status"});}}
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
                            alignItems:"center",padding:"4px 6px",gap:"8px",minWidth:0,overflow:"hidden"}}>

                            {/* Appt badges — vertical letters */}
                            <button
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
                                    color:cfg.key==="awaiting"?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.35)"}}>—</span>
                                </div>
                              )}
                              {[...(apptTypes||[])].sort((a,b)=>APPT_TYPES.indexOf(a)-APPT_TYPES.indexOf(b)).map(t=>(
                                <div key={t} style={{borderRadius:"6px",
                                  background:`${cfg.numColor}22`,border:`1.5px solid ${cfg.numColor}55`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  flexDirection:"column",
                                  overflow:"hidden",padding:"2px 2px"}}>
                                  {(APPT_ABBR_MAP[t]||t).toUpperCase().split('').map((ch,idx)=>(
                                    <span key={idx} style={{fontSize:(apptTypes||[]).length>8?`calc(${bdgSz} * 0.35)`:(apptTypes||[]).length>6?`calc(${bdgSz} * 0.4)`:(apptTypes||[]).length>4?`calc(${bdgSz} * 0.5)`:(apptTypes||[]).length>2?`calc(${bdgSz} * 0.65)`:bdgSz,fontWeight:800,
                                      color:cfg.numColor,lineHeight:1.05,display:"block",textAlign:"center"}}>
                                      {ch}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </button>

                            {/* Note — FitText */}
                            <button
                              onMouseDown={e=>e.stopPropagation()}
                              onClick={e=>{
                                if(consumeDragSuppressedClick(e))return;
                                e.stopPropagation();
                                if(menu){setMenu(null);return;}
                                if(noteLocked?.op===op&&noteLocked?.by!=="frontdesk"){showToast("🔒 In use");return;}
                                {const ip=(ops[op]?.procedures||[]).length>0?(ops[op].procedures||[]).map(p=>({...p})):prepopulateFromApptTypes(ops[op]?.apptTypes);setNoteEdit({op,draft:note||"",procs:sortProcedures(ip),openProcs:ip.map(p=>({...p}))});}emitSocket("noteLock",{op,by:"frontdesk"});resetFDNoteTimeout(op);}}
                              style={{flex:1,textAlign:"left",padding:0,background:"transparent",
                                border:"none",cursor:"pointer",alignSelf:"center",minWidth:0,
                                overflow:"hidden",display:"flex",alignItems:"center"}}>
                              <div style={{display:"flex",flexDirection:"column",gap:"3px",width:"100%",minWidth:0}}>
                                {procedures.length>0&&(
                                  <div style={{display:"grid",gridTemplateColumns:`repeat(${procedures.length>=10?4:3},1fr)`,gap:"3px"}}>
                                    {sortProcedures(procedures).map(p=>(
                                      <span key={p.code} style={{display:"block",width:"100%",boxSizing:"border-box",textAlign:"center",padding:"8px 4px",borderRadius:"4px",fontSize:"10px",fontWeight:800,letterSpacing:"0.04em",lineHeight:1.3,whiteSpace:"nowrap",
                                        background:p.done?"rgba(255,80,80,0.2)":"rgba(74,222,128,0.2)",
                                        border:`1px solid ${p.done?"rgba(255,80,80,0.55)":"rgba(74,222,128,0.55)"}`,
                                        color:p.done?"#ff6b6b":"#4ade80"}}>{p.code}</span>
                                    ))}
                                  </div>
                                )}
                                <FitText
                                  text={abbreviateNote(note,customAbbrevs)||(procedures.length>0?"":"Procedures & Note")}
                                  maxSz={parseInt(notSz.match(/(\d+)px/)?.[1]||"36")}
                                  minSz={10}
                                  maxRows={3}
                                  color={note
                                    ? cfg.key==="awaiting"?"rgba(0,0,0,0.75)":"rgba(255,255,255,0.85)"
                                    : cfg.key==="awaiting"?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.18)"}
                                  fontFamily="'DM Sans',sans-serif"
                                  fontWeight={700}
                                />
                              </div>
                            </button>
                          </div>
                        )}
                        {isInactive&&<div style={{flex:1}}/>}

                        {/* Needs-checkout strip — pinned to the card bottom as a
                            full-width overlay (the card is a relative, overflow-
                            hidden row, so this matches the grip-handle overlay
                            pattern). Only on active (provider-assigned) ops. */}
                        {!isInactive&&status!=="awaiting"&&(
                          needsCheckout ? (
                            <div
                              onMouseDown={e=>{e.stopPropagation();emitSocket('setNeedsCheckout',{op,value:!needsCheckout});}}
                              style={{position:"absolute",left:0,right:0,bottom:0,zIndex:4,
                                background:"#f97316",color:"#fff",padding:"4px 10px",
                                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                                fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
                                borderTop:"none"}}>NEEDS CHECKOUT</div>
                          ) : (
                            <div
                              onMouseDown={e=>{e.stopPropagation();emitSocket('setNeedsCheckout',{op,value:!needsCheckout});}}
                              style={{position:"absolute",left:0,right:0,bottom:0,zIndex:4,
                                borderTop:"0.5px solid rgba(255,255,255,0.06)",padding:"4px 10px",
                                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                                color:"rgba(255,255,255,0.15)",fontSize:"9px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>NEEDS CHECKOUT</div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
                {ci<providerCols.length-1&&<div style={S.colDiv}/>}
              </div>
            );
          })}
        </div>


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
                // Immediately find next stuck op (REMINDER_STATUSES + REMINDER_MS are module-scope)
                const next=ALL_OPS.find(op=>{
                  const d=ops[op];
                  if(!d||!REMINDER_STATUSES.includes(d.status))return false;
                  const k=`${op}-${d.status}-${d.ts}`;
                  if(newDismissed.has(k))return false;
                  return d.ts&&(Date.now()-new Date(d.ts).getTime())>REMINDER_MS;
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
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#1a1a22",borderRadius:"16px",padding:"24px",width:"400px",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.95)"}}
              onMouseDown={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.15em",color:"rgba(255,255,255,0.4)"}}>NOTE · OP {noteEdit.op}</div>
                <button
                  onMouseDown={e=>{e.stopPropagation();setNoteEdit(p=>({...p,procs:[]}));}}
                  onMouseEnter={e=>e.currentTarget.style.color="rgba(255,80,80,1)"}
                  onMouseLeave={e=>e.currentTarget.style.color="rgba(255,80,80,0.7)"}
                  style={{background:"none",border:"none",color:"rgba(255,80,80,0.7)",fontSize:"12px",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer"}}>
                  Clear Procedures
                </button>
              </div>
              <ProcedureChecklist
                procs={noteEdit.procs||[]}
                onChange={next=>setNoteEdit(p=>({...p,procs:next}))}
                onLogCustom={name=>emitSocket('logCustomProcedure',{name})}
              />
              <textarea
                autoFocus
                ref={el=>{if(el&&!el.dataset.selected){el.dataset.selected='1';setTimeout(()=>{el.focus();el.select();},50);}}}
                value={noteEdit.draft}
                maxLength={40}
                onChange={e=>setNoteEdit(p=>({...p,draft:e.target.value.slice(0,40)}))}
                onKeyDown={e=>{
                  if(e.key==='Enter'&&!e.shiftKey){
                    e.preventDefault();
                    updateProcedures(noteEdit.op,applySaveTriggers(noteEdit.procs,noteEdit.openProcs));
                    setOps(p=>({...p,[noteEdit.op]:{...p[noteEdit.op],note:noteEdit.draft,noteUpdatedAt:new Date()}}));
                    emitSocket('setNote',{op:noteEdit.op,note:noteEdit.draft});
                    emitSocket('noteUnlock',{op:noteEdit.op});
                    clearTimeout(fdNoteTimeoutRef.current);
                    setNoteEdit(null);
                  }
                }}
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"10px",padding:"14px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"18px",fontWeight:600,resize:"none",outline:"none",minHeight:"100px"}}
                placeholder="Add a note..."
              />
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"4px"}}>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>Board: <span style={{color:"rgba(96,165,250,0.7)"}}>{abbreviateNote(noteEdit.draft,customAbbrevs)}</span></div>
                <div style={{fontSize:"12px",color:noteEdit.draft.length>35?"rgba(255,80,80,0.8)":"rgba(255,255,255,0.3)",fontWeight:600}}>{noteEdit.draft.length}/40</div>
              </div>
              <div style={{display:"flex",gap:"10px",marginTop:"14px"}}>
                <button onMouseDown={()=>{emitSocket('noteUnlock',{op:noteEdit.op});clearTimeout(fdNoteTimeoutRef.current);setNoteEdit(null);}}
                  style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"9px",color:"rgba(255,255,255,0.5)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.1em",cursor:"pointer"}}>
                  CANCEL
                </button>
                <button onMouseDown={()=>{
                  updateProcedures(noteEdit.op,applySaveTriggers(noteEdit.procs,noteEdit.openProcs));
                  setOps(p=>({...p,[noteEdit.op]:{...p[noteEdit.op],note:noteEdit.draft,noteUpdatedAt:new Date()}}));
                  emitSocket('setNote',{op:noteEdit.op,note:noteEdit.draft});
                  emitSocket('noteUnlock',{op:noteEdit.op});
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

        {/* Status menu — centered modal (ported from Master) */}
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
                {STATUSES.filter(s=>s.key!=="inactive").map(s=>{
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

        {/* Appt type menu — centered modal multi-select (ported from Master) */}
        {menu && menu.type==='appt' && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",
            zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <ModalMenu
              key={`${menu.op}-appt`}
              op={menu.op}
              ops={ops}
              onClose={()=>setMenu(null)}
              onSetApptType={setApptType}
              statuses={STATUSES}
              apptTypes={APPT_TYPES}
            />
          </div>
        )}

        {/* Queue screen */}
        {showQueue&&(
          <div style={{position:"absolute",inset:0,background:"rgba(8,10,12,0.97)",zIndex:350,display:"flex",flexDirection:"column",padding:"24px 32px",gap:"12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",letterSpacing:"0.15em",color:popups[0]?.type==="awfa"?"#ff69b4":"#4ade80"}}>
              {popups[0]?.type==="awfa"?"AWAITING FA":"READY"} QUEUE
            </div>
              <button onClick={()=>setShowQueue(false)} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"0.12em",padding:"8px 20px",borderRadius:"7px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)",cursor:"pointer"}}>← BACK</button>
            </div>
            <div style={{fontSize:"11px",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans',sans-serif",marginBottom:"4px"}}>DRAG ↕ TO REORDER URGENCY · STATUS CHANGE REMOVES OP FROM QUEUE</div>
            <div style={{flex:1,overflowY:"auto"}}>
              {popups.map((item,i)=>{
                // Live slide preview: each non-dragged row shifts one slot to
                // mirror queueDragOrder vs its committed display index i (parallels
                // the column reorder's translateY shift). popups order is stable
                // during a drag (queueOrder commits only on drop), so i is the
                // original display index.
                let shift="";
                if(drag?.kind==='queue'&&queueDragOrder&&drag.itemId!==item.id){
                  const j=queueDragOrder.indexOf(item.id);
                  if(j>=0){
                    if(j<i) shift="translateY(-100%)";
                    else if(j>i) shift="translateY(100%)";
                  }
                }
                return(
                <QueueItem key={item.id} item={item} ops={ops}
                  drag={drag} shift={shift}
                  primeDrag={primeDrag}
                  cancelHold={cancelHold}
                  maybePromoteOnMove={maybePromoteOnMove}/>
                );
              })}
            </div>
          </div>
        )}
      </div>
        {currentAwfaPopup && (
          <div onMouseDown={dismissAwfaPopup}
            style={{position:"absolute",inset:0,background:"rgba(10,10,12,0.55)",backdropFilter:"blur(4px)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <div style={{padding:"60px 80px",borderRadius:"24px",background:"rgba(255,105,180,0.18)",border:"3px solid #ff69b4",boxShadow:"0 0 80px rgba(255,105,180,0.6)",textAlign:"center",fontFamily:"'Bebas Neue',sans-serif"}}>
              <div style={{fontSize:"72px",letterSpacing:"0.15em",color:"#ff69b4",lineHeight:1,marginBottom:"24px"}}>AWAITING FA</div>
              <div style={{fontSize:"96px",letterSpacing:"0.1em",color:"#fff",lineHeight:1,marginBottom:"32px"}}>OP {currentAwfaPopup.op}</div>
              <div style={{fontSize:"22px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.55)",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>TAP TO DISMISS</div>
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
  @keyframes popupFlashAwfa{0%,100%{background:#642342;}50%{background:#3d0a20;}}
  @keyframes popupFlashRdy{0%,100%{background:#4ade80;}50%{background:#052210;}}
  @keyframes slideIn{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
`;

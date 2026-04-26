import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Dental Abbreviation Engine ────────────────────────────────────────────────
const ABBREV_PHRASES = [
  [/laser\s*(?:&|and)\s*irrigation/gi,'Adj'],[/full\s*mouth\s*series/gi,'FMS'],
  [/full\s*mouth/gi,'FM'],[/bite\s*adjustment/gi,'Bite Adj'],[/bite\s*adj/gi,'Bite Adj'],
  [/post[\s-]op/gi,'PO'],[/pre[\s-]op/gi,'PreOp'],[/new\s*patient/gi,'NP'],
  [/follow\s*up/gi,'FU'],[/scaling\s*(?:and\s*)?root\s*plan(?:ing)?/gi,'SRP'],
  [/root\s*canal/gi,'RCT'],[/\btooth\s*#?(\d)/gi,'$1'],[/\bemergency\b/gi,'LOE'],
  [/\benamelplasty\b/gi,'Enpl'],[/\bextractions?\b/gi,'Ext'],[/\bimplants?\b/gi,'Impl'],
  [/\bcrowns?\b/gi,'Crn'],[/\bbridges?\b/gi,'Br'],[/\bveneers?\b/gi,'Vnr'],
  [/\bfillings?\b/gi,'Fill'],[/\bfills?\b/gi,'Fill'],[/\bcomposites?\b/gi,'Comp'],
  [/\bam(?:a)?lgam\b/gi,'Amlg'],[/\bcleaning\b/gi,'Cln'],[/\bperiodontal\b/gi,'Perio'],
  [/\bprophylaxis\b/gi,'Prphy'],[/\bfluoride\b/gi,'Fl'],[/\bsealants?\b/gi,'Slt'],
  [/\bpanoramic\b/gi,'Pan'],[/\bbitewing\b/gi,'BW'],[/\bperiapical\b/gi,'PA'],
  [/\bimpressions?\b/gi,'Imp'],[/\badjustment\b/gi,'Adj'],[/\bconsultation\b/gi,'Consult'],
  [/\bsparks?\b/gi,'Sprk'],[/\btemporary\b/gi,'Tmp'],[/\bpermanent\b/gi,'Perm'],
  [/\banesthesia\b/gi,'Anes'],[/\bquadrants?\b/gi,'Qd'],[/\bquads?\b/gi,'Qd'],
  [/\bdentures?\b/gi,'Dntr'],[/\bpartials?\b/gi,'Part'],[/\borthodontics?\b/gi,'Ortho'],
  [/\bwhitening\b/gi,'Whtng'],[/\bbleaching\b/gi,'Blch'],[/\bsedation\b/gi,'Sed'],
  [/\bretainer\b/gi,'Ret'],[/\birrigation\b/gi,'Irr'],[/\bx-rays?\b/gi,'XR'],[/\bxrays?\b/gi,'XR'],
];
function abbreviateNote(note,customAbbrevs=[]){
  if(!note) return note;
  let r=note;
  (customAbbrevs||[]).forEach(({full,abbr})=>{
    if(full&&abbr){try{r=r.replace(new RegExp('\\b'+full.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'),abbr);}catch(e){}}
  });
  ABBREV_PHRASES.forEach(([re,abbr])=>{r=r.replace(re,abbr);});
  r=r.replace(/#(\d+)/g,'$1');
  r=r.replace(/\b(\d+)(?:\s*,\s*(\d+))+\b/g,m=>m.split(/\s*,\s*/).join('/'));
  return r.replace(/  +/g,' ').trim();
}

// ── ScaledWrapper ─────────────────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────────────────────
const getOpNumber=()=>{const m=window.location.pathname.match(/\/op\/(\d+)/);return m?parseInt(m[1]):1;};
const OP_NUMBER=getOpNumber();

const STATUSES=[
  {key:"ready",    abbr:"Ready",       numColor:"#4ade80",bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.45)"},
  {key:"treatment",abbr:"Reserved",    numColor:"#60a5fa",bg:"rgba(59,130,246,0.12)", border:"rgba(59,130,246,0.45)"},
  {key:"pending",  abbr:"Awaiting FA", numColor:"#ff69b4",bg:"rgba(255,105,180,0.12)",border:"rgba(255,105,180,0.45)"},
  {key:"fa",       abbr:"Reviewing FA",numColor:"#facc15",bg:"rgba(234,179,8,0.10)",  border:"rgba(234,179,8,0.45)"},
  {key:"dirty",    abbr:"Dirty",       numColor:"#ff2020",bg:"rgba(255,0,0,0.15)",    border:"rgba(255,0,0,0.55)"},
  {key:"awaiting", abbr:"Clean",       numColor:"#888",   bg:"rgba(255,255,255,0.95)",border:"rgba(255,255,255,0.95)"},
  {key:"inactive", abbr:"Not In Use",  numColor:"#555",   bg:"rgba(80,80,80,0.15)",   border:"rgba(80,80,80,0.3)"},
];
const SM=Object.fromEntries(STATUSES.map(s=>[s.key,s]));
const DEFAULT_APPT_TYPES=["NP","CCX","Treatment","LOE","Delivery","Office Visit","Prophy","PMT","SRP"];
const APPT_ABBR_MAP={"NP":"NP","CCX":"CCX","Treatment":"TX","LOE":"LOE","Delivery":"DEL","Office Visit":"OV","Prophy":"PRO","PMT":"PMT","SRP":"SRP"};

const OP_DATA={status:"ready",note:"New patient",ts:new Date(Date.now()-120000),apptTypes:["NP"],provider:"Dr. Tang"};

const LOGO_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" width="36" height="36"><circle cx="28" cy="28" r="28" fill="#1a1a2e"/><path d="M18 38 Q14 28 18 20 Q22 14 28 14 Q34 14 38 20 Q42 28 38 38" stroke="#60a5fa" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="22" cy="22" r="3" fill="#4ade80"/><circle cx="34" cy="22" r="3" fill="#4ade80"/><path d="M22 32 Q28 37 34 32" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

const elapsed=d=>{
  if(!d)return'';
  const ms=typeof d==='number'?d:d instanceof Date?d.getTime():new Date(d).getTime();
  const s=Math.floor((Date.now()-ms)/1000);
  if(s<60)return'<1m';
  if(s<3600)return`${Math.floor(s/60)}m`;
  return`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
};

// ── Main Op Tablet ────────────────────────────────────────────────────────────
export default function OpTablet(){
  const[op,setOp]=useState(OP_DATA);
  const[showStatusModal,setShowStatusModal]=useState(false);
  const[showApptModal,setShowApptModal]=useState(false);
  const[noteEdit,setNoteEdit]=useState(null);
  const[toast,setToast]=useState(null);
  const[now,setNow]=useState(new Date());
  const[isOnline,setIsOnline]=useState(true);
  const[availableApptTypes,setAvailableApptTypes]=useState(DEFAULT_APPT_TYPES);
  const[statuses,setStatuses]=useState(STATUSES);
  const toastRef=useRef(null);
  const noteTimeoutRef=useRef(null);

  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id);},[]);

  const showToast=msg=>{setToast(msg);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),2000);};

  // Socket.io sync
  useEffect(()=>{
    if(typeof socket==='undefined')return;
    const onState=state=>{
      if(state.apptTypes)setAvailableApptTypes(state.apptTypes);
      if(state.statuses)setStatuses(state.statuses);
      if(state.ops&&state.ops[OP_NUMBER]){
        const d=state.ops[OP_NUMBER];
        setOp(prev=>({...prev,...d,ts:d.ts?new Date(d.ts):null,apptTypes:Array.isArray(d.apptTypes)?d.apptTypes:[]}));
      }
    };
    socket.on('state',onState);
    socket.on('connect',()=>setIsOnline(true));
    socket.on('disconnect',()=>setIsOnline(false));
    return()=>{socket.off('state',onState);socket.off('connect');socket.off('disconnect');};
  },[]);

  const setStatus=key=>{
    const shouldClear=['awaiting','inactive'].includes(key);
    setOp(p=>({...p,status:key,ts:new Date(),note:shouldClear?'':p.note,apptTypes:shouldClear?[]:p.apptTypes}));
    if(typeof socket!=='undefined')socket.emit('setStatus',{op:OP_NUMBER,status:key});
    showToast(`✓ ${SM[key]?.abbr||key}`);
    setShowStatusModal(false);
  };

  const toggleApptType=t=>{
    setOp(p=>{
      const cur=p.apptTypes||[];
      const next=cur.includes(t)?cur.filter(x=>x!==t):[...cur,t];
      if(typeof socket!=='undefined')socket.emit('setApptType',{op:OP_NUMBER,apptTypes:next});
      return{...p,apptTypes:next};
    });
    // NO toast here — toast fires only when DONE is tapped
  };

  const saveNote=val=>{
    clearTimeout(noteTimeoutRef.current);
    setOp(p=>({...p,note:val,noteUpdatedAt:new Date()}));
    if(typeof socket!=='undefined'){socket.emit('setNote',{op:OP_NUMBER,note:val});socket.emit('noteUnlock',{});}
    showToast('✓ Note Saved');
    setNoteEdit(null);
  };

  const openNote=()=>{
    if(typeof socket!=='undefined')socket.emit('noteLock',{op:OP_NUMBER,by:'op'+OP_NUMBER});
    setNoteEdit({draft:op.note||''});
    clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current=setTimeout(()=>{if(typeof socket!=='undefined')socket.emit('noteUnlock',{});setNoteEdit(null);},30000);
  };

  const cfg=SM[op.status]||SM.ready;
  const isLight=op.status==='awaiting';
  const textCol=isLight?'#111114':cfg.numColor;
  const cardAnim=(op.status==='ready'||op.status==='pending')?' slowPulse 2.5s ease-in-out infinite':'none';
  const fmtTime=d=>{let h=d.getHours(),m=d.getMinutes(),ap=h>=12?'PM':'AM';h=h%12||12;return`${h}:${String(m).padStart(2,'0')} ${ap}`;};
  const fmtDate=d=>`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;

  return(
    <ScaledWrapper designW={390} designH={844}>
      <div style={{width:'390px',height:'844px',background:'#0a0a0c',fontFamily:"'DM Sans',sans-serif",
        display:'flex',flexDirection:'column',boxSizing:'border-box',overflow:'hidden',position:'relative'}}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap"/>
        <style>{`
          @keyframes slowPulse{0%,100%{opacity:1;}50%{opacity:0.55;}}
          @keyframes awfaPulse{0%,100%{opacity:1;}50%{opacity:0.6;}}
        `}</style>

        {/* ── Header ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0,gap:'8px'}}>
          {/* Left: Logo + two-line title */}
          <div style={{display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
            <span dangerouslySetInnerHTML={{__html:LOGO_SVG}}/>
            <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'15px',
                letterSpacing:'0.12em',color:'rgba(255,255,255,0.7)',whiteSpace:'nowrap'}}>
                DENTISTS OF
              </span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'15px',
                letterSpacing:'0.12em',color:'#fff',whiteSpace:'nowrap'}}>
                WEST HENDERSON
              </span>
            </div>
          </div>
          {/* Right: Date on row 1, Time on row 2 */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',
            flexShrink:0,gap:'1px'}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:'12px',fontWeight:600,
              color:'rgba(255,255,255,0.5)',whiteSpace:'nowrap'}}>
              {fmtDate(now)}
            </div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:'14px',fontWeight:700,
              color:'rgba(255,255,255,0.8)',whiteSpace:'nowrap'}}>
              {fmtTime(now)}
            </div>

          </div>
        </div>

        {/* ── Provider name ── */}
        {op.provider&&(
          <div style={{textAlign:'center',padding:'8px 16px 4px',flexShrink:0}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',
              letterSpacing:'0.15em',color:'rgba(255,255,255,0.5)'}}>{op.provider}</span>
          </div>
        )}

        {/* ── Main status card ── */}
        <div style={{flex:1,margin:'10px 16px',borderRadius:'16px',
          background:cfg.bg,border:`2px solid ${cfg.border}`,
          boxShadow:`0 0 30px ${cfg.border}55`,
          animation:cardAnim,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          gap:'10px',padding:'20px',minHeight:0,position:'relative'}}>

          {/* Op number - large, centered */}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'96px',lineHeight:0.85,
            color:textCol,textShadow:`0 0 30px ${cfg.border}`}}>
            Op {OP_NUMBER}
          </div>

          {/* Status label — tap to change */}
          <button onMouseDown={()=>setShowStatusModal(true)}
            style={{background:'transparent',border:'none',cursor:'pointer',padding:'4px 16px',
              borderRadius:'8px'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'28px',letterSpacing:'0.15em',
              color:textCol,opacity:0.85}}>
              {cfg.abbr}
            </div>
          </button>

          {/* Elapsed timer */}
          {op.ts&&op.status!=='inactive'&&(
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'20px',
              color:textCol,opacity:0.6}}>
              {elapsed(op.ts)}
            </div>
          )}

          {/* Appt type badges — tap to change */}
          <button onMouseDown={()=>setShowApptModal(true)}
            style={{background:'transparent',border:'none',cursor:'pointer',padding:'4px 8px',
              borderRadius:'8px',display:'flex',flexWrap:'wrap',gap:'6px',
              justifyContent:'center',alignItems:'center',marginTop:'4px'}}>
            {op.apptTypes&&op.apptTypes.length>0
              ? (op.apptTypes||[]).map(t=>(
                  <span key={t} style={{fontFamily:"'DM Sans',sans-serif",fontSize:'16px',fontWeight:700,
                    padding:'4px 14px',borderRadius:'8px',
                    background:`${textCol}22`,border:`1px solid ${textCol}55`,
                    color:textCol,whiteSpace:'nowrap'}}>
                    {t}
                  </span>
                ))
              : <span style={{fontSize:'14px',fontWeight:600,color:`${textCol}44`,
                  fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.06em'}}>
                  tap to add appt type
                </span>
            }
          </button>

          {/* Note */}
          <button onMouseDown={openNote}
            style={{background:'transparent',border:'none',cursor:'pointer',padding:'4px 0',
              textAlign:'center',maxWidth:'100%'}}>
            <div style={{fontSize:'15px',fontWeight:600,
              color:op.note?`${textCol}99`:`${textCol}44`,
              wordBreak:'break-word',lineHeight:1.4,maxWidth:'300px',
              display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
              {op.note?abbreviateNote(op.note):'tap to add note...'}
            </div>
          </button>
        </div>

        {/* ── Tap hint ── */}
        <div style={{textAlign:'center',paddingBottom:'14px',flexShrink:0}}>
          <span style={{fontSize:'11px',letterSpacing:'0.12em',color:'rgba(255,255,255,0.18)',
            fontFamily:"'Bebas Neue',sans-serif"}}>TAP STATUS OR APPT TYPE TO CHANGE</span>
        </div>

        {/* ── Status Modal ── */}
        {showStatusModal&&(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,
            display:'flex',alignItems:'flex-end'}} onMouseDown={()=>setShowStatusModal(false)}>
            <div style={{width:'100%',background:'#16161a',borderRadius:'20px 20px 0 0',
              padding:'20px 16px 32px'}} onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'16px',letterSpacing:'0.15em',
                color:'rgba(255,255,255,0.35)',marginBottom:'16px',textAlign:'center'}}>SELECT STATUS</div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {STATUSES.filter(s=>s.key!=='inactive').map(s=>{
                  const active=op.status===s.key;
                  const dc=s.key==='awaiting'?'#111':s.numColor;
                  return(
                    <button key={s.key} onMouseDown={()=>setStatus(s.key)}
                      style={{padding:'14px 18px',borderRadius:'12px',cursor:'pointer',textAlign:'left',
                        background:active?s.bg:'rgba(255,255,255,0.04)',
                        border:`2px solid ${active?s.border:'rgba(255,255,255,0.08)'}`,
                        display:'flex',alignItems:'center',gap:'12px'}}>
                      <span style={{width:'14px',height:'14px',borderRadius:'50%',flexShrink:0,
                        background:dc,boxShadow:`0 0 8px ${dc}`}}/>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'20px',
                        letterSpacing:'0.1em',color:dc,flex:1}}>{s.abbr}</span>
                      {active&&<span style={{color:dc,fontSize:'16px'}}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Appt Type Modal ── */}
        {showApptModal&&(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,
            display:'flex',alignItems:'flex-end'}} onMouseDown={()=>setShowApptModal(false)}>
            <div style={{width:'100%',background:'#16161a',borderRadius:'20px 20px 0 0',
              padding:'14px 14px 18px',overflowY:'hidden'}} onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'16px',letterSpacing:'0.15em',
                color:'rgba(255,255,255,0.35)',marginBottom:'2px',textAlign:'center'}}>APPT TYPE · TAP TO TOGGLE</div>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,0.2)',textAlign:'center',marginBottom:'8px'}}>
                Selected: {(op.apptTypes||[]).join(' · ')||'None'}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                {(availableApptTypes||DEFAULT_APPT_TYPES).map(t=>{
                  const active=(op.apptTypes||[]).includes(t);
                  return(
                    <button key={t} onMouseDown={()=>toggleApptType(t)}
                      style={{padding:'9px 14px',borderRadius:'9px',cursor:'pointer',textAlign:'left',
                        background:active?`${cfg.numColor}22`:'rgba(255,255,255,0.04)',
                        border:`2px solid ${active?cfg.numColor+'55':'rgba(255,255,255,0.08)'}`,
                        display:'flex',alignItems:'center',gap:'12px'}}>
                      <span style={{width:'16px',height:'16px',borderRadius:'4px',flexShrink:0,
                        background:active?cfg.numColor:'transparent',
                        border:active?'none':'1px solid rgba(255,255,255,0.3)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'10px',color:'#000'}}>{active?'✓':''}</span>
                      <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:'15px',fontWeight:700,
                        color:active?cfg.numColor:'rgba(255,255,255,0.8)',flex:1}}>{t}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                {(op.apptTypes||[]).length>0&&(
                  <button onMouseDown={()=>{setOp(p=>({...p,apptTypes:[]}));if(typeof socket!=='undefined')socket.emit('setApptType',{op:OP_NUMBER,apptTypes:[]});}}
                    style={{flex:1,padding:'9px',background:'rgba(239,68,68,0.08)',
                      border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',
                      color:'rgba(239,68,68,0.8)',fontFamily:"'Bebas Neue',sans-serif",
                      fontSize:'16px',letterSpacing:'0.1em',cursor:'pointer'}}>CLEAR</button>
                )}
                <button onMouseDown={()=>{setShowApptModal(false);if((op.apptTypes||[]).length>0)showToast(`✓ ${op.apptTypes.join(' · ')}`);}}
                  style={{flex:2,padding:'9px',background:'rgba(74,222,128,0.12)',
                    border:'1px solid rgba(74,222,128,0.4)',borderRadius:'10px',
                    color:'#4ade80',fontFamily:"'Bebas Neue',sans-serif",
                    fontSize:'16px',letterSpacing:'0.1em',cursor:'pointer'}}>✓ DONE</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Note editor modal ── */}
        {noteEdit&&(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,
            display:'flex',alignItems:'center',justifyContent:'center'}}
            onMouseDown={()=>{clearTimeout(noteTimeoutRef.current);if(typeof socket!=='undefined')socket.emit('noteUnlock',{});setNoteEdit(null);}}>
            <div style={{background:'#1a1a22',borderRadius:'16px',padding:'20px',width:'340px',
              boxShadow:'0 32px 80px rgba(0,0,0,0.95)'}} onMouseDown={e=>e.stopPropagation()}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'16px',letterSpacing:'0.15em',
                color:'rgba(255,255,255,0.4)',marginBottom:'12px'}}>NOTE · OP {OP_NUMBER}</div>
              <textarea autoFocus
                ref={el=>{if(el&&!el.dataset.selected){el.dataset.selected='1';setTimeout(()=>{el.focus();el.select();},50);}}}
                value={noteEdit.draft} maxLength={40}
                onChange={e=>{setNoteEdit(p=>({...p,draft:e.target.value.slice(0,40)}));clearTimeout(noteTimeoutRef.current);noteTimeoutRef.current=setTimeout(()=>{if(typeof socket!=='undefined')socket.emit('noteUnlock',{});setNoteEdit(null);},30000);}}
                style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',
                  borderRadius:'10px',padding:'12px',color:'#fff',fontFamily:"'DM Sans',sans-serif",
                  fontSize:'16px',fontWeight:600,resize:'none',outline:'none',minHeight:'80px'}}
                placeholder="Add a note..."/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'4px'}}>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>
                  Board: <span style={{color:'rgba(96,165,250,0.7)'}}>{abbreviateNote(noteEdit.draft)}</span>
                </div>
                <div style={{fontSize:'12px',fontWeight:600,
                  color:noteEdit.draft.length>35?'rgba(255,80,80,0.8)':'rgba(255,255,255,0.3)'}}>
                  {noteEdit.draft.length}/40
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <button onMouseDown={()=>{clearTimeout(noteTimeoutRef.current);if(typeof socket!=='undefined')socket.emit('noteUnlock',{});setNoteEdit(null);}}
                  style={{flex:1,padding:'10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:'8px',color:'rgba(255,255,255,0.5)',fontFamily:"'Bebas Neue',sans-serif",
                    fontSize:'14px',letterSpacing:'0.1em',cursor:'pointer'}}>CANCEL</button>
                <button onMouseDown={()=>saveNote(noteEdit.draft)}
                  style={{flex:2,padding:'10px',background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.4)',
                    borderRadius:'8px',color:'#4ade80',fontFamily:"'Bebas Neue',sans-serif",
                    fontSize:'14px',letterSpacing:'0.1em',cursor:'pointer'}}>SAVE NOTE</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {toast&&(
          <div style={{position:'absolute',bottom:'90px',left:'50%',transform:'translateX(-50%)',
            background:'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.5)',
            borderRadius:'10px',padding:'10px 24px',fontFamily:"'Bebas Neue',sans-serif",
            fontSize:'18px',letterSpacing:'0.12em',color:'#4ade80',whiteSpace:'nowrap',
            zIndex:300,boxShadow:'0 0 20px rgba(74,222,128,0.3)',pointerEvents:'none'}}>
            {toast}
          </div>
        )}
      </div>
    </ScaledWrapper>
  );
}

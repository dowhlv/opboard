p='public/frontdesk-tablet-preview.jsx'
s=open(p).read()

edits = [
  ("""  const dismissFirst=()=>{
    if(!activePopup)return;
    if(activePopup)setDismissedOps(d=>new Set([...d,activePopup.op]));
  };
""", ""),
  ("""            <button onMouseDown={()=>{if(activePopup)setDismissedOps(d=>new Set([...d,activePopup.op]));}}
              style={{flexShrink:0,padding:'6px 16px',borderRadius:'7px',cursor:'pointer',
                background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.2)',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',letterSpacing:'0.1em',
                color:'rgba(255,255,255,0.7)'}}>
              DISMISS
            </button>
""", ""),
]

miss=[]
for old,new in edits:
    if old in s:
        s = s.replace(old, new, 1)
    else:
        miss.append(old[:60])

open(p,'w').write(s)
print('miss:', miss if miss else 'none')
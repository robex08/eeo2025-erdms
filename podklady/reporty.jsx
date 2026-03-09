import { useState, useMemo, createContext, useContext } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── THEME ───────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({});
const useT = () => useContext(ThemeCtx);

const LIGHT = {
  dark: false,
  bg: "#f1f5f9", card: "#ffffff", cardBorder: "#e2e8f0",
  text: "#0f172a", muted: "#64748b", faint: "#94a3b8",
  input: "#ffffff", inputBorder: "#cbd5e1",
  headerBg: "#ffffff", headerBorder: "#e2e8f0",
  rowHover: "#f8fafc", rowBorder: "#f1f5f9",
  tabActive: "#4f46e5", tabBorder: "#4f46e5",
  presetBtn: "#f1f5f9", presetHover: "#e0e7ff",
  condRow: "#f8fafc", condBorder: "#e2e8f0",
  progressTrack: "#e2e8f0",
  tooltipBg: "#ffffff", tooltipBorder: "#e2e8f0", tooltipText: "#0f172a",
  badge: {
    green:  ["#dcfce7","#15803d"], blue: ["#ede9fe","#4338ca"],
    yellow: ["#fef9c3","#a16207"], red:  ["#fee2e2","#b91c1c"],
    gray:   ["#f1f5f9","#475569"],
  },
  andOr: { active: "#4f46e5", activeTxt: "#ffffff", inactive: "#f1f5f9", inactiveTxt: "#475569", border: "#e2e8f0" },
  accent: "#6366f1", accentHover: "#4f46e5",
  danger: "#ef4444", warn: "#f59e0b", success: "#22c55e", info: "#22d3ee",
};
const DARK = {
  dark: true,
  bg: "#0f172a", card: "rgba(30,41,59,0.8)", cardBorder: "#334155",
  text: "#f1f5f9", muted: "#94a3b8", faint: "#64748b",
  input: "#1e293b", inputBorder: "#475569",
  headerBg: "#0f172a", headerBorder: "#1e293b",
  rowHover: "rgba(51,65,85,0.4)", rowBorder: "#1e293b",
  tabActive: "#818cf8", tabBorder: "#818cf8",
  presetBtn: "#1e293b", presetHover: "#312e81",
  condRow: "#1e293b", condBorder: "#334155",
  progressTrack: "#334155",
  tooltipBg: "#1e293b", tooltipBorder: "#334155", tooltipText: "#f1f5f9",
  badge: {
    green:  ["#052e16","#4ade80"], blue: ["#1e1b4b","#a5b4fc"],
    yellow: ["#451a03","#fbbf24"], red:  ["#450a0a","#f87171"],
    gray:   ["#1e293b","#94a3b8"],
  },
  andOr: { active: "#6366f1", activeTxt: "#ffffff", inactive: "#1e293b", inactiveTxt: "#94a3b8", border: "#334155" },
  accent: "#818cf8", accentHover: "#6366f1",
  danger: "#f87171", warn: "#fbbf24", success: "#4ade80", info: "#22d3ee",
};

// ─── DATA ────────────────────────────────────────────────────────────────────
const ORDERS = [
  {id:"OBJ-2024-001",subject:"Školení ARVI",created:"2024-01-10",invoiceDate:"2024-01-08",orderDate:"2024-01-10",orderer:"Novák J.",approver:"Svoboda P.",financing:"LP",dept:"ARO",amount:25000,invAmount:28000,status:"Dokončeno",supplier:"EduCare s.r.o.",type:"Vzdělávání",hasInvoice:true,hasAttachment:true,daysOverdue:0},
  {id:"OBJ-2024-002",subject:"Zdravotnický materiál",created:"2024-01-15",invoiceDate:"2024-02-01",orderDate:"2024-01-15",orderer:"Kratochvíl M.",approver:"Novotná R.",financing:"Smlouva",dept:"Výjezdové",amount:142000,invAmount:142000,status:"Schváleno",supplier:"Medica CZ a.s.",type:"Materiál",hasInvoice:false,hasAttachment:false,daysOverdue:0},
  {id:"OBJ-2024-003",subject:"Oprava vozidla ZZS",created:"2024-02-03",invoiceDate:"2024-01-29",orderDate:"2024-02-03",orderer:"Marek T.",approver:"Svoboda P.",financing:"LP",dept:"Technický",amount:38000,invAmount:38000,status:"K zaplacení",supplier:"AutoServis Plus",type:"Oprava",hasInvoice:true,hasAttachment:false,daysOverdue:18},
  {id:"OBJ-2024-004",subject:"IT vybavení",created:"2024-02-10",invoiceDate:"2024-03-01",orderDate:"2024-02-10",orderer:"Pokorná L.",approver:"Novotná R.",financing:"Indiv. schválení",dept:"IT",amount:95000,invAmount:95000,status:"Dokončeno",supplier:"ComTech s.r.o.",type:"IT",hasInvoice:true,hasAttachment:true,daysOverdue:0},
  {id:"OBJ-2024-005",subject:"Kurz ACLS",created:"2024-02-14",invoiceDate:"2024-02-28",orderDate:"2024-02-14",orderer:"Beneš O.",approver:"Vlček K.",financing:"LP",dept:"Vzdělávání",amount:12000,invAmount:12000,status:"Schváleno",supplier:"MedEdu s.r.o.",type:"Vzdělávání",hasInvoice:false,hasAttachment:false,daysOverdue:0},
  {id:"OBJ-2024-006",subject:"Elektřina Q1",created:"2024-01-02",invoiceDate:"2024-04-01",orderDate:"2024-01-02",orderer:"Horák V.",approver:"Svoboda P.",financing:"Smlouva",dept:"Provozní",amount:0,invAmount:84000,status:"K zaplacení",supplier:"ČEZ a.s.",type:"Energie",hasInvoice:true,hasAttachment:true,daysOverdue:20},
  {id:"OBJ-2024-007",subject:"Ochranné pomůcky",created:"2024-03-01",invoiceDate:"2024-03-05",orderDate:"2024-03-01",orderer:"Novák J.",approver:"Vlček K.",financing:"LP",dept:"ARO",amount:8500,invAmount:9200,status:"Schváleno",supplier:"Medica CZ a.s.",type:"Materiál",hasInvoice:true,hasAttachment:false,daysOverdue:0},
  {id:"OBJ-2024-008",subject:"Pojistné vozidel",created:"2024-01-05",invoiceDate:"2024-01-10",orderDate:"2024-01-05",orderer:"Kratochvíl M.",approver:"Novotná R.",financing:"Pojistné",dept:"Technický",amount:45000,invAmount:45000,status:"Dokončeno",supplier:"Allianz a.s.",type:"Pojistné",hasInvoice:true,hasAttachment:true,daysOverdue:0},
  {id:"OBJ-2024-009",subject:"Školení řidičů",created:"2024-03-10",invoiceDate:"2024-03-15",orderDate:"2024-03-10",orderer:"Marek T.",approver:"Svoboda P.",financing:"LP",dept:"Výjezdové",amount:15000,invAmount:15000,status:"Schváleno",supplier:"DriveAcademy",type:"Vzdělávání",hasInvoice:false,hasAttachment:false,daysOverdue:0},
  {id:"OBJ-2024-010",subject:"Diagnostický přístroj",created:"2024-03-18",invoiceDate:"2024-04-20",orderDate:"2024-03-18",orderer:"Pokorná L.",approver:"Vlček K.",financing:"Smlouva",dept:"ARO",amount:320000,invAmount:320000,status:"K zaplacení",supplier:"MedTech Europe",type:"Přístroj",hasInvoice:true,hasAttachment:true,daysOverdue:25},
  {id:"OBJ-2024-011",subject:"Kancelářský materiál",created:"2024-04-01",invoiceDate:"2024-04-05",orderDate:"2024-04-01",orderer:"Beneš O.",approver:"Novotná R.",financing:"LP",dept:"Admin",amount:4200,invAmount:4200,status:"Schváleno",supplier:"Papírnictví OK",type:"Kancelář",hasInvoice:false,hasAttachment:false,daysOverdue:0},
  {id:"OBJ-2024-012",subject:"STORNO – Software",created:"2024-02-20",invoiceDate:null,orderDate:"2024-02-20",orderer:"Horák V.",approver:"Svoboda P.",financing:"LP",dept:"IT",amount:22000,invAmount:0,status:"Stornováno",supplier:"SoftCorp",type:"IT",hasInvoice:false,hasAttachment:false,daysOverdue:0},
];
const FINANCING_PLAN = [
  {name:"LP-ARO",planned:500000,actual:380000},{name:"LP-Výjezdové",planned:300000,actual:195000},
  {name:"LP-Vzdělávání",planned:200000,actual:87000},{name:"LP-Technický",planned:150000,actual:138000},
  {name:"LP-IT",planned:120000,actual:117000},{name:"LP-Admin",planned:50000,actual:42000},{name:"LP-Provozní",planned:100000,actual:84000},
];
const COLORS = ["#6366f1","#22d3ee","#f59e0b","#10b981","#f43f5e","#a78bfa","#34d399"];
const fmt = v => (v||0).toLocaleString("cs-CZ") + " Kč";

// ─── FIELDS ──────────────────────────────────────────────────────────────────
const ALL_FIELDS = [
  {key:"id",label:"Evidenční číslo",type:"string"},
  {key:"subject",label:"Předmět",type:"string"},
  {key:"status",label:"Stav",type:"enum",values:["Dokončeno","Schváleno","K zaplacení","Stornováno"]},
  {key:"dept",label:"Úsek",type:"enum",values:["ARO","Výjezdové","Technický","IT","Admin","Provozní","Vzdělávání"]},
  {key:"financing",label:"Způsob financování",type:"enum",values:["LP","Smlouva","Indiv. schválení","Pojistné"]},
  {key:"type",label:"Druh objednávky",type:"enum",values:["Vzdělávání","Materiál","Oprava","IT","Energie","Pojistné","Přístroj","Kancelář"]},
  {key:"orderer",label:"Objednavatel",type:"string"},
  {key:"approver",label:"Schvalovatel",type:"string"},
  {key:"supplier",label:"Dodavatel",type:"string"},
  {key:"amount",label:"Max cena (Kč)",type:"number"},
  {key:"invAmount",label:"Fa částka (Kč)",type:"number"},
  {key:"daysOverdue",label:"Dní po splatnosti",type:"number"},
  {key:"hasInvoice",label:"Má fakturu",type:"bool"},
  {key:"hasAttachment",label:"Má přílohu",type:"bool"},
  {key:"created",label:"Datum vytvoření",type:"date"},
  {key:"invoiceDate",label:"Datum Fa",type:"date"},
  {key:"overLimit",label:"Fa > limit",type:"bool",computed:r=>r.invAmount>r.amount&&r.amount>0},
  {key:"diffAmount",label:"Rozdíl Fa – limit",type:"number",computed:r=>r.invAmount-r.amount},
  {key:"faBeforeOrder",label:"Fa před OBJ",type:"bool",computed:r=>!!(r.invoiceDate&&r.invoiceDate<r.orderDate)},
];
const OPS = {
  string:[{op:"contains",label:"obsahuje"},{op:"notContains",label:"neobsahuje"},{op:"eq",label:"="},{op:"neq",label:"≠"}],
  number:[{op:"eq",label:"="},{op:"neq",label:"≠"},{op:"gt",label:">"},{op:"gte",label:"≥"},{op:"lt",label:"<"},{op:"lte",label:"≤"}],
  enum:  [{op:"eq",label:"="},{op:"neq",label:"≠"}],
  bool:  [{op:"is",label:"je"}],
  date:  [{op:"eq",label:"="},{op:"gt",label:">"},{op:"lt",label:"<"}],
};
function evalCond(row, c) {
  const fd=ALL_FIELDS.find(f=>f.key===c.field); if(!fd) return true;
  const raw=fd.computed?fd.computed(row):row[c.field]; const v=c.value;
  switch(c.op){
    case"contains":    return String(raw||"").toLowerCase().includes(v.toLowerCase());
    case"notContains": return !String(raw||"").toLowerCase().includes(v.toLowerCase());
    case"eq":  return fd.type==="bool"?raw===(v==="true"):String(raw)===String(v);
    case"neq": return String(raw)!==String(v);
    case"is":  return raw===(v==="true");
    case"gt":  return Number(raw)>Number(v);
    case"gte": return Number(raw)>=Number(v);
    case"lt":  return Number(raw)<Number(v);
    case"lte": return Number(raw)<=Number(v);
    default: return true;
  }
}

// ─── SMALL UI ────────────────────────────────────────────────────────────────
function Badge({children, color="gray"}) {
  const th=useT();
  const [bg,tx]=th.badge[color]||th.badge.gray;
  return <span style={{background:bg,color:tx,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600}}>{children}</span>;
}
function StatusBadge({status}) {
  const m={Dokončeno:"green",Schváleno:"blue","K zaplacení":"yellow",Stornováno:"red"};
  return <Badge color={m[status]||"gray"}>{status}</Badge>;
}
function Inp({style,...p}) {
  const th=useT();
  return <input style={{background:th.input,border:`1px solid ${th.inputBorder}`,color:th.text,borderRadius:6,padding:"5px 10px",fontSize:13,outline:"none",...style}} {...p}/>;
}
function Sel({style,children,...p}) {
  const th=useT();
  return <select style={{background:th.input,border:`1px solid ${th.inputBorder}`,color:th.text,borderRadius:6,padding:"5px 10px",fontSize:13,outline:"none",...style}} {...p}>{children}</select>;
}
function Card({children,style}) {
  const th=useT();
  return <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:12,padding:16,...style}}>{children}</div>;
}
function Divider() {
  const th=useT();
  return <div style={{borderBottom:`1px solid ${th.rowBorder}`,margin:"0"}}/>;
}

function DataTable({cols, rows, notes={}, onNote}) {
  const th=useT();
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>
          {cols.map(c=><th key={c.key} style={{textAlign:"left",padding:"8px 12px",color:th.muted,fontWeight:500,whiteSpace:"nowrap",borderBottom:`1px solid ${th.cardBorder}`}}>{c.label}</th>)}
          <th style={{textAlign:"left",padding:"8px 12px",color:th.muted,fontWeight:500,borderBottom:`1px solid ${th.cardBorder}`}}>Poznámka</th>
          <th style={{textAlign:"left",padding:"8px 12px",color:th.muted,fontWeight:500,borderBottom:`1px solid ${th.cardBorder}`}}>NŘK</th>
        </tr></thead>
        <tbody>
          {rows.length===0&&<tr><td colSpan={cols.length+2} style={{padding:"32px",textAlign:"center",color:th.faint}}>Žádné záznamy</td></tr>}
          {rows.map((r,i)=>(
            <tr key={i} style={{borderBottom:`1px solid ${th.rowBorder}`}}
              onMouseEnter={e=>e.currentTarget.style.background=th.rowHover}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {cols.map(c=><td key={c.key} style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
                {c.render?c.render(r):<span style={{color:th.text}}>{r[c.key]??"-"}</span>}
              </td>)}
              <td style={{padding:"8px 12px"}}>
                <Inp style={{width:120}} defaultValue={notes[r.id]||""} placeholder="Vložit..."
                  onBlur={e=>onNote&&onNote(r.id,e.target.value)}/>
              </td>
              <td style={{padding:"8px 12px"}}><input type="checkbox" style={{accentColor:"#6366f1"}}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── QUERY BUILDER ───────────────────────────────────────────────────────────
const DEFAULT_VISIBLE = new Set(["id","subject","status","dept","financing","amount","invAmount","supplier"]);
const PRESETS = [
  {label:"Dokončeno + Fa > limit",  logic:"AND",conds:[{field:"status",op:"eq",value:"Dokončeno"},{field:"overLimit",op:"is",value:"true"}]},
  {label:"Po splatnosti > 14 dní",  logic:"AND",conds:[{field:"daysOverdue",op:"gt",value:"14"}]},
  {label:"Schváleno bez faktury",    logic:"AND",conds:[{field:"status",op:"eq",value:"Schváleno"},{field:"hasInvoice",op:"is",value:"false"}]},
  {label:"LP objednávky > 50 000",  logic:"AND",conds:[{field:"financing",op:"eq",value:"LP"},{field:"amount",op:"gt",value:"50000"}]},
  {label:"Bez přílohy (má Fa)",      logic:"AND",conds:[{field:"hasInvoice",op:"is",value:"true"},{field:"hasAttachment",op:"is",value:"false"}]},
  {label:"Fa před objednávkou",      logic:"AND",conds:[{field:"faBeforeOrder",op:"is",value:"true"}]},
];
let cid=0; const mkC=()=>({id:++cid,field:"status",op:"eq",value:"Dokončeno"});

function ValueInput({field,op,value,onChange}) {
  const fd=ALL_FIELDS.find(f=>f.key===field); if(!fd) return null;
  if(fd.type==="bool"||op==="is") return <Sel value={value} onChange={e=>onChange(e.target.value)}><option value="true">Ano</option><option value="false">Ne</option></Sel>;
  if(fd.type==="enum") return <Sel value={value} onChange={e=>onChange(e.target.value)}><option value="">-- vyberte --</option>{fd.values.map(v=><option key={v}>{v}</option>)}</Sel>;
  if(fd.type==="number") return <Inp type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder="Hodnota" style={{width:100}}/>;
  if(fd.type==="date") return <Inp type="date" value={value} onChange={e=>onChange(e.target.value)}/>;
  return <Inp type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder="Hodnota" style={{width:130}}/>;
}

function QueryBuilder() {
  const th=useT();
  const [conditions,setConditions]=useState([mkC()]);
  const [logic,setLogic]=useState("AND");
  const [visibleCols,setVisibleCols]=useState(new Set(DEFAULT_VISIBLE));
  const [showColPicker,setShowColPicker]=useState(false);
  const [notes,setNotes]=useState({});

  const results=useMemo(()=>{
    if(!conditions.length) return ORDERS;
    return ORDERS.filter(r=>logic==="AND"?conditions.every(c=>evalCond(r,c)):conditions.some(c=>evalCond(r,c)));
  },[conditions,logic]);

  const addCond=()=>setConditions(c=>[...c,mkC()]);
  const remCond=id=>setConditions(c=>c.filter(x=>x.id!==id));
  const updCond=(id,p)=>setConditions(c=>c.map(x=>x.id===id?{...x,...p}:x));
  const loadPreset=p=>{setLogic(p.logic);setConditions(p.conds.map(c=>({...mkC(),...c})));};
  const toggleCol=k=>setVisibleCols(prev=>{const n=new Set(prev);n.has(k)?n.delete(k):n.add(k);return n;});

  const displayFields=ALL_FIELDS.filter(f=>visibleCols.has(f.key));
  const renderCell=(row,fd)=>{
    const raw=fd.computed?fd.computed(row):row[fd.key];
    if(fd.type==="bool") return <span style={{color:raw?th.success:th.faint}}>{raw?"Ano":"Ne"}</span>;
    if(fd.key==="status") return <StatusBadge status={raw}/>;
    if(fd.key==="id") return <a href="#" style={{color:th.accent,fontFamily:"monospace",fontSize:11}}>{raw}</a>;
    if(fd.type==="number") return <span style={{color:raw>0?th.text:th.faint}}>{fd.key.toLowerCase().includes("amount")||fd.key==="diffAmount"?fmt(raw):raw}</span>;
    return <span style={{color:th.text}}>{String(raw??"-")}</span>;
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Presets */}
      <Card>
        <div style={{fontSize:11,color:th.faint,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Rychlé předvolby</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {PRESETS.map(p=>(
            <button key={p.label} onClick={()=>loadPreset(p)} style={{background:th.presetBtn,border:`1px solid ${th.cardBorder}`,color:th.text,borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer",transition:"all .15s"}}
              onMouseEnter={e=>e.currentTarget.style.background=th.presetHover}
              onMouseLeave={e=>e.currentTarget.style.background=th.presetBtn}>{p.label}</button>
          ))}
        </div>
      </Card>

      {/* Conditions */}
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{color:th.text,fontWeight:600}}>Podmínky filtrování</span>
            <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:`1px solid ${th.andOr.border}`}}>
              {["AND","OR"].map(l=>(
                <button key={l} onClick={()=>setLogic(l)} style={{padding:"4px 14px",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",
                  background:logic===l?th.andOr.active:th.andOr.inactive,
                  color:logic===l?th.andOr.activeTxt:th.andOr.inactiveTxt,transition:"all .15s"}}>{l}</button>
              ))}
            </div>
            <span style={{color:th.faint,fontSize:12}}>{logic==="AND"?"Musí platit všechny":"Stačí jedna podmínka"}</span>
          </div>
          <button onClick={addCond} style={{background:th.accent,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:500,cursor:"pointer"}}>
            + Přidat podmínku
          </button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {conditions.map((cond,i)=>{
            const fd=ALL_FIELDS.find(f=>f.key===cond.field);
            const ops=OPS[fd?.type||"string"]||[];
            return (
              <div key={cond.id} style={{display:"flex",alignItems:"center",gap:8,background:th.condRow,border:`1px solid ${th.condBorder}`,borderRadius:8,padding:"8px 12px",flexWrap:"wrap"}}>
                <span style={{color:i===0?th.faint:logic==="AND"?"#6366f1":"#f59e0b",fontSize:11,fontWeight:700,width:28,textAlign:"center"}}>
                  {i===0?"KDE":logic}
                </span>
                <Sel value={cond.field} onChange={e=>{
                  const nfd=ALL_FIELDS.find(f=>f.key===e.target.value);
                  const nop=(OPS[nfd?.type||"string"]||[])[0]?.op||"eq";
                  updCond(cond.id,{field:e.target.value,op:nop,value:""});
                }}>
                  {ALL_FIELDS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                </Sel>
                <Sel value={cond.op} onChange={e=>updCond(cond.id,{op:e.target.value})}>
                  {ops.map(o=><option key={o.op} value={o.op}>{o.label}</option>)}
                </Sel>
                <ValueInput field={cond.field} op={cond.op} value={cond.value} onChange={v=>updCond(cond.id,{value:v})}/>
                {conditions.length>1&&<button onClick={()=>remCond(cond.id)} style={{marginLeft:"auto",background:"none",border:"none",color:th.faint,fontSize:20,cursor:"pointer",lineHeight:1,padding:"0 4px"}}
                  onMouseEnter={e=>e.currentTarget.style.color=th.danger}
                  onMouseLeave={e=>e.currentTarget.style.color=th.faint}>×</button>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Results */}
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:th.text,fontWeight:600}}>Výsledky</span>
            <Badge color={results.length>0?"blue":"gray"}>{results.length} záznamů</Badge>
          </div>
          <button onClick={()=>setShowColPicker(v=>!v)} style={{background:th.condRow,border:`1px solid ${th.cardBorder}`,color:th.text,borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer"}}>
            ⚙ Sloupce ({visibleCols.size})
          </button>
        </div>
        {showColPicker&&(
          <div style={{background:th.condRow,border:`1px solid ${th.condBorder}`,borderRadius:8,padding:12,marginBottom:12}}>
            <div style={{fontSize:11,color:th.faint,marginBottom:8,fontWeight:600}}>Zaškrtni sloupce k zobrazení</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {ALL_FIELDS.map(f=>(
                <label key={f.key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:th.text}}>
                  <input type="checkbox" checked={visibleCols.has(f.key)} onChange={()=>toggleCol(f.key)} style={{accentColor:"#6366f1"}}/>
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        )}
        <DataTable cols={displayFields.map(f=>({key:f.key,label:f.label,render:(row)=>renderCell(row,f)}))}
          rows={results} notes={notes} onNote={(id,v)=>setNotes(n=>({...n,[id]:v}))}/>
      </Card>
    </div>
  );
}

// ─── PIVOT ────────────────────────────────────────────────────────────────────
const PF=[{key:"dept",label:"Úsek"},{key:"financing",label:"Způsob financování"},{key:"type",label:"Druh OBJ"},{key:"approver",label:"Schvalovatel"},{key:"orderer",label:"Objednavatel"},{key:"status",label:"Stav"},{key:"supplier",label:"Dodavatel"}];
const PV=[{key:"amount",label:"Částka (Kč)",fn:a=>a.reduce((s,r)=>s+(r.amount||0),0)},{key:"invAmount",label:"Fa částka (Kč)",fn:a=>a.reduce((s,r)=>s+(r.invAmount||0),0)},{key:"count",label:"Počet",fn:a=>a.length}];

function PivotTable() {
  const th=useT();
  const [rf,setRf]=useState("dept"),[cf,setCf]=useState("financing"),[vf,setVf]=useState("count");
  const vd=PV.find(v=>v.key===vf);
  const rv=[...new Set(ORDERS.map(r=>r[rf]))].sort();
  const cv=[...new Set(ORDERS.map(r=>r[cf]))].sort();
  const cell=(r,c)=>vd.fn(ORDERS.filter(x=>x[rf]===r&&x[cf]===c));
  const fC=v=>vf==="count"?v:v.toLocaleString("cs-CZ");
  const hd={padding:"8px 12px",textAlign:"right",color:th.muted,fontWeight:500,borderBottom:`1px solid ${th.cardBorder}`,whiteSpace:"nowrap"};
  const td=(v,accent)=>({padding:"8px 12px",textAlign:"right",color:accent||th.text,borderBottom:`1px solid ${th.rowBorder}`});
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
        {[["Řádky",rf,setRf],["Sloupce",cf,setCf]].map(([l,v,s])=>(
          <div key={l}><div style={{fontSize:11,color:th.faint,marginBottom:4,fontWeight:600}}>{l}</div>
            <Sel value={v} onChange={e=>s(e.target.value)}>{PF.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</Sel></div>
        ))}
        <div><div style={{fontSize:11,color:th.faint,marginBottom:4,fontWeight:600}}>Hodnota</div>
          <Sel value={vf} onChange={e=>setVf(e.target.value)}>{PV.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</Sel></div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>
            <th style={{...hd,textAlign:"left",color:th.muted}}>{PF.find(f=>f.key===rf)?.label}</th>
            {cv.map(c=><th key={c} style={hd}>{c}</th>)}
            <th style={{...hd,color:th.accent}}>Celkem</th>
          </tr></thead>
          <tbody>{rv.map(r=>(
            <tr key={r} onMouseEnter={e=>e.currentTarget.style.background=th.rowHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{...td(0),textAlign:"left",fontWeight:500,color:th.text}}>{r}</td>
              {cv.map(c=>{const v=cell(r,c);return <td key={c} style={td(v,v>0?th.text:th.faint)}>{v?fC(v):"-"}</td>;})}
              <td style={td(0,th.accent)}><strong>{fC(vd.fn(ORDERS.filter(x=>x[rf]===r)))}</strong></td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{borderTop:`2px solid ${th.cardBorder}`}}>
            <td style={{...td(0,th.accent),textAlign:"left",fontWeight:700}}>Celkem</td>
            {cv.map(c=><td key={c} style={td(0,th.accent)}><strong>{fC(vd.fn(ORDERS.filter(x=>x[cf]===c)))}</strong></td>)}
            <td style={td(0,th.accent)}><strong>{fC(vd.fn(ORDERS))}</strong></td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── CHART BUILDER ───────────────────────────────────────────────────────────
function ChartBuilder() {
  const th=useT();
  const [groupBy,setGroupBy]=useState("dept"),[metric,setMetric]=useState("amount"),[ct,setCt]=useState("bar");
  const md=PV.find(v=>v.key===metric);
  const groups=[...new Set(ORDERS.map(r=>r[groupBy]))].sort();
  const data=groups.map(g=>({name:g,value:md.fn(ORDERS.filter(r=>r[groupBy]===g))})).sort((a,b)=>b.value-a.value);
  const tip={contentStyle:{background:th.tooltipBg,border:`1px solid ${th.tooltipBorder}`,borderRadius:8},labelStyle:{color:th.tooltipText}};
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
        <div><div style={{fontSize:11,color:th.faint,marginBottom:4,fontWeight:600}}>Seskupit podle</div>
          <Sel value={groupBy} onChange={e=>setGroupBy(e.target.value)}>{PF.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</Sel></div>
        <div><div style={{fontSize:11,color:th.faint,marginBottom:4,fontWeight:600}}>Metrika</div>
          <Sel value={metric} onChange={e=>setMetric(e.target.value)}>{PV.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</Sel></div>
        <div><div style={{fontSize:11,color:th.faint,marginBottom:4,fontWeight:600}}>Typ grafu</div>
          <div style={{display:"flex",gap:8,marginTop:4}}>
            {["bar","pie"].map(t=><button key={t} onClick={()=>setCt(t)} style={{padding:"5px 12px",borderRadius:6,fontSize:13,fontWeight:500,cursor:"pointer",border:`1px solid ${th.cardBorder}`,background:ct===t?"#6366f1":th.condRow,color:ct===t?"#fff":th.text,transition:"all .15s"}}>{t==="bar"?"Sloupcový":"Koláčový"}</button>)}
          </div></div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        {ct==="bar"?(
          <BarChart data={data} margin={{left:20}}>
            <CartesianGrid strokeDasharray="3 3" stroke={th.rowBorder}/>
            <XAxis dataKey="name" tick={{fill:th.muted,fontSize:11}}/>
            <YAxis tick={{fill:th.muted,fontSize:11}} tickFormatter={v=>metric==="count"?v:(v/1000)+"k"}/>
            <Tooltip formatter={v=>metric==="count"?v:fmt(v)} {...tip}/>
            <Bar dataKey="value" radius={[4,4,0,0]}>{data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
          </BarChart>
        ):(
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
              label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={{stroke:th.faint}}>
              {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie>
            <Tooltip formatter={v=>metric==="count"?v:fmt(v)} {...tip}/>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ─── FK ──────────────────────────────────────────────────────────────────────
function FinancniKontrola() {
  const th=useT();
  const [notes,setNotes]=useState({});
  const baseCols=[
    {key:"id",label:"Ev. číslo",render:r=><a href="#" style={{color:th.accent,fontFamily:"monospace",fontSize:11}}>{r.id}</a>},
    {key:"orderer",label:"Objednavatel"},{key:"approver",label:"Příkazce"},{key:"financing",label:"Financování"},
  ];
  const sections=[
    {title:"1. Fa vyšší než schválená OBJ",data:ORDERS.filter(r=>r.invAmount>r.amount&&r.amount>0),cols:[...baseCols,
      {key:"amount",label:"Max cena",render:r=><span style={{color:th.text}}>{fmt(r.amount)}</span>},
      {key:"invAmount",label:"Fa cena",render:r=><span style={{color:th.danger,fontWeight:600}}>{fmt(r.invAmount)}</span>},
      {key:"diff",label:"Rozdíl",render:r=><span style={{color:th.warn}}>{fmt(r.invAmount-r.amount)}</span>},
    ]},
    {title:"2. OBJ vytvořena po doručení Fa",data:ORDERS.filter(r=>r.invoiceDate&&r.invoiceDate<r.orderDate),cols:[...baseCols,
      {key:"invoiceDate",label:"Fa doručena",render:r=><span style={{color:th.warn}}>{r.invoiceDate}</span>},
      {key:"orderDate",label:"OBJ vytvořena"},{key:"invAmount",label:"Fa cena",render:r=><span>{fmt(r.invAmount)}</span>},
    ]},
    {title:"3. Objednávky – Faktury bez přílohy",data:ORDERS.filter(r=>!r.hasAttachment&&r.status!=="Stornováno"),cols:[...baseCols,{key:"amount",label:"Max cena",render:r=><span>{fmt(r.amount)}</span>}]},
    {title:"4. Faktury bez přílohy",data:ORDERS.filter(r=>!r.hasAttachment&&r.hasInvoice),cols:[...baseCols,{key:"invAmount",label:"Částka",render:r=><span>{fmt(r.invAmount)}</span>}]},
    {title:"5. Faktury >14 dní po splatnosti",data:ORDERS.filter(r=>r.daysOverdue>14),cols:[...baseCols,
      {key:"invAmount",label:"Částka",render:r=><span>{fmt(r.invAmount)}</span>},
      {key:"daysOverdue",label:"Dní po spl.",render:r=><span style={{color:th.danger,fontWeight:700}}>{r.daysOverdue}</span>},
      {key:"status",label:"Stav",render:r=><StatusBadge status={r.status}/>},
    ]},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {sections.map(s=>(
        <Card key={s.title}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:th.text,fontWeight:600}}>{s.title}</span>
            <Badge color={s.data.length>0?"red":"green"}>{s.data.length} záznamů</Badge>
          </div>
          <DataTable cols={s.cols} rows={s.data} notes={notes} onNote={(id,v)=>setNotes(n=>({...n,[id]:v}))}/>
        </Card>
      ))}
    </div>
  );
}

// ─── ČERPÁNÍ ─────────────────────────────────────────────────────────────────
function Cerpani() {
  const th=useT();
  const tip={contentStyle:{background:th.tooltipBg,border:`1px solid ${th.tooltipBorder}`,borderRadius:8},labelStyle:{color:th.tooltipText}};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
        {[
          {label:"Celkový plán LP",value:fmt(FINANCING_PLAN.reduce((s,r)=>s+r.planned,0)),color:"#6366f1"},
          {label:"Skutečné čerpání",value:fmt(FINANCING_PLAN.reduce((s,r)=>s+r.actual,0)),color:th.success},
          {label:"Zbývá čerpat",value:fmt(FINANCING_PLAN.reduce((s,r)=>s+(r.planned-r.actual),0)),color:th.warn},
        ].map(c=>(
          <Card key={c.label} style={{padding:16}}>
            <div style={{color:th.muted,fontSize:12,marginBottom:4}}>{c.label}</div>
            <div style={{color:c.color,fontSize:22,fontWeight:700}}>{c.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{color:th.text,fontWeight:600,marginBottom:12}}>Čerpání podle LP / úseků</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={FINANCING_PLAN} margin={{left:20}}>
            <CartesianGrid strokeDasharray="3 3" stroke={th.rowBorder}/>
            <XAxis dataKey="name" tick={{fill:th.muted,fontSize:11}}/>
            <YAxis tick={{fill:th.muted,fontSize:11}} tickFormatter={v=>(v/1000)+"k"}/>
            <Tooltip formatter={v=>fmt(v)} {...tip}/><Legend wrapperStyle={{color:th.muted}}/>
            <Bar dataKey="planned" name="Plánováno" fill="#6366f1" radius={[4,4,0,0]} opacity={0.5}/>
            <Bar dataKey="actual" name="Čerpáno" fill="#22d3ee" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div style={{color:th.text,fontWeight:600,marginBottom:12}}>Detail čerpání</div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["LP / Úsek","Plánováno","Čerpáno","Zbývá","% čerpání"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 12px",color:th.muted,fontWeight:500,borderBottom:`1px solid ${th.cardBorder}`}}>{h}</th>)}</tr></thead>
          <tbody>{FINANCING_PLAN.map(r=>{const p=Math.round(r.actual/r.planned*100);return(
            <tr key={r.name} onMouseEnter={e=>e.currentTarget.style.background=th.rowHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"8px 12px",color:th.text,fontWeight:500,borderBottom:`1px solid ${th.rowBorder}`}}>{r.name}</td>
              <td style={{padding:"8px 12px",color:th.muted,borderBottom:`1px solid ${th.rowBorder}`}}>{fmt(r.planned)}</td>
              <td style={{padding:"8px 12px",color:"#22d3ee",borderBottom:`1px solid ${th.rowBorder}`}}>{fmt(r.actual)}</td>
              <td style={{padding:"8px 12px",color:th.warn,borderBottom:`1px solid ${th.rowBorder}`}}>{fmt(r.planned-r.actual)}</td>
              <td style={{padding:"8px 12px",borderBottom:`1px solid ${th.rowBorder}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:80,background:th.progressTrack,borderRadius:4,height:6}}>
                    <div style={{height:6,borderRadius:4,width:`${p}%`,background:p>90?th.danger:p>60?th.warn:"#22d3ee"}}/>
                  </div>
                  <span style={{color:th.muted,fontSize:12}}>{p}%</span>
                </div>
              </td>
            </tr>
          );})}
          </tbody>
        </table></div>
      </Card>
    </div>
  );
}

// ─── STATISTIKY ──────────────────────────────────────────────────────────────
function Statistiky() {
  const th=useT();
  const tip={contentStyle:{background:th.tooltipBg,border:`1px solid ${th.tooltipBorder}`,borderRadius:8},labelStyle:{color:th.tooltipText}};
  const supplierData=Object.entries(ORDERS.reduce((a,r)=>{a[r.supplier]=(a[r.supplier]||0)+(r.invAmount||0);return a;},{}))
    .map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  const typeData=Object.entries(ORDERS.reduce((a,r)=>{a[r.type]=(a[r.type]||0)+1;return a;},{})).map(([name,value])=>({name,value}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        <Card>
          <div style={{color:th.text,fontWeight:600,marginBottom:12}}>Top dodavatelé (dle částky)</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={supplierData} layout="vertical" margin={{left:10,right:30}}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.rowBorder}/>
              <XAxis type="number" tick={{fill:th.muted,fontSize:10}} tickFormatter={v=>(v/1000)+"k"}/>
              <YAxis dataKey="name" type="category" tick={{fill:th.muted,fontSize:10}} width={90}/>
              <Tooltip formatter={v=>fmt(v)} {...tip}/>
              <Bar dataKey="value" radius={[0,4,4,0]}>{supplierData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{color:th.text,fontWeight:600,marginBottom:12}}>Druhy objednávek</div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={({name,value})=>`${name}: ${value}`} labelLine={{stroke:th.faint}}>
                {typeData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip {...tip}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card>
        <div style={{color:th.text,fontWeight:600,marginBottom:12}}>📊 Dynamický průzkum dat</div>
        <ChartBuilder/>
      </Card>
    </div>
  );
}

// ─── REPORTY ─────────────────────────────────────────────────────────────────
function Reporty() {
  const th=useT();
  const [notes,setNotes]=useState({});
  const topS=Object.entries(ORDERS.reduce((acc,r)=>{
    if(!acc[r.supplier])acc[r.supplier]={lp:0,smlouva:0,indiv:0};
    const k=r.financing==="LP"?"lp":r.financing==="Smlouva"?"smlouva":"indiv";
    acc[r.supplier][k]+=(r.invAmount||0);return acc;
  },{})).map(([name,v])=>({name,...v,total:v.lp+v.smlouva+v.indiv})).sort((a,b)=>b.total-a.total);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{color:th.text,fontWeight:600}}>OBJ bez Fa – Schváleno 2+ měs.</span>
          <Badge color="yellow">{ORDERS.filter(r=>!r.hasInvoice&&r.status==="Schváleno").length}</Badge>
        </div>
        <DataTable cols={[
          {key:"id",label:"Ev. číslo",render:r=><a href="#" style={{color:th.accent,fontFamily:"monospace",fontSize:11}}>{r.id}</a>},
          {key:"subject",label:"Předmět"},{key:"status",label:"Stav",render:r=><StatusBadge status={r.status}/>},
          {key:"orderer",label:"Objednavatel"},{key:"amount",label:"Částka",render:r=><span>{fmt(r.amount)}</span>},
        ]} rows={ORDERS.filter(r=>!r.hasInvoice&&r.status==="Schváleno")} notes={notes} onNote={(id,v)=>setNotes(n=>({...n,[id]:v}))}/>
      </Card>
      <Card>
        <div style={{color:th.text,fontWeight:600,marginBottom:12}}>Top dodavatelé – LP vs Smlouva vs Indiv.</div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["#","Dodavatel","LP","Smlouva","Indiv.","Celkem"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"8px 12px",color:th.muted,fontWeight:500,borderBottom:`1px solid ${th.cardBorder}`}}>{h}</th>
          ))}</tr></thead>
          <tbody>{topS.map((r,i)=>(
            <tr key={r.name} onMouseEnter={e=>e.currentTarget.style.background=th.rowHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"8px 12px",color:th.faint,borderBottom:`1px solid ${th.rowBorder}`}}>{i+1}</td>
              <td style={{padding:"8px 12px",color:th.text,fontWeight:500,borderBottom:`1px solid ${th.rowBorder}`}}>{r.name}</td>
              <td style={{padding:"8px 12px",color:"#6366f1",borderBottom:`1px solid ${th.rowBorder}`}}>{r.lp?fmt(r.lp):"-"}</td>
              <td style={{padding:"8px 12px",color:"#22d3ee",borderBottom:`1px solid ${th.rowBorder}`}}>{r.smlouva?fmt(r.smlouva):"-"}</td>
              <td style={{padding:"8px 12px",color:th.warn,borderBottom:`1px solid ${th.rowBorder}`}}>{r.indiv?fmt(r.indiv):"-"}</td>
              <td style={{padding:"8px 12px",color:th.text,fontWeight:700,borderBottom:`1px solid ${th.rowBorder}`}}>{fmt(r.total)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS=[
  {id:"query", label:"Vlastní filtr",     icon:"🔧",comp:QueryBuilder},
  {id:"fk",    label:"Finanční kontrola", icon:"🔍",comp:FinancniKontrola},
  {id:"cerpani",label:"Čerpání",          icon:"💰",comp:Cerpani},
  {id:"stat",  label:"Statistiky",        icon:"📊",comp:Statistiky},
  {id:"rep",   label:"Reporty",           icon:"📋",comp:Reporty},
  {id:"pivot", label:"Kont. tabulka",     icon:"🧮",comp:()=><Card><div style={{fontSize:16,fontWeight:600,marginBottom:4}}>Kontingenční tabulka</div><p style={{fontSize:13,color:"#64748b",marginBottom:16}}>Dynamicky nastavte řádky, sloupce a agregovanou hodnotu.</p><PivotTable/></Card>},
];

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("query");
  const [dark,setDark]=useState(false);
  const th=dark?DARK:LIGHT;
  const ActiveComp=TABS.find(t=>t.id===tab)?.comp;
  return (
    <ThemeCtx.Provider value={th}>
      <div style={{minHeight:"100vh",background:th.bg,color:th.text,fontFamily:"system-ui,sans-serif"}}>
        {/* Header */}
        <div style={{background:th.headerBg,borderBottom:`1px solid ${th.headerBorder}`,padding:"14px 24px"}}>
          <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:th.text}}>Reporty a analýzy</div>
              <div style={{fontSize:12,color:th.muted}}>Finanční kontrola · ZZS</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              {[
                {label:"Rizika",v:ORDERS.filter(r=>r.invAmount>r.amount&&r.amount>0).length,c:th.danger},
                {label:"Po splatnosti",v:ORDERS.filter(r=>r.daysOverdue>14).length,c:th.warn},
                {label:"Bez přílohy",v:ORDERS.filter(r=>!r.hasAttachment&&r.hasInvoice).length,c:th.warn},
                {label:"Celkem OBJ",v:ORDERS.length,c:th.text},
              ].map(k=>(
                <div key={k.label} style={{textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:700,color:k.c,lineHeight:1.2}}>{k.v}</div>
                  <div style={{fontSize:11,color:th.faint}}>{k.label}</div>
                </div>
              ))}
              {/* Toggle */}
              <button onClick={()=>setDark(d=>!d)} title={dark?"Světlý režim":"Tmavý režim"}
                style={{background:th.condRow,border:`1px solid ${th.cardBorder}`,borderRadius:20,padding:"6px 14px",cursor:"pointer",color:th.text,fontSize:13,display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
                {dark?"☀️ Světlý":"🌙 Tmavý"}
              </button>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{background:th.headerBg,borderBottom:`1px solid ${th.headerBorder}`,padding:"0 24px"}}>
          <div style={{maxWidth:1200,margin:"0 auto",display:"flex",gap:2,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                padding:"12px 16px",fontSize:13,fontWeight:500,border:"none",background:"none",cursor:"pointer",
                whiteSpace:"nowrap",transition:"all .15s",
                borderBottom:`2px solid ${tab===t.id?th.tabBorder:"transparent"}`,
                color:tab===t.id?th.tabActive:th.muted,
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>
        {/* Content */}
        <div style={{maxWidth:1200,margin:"0 auto",padding:"24px"}}>
          {ActiveComp&&<ActiveComp/>}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
import { useState, useEffect, useRef, memo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ─── Data ────────────────────────────────────────────────────────────────────
const CATS = {
  checking:   { income:["Paycheck","Direct Deposit","Transfer In","Freelance","Refund","Interest","Other Income"], expense:["Groceries","Gas","Electric","Internet","Water","Insurance","Rent/Mortgage","Dining","Entertainment","Healthcare","Shopping","Clothing","Transfer Out","ATM","Subscriptions","Other"] },
  credit:     { income:["Payment","Refund","Credit","Cashback"],                                                   expense:["Groceries","Gas","Dining","Entertainment","Healthcare","Shopping","Travel","Subscriptions","Online","Clothing","Utilities","Other"] },
  investment: { income:["Contribution","Dividend","Interest","Capital Gain","Transfer In"],                        expense:["Withdrawal","Transfer Out","Fee","Tax"] }
};
const TYPE_LABEL = { checking:{income:"Income",expense:"Expense"}, credit:{income:"Payment",expense:"Purchase"}, investment:{income:"Deposit",expense:"Withdrawal"} };
const ACCT_COLORS = ["#22c55e","#60a5fa","#f472b6","#fb923c","#c084fc","#34d399","#fbbf24","#38bdf8","#a78bfa"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt    = n  => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const uid    = () => Date.now().toString(36)+Math.random().toString(36).slice(2);
const today  = () => new Date().toISOString().split("T")[0];
const thisMo = () => today().slice(0,7);
const moLbl  = ym => new Date(ym+"-15").toLocaleString("default",{month:"long",year:"numeric"});
function daysUntil(day){const now=new Date();now.setHours(0,0,0,0);let t=new Date(now.getFullYear(),now.getMonth(),day);if(t<=now)t.setMonth(t.getMonth()+1);return Math.ceil((t-now)/86400000);}
function acctBal(acct,txs){const mine=txs.filter(t=>t.accountId===acct.id);const inc=mine.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);const exp=mine.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);return acct.type==="credit"?(acct.startBal||0)+exp-inc:(acct.startBal||0)+inc-exp;}

// ─── Palette & Styles ────────────────────────────────────────────────────────
const C={bg:"#05100a",surface:"#0c1a0f",card:"#111f14",border:"#1a2e1e",accent:"#22c55e",income:"#4ade80",expense:"#f87171",warn:"#fbbf24",txt:"#ecfdf5",txt2:"#86efac",muted:"#3d6147"};
const S={
  hdr:  {padding:"18px 18px 13px",borderBottom:`1px solid ${C.border}`},
  ht:   {fontFamily:"'Fraunces',serif",fontSize:22,color:C.accent,margin:0},
  hs:   {fontSize:10,color:C.muted,margin:"2px 0 0",letterSpacing:2},
  card: {background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:15,margin:"0 15px 11px"},
  sec:  {fontFamily:"'Fraunces',serif",fontSize:15,color:C.txt2,padding:"14px 15px 7px",margin:0},
  lbl:  {fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",margin:"0 0 6px"},
  row:  {display:"flex",alignItems:"center",justifyContent:"space-between"},
  txRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`},
  inp:  {background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 11px",color:C.txt,fontFamily:"'JetBrains Mono',monospace",fontSize:16,width:"100%",boxSizing:"border-box",outline:"none"},
  btn:  {background:C.accent,color:"#05100a",border:"none",borderRadius:8,padding:"9px 18px",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:13,cursor:"pointer"},
  ghost:{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 14px",color:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:12,cursor:"pointer"},
  del:  {background:"none",border:"none",color:C.expense,cursor:"pointer",fontSize:17,padding:"0 3px",lineHeight:1},
  edit: {background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:"0 3px"},
};
const nb=a=>({background:"none",border:"none",color:a?C.accent:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:"3px 10px",transition:"color .2s"});

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: HOME
// ═════════════════════════════════════════════════════════════════════════════
const HomeScreen = memo(({accts,txs,recs,netWorth,logRec,goAccounts}) => {
  const mo=txs.filter(t=>t.date.startsWith(thisMo()));
  const moInc=mo.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const moExp=mo.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const recent=[...txs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const alerts=accts.filter(a=>a.type==="credit").flatMap(a=>{const out=[];if(a.closingDay){const d=daysUntil(a.closingDay);out.push({label:"Closing",days:d,name:a.name,color:a.color});}if(a.dueDay){const d=daysUntil(a.dueDay);out.push({label:"Due",days:d,name:a.name,color:a.color});}return out;}).sort((a,b)=>a.days-b.days).slice(0,5);
  return (
    <div>
      <div style={S.hdr}><p style={S.ht}>Ledger</p><p style={S.hs}>PERSONAL FINANCE</p></div>
      <div style={{...S.card,marginTop:14}}>
        <p style={S.lbl}>Net Worth</p>
        <p style={{fontFamily:"'Fraunces',serif",fontSize:38,fontWeight:700,margin:"4px 0 0",color:netWorth>=0?C.income:C.expense}}>{fmt(netWorth)}</p>
        <div style={{display:"flex",gap:10,marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          {[["Income",moInc,C.income,"+"],[" Expenses",moExp,C.expense,"−"],["Free Cash",moInc-moExp,(moInc-moExp)>=0?C.income:C.expense,(moInc-moExp)>=0?"+":""]].map(([l,v,c,p])=>(
            <div key={l} style={{flex:1}}><p style={S.lbl}>{l}</p><p style={{margin:0,fontWeight:700,color:c,fontSize:12}}>{p}{fmt(v)}</p></div>
          ))}
        </div>
      </div>
      {alerts.length>0&&(
        <><p style={S.sec}>Upcoming Dates</p>
        <div style={{display:"flex",gap:8,padding:"0 15px 11px",overflowX:"auto",scrollbarWidth:"none"}}>
          {alerts.map((a,i)=>{const uc=a.days<=3?C.expense:a.days<=7?C.warn:C.income;return(
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${a.color}`,borderRadius:10,padding:"10px 13px",minWidth:115,flexShrink:0}}>
              <p style={{margin:0,fontSize:10,color:C.muted,letterSpacing:1}}>{a.label.toUpperCase()}</p>
              <p style={{margin:"3px 0 0",fontSize:11,color:C.txt2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:108}}>{a.name}</p>
              <p style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,margin:"4px 0 0",color:uc}}>{a.days}<span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}> days</span></p>
            </div>);})}
        </div></>
      )}
      {accts.length>0&&(
        <><p style={S.sec}>Accounts</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 15px 4px"}}>
          {accts.map(a=>{const bal=acctBal(a,txs);return(
            <div key={a.id} style={{...S.card,margin:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:5,height:36,borderRadius:3,background:a.color,flexShrink:0}}/>
                <div><p style={{margin:0,fontSize:13}}>{a.name}</p><p style={{margin:"2px 0 0",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>{a.type}{a.type==="credit"&&a.dueDay?` · Due ${a.dueDay}th`:""}</p></div>
              </div>
              <p style={{margin:0,fontWeight:700,fontSize:14,color:a.type==="credit"?C.expense:C.income}}>{a.type==="credit"?"Owed: ":""}{fmt(bal)}</p>
            </div>);})}
        </div></>
      )}
      {recs.length>0&&(
        <><p style={S.sec}>Quick Log</p>
        <div style={{...S.card,padding:"0 15px"}}>
          {recs.map(r=>{const a=accts.find(x=>x.id===r.accountId);return(
            <div key={r.id} style={S.txRow}>
              <div style={{flex:1}}><p style={{margin:0,fontSize:13}}>{r.label||r.category}</p><p style={{margin:"2px 0 0",fontSize:11,color:C.muted}}>{a&&a.name} · {r.frequency}</p></div>
              <p style={{margin:"0 10px",fontWeight:700,fontSize:13,color:r.type==="income"?C.income:C.expense}}>{r.type==="income"?"+":"−"}{fmt(r.amount)}</p>
              <button onClick={()=>logRec(r)} style={{...S.btn,padding:"5px 10px",fontSize:11}}>Log</button>
            </div>);})}
        </div></>
      )}
      <p style={S.sec}>Recent Activity</p>
      <div style={{...S.card,padding:"0 15px"}}>
        {recent.length===0
          ?<p style={{color:C.muted,padding:"20px 0",textAlign:"center",fontSize:12}}>{accts.length===0?"Add an account to get started.":"No transactions yet."}</p>
          :recent.map(tx=>{const a=accts.find(x=>x.id===tx.accountId);return(
            <div key={tx.id} style={S.txRow}>
              <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13}}>{tx.category}</p><p style={{margin:"2px 0 0",fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.date} · {a&&a.name||"—"}</p></div>
              <p style={{margin:0,fontWeight:700,fontSize:13,color:tx.type==="income"?C.income:C.expense}}>{tx.type==="income"?"+":"−"}{fmt(tx.amount)}</p>
            </div>);})}
      </div>
      {accts.length===0&&<div style={{textAlign:"center",padding:"20px 16px"}}><button onClick={goAccounts} style={{...S.btn,padding:"12px 28px",fontSize:14}}>+ Add Your First Account</button></div>}
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: ADD TRANSACTION  — local state so keyboard stays open
// ═════════════════════════════════════════════════════════════════════════════
const AddScreen = memo(({accts, editTx, onSave, onCancel}) => {
  const blank = {accountId:"",type:"expense",amount:"",category:"",date:today(),note:""};
  const [form, setForm] = useState(editTx ? {accountId:editTx.accountId,type:editTx.type,amount:String(editTx.amount),category:editTx.category,date:editTx.date,note:editTx.note} : blank);

  // If editTx changes (new edit started), sync form
  useEffect(()=>{
    if(editTx) setForm({accountId:editTx.accountId,type:editTx.type,amount:String(editTx.amount),category:editTx.category,date:editTx.date,note:editTx.note});
    else setForm(blank);
  },[editTx]);

  const selA = accts.find(a=>a.id===form.accountId);
  const cats = selA ? ((CATS[selA.type]||{})[form.type]||[]) : [];

  const handleSave = () => {
    const amt=parseFloat(form.amount);
    if(!amt||isNaN(amt)||!form.accountId||!form.category) return;
    onSave({...form, amount:amt, id:editTx?editTx.id:uid()});
  };

  return (
    <div>
      <div style={S.hdr}><p style={S.ht}>{editTx?"Edit":"Add"} Transaction</p><p style={S.hs}>EVERY PENNY COUNTS</p></div>
      <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
        <div><p style={S.lbl}>Account</p>
          {accts.length===0
            ?<p style={{color:C.expense,fontSize:13}}>Go to Accounts and add an account first.</p>
            :<select value={form.accountId} onChange={e=>setForm(f=>({...f,accountId:e.target.value,type:"expense",category:""}))} style={S.inp}>
              <option value="">Select account…</option>
              {accts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          }
        </div>
        {selA&&<>
          <div><p style={S.lbl}>Type</p>
            <div style={{display:"flex",gap:8}}>
              {["income","expense"].map(t=>{
                const l=(TYPE_LABEL[selA.type]||{})[t]||t;
                return <button key={t} onClick={()=>setForm(f=>({...f,type:t,category:""}))} style={{flex:1,padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'JetBrains Mono',monospace",background:form.type===t?(t==="income"?C.income:C.expense):C.card,color:form.type===t?"#05100a":C.muted,border:`1px solid ${form.type===t?(t==="income"?C.income:C.expense):C.border}`}}>{l}</button>;
              })}
            </div>
          </div>
          <div><p style={S.lbl}>Amount ($)</p>
            <input type="number" inputMode="decimal" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...S.inp,fontSize:30,textAlign:"center",fontWeight:700,padding:14}}/>
          </div>
          <div><p style={S.lbl}>Category</p>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={S.inp}>
              <option value="">Select category…</option>
              {cats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><p style={S.lbl}>Date</p>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={S.inp}/>
          </div>
          <div><p style={S.lbl}>Note (optional)</p>
            <input type="text" placeholder="What was this for?" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={S.inp}/>
          </div>
          <button onClick={handleSave} style={{...S.btn,width:"100%",padding:14,fontSize:15}}>{editTx?"Update":"Add Transaction"}</button>
          {editTx&&<button onClick={onCancel} style={{...S.ghost,width:"100%",padding:12}}>Cancel</button>}
        </>}
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: ACCOUNTS  — local state for forms
// ═════════════════════════════════════════════════════════════════════════════
const AccountsScreen = memo(({accts, txs, recs, onSaveAcct, onDeleteAcct, onSaveRec, onDeleteRec, onLogRec}) => {
  const [view,   setView]   = useState("list"); // list | addAcct | editAcct | addRec
  const [pendDel,setPendDel]= useState(null);

  const blankA={name:"",type:"checking",startBal:"",closingDay:"",dueDay:"",color:ACCT_COLORS[0]};
  const [aForm, setAForm] = useState(blankA);
  const [editAId,setEditAId]= useState(null);

  const blankR={accountId:"",type:"expense",amount:"",category:"",label:"",frequency:"monthly",dayOfMonth:"1"};
  const [rForm, setRForm] = useState(blankR);

  const startEditAcct = a => { setAForm({name:a.name,type:a.type,startBal:String(a.startBal||0),closingDay:String(a.closingDay||""),dueDay:String(a.dueDay||""),color:a.color}); setEditAId(a.id); setView("editAcct"); };

  const handleSaveAcct = () => {
    if(!aForm.name.trim()) return;
    onSaveAcct({id:editAId||uid(),name:aForm.name.trim(),type:aForm.type,startBal:parseFloat(aForm.startBal)||0,closingDay:aForm.type==="credit"?parseInt(aForm.closingDay)||null:null,dueDay:aForm.type==="credit"?parseInt(aForm.dueDay)||null:null,color:aForm.color||ACCT_COLORS[accts.length%ACCT_COLORS.length]},editAId);
    setAForm(blankA); setEditAId(null); setView("list");
  };

  const handleSaveRec = () => {
    const amt=parseFloat(rForm.amount);
    if(!amt||isNaN(amt)||!rForm.accountId||!rForm.category) return;
    onSaveRec({id:uid(),accountId:rForm.accountId,type:rForm.type,amount:amt,category:rForm.category,label:rForm.label.trim(),frequency:rForm.frequency,dayOfMonth:parseInt(rForm.dayOfMonth)||1});
    setRForm(blankR); setView("list");
  };

  const doDelete = () => { onDeleteAcct(pendDel); setPendDel(null); };

  // ── Add/Edit Account form ──
  if(view==="addAcct"||view==="editAcct") return (
    <div>
      <div style={S.hdr}><p style={S.ht}>{view==="editAcct"?"Edit Account":"New Account"}</p><p style={S.hs}>CONFIGURE YOUR ACCOUNT</p></div>
      <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
        <div><p style={S.lbl}>Account Name</p>
          <input placeholder="e.g. Chase Checking, Amex Gold, Fidelity 401k" value={aForm.name} onChange={e=>setAForm(f=>({...f,name:e.target.value}))} style={S.inp}/>
        </div>
        <div><p style={S.lbl}>Account Type</p>
          <div style={{display:"flex",gap:8}}>
            {[["checking","Checking"],["credit","Credit Card"],["investment","Investment"]].map(([v,l])=>(
              <button key={v} onClick={()=>setAForm(f=>({...f,type:v}))} style={{flex:1,padding:"9px 4px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"'JetBrains Mono',monospace",background:aForm.type===v?C.accent:C.card,color:aForm.type===v?"#05100a":C.muted,border:`1px solid ${aForm.type===v?C.accent:C.border}`}}>{l}</button>
            ))}
          </div>
        </div>
        <div><p style={S.lbl}>{aForm.type==="credit"?"Current Balance Owed ($)":"Current Balance ($)"}</p>
          <input type="number" inputMode="decimal" placeholder="0.00" value={aForm.startBal} onChange={e=>setAForm(f=>({...f,startBal:e.target.value}))} style={S.inp}/>
          <p style={{fontSize:10,color:C.muted,margin:"4px 0 0"}}>{aForm.type==="credit"?"How much you currently owe on this card.":"Your current account balance."}</p>
        </div>
        {aForm.type==="credit"&&(
          <div style={{...S.card,margin:0,display:"flex",flexDirection:"column",gap:12}}>
            <p style={{margin:0,fontSize:12,color:C.txt2,fontWeight:700}}>Billing Cycle Dates</p>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}><p style={S.lbl}>Closing Day</p><input type="number" inputMode="numeric" min="1" max="31" placeholder="e.g. 21" value={aForm.closingDay} onChange={e=>setAForm(f=>({...f,closingDay:e.target.value}))} style={S.inp}/><p style={{fontSize:10,color:C.muted,margin:"4px 0 0"}}>Last day of billing cycle</p></div>
              <div style={{flex:1}}><p style={S.lbl}>Payment Due Day</p><input type="number" inputMode="numeric" min="1" max="31" placeholder="e.g. 15" value={aForm.dueDay} onChange={e=>setAForm(f=>({...f,dueDay:e.target.value}))} style={S.inp}/><p style={{fontSize:10,color:C.muted,margin:"4px 0 0"}}>When payment is due</p></div>
            </div>
          </div>
        )}
        <div><p style={S.lbl}>Color</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ACCT_COLORS.map(c=><button key={c} onClick={()=>setAForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,border:aForm.color===c?"3px solid white":"3px solid transparent",cursor:"pointer",padding:0}}/>)}</div>
        </div>
        <button onClick={handleSaveAcct} style={{...S.btn,width:"100%",padding:13}}>{view==="editAcct"?"Update Account":"Add Account"}</button>
        <button onClick={()=>{setAForm(blankA);setEditAId(null);setView("list");}} style={{...S.ghost,width:"100%",padding:12}}>Cancel</button>
      </div>
    </div>
  );

  // ── Add Recurring form ──
  if(view==="addRec") {
    const selA=accts.find(a=>a.id===rForm.accountId);
    const cats=selA?((CATS[selA.type]||{})[rForm.type]||[]):[];
    return (
      <div>
        <div style={S.hdr}><p style={S.ht}>New Recurring</p><p style={S.hs}>AUTOMATIC TRANSACTION</p></div>
        <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
          <div><p style={S.lbl}>Account</p>
            <select value={rForm.accountId} onChange={e=>{const a=accts.find(x=>x.id===e.target.value);setRForm(f=>({...f,accountId:e.target.value,type:a&&a.type==="credit"?"expense":f.type,category:""}));}} style={S.inp}>
              <option value="">Select account…</option>
              {accts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          {selA&&<div><p style={S.lbl}>Type</p>
            <div style={{display:"flex",gap:8}}>
              {["income","expense"].map(t=>{
                const l=(TYPE_LABEL[selA.type]||{})[t]||t;
                return <button key={t} onClick={()=>setRForm(f=>({...f,type:t,category:""}))} style={{flex:1,padding:"9px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"'JetBrains Mono',monospace",background:rForm.type===t?(t==="income"?C.income:C.expense):C.card,color:rForm.type===t?"#05100a":C.muted,border:`1px solid ${rForm.type===t?(t==="income"?C.income:C.expense):C.border}`}}>{l}</button>;
              })}
            </div>
          </div>}
          <div><p style={S.lbl}>Label</p>
            <input placeholder="e.g. Bi-weekly Paycheck, Netflix, Electric Bill" value={rForm.label} onChange={e=>setRForm(f=>({...f,label:e.target.value}))} style={S.inp}/>
          </div>
          <div><p style={S.lbl}>Category</p>
            <select value={rForm.category} onChange={e=>setRForm(f=>({...f,category:e.target.value}))} style={S.inp} disabled={!selA}>
              <option value="">Select category…</option>
              {cats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><p style={S.lbl}>Amount ($)</p>
            <input type="number" inputMode="decimal" placeholder="0.00" min="0" step="0.01" value={rForm.amount} onChange={e=>setRForm(f=>({...f,amount:e.target.value}))} style={S.inp}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><p style={S.lbl}>Frequency</p>
              <select value={rForm.frequency} onChange={e=>setRForm(f=>({...f,frequency:e.target.value}))} style={S.inp}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {(rForm.frequency==="monthly"||rForm.frequency==="biweekly")&&
              <div style={{flex:1}}><p style={S.lbl}>Day of Month</p>
                <input type="number" inputMode="numeric" min="1" max="31" placeholder="1" value={rForm.dayOfMonth} onChange={e=>setRForm(f=>({...f,dayOfMonth:e.target.value}))} style={S.inp}/>
              </div>
            }
          </div>
          <button onClick={handleSaveRec} style={{...S.btn,width:"100%",padding:13}}>Save Recurring</button>
          <button onClick={()=>{setRForm(blankR);setView("list");}} style={{...S.ghost,width:"100%",padding:12}}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── Account list ──
  return (
    <div>
      {pendDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{...S.card,maxWidth:340,margin:0,textAlign:"center",padding:24}}>
            <p style={{fontFamily:"'Fraunces',serif",fontSize:18,color:C.expense,margin:"0 0 8px"}}>Delete Account?</p>
            <p style={{fontSize:13,color:C.muted,margin:"0 0 20px"}}>Permanently removes the account, all transactions, and recurring items.</p>
            <div style={{display:"flex",gap:10}}><button onClick={()=>setPendDel(null)} style={{...S.ghost,flex:1,padding:12}}>Cancel</button><button onClick={doDelete} style={{...S.btn,flex:1,padding:12,background:C.expense}}>Delete</button></div>
          </div>
        </div>
      )}
      <div style={{...S.hdr,...S.row}}>
        <div><p style={S.ht}>Accounts</p><p style={S.hs}>{accts.length} LINKED</p></div>
        <button onClick={()=>{setAForm(blankA);setEditAId(null);setView("addAcct");}} style={S.btn}>+ Add</button>
      </div>
      {accts.length===0?<p style={{textAlign:"center",color:C.muted,padding:"36px 0",fontSize:12}}>No accounts yet.</p>
      :accts.map(a=>{
        const bal=acctBal(a,txs);
        const aRecs=recs.filter(r=>r.accountId===a.id);
        return (
          <div key={a.id} style={S.card}>
            <div style={S.row}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:5,height:46,borderRadius:3,background:a.color,flexShrink:0}}/>
                <div>
                  <p style={{margin:0,fontSize:14,fontWeight:700}}>{a.name}</p>
                  <p style={{margin:"2px 0 0",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>{a.type}</p>
                  {a.type==="credit"&&(a.closingDay||a.dueDay)&&<p style={{margin:"3px 0 0",fontSize:10,color:C.txt2}}>{a.closingDay?`Closes: ${a.closingDay}th`:""}{a.closingDay&&a.dueDay?" · ":""}{a.dueDay?`Due: ${a.dueDay}th`:""}</p>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontWeight:700,fontSize:16,color:a.type==="credit"?C.expense:C.income}}>{a.type==="credit"?"Owed: ":""}{fmt(bal)}</p>
                <div style={{display:"flex",gap:2,justifyContent:"flex-end",marginTop:4}}>
                  <button onClick={()=>startEditAcct(a)} style={S.edit}>✎</button>
                  <button onClick={()=>setPendDel(a.id)} style={S.del}>×</button>
                </div>
              </div>
            </div>
            {aRecs.length>0&&(
              <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                {aRecs.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0"}}>
                    <div style={{flex:1}}><span style={{fontSize:12,color:C.txt2}}>{r.label||r.category}</span><span style={{fontSize:10,color:C.muted}}> · {r.frequency}</span></div>
                    <span style={{fontWeight:700,fontSize:12,color:r.type==="income"?C.income:C.expense,marginRight:8}}>{r.type==="income"?"+":"−"}{fmt(r.amount)}</span>
                    <button onClick={()=>onLogRec(r)} style={{...S.btn,padding:"3px 8px",fontSize:10}}>Log</button>
                    <button onClick={()=>onDeleteRec(r.id)} style={S.del}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {accts.length>0&&<div style={{padding:"4px 15px 16px"}}><button onClick={()=>{setRForm(blankR);setView("addRec");}} style={{...S.ghost,width:"100%",padding:12}}>+ Add Recurring Transaction</button></div>}
      {recs.length>0&&(
        <><p style={S.sec}>Monthly Recurring Summary</p>
        <div style={S.card}>
          {[["income","Monthly Income",C.income],["expense","Monthly Expenses",C.expense]].map(([t,lbl,col])=>{
            const items=recs.filter(r=>r.type===t&&(r.frequency==="monthly"||r.frequency==="biweekly"));
            if(!items.length) return null;
            const total=items.reduce((s,r)=>s+r.amount*(r.frequency==="biweekly"?2.17:1),0);
            return (<div key={t} style={{marginBottom:14}}>
              <div style={{...S.row,marginBottom:6}}><span style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>{lbl}</span><span style={{fontWeight:700,color:col,fontSize:13}}>≈ {fmt(total)}/mo</span></div>
              {items.map(r=>{const a=accts.find(x=>x.id===r.accountId);return<div key={r.id} style={{...S.row,fontSize:12,padding:"3px 0"}}><span style={{color:C.txt2}}>{r.label||r.category} <span style={{color:C.muted}}>· {a&&a.name}</span></span><span style={{color:col}}>{fmt(r.amount)}</span></div>;})}
            </div>);
          })}
        </div></>
      )}
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: SUMMARY
// ═════════════════════════════════════════════════════════════════════════════
const SummaryScreen = memo(({accts, txs, recs, netWorth}) => {
  const [moFilter,setMoFilter]=useState(thisMo());
  const mo=txs.filter(t=>t.date.startsWith(moFilter));
  const inc=mo.filter(t=>t.type==="income");
  const exp=mo.filter(t=>t.type==="expense");
  const totalInc=inc.reduce((s,t)=>s+t.amount,0);
  const totalExp=exp.reduce((s,t)=>s+t.amount,0);
  const freeCash=totalInc-totalExp;
  const savingsRate=totalInc>0?Math.round((freeCash/totalInc)*100):0;
  const byCat=arr=>{const m={};arr.forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);};
  const incCats=byCat(inc); const expCats=byCat(exp);
  const paycheckTotal=inc.filter(t=>t.category==="Paycheck"||t.category==="Direct Deposit").reduce((s,t)=>s+t.amount,0);
  const creditA=accts.filter(a=>a.type==="credit");
  const checkingA=accts.filter(a=>a.type==="checking");
  const investA=accts.filter(a=>a.type==="investment");
  const ccDetail=creditA.map(a=>({name:a.name,color:a.color,charges:mo.filter(t=>t.accountId===a.id&&t.type==="expense").reduce((s,t)=>s+t.amount,0),payments:mo.filter(t=>t.accountId===a.id&&t.type==="income").reduce((s,t)=>s+t.amount,0),balance:acctBal(a,txs)}));
  const ttStyle={background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:11};
  const R=({label,val,color,indent,bold})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:`${indent?"4px":"6px"} 0`,paddingLeft:indent?10:0}}>
      <span style={{fontSize:indent?12:13,color:indent?C.muted:C.txt2}}>{label}</span>
      <span style={{fontWeight:bold?"700":"400",fontSize:indent?12:13,color:color||C.txt}}>{val}</span>
    </div>
  );
  return (
    <div>
      <div style={S.hdr}><p style={S.ht}>Monthly Summary</p><p style={S.hs}>{moLbl(moFilter).toUpperCase()}</p></div>
      <div style={{padding:"12px 15px 0"}}><input type="month" value={moFilter} onChange={e=>setMoFilter(e.target.value)} style={{...S.inp,width:"auto",padding:"6px 11px",fontSize:13}}/></div>
      <div style={{...S.card,marginTop:12}}>
        <div style={S.row}>
          <div><p style={S.lbl}>Free Cash</p><p style={{fontFamily:"'Fraunces',serif",fontSize:34,fontWeight:700,margin:"4px 0 0",color:freeCash>=0?C.income:C.expense}}>{fmt(freeCash)}</p></div>
          <div style={{textAlign:"right"}}><p style={S.lbl}>Savings Rate</p><p style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:700,margin:"4px 0 0",color:savingsRate>=20?C.income:savingsRate>=10?C.warn:C.expense}}>{savingsRate}%</p></div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          <div style={{flex:1}}><p style={S.lbl}>Income</p><p style={{margin:0,fontWeight:700,color:C.income,fontSize:13}}>{fmt(totalInc)}</p></div>
          <div style={{flex:1}}><p style={S.lbl}>Expenses</p><p style={{margin:0,fontWeight:700,color:C.expense,fontSize:13}}>{fmt(totalExp)}</p></div>
          <div style={{flex:1}}><p style={S.lbl}>Net Worth</p><p style={{margin:0,fontWeight:700,color:netWorth>=0?C.income:C.expense,fontSize:13}}>{fmt(netWorth)}</p></div>
        </div>
      </div>
      <p style={S.sec}>Income</p>
      <div style={S.card}>
        {paycheckTotal>0&&<R label="Paycheck / Direct Deposit" val={fmt(paycheckTotal)} color={C.income}/>}
        {incCats.filter(([c])=>c!=="Paycheck"&&c!=="Direct Deposit").map(([c,v])=><R key={c} label={c} val={fmt(v)} color={C.income} indent/>)}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6,marginTop:4}}><R label="Total Income" val={fmt(totalInc)} color={C.income} bold/></div>
        {totalInc===0&&<p style={{color:C.muted,fontSize:12,textAlign:"center",padding:"8px 0"}}>No income logged this month.</p>}
      </div>
      <p style={S.sec}>Expenses</p>
      <div style={S.card}>
        {expCats.map(([c,v])=><R key={c} label={c} val={fmt(v)} color={C.expense} indent/>)}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6,marginTop:4}}><R label="Total Expenses" val={fmt(totalExp)} color={C.expense} bold/></div>
        {totalExp===0&&<p style={{color:C.muted,fontSize:12,textAlign:"center",padding:"8px 0"}}>No expenses logged this month.</p>}
      </div>
      {ccDetail.some(c=>c.charges>0||c.payments>0)&&(
        <><p style={S.sec}>Credit Cards</p>
        <div style={S.card}>
          {ccDetail.map(c=>(
            <div key={c.name} style={{paddingBottom:12,marginBottom:12,borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:c.color}}/><span style={{fontWeight:700,fontSize:13}}>{c.name}</span><span style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>Total owed: {fmt(c.balance)}</span>
              </div>
              {c.charges>0&&<R label="Purchases this month" val={`−${fmt(c.charges)}`} color={C.expense} indent/>}
              {c.payments>0&&<R label="Payments this month" val={`+${fmt(c.payments)}`} color={C.income} indent/>}
              <R label="Net" val={fmt(c.charges-c.payments)} color={(c.charges-c.payments)>0?C.expense:C.income} indent bold/>
            </div>
          ))}
        </div></>
      )}
      {checkingA.length>0&&<><p style={S.sec}>Checking Balances</p><div style={S.card}>{checkingA.map(a=><R key={a.id} label={a.name} val={fmt(acctBal(a,txs))} color={C.income}/>)}</div></>}
      {investA.length>0&&(
        <><p style={S.sec}>Investments</p>
        <div style={S.card}>
          {investA.map(a=>(
            <div key={a.id}>
              <R label={a.name} val={fmt(acctBal(a,txs))} color={C.income} bold/>
              <R label={`Contributions in ${moLbl(moFilter)}`} val={fmt(mo.filter(t=>t.accountId===a.id&&t.type==="income").reduce((s,t)=>s+t.amount,0))} color={C.txt2} indent/>
            </div>
          ))}
        </div></>
      )}
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: AI  — local input state
// ═════════════════════════════════════════════════════════════════════════════
const AIScreen = memo(({accts, txs, recs, netWorth}) => {
  const [msgs,   setMsgs]   = useState([]);
  const [input,  setInput]  = useState("");
  const [loading,setLoading]= useState(false);
  const chatRef = useRef(null);

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[msgs,loading]);

  const ask = async () => {
    if(!input.trim()||loading) return;
    const userMsg={role:"user",content:input};
    const history=[...msgs,userMsg];
    setMsgs(history); setInput(""); setLoading(true);
    const moFilter=thisMo();
    const mo=txs.filter(t=>t.date.startsWith(moFilter));
    const moInc=mo.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const moExp=mo.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const acctCtx=accts.map(a=>({name:a.name,type:a.type,balance:acctBal(a,txs),closingDay:a.closingDay,dueDay:a.dueDay}));
    const sys=`You are a concise personal finance assistant. Net worth: ${fmt(netWorth)}. Accounts: ${JSON.stringify(acctCtx)}. This month (${moFilter}): income ${fmt(moInc)}, expenses ${fmt(moExp)}, free cash ${fmt(moInc-moExp)}. Recurring: ${JSON.stringify(recs.map(r=>({...r,accountName:(accts.find(a=>a.id===r.accountId)||{}).name})))}. Recent 15 transactions: ${JSON.stringify(txs.slice(0,15))}. Be brief, direct, use dollar amounts. No markdown.`;
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:history})});
      const data=await res.json();
      setMsgs(p=>[...p,{role:"assistant",content:(data.content&&data.content.find(b=>b.type==="text")&&data.content.find(b=>b.type==="text").text)||"Couldn't process that."}]);
    } catch { setMsgs(p=>[...p,{role:"assistant",content:"Connection error. Try again."}]); }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 80px)"}}>
      <div style={S.hdr}><p style={S.ht}>AI Insights</p><p style={S.hs}>POWERED BY CLAUDE</p></div>
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:16}}>
        {msgs.length===0&&(
          <div style={{textAlign:"center",padding:"28px 0 16px"}}>
            <p style={{fontSize:30,margin:"0 0 10px"}}>✦</p>
            <p style={{color:C.muted,fontSize:12,margin:"0 0 18px"}}>Your personal finance analyst.</p>
            <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
              {["How much am I spending on groceries?","What's my savings rate this month?","Which credit card is due soon?","Summarize my recurring expenses","Am I spending more than I earn?","Where can I cut back?"].map(q=>(
                <button key={q} onClick={()=>setInput(q)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.txt2,fontSize:11,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{marginBottom:12,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"86%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 2px 14px":"14px 14px 14px 2px",background:m.role==="user"?C.accent:C.card,color:m.role==="user"?"#05100a":C.txt,fontSize:13,lineHeight:1.65,border:m.role==="assistant"?`1px solid ${C.border}`:"none",whiteSpace:"pre-wrap"}}>{m.content}</div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px 14px 14px 2px",padding:"10px 16px",fontSize:13,color:C.muted}}>Analyzing your finances…</div></div>}
      </div>
      <div style={{padding:"10px 15px 4px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask();}}} placeholder="Ask about your finances…" style={{...S.inp,flex:1}}/>
        <button onClick={ask} disabled={loading} style={{...S.btn,padding:"9px 16px",opacity:loading?0.5:1}}>→</button>
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// ROOT APP  — only global state lives here
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("home");
  const [accts,  setAccts]  = useState([]);
  const [txs,    setTxs]    = useState([]);
  const [recs,   setRecs]   = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editTx, setEditTx] = useState(null);

  // Storage
  useEffect(()=>{
    function load(){
      try{const r=localStorage.getItem("f3:accts");if(r)setAccts(JSON.parse(r));}catch{}
      try{const r=localStorage.getItem("f3:txs");  if(r)setTxs(JSON.parse(r));  }catch{}
      try{const r=localStorage.getItem("f3:recs"); if(r)setRecs(JSON.parse(r)); }catch{}
      setLoaded(true);
    }
    load();
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem("f3:accts",JSON.stringify(accts));}catch{}},[accts,loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem("f3:txs",  JSON.stringify(txs));  }catch{}},[txs,  loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem("f3:recs", JSON.stringify(recs)); }catch{}},[recs, loaded]);

  const netWorth = accts.reduce((s,a)=>{const b=acctBal(a,txs);return a.type==="credit"?s-b:s+b;},0);

  // Callbacks passed to screens
  const logRec     = r => setTxs(p=>[{id:uid(),accountId:r.accountId,type:r.type,amount:r.amount,category:r.category,date:today(),note:r.label||"Recurring"},...p]);
  const saveAcct   = (obj,editId) => setAccts(p=>editId?p.map(a=>a.id===editId?obj:a):[...p,obj]);
  const deleteAcct = id => { setAccts(p=>p.filter(a=>a.id!==id)); setTxs(p=>p.filter(t=>t.accountId!==id)); setRecs(p=>p.filter(r=>r.accountId!==id)); };
  const saveRec    = obj => setRecs(p=>[...p,obj]);
  const deleteRec  = id => setRecs(p=>p.filter(r=>r.id!==id));
  const saveTx     = obj => { setTxs(p=>editTx?p.map(t=>t.id===editTx.id?obj:t):[obj,...p]); setEditTx(null); setScreen("home"); };
  const startEdit  = tx => { setEditTx(tx); setScreen("add"); };

  const goTo = id => { if(id==="add")setEditTx(null); setScreen(id); };

  const NAV=[{id:"home",icon:"⌂",label:"Home"},{id:"accounts",icon:"⊞",label:"Accounts"},{id:"add",icon:"+",label:"Add"},{id:"summary",icon:"◈",label:"Summary"},{id:"ai",icon:"✦",label:"AI"}];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;}body{margin:0;background:#05100a;}
        input[type=date]::-webkit-calendar-picker-indicator,input[type=month]::-webkit-calendar-picker-indicator{filter:invert(.4) sepia(1) hue-rotate(80deg);cursor:pointer;}
        select option{background:#111f14;color:#ecfdf5;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#05100a;}::-webkit-scrollbar-thumb{background:#1a2e1e;border-radius:2px;}
        input,select,textarea{-webkit-user-select:text;user-select:text;}
      `}</style>
      <div style={{background:C.bg,minHeight:"100vh",maxWidth:440,margin:"0 auto",fontFamily:"'JetBrains Mono',monospace",color:C.txt,paddingBottom:84}}>
        {!loaded
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:C.muted,fontSize:13}}>Loading your ledger…</div>
          :<>
            {screen==="home"     && <HomeScreen     accts={accts} txs={txs} recs={recs} netWorth={netWorth} logRec={logRec} goAccounts={()=>goTo("accounts")}/>}
            {screen==="accounts" && <AccountsScreen accts={accts} txs={txs} recs={recs} onSaveAcct={saveAcct} onDeleteAcct={deleteAcct} onSaveRec={saveRec} onDeleteRec={deleteRec} onLogRec={logRec}/>}
            {screen==="add"      && <AddScreen      accts={accts} editTx={editTx} onSave={saveTx} onCancel={()=>{setEditTx(null);setScreen("home");}}/>}
            {screen==="summary"  && <SummaryScreen  accts={accts} txs={txs} recs={recs} netWorth={netWorth}/>}
            {screen==="ai"       && <AIScreen       accts={accts} txs={txs} recs={recs} netWorth={netWorth}/>}
          </>
        }
        <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"7px 0 14px"}}>
          {NAV.map(item=><button key={item.id} style={nb(screen===item.id)} onClick={()=>goTo(item.id)}><span style={{fontSize:item.id==="add"?24:17,lineHeight:1}}>{item.icon}</span><span>{item.label}</span></button>)}
        </nav>
      </div>
    </>
  );
}

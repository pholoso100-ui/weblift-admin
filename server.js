import express from 'express';
import pg from 'pg';
import PDFDocument from 'pdfkit';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'80kb'}));
const ORIGIN='https://weblift-sa.vercel.app', PORT=Number(process.env.PORT||10000);
const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PG_SSL==='false'?false:{rejectUnauthorized:false},max:5,connectionTimeoutMillis:7000}):null;
let ready=false,problem='Database credentials have not been configured in Render.';
const toText=(v,n=180)=>String(v??'').trim().slice(0,n);
const rand=n=>'R'+(Number(n||0)/100).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const validToken=v=>/^[A-Za-z0-9_-]{40,90}$/.test(v||'');
const seed=[
['whatsapp','WhatsApp integration',75000,'fixed',0],['estimator','Interactive quotation estimator',100000,'fixed',0],
['email','Two business email addresses setup',70000,'fixed',0],['domain','Domain setup & maintenance package',200000,'fixed',0],
['pages','Additional website page',35000,'fixed',0],['gallery','Photo gallery / projects showcase',50000,'fixed',0],
['reviews','Testimonials section',30000,'fixed',0],['bookings','Appointment booking system',120000,'fixed',0],
['maps','Google Maps & directions',25000,'fixed',0],['seo','Basic Google search setup',65000,'fixed',0],
['social','Social media integration',35000,'fixed',0],['blog','Blog / news section',75000,'fixed',0],
['store','Online store starter setup',250000,'fixed',0],['payments','Payment gateway integration',150000,'fixed',0],
['members','Customer/member login area',280000,'fixed',0],
['marketing','Marketing and campaign design',0,'hourly',4],['social-management','Social page management',0,'hourly',4],
['print-design','Business cards and pamphlet design',0,'hourly',3]
];
async function initialise(){
 if(!pool)return;
 try{
  const c=await pool.connect();
  try{
   await c.query(readFileSync('schema.sql','utf8'));
   for(const item of seed)await c.query('INSERT INTO wl_catalogue(id,label,price_cents,mode,default_hours) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',item);
   await c.query("INSERT INTO wl_config(id,value) VALUES('pricing',$1::jsonb) ON CONFLICT(id) DO NOTHING",[JSON.stringify({rate_cents:19900,plan_A_cents:200000,plan_B_cents:300000,monthly_A_cents:70000})]);
   ready=true;problem='';
  }finally{c.release()}
 }catch(e){ready=false;problem=String(e.message||e).slice(0,180)}
}
await initialise();
app.use((req,res,next)=>{
 res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');
 const origin=req.get('origin');
 if(origin===ORIGIN){res.set('Access-Control-Allow-Origin',ORIGIN);res.set('Access-Control-Allow-Headers','Content-Type,Authorization');res.set('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS')}
 if(req.method==='OPTIONS')return res.sendStatus(origin===ORIGIN?204:403);next();
});
app.get('/api/sales/status', (req,res)=>{
 const category=!pool?'DATABASE_URL_NOT_SET':ready?'READY':/authentication failed|password authentication/i.test(problem)?'CREDENTIALS_REJECTED':/ENOTFOUND|EAI_AGAIN|DNS/i.test(problem)?'DATABASE_HOST_NOT_FOUND':/ECONNREFUSED|timeout|connect/i.test(problem)?'DATABASE_UNREACHABLE':'DATABASE_INITIALIZATION_FAILED';
 res.json({service:'WebLift Sales',database:category,ready});
});
app.get('/health',async(req,res)=>{if(!ready)await initialise();res.status(ready?200:503).json({ok:ready,service:'WebLift Sales API',database:ready?'available':'unconfigured',detail:ready?undefined:problem,free_database_expiry:'2026-11-11'})});
function requireDb(req,res,next){if(!ready)return res.status(503).json({error:'The sales database is not connected. Nothing has been saved or invoiced.'});next()}
async function authenticate(req,res,next){
 const authorization=req.get('authorization')||'';
 if(!/^Bearer [\w.-]{80,}$/.test(authorization))return res.status(401).json({error:'Sign in to WebLift first.'});
 try{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
  let result;
  try{result=await fetch(ORIGIN+'/api/manage',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json','Origin':ORIGIN,'Referer':ORIGIN+'/admin.html'},body:JSON.stringify({action:'profile'}),signal:abort.signal})}
  finally{clearTimeout(timer)}
  if(!result.ok)return res.status(403).json({error:'WebLift did not approve administrator access.'});
  const data=await result.json();
  if(!['owner','administrator','support','analyst'].includes(data.admin?.role))return res.status(403).json({error:'Administrator access required.'});
  req.administrator={role:data.admin.role,actor:toText(data.admin.id||data.admin.email||'verified',130)};
  next();
 }catch{res.status(503).json({error:'Unable to verify your WebLift administrator login.'})}
}
function writable(req,res,next){if(!['owner','administrator'].includes(req.administrator?.role))return res.status(403).json({error:'Only owners and administrators may change sales records.'});next()}
function total(items,base){
 let amount=base;
 const lines=items.map(i=>{
  const qty=i.mode==='hourly'?Math.min(2000,Math.max(0,Number(i.hours)||0)):Math.min(100,Math.max(1,Math.floor(Number(i.qty)||1)));
  const price=Math.round(Math.max(0,Number(i.price_cents)||0));
  const line=i.selected&&!i.included?Math.round(price*qty):0;
  amount+=line;
  return{...i,qty:i.mode==='fixed'?qty:1,hours:i.mode==='hourly'?qty:0,amount_cents:line};
 });
 if(amount>500000000)throw Error('Quotation total exceeds limit.');
 const deposit=Math.round(amount*.75);
 return{items:lines,total:amount,deposit,balance:amount-deposit}
}
async function event(c,id,type,detail={}){await c.query('INSERT INTO wl_sales_events(proposal_id,event_type,details) VALUES($1,$2,$3::jsonb)',[id,type,JSON.stringify(detail)])}
app.get('/api/sales/admin/catalogue',authenticate,requireDb,async(req,res)=>{
 try{const [a,b]=await Promise.all([pool.query('SELECT * FROM wl_catalogue WHERE active ORDER BY id'),pool.query("SELECT value FROM wl_config WHERE id='pricing'")]);res.json({items:a.rows,pricing:b.rows[0]?.value})}catch{res.status(500).json({error:'Unable to read catalogue.'})}
});
app.patch('/api/sales/admin/catalogue/:id',authenticate,writable,requireDb,async(req,res)=>{
 const b=req.body||{},price=Number(b.price_cents),hours=Number(b.default_hours||0);
 if(!Number.isInteger(price)||price<0||price>500000000||!Number.isFinite(hours)||hours<0||hours>2000)return res.status(400).json({error:'Invalid pricing values.'});
 try{const r=await pool.query('UPDATE wl_catalogue SET label=$2,price_cents=$3,default_hours=$4,mode=$5,updated_at=now() WHERE id=$1 RETURNING *',[toText(req.params.id,80),toText(b.label,130),price,hours,b.mode==='hourly'?'hourly':'fixed']);if(!r.rowCount)return res.sendStatus(404);res.json({item:r.rows[0]})}catch{res.status(500).json({error:'Cannot save pricing.'})}
});
app.post('/api/sales/admin/catalogue',authenticate,writable,requireDb,async(req,res)=>{
 const b=req.body||{},label=toText(b.label,130),price=Number(b.price_cents||0),hours=Number(b.default_hours||0);
 if(!label||!Number.isInteger(price)||price<0||price>500000000||!Number.isFinite(hours)||hours<0||hours>2000)return res.status(400).json({error:'Invalid service pricing.'});
 const id='custom-'+randomBytes(8).toString('hex');
 try{const q=await pool.query('INSERT INTO wl_catalogue(id,label,price_cents,mode,default_hours,category) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,label,price,b.mode==='hourly'?'hourly':'fixed',hours,'Custom services']);res.status(201).json({item:q.rows[0]})}catch{res.status(500).json({error:'Cannot create custom service.'})}
});
app.patch('/api/sales/admin/settings',authenticate,writable,requireDb,async(req,res)=>{
 const current=await pool.query("SELECT value FROM wl_config WHERE id='pricing'");
 const old=current.rows[0]?.value||{};
 const next={...old};
 for(const key of ['rate_cents','plan_A_cents','plan_B_cents','monthly_A_cents']){
  if(req.body&&req.body[key]!==undefined){const n=Number(req.body[key]);if(!Number.isInteger(n)||n<0||n>500000000)return res.status(400).json({error:'Invalid pricing settings.'});next[key]=n}
 }
 try{await pool.query("INSERT INTO wl_config(id,value,updated_at) VALUES('pricing',$1::jsonb,now()) ON CONFLICT (id) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[JSON.stringify(next)]);res.json({pricing:next})}catch{res.status(500).json({error:'Unable to save pricing settings.'})}
});
app.get('/api/sales/admin/proposals',authenticate,requireDb,async(req,res)=>{
 try{const q=await pool.query(`SELECT p.id,p.token,p.client_name,p.company,p.client_email,p.project_id,p.total_cents,p.deposit_cents,p.balance_cents,p.status,p.version,p.invoice_no,p.created_at,p.updated_at,p.nexora_opt_in,p.reward_status,p.reward_potential_cents,COALESCE((SELECT SUM(amount_cents) FROM wl_payments w WHERE w.proposal_id=p.id),0)::integer AS paid_cents FROM wl_proposals p ORDER BY p.created_at DESC LIMIT 150`);
  res.json({proposals:q.rows.map(i=>({...i,outstanding_cents:Math.max(0,i.total_cents-i.paid_cents),books_status:i.invoice_no&&i.paid_cents>=i.total_cents?'paid_in_full':'open',share_url:ORIGIN+'/proposal?token='+i.token}))})}catch{res.status(500).json({error:'Cannot read sales proposals.'})}
});
app.get('/api/sales/admin/events',authenticate,requireDb,async(req,res)=>{
 try{const q=await pool.query('SELECT event_type,proposal_id,details,created_at FROM wl_sales_events ORDER BY created_at DESC LIMIT 80');res.json({events:q.rows})}catch{res.status(500).json({error:'Cannot read sales notifications.'})}
});

app.post('/api/sales/admin/proposals/:id/payments',authenticate,writable,requireDb,async(req,res)=>{
 const {amount_cents,reference}=req.body||{};
 const centsReceived=Number(amount_cents),ref=toText(reference,110);
 if(!/^[0-9a-f-]{36}$/i.test(req.params.id)||!Number.isInteger(centsReceived)||centsReceived<=0||centsReceived>500000000||!ref)
   return res.status(400).json({error:'A positive payment amount and transaction reference are required.'});
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const rows=await c.query('SELECT id,total_cents,invoice_no,status FROM wl_proposals WHERE id=$1 FOR UPDATE',[req.params.id]);
  if(!rows.rowCount||rows.rows[0].status!=='accepted'||!rows.rows[0].invoice_no){
   await c.query('ROLLBACK');return res.status(409).json({error:'Only an accepted proposal with a valid invoice can receive payments.'});
  }
  const paid=Number((await c.query('SELECT COALESCE(SUM(amount_cents),0)::integer AS paid FROM wl_payments WHERE proposal_id=$1',[req.params.id])).rows[0].paid);
  const outstanding=rows.rows[0].total_cents-paid;
  if(centsReceived>outstanding){await c.query('ROLLBACK');return res.status(409).json({error:'The payment cannot exceed the current outstanding balance.'})}
  await c.query('INSERT INTO wl_payments(proposal_id,amount_cents,reference,recorded_by) VALUES($1,$2,$3,$4)',[req.params.id,centsReceived,ref,req.administrator.actor]);
  const remaining=outstanding-centsReceived;
  await event(c,req.params.id,'payment_recorded',{amount_cents:centsReceived,remaining_cents:remaining,ledger_status:remaining===0?'paid_in_full':'open'});
  await c.query('COMMIT');
  res.json({paid_cents:paid+centsReceived,outstanding_cents:remaining,books_status:remaining===0?'paid_in_full':'open'});
 }catch(e){
  await c.query('ROLLBACK').catch(()=>{});
  res.status(e?.code==='23505'?409:500).json({error:e?.code==='23505'?'A payment with this reference is already recorded.':'Could not save payment. Please retry.'});
 }finally{c.release()}
});
app.post('/api/sales/admin/proposals',authenticate,writable,requireDb,async(req,res)=>{
 const b=req.body||{},name=toText(b.client_name||b.company,140),company=toText(b.company||name,140),plan=toText(b.package_code,12);
 if(!name||!company||!['A','B','custom'].includes(plan)||!Array.isArray(b.selections))return res.status(400).json({error:'Client name, package and service selections required.'});
 if(b.client_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.client_email)))return res.status(400).json({error:'Invalid email address.'});
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const rows=await c.query('SELECT * FROM wl_catalogue WHERE active');
  const conf=await c.query("SELECT value FROM wl_config WHERE id='pricing'");
  const opts=conf.rows[0]?.value||{},byId=new Map(rows.rows.map(x=>[x.id,x]));
  const core=new Set(['whatsapp','estimator','email','domain']);
  const selections=b.selections.slice(0,100).map(x=>{
   const i=byId.get(toText(x.id,70));if(!i)return null;
   const included=plan==='A'&&core.has(i.id);
   const mode=i.mode==='hourly'?'hourly':'fixed';
   return{id:i.id,label:i.label,mode,qty:Math.min(100,Math.max(1,Math.floor(Number(x.qty)||1))),hours:Math.min(2000,Math.max(0,Number(x.hours??i.default_hours)||0)),price_cents:mode==='hourly'?Number(opts.rate_cents||19900):i.price_cents,selected:included||!!x.selected,mandatory:included,included}
  }).filter(Boolean);
  const base=plan==='A'?Number(opts.plan_A_cents||200000):plan==='B'?Number(opts.plan_B_cents||300000):0;
  const monthly=plan==='A'?Number(opts.monthly_A_cents||70000):0;
  const calc=total(selections,base),token=randomBytes(30).toString('base64url');
  const q=await c.query('INSERT INTO wl_proposals(token,client_name,company,client_email,client_phone,project_id,project_url,package_code,items,base_cents,total_cents,monthly_cents,deposit_cents,balance_cents,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16) RETURNING id,version,status,created_at',[token,name,company,toText(b.client_email,180),toText(b.client_phone,35),toText(b.project_id,90),toText(b.project_url,350),plan,JSON.stringify(calc.items),base,calc.total,monthly,calc.deposit,calc.balance,toText(b.notes,3000),req.administrator.actor]);
  await event(c,q.rows[0].id,'created',{total_cents:calc.total});
  await c.query('COMMIT');
  res.status(201).json({...q.rows[0],total_cents:calc.total,deposit_cents:calc.deposit,balance_cents:calc.balance,share_url:ORIGIN+'/proposal?token='+token});
 }catch(e){await c.query('ROLLBACK').catch(()=>{});res.status(400).json({error:toText(e.message||'Cannot create quotation.',150)})}finally{c.release()}
});
app.get('/api/sales/proposal/:token',requireDb,async(req,res)=>{
 if(!validToken(req.params.token))return res.sendStatus(404);
 try{const q=await pool.query('SELECT id,client_name,company,project_id,project_url,package_code,items,total_cents,base_cents,monthly_cents,deposit_cents,balance_cents,notes,status,version,invoice_no,created_at,accepted_at,nexora_opt_in,reward_potential_cents,reward_status,nexora_verification_status FROM wl_proposals WHERE token=$1',[req.params.token]);if(!q.rowCount)return res.sendStatus(404);res.json({proposal:{...q.rows[0],reward_program:{rate:0.10,value_per_N_cents:10000,registration_url:'https://nexora-one-gamma-mocha.vercel.app/',verification_available:false},pdf_ready:q.rows[0].status==='accepted'}})}catch{res.status(500).json({error:'Unable to retrieve proposal.'})}
});
app.post('/api/sales/proposal/:token/action',requireDb,async(req,res)=>{
 const b=req.body||{};
 if(!validToken(req.params.token)||!['revise','accept','decline'].includes(b.action)||!Array.isArray(b.selected_ids))return res.status(400).json({error:'Invalid proposal update.'});
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const q=await c.query('SELECT * FROM wl_proposals WHERE token=$1 FOR UPDATE',[req.params.token]);
  if(!q.rowCount){await c.query('ROLLBACK');return res.sendStatus(404)}
  const p=q.rows[0];
  if(p.status==='accepted'||p.status==='declined'){await c.query('ROLLBACK');return res.status(409).json({error:'This proposal has already been finalised.'})}
  if(Number(b.version)!==p.version){await c.query('ROLLBACK');return res.status(409).json({error:'Proposal changed. Refresh before deciding.'})}
  const selected=new Set(b.selected_ids.map(String));
  const items=p.items.map(i=>({...i,selected:i.mandatory||selected.has(i.id)}));
  const calc=total(items,p.base_cents);
  const status=b.action==='accept'?'accepted':b.action==='decline'?'declined':'modified';
  const optIn=b.nexora_opt_in===true;
  const acceptedTerms=b.accepted_terms===true;
  if(status==='accepted'&&!acceptedTerms){await c.query('ROLLBACK');return res.status(400).json({error:'Please confirm you agree to the proposal and payment terms before accepting.'})}
  if(b.nexora_opt_in!==undefined&&typeof b.nexora_opt_in!=='boolean'){await c.query('ROLLBACK');return res.status(400).json({error:'Invalid optional Nexora rewards choice.'})}
  let invoice=null;
  if(status==='accepted'){const s=await c.query("SELECT nextval('wl_invoice_seq') AS n");invoice='WL-INV-'+String(s.rows[0].n).padStart(6,'0')}
  const rewardCents=optIn?Math.round(calc.total*0.10):0;
  const u=await c.query(`UPDATE wl_proposals SET items=$2::jsonb,total_cents=$3,deposit_cents=$4,balance_cents=$5,status=$6,version=version+1,updated_at=now(),invoice_no=COALESCE($7,invoice_no),
    accepted_at=CASE WHEN $6=$8 THEN now() ELSE accepted_at END,declined_at=CASE WHEN $6=$9 THEN now() ELSE declined_at END,
    nexora_opt_in=$10,nexora_consent_at=CASE WHEN $10 AND nexora_consent_at IS NULL THEN now() WHEN NOT $10 THEN NULL ELSE nexora_consent_at END,
    reward_potential_cents=$11,reward_status=CASE WHEN $10 THEN 'pending_verification' ELSE 'not_issued' END
    WHERE id=$1 RETURNING status,version,total_cents,deposit_cents,balance_cents,invoice_no,nexora_opt_in,reward_status,reward_potential_cents`,
  [p.id,JSON.stringify(calc.items),calc.total,calc.deposit,calc.balance,status,invoice,'accepted','declined',optIn,rewardCents]);
  await event(c,p.id,status,{reason:toText(b.reason,300),total_cents:calc.total,nexora_opt_in:optIn,reward_status:optIn?'pending_verification':'not_issued'});
  await c.query('COMMIT');
  res.json({...u.rows[0],invoice_pdf:invoice?ORIGIN+'/api/sales/proposal/'+req.params.token+'/invoice.pdf':null});
 }catch{await c.query('ROLLBACK').catch(()=>{});res.status(500).json({error:'Could not save your decision.'})}finally{c.release()}
});
app.get('/api/sales/proposal/:token/invoice.pdf',requireDb,async(req,res)=>{
 if(!validToken(req.params.token))return res.sendStatus(404);
 try{
  const q=await pool.query(
   "SELECT p.*, COALESCE((SELECT SUM(amount_cents) FROM wl_payments WHERE proposal_id=p.id),0)::integer AS payments_received_cents FROM wl_proposals p WHERE p.token=$1 AND p.status='accepted'",
   [req.params.token]);
  if(!q.rowCount||!q.rows[0].invoice_no)return res.status(404).send('Invoice not yet issued');
  const p=q.rows[0],paid=Number(p.payments_received_cents),owing=Math.max(0,p.total_cents-paid);
  const closed=owing===0;
  const pdf=new PDFDocument({size:'A4',margin:42,autoFirstPage:true,bufferPages:true,info:{Title:'WebLift SA invoice '+p.invoice_no,Author:'WebLift SA',Subject:'Approved website project, deposit, final balance and payments'}});
  res.type('pdf');res.set('Content-Disposition','attachment; filename="'+p.invoice_no+'.pdf"');
  pdf.pipe(res);
  const W=pdf.page.width,M=42,wide=W-M*2;
  const ink='#153d32',green='#0b664a',gold='#c29a60',muted='#6d8176',soft='#eef5ee',line='#dae4db';
  const small=(t,x,y,w=240,opt={})=>pdf.font('Helvetica').fontSize(9).fillColor(muted).text(String(t),x,y,{width:w,...opt});
  const moneyAt=(amount,y,label,highlight=false)=>{
   if(highlight){pdf.roundedRect(M,y-10,wide,55,11).fill('#ebf5ed')}
   pdf.font('Helvetica').fontSize(10).fillColor(ink).text(label,M+(highlight?14:0),y+1,{width:270});
   pdf.font('Helvetica-Bold').fontSize(highlight?19:13).fillColor(highlight?green:ink).text(rand(amount),M+275,y-2,{width:wide-275-(highlight?14:0),align:'right'});
  };
  // Brand frame: restrained green, sandstone-gold and South African identity.
  pdf.rect(0,0,W,15).fill(green);
  pdf.rect(W-116,0,32,15).fill(gold);
  pdf.rect(W-84,0,32,15).fill('#d36f47');
  pdf.rect(W-52,0,52,15).fill('#275d82');
  pdf.roundedRect(M,38,wide,107,15).fill('#f0f6ef');
  pdf.roundedRect(M,38,7,107,3).fill(green);
  let logoOk=false;
  try{
   const reqLogo=await fetch('https://weblift-sa.vercel.app/premium-v3/assets/weblift-email-logo.png',{signal:AbortSignal.timeout(4500)});
   if(reqLogo.ok){
    const data=Buffer.from(await reqLogo.arrayBuffer());
    if(data.length<400000){pdf.image(data,M+18,56,{fit:[205,66]});logoOk=true}
   }
  }catch{}
  if(!logoOk)pdf.font('Helvetica-Bold').fontSize(24).fillColor(green).text('WebLift SA',M+18,68);
  small('WEBSITES THAT MOVE YOUR BUSINESS FORWARD',M+18,124,280);
  pdf.font('Helvetica-Bold').fontSize(18).fillColor(ink).text('PROJECT INVOICE',M,168);
  pdf.roundedRect(W-157,164,115,29,10).fill(closed?'#e1f4e8':'#fff1dd');
  pdf.font('Helvetica-Bold').fontSize(9).fillColor(closed?green:'#946424').text(closed?'PAID IN FULL':'ACCOUNT OPEN',W-149,174,{width:98,align:'center'});
  pdf.moveTo(M,203).lineTo(W-M,203).strokeColor(line).lineWidth(1).stroke();
  small('INVOICE NUMBER',M,215);pdf.font('Helvetica-Bold').fontSize(11).fillColor(ink).text(p.invoice_no,M,230);
  small('ISSUED',M+215,215);pdf.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(new Date(p.accepted_at||p.created_at).toLocaleDateString('en-ZA',{timeZone:'Africa/Johannesburg'}),M+215,230);
  small('CUSTOMER',M,260);
  pdf.font('Helvetica-Bold').fontSize(13).fillColor(ink).text(p.company||p.client_name,M,276,{width:320});
  small(p.client_name,M,293);
  small('PROJECT',M+340,260,180);
  pdf.font('Helvetica-Bold').fontSize(11).fillColor(ink).text(p.project_id||'Custom website',M+340,276,{width:wide-340});
  let y=334;
  pdf.roundedRect(M,y,wide,29,8).fill('#0c5e45');
  pdf.font('Helvetica-Bold').fontSize(9).fillColor('#fff').text('AGREED WEBSITE SERVICES',M+13,y+10);
  pdf.text('AMOUNT',W-M-126,y+10,{width:112,align:'right'});
  y+=39;
  const approved=(p.items||[]).filter(x=>x.selected);
  pdf.font('Helvetica').fontSize(10).fillColor(ink).text('Website package '+p.package_code,M+12,y,{width:310});
  pdf.font('Helvetica-Bold').text(rand(p.base_cents),W-M-130,y,{width:116,align:'right'});y+=29;
  pdf.moveTo(M+10,y-5).lineTo(W-M-10,y-5).strokeColor('#e3e9e1').stroke();
  for(const item of approved){
   if(y>600){
    pdf.addPage();
    y=65;
    pdf.font('Helvetica-Bold').fontSize(12).fillColor(green).text('WEBLIFT SA — CONTINUED SERVICES',M,y);y+=32;
   }
   let label=String(item.label||'Service');
   if(item.mode==='hourly')label+='  ('+item.hours+' hours)';
   else if(Number(item.qty)>1)label+='  (x'+item.qty+')';
   pdf.font('Helvetica').fontSize(9.5).fillColor(ink).text(label,M+12,y,{width:335});
   pdf.font('Helvetica-Bold').text(item.included?'Included':rand(item.amount_cents),W-M-130,y,{width:116,align:'right'});
   y=Math.max(pdf.y,y+17)+7;
   pdf.moveTo(M+10,y-5).lineTo(W-M-10,y-5).strokeColor('#e3e9e1').stroke();
  }
  if(y>520){pdf.addPage();y=54}
  y+=8;
  pdf.font('Helvetica-Bold').fontSize(12).fillColor(green).text('PAYMENT POSITION',M,y);y+=29;
  moneyAt(p.total_cents,y,'Agreed project total');y+=31;
  moneyAt(p.deposit_cents,y,'75% initial deposit due on approval');y+=31;
  moneyAt(p.balance_cents,y,'25% final balance due immediately upon launch');y+=31;
  moneyAt(paid,y,'Payments recorded');y+=38;
  moneyAt(owing,y,'OUTSTANDING ACCOUNT BALANCE',true);y+=69;
  if(p.monthly_cents){small('Separately agreed monthly service: '+rand(p.monthly_cents)+' / month',M,y,wide);y+=23}
  if(p.nexora_opt_in){
   pdf.roundedRect(M,y,wide,41,8).fill('#fff8ec');
   pdf.font('Helvetica-Bold').fontSize(9).fillColor('#78552d').text('NEXORA ONE / COVENANT RISE — PENDING VERIFICATION',M+12,y+9,{width:wide-25});
   small('Provisional 10% loyalty purchasing value: '+rand(p.reward_potential_cents)+'. Not deducted from this invoice; no N credits issued.',M+12,y+23,wide-24,{size:8});
   y+=52;
  }
  if(y>685){pdf.addPage();y=55}
  pdf.roundedRect(M,y,wide,72,9).fill(soft);
  pdf.font('Helvetica-Bold').fontSize(10).fillColor(ink).text('PAYMENT DETAILS',M+12,y+10);
  small('African Bank   |   Account 20160546562',M+12,y+27,wide-24);
  small('Beneficiary: Webliftsa T/A Mr P E Tlatsi   |   Reference: '+p.invoice_no,M+12,y+43,wide-24);
  y+=87;
  pdf.font('Helvetica').fontSize(8).fillColor(muted).text(
   'VAT not charged (supplier not currently VAT registered). The 75% deposit is required on acceptance, and the final 25% is payable immediately after the website is live and operational. This invoice and client account remain OPEN until the entire outstanding balance is received and recorded. Covenant Rise rewards are optional and subject to confirmed Nexora One registration and eligibility; they are not money or an invoice deduction.',
   M,y,{width:wide,lineGap:3});
  const pages=pdf.bufferedPageRange();
  for(let i=0;i<pages.count;i++){
   pdf.switchToPage(i);
   const pageH=pdf.page.height;
   pdf.moveTo(M,pageH-38).lineTo(W-M,pageH-38).strokeColor(line).stroke();
   pdf.fontSize(8).fillColor(muted).text('WEBLIFT SA  •  PRETORIA, SOUTH AFRICA  •  NEXORA TECHNOLOGIES',M,pageH-30,{width:wide-90});
   pdf.text((i+1)+' / '+pages.count,W-M-60,pageH-30,{width:60,align:'right'});
  }
  pdf.end();
 }catch(e){
  if(!res.headersSent)res.status(503).json({error:'Invoice generation is temporarily unavailable.'});
  else res.end();
 }
});
app.use((req,res)=>res.status(404).json({error:'Endpoint not found'}));
app.listen(PORT,'0.0.0.0',()=>console.log('WebLift sales API listening on '+PORT));

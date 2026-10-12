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
app.get('/health',async(req,res)=>{if(!ready)await initialise();res.status(ready?200:503).json({ok:ready,service:'WebLift Sales API',database:ready?'available':'unconfigured',detail:ready?undefined:problem,free_database_expiry:'2026-11-11'})});
function requireDb(req,res,next){if(!ready)return res.status(503).json({error:'The sales database is not connected. Nothing has been saved or invoiced.'});next()}
async function authenticate(req,res,next){
 const authorization=req.get('authorization')||'';
 if(!/^Bearer [\w.-]{80,}$/.test(authorization))return res.status(401).json({error:'Sign in to WebLift first.'});
 try{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
  let result;
  try{result=await fetch(ORIGIN+'/api/manage',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({action:'overview'}),signal:abort.signal})}
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
app.get('/api/sales/admin/proposals',authenticate,requireDb,async(req,res)=>{
 try{const q=await pool.query('SELECT id,token,client_name,company,client_email,project_id,total_cents,deposit_cents,balance_cents,status,version,invoice_no,created_at,updated_at FROM wl_proposals ORDER BY created_at DESC LIMIT 150');res.json({proposals:q.rows.map(i=>({...i,share_url:ORIGIN+'/proposal/'+i.token}))})}catch{res.status(500).json({error:'Cannot read sales proposals.'})}
});
app.get('/api/sales/admin/events',authenticate,requireDb,async(req,res)=>{
 try{const q=await pool.query('SELECT event_type,proposal_id,details,created_at FROM wl_sales_events ORDER BY created_at DESC LIMIT 80');res.json({events:q.rows})}catch{res.status(500).json({error:'Cannot read sales notifications.'})}
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
  res.status(201).json({...q.rows[0],total_cents:calc.total,deposit_cents:calc.deposit,balance_cents:calc.balance,share_url:ORIGIN+'/proposal/'+token});
 }catch(e){await c.query('ROLLBACK').catch(()=>{});res.status(400).json({error:toText(e.message||'Cannot create quotation.',150)})}finally{c.release()}
});
app.get('/api/sales/proposal/:token',requireDb,async(req,res)=>{
 if(!validToken(req.params.token))return res.sendStatus(404);
 try{const q=await pool.query('SELECT id,client_name,company,project_id,project_url,package_code,items,total_cents,base_cents,monthly_cents,deposit_cents,balance_cents,notes,status,version,invoice_no,created_at,accepted_at FROM wl_proposals WHERE token=$1',[req.params.token]);if(!q.rowCount)return res.sendStatus(404);res.json({proposal:q.rows[0]})}catch{res.status(500).json({error:'Unable to retrieve proposal.'})}
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
  let invoice=null;
  if(status==='accepted'){const s=await c.query("SELECT nextval('wl_invoice_seq') AS n");invoice='WL-INV-'+String(s.rows[0].n).padStart(6,'0')}
  const u=await c.query('UPDATE wl_proposals SET items=$2::jsonb,total_cents=$3,deposit_cents=$4,balance_cents=$5,status=$6,version=version+1,updated_at=now(),invoice_no=COALESCE($7,invoice_no),accepted_at=CASE WHEN $6=$8 THEN now() ELSE accepted_at END,declined_at=CASE WHEN $6=$9 THEN now() ELSE declined_at END WHERE id=$1 RETURNING status,version,total_cents,deposit_cents,balance_cents,invoice_no',[p.id,JSON.stringify(calc.items),calc.total,calc.deposit,calc.balance,status,invoice,'accepted','declined']);
  await event(c,p.id,status,{reason:toText(b.reason,300),total_cents:calc.total});
  await c.query('COMMIT');
  res.json({...u.rows[0],invoice_pdf:invoice?ORIGIN+'/api/sales/proposal/'+req.params.token+'/invoice.pdf':null});
 }catch{await c.query('ROLLBACK').catch(()=>{});res.status(500).json({error:'Could not save your decision.'})}finally{c.release()}
});
app.get('/api/sales/proposal/:token/invoice.pdf',requireDb,async(req,res)=>{
 if(!validToken(req.params.token))return res.sendStatus(404);
 const q=await pool.query("SELECT * FROM wl_proposals WHERE token=$1 AND status='accepted'",[req.params.token]);
 if(!q.rowCount||!q.rows[0].invoice_no)return res.status(404).send('Invoice not yet issued');
 const p=q.rows[0],pdf=new PDFDocument({size:'A4',margin:48});
 res.type('pdf');res.set('Content-Disposition','attachment; filename="'+p.invoice_no+'.pdf"');pdf.pipe(res);
 pdf.fontSize(24).fillColor('#12573d').text('WEBLIFT SA').fontSize(10).fillColor('#526b5a').text('Webliftsa T/A Mr P E Tlatsi').moveDown();
 pdf.fontSize(19).fillColor('#183b2d').text('DEPOSIT INVOICE').moveDown().fontSize(10).text('Invoice: '+p.invoice_no).text('Client: '+p.client_name).text('Company: '+p.company).text('Issued: '+new Date(p.accepted_at).toLocaleDateString('en-ZA')).moveDown();
 pdf.fontSize(12).text('Approved services').moveDown(.5);
 for(const line of p.items){if(!line.selected)continue;if(pdf.y>660)pdf.addPage();pdf.fontSize(9).text(line.label+': '+(line.included?'Included':rand(line.amount_cents)))}
 pdf.moveDown().fontSize(12).text('Total project value: '+rand(p.total_cents)).text('75% deposit payable: '+rand(p.deposit_cents)).text('25% payable on live launch: '+rand(p.balance_cents));
 if(p.monthly_cents)pdf.fontSize(10).text('Agreed separate monthly service: '+rand(p.monthly_cents));
 pdf.moveDown().fontSize(10).text('Bank: African Bank').text('Account: 20160546562').text('Beneficiary: Webliftsa T/A Mr P E Tlatsi').text('Payment reference: '+p.invoice_no);
 pdf.moveDown().fontSize(9).text('VAT not charged (supplier not currently VAT registered). The 25% balance is payable immediately after the website is live and operational under the agreed terms.');
 pdf.end();
});
app.use((req,res)=>res.status(404).json({error:'Endpoint not found'}));
app.listen(PORT,'0.0.0.0',()=>console.log('WebLift sales API listening on '+PORT));

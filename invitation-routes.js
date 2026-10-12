import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trim=(s,max=150)=>String(s??'').trim().slice(0,max);
const serviceIds=new Set(['websites','domains','marketing','social','seo','ads','design','support','commerce','nexora']);
const validToken=s=>/^[A-Za-z0-9_-]{40,90}$/.test(String(s??''));
function validProjectUrl(raw){
 if(!raw)return '';
 try{
  const u=new URL(String(raw).trim());
  const h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h==='0.0.0.0'||h==='::1'||/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))return '';
  return u.href.slice(0,450);
 }catch{return ''}
}
function phone(s){
 const v=trim(s,40).replace(/[^\d+]/g,'');
 return v.startsWith('00')?'+'+v.slice(2):v;
}
let heroCache=null;
async function coverImage(origin){
 if(heroCache&&Date.now()-heroCache.time<3600000)return heroCache.data;
 const sources=[
  'https://images.pexels.com/photos/10375897/pexels-photo-10375897.jpeg?auto=compress&cs=tinysrgb&w=1600',
  origin+'/premium-v3/assets/hero-nexora-v3.webp'
 ];
 let buffer;
 for(const address of sources){
  try{
   const c=new AbortController(),timer=setTimeout(()=>c.abort(),5000);
   try{
    const r=await fetch(address,{signal:c.signal,headers:{Accept:'image/jpeg,image/webp,image/png'}});
    if(!r.ok)throw Error('Image request failed');
    const b=Buffer.from(await r.arrayBuffer());
    if(b.length<2000||b.length>7000000)throw Error('Image invalid');
    buffer=await sharp(b,{animated:false,limitInputPixels:22000000}).resize(1200,420,{fit:'cover',position:'centre'}).jpeg({quality:82}).toBuffer();
    break;
   }finally{clearTimeout(timer)}
  }catch{}
 }
 if(!buffer)buffer=await sharp({create:{width:1200,height:420,channels:3,background:'#c4ddc9'}}).jpeg().toBuffer();
 heroCache={data:buffer,time:Date.now()};return buffer;
}
async function invitationJpeg(origin,business,tone){
 const background=await coverImage(origin);
 const name=trim(String(business||'Your business').replace(/&amp;/g,'&'),42);
 const heading=tone==='grateful'?'THANK YOU FOR THE OPPORTUNITY':'AN INVITATION TO GROW';
 const svg=[
 '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">',
 '<rect x="0" y="0" width="1200" height="76" fill="#f8faf4"/>',
 '<rect width="1200" height="8" fill="#136648"/>',
 '<text x="38" y="52" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="#135640">WebLift SA</text>',
 '<text x="1160" y="48" text-anchor="end" font-family="Arial,sans-serif" font-size="16" fill="#718376">PRETORIA • SOUTH AFRICA</text>',
 '<rect x="0" y="76" width="1200" height="418" fill="#0c5036" opacity=".13"/>',
 '<rect x="0" y="494" width="1200" height="136" fill="#f8faf4"/>',
 '<text x="38" y="531" font-family="Arial,sans-serif" font-size="17" font-weight="bold" fill="#a47b47">',esc(heading),'</text>',
 '<text x="38" y="578" font-family="Arial,sans-serif" font-size="38" font-weight="bold" fill="#103f2e">',esc(name),'</text>',
 '<text x="39" y="609" font-family="Arial,sans-serif" font-size="17" fill="#597a63">Websites • Marketing • Social media • Nexora opportunities</text>',
 '</svg>'
 ].join('');
 return sharp({create:{width:1200,height:630,channels:3,background:'#eef5ec'}})
  .composite([{input:background,left:0,top:76},{input:Buffer.from(svg),left:0,top:0}])
  .jpeg({quality:81}).toBuffer();
}
export function mountInvitations(app,{pool,requireDb,authenticate,writable,origin}){
 const unavailable=res=>res.status(503).json({error:'Invitations are temporarily unavailable. Please retry.'});
 app.post('/api/sales/admin/invitations',authenticate,writable,requireDb,async(req,res)=>{
  const b=req.body||{},recipient=trim(b.recipient_name,100),business=trim(b.business_name,120);
  const mobile=phone(b.phone),email=trim(b.email,180);
  const tone=['grateful','opportunity'].includes(b.tone)?b.tone:null;
  if(recipient.length<2||business.length<2)return res.status(400).json({error:'Recipient and business names are required.'});
  if(!/^\+?\d{9,15}$/.test(mobile))return res.status(400).json({error:'A valid contact/WhatsApp number is required.'});
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Email is optional; enter a valid address if supplied.'});
  if(!tone)return res.status(400).json({error:'Choose a message style.'});
  if(b.outreach_basis_confirmed!==true)return res.status(400).json({error:'Confirm that WebLift has an appropriate reason to contact this person.'});
  const services=Array.isArray(b.services)?[...new Set(b.services.map(x=>trim(x,30)).filter(x=>serviceIds.has(x)))].slice(0,10):[];
  if(!services.length)return res.status(400).json({error:'Choose at least one relevant WebLift service.'});
  const note=trim(b.personal_message,750),project=validProjectUrl(b.project_url);
  if(b.project_url&&!project)return res.status(400).json({error:'Optional website preview must be a public HTTPS address.'});
  const token=randomBytes(32).toString('base64url');
  try{
   const q=await pool.query(
    "INSERT INTO wl_invitations(token,recipient_name,business_name,phone,email,tone,selected_services,personal_message,project_url,created_by,outreach_basis_confirmed) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11) RETURNING id,token,recipient_name,business_name,phone,email,tone,selected_services,personal_message,project_url,status,views,created_at",
    [token,recipient,business,mobile,email,tone,JSON.stringify(services),note,project,req.administrator.actor,true]);
   res.status(201).json({invitation:{...q.rows[0],share_url:origin+'/your-invitation?token='+encodeURIComponent(token)+'&v=1'}});
  }catch{return unavailable(res)}
 });
 app.get('/api/sales/admin/invitations',authenticate,requireDb,async(req,res)=>{
  try{
   const q=await pool.query("SELECT id,token,recipient_name,business_name,phone,email,tone,selected_services,personal_message,project_url,status,views,first_viewed_at,last_viewed_at,client_contact_consent,response_at,created_at FROM wl_invitations ORDER BY created_at DESC LIMIT 200");
   res.json({invitations:q.rows.map(x=>({...x,share_url:origin+'/your-invitation?token='+encodeURIComponent(x.token)+'&v=1'}))});
  }catch{return unavailable(res)}
 });
 app.post('/api/sales/admin/invitations/:id/revoke',authenticate,writable,requireDb,async(req,res)=>{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.id))return res.status(400).json({error:'Invalid invitation.'});
  try{
   const q=await pool.query("UPDATE wl_invitations SET status='revoked',revoked_at=now(),updated_at=now() WHERE id=$1 AND status!='revoked' RETURNING id,status",[req.params.id]);
   if(!q.rowCount)return res.status(404).json({error:'Invitation not found or already revoked.'});
   res.json(q.rows[0]);
  }catch{return unavailable(res)}
 });
 app.get('/api/sales/invitation/:token',requireDb,async(req,res)=>{
  const token=trim(req.params.token,120);
  if(!validToken(token))return res.status(404).json({error:'Invitation not found.'});
  try{
   const q=await pool.query(
    "UPDATE wl_invitations SET views=views+1,first_viewed_at=COALESCE(first_viewed_at,now()),last_viewed_at=now(),updated_at=now(),status=CASE WHEN status='created' THEN 'viewed' ELSE status END WHERE token=$1 AND status!='revoked' RETURNING recipient_name,business_name,tone,selected_services,personal_message,project_url,status,created_at",
    [token]);
   if(!q.rowCount)return res.status(404).json({error:'This invitation is no longer available.'});
   res.json({invitation:q.rows[0]});
  }catch{return unavailable(res)}
 });
 const seen=new Map();
 app.post('/api/sales/invitation/:token/respond',requireDb,async(req,res)=>{
  const token=trim(req.params.token,120),decision=req.body?.decision;
  if(!validToken(token)||!['interested','not_now'].includes(decision))return res.status(400).json({error:'Invalid response.'});
  const consent=req.body?.contact_consent===true;
  if(decision==='interested'&&!consent)return res.status(400).json({error:'Please consent to WebLift contacting you before requesting a follow-up.'});
  const key=token+decision,now=Date.now();
  if(now-(seen.get(key)||0)<15000)return res.status(429).json({error:'Please wait before sending another response.'});
  if(seen.size>500)seen.clear();seen.set(key,now);
  try{
   const q=await pool.query(
    "UPDATE wl_invitations SET status=$2,client_contact_consent=$3,response_at=now(),updated_at=now() WHERE token=$1 AND status NOT IN ('revoked','interested','not_now') RETURNING status",
    [token,decision,consent]);
   if(!q.rowCount)return res.status(409).json({error:'This invitation has already been answered or withdrawn.'});
   res.json({ok:true,status:q.rows[0].status});
  }catch{return unavailable(res)}
 });
 const getCard=async token=>{
  if(!validToken(token))return null;
  const q=await pool.query("SELECT business_name,tone FROM wl_invitations WHERE token=$1 AND status!='revoked' LIMIT 1",[token]);
  return q.rows[0]||null;
 };
 function serve(res,item,url,image){
  const company=trim(item.business_name,100);
  const title=company+' | '+(item.tone==='grateful'?'Thank you for the opportunity':'A personal invitation to grow')+' · WebLift SA';
  const description='Explore websites, digital marketing, social media, branding and business opportunities with WebLift SA and Nexora.';
  const data=[
   ['property','og:type','website'],['property','og:site_name','WebLift SA'],['property','og:locale','en_ZA'],
   ['property','og:title',title],['property','og:description',description],['property','og:url',url],
   ['property','og:image',image],['property','og:image:secure_url',image],
   ['property','og:image:type','image/jpeg'],['property','og:image:width','1200'],['property','og:image:height','630'],
   ['name','twitter:card','summary_large_image'],['name','twitter:title',title],
   ['name','twitter:description',description],['name','twitter:image',image]
  ].map(([a,k,v])=>'<meta '+a+'="'+esc(k)+'" content="'+esc(v)+'">').join('\n');
  let html=readFileSync('invitation.html','utf8');
  html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+esc(title)+'</title>').replace('</head>',data+'\n</head>');
  res.set('Content-Type','text/html; charset=utf-8').set('X-Robots-Tag','noindex,nofollow,noarchive');
  return res.status(200).send(html);
 }
 app.get('/your-invitation',requireDb,async(req,res)=>{
  const token=trim(req.query.token,120);
  try{
   const record=await getCard(token);
   if(!record)return res.status(404).send('This WebLift invitation is not available.');
   serve(res,record,origin+'/your-invitation?token='+encodeURIComponent(token)+'&v=1',origin+'/invite-card/'+encodeURIComponent(token)+'.jpg?v=1');
  }catch{return res.status(503).send('Invitation temporarily unavailable.')}
 });
 app.get('/invite-card/:token.jpg',requireDb,async(req,res)=>{
  try{
   const record=await getCard(trim(req.params.token,120));
   if(!record)return res.sendStatus(404);
   const jpeg=await invitationJpeg(origin,record.business_name,record.tone);
   return res.set('Content-Type','image/jpeg').set('Cache-Control','public,max-age=86400').send(jpeg);
  }catch{return res.sendStatus(503)}
 });
 // Non-sensitive demo that cannot create a customer record.
 app.get('/invite-demo',(_req,res)=>serve(res,{business_name:'Your South African Business',tone:'opportunity'},origin+'/invite-demo',origin+'/invite-card-demo.jpg'));
 app.get('/invite-card-demo.jpg',async(_req,res)=>{
  try{
   const jpeg=await invitationJpeg(origin,'Your South African Business','opportunity');
   return res.set('Content-Type','image/jpeg').set('Cache-Control','public,max-age=3600').send(jpeg);
  }catch{return res.sendStatus(503)}
 });
}

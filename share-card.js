import {readFileSync} from 'node:fs';
import sharp from 'sharp';
// Only public WebLift portfolio sites are eligible for third-party screenshot capture.
const catalogue=new Map([
 ['prisca-security-training.vercel.app','prisca-hero.webp'],['natura-natural-living.vercel.app','natura-bowl.webp'],
 ['ndo-architectural-studio-concept.vercel.app','ndo-architecture.webp'],['the-food-theory.pholoso100.workers.dev','food-burger.jpg'],
 ['landmark-entertainment-events.vercel.app','landmark-event.jpg'],['viking-painting-sa.vercel.app','viking-painting.webp'],
 ['sunnyside-dental-studio.vercel.app','dental.jpg'],['luxe-restaurant-weblift.vercel.app','restaurant.jpg'],
 ['kingsman-construction.vercel.app','construction.jpg'],['merline-beauty.vercel.app','beauty.jpg'],
 ['sweet-hubbly.vercel.app','gifting.jpg'],['fishaways-redesign.vercel.app','seafood.jpg']
]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function approved(url){
 try{const u=new URL(String(url||''));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&catalogue.has(u.hostname.toLowerCase())?u:null}catch{return null}
}
const cache=new Map(),inflight=new Map();
async function retrieve(url,timeout=4200){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const r=await fetch(url,{signal:controller.signal,headers:{Accept:'image/png,image/jpeg,image/webp'}});
  if(!r.ok||!(r.headers.get('content-type')||'').startsWith('image/'))throw Error('Image request failed');
  const b=Buffer.from(await r.arrayBuffer());
  if(b.length<3000||b.length>7000000)throw Error('Unexpected image size');
  const m=await sharp(b,{animated:false,limitInputPixels:25000000}).metadata();
  if(m.width<320||m.height<160)throw Error('Thumbnail dimensions invalid');
  return b;
 }finally{clearTimeout(timer)}
}
async function unfinished(b){
 const r=await sharp(b,{animated:false}).resize(40,25).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let white=0,gray=0;const total=r.info.width*r.info.height;
 for(let i=0;i<r.data.length;i+=r.info.channels){
  const a=r.data[i],b=r.data[i+1],c=r.data[i+2];
  if(a>225&&b>225&&c>225)white++;
  if(Math.max(a,b,c)-Math.min(a,b,c)<13)gray++;
 }
 return white/total>.83&&gray/total>.93;
}
async function coverFor(siteUrl,origin){
 const site=approved(siteUrl),key=site?.hostname||'default';
 const old=cache.get(key);
 if(old&&Date.now()-old.time<15*60*1000)return old;
 if(inflight.has(key))return inflight.get(key);
 const work=(async()=>{
  let image=null,kind='artwork';
  if(site){
   try{
    // "noanimate" blocks for the final screenshot instead of streaming the spinner.
    const candidate=await retrieve('https://image.thum.io/get/noanimate/ogImage/'+site.href,4500);
    if(await unfinished(candidate))throw Error('Loading frame detected');
    image=candidate;kind='completed-screenshot';
   }catch{}
  }
  if(!image){
   const file=site?'/premium-v3/assets/'+catalogue.get(site.hostname):'/premium-v3/assets/hero-nexora-v3.webp';
   try{image=await retrieve(origin+file,4500)}catch{}
  }
  if(!image){
   image=Buffer.from('<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#dbefdf"/><path d="M0 520 1200 200V630H0Z" fill="#b1d4bc"/></svg>');
   kind='brand-only';
  }
  const c={image,kind,time:Date.now()};cache.set(key,c);
  if(cache.size>50)cache.delete(cache.keys().next().value);
  return c;
 })();
 inflight.set(key,work);
 try{return await work}finally{inflight.delete(key)}
}
export function warmShareCover(siteUrl,origin){void coverFor(siteUrl,origin).catch(()=>{})}
async function compose({siteUrl,name,origin}){
 const c=await coverFor(siteUrl,origin);
 const cover=await sharp(c.image,{animated:false,limitInputPixels:25000000})
  .resize(1140,444,{fit:'cover',position:'north'}).jpeg({quality:81}).toBuffer();
 const site=approved(siteUrl),host=site?.hostname||'Your new business website';
 const short=v=>String(v).length>46?String(v).slice(0,44)+'…':String(v);
 const svg=[
 '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">',
 '<rect width="1200" height="630" fill="#fafcf7"/><rect width="1200" height="8" fill="#0f6849"/>',
 '<rect x="30" y="23" width="1140" height="54" rx="14" fill="#edf4ee"/>',
 '<circle cx="54" cy="49" r="6" fill="#df9688"/><circle cx="76" cy="49" r="6" fill="#dfbd76"/><circle cx="98" cy="49" r="6" fill="#93c49d"/>',
 '<rect x="124" y="33" width="550" height="33" rx="11" fill="#fff"/>',
 '<text x="146" y="55" font-family="Arial,sans-serif" font-size="18" fill="#46705c">',esc(short(host)),'</text>',
 '<text x="1143" y="56" font-family="Arial,sans-serif" font-size="24" font-weight="bold" text-anchor="end" fill="#115940">WebLift SA</text>',
 '<rect x="29" y="82" width="1142" height="450" rx="7" fill="none" stroke="#d6e1d7" stroke-width="3"/>',
 '<rect y="543" width="1200" height="87" fill="#fafcf7"/>',
 '<text x="32" y="586" font-family="Arial,sans-serif" font-size="31" font-weight="bold" fill="#174635">',esc(short(String(name||'Website preview').replace(/&amp;/g,'&'))),'</text>',
 '<text x="33" y="612" font-family="Arial,sans-serif" font-size="15" fill="#667e70">PREVIEW YOUR WEBSITE · PREPARED BY WEBLIFT SA · SOUTH AFRICA</text>',
 '<rect x="1089" y="567" width="84" height="34" rx="12" fill="#dcefe1"/>',
 '<text x="1131" y="590" font-size="17" text-anchor="middle" fill="#126344" font-family="Arial,sans-serif" font-weight="bold">VIEW ↗</text>',
 '</svg>'
 ].join('');
 return sharp({create:{width:1200,height:630,channels:3,background:'#fafcf7'}})
  .composite([{input:cover,top:90,left:30},{input:Buffer.from(svg),top:0,left:0}])
  .jpeg({quality:79}).toBuffer();
}
function renderCard(res,{origin,name,canonical,image}){
 const project=String(name||'Your new website').replace(/&amp;/g,'&').slice(0,100);
 const title=project+' | Website Preview · WebLift SA';
 const description='See a first look at '+project+' and review your private WebLift website proposal.';
 const meta=[
 ['property','og:type','website'],['property','og:site_name','WebLift SA'],['property','og:locale','en_ZA'],
 ['property','og:title',title],['property','og:description',description],['property','og:url',canonical],
 ['property','og:image',image],['property','og:image:secure_url',image],['property','og:image:type','image/jpeg'],
 ['property','og:image:width','1200'],['property','og:image:height','630'],
 ['property','og:image:alt','WebLift website preview for '+project],
 ['name','twitter:card','summary_large_image'],['name','twitter:title',title],
 ['name','twitter:description',description],['name','twitter:image',image]
 ].map(([attr,key,value])=>'<meta '+attr+'="'+esc(key)+'" content="'+esc(value)+'">').join('\n');
 let html=readFileSync('proposal.html','utf8');
 html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+esc(title)+'</title>').replace('</head>',meta+'\n</head>');
 res.set('Content-Type','text/html; charset=utf-8');
 res.set('X-Robots-Tag','noindex, nofollow, noarchive');
 res.set('Cache-Control','private, no-store');
 return res.status(200).send(html);
}
export function mountShareCards(app,{pool,requireDb,origin,validToken}){
 const demo={name:'NDO Architectural Studio',url:'https://ndo-architectural-studio-concept.vercel.app/'};
 app.get('/share',requireDb,async(req,res)=>{
  const token=String(req.query.token??'').slice(0,120);
  if(!validToken(token))return res.sendStatus(404);
  try{
   const q=await pool.query('SELECT project_id,project_url,company FROM wl_proposals WHERE token=$1 LIMIT 1',[token]);
   if(!q.rowCount)return res.sendStatus(404);
   const p=q.rows[0];
   return renderCard(res,{origin,name:p.project_id||p.company,canonical:origin+'/share?token='+encodeURIComponent(token)+'&pv=3',image:origin+'/share-image/'+encodeURIComponent(token)+'.jpg?pv=3'});
  }catch{return res.status(503).send('WebLift proposal preview temporarily unavailable')}
 });
 app.get('/share-image/:token.jpg',requireDb,async(req,res)=>{
  const token=String(req.params.token??'').slice(0,120);
  if(!validToken(token))return res.sendStatus(404);
  try{
   const q=await pool.query('SELECT project_id,project_url,company FROM wl_proposals WHERE token=$1 LIMIT 1',[token]);
   if(!q.rowCount)return res.sendStatus(404);
   const p=q.rows[0],jpeg=await compose({siteUrl:p.project_url,name:p.project_id||p.company,origin});
   return res.status(200).set('Content-Type','image/jpeg').set('Cache-Control','public,max-age=86400').send(jpeg);
  }catch{return res.status(503).send('Image temporarily unavailable')}
 });
 app.get('/share-preview-demo',(req,res)=>renderCard(res,{
  origin,name:demo.name,canonical:origin+'/share-preview-demo?pv=3',image:origin+'/share-image-demo.jpg?pv=3'
 }));
 app.get('/share-image-demo.jpg',async(req,res)=>{
  try{
   const jpeg=await compose({siteUrl:demo.url,name:demo.name,origin});
   return res.status(200).set('Content-Type','image/jpeg').set('Cache-Control','public,max-age=3600').send(jpeg);
  }catch{return res.sendStatus(503)}
 });
}
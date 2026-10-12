import {readFileSync} from 'node:fs';

// The social card contains only project identity and a screenshot of its public website.
// Never send customer contact details, proposal line items, payment info or tokens to image providers.
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function screenshotTarget(value){
 try{
  const u=new URL(String(value??'').trim()),h=u.hostname.toLowerCase();
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;
  if(h==='localhost'||h==='0.0.0.0'||h==='::1'||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h.endsWith('.invalid'))return null;
  if(/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))return null;
  return u;
 }catch{return null}
}
const imageFor = (url,origin) => {
 const website=screenshotTarget(url);
 return website?'https://image.thum.io/get/ogImage/'+website.href :origin+'/premium-v3/assets/hero-nexora-v3.webp';
};
function renderCard(res,{origin,projectName,projectUrl,canonical}){
 const name=String(projectName||'Your business website').trim().slice(0,100);
 const title=name+' | Website Preview · WebLift SA';
 const description='Preview the actual '+name+' website and review your private proposal from WebLift SA, South Africa.';
 const image=imageFor(projectUrl,origin);
 const meta=[
  ['property','og:type','website'],
  ['property','og:site_name','WebLift SA'],
  ['property','og:locale','en_ZA'],
  ['property','og:title',title],
  ['property','og:description',description],
  ['property','og:url',canonical],
  ['property','og:image',image],
  ['property','og:image:secure_url',image],
  ['property','og:image:width','1200'],
  ['property','og:image:height','630'],
  ['property','og:image:alt','Real website screenshot preview for '+name],
  ['name','twitter:card','summary_large_image'],
  ['name','twitter:title',title],
  ['name','twitter:description',description],
  ['name','twitter:image',image]
 ].map(([attribute,key,value])=>'<meta '+attribute+'="'+esc(key)+'" content="'+esc(value)+'">').join('\n');
 let html=readFileSync('proposal.html','utf8');
 html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+esc(title)+'</title>');
 html=html.replace('</head>',meta+'\n</head>');
 res.set('Content-Type','text/html; charset=utf-8');
 res.set('X-Robots-Tag','noindex, nofollow, noarchive');
 res.status(200).send(html);
}
export function mountShareCards(app,{pool,requireDb,origin,validToken}){
 app.get('/share',requireDb,async(req,res)=>{
  const token=String(req.query.token??'').slice(0,120);
  if(!validToken(token))return res.status(404).send('This WebLift project link is invalid.');
  try{
   const r=await pool.query('SELECT project_id,project_url,company FROM wl_proposals WHERE token=$1 LIMIT 1',[token]);
   if(!r.rowCount)return res.status(404).send('WebLift proposal not found.');
   const p=r.rows[0];
   return renderCard(res,{origin,projectName:p.project_id||p.company||'Your website',projectUrl:p.project_url,canonical:origin+'/share?token='+encodeURIComponent(token)});
  }catch{
   return res.status(503).send('Your WebLift proposal preview is temporarily unavailable.');
  }
 });
 // A non-sensitive public test page for social-card verification.
 app.get('/share-preview-demo',(req,res)=>renderCard(res,{
  origin,projectName:'PRISCA Security & Training',
  projectUrl:'https://prisca-security-training.vercel.app/',
  canonical:origin+'/share-preview-demo'
 }));
}

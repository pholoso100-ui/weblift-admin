const $=id=>document.getElementById(id);
// First-party API paths allow WebLift to migrate hosts without invalidating old links.
const API='';
const token=new URLSearchParams(location.search).get('token')||'';
const demo=location.pathname==='/invite-demo';
let invitation=null,busy=false;
const SERVICE={
 websites:['Websites & landing pages','🖥️','Premium, mobile-friendly sites with enquiry paths, galleries, quotation tools and a clear business identity.'],
 domains:['Domains & business email','🌐','Domain guidance, professional email setup, hosting arrangements and launch support.'],
 marketing:['Digital marketing plans','📣','Practical campaigns and ongoing plans to introduce your business to the right audience.'],
 social:['Social media setup & management','📱','Facebook, Instagram and relevant platform pages, content design, posting schedules and account support.'],
 seo:['Google visibility & local SEO','📍','Google Business Profile, search-friendly content, local discovery, insights and improvements over time.'],
 ads:['Google & Meta advertising','🎯','Campaign planning, sponsored promotions, budget guidance and performance monitoring; ad spend is separate.'],
 design:['Branding & print design','✦','Logos, business cards, pamphlets, brochures and digital artwork; print and delivery options by arrangement.'],
 support:['Website care & reporting','🛠️','Updates, content changes, maintenance, performance reporting and customer-enquiry improvements.'],
 commerce:['Online stores & commerce','🛍️','Product catalogues, enquiry or checkout workflows and appropriate payment integrations.'],
 nexora:['Nexora opportunities','✨','Explore the wider Nexora One community and developing tools that may support future growth.']
};

// Deep links point to WebLift's verified live pages, not speculative service routes.
const SERVICE_LINK={
 websites:'https://weblift-sa.vercel.app/#services',
 domains:'https://weblift-sa.vercel.app/#packages',
 marketing:'https://weblift-sa.vercel.app/marketing.html',
 social:'https://weblift-sa.vercel.app/marketing.html',
 seo:'https://weblift-sa.vercel.app/marketing.html',
 ads:'https://weblift-sa.vercel.app/marketing.html',
 design:'https://weblift-sa.vercel.app/marketing.html#builder',
 support:'https://weblift-sa.vercel.app/#packages',
 commerce:'https://weblift-sa.vercel.app/#services',
 nexora:'https://weblift-sa.vercel.app/#growth'
};
let demoTimer=null;
const demoSteps=[
 'Your customer finds your website or social page and is ready to discover your business.',
 'A sample enquiry is captured and organised for follow-up. No real customer data is used.',
 'A quotation or response can be prepared for review and approval. This simulation sends nothing.',
 'Marketing content and performance reports can help maintain momentum after launch.'
];
let demoStage=-1;
function paintAutomation(step){
 const boxes=[...document.querySelectorAll('.autom-stage')];
 for(let i=0;i<boxes.length;i++){
  boxes[i].classList.toggle('is-active',i===step);
  boxes[i].classList.toggle('is-done',i<step);
  const check=boxes[i].querySelector('.autom-check');
  if(check)check.textContent=i<step?'✓':i===step?'●':'○';
 }
 const fill=$('autom-progress-fill');
 if(fill)fill.style.width=step<0?'0%':((step+1)/4*100)+'%';
 const desc=$('automation-description');
 if(desc)desc.textContent=step<0?'Ready to see a sample of how connected digital services could support a growing business.':demoSteps[step]+(step===3?' Demonstration complete. Explore the actual WebLift services to discuss an implementation.':'');
 const button=$('run-automation');
 if(button){button.disabled=demoTimer!==null;button.textContent=step===3?'↻ Run again':'▶ Run the demonstration'}
}
function stopAutomation(){
 if(demoTimer!==null){clearInterval(demoTimer);demoTimer=null}
}
function startAutomation(){
 stopAutomation();demoStage=0;paintAutomation(demoStage);
 const run=$('run-automation');if(run)run.disabled=true;
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  demoStage=3;paintAutomation(3);return;
 }
 demoTimer=window.setInterval(()=>{
  demoStage++;
  if(demoStage>=3){stopAutomation();demoStage=3}
  paintAutomation(demoStage);
 },1100);
}
function resetAutomation(){stopAutomation();demoStage=-1;paintAutomation(-1)}

function status(message,err=false){
 const x=$('response-status');x.textContent=message;x.style.color=err?'#ffd2b2':'#d6eddb';
}
function make(tag,className,text){
 const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;
}
function safePublicUrl(input){
 try{const u=new URL(String(input||''));return u.protocol==='https:'?u.href:null}catch{return null}
}
function render(data){
 invitation=data;
 const name=String(data.recipient_name||'there').split(/\s+/)[0];
 const business=data.business_name||'your business';
 const grateful=data.tone==='grateful';
 $('greeting').textContent='Hello '+name+',';
 $('headline').replaceChildren();
 if(grateful){
  $('headline').append(document.createTextNode('Thank you for the '),make('em','', 'opportunity.'));
  $('intro').textContent='We appreciate the chance to explore '+business+' with you. We are excited to show what a thoughtful digital partnership could look like.';
  $('personal-heading').textContent='We appreciate your trust.';
  $('personal-body').textContent='Thank you for taking the time to speak with us about '+business+'. Whether we have already started designing a concept or are planning the next phase, your confidence in WebLift matters. We would love to share what else we can bring to your business—from your website to ongoing marketing and future opportunities.';
 }else{
  $('headline').append(document.createTextNode('Your vision. '),make('em','','Our opportunity to help.'));
  $('intro').textContent=business+' has a story worth sharing. Give WebLift SA a chance to show you how a polished online presence and purposeful marketing could help.';
  $('personal-heading').textContent='We would love to earn your trust.';
  $('personal-body').textContent='Hello '+name+'. We believe '+business+' deserves to be seen, remembered and supported. We would value the opportunity to listen to your goals, share a few ideas and prepare a solution that suits your needs and budget. Even a brief conversation could be the beginning of something worthwhile.';
 }
 const note=String(data.personal_message||'').trim();
 $('personal-message').hidden=!note;
 $('personal-message').textContent=note;
 const selected=new Set(Array.isArray(data.selected_services)?data.selected_services:[]);
 const tags=$('service-tags');tags.replaceChildren();
 for(const id of selected)if(SERVICE[id]){
  const link=make('a','',SERVICE[id][0]+' ↗');
  link.href=SERVICE_LINK[id];link.target='_blank';link.rel='noopener noreferrer';
  link.style.cssText='display:inline-flex;align-items:center;background:#eaf4e8;border:1px solid #c9e0ce;border-radius:999px;padding:9px 13px;color:#175d41;font-weight:750;font-size:11px;text-decoration:none';
  tags.append(link);
 }
 const grid=$('service-grid');grid.replaceChildren();
 const ids=[...selected].filter(id=>SERVICE[id]);
 for(const id of Object.keys(SERVICE))if(!ids.includes(id))ids.push(id);
 for(const id of ids){
  const [title,emoji,desc]=SERVICE[id];const card=make('article','service-card'+(selected.has(id)?' relevant':''));
  card.append(make('div','emblem',emoji));
  if(selected.has(id))card.append(make('div','recommended','Selected for your business'));
  const deep=make('a','',id==='nexora'?'Explore Nexora ↗':id==='marketing'||id==='social'?'Discover marketing plans ↗':'See how it works ↗');
  deep.href=SERVICE_LINK[id];deep.target='_blank';deep.rel='noopener noreferrer';deep.setAttribute('aria-label','Explore '+title+' on WebLift SA');
  card.append(make('h3','',title),make('p','',desc),deep);grid.append(card);
 }
 const url=safePublicUrl(data.project_url);
 if(url){
  $('preview-section').hidden=false;
  $('preview-address').textContent=new URL(url).hostname;
  $('preview-frame').src=url;
  $('preview-open').href=url;
 }
 if(['interested','not_now'].includes(data.status)){
  $('interested').disabled=true;$('later').disabled=true;$('allow-contact').disabled=true;
  status(data.status==='interested'?'Thank you. Your interest has already been shared with WebLift SA.':'Thank you for considering us. This invitation has been answered.');
 }
 $('loading').hidden=true;$('app').hidden=false;
}
async function load(){
 if(demo){
  render({recipient_name:'Business Owner',business_name:'Your South African Business',tone:'opportunity',
   selected_services:['websites','social','marketing','design','seo'],personal_message:'We believe your next chapter could begin with a single conversation.',project_url:'',status:'created'});
  $('interested').disabled=true;$('later').disabled=true;
  status('Design demonstration only. No client records are created from this page.');
  return;
 }
 if(!/^[A-Za-z0-9_-]{40,90}$/.test(token))throw Error('This invitation link is missing or invalid.');
 const response=await fetch(API+'/api/sales/invitation/'+encodeURIComponent(token),{cache:'no-store'});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(body.error||'Your invitation could not be opened.');
 render(body.invitation);
}
async function respond(decision){
 if(demo||busy||!invitation)return;
 if(decision==='interested'&&!$('allow-contact').checked){
  status('Please tick the contact-permission box so WebLift can follow up with you.',true);return;
 }
 busy=true;$('interested').disabled=true;$('later').disabled=true;
 status('Saving your response…');
 try{
  const r=await fetch(API+'/api/sales/invitation/'+encodeURIComponent(token)+'/respond',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({decision,contact_consent:decision==='interested'&&$('allow-contact').checked})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(j.error||'Could not send response.');
  status(decision==='interested'?'Thank you! WebLift SA has received your interest and can contact you about your business.':'Thank you for your time. We wish your business every success.');
 }catch(e){status(e.message||'Please try again.',true);$('interested').disabled=false;$('later').disabled=false}
 finally{busy=false}
}
$('run-automation')?.addEventListener('click',startAutomation);
$('reset-automation')?.addEventListener('click',resetAutomation);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAutomation()});
paintAutomation(-1);
$('interested').addEventListener('click',()=>respond('interested'));
$('later').addEventListener('click',()=>respond('not_now'));
load().catch(e=>{
 $('loading').replaceChildren(make('div','',undefined));
 const box=$('loading').firstChild;
 box.append(make('h2','','Invitation unavailable'),make('p','',e.message+' Please ask WebLift SA for a new link.'));
});

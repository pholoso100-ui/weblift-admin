const API='https://weblift-sales-api.onrender.com';
const $=id=>document.getElementById(id);
let started=false,busy=false,active=false,authorized=()=>false,notice=()=>{};
const iconStatus={created:'READY TO SHARE',viewed:'OPENED',interested:'INTERESTED',not_now:'NOT RIGHT NOW',revoked:'REVOKED'};
const money=x=>'R'+Number(x||0).toLocaleString('en-ZA');
async function authRequest(path,opts={}){
 const mod=await import('/premium-v3/customer-auth.js');await mod.ready;
 if(!authorized()||!mod.auth.currentUser)throw Error('Please sign in with an approved WebLift admin account.');
 const bearer=await mod.auth.currentUser.getIdToken();
 const r=await fetch(API+path,{...opts,cache:'no-store',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',...(opts.headers||{})}});
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(body.error||'The invitation service could not complete this request.');
 return body;
}
function whatsappNumber(raw){
 let digits=String(raw||'').replace(/\D/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 return digits.length===10&&digits.startsWith('0')?'27'+digits.slice(1):digits;
}
function shareMessage(row){
 const name=String(row.recipient_name||'').split(' ')[0];
 const intro=row.tone==='grateful'
   ?'Thank you for the opportunity to explore your business with us.'
   :"We'd love an opportunity to show you what WebLift SA can do for your business.";
 return 'Hello '+name+',\n\n'+intro+
  '\n\nWe have prepared a personal WebLift SA invitation for '+row.business_name+' — featuring website design, social media marketing, branding and more.\n\n'+
  row.share_url+'\n\nWe would appreciate a moment of your time to explore it. 🇿🇦\nWebLift SA · Nexora Technologies';
}
function waUrl(row){
 return 'https://wa.me/'+whatsappNumber(row.phone)+'?text='+encodeURIComponent(shareMessage(row));
}
function emailUrl(row){
 return 'mailto:'+encodeURIComponent(row.email||'')+'?subject='+encodeURIComponent('Your personal invitation from WebLift SA')+'&body='+encodeURIComponent(shareMessage(row));
}
async function copy(txt){
 try{await navigator.clipboard.writeText(txt);notice('Link copied. You can paste it into a message.');}
 catch{notice('Clipboard unavailable. Select the link field and copy it manually.',true);}
}
function feedback(msg,isError=false){const label=$('inv-form-status');label.textContent=msg;label.style.color=isError?'#a44c3d':'#17674a'}
function share(row){
 $('inv-share-card').hidden=false;
 $('inv-share-url').value=row.share_url;
 $('inv-copy').onclick=()=>copy(row.share_url);
 $('inv-whatsapp').href=waUrl(row);
 $('inv-open').href=row.share_url;
 const email=$('inv-email-share');email.hidden=!row.email;if(row.email)email.href=emailUrl(row);
 $('inv-share-card').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function text(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el}
function showHistory(rows){
 const holder=$('inv-history');holder.replaceChildren();
 if(!rows.length){holder.textContent='No invitations created yet. Create your first personalised invitation above.';return}
 for(const row of rows){
  const card=text('article','inv-record');
  const top=text('div','inv-record-top'),details=text('div',''),flag=text('span','inv-record-status',iconStatus[row.status]||row.status);
  details.append(text('b','',row.business_name),text('small','',row.recipient_name+' · '+row.phone+(row.email?' · '+row.email:'')));
  top.append(details,flag);
  const count=text('small','','Opened '+Number(row.views||0)+' time'+(Number(row.views)===1?'':'s')+' · Created '+new Date(row.created_at).toLocaleDateString('en-ZA'));
  const actions=text('div','inv-record-actions');
  const open=text('a','','Open ↗');open.href=row.share_url;open.target='_blank';open.rel='noopener noreferrer';
  actions.append(open);
  if(row.status!=='revoked'){
   const wa=text('a','','WhatsApp ↗');wa.href=waUrl(row);wa.target='_blank';wa.rel='noopener noreferrer';
   const cp=text('button','','Copy link');cp.type='button';cp.onclick=()=>copy(row.share_url);
   actions.append(wa,cp);
   const revoke=text('button','revoker','Revoke');revoke.type='button';
   revoke.onclick=async()=>{
    if(!confirm('Revoke this invitation? The recipient will no longer be able to open it.'))return;
    revoke.disabled=true;
    try{await authRequest('/api/sales/admin/invitations/'+encodeURIComponent(row.id)+'/revoke',{method:'POST'});notice('Invitation revoked.');await refreshInvitations()}
    catch(e){notice(e.message,true);revoke.disabled=false}
   };
   actions.append(revoke);
  }
  card.append(top,count,actions);holder.append(card);
 }
}
export async function refreshInvitations(){
 if(!active||!authorized())return;
 const panel=$('inv-history');
 panel.textContent='Loading saved invitations…';
 try{const d=await authRequest('/api/sales/admin/invitations');showHistory(d.invitations||[])}
 catch(e){panel.textContent=e.message||'Could not load invitations. Refresh to retry.'}
}
function previewText(){
 const grateful=document.querySelector('input[name="inv-tone"]:checked')?.value==='grateful';
 $('inv-live-headline').textContent=grateful?'Thank you for the opportunity.':"Let's grow together.";
 const business=$('inv-business').value.trim();
 $('inv-live-business').textContent=business?'A personal invitation prepared for '+business+'.':'A personalised presentation prepared especially for your business.';
}
function loadPortfolio(){
 if(window.WebLiftProjects){fill();return}
 const s=document.createElement('script');s.src='/premium-v3/projects.js';
 s.addEventListener('load',fill,{once:true});
 s.addEventListener('error',()=>{},{once:true});
 document.head.append(s);
 function fill(){
  const list=Array.isArray(window.WebLiftProjects)?window.WebLiftProjects:[];
  const picker=$('inv-project-select');
  if(!picker||picker.options.length>1)return;
  for(const item of list){
   if(!item.url||!/^https:\/\//.test(item.url))continue;
   const opt=document.createElement('option');opt.value=item.url;opt.textContent=item.name||item.id||new URL(item.url).hostname;
   picker.append(opt);
  }
 }
}
async function createInvitation(e){
 e.preventDefault();
 if(busy||!authorized())return;
 const recipient=$('inv-name').value.trim(),business=$('inv-business').value.trim(),phone=$('inv-phone').value.trim();
 const email=$('inv-email').value.trim(),note=$('inv-message').value.trim();
 const tone=document.querySelector('input[name="inv-tone"]:checked')?.value;
 const services=[...document.querySelectorAll('#inv-service-choices input:checked')].map(c=>c.value);
 const project=($('inv-project-url').value.trim()||$('inv-project-select').value.trim());
 if(!recipient||!business||!phone){feedback('Please enter the recipient name, business name and phone number.',true);return}
 if(!services.length){feedback('Select at least one service to highlight.',true);return}
 if(!$('inv-permission').checked){feedback('Confirm that WebLift may contact this person about the proposal.',true);return}
 busy=true;const btn=$('inv-create');btn.disabled=true;btn.textContent='Creating private invitation…';
 feedback('Securing your personalised link…');
 try{
  const body={recipient_name:recipient,business_name:business,phone,email,tone,services,personal_message:note,project_url:project,outreach_basis_confirmed:true};
  const result=await authRequest('/api/sales/admin/invitations',{method:'POST',body:JSON.stringify(body)});
  feedback('Invitation created and saved. Review the WhatsApp message before sending.');
  share(result.invitation);await refreshInvitations();
 }catch(e){feedback(e.message||'Could not create invitation.',true)}
 finally{busy=false;btn.disabled=false;btn.textContent='Create personalised invitation ↗'}
}
export function activateInvitationAdmin({canWrite,notify}){
 authorized=canWrite;notice=notify||(()=>{});active=true;
 if(started){void refreshInvitations();return}
 started=true;
 $('inv-create-form').addEventListener('submit',createInvitation);
 $('inv-business').addEventListener('input',previewText);
 for(const mode of document.querySelectorAll('input[name="inv-tone"]'))mode.addEventListener('change',previewText);
 $('inv-project-select').addEventListener('change',()=>{
  if($('inv-project-select').value)$('inv-project-url').value='';
 });
 $('inv-refresh').addEventListener('click',()=>refreshInvitations());
 loadPortfolio();previewText();void refreshInvitations();
}
export function pauseInvitations(){active=false}

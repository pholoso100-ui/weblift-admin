const API='https://weblift-sales-api.onrender.com';
const $=id=>document.getElementById(id);
const money=n=>'R'+(Number(n||0)/100).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const token=new URLSearchParams(location.search).get('token')||'';
let proposal=null,working=false;
const url=API+'/api/sales/proposal/'+encodeURIComponent(token);
const error=msg=>{$('message').className='banner error';$('message').textContent=msg};
function setBusy(yes){working=yes;for(const id of ['save','approve','decline'])$(id).disabled=yes}
function calculate(){
 if(!proposal)return;
 const sum=proposal.base_cents+proposal.items.reduce((s,x)=>s+(x.selected&&!x.included?x.amount_cents:0),0);
 const deposit=Math.round(sum*.75);
 $('total').textContent=money(sum);$('deposit').textContent=money(deposit);$('balance').textContent=money(sum-deposit);
}
function render(){
 const p=proposal;const final=p.status==='accepted'||p.status==='declined';
 $('company').textContent=p.company||p.client_name;
 $('client-title').textContent='A personalised WebLift website presentation prepared for '+(p.company||p.client_name)+'.';
 $('proposal-status').textContent=p.status.toUpperCase()+(final?'':' · AWAITING YOUR DECISION');
 $('proposal-created').textContent=new Date(p.created_at).toLocaleDateString('en-ZA');
 $('project-name').textContent=p.project_id||'Your new business website';
 const a=$('project-url');let safe;
 try{safe=new URL(p.project_url)}catch{}
 if(safe&&safe.protocol==='https:'){a.href=safe.href;a.style.display=''}else{a.removeAttribute('href');a.style.display='none'}
 $('custom-note').textContent=p.notes||'Please contact your WebLift project representative if you have questions about the project scope.';
 const list=$('service-list');list.replaceChildren();
 for(const item of p.items){
  const row=document.createElement('label');row.className='item';
  const box=document.createElement('input');box.type='checkbox';box.checked=!!item.selected;box.disabled=!!item.mandatory||final;box.dataset.service=item.id;box.addEventListener('change',()=>{item.selected=box.checked;item.amount_cents=(item.selected&&!item.included)?Math.round(item.price_cents*(item.mode==='hourly'?item.hours:item.qty)):0;calculate();$('message').textContent='Selections updated locally. Choose Save or Accept to send your decision to WebLift.';$('message').className='banner'});
  const detail=document.createElement('span'),name=document.createElement('b'),info=document.createElement('small');
  name.textContent=item.label;
  info.textContent=item.mandatory?'Included in selected package':item.mode==='hourly'?String(item.hours)+' hours of specialist work':'Optional service'+(item.qty>1?' · quantity '+item.qty:'');
  detail.append(name,info);
  const amount=document.createElement('strong');amount.textContent=item.included?'Included':money(item.selected?item.amount_cents:(item.price_cents*(item.mode==='hourly'?item.hours:item.qty)));
  box.addEventListener('change',()=>{amount.textContent=item.selected?money(item.amount_cents):'Not selected'});
  row.append(box,detail,amount);list.append(row);
 }
 $('monthly').textContent=p.monthly_cents?'Separate ongoing services: '+money(p.monthly_cents)+' per month, subject to the accepted package.':'No separately priced monthly package is included.';
 $('actions').classList.toggle('hide',final);
 $('issued').classList.toggle('hide',p.status!=='accepted');
 if(p.status==='accepted'){
  $('pdf').href=url+'/invoice.pdf';
  $('message').textContent='Your acceptance has been recorded. The agreed services and invoice are locked.';$('message').className='banner done';
 }else if(p.status==='declined'){$('message').textContent='Your decision has been recorded and WebLift has been notified in the sales ledger.';$('message').className='banner';}
 calculate();
}
async function load(){
 if(!/^[A-Za-z0-9_-]{40,90}$/.test(token))throw Error('This private link is incomplete or invalid.');
 const r=await fetch(url,{cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'The proposal could not be opened.');
 proposal=data.proposal;$('loading').classList.add('hide');$('app').classList.remove('hide');render();
}
async function decide(action){
 if(working||!proposal)return;
 if(action==='accept'&&!confirm('Accept this WebLift quotation, lock the selected services and generate the 75% deposit invoice?'))return;
 let reason='';
 if(action==='decline'){reason=prompt('Optional: tell WebLift why you are declining the proposal.','');if(reason===null)return}
 setBusy(true);$('message').textContent='Recording your decision securely…';$('message').className='banner';
 try{
  const response=await fetch(url+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,version:proposal.version,selected_ids:proposal.items.filter(i=>i.selected||i.mandatory).map(i=>i.id),reason})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||'Your decision could not be saved.');
  await load();
  if(action==='accept')$('message').textContent='Approved. Your invoice was issued and added to WebLift’s records. Select Download invoice PDF.';
 }catch(e){error(e.message||'Something went wrong. Please try again.')}
 finally{setBusy(false)}
}
$('save').addEventListener('click',()=>decide('revise'));
$('approve').addEventListener('click',()=>decide('accept'));
$('decline').addEventListener('click',()=>decide('decline'));
load().catch(e=>{$('loading').innerHTML='';const h=document.createElement('h2');h.textContent='Proposal unavailable';const p=document.createElement('p');p.textContent=e.message||'The client portal is temporarily unavailable. Please contact WebLift SA.';$('loading').append(h,p)});

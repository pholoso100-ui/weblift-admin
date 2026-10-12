const API='https://weblift-sales-api.onrender.com';
const $=id=>document.getElementById(id);
const money=cents=>'R'+(Number(cents||0)/100).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const token=new URLSearchParams(location.search).get('token')||'';
let proposal=null,working=false;
const url=API+'/api/sales/proposal/'+encodeURIComponent(token);
const error=msg=>{$('message').className='banner error';$('message').textContent=msg};
function setBusy(on){working=on;for(const id of ['save','approve','decline'])$(id).disabled=on}
function getSelected(){return proposal.items.filter(x=>x.selected||x.mandatory).map(x=>x.id)}
function amount(item){const units=item.mode==='hourly'?Number(item.hours)||0:Number(item.qty)||1;return Math.round((Number(item.price_cents)||0)*units)}
function calculate(){
 if(!proposal)return;
 let total=Number(proposal.base_cents)||0;
 for(const x of proposal.items){x.amount_cents=x.selected&&!x.included?amount(x):0;total+=x.amount_cents}
 const deposit=Math.round(total*.75),balance=total-deposit,paid=Number(proposal.paid_cents)||0;
 const reward=Math.round(total*.10);
 $('total').textContent=money(total);$('deposit').textContent=money(deposit);$('balance').textContent=money(balance);
 $('paid').textContent=money(paid);$('outstanding').textContent=money(Math.max(0,total-paid));
 $('books-status').textContent=proposal.invoice_no&&paid>=total?'PAID IN FULL':'OPEN';
 $('reward-value').textContent=money(reward);
 $('reward-n').textContent=(reward/10000).toLocaleString('en-ZA',{maximumFractionDigits:4})+' N';
 for(const row of document.querySelectorAll('.row-item')){
  const x=proposal.items.find(i=>i.id===row.dataset.id);
  if(x){const n=row.querySelector('.price');if(n)n.textContent=x.included?'Included':x.selected?money(x.amount_cents):'Not selected'}
 }
}
function showPreview(projectUrl){
 const frame=$('website-preview'),link=$('project-url'),address=$('preview-address');
 let safe;try{safe=new URL(projectUrl)}catch{}
 if(!safe||!['https:','http:'].includes(safe.protocol)){
  frame.src='about:blank';frame.srcdoc='<p style="font:16px system-ui;text-align:center;padding:80px 30px;color:#526b5d">Your project website preview has not been published yet. Ask WebLift for its latest preview.</p>';
  link.hidden=true;address.textContent='Preview pending';$('preview-status').textContent='Awaiting the published website URL';return;
 }
 link.hidden=false;link.href=safe.href;address.textContent=safe.hostname+safe.pathname;
 frame.removeAttribute('srcdoc');frame.src=safe.href;
 $('preview-status').textContent='Live website preview • If the site blocks embedding, tap Open full website ↗';
}
function render(){
 const p=proposal,final=['accepted','declined'].includes(p.status);
 $('app').hidden=false;$('loading').hidden=true;
 $('company').textContent=p.company||p.client_name||'Your website';
 $('client-title').textContent='A personalised website design and business-growth presentation for '+(p.company||p.client_name)+'.';
 $('proposal-status').textContent=p.status==='accepted'?'APPROVED':p.status==='declined'?'DECLINED':p.status==='modified'?'UPDATED · AWAITING YOUR DECISION':'PENDING YOUR REVIEW';
 $('proposal-created').textContent=new Date(p.created_at).toLocaleDateString('en-ZA',{dateStyle:'medium'});
 showPreview(p.project_url);
 $('custom-note').textContent=p.notes||'Your detailed project scope will be finalised with WebLift SA.';
 const list=$('service-list');list.replaceChildren();
 for(const x of p.items){
  const row=document.createElement('label');row.className='row-item';row.dataset.id=x.id;row.setAttribute('aria-disabled',String(final));
  const check=document.createElement('input');check.type='checkbox';check.checked=!!x.selected;check.disabled=!!x.mandatory||final;
  check.addEventListener('change',()=>{x.selected=check.checked;calculate();$('message').className='banner';$('message').textContent='Selections updated. Use Save selected services to send them to WebLift, or approve the quotation.'});
  const text=document.createElement('span'),title=document.createElement('strong'),details=document.createElement('small');
  title.textContent=x.label;
  details.textContent=x.mandatory?'Included in the website package':x.mode==='hourly'?x.hours+' labour hours':Number(x.qty)>1?'Quantity '+x.qty:'Optional service';
  text.append(title,details);
  const price=document.createElement('strong');price.className='price';
  row.append(check,text,price);list.append(row);
 }
 $('monthly').textContent=p.monthly_cents?money(p.monthly_cents)+' / month':'None';
 $('nexora-opt-in').checked=!!p.nexora_opt_in;
 $('nexora-opt-in').disabled=final;
 $('actions').hidden=final;$('issued').hidden=p.status!=='accepted';
 $('quote-pdf').href=url+'/quote.pdf';
 if(p.status==='accepted'){$('pdf').href=url+'/invoice.pdf';$('message').className='banner';$('message').textContent='Approved. Your invoice is available. WebLift will record payments separately until your account is settled.'}
 if(p.status==='declined'){$('message').className='banner';$('message').textContent='Your decision is recorded in WebLift’s sales ledger.'}
 calculate();
}
async function load(){
 if(!/^[A-Za-z0-9_-]{40,90}$/.test(token))throw Error('The private presentation link is incomplete or invalid.');
 const r=await fetch(url,{cache:'no-store'});
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(body.error||'Unable to load the presentation.');
 proposal=body.proposal;render();
}
async function decide(action){
 if(working||!proposal)return;
 if(action==='accept'&&!$('accept-terms').checked){error('Please tick the agreement to the quoted services and payment terms before accepting.');return}
 if(action==='accept'&&!confirm('Accept your selected services and request the 75% deposit invoice? The agreed terms are binding once accepted.'))return;
 let reason='';
 if(action==='decline'){reason=prompt('Optional: tell WebLift why you are declining this quotation.','');if(reason===null)return}
 setBusy(true);$('message').className='banner';$('message').textContent='Saving your choice securely…';
 try{
  const response=await fetch(url+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   action,version:proposal.version,selected_ids:getSelected(),reason,
   accepted_terms:action==='accept'&&$('accept-terms').checked,
   nexora_opt_in:$('nexora-opt-in').checked
  })});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||'We could not save your choice.');
  await load();
  if(action==='accept'){$('message').className='banner';$('message').textContent='Thank you. Your deposit invoice is ready below. Covenant Rise reward eligibility, if requested, remains pending verification.'}
 }catch(e){error(e.message||'Please try again.')}
 finally{setBusy(false)}
}
$('save').addEventListener('click',()=>decide('revise'));
$('approve').addEventListener('click',()=>decide('accept'));
$('decline').addEventListener('click',()=>decide('decline'));
$('nexora-opt-in').addEventListener('change',()=>{
 if(!proposal)return;
 $('message').className='status-msg';
 $('message').textContent='Your Nexora One reward preference will be saved with your proposal decision. It does not reduce the amount payable.';
});
load().catch(e=>{const root=$('loading');root.replaceChildren();const h=document.createElement('h2'),p=document.createElement('p');h.textContent='Proposal unavailable';p.textContent=e.message+' Please contact WebLift SA for a valid private presentation.';root.append(h,p)});

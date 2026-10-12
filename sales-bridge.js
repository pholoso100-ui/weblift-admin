const API='https://weblift-sales-api.onrender.com';
const $=id=>document.getElementById(id);
const money=n=>'R'+(Number(n||0)/100).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const mapping={'facebook-mgmt':'social-management','printing':'print-design'};
let online=false,started=false;
async function request(path,options={}){
 const m=await import('/premium-v3/customer-auth.js');await m.ready;
 if(!m.auth.currentUser)throw Error('Your WebLift admin login has expired.');
 const token=await m.auth.currentUser.getIdToken();
 const r=await fetch(API+path,{...options,cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}});
 const body=await r.json().catch(()=>({}));
 if(!r.ok){const err=Error(body.error||'Sales service unavailable.');err.status=r.status;throw err}
 return body;
}
function state(s){
 const label=$('sales-ledger-status'),button=$('publish-proposal');
 if(label)label.textContent=s;
 if(button)button.disabled=!online;
}
export async function activateSalesBridge(read){
 if(started)return refresh();started=true;
 const publish=$('publish-proposal');
 if(!publish)return;
 const sharing=$('client-share');
 $('copy-share').onclick=()=>navigator.clipboard.writeText($('share-link').value).then(()=>read.notify('Link copied.'));
 $('refresh-ledger').onclick=refresh;
 publish.onclick=async()=>{
  if(!online)return read.notify('A working database connection is required before sending customer proposals.',true);
  const project=read.project(),name=$('client-name').value.trim(),email=$('client-email').value.trim();
  if(!project||!name||!email)return read.notify('Select a project, then enter a client name and valid email.',true);
  publish.disabled=true;publish.textContent='Saving secure proposal…';
  try{
   const current=await request('/api/sales/admin/catalogue');
   const remote=new Map((current.items||[]).map(i=>[i.id,i]));
   const items=read.items();
   for(const i of items){
    let id=mapping[i.id]||i.id;
    if(i.custom&&i.id.startsWith('custom-')){
     const add=await request('/api/sales/admin/catalogue',{method:'POST',body:JSON.stringify({label:i.name,price_cents:Math.round((Number(i.price)||0)*100),mode:i.mode,default_hours:Number(i.hours||0)})});
     i.id=add.item.id;id=i.id;read.persist();
     remote.set(id,add.item);
    }
    const ref=remote.get(id);if(!ref)continue;
    const price=Math.round((Number(i.price)||0)*100),hours=Number(i.hours||0);
    if(price!==ref.price_cents||hours!==Number(ref.default_hours)||i.name!==ref.label||i.mode!==ref.mode){
     await request('/api/sales/admin/catalogue/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({label:i.name,price_cents:price,default_hours:hours,mode:i.mode})});
    }
   }
   if(Math.round(read.rate()*100)!==Number(current.pricing?.rate_cents||19900)){
    await request('/api/sales/admin/settings',{method:'PATCH',body:JSON.stringify({rate_cents:Math.round(read.rate()*100)})});
   }
   const out=await request('/api/sales/admin/proposals',{method:'POST',body:JSON.stringify({
    client_name:name,company:project.name.replace(/&amp;/g,'&'),client_email:email,client_phone:$('client-phone').value.trim(),
    project_id:project.name.replace(/&amp;/g,'&'),project_url:project.url,package_code:read.plan(),notes:$('proposal-notes').value,
    selections:items.map(i=>({id:mapping[i.id]||i.id,selected:!!i.selected,qty:i.qty||1,hours:i.hours||0}))
   })});
   if(!/^https:\/\/weblift-sa\.vercel\.app\/proposal\?token=/.test(out.share_url||''))throw Error('The server did not issue a valid private link.');
   $('share-link').value=out.share_url;sharing.hidden=false;
   const number=$('client-phone').value.replace(/\D/g,'');
   const formatted=number.length===10&&number[0]==='0'?'27'+number.slice(1):number;
   const message='WebLift SA: your personalised website quotation is ready. '+out.share_url;
   $('share-whatsapp').href='https://wa.me/'+(formatted.length>=10?formatted:'')+'?text='+encodeURIComponent(message);
   $('share-email').href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('WebLift SA website quotation')+'&body='+encodeURIComponent(message);
   read.notify('Your proposal has been saved. The private link is ready to share.');
   await refresh();
  }catch(e){read.notify(e.message||'Could not save this proposal.',true)}
  finally{publish.textContent='Generate private client proposal link ↗';publish.disabled=!online}
 };
 await refresh();
 setInterval(()=>{if(!document.hidden)refresh()},30000);
 async function refresh(){
  if(!read.authorized())return;
  try{
   const health=await fetch(API+'/health',{cache:'no-store'});
   if(!health.ok)throw Error('Database connection pending');
   const result=await request('/api/sales/admin/proposals');
   online=true;state('CONNECTED · LIVE SALES');
   const box=$('sales-records');box.replaceChildren();
   const items=result.proposals||[];
   if(!items.length)box.textContent='No client proposals yet.';
   for(const p of items.slice(0,20)){
    const row=document.createElement('div');row.className='sales-record';
    const desc=document.createElement('span'),title=document.createElement('b'),sub=document.createElement('small');
    title.textContent=p.company||p.client_name;
    sub.textContent=(p.status||'pending').toUpperCase()+' · '+money(p.total_cents)+(p.invoice_no?' · '+p.invoice_no:'')+(p.invoice_no?' · '+(p.books_status==='paid_in_full'?'PAID IN FULL':'OPEN · '+money(p.outstanding_cents)+' OUTSTANDING'):'');
    desc.append(title,sub);
    const a=document.createElement('a');a.href=p.share_url;a.textContent='Open ↗';a.target='_blank';a.rel='noopener noreferrer';
    row.append(desc,a);
    if(p.invoice_no&&Number(p.outstanding_cents)>0&&read.authorized()){
     const record=document.createElement('button');record.type='button';record.className='subtle-action';record.textContent='Record payment';
     record.onclick=async()=>{
      const value=prompt('Verified payment received (rand), e.g. 750.00. Do not record a transfer until it appears in your bank account.','');
      if(value===null)return;
      const amount=Number(value.replace(/[^0-9.]/g,''));
      if(!Number.isFinite(amount)||amount<=0){read.notify('Enter a positive payment amount.',true);return}
      const reference=prompt('Bank transaction reference (unique for this payment):','');
      if(reference===null)return;
      if(!reference.trim()){read.notify('A verified bank reference is required.',true);return}
      if(!confirm('Record '+money(Math.round(amount*100))+' received for '+(p.company||p.client_name)+'? This will update the invoice balance.'))return;
      record.disabled=true;
      try{
       const response=await request('/api/sales/admin/proposals/'+encodeURIComponent(p.id)+'/payments',{method:'POST',body:JSON.stringify({amount_cents:Math.round(amount*100),reference:reference.trim()})});
       read.notify(response.books_status==='paid_in_full'?'Payment saved. Account PAID IN FULL.':'Payment saved. Remaining account balance '+money(response.outstanding_cents));
       await refresh();
      }catch(e){read.notify(e.message||'Payment recording failed.',true)}
      finally{record.disabled=false}
     };
     row.append(record);
    }
    box.append(row);
   }
  }catch(e){
   online=false;state([401,403].includes(e.status)?'ADMIN VERIFICATION REQUIRED':/database|503/i.test(e.message||'')?'DATABASE UNAVAILABLE':'SALES SERVICE UNAVAILABLE');
   $('sales-records').textContent=e.message||'Sales server unavailable.';
  }
 }
}

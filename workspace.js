
const MAIN_HOST = "weblift-sa.vercel.app";
const isPrimary = location.hostname === MAIN_HOST;
const $ = id => document.getElementById(id);
const money = n => "R" + Number(n||0).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2});
const cleanNum = n => Math.max(0,Math.min(1e8,Number(n)||0));
const gate=$("secure-gate"),workspace=$("workspace"),preview=$("preview-only"),frame=$("module-frame"),pane=$("page-iframe"),select=$("section-choice");
const originalAdmin="/admin/original",salesPage="/admin/sales",dropshipPage="/dropshipping-admin.html";
const choices={overview:"Overview & visitors",mail:"Email inbox",guests:"Clients & guest accounts",team:"Administrator team",brand:"Email branding",activity:"Activity history",quotation:"Premium quotation studio",sales:"Existing sales pricing",dropshipping:"Dropshipping management"};
let isAuthenticated=false, currentAdmin=null, activeSection="overview",quoteLoaded=false, originalLoaded=false;
const quoteStatus=(msg,problem=false)=>{const x=$("quote-status");x.textContent=msg;x.style.color=problem?"#ffd6ae":"#b9edcd"};
if(!isPrimary){
 preview.hidden=false;
 // Render preview is intentionally not an administrative login surface.
 // Do not load or expose authenticated tools at the public static-site origin.
}else{
  enterGate();
  bootstrapIdentity();
}
function enterGate(message="Use your approved WebLift account to sign in."){
 isAuthenticated=false;currentAdmin=null;
 gate.hidden=false;workspace.hidden=true;preview.hidden=true;
 $("gate-title").textContent="Your WebLift workspace.";
 $("gate-message").textContent=message;
 $("shell-signout").hidden=true;
 $("workspace-login").hidden=false;
 if(frame.parentElement)frame.remove();
 if(frame.getAttribute("src")!=="about:blank")frame.src="about:blank";
}
function enterWorkspace(admin,user){
 isAuthenticated=true;currentAdmin=admin;
 gate.hidden=true;workspace.hidden=false;preview.hidden=true;
 $("shell-signout").hidden=false;
 if(frame.parentElement!==pane)pane.append(frame);
 frame.style.cssText="";
 $("member-label").textContent=(user.displayName||user.email||"Administrator")+" · "+(admin.role||"admin");
 navigate("overview");
}
async function bootstrapIdentity(){
 try{
  const account=await import("/premium-v3/customer-auth.js");
  await account.ready;
  const firebase=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
  const form=$("workspace-login");
  const submit=$("workspace-login-submit");
  const loginStatus=$("workspace-login-status");
  submit.disabled=false;
  form.addEventListener("submit",async e=>{
   e.preventDefault();
   const email=$("workspace-email").value.trim(),password=$("workspace-password").value;
   if(!email||!password)return;
   submit.disabled=true;loginStatus.textContent="Signing in securely…";
   try{
    await firebase.signInWithEmailAndPassword(account.auth,email,password);
    $("workspace-password").value="";
    loginStatus.textContent="Signed in. Checking your administrator access…";
   }catch(e){
    loginStatus.textContent=e.code==="auth/invalid-credential"?"Incorrect email or password.":(e.message||"Unable to sign in.");
   }finally{submit.disabled=false}
  });
  $("workspace-reset-password").addEventListener("click",async()=>{
   const email=$("workspace-email").value.trim();
   if(!email){loginStatus.textContent="Enter your email address first.";return}
   try{await firebase.sendPasswordResetEmail(account.auth,email);loginStatus.textContent="If this email is registered, password-reset instructions have been sent."}
   catch{loginStatus.textContent="Password reset could not be started. Please retry shortly."}
  });
  $("shell-signout").addEventListener("click",async()=>{
   try{await firebase.signOut(account.auth)}
   catch{enterGate("Sign-out was interrupted. Refresh the page to confirm your session.")}
  });
  let seq=0;
  account.onCustomerChange(async user=>{
    const n=++seq;
    if(!user){enterGate("Sign in to WebLift to manage your customers, emails and quotations.");return}
    gate.hidden=false;
    $("gate-title").textContent="Verifying your permissions…";
    $("gate-message").textContent="Checking your WebLift administrator access.";
    try{
      const token=await user.getIdToken();
      const response=await fetch("/api/manage",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({action:"profile"}),cache:"no-store"});
      if(!response.ok)throw Error(response.status===403?"This account is not approved to administer WebLift.":"Administrator verification failed ("+response.status+").");
      const data=await response.json();
      if(n!==seq)return;
      if(!data.admin||!["owner","administrator","support","analyst"].includes(data.admin.role))throw Error("WebLift could not verify administrator privileges.");
      loginStatus.textContent="";
      enterWorkspace(data.admin,user);
    }catch(e){
      if(n!==seq)return;
      enterGate((e.message||"Administrator login failed.")+" Your account remains protected.");
    }
  });
 }catch(e){
   enterGate("Secure WebLift sign-in could not load. Refresh the page to retry.");
   $("workspace-login-status").textContent="Unable to load the secure sign-in library.";
 }
}
let renderedTab=null;
function hideDuplicateNavigation(){
 if(!isAuthenticated||!isPrimary||activeSection==="quotation")return;
 try{
  const doc=frame.contentDocument;
  if(!doc?.head)return;
  if(!doc.getElementById("weblift-unified-embed-styles")){
   const sheet=doc.createElement("style");
   sheet.id="weblift-unified-embed-styles";
   sheet.textContent=".admin-head,.tabs{display:none!important}.wrap{margin:12px auto 20px!important;width:calc(100% - 24px)!important}.admin-stats,.stats{margin-top:8px!important}body{background:#f3f8ef!important}";
   doc.head.append(sheet);
  }
 }catch{}
}
async function navigate(value){
 if(!isAuthenticated)return;
 if(!(value in choices))value="overview";
 activeSection=value;select.value=value;$("section-label").textContent=choices[value];
 const quote=value==="quotation";
 $("page-iframe").hidden=quote;$("quote-studio").hidden=!quote;
 if(quote){if(!quoteLoaded){quoteLoaded=true;initQuote()}return}
 const special=value==="sales"||value==="dropshipping";
 const url=value==="sales"?salesPage:value==="dropshipping"?dropshipPage:originalAdmin;
 if(frame.getAttribute("src")!==url){
   frame.src=url;renderedTab=null;
 }else if(!special){
   selectOriginalTab(value);
 }
}
function selectOriginalTab(value){
 if(!isAuthenticated||!isPrimary||["sales","dropshipping","quotation"].includes(value))return;
 try{
  const doc=frame.contentDocument;
  const tab=doc?.querySelector('[data-tab="'+value+'"]');
  if(tab && !tab.hidden && renderedTab!==value){tab.click();renderedTab=value;}
  hideDuplicateNavigation();
 }catch{}
}
frame.addEventListener("load",()=>{
 if(!isAuthenticated)return;
 if(["overview","mail","guests","team","brand","activity"].includes(activeSection)){
   selectOriginalTab(activeSection);
   [350,1100,2400].forEach(ms=>setTimeout(()=>{if(isAuthenticated&&frame.getAttribute("src")===originalAdmin){selectOriginalTab(activeSection);hideDuplicateNavigation()}},ms));
 }
});
select.addEventListener("change",e=>navigate(e.target.value));
function showMsg(s){$("status-line").textContent=s;$("status-line").hidden=!s}
const ORIGINAL=[
{id:"whatsapp",name:"WhatsApp integration",desc:"Fixed published price",price:750,core:true,group:"Core integrations"},
{id:"estimator",name:"Interactive quotation estimator",desc:"Fixed published price",price:1000,core:true,group:"Core integrations"},
{id:"email",name:"Two business email addresses setup",desc:"Fixed published price",price:700,core:true,group:"Core integrations"},
{id:"domain",name:"Domain setup & maintenance package",desc:"Fixed published price; third-party fees separate",price:2000,core:true,group:"Core integrations"},
{id:"pages",name:"Additional website page",desc:"Fixed published rate per page; select quantity",price:350,group:"Design & content"},
{id:"gallery",name:"Photo gallery / projects showcase",desc:"Fixed published price",price:500,group:"Design & content"},
{id:"reviews",name:"Testimonials section",desc:"Fixed published price",price:300,group:"Design & content"},
{id:"bookings",name:"Appointment booking system",desc:"Fixed published price",price:1200,group:"Customer tools"},
{id:"maps",name:"Google Maps & directions",desc:"Fixed published price",price:250,group:"Customer tools"},
{id:"seo",name:"Basic Google search setup",desc:"Fixed published price",price:650,group:"Customer tools"},
{id:"social",name:"Social media integration",desc:"Fixed published price",price:350,group:"Customer tools"},
{id:"blog",name:"Blog / news section",desc:"Fixed published price",price:750,group:"Customer tools"},
{id:"store",name:"Online store starter setup",desc:"Fixed published price",price:2500,group:"Advanced features"},
{id:"payments",name:"Payment gateway integration",desc:"Fixed published price",price:1500,group:"Advanced features"},
{id:"members",name:"Customer / member login area",desc:"Fixed published price",price:2800,group:"Advanced features"},
{id:"facebook-mgmt",name:"Social media page creation / management",desc:"Unpriced service · estimate hours",mode:"hourly",hours:4,price:0,group:"Marketing"},
{id:"marketing",name:"Marketing content / campaign design",desc:"Unpriced service · estimate hours",mode:"hourly",hours:4,price:0,group:"Marketing"},
{id:"printing",name:"Business cards and pamphlet design",desc:"Unpriced service · estimate hours",mode:"hourly",hours:3,price:0,group:"Print design"}
];
let quote={rate:199,items:[],plan:"B",projectId:""},portfolio=[];
function canQuoteEdit(){return isAuthenticated&&["owner","administrator"].includes(currentAdmin?.role)}
function secureDraftRead(){
 const base=ORIGINAL.map(s=>({...s,selected:false,mode:s.mode||"fixed"}));
 // Public catalogue is never read from localStorage; only private browser-local admin draft modifications.
 try{
  const a=JSON.parse(localStorage.getItem("weblift-admin-price-draft-v2")||"null");
  if(!a||!Array.isArray(a.items))return{rate:199,items:base,plan:"B",projectId:""};
  const savedById=new Map(a.items.filter(x=>typeof x.id==="string").map(x=>[x.id,x]));
  for(const item of base){
   const s=savedById.get(item.id);
   if(s){item.price=cleanNum(s.price);item.hours=cleanNum(s.hours);item.qty=Math.max(1,Math.floor(cleanNum(s.qty??1)));item.selected=!!s.selected}
  }
  for(const s of a.items){
    if(!base.some(x=>x.id===s.id)&&s.custom&&typeof s.name==="string")base.push({...s,price:cleanNum(s.price),hours:cleanNum(s.hours),qty:Math.max(1,Math.floor(cleanNum(s.qty??1))),selected:!!s.selected,mode:s.mode==="hourly"?"hourly":"fixed"});
  }
  return{rate:cleanNum(a.rate??199),plan:["A","B","custom"].includes(a.plan)?a.plan:"B",projectId:"",items:base}
 }catch{return{rate:199,items:base,plan:"B",projectId:""}}
}
function persistPriceDraft(){
 try{localStorage.setItem("weblift-admin-price-draft-v2",JSON.stringify({rate:quote.rate,plan:quote.plan,items:quote.items}))}catch{quoteStatus("Private price draft could not be saved in this browser.",true)}
}
function initQuote(){
 quote=secureDraftRead();
 $("rate-input").value=quote.rate;$("package-choice").value=quote.plan;
 $("rate-input").onchange=e=>{if(!canQuoteEdit())return;quote.rate=cleanNum(e.target.value);persistPriceDraft();renderItems()};
 $("package-choice").onchange=e=>{quote.plan=e.target.value;persistPriceDraft();renderItems()};
 $("project-picker").onchange=e=>{
  quote.projectId=e.target.value;
  const p=portfolio.find(x=>x.id===quote.projectId);
  $("project-sample").hidden=!p;
  if(p){
   $("project-title").textContent=p.name.replace(/&amp;/g,"&");
   $("project-description").textContent=(p.label||p.badge||"").replace(/&amp;/g,"&")+(p.category==="concept"?" · Portfolio concept":"");
   $("project-link").href=p.url;
   $("summary-project").textContent=p.name.replace(/&amp;/g,"&");
  }else $("summary-project").textContent="New client proposal";
  renderSummary()
 };
 for(const id of ["client-email","client-phone","project-reference","proposal-notes"]){$(id).addEventListener("input",renderSummary)}
 $("add-hourly").onclick=()=>addService("hourly");
 $("add-fixed").onclick=()=>addService("fixed");
 $("restore-pricing").onclick=()=>{
  if(!canQuoteEdit()||!confirm("Restore the original published prices in this browser's PRIVATE DRAFT only?"))return;
  quote.rate=199;quote.plan="B";quote.items=ORIGINAL.map(i=>({...i,selected:false,mode:i.mode||"fixed"}));
  $("rate-input").value=199;$("package-choice").value="B";persistPriceDraft();renderItems()
 };
 $("copy-quote").onclick=async()=>{
  if(!isAuthenticated)return;
  try{await navigator.clipboard.writeText(buildDraftText());quoteStatus("Draft breakdown copied.")}catch{quoteStatus("Your browser blocked copying. Use Print / PDF instead.",true)}
 };
 $("print-quote").onclick=()=>{renderSummary();window.print()};
 $("export-quote").onclick=()=>{
  const payload=buildQuote();
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="weblift-quotation-draft-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);
  quoteStatus("Private administrative draft exported. No customer notification was sent.")
 };
 loadPortfolio();
 renderItems();
 loadSalesBridge();
}
function addService(mode){
 if(!canQuoteEdit()){quoteStatus("Your administrator role does not permit editing prices.",true);return}
 quote.items.push({id:"custom-"+Date.now()+"-"+Math.floor(Math.random()*99999),name:"New custom service",desc:"Administrator custom item",custom:true,mode,price:0,hours:1,selected:true,core:false});
 persistPriceDraft();renderItems();
}
function loadPortfolio(){
 const script=document.createElement("script");script.src="/premium-v3/projects.js";
 script.onload=()=>{
  portfolio=(Array.isArray(window.WebLiftProjects)?window.WebLiftProjects:[]).filter(x=>x.id&&x.url&&x.name);
  const sel=$("project-picker");sel.replaceChildren();
  let empty=document.createElement("option");empty.value="";empty.textContent="Select one of "+portfolio.length+" existing projects";sel.add(empty);
  for(const item of portfolio){const opt=document.createElement("option");opt.value=item.id;opt.textContent=item.name.replace(/&amp;/g,"&")+(item.category==="concept"?" · concept":"");sel.add(opt)}
 };
 script.onerror=()=>{$("project-picker").innerHTML='<option value="">Portfolio could not be loaded — refresh</option>';quoteStatus("The WebLift project list is temporarily unavailable.",true)};
 document.head.append(script);
}
function lineTotal(item){
 if(!item.selected||quote.plan==="A"&&item.core)return 0;
 return item.mode==="hourly"?Math.round(cleanNum(item.hours)*quote.rate*100)/100:Math.round(cleanNum(item.price)*Math.max(1,Math.floor(cleanNum(item.qty??1)))*100)/100;
}
function lines(){
 const plan=quote.plan,base=plan==="A"?2000:plan==="B"?3000:0;
 const monthly=plan==="A"?700:0;
 return{base,monthly,chosen:quote.items.filter(x=>x.selected||plan==="A"&&x.core).map(x=>({...x,included:plan==="A"&&x.core,amount:lineTotal(x)}))}
}
function buildQuote(){
 const info=lines();const total=Math.round((info.base+info.chosen.reduce((s,i)=>s+i.amount,0))*100)/100,deposit=Math.round(total*.75*100)/100,balance=Math.round((total-deposit)*100)/100;
 const p=portfolio.find(x=>x.id===quote.projectId);
 return {documentType:"UNISSUED_QUOTATION_DRAFT",createdAt:new Date().toISOString(),client:{projectName:p?.name||"",projectUrl:p?.url||"",email:$("client-email").value.trim(),whatsapp:$("client-phone").value.trim(),reference:$("project-reference").value.trim()},package:quote.plan,items:info.chosen.map(x=>({name:x.name,mode:x.mode,hours:x.mode==="hourly"?x.hours:null,quantity:x.mode==="fixed"?(x.qty??1):null,rate:x.mode==="hourly"?quote.rate:null,unitPrice:x.mode==="fixed"?x.price:null,included:x.included,amount:x.amount})),base:info.base,total,deposit,balance,monthly:info.monthly,vat:0,payment:{bank:"African Bank",accountHolder:"Webliftsa T/A Mr P E Tlatsi",accountNumber:"20160546562",reference:"Official invoice number to be issued upon client acceptance",depositPercent:75,finalPercent:25},notes:$("proposal-notes").value,terms:"75% deposit in advance and 25% immediately after website is live and operational. Supplier not VAT registered.",issued:false,accepted:false,paid:false};
}
function buildDraftText(){
 const q=buildQuote();
 const items=q.items.map(i=>(i.included?"INCLUDED: ":"")+i.name+" — "+money(i.amount)).join("\n");
 return ["WEBLIFT SA — PRELIMINARY QUOTATION (NOT INVOICE)",
 "Webliftsa T/A Mr P E Tlatsi",
 "Project: "+q.client.projectName,"Project preview: "+q.client.projectUrl,
 "Client contact: "+q.client.email+" / "+q.client.whatsapp,
 "Ref: "+q.client.reference,"Website package: "+q.package+" — "+money(q.base),items,
 "Total: "+money(q.total),"75% initial deposit: "+money(q.deposit),"25% on website launch: "+money(q.balance),
 "PAYMENT DETAILS — African Bank","Account holder: Webliftsa T/A Mr P E Tlatsi","Account number: 20160546562",
 "Payment reference: official invoice number issued upon acceptance.",
 "Monthly plan (if applicable): "+money(q.monthly),"VAT not charged. This is an unissued draft; client acceptance and official invoicing are not activated."].join("\n");
}
function renderItems(){
 const list=$("service-rows");list.replaceChildren();
 quote.items.forEach(item=>{
  const coreIncluded=quote.plan==="A"&&item.core;
  const row=document.createElement("div");row.className="service-item";
  const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!item.selected||coreIncluded;cb.disabled=coreIncluded||!canQuoteEdit();cb.title="Include service";cb.onchange=()=>{item.selected=cb.checked;persistPriceDraft();renderSummary()};row.append(cb);
  const title=document.createElement("div");title.className="service-title";
  if(item.custom&&canQuoteEdit()){const nm=document.createElement("input");nm.type="text";nm.maxLength=110;nm.value=item.name;nm.setAttribute("aria-label","Custom service title");nm.onchange=()=>{item.name=nm.value.trim()||"Custom service";persistPriceDraft();renderSummary()};title.append(nm)}else{const label=document.createElement("span");label.textContent=item.name;title.append(label)}
  const sub=document.createElement("small");sub.textContent=coreIncluded?"Included in package A":item.mode==="hourly"?"R"+quote.rate+" / hour":item.desc||"Fixed charge";title.append(sub);row.append(title);
  const field=document.createElement("div");field.className="field-mini";const edit=document.createElement("input");edit.type="number";edit.min="0";edit.step=".01";edit.value=item.mode==="fixed"?item.price:quote.rate*item.hours;edit.disabled=item.mode!=="fixed"||!canQuoteEdit();edit.title="Fixed selling price R";edit.onchange=()=>{item.price=cleanNum(edit.value);persistPriceDraft();renderSummary()};field.append(edit);const small=document.createElement("small");small.textContent=item.mode==="fixed"?"Price / R":"Calculated";field.append(small);row.append(field);
  const hField=document.createElement("div");hField.className="field-mini";const hrs=document.createElement("input");hrs.type="number";hrs.min="0";hrs.step=item.mode==="hourly"?".25":"1";hrs.value=item.mode==="hourly"?item.hours:(item.qty??1);hrs.disabled=!canQuoteEdit()||coreIncluded;hrs.title=item.mode==="hourly"?"Estimated labour hours":"Number of units";hrs.onchange=()=>{if(item.mode==="hourly")item.hours=cleanNum(hrs.value);else item.qty=Math.max(1,Math.floor(cleanNum(hrs.value)));persistPriceDraft();renderItems()};hField.append(hrs);const hsm=document.createElement("small");hsm.textContent=item.mode==="hourly"?"Hours":"Qty";hField.append(hsm);row.append(hField);
  const amount=document.createElement("div");amount.className="service-price";amount.textContent=coreIncluded?"Included":money(item.mode==="hourly"?quote.rate*item.hours:item.price);row.append(amount);
  list.append(row)
 });renderSummary();
}
function renderSummary(){
 if(!quoteLoaded)return;
 const q=buildQuote();
 $("print-meta").textContent="Project: "+(q.client.projectName||"Not specified")+" | Reference: "+(q.client.reference||"Pending")+" | Email: "+(q.client.email||"Not specified")+" | WhatsApp: "+(q.client.whatsapp||"Not specified")+" | Preview: "+q.client.projectUrl+" | Scope: "+(q.notes||"To be confirmed")+" | Webliftsa T/A Mr P E Tlatsi · African Bank · VAT not charged · Draft only.";
 const sum=$("summary-rows");sum.replaceChildren();
 const base=document.createElement("div");base.className="summary-line";const a=document.createElement("span");a.textContent="Website package "+q.package;const b=document.createElement("b");b.textContent=money(q.base);base.append(a,b);sum.append(base);
 for(const item of q.items){
  const row=document.createElement("div");row.className="summary-line";const label=document.createElement("span"),value=document.createElement("b");label.textContent=item.name+(item.included?" (included)":"");value.textContent=item.included?"Included":money(item.amount);if(item.quantity>1)label.textContent+=" × "+item.quantity;row.append(label,value);sum.append(row)
 }
 $("estimated-reward").textContent=money(Math.round(q.total*0.10*100)/100);$("estimated-n").textContent=(q.total*0.10/100).toLocaleString("en-ZA",{maximumFractionDigits:4})+" N";
 $("amount-total").textContent=money(q.total);$("amount-deposit").textContent=money(q.deposit);$("amount-balance").textContent=money(q.balance);$("monthly-row").hidden=q.monthly<=0;$("amount-monthly").textContent=money(q.monthly);
}

async function loadSalesBridge(){
 try{
  const {activateSalesBridge}=await import("/sales-bridge.js");
  await activateSalesBridge({
   items:()=>quote.items,
   rate:()=>quote.rate,
   plan:()=>quote.plan,
   project:()=>portfolio.find(p=>p.id===quote.projectId),
   authorized:()=>isAuthenticated&&canQuoteEdit(),
   persist:()=>persistPriceDraft(),
   notify:(message,issue)=>quoteStatus(message,!!issue)
  });
  const refresh=$("refresh-ledger");if(refresh)refresh.disabled=false;
 }catch(e){quoteStatus("Sales connection did not load. Reload and retry.",true)}
}

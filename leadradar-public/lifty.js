
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const API="https://geawayzadsrkxkjmkxkj.supabase.co/functions/v1/weblift-leadradar";
const ART="https://weblift.co.za/lifty/transparent.webp";
const page="<section id='screen-lifty' class='screen' aria-label='Lifty Search Command Centre'>"+
"<div class='liftycenter'><div id='liftyFigure' class='liftyfigure'><div class='liftyfigbar'><span>● LIFTY ONLINE</span><b>WEBLIFT SA / SEARCH</b></div>"+
"<img class='liftyportrait' alt='Lifty, the official emerald and gold WebLift SA robot assistant' loading='eager' src='"+ART+"'>"+
"<strong>LIFTY <span>✦</span></strong><div id='liftyActivity' role='status' class='liftyactivity'>Connected · Tell me who you are looking for.</div><div class='liftyprogress'><i></i></div></div>"+
"<div class='liftyop'><div class='liftyeyebrow'>MEET YOUR LEADRADAR SEARCH SPECIALIST</div><h1>I'm <em>Lifty.</em><br>Who can I find<br>for you today?</h1><p>I search the public sources connected to LeadRadar, qualify possible opportunities and guide you through this application. Choose your service, industry and location.</p>"+
"<form id='liftySearchForm'><div class='liftygrid'><label>INDUSTRY OR SERVICE<input id='liftyKeyword' value='web design' type='search' maxlength='55' minlength='3' placeholder='websites, carpentry, marketing' required></label><label>LOCATION<input id='liftyRegion' value='Worldwide' type='search' maxlength='60' placeholder='Worldwide / country / city'></label><label>SEARCH TYPE<select id='liftyKind'><option value='all'>Services + hiring signals</option><option value='services'>Service requests only</option></select></label><button class='liftystart' type='submit' id='liftyRun'>◎ Lifty, search now</button></div></form>"+
"<div class='liftychips'><span>Try:</span><button data-keyword='web design'>Web design</button><button data-keyword='marketing'>Marketing</button><button data-keyword='construction'>Construction</button><button data-keyword='carpentry'>Carpentry</button><button data-keyword='software developer'>IT services</button></div>"+
"<div class='liftyquickactions'><button data-lifty='dashboard'>▦ Administration</button><button data-lifty='settings'>⚙ Monitor controls</button><button data-lifty='offer'>✦ Free website design</button><button data-lifty='share'>↗ Share Lifty</button></div>"+
"<form id='liftyCommandForm' style='display:flex;gap:7px;margin-top:18px;align-items:end'><label style='flex:1;color:#bdd2bd;font-size:10px;font-weight:800'>ASK LIFTY<input id='liftyCommand' maxlength='160' placeholder='e.g. Find carpenters in London' style='width:100%;margin-top:7px;background:#164832;border:1px solid #5b9074;padding:12px;border-radius:9px;color:white;font-size:12px'></label><button class='liftystart' type='submit'>Go ↗</button></form>"+
"</div></div>"+
"<div class='liftybox'><div class='liftyboxhead'><div><div class='liftyeyebrow' style='color:#917444'>LIVE PUBLIC SOURCE CHECKS</div><h2 id='liftyResultsTitle'>Live opportunity discovery</h2><p id='liftyResultsNote'>Run a search to see real opportunities. No fabricated leads, contacts, or statistics.</p></div><span class='liftycount' id='liftyCount'>Ready</span></div><div id='liftyResults' class='liftyresults'><div class='liftyempty'>✦ I'm ready to find businesses that may need your services.</div></div><div class='liftyprivacy'>🔒 Public demo masks contact numbers, email, handles and original source links. A paid subscription never overrides privacy or outreach-consent requirements. Currently connected: worldwide Hacker News public discussions and Europe / UK hiring posts from Arbeitnow.</div></div>"+
"<div class='liftypricing' id='liftyPricing'><div><div class='liftyeyebrow' style='color:#987647'>PLANNED PAID SUBSCRIPTION</div><h2>LeadRadar Pro <em>R500 / month</em></h2><p>Custom search monitoring, saved leads and subscriber workspaces are planned. Activation requires verified payment and permissions; these paid features are not active yet.</p></div><a target='_blank' rel='noopener noreferrer' href='https://wa.me/27717643447?text=Hello%20WebLift%20SA%2C%20please%20tell%20me%20about%20LeadRadar%20Pro%20at%20R500%20per%20month.'>Discuss R500 plan ↗</a></div></section>";
const content=document.querySelector("main.content");if(!content)return;
content.insertAdjacentHTML("beforeend",page);
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);return x};
const bubble=el("button");bubble.type="button";bubble.className="liftybubble";bubble.setAttribute("aria-label","Open Lifty search assistant");
const bubbleImage=el("img");bubbleImage.src=ART;bubbleImage.alt="";bubbleImage.loading="lazy";
const bubbleText=el("span");bubbleText.append(el("b","Ask Lifty"),el("span","Search with me"));bubble.append(bubbleImage,bubbleText);document.body.append(bubble);
const menu=document.querySelector(".nav");
if(menu){const btn=el("button");btn.className="navbtn";btn.type="button";btn.dataset.screen="lifty";btn.innerHTML='<span class="symbol">✧</span> Ask Lifty';menu.insertBefore(btn,menu.querySelector(".navbtn"));btn.addEventListener("click",openLifty)}
const hero=document.querySelector(".radar-art");
if(hero){hero.replaceChildren();const wrap=el("div");wrap.className="liftyheroimg";const photo=el("img");photo.src=ART;photo.alt="Lifty, official WebLift SA assistant";wrap.append(photo,el("b","Lifty · Your LeadRadar Operator"));hero.append(wrap)}
function openLifty(){
 document.querySelectorAll(".screen").forEach(x=>x.classList.toggle("active",x.id==="screen-lifty"));
 document.querySelectorAll(".navbtn").forEach(x=>x.classList.toggle("active",x.dataset.screen==="lifty"));
 history.replaceState(null,"","#lifty");window.scrollTo({top:0,behavior:"smooth"});
}
function nav(name){if(name==="lifty"){openLifty();return}const button=document.querySelector('.navbtn[data-screen="'+name+'"]');if(button)button.click()}
bubble.addEventListener("click",openLifty);
if(location.hash==="#lifty")openLifty();
if(location.hash==="#admin"||location.hash==="#dashboard")nav("dashboard");
const say=t=>{$("liftyActivity").textContent=t};
let busy=false;
function render(row){
 const card=el("article");card.className="liftycard";
 const head=el("header");head.append(el("span",row.source||"Public source"),el("span",row.type||"Opportunity"));card.append(head);
 card.append(el("h3",row.title||"Opportunity"),el("p",row.summary||"No details available"),el("p","Location: "+(row.country||"Not verified")));
 const locked=el("div","🔒 Contact details hidden · Public preview");locked.className="liftylocked";card.append(locked);return card;
}
async function run(){
 if(busy)return;
 const q=$("liftyKeyword").value.trim(),where=$("liftyRegion").value.trim()||"Worldwide",kind=$("liftyKind").value;
 if(q.length<3){say("Enter at least three characters for your industry.");return;}
 busy=true;$("liftyRun").disabled=true;$("liftyRun").textContent="◎ Searching...";
 $("liftyFigure").classList.add("issearching");say("Looking for "+q+" opportunities in "+where+"...");
 $("liftyCount").textContent="Searching";$("liftyResultsTitle").textContent="Searching: "+q;
 $("liftyResultsNote").textContent="Checking connected public data sources, with contact details concealed.";
 const list=$("liftyResults");const loading=el("div","I'm checking current posts and hiring opportunities.");loading.className="liftyempty";list.replaceChildren(loading);
 try{
  const url=new URL(API+"/api/explore");url.searchParams.set("q",q);url.searchParams.set("region",where);url.searchParams.set("kind",kind);
  const response=await fetch(url,{headers:{"Accept":"application/json"}});const data=await response.json();
  if(!response.ok)throw Error(data.error||"Live search unavailable");
  $("liftyResultsTitle").textContent="Results: "+q;$("liftyCount").textContent=data.count+" matches";
  $("liftyResultsNote").textContent="I checked "+data.checked+" public posts. Sources: "+(data.sources||[]).join(", ")+". "+(data.errors?.length?"Some sources were temporarily unavailable.":"");
  list.replaceChildren();if(!data.results?.length){const empty=el("div","No matching opportunities in these sources right now. Try Worldwide or another service.");empty.className="liftyempty";list.append(empty)}
  else data.results.forEach(row=>list.append(render(row)));
  say("Scan complete · "+data.count+" preview results");sessionStorage.setItem("lifty_last_keyword",q);
 }catch(error){$("liftyCount").textContent="Unavailable";$("liftyResultsTitle").textContent="Source temporarily unavailable";$("liftyResultsNote").textContent=error.message||"Unable to fetch results";const empty=el("div","Unable to search currently. Please try again.");empty.className="liftyempty";list.replaceChildren(empty);say("Could not complete search")}
 finally{busy=false;$("liftyRun").disabled=false;$("liftyRun").textContent="◎ Lifty, search now";$("liftyFigure").classList.remove("issearching");}
}
$("liftySearchForm").addEventListener("submit",e=>{e.preventDefault();run()});
document.querySelectorAll("[data-keyword]").forEach(x=>x.addEventListener("click",()=>{$("liftyKeyword").value=x.dataset.keyword;run()}));
document.querySelectorAll("[data-lifty]").forEach(x=>x.addEventListener("click",()=>{
 const act=x.dataset.lifty;
 if(act==="dashboard"){say("Opening administration. An authorised sign-in may be required.");nav("dashboard")}
 if(act==="settings"){say("Opening monitor controls. Administrator access may be required.");nav("settings")}
 if(act==="offer"){nav("offer")}
 if(act==="share"){const url="https://weblift-leadradar.onrender.com/#lifty",message="Meet Lifty, WebLift SA's worldwide search guide: "+url;
   if(navigator.share)navigator.share({title:"Meet Lifty · WebLift SA",text:message,url}).catch(()=>{});
   else window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener") }
}));
$("liftyCommandForm").addEventListener("submit",e=>{
 e.preventDefault();const value=$("liftyCommand").value.trim();if(!value)return;
 if(/\b(admin|dashboard|my leads)\b/i.test(value)){nav("dashboard");return}
 if(/\b(settings|monitor|pause|resume)\b/i.test(value)){nav("settings");return}
 if(/\b(free design|free website|free preview)\b/i.test(value)){nav("offer");return}
 if(/\b(price|pricing|subscription|subscribe|500)\b/i.test(value)){$("liftyPricing").scrollIntoView({behavior:"smooth"});say("LeadRadar Pro is planned at R500 per month; no charge is taken on this screen.");return}
 const m=value.match(/(?:find|search|look for|show)(?: me| for)?\s+(.+?)(?:\s+in\s+(.+))?$/i);
 if(m){$("liftyKeyword").value=m[1].slice(0,55);if(m[2])$("liftyRegion").value=m[2].slice(0,60);run();return}
 say("Try: 'Find carpenters in London', 'dashboard', 'search settings', 'free design', or 'subscription'.");
});
const last=sessionStorage.getItem("lifty_last_keyword");if(last)$("liftyKeyword").value=last;
fetch(API+"/api/health").then(r=>r.json()).then(x=>say(x.monitor_enabled?"I'm online · Background monitoring enabled":"I'm online · Background monitoring paused")).catch(()=>say("Search controls ready · Monitor status unavailable"));
})();

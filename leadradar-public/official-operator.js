
(function(){
"use strict";
if(window.__webliftLiftyOperatorV2)return;window.__webliftLiftyOperatorV2=true;
const API="https://geawayzadsrkxkjmkxkj.supabase.co/functions/v1/weblift-leadradar";
const FULL="https://weblift-leadradar-quantifier-pro.vercel.app/#lifty";
function element(tag,props={},text){const x=document.createElement(tag);for(const [k,v] of Object.entries(props))x.setAttribute(k,v);if(text!==undefined)x.textContent=text;return x}
function mount(){
 if(document.getElementById("wl-operator-modal"))return;
 const css=[
 "#wl-lifty-launch{position:fixed;z-index:2147479000;bottom:91px;left:12px;display:flex;align-items:center;gap:7px;padding:4px 13px 4px 4px;border-radius:15px;border:1px solid #dbbf85;background:linear-gradient(140deg,#10563f,#063026);box-shadow:0 10px 30px #052c2766;color:#fff;cursor:pointer;font:inherit}",
 "#wl-lifty-launch img{width:49px;height:51px;object-fit:contain}#wl-lifty-launch strong{display:block;font-size:13px;color:#f0d091}#wl-lifty-launch small{display:block;font-size:10px;color:#e6efe7}",
 "#wl-operator-modal{position:fixed;inset:0;z-index:2147480400;background:#061e19c7;backdrop-filter:blur(7px);display:none;align-items:center;justify-content:center;padding:14px}",
 "#wl-operator-modal[data-open=true]{display:flex}#wl-operator-modal *{box-sizing:border-box}",
 "#wl-operator-modal .wlo-shell{width:min(1040px,98vw);max-height:94dvh;overflow:auto;background:#fafbf7;border-radius:23px;border:1px solid #cfad78;box-shadow:0 35px 90px #001b17aa;color:#1b3e2d;font-family:system-ui,Arial,sans-serif}",
 "#wl-operator-modal .wlo-bar{background:#082f26;display:flex;justify-content:space-between;align-items:center;padding:13px 19px;color:white;font-weight:800;font-size:13px}",
 "#wl-operator-modal .wlo-bar span{color:#eac385}#wl-operator-modal .wlo-close{color:#fff;border:1px solid #ffffff55;background:#ffffff11;border-radius:8px;font-size:21px;cursor:pointer;width:39px;height:39px}",
 "#wl-operator-modal .wlo-grid{display:grid;grid-template-columns:.8fr 1.2fr}#wl-operator-modal .wlo-art{background:radial-gradient(ellipse at 45% 38%,#328257,#0a4032 56%,#03251f);min-height:365px;display:flex;justify-content:center;align-items:center;flex-direction:column;padding:18px;position:relative;overflow:hidden}",
 "#wl-operator-modal .wlo-art:before{content:'';border:1px solid #e3c58b66;border-radius:50%;width:280px;height:280px;position:absolute;box-shadow:0 0 0 40px #d6b87b0c,0 0 0 80px #d6b87b0a}",
 "#wl-operator-modal .wlo-art img{width:min(100%,290px);height:270px;object-fit:contain;position:relative;animation:wlo-float 4s ease-in-out infinite;filter:drop-shadow(0 18px 20px #00221bbf)}",
 "#wl-operator-modal .wlo-art strong{font-size:24px;color:#f4dbab;letter-spacing:.12em}#wl-operator-modal .wlo-art small{font-size:11px;color:#dcf0e1;text-align:center;max-width:240px;line-height:1.5;margin-top:9px}",
 "#wl-operator-modal .wlo-body{padding:26px 27px}#wl-operator-modal h2{font-size:clamp(23px,3vw,34px);line-height:1.15;margin:8px 0 12px;letter-spacing:-.04em}",
 "#wl-operator-modal .wlo-body>p{font-size:12px;line-height:1.7;color:#536c59}#wl-operator-modal .wlo-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}",
 "#wl-operator-modal label{font-size:10px;font-weight:800;letter-spacing:.04em;color:#55705a}#wl-operator-modal input,#wl-operator-modal select{display:block;width:100%;min-width:0;border:1px solid #c8dbcc;border-radius:9px;padding:12px;background:#fff;color:#182f22;font-size:12px;margin-top:7px}",
 "#wl-operator-modal .wlo-submit{grid-column:1/-1;cursor:pointer;background:#0c7651;border:0;border-radius:10px;color:#fff;padding:14px;font-weight:800;font-size:13px}",
 "#wl-operator-modal .wlo-status{font-size:12px;color:#437153;min-height:20px;margin-top:13px;line-height:1.6}#wl-operator-modal .wlo-results{display:grid;grid-template-columns:1fr 1fr;gap:9px;max-height:270px;overflow:auto;margin-top:9px}",
 "#wl-operator-modal .wlo-card{min-width:0;background:#fff;border:1px solid #dbe7db;border-radius:10px;padding:13px}#wl-operator-modal .wlo-card h3{font-size:12px;margin:8px 0;letter-spacing:0}#wl-operator-modal .wlo-card p{font-size:11px;color:#566d59;line-height:1.5;margin:4px 0}#wl-operator-modal .wlo-card small{font-size:10px;color:#956e3b}",
 "#wl-operator-modal .wlo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}#wl-operator-modal .wlo-actions a{font-size:11px;font-weight:800;text-decoration:none;color:#166748;padding:10px;border-radius:9px;border:1px solid #caddc8}",
 "#wl-operator-modal .wlo-foot{font-size:10px;line-height:1.6;color:#5b725f;margin-top:13px}",
 "#wl-lifty-search-promo{display:block;width:100%;max-width:720px;margin:18px auto;background:linear-gradient(140deg,#0b593f,#063a2d);border:1px solid #c8a872;color:#f6eee0;border-radius:15px;padding:17px 20px;text-align:left;cursor:pointer;box-shadow:0 8px 26px #062b2230}",
 "#wl-lifty-search-promo b{color:#e8c280;display:block;font-size:16px;margin:4px 0}#wl-lifty-search-promo small{font-size:12px;opacity:.85}",
 "@keyframes wlo-float{50%{transform:translateY(-10px)}}#wl-operator-modal[data-busy=true] .wlo-art img{animation-duration:.7s}",
 "@media(max-width:660px){#wl-operator-modal .wlo-grid{display:block}#wl-operator-modal .wlo-art{min-height:160px;padding:8px}#wl-operator-modal .wlo-art img{height:140px}#wl-operator-modal .wlo-art strong{font-size:17px}#wl-operator-modal .wlo-body{padding:19px}#wl-operator-modal .wlo-form{grid-template-columns:1fr}#wl-operator-modal .wlo-submit{grid-column:auto}#wl-operator-modal .wlo-results{grid-template-columns:1fr}#wl-lifty-launch{bottom:86px;left:8px}#wl-lifty-launch img{width:42px;height:44px}}",
 "@media(prefers-reduced-motion:reduce){#wl-operator-modal .wlo-art img{animation:none!important}}"
 ].join("");
 const style=element("style",{id:"wl-operator-style"});style.textContent=css;document.head.append(style);
 const trigger=element("button",{id:"wl-lifty-launch",type:"button","aria-label":"Ask Lifty to find clients worldwide"});
 const pic=element("img",{src:"/lifty/transparent.webp",alt:"",loading:"lazy"}),box=element("span");
 box.append(element("strong",{},"Ask Lifty"),element("small",{},"Find real clients"));trigger.append(pic,box);document.body.append(trigger);
 const overlay=element("div",{id:"wl-operator-modal",role:"dialog","aria-modal":"true","aria-label":"Lifty Live Lead Search", "data-open":"false"});
 overlay.innerHTML='<div class="wlo-shell"><div class="wlo-bar"><div>✦ WEBLIFT SA <span>· LIFTY LEADRADAR</span></div><button class="wlo-close" type="button" aria-label="Close Lifty">×</button></div><div class="wlo-grid"><div class="wlo-art"><img src="/lifty/transparent.webp" alt="Official WebLift SA Lifty 3D robot"><strong>LIFTY ✦</strong><small id="wlo-activity">I am online and ready to search.</small></div><div class="wlo-body"><span style="color:#937043;font-size:10px;font-weight:800;letter-spacing:.1em">YOUR LIVE OPPORTUNITY SEARCH</span><h2>Who can I find for you today?</h2><p>Ask me to search public opportunities by industry, service, country or city. I show genuine source results, not fabricated clients.</p><form id="wlo-form" class="wlo-form"><label>Industry or service<input name="q" value="web design" minlength="3" maxlength="55" placeholder="Marketing, construction, web design" required></label><label>Country or location<input name="region" value="Worldwide" maxlength="60" placeholder="Worldwide"></label><label>Opportunity type<select name="kind"><option value="all">Client requests + hiring posts</option><option value="services">Client requests only</option></select></label><button class="wlo-submit" type="submit">◎ Search live with Lifty</button></form><div id="wlo-status" class="wlo-status" role="status" aria-live="polite">Connected to WebLift LeadRadar.</div><div id="wlo-results" class="wlo-results"></div><div class="wlo-actions"><a target="_blank" rel="noopener noreferrer" href="https://weblift-leadradar-quantifier-pro.vercel.app/#lifty">Full LeadRadar ↗</a><a target="_blank" rel="noopener noreferrer" href="https://wa.me/27717643447?text=Hello%20WebLift%20SA%2C%20I%20would%20like%20to%20discuss%20LeadRadar%20Pro%20at%20R500%20per%20month.">Discuss R500 plan ↗</a></div><p class="wlo-foot">Public demo: contact details and source links are concealed. Coverage currently includes worldwide Hacker News discussions and the Arbeitnow hiring feed (mainly Europe/UK). A paid plan does not override privacy or outreach-consent requirements. Subscription payments and automated messaging are not active yet.</p></div></div></div>';
 document.body.append(overlay);
 const form=overlay.querySelector("#wlo-form"),status=overlay.querySelector("#wlo-status"),results=overlay.querySelector("#wlo-results"),activity=overlay.querySelector("#wlo-activity"),submit=overlay.querySelector(".wlo-submit"),q=form.querySelector('[name="q"]'),reg=form.querySelector('[name="region"]'),kind=form.querySelector('[name="kind"]');
 let focus=null,busy=false;const open=()=>{focus=document.activeElement;overlay.dataset.open="true";document.body.style.overflow="hidden";q.focus()};
 const close=()=>{overlay.dataset.open="false";document.body.style.removeProperty("overflow");(focus||trigger).focus()};
 trigger.addEventListener("click",open);overlay.querySelector(".wlo-close").addEventListener("click",close);overlay.addEventListener("click",e=>{if(e.target===overlay)close()});overlay.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();close()}if(e.key==="Tab"){const list=[...overlay.querySelectorAll("button,input,select,a[href]")];if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list[list.length-1].focus()}else if(!e.shiftKey&&document.activeElement===list[list.length-1]){e.preventDefault();list[0].focus()}}});
 const spotlight=document.getElementById("lifty-spotlight");
 if(spotlight){
  const btn=element("button",{id:"wl-lifty-search-promo",type:"button"});
  btn.append(element("small",{},"MEET WEBLIFT'S LEAD DISCOVERY ASSISTANT"),element("b",{},"✦ Let Lifty find customers for you"),element("small",{},"Try live worldwide searches · No registration required for previews"));
  spotlight.append(btn);btn.addEventListener("click",open);
 }
 const nav=document.querySelector(".desktop-nav");
 if(nav){const a=element("a",{href:"#lifty-search"},"LeadRadar ✦");a.addEventListener("click",e=>{e.preventDefault();open()});nav.append(a)}
 const render=item=>{
  const article=element("article",{class:"wlo-card"});
  article.append(element("small",{},String(item.source||"Public source")+" · "+String(item.type||"Opportunity")),element("h3",{},String(item.title||"Opportunity")),element("p",{},String(item.summary||"")),element("small",{},"🔒 Contact hidden · "+String(item.country||"Location unverified")));return article;
 };
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(busy)return;const query=q.value.trim();if(query.length<3)return;
  busy=true;submit.disabled=true;submit.textContent="◎ Lifty is searching";overlay.dataset.busy="true";results.replaceChildren();status.textContent="Checking real public source records...";activity.textContent="Searching "+query+" for you...";
  try{
   const url=new URL(API+"/api/explore");url.searchParams.set("q",query);url.searchParams.set("region",reg.value.trim()||"Worldwide");url.searchParams.set("kind",kind.value);
   const response=await fetch(url,{headers:{Accept:"application/json"}});const json=await response.json();
   if(!response.ok)throw Error(json.error||"Public search temporarily unavailable");
   (json.results||[]).forEach(x=>results.append(render(x)));
   if(!json.results?.length)results.append(element("article",{class:"wlo-card"},"No matching opportunities from connected sources. Try another industry or location."));
   status.textContent="Checked "+json.checked+" public posts · "+json.count+" available previews · Sources: "+(json.sources||[]).join(", ")+(json.errors?.length?" · Some source errors":"");
   activity.textContent="Completed · "+json.count+" preview results";
  }catch(error){status.textContent="Source temporarily unavailable: "+(error.message||"Try again");activity.textContent="Search interrupted."}
  finally{busy=false;submit.disabled=false;submit.textContent="◎ Search live with Lifty";overlay.dataset.busy="false"}
 });
 fetch(API+"/api/health").then(r=>r.json()).then(x=>{if(!busy)activity.textContent=x.monitor_enabled?"Background discovery active · Online":"Background discovery paused · Online"}).catch(()=>{});
 if(location.hash==="#lifty-search")open();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
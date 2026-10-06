'use strict';
/* Конструктор ИИ-трансформации · версия 2 — вкладка «Стек»: сборка на этажах, сравнение сборок, паспорт стека, «если уйдёт».
   Отрисовка перенесена из версии 1; добавлено число проектов, которым нужен каждый слой. */

/* ---- общие элементы ---- */
const stBadge=st=>`<span class="st ${st}">${ST_T[st]}</span>`;
const sevBadge=sev=>`<span class="st ${sev}">${SEV_T[sev]} ${SEV_W[sev]}</span>`;
function stBadgeN(st,n){const w={ok:'закрыто',part:'частично',gap:plural(n,'дыра','дыры','дыр')}[st];return `<span class="st ${st}">${ST_T[st].split(' ')[0]} ${n} ${w}</span>`;}
const isOwnPos=id=>(PROFILES[S.prof].own||[]).includes(id);
const plain=h=>new DOMParser().parseFromString('<!doctype html><body>'+h,'text/html').body.textContent||'';
function chipsHTML(opts,max){
 max=max||3;
 if(!opts.length)return '<span class="chip none">нет позиции</span>';
 const cls=o=>o.kind==='bank'||isOwnPos(o.id)?' bank':o.kind==='claim'?' claim':'';
 const lab=o=>o.kind==='bank'||isOwnPos(o.id)?'у банка: '+o.short:o.kind==='claim'?o.short+' · заявка':o.short;
 return opts.slice(0,max).map(o=>`<span class="chip${cls(o)}" translate="no" title="${esc(o.n)}">${esc(lab(o))}</span>`).join('')+(opts.length>max?`<span class="chip more">+${opts.length-max}</span>`:'');
}
function legendHTML(){
 const bank=S.prof==='vtb'?'<span class="i"><span class="chip bank">у банка: уже есть</span></span>':'';
 return `<div class="legend"><span class="i">${stBadge('ok')} все позиции с подтверждённым on-prem</span><span class="i">${stBadge('part')} on-prem не проверен либо есть известный пробел</span><span class="i">${stBadge('gap')} позиции нет, нарушено требование или известная дыра</span><span class="i">${sevBadge('chk')} проверка, на итог не влияет</span>${bank}<span class="i"><span class="chip claim">заявка вкладки 4</span></span></div>`;
}
function todoLI(x){
 return `<li>${sevBadge(x.sev)}<div><button type="button" class="lnk" data-act="goto" data-l="${x.layers[0]}">${esc(layersLabel(x.layers))}</button> — ${x.t}<span class="who">Решает: ${esc(x.who)}</span></div></li>`;
}
function tab4Note(ev){
 if(S.prof!=='vtb'||S.asm.base!=='consortium')return '';
 const t4={ok:0,part:0,gap:0},dif=[];
 D.VTB.rows.forEach(r=>{if(t4[r.st]!=null)t4[r.st]++;if(ev.lay[r.id]&&ev.lay[r.id].st!==r.st)dif.push(r.id);});
 const links=dif.map(id=>`<button type="button" class="lnk" data-act="goto" data-l="${id}">${esc(codeShort(byId(id)))}</button>`).join(', ');
 return `<p class="v-note"><b>Ручная оценка вкладки 4:</b> ✓ ${t4.ok} · ◐ ${t4.part} · ✖ ${t4.gap}. ${dif.length?`Правила дают другой итог на ${dif.length} ${plural(dif.length,'слое','слоях','слоях')}: ${links} — причина в панели слоя.`:'Итог совпадает с ручной оценкой.'}${S.asm.edited?' Сборка изменена, поэтому сравнение условное.':''}</p>`;
}
function verdictHTML(ev){
 const c=ev.counts,top=topList(ev,D.L.map(l=>l.id)),ps=Object.keys(ev.parties).sort((a,b)=>partyName(a).localeCompare(partyName(b),'ru'));
 const more=top.length-3;
 return `<div class="verdict"><div>
  <h2 class="v-kicker">Итог сборки · ${esc(asmName())}</h2>
  <div class="big">${c.ok} <small>из ${D.L.length} слоёв закрыто</small></div>
  <div class="counts">${stBadgeN('ok',c.ok)}${stBadgeN('part',c.part)}${stBadgeN('gap',c.gap)}</div>
  <p class="v-sub">${verdictText(ev)}</p>${tab4Note(ev)}
 </div><div>
  <h3 class="v-kicker">Решить первым</h3>
  ${top.length?`<ol class="todo">${top.slice(0,3).map(todoLI).join('')}</ol>${more>0?`<p class="more-n">Ещё ${more} ${plural(more,'замечание','замечания','замечаний')} — в панели слоёв и в паспорте.</p>`:''}`:'<p class="v-sub">Замечаний нет.</p>'}
  ${ps.length?`<div class="stress-pick"><label class="fld" for="stress-sel">Проверить выбывание: если уйдёт</label><select id="stress-sel">${ps.map(p=>`<option value="${esc(p)}">${esc(partyName(p))}</option>`).join('')}</select><button type="button" class="btn sm" data-act="stress-go">Показать, что сломается</button></div>`:''}
 </div></div>`;
}
/* сколько проектов текущего масштаба нуждается в каждом слое */
function needCounts(){const ps=projects(),nc={};D.L.forEach(l=>nc[l.id]=0);ps.forEach(p=>needOf(p).forEach(id=>{if(own(nc,id))nc[id]++;}));return {nc,n:ps.length};}
const ncHTML=(N,id)=>`<span class="nc" title="Слой нужен ${N.nc[id]} ${plural(N.nc[id],'проекту','проектам','проектам')} из ${N.n}"><span class="sr">Нужен проектам: </span>${N.nc[id]} из ${N.n}</span>`;
function subnavHTML(){
 return `<div class="subnav"><span class="seg big" role="group" aria-label="Режим вкладки «Стек»"><button type="button" data-act="view" data-v="stack" aria-pressed="${S.view==='stack'}">Собрать стек</button><button type="button" data-act="view" data-v="compare" aria-pressed="${S.view==='compare'}">Сравнить сборки</button></span></div>`;
}
/* ---- сборка на этажах ---- */
function towerHTML(ev,N){
 let h='<div class="floors">',g0=null;
 FLOORS().forEach(l=>{
  if(l.g!==g0){h+=`<div class="gsep" aria-hidden="true">${esc(D.G[l.g].n)}</div>`;g0=l.g;}
  const L=ev.lay[l.id];
  h+=`<button type="button" class="floor" style="--gc:${D.G[l.g].c}" data-act="layer" data-l="${l.id}" aria-pressed="${S.layer===l.id}"><span class="fc" aria-hidden="true">${esc(l.code)}</span><span class="fn"><span class="sr">Этаж ${esc(l.code)}. </span>${esc(l.n)}</span><span class="chips">${chipsHTML(L.opts)}</span>${ncHTML(N,l.id)}${stBadge(L.st)}</button>`;
 });
 h+='</div><div class="gsep" aria-hidden="true">Сквозные слои — работают на всех этажах</div><div class="cross">';
 CROSS().forEach(l=>{
  const L=ev.lay[l.id];
  h+=`<button type="button" class="xc" style="--gc:${D.G.x.c}" data-act="layer" data-l="${l.id}" aria-pressed="${S.layer===l.id}"><span class="fc">${esc(l.code)}</span><span class="fn">${esc(l.n)}</span><span class="chips">${chipsHTML(L.opts,2)}</span>${ncHTML(N,l.id)}${stBadge(L.st)}</button>`;
 });
 return h+'</div>';
}
function findLI(f){
 const btn=f.gid?`<button type="button" class="btn sm" data-act="${S.asm.res[f.gid]?'unres':'res'}" data-g="${esc(f.gid)}">${S.asm.res[f.gid]?'Вернуть пробел':'Отметить закрытым вручную'}</button>`:'';
 return `<li>${sevBadge(f.sev)}<div>${f.t}<span class="who">Решает: ${esc(f.who)}${f.src?' · источник: '+esc(f.src):''}</span>${btn}</div></li>`;
}
function optRow(o,inAsm){
 const own=o.kind==='bank'||isOwnPos(o.id);
 const nm=o.u?`<a href="${esc(o.u)}" target="_blank" rel="noopener" translate="no">${esc(o.n)}</a>`:`<span translate="no">${esc(o.n)}</span>`;
 const g=o.g&&D.GRP[o.g]?`<span class="pill" style="background:${D.GRP[o.g].bg};color:${D.GRP[o.g].fg}">${esc(D.GRP[o.g].t)}</span>`:'';
 let meta;
 if(o.kind==='claim')meta=`<span class="conf"><span class="dot" style="background:${CONF_C.m}" aria-hidden="true"></span>заявка вкладки 4 — в каталоге позиции нет</span>`;
 else if(o.kind==='bank')meta=`<span>есть у банка · ${esc(o.src)}</span>`;
 else meta=`<span translate="no">${esc(o.co)}</span>${g}<span class="conf"><span class="dot" style="background:${CONF_C[o.c]}" aria-hidden="true"></span>${CONF_T[o.c]}</span><span>${o.mk==='ru'?'Россия':'США'}${own?' · уже работает у банка':''}</span>`;
 const role=o.kind==='claim'?o.html:esc(o.r);
 let acts;
 if(o.kind==='claim'&&o.na&&!inAsm)acts='<span class="st info">недоступно в контуре</span>';
 else if(inAsm)acts=`<button type="button" class="btn sm" data-act="rm" data-id="${esc(o.id)}" aria-label="Убрать из сборки: ${esc(o.n)}">Убрать</button>${isVendor(o.party)?`<button type="button" class="btn sm" data-act="stress" data-p="${esc(o.party)}">Если уйдёт ${esc(partyName(o.party))}</button>`:''}`;
 else acts=`<button type="button" class="btn sm" data-act="add" data-id="${esc(o.id)}" aria-label="Добавить в сборку: ${esc(o.n)}">Добавить</button>`;
 return `<div class="opt${o.na&&!inAsm?' na':''}"><div><div class="on">${nm}</div><div class="meta">${meta}</div><div class="role">${role}</div></div><div class="acts">${acts}</div></div>`;
}
function panelHTML(ev){
 const l=byId(S.layer),L=ev.lay[l.id],P=PROFILES[S.prof],mk=S.mk||P.mk,inSel=id=>S.asm.sel[l.id].includes(id);
 const users=projects().filter(p=>needOf(p).includes(l.id));
 let h=`<div class="p-head"><span class="code" style="background:${D.G[l.g].c}">${esc(codeLabel(l))}</span><h2 tabindex="-1">${esc(l.n)}</h2>${stBadge(L.st)}</div>
  <p class="p-one">${esc(l.one)}</p><p class="need"><b>${S.prof==='kii'?'Требование к слою (карта сформулировала его для банка)':'Требование банка'}:</b> ${esc(l.need)}</p>`;
 h+=`<p class="pk"><b>Нужен проектам · ${users.length} из ${projects().length}:</b> ${users.length?users.map(p=>`<button type="button" class="lnk" data-act="proj" data-p="${p.id}" title="${esc(p.n)}">${esc(p.code)}</button>`).join(', '):'ни одному проекту масштаба'}</p>`;
 h+=`<div class="p-sec"><h3>Почему такой итог</h3>${L.f.length?`<ul class="finds">${L.f.slice().sort(bySev).map(findLI).join('')}</ul>`:'<p class="empty">Замечаний нет: у всех позиций слоя подтверждён on-prem.</p>'}</div>`;
 h+=`<div class="p-sec"><h3>В сборке · ${L.opts.length}</h3>${L.opts.length?L.opts.map(o=>optRow(o,true)).join(''):'<p class="empty">Пока ничего — добавьте позицию из списков ниже.</p>'}</div>`;
 const bank=[...P.bank.map(id=>BANK[id]),...P.own.map(id=>CAT[id])].filter(o=>o&&o.layer===l.id&&!inSel(o.id));
 if(bank.length)h+=`<div class="p-sec"><h3>Есть у банка</h3>${bank.map(o=>optRow(o,false)).join('')}</div>`;
 const cl=Object.values(CLAIM).filter(o=>o.layer===l.id&&!inSel(o.id));if(cl.length)h+=`<div class="p-sec"><h3>Заявки участников из вкладки 4</h3>${cl.map(o=>optRow(o,false)).join('')}</div>`;
 const cat=BYL[l.id].map(id=>CAT[id]).filter(p=>(mk==='all'||p.mk===mk)&&!inSel(p.id)&&!P.own.includes(p.id));
 const seg=`<span class="seg" role="group" aria-label="Рынок каталога">${[['ru','Россия'],['us','США'],['all','Все']].map(([k,t])=>`<button type="button" data-act="mk" data-mk="${k}" aria-pressed="${mk===k}">${t}</button>`).join('')}</span>`;
 h+=`<div class="p-sec"><h3>Каталог карты · можно добавить</h3><div class="seg-row">${seg}</div>${cat.length?cat.map(o=>optRow(o,false)).join(''):'<p class="empty">Все позиции этого рынка уже в сборке.</p>'}</div>`;
 [mk!=='us'&&D.RU.notes[l.id]?['Россия',D.RU.notes[l.id]]:null,mk!=='ru'&&D.US.notes[l.id]?['США',D.US.notes[l.id]]:null].filter(Boolean)
  .forEach(([t,n])=>h+=`<p class="p-note"><b>Заметка карты · ${t}:</b> ${n}</p>`);
 h+=`<details class="comp"><summary>Из чего состоит слой · ${l.c.length} ${plural(l.c.length,'компонент','компонента','компонентов')}</summary><ul>${l.c.map(t=>`<li><b>${esc(t[0])}</b> — ${esc(t[1])}</li>`).join('')}</ul></details>`;
 return h;
}
function renderStack(ev){
 if(!S.layer||!byId(S.layer))S.layer=(topList(ev,D.L.map(l=>l.id))[0]||{layers:['m5']}).layers[0];
 const N=needCounts();
 $('#view-stack').innerHTML=subnavHTML()+verdictHTML(ev)+`<div class="work"><div class="box"><h2>Кто закрывает каждый слой</h2><p class="sub">Нажмите на слой, чтобы увидеть, почему у него такой итог, и поменять позиции.</p><p class="need-note">Справа у слоя — сколько проектов масштаба «${esc(SCALES[S.prof].n)}» в нём нуждаются: слой, нужный многим проектам и закрытый не полностью, — первый кандидат на решение.</p>${towerHTML(ev,N)}${legendHTML()}</div><aside class="box panel" id="panel" aria-label="Выбранный слой">${panelHTML(ev)}</aside></div>`;
}
/* ---- сравнение сборок ---- */
const hasBank=asm=>Object.values(asm.sel).some(ids=>ids.some(id=>{const o=getOpt(id);return o&&(o.kind==='bank'||isOwnPos(id));}));
function renderCompare(){
 const P=PROFILES[S.prof];
 const cols=[{cur:true,asm:S.asm,name:asmName()}].concat(S.cmp.map((pid,i)=>({i,pid,asm:newAsm(pid,S.prof),name:presetName(pid,S.prof)})));
 const evs=cols.map(c=>evaluate(c.asm,S.prof,S.flags));
 let h=subnavHTML()+`<h2 class="vh">Какую сборку предлагать?</h2><p class="vsub">Текущая сборка против двух других — на тех же правилах${S.prof==='vtb'?' и с тем, что уже есть у банка':''}. Итог — в карточках, разбор по слоям — в таблице.</p>`;
 h+='<div class="heads">'+cols.map((c,k)=>{
  const ev=evs[k],top=topList(ev,D.L.map(l=>l.id))[0],n=Object.keys(ev.parties).length;
  const title=c.cur?`<div class="v-kicker">Текущая сборка</div><div class="hn">${esc(c.name)}</div>`
   :`<label class="v-kicker" for="cmp-${c.i}">Сравнить с</label><select id="cmp-${c.i}" data-act="cmp" data-i="${c.i}">${P.presets.map(pid=>`<option value="${esc(pid)}"${pid===c.pid?' selected':''}>${esc(presetName(pid,S.prof))}</option>`).join('')}</select>`;
  return `<div class="head${c.cur?' cur':''}">${title}<div class="row2">${stBadgeN('ok',ev.counts.ok)}${stBadgeN('part',ev.counts.part)}${stBadgeN('gap',ev.counts.gap)}</div>
   <div class="hs">В сборке <b>${n} ${plural(n,'компания','компании','компаний')}</b>${hasBank(c.asm)?' и то, что уже есть у банка':''}.</div>
   ${top?`<div class="hs"><b>Решить первым:</b> ${esc(layersLabel(top.layers))} — ${top.t}</div>`:''}
   <div class="act">${c.cur?'<button type="button" class="btn sm" data-act="view" data-v="stack">Открыть в сборке</button>':`<button type="button" class="btn sm pri" data-act="take" data-i="${c.i}">Взять в работу</button>`}</div></div>`;
 }).join('')+'</div>';
 h+=`<div class="cmp-tools"><label class="chk"><input type="checkbox" data-act="diff"${S.diff?' checked':''}> Только слои с разным итогом</label>${legendHTML()}</div>`;
 h+=`<div class="cmp-wrap"><table class="cmp"><caption class="sr">Итог по слоям для трёх сборок</caption><thead><tr><th class="ln" scope="col">Слой</th>${cols.map(c=>`<th scope="col">${esc(c.name)}</th>`).join('')}</tr></thead><tbody>`;
 let shown=0;
 [...FLOORS(),...CROSS()].forEach(l=>{
  const sts=evs.map(ev=>ev.lay[l.id].st),same=sts.every(s=>s===sts[0]);
  if(S.diff&&same)return;shown++;
  h+=`<tr${same?'':' class="diff"'}><th scope="row"><span class="code" style="background:${D.G[l.g].c}">${esc(l.code)}</span>${esc(l.n)}</th>${cols.map((c,k)=>{
   const L=evs[k].lay[l.id];
   return `<td data-col="${esc(c.name)}"><div class="cell">${stBadge(L.st)}<span class="chips">${chipsHTML(L.opts,3)}</span>${c.cur?`<button type="button" class="lnk" data-act="goto" data-l="${l.id}">Открыть слой</button>`:''}</div></td>`;
  }).join('')}</tr>`;
 });
 if(!shown)h+=`<tr><td colspan="${cols.length+1}">Во всех сборках одинаковый итог на всех слоях.</td></tr>`;
 $('#view-compare').innerHTML=h+'</tbody></table></div>';
}
/* ---- паспорт стека: то же в окне и при печати ---- */
function ppOpt(o){
 const conf=o.kind==='claim'?'заявка вкладки 4':o.kind==='bank'?'есть у банка':CONF_T[o.c];
 const nm=o.u?`<a href="${esc(o.u)}">${esc(o.n)}</a>`:esc(o.n);
 return `${nm}${o.co?' · '+esc(o.co):''} · ${conf}`;
}
const shortHref=()=>{const href=location.href;return href.length>110?href.slice(0,107)+'…':href;};
const ruDate=()=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
function passportHTML(){
 const ev=evaluate(S.asm,S.prof,S.flags),all=topList(ev,D.L.map(l=>l.id));
 const rows=[...FLOORS(),...CROSS()].map(l=>{const L=ev.lay[l.id];
  return `<tr><td><b>${esc(codeLabel(l))}</b> · ${esc(l.n)}</td><td>${stBadge(L.st)}</td><td>${L.opts.length?L.opts.map(ppOpt).join('<br>'):'нет позиции'}</td><td>${L.f.length?L.f.slice().sort(bySev).map(f=>`${SEV_T[f.sev]} ${f.t}`).join('<br>'):'замечаний нет'}</td></tr>`;}).join('');
 return `<div class="pp"><span class="draft-banner">ЧЕРНОВИК · для внутреннего обсуждения, не для передачи за пределы компании</span>
  <h1 style="margin-top:10px">Паспорт стека · ${esc(asmName())}</h1>
  <p class="meta">Масштаб: ${esc(SCALES[S.prof].n)} · данные карты The 2026 On-Prem AI Landscape, снимок ${esc(SNAP)} · паспорт сформирован ${esc(ruDate())}</p>
  <h2>Итог</h2><p><b>${ev.counts.ok} из ${D.L.length} слоёв закрыто</b> · ◐ ${ev.counts.part} частично · ✖ ${ev.counts.gap} ${plural(ev.counts.gap,'дыра','дыры','дыр')}. ${verdictText(ev)}</p>
  <h2>Что решить и кому</h2>${all.length?`<ol>${all.map(x=>`<li>${SEV_T[x.sev]} <b>${esc(layersLabel(x.layers))}</b> — ${x.t} <i>Решает: ${esc(x.who)}.</i></li>`).join('')}</ol>`:'<p>Замечаний нет.</p>'}
  <h2>Слои</h2><table><thead><tr><th scope="col">Слой</th><th scope="col">Итог</th><th scope="col">Кто закрывает</th><th scope="col">Почему такой итог</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Как считали</h2><p>Итог слоя — худшее из уверенности выбранных позиций, заявок без позиции в каталоге (не выше ◐) и замечаний правил; слой без позиций, нарушенное требование или известная дыра — ✖. Правила взяты из требований карты; отметки ⚠ — проверки, на итог не влияют.${Object.keys(S.asm.res).length?' Часть известных пробелов отмечена закрытыми вручную — это видно в строках слоёв.':''}</p>
  <p class="meta">Ссылка на эту сборку: <a href="${esc(location.href)}">${esc(shortHref())}</a></p></div>`;
}
/* ---- «если уйдёт» ---- */
function openStress(party){
 const d=stressData(party),c0=d.before.counts,c1=d.after.counts,nm=partyName(party),worse=d.rows.filter(r=>r.worse);
 $('#st-title').textContent='Если уйдёт '+nm+': что сломается и чем заменить';
 let h=`<div class="dcounts"><span>Сейчас: ${stBadgeN('ok',c0.ok)} ${stBadgeN('part',c0.part)} ${stBadgeN('gap',c0.gap)}</span><span>Без ${esc(nm)}: ${stBadgeN('ok',c1.ok)} ${stBadgeN('part',c1.part)} ${stBadgeN('gap',c1.gap)}</span></div>`;
 h+=`<p class="v-sub" style="margin-top:0">${worse.length?`Если уйдёт ${esc(nm)}, хуже ${plural(worse.length,'станет','станут','станут')} ${worse.length} ${plural(worse.length,'слой','слоя','слоёв')}: ${esc(worse.map(r=>codeShort(r.l)).join(', '))}.`:`Если уйдёт ${esc(nm)}, ни один слой не станет хуже.`}</p>`;
 d.rows.forEach(r=>{
  h+=`<div class="dl"><h3><span class="code" style="background:${D.G[r.l.g].c}">${esc(codeLabel(r.l))}</span>${esc(r.l.n)} ${stBadge(r.before)} → ${stBadge(r.after)}</h3>`;
  if(r.lost.length)h+=`<p class="role" style="font-size:12.5px;margin-top:4px">Уходит: ${esc(r.lost.map(o=>o.kind==='claim'?o.n:o.short).join(', '))}</p>`;
  if(r.alts.length)h+=`<div class="alt"><span>Чем заменить:</span>${r.alts.map(p=>`<button type="button" class="btn sm" data-act="replace" data-p="${esc(party)}" data-id="${esc(p.id)}"><span class="dot" style="background:${CONF_C[p.c]}" aria-hidden="true"></span>${CONF_T[p.c].split(' ')[0]} ${esc(p.short)}${normCo(p.co)?' · '+esc(normCo(p.co)):''}<span class="sr"> — ${CONF_T[p.c]}</span></button>`).join('')}</div>`;
  else if(r.worse)h+='<p class="empty">Замены в каталоге этого рынка нет.</p>';
  h+='</div>';
 });
 $('#st-body').innerHTML=h;
 const dl=$('#dlg-st');if(!dl.open)dl.showModal();
}

'use strict';
/* Конструктор ИИ-трансформации · версия 2 — вкладки «Проекты», «Таблица», «Люди», панель управления, паспорт проекта и запуск.
   Сквозной объект экрана — проект: цель → готовность → методика и харнес → слои стека → люди → экономика → пилот и петля → кто решает. */

const srcA=(t,u)=>u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`:esc(t);
const OPEN=new Map();   // раскрытые шаги панели проекта: ключ «проект:шаг» → открыт ли
const layerSort=(a,b)=>{const la=byId(a),lb=byId(b);if(isX(la)!==isX(lb))return isX(la)?1:-1;return isX(la)?ORD(a)-ORD(b):ORD(b)-ORD(a);};
const ARROW_W={'↑↑':'сильно растут','↑':'растут','→':'почти не меняются','↓':'снижаются','↓↓':'сильно снижаются'};

/* ---- готовность проекта ---- */
function rdText(r){
 if(r.st==='ok')return '✓ можно в пилот';
 if(r.st==='unk')return `? нет данных · ${r.steps.length} ${plural(r.steps.length,'вопрос','вопроса','вопросов')}`;
 const more=r.steps.length-1;
 return `${r.st==='gap'?'✖':'◐'} сначала: ${r.first.sh}${more>0?` · ещё ${more}`:''}`;
}
const rdBadge=r=>`<span class="st ${r.st}">${esc(rdText(r))}</span>`;
const stepBadge=st=>({gap:'<span class="st gap">✖ сначала</span>',part:'<span class="st part">◐ до пилота</span>',unk:'<span class="st unk">? уточнить</span>'})[st]||'';
function miniCounts(c,n){const g=plural(c.gap,'дыра','дыры','дыр');return `<span class="mini"><span class="sr">Слои стека под проект: </span><span class="st ok" title="закрыто">✓ ${c.ok}<span class="sr"> закрыто</span></span><span class="st part" title="частично">◐ ${c.part}<span class="sr"> частично</span></span><span class="st gap" title="${g}">✖ ${c.gap}<span class="sr"> ${g}</span></span>${n?` из ${n}`:''}</span>`;}
const roleName=k=>S.prof==='kii'&&ROLE[k].nowKii?ROLE[k].nowKii:ROLE[k].now;
const legendProjHTML=()=>`<div class="legend"><span class="i"><b>Готовность:</b></span><span class="i"><span class="st ok">✓ можно в пилот</span></span><span class="i"><span class="st part">◐ сначала подготовка</span></span><span class="i"><span class="st gap">✖ сначала основа для проверки</span></span><span class="i"><span class="st unk">? нет данных</span></span><span class="i"><b>Стек под проект</b> в текущей сборке: ✓ закрыто · ◐ частично · ✖ дыра</span></div>`;

/* ---- «ради чего» и итог по проектам: первый круг чтения ---- */
function goalHTML(E){
 const sc=SCALES[S.prof],x3=E.all.lay.x3;
 let al;
 if(x3.st==='gap')al=`<div class="alert gap" role="note"><b>✖ Мерить эффект пока нечем:</b> в сборке нет независимой оценки агентов (С3 «Оценка и бенчмарки»). Без неё заказчику нечем доказать «правильно, дёшево, быстро». <button type="button" class="lnk" data-act="goto" data-l="x3">Открыть С3</button><span class="who">Решает: владелец сборки — пятый участник или своя разработка.</span></div>`;
 else if(x3.st==='part'){const f=x3.f.slice().sort(bySev).find(x=>x.sev!=='info');al=`<div class="alert part" role="note"><b>◐ Оценка эффекта — частично:</b> ${f?f.t:'уверенность позиций не подтверждена.'} <button type="button" class="lnk" data-act="goto" data-l="x3">Открыть С3</button>${f?`<span class="who">Решает: ${esc(f.who)}</span>`:''}</div>`;}
 else al='<div class="alert ok" role="note"><b>✓ Оценка эффекта в сборке есть:</b> независимая оценка агентов (С3) закрыта.</div>';
 return `<section class="goal" aria-labelledby="goal-k"><h2 class="v-kicker" id="goal-k">Ради чего · ${esc(sc.n)}</h2>
  <p class="gt">${esc(sc.goal)}</p>
  <div class="params">${PARAMS.map(p=>`<div class="prm"><b>${esc(p.n)}</b>${esc(p.d)}</div>`).join('')}</div>
  <p class="anch"><b>Ориентиры:</b> ${sc.anchors.map(a=>`${esc(a[0])} (${srcA(a[2],a[1])})`).join(' · ')}</p>
  <p class="gnote">${esc(sc.goalNote)}</p>${al}</section>`;
}
function decideList(E,ps){
 const need=[...new Set(ps.flatMap(needOf))],ord=orderedProjects().map(p=>p.id);
 const eng=topList(E.all,need).map(x=>({sev:x.sev,pr:prioOf(x),html:`<button type="button" class="lnk" data-act="goto" data-l="${x.layers[0]}">${esc(layersLabel(x.layers))}</button> — ${x.t}`,who:x.who}));
 const pg=ps.map(p=>({p,r:readiness(p)})).filter(x=>x.r.st==='gap').sort((a,b)=>ord.indexOf(a.p.id)-ord.indexOf(b.p.id))
  .map(({p,r})=>({sev:'gap',pr:1.5,html:`<button type="button" class="lnk" data-act="proj" data-p="${p.id}" data-src="dl">${esc(p.code)} · ${esc(p.n)}</button> — ${esc(r.first.t)}`,who:p.who}));
 const uq=ps.filter(p=>readiness(p).steps.some(x=>x.st==='unk'));
 if(uq.length){
  const q=uq.reduce((a,p)=>a+readiness(p).steps.filter(x=>x.st==='unk').length,0);
  const links=uq.slice(0,6).map(p=>`<button type="button" class="lnk" data-act="proj" data-p="${p.id}" data-src="dlq">${esc(p.code)}</button>`).join(', ')+(uq.length>6?' и другие':'');
  pg.push({sev:'unk',pr:1.8,html:`${q} ${plural(q,'вопрос','вопроса','вопросов')} к ${S.prof==='kii'?'участникам пилотов':'банку'} по ${uq.length} ${plural(uq.length,'проекту','проектам','проектам')}: без ответов готовность не видна. Вопросы — в панелях проектов и в паспортах (${links}).`,who:'тот, кто ведёт разговор с заказчиком'});
 }
 return eng.concat(pg).sort((a,b)=>a.pr-b.pr);
}
const decideLI=x=>`<li>${sevBadge(x.sev)}<div>${x.html}<span class="who">Решает: ${esc(x.who)}</span></div></li>`;
function projVerdictHTML(E,ps){
 const n={ok:0,part:0,gap:0,unk:0};ps.forEach(p=>n[readiness(p).st]++);
 const top=decideList(E,ps),more=top.length-3,sc=SCALES[S.prof],ok=ps.filter(p=>readiness(p).st==='ok');
 const okT=ok.length?`${plural(ok.length,'Готов','Готовы','Готовы')} к пилоту по профилю: ${ok.map(p=>esc(p.code)+(p.start?' ('+esc(p.start)+')':'')).join(', ')}.`
  :S.prof==='kii'?'Маяки и программы — предложение стратегии: готовность выясняется с участниками пилотов.':'По открытым данным ни один проект не готов к пилоту без подготовки или уточнений.';
 return `<div class="verdict"><div>
  <h2 class="v-kicker">Итог по проектам · ${esc(sc.n)}</h2>
  <div class="big">${n.ok} <small>из ${ps.length} ${plural(ps.length,'проекта','проектов','проектов')} ${plural(n.ok,'готов','готовы','готовы')} к пилоту</small></div>
  <div class="counts"><span class="st ok">✓ ${n.ok} можно в пилот</span><span class="st part">◐ ${n.part} после подготовки</span><span class="st gap">✖ ${n.gap} сначала основа: тесты, эталон, свойства или лимиты</span><span class="st unk">? ${n.unk} нет данных</span></div>
  <p class="v-sub">${okT} Значение профиля задано, только если у него есть основание в источнике; «нет данных» — вопрос к заказчику, а не ноль.</p>
 </div><div>
  <h3 class="v-kicker">Решить первым</h3>
  ${top.length?`<ol class="todo">${top.slice(0,3).map(decideLI).join('')}</ol>${more>0?`<p class="more-n">Ещё ${more} ${plural(more,'замечание','замечания','замечаний')} — в панелях проектов, во вкладке «Стек» и в паспорте.</p>`:''}`:'<p class="v-sub">Замечаний нет.</p>'}
 </div></div>`;
}

/* ---- портфель: карточки проектов ---- */
function pcardHTML(p,E){
 const r=readiness(p),ev=evFor(E,p),need=needOf(p),on=S.pj===p.id;
 return `<button type="button" class="pcard" data-act="proj" data-p="${p.id}" data-src="card" aria-pressed="${on}">
  <span class="pc-top"><span class="pcode">${esc(p.code)}</span><span class="pcls">${esc(CLS[p.cls].n)}</span>${p.entry?`<span class="pill entry" title="гипотеза команды о приоритете входа">вход для Veai №${p.entry} · гипотеза</span>`:''}</span>
  <span class="pn">${esc(p.n)}</span>
  <span class="pst">${esc(p.state)}</span>
  <span class="pgl"><b>Ради чего:</b> ${esc(p.goal.t)}</span>
  <span class="pft">${rdBadge(r)}${miniCounts(cntOf(ev,need),need.length)}</span>
 </button>`;
}
function addFormHTML(){
 return `<form class="addp" data-form="add"><label class="fld" for="np-n">Свой проект</label><input id="np-n" name="project" type="text" maxlength="80" placeholder="например, перенос отчётности с Oracle…" autocomplete="off"><label class="sr" for="np-c">Класс проекта</label><select id="np-c">${CLS_ORDER.map(k=>`<option value="${k}">${esc(CLS[k].n)} — ${esc(CLS[k].d)}</option>`).join('')}</select><button type="submit" class="btn sm">Добавить</button></form>`;
}
function portfolioHTML(E,ps){
 const groups=SCALES[S.prof].groups.concat([['own','Свои проекты']]);
 let h='',first=true;
 groups.forEach(([g,t])=>{const gp=ps.filter(p=>p.grp===g);if(!gp.length)return;
  h+=`<h3 class="grp-h${first?' first':''}">${esc(t)} <span>${gp.length}</span></h3><div class="pcards">${gp.map(p=>pcardHTML(p,E)).join('')}</div>`;first=false;});
 return legendProjHTML()+h+addFormHTML();
}

/* ---- панель проекта: путь от цели до петли (вариант C) ---- */
function stepHTML(pid,k,n,title,badge,sum,body,dflt){
 const key=pid+':'+k,open=OPEN.has(key)?OPEN.get(key):!!dflt;
 return `<details class="stp" data-k="${esc(key)}"${open?' open':''}><summary><span class="sn" aria-hidden="true">${n}</span><span class="stt">${esc(title)}</span>${badge||'<span></span>'}<span class="ssum">${sum}</span></summary><div class="sb">${body}</div></details>`;
}
function harnessStep(p,ev){
 const C=CLS[p.cls];
 if(p.cls==='infra'){
  const ids=['m5','m4','f3','f2','f1'],w=ids.reduce((a,id)=>Math.max(a,W[ev.lay[id].st]),0),st=['ok','part','gap'][w];
  const rows=ids.map(id=>{const l=byId(id),L=ev.lay[id];return `<div class="lrow"><button type="button" class="lnk" data-act="goto" data-l="${id}"><span class="code" style="background:${D.G[l.g].c}">${esc(l.code)}</span> ${esc(l.n)}</button><span class="chips">${chipsHTML(L.opts,2)}</span>${stBadge(L.st)}</div>`;}).join('');
  const body=`<p>Агенты разработки и процессов делят одни мощности и один шлюз к моделям.</p><h3>Этажи 1–5 в текущей сборке</h3>${rows}<h3>Настройка под сценарии</h3><ul><li><b>Порядок:</b> ${esc(C.method)}</li><li><b>Правила:</b> ${esc(C.rules.join('; '))}</li><li><b>Учёт:</b> ${esc(C.ctx.join('; '))}</li></ul>`;
  return stepHTML(p.id,'h',3,'Фундамент: вычисления и модели',stBadge(st),'этажи 1–5 · квоты и учёт токенов по сценариям',body);
 }
 const hl=byId(C.h),hL=ev.lay[C.h];
 const T={code:['Харнес под проект','Харнес — рабочее место агента-разработчика: связка модели, инструментов, правил и песочницы. Шаблон жёсткий и одинаковый для всех проектов, а настройка — под проект.','Шаблон харнеса · этаж 10 карты'],
  proc:['Агентная платформа под процесс','Агент в процессе работает на агентной платформе: у каждого агента лимит времени и бюджета, контракт инструментов и маршрут эскалации к человеку.','Возможности платформы · этаж 9 карты'],
  govern:['Управление автономией агентов','Автономия выдаётся классами решений и расширяется только по данным журнала; у каждого действия есть основание и ответственный человек.','Что входит · С1 карты']};
 const t=p.cls==='govern'?T.govern:C.dims==='code'?T.code:T.proc;
 let body=`<p>${t[1]}</p><h3>${t[2]}</h3><div class="chips">${hl.c.map(c=>`<span class="chip tpl" title="${esc(c[1])}">${esc(c[0])}</span>`).join('')}</div>
  <h3>Настройка под этот проект</h3><ul><li><b>Методика:</b> ${esc(C.method)}</li>${C.skills.length?`<li><b>Навыки:</b> ${esc(C.skills.join('; '))}</li>`:''}<li><b>Правила:</b> ${esc(C.rules.join('; '))}</li><li><b>Контекст:</b> ${esc(C.ctx.join('; '))}</li></ul>
  <h3>Кто закрывает в сборке</h3><div class="lrow"><button type="button" class="lnk" data-act="goto" data-l="${hl.id}">${esc(codeLabel(hl))} · ${esc(hl.n)}</button><span class="chips">${chipsHTML(hL.opts,3)}</span>${stBadge(hL.st)}</div>`;
 if(p.cls==='migrate')body+=`<p class="pk">Старым системам нужны адаптеры унаследованных систем — этаж 8 «Интеграции»: ${stBadge(ev.lay.k8.st)}</p>`;
 if(p.cls==='prove')body+='<p class="pk">В карте нет отдельного слоя «доказательная проверка»: ближе всего С2 «Безопасность», С3 «Оценка» и навыки харнеса.</p>';
 const sum=C.dims==='code'?`шаблон из ${hl.c.length} частей + настройка: методика, навыки, правила, контекст`:p.cls==='govern'?'реестр агентов, классы решений, лимиты, аудит':'платформа агентов + регламент, права и лимиты';
 return stepHTML(p.id,'h',3,t[0],stBadge(hL.st),sum,body);
}
function projPanelHTML(p,E){
 const r=readiness(p),ev=evFor(E,p),need=needOf(p).slice().sort(layerSort),c=cntOf(ev,need),C=CLS[p.cls],E6=ECON[p.cls],pr=profOf(p),ed=pfEdited(p);
 let h=`<div class="p-head"><span class="code" style="background:#1f2430">${esc(p.code)}</span><h2 tabindex="-1">${esc(p.n)}</h2></div>
  <p class="p-meta"><span class="pcls">${esc(C.n)}</span>${esc(C.d)} · <span><b>Уверенность:</b> ${esc(p.conf)}</span>${p.entry?`<span class="pill entry" title="гипотеза команды о приоритете входа">вход для Veai №${p.entry} · гипотеза</span>`:''}</p>
  <p class="p-one"><b>Состояние:</b> ${esc(p.state)}${p.start?' · '+esc(p.start):''}</p>
  <div class="goalbox"><b>Ради чего:</b> ${esc(p.goal.t)}. <b>Метрика пилота:</b> ${esc(p.goal.m)}.${p.goal.base?` <span class="base">База: ${esc(p.goal.base)}.</span>`:''}</div>
  <div class="path">`;
 // 1 · методика
 h+=stepHTML(p.id,'m',1,'Методика на старте','',`методика: ${esc(C.method)}`,
  `<p>Методику выбирают при запуске проекта — от неё зависит, как собирается харнес.</p><p><b>Методика:</b> ${esc(C.method)}.</p><p>У каждого сценария — владелец, метрика эффекта и класс риска; масштабирование — только по доказанному на пилоте эффекту (требование этажа 12).</p><p><b>Метрика пилота:</b> ${esc(p.goal.m)}.</p>`);
 // 2 · готовность и подготовка
 const what=C.dims==='code'?'коде':C.dims==='infra'?'мощностях':'процессе';
 const dims=dimsOf(p).map(d=>`<div class="dim"><span class="dn" id="dn-${p.id}-${d.k}">${esc(d.n)}${pfBasis(p,d.k)?`<span class="dh">гипотеза: ${esc(pfBasis(p,d.k))}</span>`:''}</span><span class="seg dimseg" role="group" aria-labelledby="dn-${p.id}-${d.k}">${d.o.map(([v,t])=>`<button type="button" data-act="pf" data-p="${p.id}" data-k="${d.k}" data-v="${v}" aria-pressed="${pr[d.k]===v}">${esc(t)}</button>`).join('')}</span></div>`).join('');
 const note=`<p class="pfnote">${p.custom?'Свой проект: профиль заполняется вместе с заказчиком.':ed?'Профиль изменён и отличается от гипотезы команды.':'Значение задано, только если у него есть основание в источнике; остальное — «нет данных». Поправьте профиль по данным заказчика.'}${ed?` <button type="button" class="btn sm" data-act="pf-reset" data-p="${p.id}">Вернуть исходный профиль</button>`:''}</p>`;
 const steps=r.steps.length?`<ul class="finds">${r.steps.map(x=>`<li>${stepBadge(x.st)}<div>${esc(x.t)}</div></li>`).join('')}</ul>`:'<p class="empty">Подготовка не нужна: можно в пилот.</p>';
 const metr=C.dims==='code'&&p.cls!=='create'?`<p class="pk">На зрелом коде без подготовки выигрыша может не быть: в эксперименте METR опытные разработчики на своих проектах с ИИ работали на 19 % медленнее (${srcA('METR, 10.07.2025','https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/')}).</p>`:'';
 const nw=r.steps.filter(x=>x.st!=='unk').length,nq=r.steps.length-nw;
 const sum2=r.steps.length?[nw?`${nw} ${plural(nw,'шаг','шага','шагов')} подготовки`:'',nq?`${nq} ${plural(nq,'вопрос','вопроса','вопросов')} к заказчику`:''].filter(Boolean).join(' · '):'подготовка не нужна';
 h+=stepHTML(p.id,'r',2,'Готовность и подготовка',rdBadge(r),sum2,`<h3>Что известно о ${what}</h3><div class="dims">${dims}</div>${note}<h3>Что сделать до пилота</h3>${steps}${metr}`,true);
 // 3 · харнес, платформа или фундамент
 h+=harnessStep(p,ev);
 // 4 · слои стека
 const rows=need.map(id=>{const l=byId(id),L=ev.lay[id];return `<div class="lrow"><button type="button" class="lnk" data-act="goto" data-l="${id}"><span class="code" style="background:${D.G[l.g].c}">${esc(l.code)}</span> ${esc(l.n)}</button><span class="chips">${chipsHTML(L.opts,2)}</span>${stBadge(L.st)}</div>`;}).join('');
 const tl=projTop(ev,p);
 h+=stepHTML(p.id,'l',4,'Слои стека под проект','',`нужно ${need.length} из ${D.L.length}: ${miniCounts(c)}`,
  `<p>Нужно ${need.length} из ${D.L.length} слоёв — по шагам карты «С чего начинать сборку». Итог — для текущей сборки: ${esc(asmName())}.</p>${rows}${tl.length?`<h3>Решить первым по слоям</h3><ol class="todo">${tl.slice(0,3).map(todoLI).join('')}</ol>`:''}`);
 // 5 · люди
 const rk=p.roles||C.roles;
 const rt=rk.length?`<table class="rt"><thead><tr><th scope="col">Роль сейчас</th><th scope="col">С агентами</th><th scope="col">Что нужно</th></tr></thead><tbody>${rk.map(k=>{const x=ROLE[k];return `<tr><th scope="row">${esc(roleName(k))}</th><td data-col="С агентами">${esc(x.then)}</td><td data-col="Что нужно">${esc(x.need)}</td></tr>`;}).join('')}</tbody></table>`:'';
 h+=stepHTML(p.id,'p',5,'Люди','',esc(rk.map(roleName).join(' · ')||'нет данных'),
  `${p.people?`<p>${esc(p.people)}</p>`:''}${rt}<p class="pk"><button type="button" class="lnk" data-act="view" data-v="people">Все роли, фазы и опорные цифры — вкладка «Люди»</button></p>`);
 // 6 · экономика перехода
 const eco=`<div class="eco">${ECON_PH.map((ph,i)=>`<div><b aria-hidden="true">${E6.ph[i]}</b>${ph}<span class="sr"> — затраты ${ARROW_W[E6.ph[i]]}</span></div>`).join('')}</div>`;
 const vtbF=S.prof==='vtb'?` Фильтр банка: ${esc(SCALES.vtb.anchors[1][0])} (${srcA(SCALES.vtb.anchors[1][2],SCALES.vtb.anchors[1][1])}).`:'';
 h+=stepHTML(p.id,'e',6,'Экономика перехода','',esc(ECON_PH.map((ph,i)=>ph.toLowerCase()+' '+E6.ph[i]).join(' · '))+' — сначала затраты растут',
  `${eco}<p><b>Главные затраты:</b> ${esc(E6.spend)}.</p><p><b>Где экономия:</b> ${esc(E6.save)}.</p><p><b>Коридор бюджета</b> держат квоты шлюза — «бюджет на задачу, команду, подразделение» (этаж 5) ${stBadge(ev.lay.m5.st)} — и учёт GPU-часов и токенов по сценариям (С4) ${stBadge(ev.lay.x4.st)}.</p><p class="pk">${esc(TOKENS_NOTE[0])} (${srcA(TOKENS_NOTE[2],TOKENS_NOTE[1])}).${vtbF}</p><p class="pk">Цифр затрат нет: источников для оценки нет, их вносит заказчик.</p>`);
 // 7 · пилот и петля улучшения
 const x3=ev.lay.x3,b7=x3.st==='gap'?'<span class="st gap">✖ мерить нечем</span>':x3.st==='part'?'<span class="st part">◐ оценка частично</span>':'<span class="st ok">✓ оценка есть</span>';
 const s7=x3.st==='gap'?'нет независимой оценки агентов (С3): эффект пилота нечем доказать':x3.st==='part'?'оценка эффекта (С3) закрыта частично':'оценка эффекта в сборке есть';
 const pt=`<table class="rt"><thead><tr><th scope="col">Показатель</th><th scope="col">Что мерить</th><th scope="col">Где меряется</th></tr></thead><tbody>${PARAMS.map(pm=>`<tr><th scope="row">${esc(pm.n)}</th><td data-col="Что мерить">${esc(pm.d)}</td><td data-col="Где меряется">${pm.ls.map(id=>`<button type="button" class="lnk" data-act="goto" data-l="${id}">${esc(codeShort(byId(id)))}</button> ${stBadge(ev.lay[id].st)}`).join(' ')}</td></tr>`).join('')}</tbody></table>`;
 h+=stepHTML(p.id,'q',7,'Пилот и петля улучшения',b7,s7,
  `<p><b>Метрика пилота:</b> ${esc(p.goal.m)}. Пилот — около 90 дней на 2–3 командах или одном контуре, с замером «до и после».</p>${pt}<p class="pk"><b>Петля улучшения:</b> журнал → разбор → новые правила и навыки (С4). Если ошибка повторяется, правят харнес — продуктовый контур — или процесс и обучение людей — внутренний контур.</p>`);
 h+='</div>';
 if(p.veai)h+=`<p class="veai"><span class="pill we">Veai · мы</span> ${esc(p.veai)}</p>`;
 const sk=p.id+':src';
 h+=`<details class="comp" data-k="${esc(sk)}"${OPEN.get(sk)?' open':''}><summary>Что известно и источники${p.src.length?' · '+p.src.length:''}</summary>${p.what?`<p class="pk">${esc(p.what)}</p>`:''}${p.hyp?`<p class="pk"><b>Гипотеза команды:</b> ${esc(p.hyp)}</p>`:''}${p.src.length?`<ul class="srcl">${p.src.map(s=>`<li>${srcA(s[0],s[1])} · ${esc(s[2])} · <span class="conf">${SRC_T[s[3]]||''}</span></li>`).join('')}</ul>`:'<p class="empty">Источников нет — свой проект.</p>'}</details>`;
 h+=`<p class="p-who"><b>Решает:</b> ${esc(p.who)}</p>`;
 if(p.custom)h+=`<p class="pk"><button type="button" class="btn sm" data-act="del-proj" data-p="${p.id}">Удалить свой проект</button></p>`;
 return h;
}
function renderProjects(E){
 const ps=orderedProjects();
 if(!projById(S.pj))S.pj=firstProj();
 const p=projById(S.pj);
 $('#view-projects').innerHTML=goalHTML(E)+projVerdictHTML(E,ps)+`<div class="work"><div class="box"><h2>Проекты · ${esc(SCALES[S.prof].n)}</h2><p class="sub">Нажмите на проект — справа откроется путь: цель, готовность, харнес, слои стека, люди, экономика и замер эффекта.</p>${portfolioHTML(E,ps)}</div><aside class="box panel" id="ppanel" aria-label="Выбранный проект">${p?projPanelHTML(p,E):'<p class="empty">Проектов нет.</p>'}</aside></div>`;
}

/* ---- вкладка «Таблица»: проекты × что нужно (вариант B) и слои × проекты ---- */
function renderTable(E){
 const ps=orderedProjects(),sc=SCALES[S.prof],groups=sc.groups.concat([['own','Свои проекты']]);
 let h=`<h2 class="vh">Что нужно каждому проекту, чтобы агенты дали результат?</h2><p class="vsub">${esc(sc.n)} · ${ps.length} ${plural(ps.length,'проект','проекта','проектов')} · профиль — гипотеза команды · стек — сборка «${esc(asmName())}». Нажмите на проект, чтобы открыть его путь.</p>`;
 h+=`<div class="cmp-wrap"><table class="cmp mtx"><caption class="sr">Проекты и что им нужно</caption><thead><tr><th class="ln" scope="col">Проект</th><th scope="col">Ради чего · метрика</th><th scope="col">Готовность → первый шаг</th><th scope="col">Методика и навыки харнеса</th><th scope="col">Стек под проект</th><th scope="col">Люди</th><th scope="col">Решить первым</th></tr></thead><tbody>`;
 groups.forEach(([g,t])=>{const gp=ps.filter(p=>p.grp===g);if(!gp.length)return;
  h+=`<tr class="gh"><th colspan="7" scope="colgroup">${esc(t)} · ${gp.length}</th></tr>`;
  gp.forEach(p=>{
   const r=readiness(p),ev=evFor(E,p),need=needOf(p),C=CLS[p.cls],top=projTop(ev,p)[0],rk=(p.roles||C.roles)[0];
   const first=r.st==='gap'?{t:r.first.t,who:p.who}:top?{t:layersLabel(top.layers)+' — '+plain(top.t),who:top.who}:null;
   h+=`<tr><th scope="row"><button type="button" class="lnk" data-act="proj" data-p="${p.id}" data-src="tbl">${esc(p.code)} · ${esc(p.n)}</button><span class="tsub">${esc(C.n)}</span></th>
    <td data-col="Ради чего · метрика">${esc(p.goal.t)}<span class="tsub">${esc(p.goal.m)}</span></td>
    <td data-col="Готовность → первый шаг">${rdBadge(r)}${r.first?`<span class="tsub">${esc(r.first.t)}</span>`:''}</td>
    <td data-col="Методика и навыки харнеса">${esc(C.method)}${C.skills.length?`<span class="tsub">${esc(C.skills.join('; '))}</span>`:''}</td>
    <td data-col="Стек под проект">${miniCounts(cntOf(ev,need),need.length)}</td>
    <td data-col="Люди">${rk?`<b>${esc(roleName(rk))}</b> — ${esc(ROLE[rk].then)}`:'нет данных'}</td>
    <td data-col="Решить первым">${first?`${esc(first.t)}<span class="tsub">Решает: ${esc(first.who)}</span>`:'замечаний нет'}</td></tr>`;
  });
 });
 h+='</tbody></table></div>';
 const N=needCounts();
 h+=`<h2 class="vh">Слои × проекты: какие слои нужны чаще всего</h2><p class="vsub">Значок в клетке — слой нужен проекту, и это его итог в текущей сборке; точка — слой проекту не нужен. У проектов разработки и процессов итог одного слоя может различаться: пробелы «агентов в процессах» не влияют на разработку, а условие «стык со „Сферой“» — на процессы. Слой, нужный многим проектам и закрытый не полностью, — первый кандидат на решение.</p>`;
 h+=`<div class="hm-wrap"><table class="hm"><caption class="sr">Какие слои стека нужны каким проектам</caption><thead><tr><th class="ln" scope="col">Слой</th><th scope="col">Нужен</th>${ps.map(p=>`<th scope="col"><button type="button" class="lnk" data-act="proj" data-p="${p.id}" data-src="hm" title="${esc(p.n)}">${esc(p.code)}</button></th>`).join('')}</tr></thead><tbody>`;
 [...FLOORS(),...CROSS()].forEach(l=>{
  h+=`<tr><th class="ln" scope="row"><button type="button" class="lnk" data-act="goto" data-l="${l.id}"><span class="code" style="background:${D.G[l.g].c}">${esc(l.code)}</span> ${esc(l.n)}</button></th><td class="ncell">${N.nc[l.id]} из ${N.n}</td>${ps.map(p=>{
   if(!needOf(p).includes(l.id))return '<td class="hc no"><span aria-hidden="true">·</span><span class="sr">не нужен</span></td>';
   const st=evFor(E,p).lay[l.id].st;
   return `<td class="hc ${st}" title="${esc(p.code)}: ${ST_T[st]}"><span aria-hidden="true">${ST_T[st].split(' ')[0]}</span><span class="sr">${esc(p.code)}: нужен, ${ST_T[st]}</span></td>`;
  }).join('')}</tr>`;
 });
 $('#view-table').innerHTML=h+'</tbody></table></div>';
}

/* ---- вкладка «Люди»: что происходит с людьми при ИИ-трансформации ---- */
function renderPeople(E){
 const sc=SCALES[S.prof],ps=orderedProjects(),roleProj={};
 ps.forEach(p=>(p.roles||CLS[p.cls].roles).forEach(k=>(roleProj[k]=roleProj[k]||[]).push(p)));
 const roles=ROLE_ORDER.filter(k=>roleProj[k]),nr=NEWROLES.filter(r=>!r.sc||r.sc===S.prof);
 const facts=sc.people.concat(PEOPLE_GLOBAL);
 let h=`<div class="verdict"><div><h2 class="v-kicker">Люди при ИИ-трансформации · ${esc(sc.n)}</h2><p class="bigt">Сначала меняется работа, потом штат</p>
  <p class="v-sub">Агенты берут рутинный код, регресс и типовые обращения. Растут ревью, постановка задач агенту и проверка эталона. Решения о штате — только по замеренному эффекту: публичных подтверждений денежной экономии от агентов в разработке пока нет.</p></div>
  <div><h3 class="v-kicker">Опорные цифры</h3><ul class="facts">${facts.map(f=>`<li>${esc(f[0])}<span class="src">${srcA(f[2],f[1])}</span></li>`).join('')}</ul></div></div>`;
 h+=`<h2 class="vh">Что происходит с людьми по фазам</h2><p class="vsub">Рядом с фазой — направление затрат: сначала они растут, потом падают, как в инвестиционном проекте.</p><div class="phases">${sc.phases.map(ph=>`<div class="phase"><h3>${esc(ph[0])}<span>затраты ${esc(ph[1])}<span class="sr"> — ${ARROW_W[ph[1]]||''}</span></span></h3><p>${esc(ph[2])}</p></div>`).join('')}</div>`;
 h+=`<div class="col"><div class="box"><h2>Переучить и перераспределить: как меняется работа</h2><p class="sub">Роли, которые затрагивают проекты масштаба «${esc(sc.n)}». Время, которое освобождают агенты, уходит в ревью, постановку задач и проверку результата.</p>
  <table class="rt"><thead><tr><th scope="col">Роль сейчас</th><th scope="col">С агентами</th><th scope="col">Что нужно</th><th scope="col">Когда</th><th scope="col">Проекты</th></tr></thead><tbody>${roles.map(k=>{const r=ROLE[k];return `<tr><th scope="row">${esc(roleName(k))}</th><td data-col="С агентами">${esc(r.then)}</td><td data-col="Что нужно">${esc(r.need)}</td><td data-col="Когда">${esc(r.ph)}</td><td data-col="Проекты">${roleProj[k].map(p=>`<button type="button" class="lnk" data-act="proj" data-p="${p.id}" data-src="ppl-${k}" title="${esc(p.n)}">${esc(p.code)}</button>`).join(', ')}</td></tr>`;}).join('')}</tbody></table></div>`;
 const vtb=S.prof==='vtb';
 const measure=['доля изменений, принятых без переделки, — по командам и проектам',
  'время ревью и его доля в рабочем времени'+(vtb?' — сейчас до 20 % по оценке вендора «Сферы»':''),
  'время, за которое новичок выходит на самостоятельные задачи',
  'удержание экспертов старого стека до конца переноса',
  'доля сотрудников, прошедших обучение работе с агентами',
  'в процессах — часы обслуживания и доля обращений без оператора'];
 const nope=['«Сократим штат на N %» — публичных подтверждений нет: '+(vtb?'у Т1 денежной экономии от пилота агентов пока нет, ':'')+'по данным DX реальный прирост производительности — около 10 %.',
  '«Агенты заменят начинающих» — без входа в профессию не вырастут будущие опытные разработчики; в США занятость разработчиков 22–25 лет уже падает.',
  '«Эффект сразу» — сначала затраты растут: подготовка, пилот, обучение.'];
 const who=vtb?'Владелец сценария и руководитель подразделения — по замеру пилота; служба персонала — план переобучения. Решения о составе команд — не раньше тиража и только по замеренному эффекту.'
  :'Каждый субъект КИИ — по своим замерам. Оператор программы обучает команды, ведёт библиотеку отраслевых решений и собирает редкие роли — оценку агентов и формальную верификацию.';
 h+=`<div class="two"><div class="box"><h2>Нанять точечно: новые роли</h2><p class="sub">Каждая роль отвечает за слой стека; рядом — итог этого слоя в текущей сборке.</p><ul class="nr">${nr.map(r=>`<li><div><b>${esc(S.prof==='kii'&&r.nKii?r.nKii:r.n)}</b>${esc(r.d)}</div><div><button type="button" class="lnk" data-act="goto" data-l="${r.l}">${esc(codeShort(byId(r.l)))}</button> ${stBadge(E.all.lay[r.l].st)}</div></li>`).join('')}</ul></div>
  <div class="box"><h2>Управлять: что мерить и чего не обещать</h2>
   <h3 class="bh">Что мерить</h3><ul class="plist">${measure.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
   <h3 class="bh">Чего не обещать</h3><ul class="plist">${nope.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
   <h3 class="bh">Кто решает о штате</h3><p class="pk">${esc(who)}</p></div></div></div>`;
 $('#view-people').innerHTML=h;
}

/* ---- паспорт проекта: то же в окне и при печати ---- */
function projPassportHTML(p,E){
 if(!p)return '<p>Проект не выбран.</p>';
 const r=readiness(p),ev=evFor(E,p),need=needOf(p).slice().sort(layerSort),c=cntOf(ev,need),C=CLS[p.cls],E6=ECON[p.cls],sc=SCALES[S.prof],pr=profOf(p);
 const rows=need.map(id=>{const l=byId(id),L=ev.lay[id];return `<tr><td><b>${esc(codeLabel(l))}</b> · ${esc(l.n)}</td><td>${stBadge(L.st)}</td><td>${L.opts.length?L.opts.map(ppOpt).join('<br>'):'нет позиции'}</td><td>${L.f.length?L.f.slice().sort(bySev).map(f=>`${SEV_T[f.sev]} ${f.t}`).join('<br>'):'замечаний нет'}</td></tr>`;}).join('');
 const decide=r.steps.filter(x=>x.st!=='unk').map(x=>({sev:x.st,t:esc(x.t),who:p.who})).concat(projTop(ev,p).map(x=>({sev:x.sev,t:`<b>${esc(layersLabel(x.layers))}</b> — ${x.t}`,who:x.who})));
 const ask=r.steps.filter(x=>x.st==='unk');
 return `<div class="pp"><span class="draft-banner">ЧЕРНОВИК · для внутреннего обсуждения, не для передачи за пределы компании</span>
  <h1 style="margin-top:10px">Паспорт проекта · ${esc(p.code)} ${esc(p.n)}</h1>
  <p class="meta">${esc(sc.n)} · класс: ${esc(C.n)} · уверенность: ${esc(p.conf)} · проекты — срез ${esc(V2_DATE)}, стек — карта The 2026 On-Prem AI Landscape, снимок ${esc(SNAP)} · паспорт сформирован ${esc(ruDate())}</p>
  <h2>Ради чего</h2><p>${esc(p.goal.t)}. Метрика пилота: ${esc(p.goal.m)}.${p.goal.base?' База: '+esc(p.goal.base)+'.':''}</p>
  <h2>Состояние</h2><p>${esc(p.state)}${p.start?' · '+esc(p.start):''}.</p>${p.what?`<p>${esc(p.what)}</p>`:''}${p.hyp?`<p><i>Гипотеза команды:</i> ${esc(p.hyp)}</p>`:''}
  <h2>Готовность · ${esc(rdText(r))}</h2><table><thead><tr><th scope="col">Что известно</th><th scope="col">Значение</th></tr></thead><tbody>${dimsOf(p).map(d=>`<tr><td>${esc(d.n)}</td><td>${esc((d.o.find(x=>x[0]===pr[d.k])||['','нет данных'])[1])}${pfBasis(p,d.k)?` <i>— гипотеза: ${esc(pfBasis(p,d.k))}</i>`:''}</td></tr>`).join('')}</tbody></table>${r.steps.length?`<ol>${r.steps.map(x=>`<li>${({gap:'✖',part:'◐',unk:'?'})[x.st]} ${esc(x.t)}</li>`).join('')}</ol>`:'<p>Подготовка не нужна.</p>'}<p class="meta">${pfEdited(p)?'Профиль изменён относительно гипотезы команды.':'Значение задано, только если у него есть основание в источнике; остальное — «нет данных».'}</p>
  <h2>Методика и харнес</h2><p>Методика: ${esc(C.method)}.</p><ul>${C.skills.length?`<li>Навыки: ${esc(C.skills.join('; '))}</li>`:''}<li>Правила: ${esc(C.rules.join('; '))}</li><li>Контекст: ${esc(C.ctx.join('; '))}</li></ul>
  <h2>Слои стека под проект · ${need.length} из ${D.L.length}: ✓ ${c.ok} · ◐ ${c.part} · ✖ ${c.gap}</h2><p>Сборка: ${esc(asmName())}.</p><table><thead><tr><th scope="col">Слой</th><th scope="col">Итог</th><th scope="col">Кто закрывает</th><th scope="col">Почему такой итог</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Люди</h2>${p.people?`<p>${esc(p.people)}</p>`:''}<ul>${(p.roles||C.roles).map(k=>`<li><b>${esc(roleName(k))}</b> → ${esc(ROLE[k].then)}; нужно: ${esc(ROLE[k].need)}</li>`).join('')}</ul>
  <h2>Экономика перехода</h2><p>${esc(ECON_PH.map((ph,i)=>ph+' '+E6.ph[i]).join(' · '))} — сначала затраты растут. Главные затраты: ${esc(E6.spend)}. Где экономия: ${esc(E6.save)}. Цифр нет — их вносит заказчик.</p>
  <h2>Пилот и петля</h2><p>Метрика пилота: ${esc(p.goal.m)}.</p><ul>${PARAMS.map(pm=>`<li><b>${esc(pm.n)}</b> — ${esc(pm.d)}; где меряется: ${pm.ls.map(id=>esc(codeShort(byId(id)))+' — '+ST_T[ev.lay[id].st]).join(', ')}</li>`).join('')}</ul>
  <h2>Что решить и кому</h2>${decide.length?`<ol>${decide.map(x=>`<li>${SEV_T[x.sev]||''} ${x.t} <i>Решает: ${esc(x.who)}.</i></li>`).join('')}</ol>`:'<p>Замечаний нет.</p>'}
  ${ask.length?`<h2>Спросить у заказчика</h2><ul>${ask.map(x=>`<li>${esc(x.t)}</li>`).join('')}</ul>`:''}
  ${p.veai?`<h2>Где Veai</h2><p>${esc(p.veai)}</p>`:''}
  ${p.src.length?`<h2>Источники</h2><ul>${p.src.map(s=>`<li>${s[1]?`<a href="${esc(s[1])}">${esc(s[0])}</a>`:esc(s[0])} · ${esc(s[2])} · ${SRC_T[s[3]]||''}</li>`).join('')}</ul>`:''}
  <p class="meta">Ссылка на этот проект и сборку: <a href="${esc(location.href)}">${esc(shortHref())}</a></p></div>`;
}
function exportJSON(){
 const E=evPair(),ev=E.all;
 const out={format:'ai-transformation/v2',map:'The 2026 On-Prem AI Landscape',snapshot:SNAP,projectsDate:V2_DATE,scale:SCALES[S.prof].n,assembly:asmName(),preset:S.asm.base,flags:S.flags,link:location.href,
  projects:orderedProjects().map(p=>{const r=readiness(p),e=evFor(E,p),need=needOf(p);return {id:p.id,code:p.code,name:p.n,class:CLS[p.cls].n,group:p.grp,custom:!!p.custom,confidence:p.conf,goal:p.goal.t,metric:p.goal.m,
   readiness:r.st,profile:profOf(p),profileEdited:pfEdited(p),preparation:r.steps.map(x=>({status:x.st,text:x.t})),stack:{needed:need,counts:cntOf(e,need)},decides:p.who,
   sources:p.src.map(s=>({title:s[0],url:s[1]||null,date:s[2],confidence:s[3]}))};}),
  counts:ev.counts,
  layers:D.L.map(l=>({id:l.id,code:l.code,name:l.n,status:ev.lay[l.id].st,
   options:ev.lay[l.id].opts.map(o=>({id:o.id,kind:o.kind,name:o.n,company:o.co||partyName(o.party),confidence:o.kind==='pos'?o.c:null,url:o.u||null})),
   findings:ev.lay[l.id].f.map(f=>({severity:f.sev,rule:f.rule,text:plain(f.t),decides:f.who}))}))};
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));
 a.download='transformation-'+S.prof+'-'+S.asm.base.replace(/[^a-z0-9]+/gi,'-')+(S.asm.edited?'-edited':'')+'.json';
 document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
 toast('Файл с проектами и сборкой скачан.');
}

/* ---- панель управления ---- */
const stackView=()=>S.view==='stack'||S.view==='compare';
function renderBar(){
 const P=PROFILES[S.prof],pa=S.pend.asm&&P.presets.includes(S.pend.asm)?S.pend.asm:S.asm.base;
 $('#bar').innerHTML=`<span class="grp"><span class="fld" id="sc-l">Масштаб</span><span class="seg big" role="group" aria-labelledby="sc-l">${Object.keys(SCALES).map(k=>`<button type="button" data-act="scale" data-sc="${k}" aria-pressed="${S.prof===k}">${esc(SCALES[k].n)}</button>`).join('')}</span></span>
  <span class="grp"><label class="fld" for="sel-asm">Сборка стека</label><select id="sel-asm" data-act="pend">${P.presets.map(pid=>`<option value="${esc(pid)}"${pid===pa?' selected':''}>${esc(presetName(pid,S.prof))}</option>`).join('')}</select><button type="button" class="btn" id="btn-asm" data-act="preset-go"${pa===S.asm.base?' disabled':''}>Загрузить</button></span>
  ${S.asm.edited?'<span class="edited">сборка изменена</span>':''}
  ${P.mk==='ru'?`<label class="chk" title="${esc(P.kiiNote||'')}"><input type="checkbox" data-act="flag" data-k="kii"${S.flags.kii?' checked':''}> Значимый объект КИИ</label>`:''}
  ${P.sfera?'<label class="chk" title="На «Сфере» разработкой заняты больше 24 тыс. сотрудников ВТБ (АРБ, 01.07.2025)"><input type="checkbox" data-act="flag" data-k="sfera"'+(S.flags.sfera?' checked':'')+'> Условие входа: стык со «Сферой»</label>':''}
  <span class="sp"></span>
  <span class="bar-acts"><button type="button" class="btn pri" data-act="passport">${stackView()?'Паспорт стека':'Паспорт проекта'}</button>
  <button type="button" class="btn" data-act="copy">Скопировать ссылку</button>
  <button type="button" class="btn" data-act="json">Скачать JSON</button>
  ${S.hist.length?'<button type="button" class="btn" data-act="undo" aria-label="Отменить последнее действие">Отменить</button>':''}
  ${S.asm.edited?'<button type="button" class="btn" data-act="reset">Сбросить сборку</button>':''}</span>`;
}

/* ---- сообщения и ссылка ---- */
let toastT=null,toastMs=5000;
function hideToastLater(){clearTimeout(toastT);toastT=setTimeout(()=>$('#toast').classList.remove('show'),toastMs);}
function toast(msg,withUndo,extra){
 const t=$('#toast');
 t.innerHTML=`<span>${esc(msg)}</span>${withUndo?'<button type="button" data-act="undo">Вернуть</button>':''}${extra||''}`;
 t.classList.add('show');toastMs=withUndo||extra?10000:5000;hideToastLater();
}
{ // сообщение не исчезает, пока на нём курсор или фокус
 const t=$('#toast');
 t.addEventListener('mouseenter',()=>clearTimeout(toastT));t.addEventListener('mouseleave',hideToastLater);
 t.addEventListener('focusin',e=>{clearTimeout(toastT);if(e.target.tagName==='INPUT')e.target.select();});t.addEventListener('focusout',hideToastLater);
}
function copyLink(){
 const url=location.href;
 const p=navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(url):Promise.reject(new Error('нет доступа к буферу'));
 p.then(()=>toast('Ссылка скопирована: в ней масштаб, выбранный проект, профили и сборка.')).catch(()=>toast('Скопируйте ссылку вручную:',false,`<input type="text" readonly value="${esc(url)}" aria-label="Ссылка на конструктор">`));
}

/* ---- отрисовка, фокус и прокрутка панелей ---- */
function focusKey(){
 const ae=document.activeElement;
 if(!ae||ae===document.body||!ae.closest('main,#bar'))return null;
 const d=ae.dataset||{};
 return {id:ae.id,act:d.act,l:d.l,oid:d.id,g:d.g,mk:d.mk,k:d.k,i:d.i,p:d.p,v:d.v,sc:d.sc,src:d.src,dk:ae.tagName==='SUMMARY'&&ae.parentElement?ae.parentElement.dataset.k:null};
}
function restoreFocus(k){
 if(!k)return;
 const scopes=['#bar','.view.on'].map(s=>document.querySelector(s)).filter(Boolean);   // скрытые виды не ищем
 const q=(act,x)=>{for(const sc of scopes){const e=sc.querySelector('[data-act="'+act+'"]'+(x||''));if(e)return e;}return null;};
 let el=k.id?document.getElementById(k.id):null;
 if(el&&!scopes.some(sc=>sc.contains(el)))el=null;
 if(!el&&k.dk){const d=document.querySelector('.view.on details[data-k="'+CSS.escape(k.dk)+'"]');el=d?d.querySelector('summary'):null;}
 if(!el&&k.act){
  const at=(n,v)=>v?'[data-'+n+'="'+CSS.escape(v)+'"]':'';
  el=q(k.act,at('l',k.l)+at('id',k.oid)+at('g',k.g)+at('mk',k.mk)+at('k',k.k)+at('i',k.i)+at('p',k.p)+at('v',k.v)+at('sc',k.sc)+at('src',k.src));
  if(!el&&k.act==='proj')el=q('proj',at('p',k.p)+'[data-src="card"]');
  if(!el&&k.act==='add')el=q('rm',at('id',k.oid));
  if(!el&&k.act==='rm')el=q('add',at('id',k.oid));
  if(!el&&k.act==='res')el=q('unres',at('g',k.g));
  if(!el&&k.act==='unres')el=q('res',at('g',k.g));
 }
 if(el&&el.disabled){const p=el.previousElementSibling;el=p&&p.tagName==='SELECT'?p:null;}   // «Загрузить» после применения недоступна — фокус на её список
 if(!el&&(k.act==='add'||k.act==='rm'))el=$('#panel h2');
 if(!el&&(k.act==='pf-reset'||k.act==='del-proj'))el=$('#ppanel h2');
 if(!el)el=focusFallback();
 if(el&&el!==document.activeElement)el.focus({preventScroll:true});
}
function focusFallback(){
 const h=document.querySelector('.view.on h2');
 if(h&&!h.hasAttribute('tabindex'))h.setAttribute('tabindex','-1');
 return h;
}
function syncTabs(){
 const cur=stackView()?'stack':S.view;
 document.querySelectorAll('.tab').forEach(t=>{const on=t.dataset.v===cur;t.classList.toggle('on',on);t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;});
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='view-'+S.view));
}
function render(){
 const fk=focusKey(),pp=$('#ppanel'),lp=$('#panel'),keep={pj:S.pj,pp:pp?pp.scrollTop:0,l:S.layer,lp:lp?lp.scrollTop:0};
 const E=evPair();
 renderBar();
 if(S.view==='projects')renderProjects(E);
 else if(S.view==='table')renderTable(E);
 else if(S.view==='people')renderPeople(E);
 else if(S.view==='stack')renderStack(E.all);
 else renderCompare();
 syncTabs();sync();restoreFocus(fk);
 const pp2=$('#ppanel'),lp2=$('#panel');   // панель не прыгает наверх, если объект тот же
 if(pp2&&keep.pj===S.pj)pp2.scrollTop=keep.pp;
 if(lp2&&keep.l===S.layer)lp2.scrollTop=keep.lp;
}
function goLayer(id){
 S.layer=id;S.view='stack';render();
 const p=$('#panel');if(p){p.scrollIntoView({block:'nearest'});const h2=$('#panel h2');if(h2)h2.focus({preventScroll:true});}
}
function openProj(id){
 if(!projById(id))return;
 const moved=S.view!=='projects';S.pj=id;S.view='projects';render();
 const p=$('#ppanel');if(!p)return;
 if(moved){window.scrollTo({top:0});const h2=$('#ppanel h2');if(h2)h2.focus({preventScroll:true});}
 if(moved||matchMedia('(max-width:980px)').matches)p.scrollIntoView({block:matchMedia('(max-width:980px)').matches?'start':'nearest'});
}

/* ---- события ---- */
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-act]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;
 const a=b.dataset.act;
 if(a==='proj')openProj(b.dataset.p);
 else if(a==='pf')setPf(b.dataset.p,b.dataset.k,b.dataset.v);
 else if(a==='pf-reset')resetPf(b.dataset.p);
 else if(a==='del-proj')delCustom(b.dataset.p);
 else if(a==='scale')setProfile(b.dataset.sc);
 else if(a==='layer'){S.layer=b.dataset.l;render();if(matchMedia('(max-width:980px)').matches){const p=$('#panel');if(p)p.scrollIntoView({block:'start'});}}
 else if(a==='goto')goLayer(b.dataset.l);
 else if(a==='view'){const v=b.dataset.v;if(!VIEWS.includes(v))return;const jump=!(stackView()&&(v==='stack'||v==='compare'));S.view=v;render();if(jump)window.scrollTo({top:0});}
 else if(a==='add')addOpt(b.dataset.id);
 else if(a==='rm')rmOpt(b.dataset.id);
 else if(a==='stress')openStress(b.dataset.p);
 else if(a==='replace')replaceWith(b.dataset.p,b.dataset.id);
 else if(a==='res')edit(x=>{x.res[b.dataset.g]=1;});
 else if(a==='unres')edit(x=>{delete x.res[b.dataset.g];});
 else if(a==='mk'){S.mk=b.dataset.mk;render();}
 else if(a==='take'){const pid=S.cmp[+b.dataset.i];snapshot();S.asm=newAsm(pid,S.prof);S.view='stack';S.layer=null;S.pend={};render();window.scrollTo({top:0});toast('В работе: '+presetName(pid,S.prof)+'.',true);}
 else if(a==='passport'){const sv=stackView();$('#pp-title').textContent=sv?'Паспорт стека':'Паспорт проекта';$('#pp-body').innerHTML=sv?passportHTML():projPassportHTML(projById(S.pj),evPair());$('#dlg-pp').showModal();}
 else if(a==='print')window.print();
 else if(a==='close'){const d=b.closest('dialog');if(d)d.close();}
 else if(a==='copy')copyLink();
 else if(a==='json')exportJSON();
 else if(a==='reset')resetAsm();
 else if(a==='undo'){undo();const f=$('#bar [data-act="undo"]')||focusFallback();if(f)f.focus({preventScroll:true});}
 else if(a==='preset-go')loadPreset($('#sel-asm').value);
 else if(a==='stress-go'){const s=$('#stress-sel');if(s&&s.value)openStress(s.value);}
});
/* список «Сборка стека» только выбирает; применение — кнопкой рядом (стрелки в списке ничего не заменяют) */
document.addEventListener('change',e=>{
 const b=e.target.closest('[data-act]');if(!b)return;
 const a=b.dataset.act;
 if(a==='pend'){if(b.id==='sel-asm'){S.pend.asm=b.value;$('#btn-asm').disabled=b.value===S.asm.base;}}
 else if(a==='flag'){snapshot();S.flags[b.dataset.k]=b.checked;render();}
 else if(a==='cmp'){S.cmp[+b.dataset.i]=b.value;render();}
 else if(a==='diff'){S.diff=b.checked;render();}
});
document.addEventListener('submit',e=>{
 const f=e.target.closest('form[data-form="add"]');if(!f)return;
 e.preventDefault();
 const n=$('#np-n'),c=$('#np-c');
 if(!n||!n.value.trim()){toast('Введите название проекта.');if(n)n.focus();return;}
 if(addCustom(n.value,c?c.value:'evolve')){const h2=$('#ppanel h2');if(h2)h2.focus({preventScroll:true});}
});
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.matches&&d.matches('details[data-k]'))OPEN.set(d.dataset.k,d.open);},true);
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{if(!D)return;S.view=t.dataset.v;render();window.scrollTo({top:0});}));
document.querySelector('.tabs').addEventListener('keydown',e=>{
 if(!D)return;
 const tabs=[...document.querySelectorAll('.tab')],i=tabs.findIndex(t=>t.classList.contains('on'));
 const j={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];
 if(j===undefined)return;
 e.preventDefault();S.view=tabs[j].dataset.v;render();tabs[j].focus();
});
window.addEventListener('beforeprint',()=>{
 let h='<p>Данные карты не загружены — печатать нечего.</p>';
 if(D&&S.asm){try{h=stackView()?passportHTML():projPassportHTML(projById(S.pj),evPair());}catch(e){console.error(e);h='<p>Паспорт не удалось собрать.</p>';}}
 $('#print-pp').innerHTML=h;
});
function showErr(html){$('#loading').hidden=true;const e=$('#err');e.hidden=false;e.innerHTML=html;}
function safeRender(){
 try{render();$('#err').hidden=true;}
 catch(err){console.error(err);showErr(`<b>Не удалось собрать экран.</b> ${esc(err&&err.message||err)}. <a href="./">Открыть конструктор без параметров ссылки</a>`);}
}
window.addEventListener('hashchange',()=>{
 if(!D)return;
 if(!/(^|&)s=/.test(location.hash.slice(1))){sync();return;}   // якорь вроде #main — состояние не сбрасываем
 try{snapshot();fromHash();}catch(err){console.error(err);showErr(`<b>Не удалось открыть ссылку.</b> ${esc(err&&err.message||err)}. <a href="./">Открыть конструктор без параметров ссылки</a>`);return;}
 safeRender();
});
(async function init(){
 try{
  if(typeof PROJ==='undefined'||typeof SCALES==='undefined')throw new Error('не загрузились данные проектов (data.js)');
  D=await loadMap();buildCatalog();buildVtb();buildProfiles();
 }
 catch(err){
  console.error(err);
  showErr(`<b>Не удалось прочитать данные.</b> ${esc(err&&err.message||err)}.<br>Конструктор берёт данные со страницы карты, поэтому открывать его нужно по адресу сайта, а не как файл с диска. <a href="../">Открыть карту</a>`);
  return;
 }
 $('#snap').textContent=SNAP||'дата не найдена';$('#v2date').textContent=V2_DATE;
 const w=[];
 if(!SNAP)w.push(`Дата среза карты не найдена, а правила, пресеты и факты о банке сверены с картой на ${FACTS_CHECKED} — перед показом сверьте их с картой.`);
 else if(SNAP!==FACTS_CHECKED)w.push(`Карта обновлена (снимок ${esc(SNAP)}), а правила, пресеты и факты о банке сверены с ней на ${FACTS_CHECKED} — перед показом сверьте их с картой.`);
 if(WARN.length)w.push('На карте не найдены позиции, на которые опираются пресеты: '+esc(WARN.join('; '))+'.');
 const miss=[...new Set(Object.values(LS).flat())].filter(id=>!byId(id));
 if(miss.length)w.push('На карте нет слоёв, на которые опираются проекты: '+esc(miss.join(', '))+'.');
 if(w.length){const b=document.createElement('div');b.className='warn';b.setAttribute('role','note');b.innerHTML='<b>Внимание.</b> '+w.join(' ');$('.intro').appendChild(b);}
 try{fromHash();}
 catch(err){console.error(err);showErr(`<b>Не удалось собрать сборку по данным карты.</b> ${esc(err&&err.message||err)}. Возможно, на карте переименованы слои.`);return;}
 $('#loading').hidden=true;safeRender();
})();

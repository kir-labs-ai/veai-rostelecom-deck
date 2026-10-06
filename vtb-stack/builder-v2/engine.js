'use strict';
/* Конструктор ИИ-трансформации · версия 2 — движок.
   Каталог, слои, заметки, вкладка 4 и шаги сборки читаются с карты ../index.html (G, L, ORDER, CONF, GRP, US, RU, VTB) при каждом открытии.
   Правила стека, пресеты и факты о банке перенесены из версии 1 без изменения логики — итоги по слоям совпадают с ней.
   Новое: масштаб «Отрасль · КИИ», проекты с профилем готовности и слоями, которые им нужны (data.js).
   Сборка и профили проектов хранятся только в адресе ссылки (#v=…&p=…&l=…&s=…); на сервер ничего не отправляется. */
const MAP_URL='../index.html';
let D=null,SNAP='';
const CAT={},BYL={},BANK={},CLAIM={};
let PROFILES={},CONS=[],CONS_KII=[],AGAPS={};
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=o=>JSON.parse(JSON.stringify(o));
function h32(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36);}
function plural(n,a,b,c){const m=n%10,mm=n%100;return m===1&&mm!==11?a:(m>=2&&m<=4&&(mm<10||mm>=20))?b:c;}
const ST_T={ok:'✓ закрыто',part:'◐ частично',gap:'✖ дыра'};
const SEV_T={gap:'✖',part:'◐',chk:'⚠',info:'✎',unk:'?'};
const SEV_W={gap:'дыра',part:'частично',chk:'проверить',info:'вручную',unk:'уточнить'};
const CONF_C={h:'#10b981',m:'#f59e0b',l:'#94a3b8'};
const CONF_T={h:'✓ on-prem подтверждено',m:'◐ on-prem заявлен, детали не проверены',l:'? on-prem не подтверждён'};
const SRC_T={h:'✓ первоисточник сверен',m:'◐ выдача поиска или пересказ',l:'? косвенный сигнал'};
const W={ok:0,part:1,gap:2};
const byId=id=>D.L.find(l=>l.id===id);
const isX=l=>l.g==='x';
const codeLabel=l=>isX(l)?l.code:'Этаж '+l.code;
const codeShort=l=>isX(l)?l.code:'этаж '+l.code;
const FLOORS=()=>D.L.filter(l=>!isX(l)).slice().reverse();
const CROSS=()=>D.L.filter(isX);
const ORD=id=>D.L.findIndex(l=>l.id===id);
const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
const FACTS_CHECKED='28.09.2026';   // дата среза, на которую с картой сверены правила, пресеты и факты о банке
const WARN=[];                      // что не нашлось на карте при сборке пресетов
const OSS='c:открытый код';         // открытый код без компании — не «компания» для стыков и выбывания
const isVendor=p=>p!=='bank'&&p!==OSS;
const ORG=()=>S.prof==='kii'?'субъекта КИИ':'банка';   // чей архитектор, юрист, служба — зависит от масштаба
const RISK=()=>S.prof==='kii'?'служба ИБ и управления рисками субъекта КИИ':'служба модельного риска банка';

async function loadMap(){
 const res=await fetch(MAP_URL,{credentials:'same-origin',cache:'no-cache'});
 if(!res.ok)throw new Error('страница карты ответила кодом '+res.status);
 const html=await res.text();
 const doc=new DOMParser().parseFromString(html,'text/html');
 const code=[...doc.querySelectorAll('script:not([src])')].map(s=>s.textContent).find(t=>t.includes('const L=['));
 if(!code)throw new Error('на странице карты не найден блок данных');
 const cut=code.indexOf('\nfunction vendorRow');
 if(cut<0)throw new Error('структура данных карты изменилась');
 // блок данных карты исполняется как код той же страницы сайта (доверие как к тегу <script>);
 // при будущей политике CSP для этого понадобится 'unsafe-eval'
 const data=new Function(code.slice(0,cut)+'\n;return {G,L,ORDER,CONF,GRP,US,RU,VTB};')();
 const m=html.match(/снимок\s+(\d{2}\.\d{2}\.\d{4})/);
 SNAP=m?m[1]:'';
 return data;
}

/* ---- каталог: позиции вкладок 2 (США) и 3 (Россия) ---- */
function normCo(co){
 let s=String(co||'').replace(/\([^)]*\)/g,' ').replace(/[«»"]/g,'').replace(/^\s*(ГК|Группа|Group)\s+/i,'').trim();
 s=s.split(/\s+[·\/]\s+/)[0].trim();
 return s||String(co||'').trim();
}
function partyKey(mk,co,g){
 if(g&&g!=='os')return 'g:'+g;
 if(mk==='us'){if(/IBM/.test(co))return 'c:IBM';if(/NVIDIA/.test(co))return 'c:NVIDIA';}
 if(/^open source/i.test(String(co||'').trim()))return OSS;
 const c=normCo(co);
 return c?'c:'+c:OSS;
}
function partyName(k){
 if(k==='bank')return 'банк';
 if(k.startsWith('g:')){const g=k.slice(2);if(g==='we')return 'Veai';if(g==='vtb')return 'Т1';return (D.GRP[g]&&D.GRP[g].t)||g;}
 return k.slice(2);
}
function shortName(n){const s=String(n).split(/:| · | \+ /)[0].replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim();return s.length>28?s.slice(0,27)+'…':s;}
function buildCatalog(){
 D.L.forEach(l=>BYL[l.id]=[]);
 [['ru',D.RU],['us',D.US]].forEach(([mk,M])=>Object.entries(M.layers).forEach(([lid,vs])=>vs.forEach(v=>{
  if(!BYL[lid])return;
  const id=mk+'.'+lid+'.'+h32(mk+'|'+lid+'|'+v.n);
  CAT[id]={id,kind:'pos',mk,layer:lid,n:v.n,co:v.co,r:v.r,u:v.u,c:v.c||'l',g:v.g,party:partyKey(mk,v.co,v.g),short:shortName(v.n)};
  BYL[lid].push(id);
 })));
}
const findPos=(mk,lid,prefix)=>{const id=(BYL[lid]||[]).find(x=>CAT[x].mk===mk&&CAT[x].n.startsWith(prefix));if(!id){const l=byId(lid);WARN.push((l?codeLabel(l):lid)+': «'+prefix+'»');}return id;};
const getOpt=id=>typeof id!=='string'?null:own(CAT,id)?CAT[id]:own(BANK,id)?BANK[id]:own(CLAIM,id)?CLAIM[id]:null;
const foreign=o=>!!o.foreign||o.mk==='us'||/США|Китай|китайск/i.test((o.n||'')+' '+(o.co||''));

/* ---- ВТБ: что уже есть у банка (вкладка 4 и факты о ВТБ) и заявки участников из вкладки 4 ---- */
function buildVtb(){
 const b=(id,layer,n,r,u,src,x)=>{BANK[id]=Object.assign({id,kind:'bank',layer,n,r,u,src,c:'h',party:'bank',short:shortName(n)},x||{});};
 b('b.gpu','f1','GPU-кластер на китайских ускорителях','китайские GPU — в опытно-промышленной эксплуатации с 03.2026','https://ria.ru/20260408/vtb-2085882241.html','РИА Новости · 08.04.2026',
  {risk:'Риск — китайские GPU (вкладка 4). Распределение GPU во всех платформах держится на открытых компонентах NVIDIA; поддержку китайских GPU этими платформами подтвердить не удалось (вкладка 3, этаж 2).'});
 b('b.cloud','f2','Облако VTB.Cloud','собственное облако банка','','вкладка 4 карты');
 b('b.llm','f3','LLM на собственных серверах','модели работают на серверах банка','https://ria.ru/20260421/vtb-2088005033.html','РИА Новости · 21.04.2026');
 b('b.qwen','m4','Qwen — открытые веса','одна из двух LLM в работе у банка','https://www.comnews.ru/content/244652/2026-04-08/2026-w15/1008/yazyk-moy-vrag-moy-bolshie-yazykovye-modeli-ne-prinosyat-dokhoda','ComNews · 08.04.2026',{foreign:true});
 b('b.agents','a9','Платформа ИИ-агентов','уже используется в банке (по данным карты)','https://aif.ru/spief2026/platforma-dlya-robotov-i-ii-agentov-vtb-izuchaet-vozmozhnost-ee-sozdaniya','АиФ · 02.06.2026');
 // заявки — только там, где у участника нет позиции на этом слое в каталоге России
 const NA=/только облак|не подтвержден|внутренний инструмент|своих моделей нет|своего агента нет|модели не производим/i;
 D.VTB.rows.forEach(r=>[['rt','rt'],['veai','we'],['yx','yx']].forEach(([f,g])=>{
  if(!r[f]||!BYL[r.id])return;
  const party='g:'+g;
  if(BYL[r.id].some(id=>CAT[id].mk==='ru'&&CAT[id].party===party))return;
  const txt=r[f].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  const id='t4.'+r.id+'.'+f,pn=partyName(party);
  let first=txt.split(/[;(]/)[0].trim();
  if(first.length>80)first=first.slice(0,first.lastIndexOf(' ',78))+'…';
  const n=first.includes(pn)?first.charAt(0).toUpperCase()+first.slice(1):pn+' — '+first;
  CLAIM[id]={id,kind:'claim',layer:r.id,party,html:r[f],c:'m',na:NA.test(txt),n,short:pn};
 }));
}

/* ---- масштабы и пресеты: «Банк · ВТБ» — как профиль ВТБ версии 1; «Отрасль · КИИ» — типовой субъект КИИ ---- */
function buildProfiles(){
 const P=(lid,prefix)=>findPos('ru',lid,prefix);
 const ownVtb=[P('m4','YandexGPT'),P('k8','«Сфера»')].filter(Boolean);
 PROFILES={
  vtb:{name:'ВТБ — по открытым источникам',mk:'ru',kii:true,sfera:true,bank:Object.keys(BANK),own:ownVtb,
   kiiNote:'Значимые объекты КИИ банка импортозамещены полностью (БанкИнформ, 18.02.2026)',
   presets:['consortium','g:sb','g:vtb','g:yx','g:mts','g:ast','g:rt','own'],cmp:['g:sb','g:vtb']},
  kii:{name:'Субъект КИИ — типовой, без исходных данных',mk:'ru',kii:true,sfera:false,bank:[],own:[],
   kiiNote:'Значимые объекты КИИ переводятся на доверенное российское ПО и ПАК (187-ФЗ с поправками 58-ФЗ)',
   presets:['consortium','g:rt','g:sb','g:yx','g:mts','g:ast','g:vtb','empty'],cmp:['g:rt','g:sb']}
 };
 CONS=[P('f2','Basis Dynamix'),P('f3','On-Premises AI-as-a-Service'),P('m5','Veai Platform'),
  P('k6','Solar Dozor'),P('k6','Гарда Data Masking'),P('k6','Arenadata Catalog'),'t4.k6.veai',
  't4.k7.veai',P('k7','Arenadata Advanced RAG'),P('k7','YDB'),'t4.k8.veai',
  P('a9','Yandex AI Studio'),P('a10','Агент Veai'),'t4.a11.veai','t4.a11.yx','t4.a12.veai',
  't4.x1.veai',P('x1','Kolmogorov AI'),P('x2','Solar webProxy'),'t4.x2.veai',
  't4.x3.veai','t4.x4.veai','t4.x5.rt','t4.x5.veai'].filter(id=>{
   if(!id)return false;   // не найденную позицию каталога уже записал findPos
   if(getOpt(id))return true;
   const m=/^t4\.(\w+)\.(\w+)$/.exec(id),l=m&&byId(m[1]);
   WARN.push((l?codeLabel(l):id)+': заявка '+(m?({rt:'Ростелекома',veai:'Veai',yx:'Яндекса'})[m[2]]||m[2]:'')+' из вкладки 4');
   return false;
  });
 // у типового субъекта КИИ своего ЦОД и моделей нет: этаж 1 — ЦОД Ростелекома, этаж 4 — модели Яндекса
 CONS_KII=CONS.concat([P('f1','РТК-ЦОД'),P('m4','YandexGPT 5')].filter(Boolean));
 AGAPS={a11:{sev:'part',scope:'proc',t:'Чат с моделями для сотрудников не выбран.',src:'вкладка 4'},
  a12:{sev:'part',scope:'proc',t:'Агенты в процессах не закрыты — закрыта только разработка.',src:'вкладка 4'},
  x3:{sev:'gap',t:'Дыра когорты — независимая оценка агентов: нужен пятый участник или своя разработка.',src:'вкладка 4'}};
}
const MGAPS={
 ru:{k6:{sev:'part',t:'Отдельного российского продукта для синтетических данных нет — только модуль «Сферы» (Т1).',src:'вкладка 3'},
  x1:{sev:'part',t:'Рынок как класс не сложился: готового продукта «реестр агентов + права на решения + управление модельным риском для LLM» нет — его собирают из шлюза, агентной платформы и Kolmogorov AI.',src:'вкладка 3'},
  x2:{sev:'part',t:'Защита самих LLM и агентов — рынок формируется; сертификатов ФСТЭК для этого класса не нашли.',src:'вкладка 3'},
  x3:{sev:'part',t:'Независимого оценщика агентов в контуре нет: инструменты есть — оценщика нет.',src:'вкладка 4'},
  x4:{sev:'part',t:'Трассировка агентов и учёт затрат на LLM — только модулями платформ (Just AI, Neoflex Neon, MWS AI), отдельного продукта нет.',src:'вкладка 3'}}
};
function presetName(pid,prof){
 const P=PROFILES[prof],plus=(P.bank.length||P.own.length)?' + своё у банка':'';
 if(pid==='consortium')return 'Консорциум: Ростелеком + Veai + Яндекс';
 if(pid==='own')return 'Только своё у банка';
 if(pid==='empty')return 'Пустая сборка';
 if(pid==='g:vtb')return 'Только Т1'+plus+(plus?' — банк строит сам':'');
 if(pid.startsWith('c:'))return 'Только '+pid.slice(2)+' (США)';
 return 'Только '+partyName(pid)+plus;
}
function presetSel(pid,prof){
 const P=PROFILES[prof],sel={};
 D.L.forEach(l=>sel[l.id]=[]);
 const add=id=>{const o=getOpt(id);if(o&&sel[o.layer]&&!sel[o.layer].includes(id))sel[o.layer].push(id);};
 if(pid==='consortium')(prof==='kii'?CONS_KII:CONS).forEach(add);
 else if(pid!=='own'&&pid!=='empty')Object.values(CAT).filter(p=>p.mk===P.mk&&p.party===pid).forEach(p=>add(p.id));
 if(pid!=='empty'){P.bank.forEach(add);P.own.forEach(add);}
 return sel;
}
const newAsm=(pid,prof)=>({base:pid,sel:presetSel(pid,prof),gaps:pid==='consortium'?clone(AGAPS):{},res:{},edited:false});
/* ---- правила: итог слоя = худшее из уверенности позиций, заявок и замечаний ---- */
const nameMid=o=>{const s=String(o.n);return s.length>92?s.slice(0,s.lastIndexOf(' ',90))+'…':s;};
const names=(os,tag=true)=>os.map(o=>esc(nameMid(o))+(tag&&o.kind==='claim'?' · заявка вкладки 4':'')).join(', ');
const partiesOf=os=>[...new Set(os.filter(o=>o.party!=='bank').map(o=>o.party))].sort();
const whoOf=(os,suffix)=>{const ps=partiesOf(os).map(partyName);return (ps.length?ps.join(', '):'банк')+(suffix||'');};
function gapF(id,gid,g,asm,F){
 const done=own(asm.res,gid);
 F(id,{rule:'kgap',gid,src:g.src||'',who:g.who||'владелец сборки',sev:done?'info':g.sev,t:(done?'Отмечено закрытым вручную — проверить: ':'')+esc(g.t)});
}
function evaluate(asm,prof,flags,ctx){
 ctx=ctx||{};
 const P=PROFILES[prof],RU=P.mk==='ru',out={lay:{},counts:{ok:0,part:0,gap:0},parties:{}},org=' '+ORG();
 D.L.forEach(l=>{
  const os=[...new Set(asm.sel[l.id]||[])].map(getOpt).filter(o=>o&&o.layer===l.id);
  out.lay[l.id]={opts:os,f:[]};
  os.forEach(o=>{if(isVendor(o.party))(out.parties[o.party]=out.parties[o.party]||[]).push(l.id);});
 });
 const has=id=>out.lay[id].opts.length>0,nP=Object.keys(out.parties).length;
 const F=(id,f)=>out.lay[id].f.push(Object.assign({layer:id},f));
 D.L.forEach(l=>{
  const id=l.id,os=out.lay[id].opts;
  if(!os.length){
   let t='В сборке нет позиции — слой не закрыт.',who='владелец сборки',rule='empty';
   if(id==='m5'&&['a9','a10','a11','a12'].some(has)){t='Шлюза нет, а агенты выбраны: нарушено требование «ни одного подключения к модели в обход шлюза».';who='архитектор'+org;rule='bypass';}
   else if(id==='x5'&&nP>1){t=`В сборке ${nP} ${plural(nP,'компания','компании','компаний')}, а ответственного за стыки нет — требование «один ответственный за стыки между слоями».`;rule='joints';}
   else if(id==='x1'){
    const why=[];
    if(has('m4'))why.push('модели выбраны, а допуска каждой версии как модельного риска нет (требование этажа 4)');
    if(RU&&has('a12'))why.push(prof==='kii'?'у каждого действия агента должны быть основание и ответственный человек (требование С1 карты)':'по рекомендациям ЦБ от 16.06.2026 в критичных процессах операцию подтверждает сотрудник');
    if(!RU&&(has('m4')||has('a12')))why.push('SR 26-2 вывел генеративный и агентный ИИ за рамки руководства — банку нужна своя рамка контроля, например NIST AI RMF');
    if(why.length){t='Управления автономией нет: '+why.join('; ')+'.';rule='x1need';who=RISK();}
   }
   else if(id==='k6'&&has('k7')){t=`Знания и индексы выбраны, а обезличивания нет: персональные данные попадут в индексы (требование этажа 6; ${RU?'152-ФЗ':'GLBA'}).`;rule='pd';who='владелец данных и ИБ'+org;}
   F(id,{sev:'gap',rule,t,who});
  }
  const pos=os.filter(o=>o.kind!=='claim'),m=pos.filter(o=>o.c==='m'),lo=pos.filter(o=>o.c==='l'),cl=os.filter(o=>o.kind==='claim');
  if(m.length)F(id,{sev:'part',rule:'conf-m',ps:partiesOf(m),nm:names(m),t:`On-prem заявлен, детали не проверены: ${names(m)}. Нужен пилот с полностью закрытым выходом наружу.`,who:whoOf(m,' и архитектор'+org)});
  if(lo.length)F(id,{sev:'part',rule:'conf-l',ps:partiesOf(lo),nm:names(lo),t:`On-prem не подтверждён: ${names(lo)}. Без пилота с закрытым выходом не брать.`,who:whoOf(lo,' и архитектор'+org)});
  if(cl.length)F(id,{sev:'part',rule:'claim',ps:partiesOf(cl),nm:names(cl,false),t:`Заявлено во вкладке 4, но в каталоге позиции нет: ${names(cl,false)}. Уверенность не выше ◐.`,who:whoOf(cl)});
  if(id==='m5'&&os.length>1)F(id,{sev:'part',rule:'2gw',t:`В сборке ${os.length} ${plural(os.length,'шлюз','шлюза','шлюзов')} — это нарушает принцип «единая дверь к моделям»: выбрать один или развести роли.`,who:'архитектор'+org});
  if(id==='x5'&&partiesOf(os).length>1){const ps=partiesOf(os);F(id,{sev:'part',rule:'1owner',t:`Ответственный за стыки должен быть один, сейчас их ${ps.length}: ${ps.map(p=>esc(partyName(p))).join(', ')}.`,who:'владелец сборки'});}
  if(id==='a10'&&os.some(o=>/Claude Code/.test(o.n||'')))F(id,{sev:'part',rule:'cc',t:'Anthropic официально не поддерживает работу Claude Code с другими моделями: версии фиксировать, каждое обновление — регрессия на стенде; шлюз обязан принимать /v1/messages и пропускать заголовки anthropic-version и anthropic-beta.',who:'ИБ и разработка'+org});
  if(P.sfera&&flags.sfera&&!ctx.noSfera&&(id==='k8'||id==='a10')){
   const ext=os.filter(o=>o.party!=='g:vtb'&&o.party!=='bank');
   if(ext.length)F(id,{sev:'part',prio:0,rule:'sfera',ps:partiesOf(ext),nm:names(ext),t:`Стык со «Сферой» не подтверждён: ${names(ext)}. Стыковка со «Сферой» — условие входа в банк.`,who:'Т1 и '+whoOf(ext)});
  }
  if(RU&&flags.kii&&id!=='m4'){const f=os.filter(foreign);if(f.length)F(id,{sev:'chk',rule:'kii',t:`Иностранное ПО или оборудование: ${names(f)}. Значимые объекты КИИ переводятся на доверенное российское ПО и ПАК (187-ФЗ с поправками 58-ФЗ) — проверить допустимость.`,who:'юрист'+org});}
  if(RU&&id==='m4'){const f=os.filter(foreign);if(f.length)F(id,{sev:'chk',rule:'243',t:`${names(f)}: по 243-ФЗ (вступает в силу с 01.09.2026, часть норм — позже) правительство сможет определять случаи, когда допустимы только суверенные и национальные модели; переходный период — до 01.09.2032. Проверить, в каких процессах модель допустима.`,who:'юрист'+org});}
  const ch=os.filter(o=>/куплен|бывш/i.test((o.n||'')+' '+(o.co||'')));
  if(ch.length)F(id,{sev:'chk',rule:'owner',t:`Сменился владелец: ${names(ch)} — нужен план замены (С5).`,who:'владелец сборки'});
  const eg=os.filter(o=>o.mk==='us'&&/GitLab|Grafana/.test(o.n||''));
  if(eg.length)F(id,{sev:'chk',rule:'egress',t:`По карте, для лицензии или токена нужен выход наружу: ${names(eg)}. Проверить пилотом с закрытым выходом.`,who:'архитектор'+org});
  os.filter(o=>o.risk).forEach(o=>F(id,{sev:'chk',rule:'risk',t:esc(o.risk),who:'архитектор'+org}));
  const mg=own(MGAPS[P.mk]||{},id)?MGAPS[P.mk][id]:null;if(mg&&!(ctx.noProc&&mg.scope==='proc'))gapF(id,'m:'+id,mg,asm,F);
  const ag=own(asm.gaps||{},id)?asm.gaps[id]:null;if(ag&&!(ctx.noProc&&ag.scope==='proc'))gapF(id,'a:'+id,ag,asm,F);
  const w=out.lay[id].f.reduce((a,f)=>Math.max(a,f.sev==='gap'?2:f.sev==='part'?1:0),0);
  out.lay[id].st=['ok','part','gap'][w];out.counts[out.lay[id].st]++;
 });
 return out;
}
const prioOf=f=>f.prio!=null?f.prio:({gap:1,part:2,chk:3,info:9})[f.sev];
const bySev=(a,b)=>prioOf(a)-prioOf(b);
const MERGE_T={
 sfera:x=>`Не подтверждён стык со «Сферой»: ${x.items.map(f=>f.nm).join('; ')}. Это условие входа в банк.`,
 'conf-m':x=>`On-prem заявлен, но не проверен: ${x.items.map(f=>f.nm).join('; ')} — нужен пилот с полностью закрытым выходом наружу.`,
 'conf-l':x=>`On-prem не подтверждён: ${x.items.map(f=>f.nm).join('; ')} — без пилота с закрытым выходом не брать.`,
 claim:x=>`Заявки из вкладки 4 без позиции в каталоге: ${x.items.map(f=>f.nm).join('; ')} — нужны подтверждения поставки в контур.`
};
function topList(ev,ids){
 const m=new Map();let u=0;
 ids.forEach(id=>ev.lay[id].f.forEach(f=>{
  if(f.sev==='info')return;
  const key=own(MERGE_T,f.rule)?f.rule+'|'+(f.ps||[]).join(','):'u'+(u++);
  if(!m.has(key))m.set(key,Object.assign({},f,{layers:[f.layer],items:[f]}));
  else{const x=m.get(key);x.layers.push(f.layer);x.items.push(f);}
 }));
 const arr=[...m.values()];
 arr.forEach(x=>{if(x.items.length>1&&own(MERGE_T,x.rule))x.t=MERGE_T[x.rule](x);});
 return arr.sort((a,b)=>prioOf(a)-prioOf(b)||ORD(a.layers[0])-ORD(b.layers[0]));
}
function layersLabel(ids){
 const ls=[...new Set(ids)].map(byId),fl=ls.filter(l=>!isX(l)).map(l=>l.code),xs=ls.filter(isX).map(l=>l.code),parts=[];
 if(fl.length)parts.push((fl.length>1?'Этажи ':'Этаж ')+fl.join(', '));
 if(xs.length)parts.push(xs.join(', '));
 return parts.join(' · ');
}
function verdictText(ev,ids){
 ids=ids||D.L.map(l=>l.id);
 const g=ids.filter(id=>ev.lay[id].st==='gap'),p=ids.filter(id=>ev.lay[id].st==='part');
 if(!g.length&&!p.length){
  const k=ids.reduce((a,id)=>a+ev.lay[id].f.filter(f=>f.sev==='chk').length,0);
  return 'Контур закрыт: у всех позиций подтверждён on-prem.'+(k?` Осталось проверок ⚠: ${k} — они в паспорте.`:' Замечаний правил нет.');
 }
 let s='Контур не закрыт: '+(g.length?`${g.length} ${plural(g.length,'дыра','дыры','дыр')} — ${g.map(id=>esc(byId(id).n)).join(', ')}`:'дыр нет');
 if(p.length)s+=`; ${p.length} ${plural(p.length,'слой','слоя','слоёв')} частично — непроверенный on-prem, заявки без подтверждения или известные пробелы`;
 return s+'.';
}
/* «если уйдёт»: убрать все позиции и заявки игрока, пересчитать, предложить замены из каталога */
function stressData(party){
 const a0=S.asm,before=evaluate(a0,S.prof,S.flags),a1=clone(a0);
 Object.keys(a1.sel).forEach(l=>a1.sel[l]=a1.sel[l].filter(id=>{const o=getOpt(id);return !o||o.party!==party;}));
 const after=evaluate(a1,S.prof,S.flags),mk=PROFILES[S.prof].mk;
 const rows=D.L.filter(l=>a0.sel[l.id].some(id=>(getOpt(id)||{}).party===party)||before.lay[l.id].st!==after.lay[l.id].st).map(l=>{
  const id=l.id,worse=W[after.lay[id].st]>W[before.lay[id].st];
  const alts=worse?BYL[id].map(x=>CAT[x]).filter(p=>p.mk===mk&&p.party!==party&&!a1.sel[id].includes(p.id)).sort((x,y)=>'hml'.indexOf(x.c)-'hml'.indexOf(y.c)).slice(0,4):[];
  return {l,before:before.lay[id].st,after:after.lay[id].st,worse,lost:a0.sel[id].map(getOpt).filter(o=>o&&o.party===party),alts};
 });
 return {before,after,rows};
}

/* ---- проекты: профиль готовности, шаги подготовки, слои под проект ---- */
const RW={ok:0,unk:1,part:2,gap:3};
const RD_T={ok:'✓ можно в пилот',unk:'? нет данных',part:'◐ сначала подготовка',gap:'✖ сначала'};
function projects(){
 const base=PROJ.filter(p=>p.sc===S.prof);
 const cu=S.cu.filter(c=>c.sc===S.prof).map((c,i)=>({id:c.id,sc:c.sc,grp:'own',code:'Св'+(i+1),cls:c.cls,w:i+1,custom:true,n:c.n,
  state:'свой проект — данных пока нет',what:'',hyp:'',goal:{t:'задать с заказчиком',m:'задать с заказчиком'},pf:{},veai:'',who:'заказчик',people:'',conf:'нет данных',src:[]}));
 return base.concat(cu);
}
const projById=id=>projects().find(p=>p.id===id)||null;
const dimsOf=p=>DIMS[CLS[p.cls].dims].filter(d=>!d.only||d.only.includes(p.cls));
function profOf(p){
 const e=S.pf[p.id]||{},o={};
 dimsOf(p).forEach(d=>{o[d.k]=own(e,d.k)?e[d.k]:own(p.pf,d.k)?p.pf[d.k]:'unk';});
 return o;
}
const pfBasis=(p,k)=>{const e=S.pf[p.id]||{},same=!own(e,k)||(own(p.pf,k)&&e[k]===p.pf[k]);return same&&p.pfh&&own(p.pfh,k)?p.pfh[k]:'';};
const pfEdited=p=>{const e=S.pf[p.id]||{};return Object.keys(e).some(k=>e[k]!==(own(p.pf,k)?p.pf[k]:'unk'));};
function prepOf(p){
 const pr=profOf(p),steps=[];
 dimsOf(p).forEach(d=>{
  const v=pr[d.k],r=own(PREP,d.k)&&own(PREP[d.k],v)?PREP[d.k][v]:null;
  if(!r)return;
  if(d.k==='lang'&&v==='rare'&&p.cls==='migrate')return;   // перевод и есть ответ на редкий язык
  steps.push({dim:d.k,st:r[0],sh:r[1],t:r[2]});
 });
 return steps.sort((a,b)=>RW[b.st]-RW[a.st]);
}
function readiness(p){
 const steps=prepOf(p),w=steps.reduce((a,x)=>Math.max(a,RW[x.st]),0),st=['ok','unk','part','gap'][w];
 return {st,steps,first:steps.find(x=>x.st===st)||null};
}
const needOf=p=>LS[CLS[p.cls].ls];
const isProcCls=c=>CLS[c].dims!=='code';
// три расчёта одной сборки: весь стек; для разработки — без пробелов «агентов в процессах»; для процессов — без условия «Сферы»
function evPair(){return {all:evaluate(S.asm,S.prof,S.flags),dev:evaluate(S.asm,S.prof,S.flags,{noProc:true}),proc:evaluate(S.asm,S.prof,S.flags,{noSfera:true})};}
const evFor=(E,p)=>isProcCls(p.cls)?E.proc:E.dev;
function cntOf(ev,ids){const c={ok:0,part:0,gap:0};ids.forEach(id=>c[ev.lay[id].st]++);return c;}
const projTop=(ev,p)=>topList(ev,needOf(p));   // замечания по слоям проекта

/* ---- состояние: живёт в адресе ссылки ---- */
let S={prof:'vtb',view:'projects',layer:null,mk:null,asm:null,cmp:[],flags:{kii:true,sfera:true},diff:false,hist:[],pend:{},pj:null,pf:{},cu:[]};
const VIEWS=['projects','table','people','stack','compare'];
function b64e(str){const b=new TextEncoder().encode(str);let s='';b.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64d(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return new TextDecoder().decode(b);}
function stateHash(){
 const o={p:S.prof,b:S.asm.base,c:S.cmp,f:[+S.flags.kii,+S.flags.sfera]};
 if(S.asm.edited){o.s=S.asm.sel;o.g=Object.keys(S.asm.gaps);}
 const r=Object.keys(S.asm.res);if(r.length)o.r=r;
 if(S.mk)o.m=S.mk;
 const pf={};Object.keys(S.pf).forEach(k=>{if(Object.keys(S.pf[k]).length)pf[k]=S.pf[k];});
 if(Object.keys(pf).length)o.pf=pf;
 if(S.cu.length)o.cu=S.cu.map(c=>[c.id,c.sc,c.cls,c.n]);
 const q=new URLSearchParams();q.set('v',S.view);if(S.pj)q.set('p',S.pj);if(S.layer)q.set('l',S.layer);q.set('s',b64e(JSON.stringify(o)));
 return '#'+q.toString();
}
function sync(){const h=stateHash();if(location.hash!==h){try{history.replaceState(null,'',h);}catch(e){/* частые вызовы в Firefox/Safari */}}}
function canon(a){const s={};Object.keys(a.sel).sort().forEach(k=>s[k]=[...new Set(a.sel[k])].sort());return JSON.stringify([s,Object.keys(a.gaps||{}).sort(),Object.keys(a.res||{}).sort()]);}
function markEdited(){S.asm.edited=canon(S.asm)!==canon(newAsm(S.asm.base,S.prof));}
function orderedProjects(){const gs=SCALES[S.prof].groups.map(g=>g[0]).concat(['own']);return projects().slice().sort((a,b)=>gs.indexOf(a.grp)-gs.indexOf(b.grp)||a.w-b.w);}
function firstProj(){const ps=orderedProjects();return ps.length?ps[0].id:null;}
function defaults(){const P=PROFILES.vtb;S.pend={};S.prof='vtb';S.view='projects';S.asm=newAsm(P.presets[0],'vtb');S.cmp=P.cmp.slice();S.flags={kii:P.kii,sfera:P.sfera};S.mk=null;S.layer=null;S.pf={};S.cu=[];S.pj=firstProj();}
function fromHash(){try{parseHash();}catch(e){console.error(e);defaults();toast('Ссылку не удалось прочитать — открыта сборка по умолчанию.');}}
function parseHash(){
 const q=new URLSearchParams(location.hash.slice(1));let o=null,lost=0;S.pend={};
 try{if(q.get('s'))o=JSON.parse(b64d(q.get('s')));}catch(e){o=null;}
 if(!o||typeof o!=='object'||Array.isArray(o))o=null;
 const v=q.get('v');S.view=VIEWS.includes(v)?v:'projects';
 S.prof=o&&typeof o.p==='string'&&own(PROFILES,o.p)?o.p:'vtb';
 const P=PROFILES[S.prof],base=o&&P.presets.includes(o.b)?o.b:P.presets[0];
 S.asm=newAsm(base,S.prof);
 if(o&&o.s&&typeof o.s==='object'){
  const sel={};
  D.L.forEach(l=>{const raw=own(o.s,l.id)&&Array.isArray(o.s[l.id])?o.s[l.id]:[];sel[l.id]=[...new Set(raw)].filter(id=>{const x=getOpt(id),ok=!!x&&x.layer===l.id;if(!ok)lost++;return ok;});});
  S.asm.sel=sel;
  const g={};(Array.isArray(o.g)?o.g:[]).forEach(k=>{if(base==='consortium'&&typeof k==='string'&&own(AGAPS,k))g[k]=clone(AGAPS[k]);});S.asm.gaps=g;
 }
 (o&&Array.isArray(o.r)?o.r:[]).forEach(k=>{if(typeof k==='string'&&/^[am]:[a-z0-9]+$/.test(k))S.asm.res[k]=1;});
 markEdited();
 S.cmp=(o&&Array.isArray(o.c)?o.c:P.cmp).filter(pid=>P.presets.includes(pid)).slice(0,2);
 while(S.cmp.length<2)S.cmp.push(P.cmp[S.cmp.length]||P.presets[0]);
 S.flags=o&&Array.isArray(o.f)?{kii:!!o.f[0]&&P.mk==='ru',sfera:!!o.f[1]&&P.sfera}:{kii:P.kii,sfera:P.sfera};
 S.mk=o&&['ru','us','all'].includes(o.m)?o.m:null;
 // свои проекты: [id, масштаб, класс, название]
 S.cu=[];
 (o&&Array.isArray(o.cu)?o.cu:[]).slice(0,12).forEach(c=>{
  if(Array.isArray(c)&&typeof c[0]==='string'&&/^u[0-9a-z]{1,10}$/.test(c[0])&&own(PROFILES,c[1])&&own(CLS,c[2])&&typeof c[3]==='string'&&c[3].trim()&&!S.cu.some(x=>x.id===c[0]))
   S.cu.push({id:c[0],sc:c[1],cls:c[2],n:c[3].trim().slice(0,80)});
 });
 // профили проектов: только известные измерения и значения
 S.pf={};
 if(o&&o.pf&&typeof o.pf==='object'&&!Array.isArray(o.pf)){
  const all=PROJ.concat(S.cu.map(c=>({id:c.id,cls:c.cls,pf:{}})));
  Object.keys(o.pf).forEach(pid=>{
   const p=all.find(x=>x.id===pid),e=o.pf[pid];if(!p||!e||typeof e!=='object')return;
   const ok={};dimsOf(p).forEach(d=>{if(own(e,d.k)&&d.o.some(x=>x[0]===e[d.k]))ok[d.k]=e[d.k];});
   if(Object.keys(ok).length)S.pf[pid]=ok;
  });
 }
 const pj=q.get('p');S.pj=pj&&projById(pj)?pj:firstProj();
 const l=q.get('l');S.layer=l&&own(BYL,l)?l:null;
 if(lost)toast(`Позиций из ссылки, которых больше нет на карте: ${lost}. Они убраны из сборки.`);
}
const asmName=()=>presetName(S.asm.base,S.prof)+(S.asm.edited?' · изменена':'');
/* отмена: стек последних 30 действий; кнопка «Отменить» в панели управления видна, пока стек не пуст */
function snapshot(){S.hist.push(clone({asm:S.asm,prof:S.prof,flags:S.flags,cmp:S.cmp,mk:S.mk,pj:S.pj,pf:S.pf,cu:S.cu}));if(S.hist.length>30)S.hist.shift();}
function undo(){const p=S.hist.pop();if(!p)return;Object.assign(S,p);S.pend={};if(S.layer&&!own(BYL,S.layer))S.layer=null;if(!projById(S.pj))S.pj=firstProj();render();toast('Последнее действие отменено.');}
function edit(fn){snapshot();fn(S.asm);markEdited();render();}
function addOpt(id){const o=getOpt(id);if(o)edit(a=>{if(!a.sel[o.layer].includes(id))a.sel[o.layer].push(id);});}
function rmOpt(id){const o=getOpt(id);if(o)edit(a=>{a.sel[o.layer]=a.sel[o.layer].filter(x=>x!==id);});}
function loadPreset(pid){if(!PROFILES[S.prof].presets.includes(pid))return;snapshot();S.asm=newAsm(pid,S.prof);S.layer=null;S.pend={};render();toast('Загружена сборка: '+presetName(pid,S.prof)+'.',true);}
function setProfile(p){
 if(!own(PROFILES,p)||p===S.prof)return;snapshot();const P=PROFILES[p];
 S.prof=p;S.flags={kii:P.kii,sfera:P.sfera};S.asm=newAsm(P.presets[0],p);S.cmp=P.cmp.slice();S.mk=null;S.layer=null;S.pend={};S.pj=firstProj();
 render();toast('Масштаб: '+SCALES[p].n+'. Сборка стека — '+presetName(P.presets[0],p)+'.',true);
}
function resetAsm(){snapshot();S.asm=newAsm(S.asm.base,S.prof);render();toast('Изменения сборки сброшены.',true);}
function replaceWith(party,id){
 const p=getOpt(id);if(!p)return;S.layer=p.layer;
 const d=$('#dlg-st');if(d.open)d.close();
 edit(a=>{a.sel[p.layer]=a.sel[p.layer].filter(x=>(getOpt(x)||{}).party!==party);if(!a.sel[p.layer].includes(id))a.sel[p.layer].push(id);});
 toast(`${codeLabel(byId(p.layer))}: вместо ${partyName(party)} — ${p.short}.`,true);
}
function setPf(pid,k,v){
 const p=projById(pid);if(!p)return;const d=dimsOf(p).find(x=>x.k===k);if(!d||!d.o.some(x=>x[0]===v))return;
 snapshot();const e=Object.assign({},S.pf[pid]||{});
 if(v===(own(p.pf,k)?p.pf[k]:'unk'))delete e[k];else e[k]=v;
 if(Object.keys(e).length)S.pf[pid]=e;else delete S.pf[pid];
 render();
}
function resetPf(pid){if(!S.pf[pid])return;snapshot();delete S.pf[pid];render();toast('Профиль проекта возвращён к исходному.',true);}
function addCustom(name,cls){
 name=String(name||'').trim().slice(0,80);if(!name||!own(CLS,cls))return false;
 if(S.cu.length>=12){toast('Своих проектов можно добавить не больше 12.');return false;}
 snapshot();let n=1;while(S.cu.some(c=>c.id==='u'+n))n++;
 const id='u'+n;S.cu.push({id,sc:S.prof,cls,n:name});S.pj=id;render();toast('Проект добавлен: '+name+'. Профиль — «нет данных», заполните его вместе с заказчиком.',true);return true;
}
function delCustom(pid){const c=S.cu.find(x=>x.id===pid);if(!c)return;snapshot();S.cu=S.cu.filter(x=>x.id!==pid);delete S.pf[pid];S.pj=firstProj();render();toast('Проект удалён: '+c.n+'.',true);}

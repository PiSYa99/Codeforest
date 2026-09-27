'use strict';
const $ = id => document.getElementById(id);
const CHAPTERS = ['Пробуждение', 'Магия значений', 'Сила повторений', 'Искусство решений', 'Свои заклинания', 'Сердце леса'];
const SAVE_KEY = 'kodolesye.campaign.v1';
let levels = [], current = 0, world, busy = false, cancel = 0, hintStep = 0, drawnHero = null, effects = [], lastFrame = 0;
let save = { completed: [], drafts: {}, attempts: {}, unlocked: false, last: 0 };
let storageOK = true;
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if(s && typeof s === 'object') save = {...save,...s}; } catch { storageOK = false; }
if (!Array.isArray(save.completed)) save.completed = [];
save.completed = [...new Set(save.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<18))];
for(const key of ['drafts','attempts']) if(!save[key] || typeof save[key]!=='object' || Array.isArray(save[key])) save[key]={};
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); $('codeStatus').textContent='Сохранено на этом устройстве'; } catch { storageOK=false; $('codeStatus').textContent='Сохранение недоступно — скачай прогресс'; } };
const clone = value => JSON.parse(JSON.stringify(value));
function accessible(i) { return i===0 || save.unlocked || save.completed.includes(i) || save.completed.includes(i-1); }
function log(message, type='') {const p=document.createElement('p');p.className=type;p.textContent=message;$('log').append(p);$('log').scrollTop=$('log').scrollHeight;}
function lines() { const count=$('code').value.split('\n').length; $('lineNumbers').textContent=Array.from({length:count},(_,i)=>i+1).join('\n'); }
function stats() {
  const xp=save.completed.reduce((total,i)=>total+(levels[i]?.xp||0),0);
  $('xp').textContent=`${xp} XP · уровень ${1+Math.floor(xp/250)}`;
  $('rank').textContent=save.completed.length===18?'Хранитель исходного леса':save.completed.length>=12?'Мастер заклинаний':save.completed.length>=6?'Следопыт кода':'Юный хранитель';
  $('overall').textContent=`${save.completed.length} / 18 квестов`;
  $('progressDots').replaceChildren(...levels.map((l,i)=>{const el=document.createElement('i');el.className=[save.completed.includes(i)?'done':'',i===current?'current':''].join(' ');el.title=l.title;return el;}));
}
function loadLevel(i) {
  if(!levels[i] || !accessible(i))return;
  cancel++;busy=false;$('runButton').disabled=false;$('runButton').innerHTML='▶ Запустить код <kbd>⌘ ↵</kbd>';
  current=i;hintStep=0;world=clone(levels[i].initial);drawnHero=null;effects=[];save.last=i;persist();
  const l=levels[i];
  $('title').textContent=l.title;$('topic').textContent=l.topic;$('chapter').textContent=`ГЛАВА ${String(l.chapter).padStart(2,'0')} · ${CHAPTERS[l.chapter-1].toUpperCase()}`;
  $('questNumber').textContent=`КВЕСТ ${String(i+1).padStart(2,'0')}`;$('story').textContent=l.story;$('task').textContent=l.task;
  $('lessonNumber').textContent=String(i+1).padStart(2,'0');$('lessonTitle').textContent=l.topic;$('lesson').textContent=l.lesson;
  $('code').value=typeof save.drafts[i]==='string'?save.drafts[i]:l.starter;lines();$('hint').hidden=true;$('hintButton').textContent='☀ Нужна подсказка';$('speech').hidden=true;
  $('log').replaceChildren();log('Нажми «Запустить код» и наблюдай за героем.','muted');$('variables').replaceChildren();$('runState').textContent='ГОТОВ';$('sceneStatus').textContent='Герой ждёт твоих команд';
  updateWorld();stats();
}
function updateWorld() { $('gemCount').textContent=`◆ ${world.collected} / ${levels[current].initial.gems.length}`; }
function showVariables(vars) { $('variables').replaceChildren(...Object.entries(vars||{}).map(([key,value])=>{const span=document.createElement('span');span.textContent=`${key} = ${value}`;return span;})); }
function markLine(line) { if(!line)return; $('codeStatus').textContent=`Строка ${line}`; }
async function run() {
  if(busy)return;busy=true;const token=++cancel;
  const code=$('code').value;save.drafts[current]=code;save.attempts[current]=(save.attempts[current]||0)+1;persist();
  world=clone(levels[current].initial);drawnHero=null;effects=[];updateWorld();$('speech').hidden=true;$('variables').replaceChildren();$('log').replaceChildren();
  $('runButton').disabled=true;$('runButton').textContent='◌ Герой исполняет код…';$('runState').textContent='В ПУТИ';$('sceneStatus').textContent='Заклинание запущено';
  try {
    const response=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:current,code})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Не удалось запустить код.');if(token!==cancel)return;
    for(const event of result.events||[]) {
      if(token!==cancel)return;
      const before=world;world=event.state;updateWorld();markLine(event.line);showVariables(event.variables);
      if(world.collected>before.collected)effects.push({x:world.x,y:world.y,start:performance.now(),kind:'gem'});
      if(world.defeated>before.defeated)effects.push({x:world.x+1,y:world.y,start:performance.now(),kind:'hit'});
      if(world.speech!==before.speech){$('speech').textContent=world.speech;$('speech').hidden=false;}
      log(`${event.line?'['+event.line+'] ':''}${event.message}`);
      await new Promise(resolve=>setTimeout(resolve,Number($('speed').value)));
    }
    if(token!==cancel)return;
    if(result.ok) {
      const first=!save.completed.includes(current);if(first)save.completed.push(current);persist();stats();
      $('runState').textContent='ПОБЕДА';$('sceneStatus').textContent='Квест пройден';log('✦ Отлично! Твой код вернул лесу немного света.');
      $('rewardXp').textContent=first?`+${levels[current].xp}`:'Повтор';$('rewardTopic').textContent=levels[current].topic;
      $('winTitle').textContent=current===17?'Лес снова жив!':'Квест пройден!';$('winText').textContent=current===17?'Ты прошёл 18 квестов и освоил основы Python. Попробуй улучшить свои решения и объяснить наставнику, как они работают.':`«${levels[current].title}» — ещё одна история, которую ты написал на Python.`;
      $('nextButton').textContent=current===17?'К карте путешествия →':'Следующий квест →';$('winDialog').showModal();
    } else { $('runState').textContent='ПОПРОБУЙ ЕЩЁ';$('sceneStatus').textContent='Можно исправить и запустить снова';log((result.line?`Строка ${result.line}: `:'')+(result.error||'Попробуй другой маршрут.'),'error');markLine(result.line); }
  } catch(error) { if(token===cancel){log(`Не удалось выполнить код. ${error.message} Убедись, что окно запуска игры открыто.`,'error');$('runState').textContent='НЕТ СВЯЗИ';} }
  finally { if(token===cancel){busy=false;$('runButton').disabled=false;$('runButton').innerHTML='▶ Запустить код <kbd>⌘ ↵</kbd>'; } }
}
function openMap() {
  const container=$('levelMap');container.replaceChildren();
  CHAPTERS.forEach((title,c)=>{
    const group=document.createElement('section');group.className='chapter-group';const h=document.createElement('h3');h.textContent=`0${c+1} / ${title}`;group.append(h);const grid=document.createElement('div');grid.className='level-grid';
    levels.filter(l=>l.chapter===c+1).forEach(l=>{const b=document.createElement('button');b.className=`level-button ${l.id===current?'current':''} ${save.completed.includes(l.id)?'done':''}`;b.disabled=!accessible(l.id);const number=document.createElement('span');number.className='num';number.textContent=`${String(l.id+1).padStart(2,'0')} ${save.completed.includes(l.id)?'✓':!accessible(l.id)?'· закрыт':'→'}`;const name=document.createElement('b');name.textContent=l.title;const tag=document.createElement('small');tag.textContent=l.topic;b.append(number,name,tag);b.onclick=()=>{$('mapDialog').close();loadLevel(l.id);};grid.append(b);});group.append(grid);container.append(group);
  });$('mapDialog').showModal();
}
const commandList=[
['hero.move_right(n), hero.move_left(n)','Переместиться вправо или влево на n клеток. Без аргумента — один шаг.'],
['hero.move_up(n), hero.move_down(n)','Переместиться вверх или вниз. Направления соответствуют экрану.'],
['hero.move("right")','Один шаг по направлению из строки: right, left, up, down.'],
['hero.collect()','Подобрать кристалл на клетке, где стоит герой.'],
['hero.gem_here()','True, если под ногами есть кристалл; иначе False.'],
['hero.enemy_ahead()','True, если в соседней клетке справа есть страж. Можно указать направление: hero.enemy_ahead("up").'],
['hero.attack()','Победить соседнего стража справа. Другое направление передаётся строкой, например hero.attack("down").'],
['hero.say("свет")','Произнести текст. Верный пароль открывает соседние ворота.'],
['hero.at_exit()','True, если герой стоит в портале.'],
['hero.path_clear("right")','True, если соседняя клетка в этом направлении проходима.'],
['steps = 3\nhero.move_right(steps)','Переменная хранит значение. Сначала присвой, затем используй.'],
['for step in range(3):\n    hero.move_right()','Повторить действие три раза. Отступ блока — четыре пробела.'],
['if hero.gem_here():\n    hero.collect()','Выполнить действие, только если условие истинно.'],
['while not hero.at_exit():\n    hero.move_right()','Повторять, пока герой не дойдёт до портала. Убедись, что путь свободен.'],
['def walk(steps):\n    hero.move_right(steps)\n\nwalk(2)','Определить функцию с параметром и вызвать её.'],
['print(steps)','Показать значение в журнале. Полезно для поиска ошибок.'],
];
function openGuide(){$('commands').replaceChildren(...commandList.map(([code,description])=>{const div=document.createElement('div');div.className='command';const pre=document.createElement('code');pre.style.whiteSpace='pre-wrap';pre.textContent=code;const p=document.createElement('p');p.textContent=description;div.append(pre,p);return div;}));$('guideDialog').showModal();}
$('mapButton').onclick=openMap;$('guideButton').onclick=openGuide;$('commandsButton').onclick=openGuide;$('runButton').onclick=run;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('code').addEventListener('input',()=>{lines();save.drafts[current]=$('code').value;persist();});
$('code').addEventListener('scroll',()=>{$('lineNumbers').scrollTop=$('code').scrollTop;});
$('code').addEventListener('keydown',e=>{
  const editor=e.target;
  if(e.key==='Tab'){e.preventDefault();editor.setRangeText('    ',editor.selectionStart,editor.selectionEnd,'end');editor.dispatchEvent(new Event('input'));}
  if(e.key==='Enter'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const before=editor.value.slice(0,editor.selectionStart).split('\n').pop();const indent=before.match(/^ */)[0]+(before.trimEnd().endsWith(':')?'    ':'');editor.setRangeText('\n'+indent,editor.selectionStart,editor.selectionEnd,'end');editor.dispatchEvent(new Event('input'));}
  if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();run();}
});
$('resetButton').onclick=()=>{if(busy)return;if(confirm('Вернуть начальный код этого квеста? Твоё текущее решение будет заменено.')){delete save.drafts[current];loadLevel(current);}};
$('hintButton').onclick=()=>{const hints=levels[current].hints;hintStep=Math.min(hintStep+1,hints.length);$('hint').hidden=false;$('hint').textContent=`Подсказка ${hintStep}/${hints.length}. ${hints[hintStep-1]}`;$('hintButton').textContent=hintStep<hints.length?'☀ Ещё одна подсказка':'☀ Подсказки открыты';};
$('nextButton').onclick=()=>{$('winDialog').close();if(current<levels.length-1)loadLevel(current+1);else openMap();};
$('teacherButton').onclick=()=>{$('unlockAll').checked=!!save.unlocked;$('teacherStats').textContent=`Пройдено квестов: ${save.completed.length} из 18. Запусков кода: ${Object.values(save.attempts).reduce((a,b)=>a+(Number(b)||0),0)}. Текущая тема: ${levels[current].topic}.`;$('teacherDialog').showModal();};
$('clearProgressButton').onclick=()=>{if(confirm('Удалить прогресс и решения в этом браузере и начать с первого квеста?')){save={completed:[],drafts:{},attempts:{},unlocked:false,last:0};persist();$('teacherDialog').close();loadLevel(0);}};
$('unlockAll').onchange=e=>{save.unlocked=e.target.checked;persist();};
$('exportButton').onclick=()=>{const data={game:'Кодолесье',date:new Date().toISOString(),...save};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='kodolesye-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);};
// Рисованная карта: все изображения создаются локально, без внешних ресурсов.
const canvas=$('world'), ctx=canvas.getContext('2d');
function random(x,y,n=0){const k=Math.sin(x*127.1+y*311.7+n*47.3)*43758.5453;return k-Math.floor(k);}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function tree(x,y,s,n){
  ellipse(x+4*s,y+13*s,19*s,7*s,'#11281d65');rect(x-3*s,y-5*s,6*s,20*s,'#5a5036');rect(x+1*s,y-5*s,3*s,20*s,'#3b402a');
  const colors=n>.5?['#284d35','#34623e','#477449']:['#254730','#315b37','#406b40'];
  for(let i=0;i<3;i++){const yy=y-i*12*s;ctx.fillStyle=colors[i];ctx.beginPath();ctx.moveTo(x,yy-30*s);ctx.lineTo(x-20*s+i*3*s,yy+1*s);ctx.lineTo(x+20*s-i*3*s,yy+1*s);ctx.closePath();ctx.fill();ctx.fillStyle='#66804a33';ctx.beginPath();ctx.moveTo(x,yy-30*s);ctx.lineTo(x-20*s+i*3*s,yy+1*s);ctx.lineTo(x-3*s,yy-5*s);ctx.closePath();ctx.fill();}
}
function gem(x,y,s,time){
  const bob=Math.sin(time/450+x)*2;ellipse(x,y+13*s,9*s,3*s,'#102e2666');ctx.shadowColor='#77efd8';ctx.shadowBlur=13;
  ctx.fillStyle='#70d7c0';ctx.beginPath();ctx.moveTo(x,y-12*s+bob);ctx.lineTo(x+7*s,y-3*s+bob);ctx.lineTo(x+5*s,y+6*s+bob);ctx.lineTo(x,y+11*s+bob);ctx.lineTo(x-7*s,y-2*s+bob);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#c3ffeb';ctx.beginPath();ctx.moveTo(x,y-12*s+bob);ctx.lineTo(x,y+10*s+bob);ctx.lineTo(x-5*s,y-2*s+bob);ctx.closePath();ctx.fill();
}
function hero(x,y,s,time){
  ellipse(x,y+13*s,12*s,4*s,'#14251bcc');const b=Math.sin(time/300)*.6;
  // Пиксельный плащ, сапоги, лицо, капюшон, посох.
  rect(x-9*s,y-4*s+b,18*s,16*s,'#816b47');rect(x-7*s,y-4*s+b,14*s,14*s,'#d2ad6b');rect(x-3*s,y+3*s+b,5*s,10*s,'#a77c48');
  rect(x-6*s,y+11*s,5*s,5*s,'#343a2f');rect(x+2*s,y+11*s,5*s,5*s,'#343a2f');
  rect(x-8*s,y-21*s+b,16*s,17*s,'#e1c283');rect(x-10*s,y-16*s+b,20*s,10*s,'#d0ad69');rect(x-6*s,y-14*s+b,12*s,10*s,'#554935');rect(x-4*s,y-13*s+b,9*s,8*s,'#efcc98');
  rect(x+2*s,y-11*s+b,2*s,2*s,'#343a2f');rect(x-10*s,y-2*s+b,5*s,6*s,'#e1bf88');rect(x+8*s,y-2*s+b,4*s,5*s,'#edc993');rect(x+13*s,y-14*s,2*s,29*s,'#a18355');
  ctx.shadowColor='#dcf9a6';ctx.shadowBlur=12;rect(x+11*s,y-18*s,6*s,6*s,'#d4ed96');ctx.shadowBlur=0;
}
function enemy(x,y,s,time){const bob=Math.sin(time/400+x)*2;ellipse(x,y+12*s,13*s,4*s,'#16231899');ctx.fillStyle='#6c618c';ctx.beginPath();ctx.moveTo(x,y-18*s+bob);ctx.lineTo(x-12*s,y+10*s+bob);ctx.lineTo(x-6*s,y+7*s+bob);ctx.lineTo(x,y+12*s+bob);ctx.lineTo(x+7*s,y+7*s+bob);ctx.lineTo(x+12*s,y+10*s+bob);ctx.closePath();ctx.fill();rect(x-6*s,y-4*s+bob,4*s,3*s,'#dec4ed');rect(x+3*s,y-4*s+bob,4*s,3*s,'#dec4ed');}
function portal(x,y,s,time){ellipse(x,y+13*s,18*s,6*s,'#c7f09422');ctx.lineWidth=5*s;ctx.strokeStyle='#76856a';ctx.beginPath();ctx.ellipse(x,y-4*s,13*s,20*s,0,Math.PI,Math.PI*2);ctx.stroke();rect(x-16*s,y-5*s,6*s,19*s,'#68795e');rect(x+10*s,y-5*s,6*s,19*s,'#78866b');ctx.shadowColor='#bcf78b';ctx.shadowBlur=20;ellipse(x,y-3*s,9*s,16*s,`rgba(191,241,141,${.38+Math.sin(time/500)*.12})`);ctx.strokeStyle='#c4f69a';ctx.lineWidth=1*s;ctx.beginPath();ctx.ellipse(x,y-3*s,8*s,15*s,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;rect(x-2*s,y-28*s,4*s,5*s,'#d6f4a3');}
function draw(time){
  requestAnimationFrame(draw);if(!world||!levels[current])return;
  const bounds=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(bounds.width*dpr)||canvas.height!==Math.round(bounds.height*dpr)){canvas.width=Math.round(bounds.width*dpr);canvas.height=Math.round(bounds.height*dpr);}
  const w=bounds.width,h=bounds.height;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
  const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#233d30');grad.addColorStop(.5,'#314a35');grad.addColorStop(1,'#1a332b');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  const grid=levels[current].grid,cols=grid[0].length,rows=grid.length;
  const tile=Math.min(47,(w-56)/cols,(h-95)/Math.max(rows,5)), ox=(w-cols*tile)/2,oy=(h-rows*tile)/2+20;
  const pos=(x,y)=>[ox+(x+.5)*tile,oy+(y+.5)*tile];
  // Тихая лесная подложка и мелкая трава.
  for(let y=0;y<h;y+=23)for(let x=0;x<w;x+=23){const r=random(x,y);if(r>.32){rect(x+r*13,y,2,3,'#82945e1c');rect(x+r*13+3,y-2,1,3,'#bac58b15');}}
  // Земля и каменная тропа. Направления на карте совпадают с экраном.
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x]!=='#'){
    const px=ox+x*tile,py=oy+y*tile;rect(px-2,py-2,tile+4,tile+5,'#1d3226');rect(px,py,tile,tile,'#7b7f58');rect(px+2,py+2,tile-4,tile-5,'#91916a');rect(px+4,py+4,tile-8,tile-9,random(x,y)>.5?'#a2a077':'#96996c');rect(px+6,py+7,8,2,'#b8b38955');rect(px+tile-8,py+tile-12,3,5,'#757f5755');
    if(grid[y][x]==='S'){const [xx,yy]=pos(x,y);ctx.strokeStyle='#bdc39355';ctx.lineWidth=1;ctx.strokeRect(xx-8,yy-8,16,16);}
  }
  // Декоративные деревья вокруг игрового маршрута.
  for(let yy=35;yy<h-15;yy+=56)for(let xx=15;xx<w;xx+=51){
    const gx=Math.floor((xx-ox)/tile),gy=Math.floor((yy-oy)/tile);let near=false;
    for(let dy=-1;dy<=0;dy++)for(let dx=0;dx<=1;dx++){if(grid[gy+dy]&&grid[gy+dy][gx+dx]&&grid[gy+dy][gx+dx]!=='#')near=true;}
    if(!near&&random(xx,yy)>.2)tree(xx+random(xx,yy,2)*11,yy, .72+random(xx,yy,1)*.38,random(xx,yy,3));
  }
  const objects=[];const scale=tile/40;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x]==='E'){const [xx,yy]=pos(x,y);objects.push({y:yy,draw:()=>portal(xx,yy,scale,time)});}
  for(const [x,y]of world.gems){const [xx,yy]=pos(x,y);objects.push({y:yy,draw:()=>gem(xx,yy,scale,time)});}
  for(const [x,y]of world.enemies){const [xx,yy]=pos(x,y);objects.push({y:yy,draw:()=>enemy(xx,yy,scale,time)});}
  for(const [x,y]of world.doors){const [xx,yy]=pos(x,y);objects.push({y:yy,draw:()=>{rect(xx-16*scale,yy-20*scale,32*scale,34*scale,'#495642');for(let i=0;i<4;i++)rect(xx+(-12+i*7)*scale,yy-16*scale,4*scale,28*scale,'#beac76');rect(xx-18*scale,yy-24*scale,36*scale,6*scale,'#97a177');rect(xx-4*scale,yy-8*scale,8*scale,10*scale,'#d9d194');}});}
  const [hx,hy]=pos(world.x,world.y);if(!drawnHero)drawnHero={x:hx,y:hy};const delta=Math.min((time-lastFrame)/70,1);drawnHero.x+=(hx-drawnHero.x)*delta;drawnHero.y+=(hy-drawnHero.y)*delta;lastFrame=time;
  objects.push({y:drawnHero.y,draw:()=>hero(drawnHero.x,drawnHero.y,scale,time)});objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
  for(const e of effects){const age=time-e.start;if(age>900)continue;const [x,y]=pos(e.x,e.y);ctx.globalAlpha=1-age/900;for(let j=0;j<8;j++){const angle=j*Math.PI/4;rect(x+Math.cos(angle)*age/25,y+Math.sin(angle)*age/30-age/30,3,3,e.kind==='gem'?'#bdfff0':'#d1b7ef');}ctx.globalAlpha=1;}effects=effects.filter(e=>time-e.start<900);
  // Светлячки и мягкая виньетка.
  for(let i=0;i<12;i++){const x=random(i,4)*w+Math.sin(time/2500+i)*6,y=random(i,8)*h+Math.cos(time/2000+i)*8;ctx.globalAlpha=.2+(Math.sin(time/600+i)+1)*.2;rect(x,y,2,2,'#d2e79b');}ctx.globalAlpha=1;
  const vignette=ctx.createRadialGradient(w/2,h/2,h*.15,w/2,h/2,w*.7);vignette.addColorStop(0,'#0b1b1200');vignette.addColorStop(1,'#081c1b99');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
}
async function init(){try{const response=await fetch('/api/levels');if(!response.ok)throw Error('Нет соединения с игрой');levels=await response.json();const remembered=Number.isInteger(save.last)&&accessible(save.last)?save.last:0;loadLevel(Math.min(Math.max(remembered,0),levels.length-1));requestAnimationFrame(draw);if(!storageOK)$('codeStatus').textContent='Сохранение недоступно — скачай прогресс';}catch(error){$('title').textContent='Лес ждёт запуска';$('story').textContent='Открой файл «Запустить игру.command» в папке Education. Не открывай index.html напрямую.';$('runButton').disabled=true;log(error.message,'error');}}
init();

// Автодополнение методов героя. Сохраняет обычное поведение редактора вне списка.
(() => {
  const editor = document.getElementById('code');
  const methods = [
    ['move_right', 'steps=1', 'Шаг вправо. В скобках можно указать число клеток.'],
    ['move_left', 'steps=1', 'Шаг влево. Без числа — одна клетка.'],
    ['move_up', 'steps=1', 'Шаг вверх. Без числа — одна клетка.'],
    ['move_down', 'steps=1', 'Шаг вниз. Без числа — одна клетка.'],
    ['move', 'direction, steps=1', 'Шаг по направлению: "right", "left", "up" или "down".', '"right"'],
    ['collect', '', 'Подобрать кристалл на текущей клетке.'],
    ['attack', 'direction="right"', 'Атаковать соседнего стража. По умолчанию справа.'],
    ['say', 'message', 'Произнести строку, например пароль у ворот.', '"свет"'],
    ['enemy_ahead', 'direction="right"', 'True, если рядом враг. По умолчанию проверяет справа.'],
    ['gem_here', '', 'True, если под ногами есть кристалл.'],
    ['at_exit', '', 'True, если герой стоит в портале.'],
    ['path_clear', 'direction="right"', 'True, если соседняя клетка свободна. По умолчанию справа.'],
  ];
  const popup = document.createElement('div');
  popup.className = 'completions'; popup.hidden = true;
  const list = document.createElement('div');
  list.id = 'hero-completions'; list.className = 'completion-list';
  list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Доступные команды героя');
  const help = document.createElement('div'); help.className = 'completion-help';
  help.textContent = '↑ ↓ выбрать · Enter / Tab вставить · Esc закрыть';
  popup.append(list, help); document.body.append(popup);
  editor.setAttribute('aria-autocomplete', 'list');
  editor.setAttribute('aria-controls', list.id);
  let matches = [], selected = 0, context = null, inserting = false;
  function close() { popup.hidden = true; editor.removeAttribute('aria-activedescendant'); context = null; }
  // Не предлагаем команды внутри комментариев и строк, включая многострочные.
  function inCode(text) {
    let quote = '', triple = false, comment = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (comment) { if (c === '\n') comment = false; continue; }
      if (quote) {
        if (c === '\\') { i++; continue; }
        if (triple && text.slice(i, i + 3) === quote.repeat(3)) { quote = ''; triple = false; i += 2; }
        else if (!triple && c === quote) quote = '';
      } else if (c === '#') comment = true;
      else if (c === '"' || c === "'") { quote = c; triple = text.slice(i, i + 3) === c.repeat(3); if (triple) i += 2; }
    }
    return !quote && !comment;
  }
  function getContext() {
    if (editor.selectionStart !== editor.selectionEnd) return null;
    const pos = editor.selectionStart, before = editor.value.slice(0, pos);
    const match = before.match(/(?:^|[^\p{L}\p{N}_.])hero\.([a-z_]*)$/u);
    if (!match || !inCode(before)) return null;
    const tail = editor.value.slice(pos).match(/^[a-z_]*/)[0];
    return { start: pos - match[1].length, end: pos + tail.length, prefix: match[1] };
  }
  function position() {
    if (popup.hidden) return;
    const box = editor.getBoundingClientRect(), style = getComputedStyle(editor);
    const mirror = document.createElement('div');
    Object.assign(mirror.style, { position:'fixed', visibility:'hidden', whiteSpace:'pre', font:style.font, letterSpacing:style.letterSpacing, tabSize:style.tabSize });
    mirror.textContent = editor.value.slice(0, editor.selectionStart).split('\n').pop();
    document.body.append(mirror); const width = mirror.getBoundingClientRect().width; mirror.remove();
    const row = editor.value.slice(0, editor.selectionStart).split('\n').length - 1;
    const lineHeight = parseFloat(style.lineHeight);
    const x = box.left + parseFloat(style.paddingLeft) + width - editor.scrollLeft;
    const y = box.top + parseFloat(style.paddingTop) + row * lineHeight - editor.scrollTop;
    if (y < box.top - lineHeight || y > box.bottom || box.bottom < 0 || box.top > innerHeight) { close(); return; }
    popup.style.width = Math.min(390, innerWidth - 24) + 'px';
    popup.style.left = Math.max(12, Math.min(x, innerWidth - popup.offsetWidth - 12)) + 'px';
    const below = y + lineHeight + 5;
    popup.style.top = Math.max(8, below + popup.offsetHeight > innerHeight - 12 ? y - popup.offsetHeight - 5 : below) + 'px';
  }
  function highlight() {
    [...list.children].forEach((item, i) => item.setAttribute('aria-selected', String(i === selected)));
    const active = list.children[selected];
    if (active) { editor.setAttribute('aria-activedescendant', active.id); active.scrollIntoView({ block:'nearest' }); }
  }
  function update() {
    if (inserting || document.activeElement !== editor) return;
    const next = getContext(); if (!next) { close(); return; }
    const previous = matches[selected]?.[0]; context = next;
    matches = methods.filter(m => m[0].startsWith(context.prefix));
    if (!matches.length) { close(); return; }
    selected = Math.max(0, matches.findIndex(m => m[0] === previous));
    list.replaceChildren(...matches.map((m, i) => {
      const item = document.createElement('div'); item.className = 'completion-option';
      item.id = 'hero-method-' + m[0]; item.setAttribute('role', 'option');
      const signature = document.createElement('code'); signature.textContent = m[0] + '(' + m[1] + ')';
      const description = document.createElement('span'); description.textContent = m[2];
      item.append(signature, description);
      item.addEventListener('mousedown', e => { e.preventDefault(); selected = i; accept(); });
      return item;
    }));
    popup.hidden = false; position(); if (!popup.hidden) highlight();
  }
  function accept() {
    const active = matches[selected], currentContext = getContext();
    if (!active || !currentContext) { close(); return; }
    const { start, end } = currentContext;
    const hasParens = /^\s*\(/.test(editor.value.slice(end));
    const argument = active[3] || '';
    const text = active[0] + (hasParens ? '' : '(' + argument + ')');
    inserting = true;
    editor.setRangeText(text, start, end, 'end');
    if (!hasParens && active[1]) {
      const caret = start + active[0].length + 1;
      editor.setSelectionRange(caret, caret + argument.length);
    }
    close(); editor.dispatchEvent(new Event('input', { bubbles:true })); inserting = false;
    editor.focus();
  }
  editor.addEventListener('input', update);
  editor.addEventListener('click', update);
  editor.addEventListener('keyup', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) update(); });
  editor.addEventListener('blur', close);
  editor.addEventListener('scroll', close);
  window.addEventListener('resize', close);
  window.addEventListener('scroll', e => { if (!popup.contains(e.target)) close(); }, true);
  editor.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); update(); return; }
    if (popup.hidden) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { close(); return; }
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key) && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter' || e.key === 'Tab') accept();
      else { selected = (selected + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length; highlight(); }
    }
  }, true);
})();

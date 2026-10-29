const $=s=>document.querySelector(s), APP=$('#app');
const RN={imp:'🔪 Impostor',doc:'🩺 Médico',det:'🔍 Detetive',inn:'🙂 Inocente'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PCFG={config:{iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478']},{urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turn:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}]}};
let pre='';
function keepAwake(){try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode)keepAwake()});
let mode=null,S=null,view=null,net={peer:null,conns:{},conn:null},cur=null,sel=null,name='';

/* ================= MOTOR (roda no anfitrião) ================= */
function newState(){S={phase:'lobby',round:0,players:[],set:{imp:1,doc:1,det:1},act:{},votes:{},need:new Set(),lines:[],end:null,code:''}}
const alive=()=>S.players.filter(p=>p.alive);
const P=id=>S.players.find(p=>p.id==id);
let botN=0;
function addPlayer(id,nm,bot,owner){if(S.players.length>=50)return false;S.players.push({id,name:nm,owner:owner||id,bot:!!bot,role:'inn',alive:true,notes:[]});return true}
function validate(){const n=S.players.length,{imp,doc,det}=S.set;
 if(n<4)return'Mínimo de 4 jogadores (adicione bots se precisar).';
 if(imp<1)return'Precisa de pelo menos 1 impostor.';
 if(imp+doc+det>n)return'Há mais funções do que jogadores.';
 if(imp*2>=n)return'Impostores demais: precisam ser menos que os demais.';return''}
function startGame(){const e=validate();if(e)return alert(e);
 const a=shuffle(S.players),{imp,doc,det}=S.set;
 a.forEach((p,i)=>{p.alive=true;p.notes=[];p.role=i<imp?'imp':i<imp+doc?'doc':i<imp+doc+det?'det':'inn'});
 S.round=0;S.end=null;S.lines=[];startNight()}
function startNight(){S.phase='night';S.round++;S.act={};S.lines=[];S.need=new Set(alive().map(p=>p.id));autoBots();sync()}
function startVote(){S.phase='vote';S.votes={};S.lines=[];S.need=new Set(alive().map(p=>p.id));autoBots();sync()}
function shuffle(x){const a=[...x];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function rnd(a){return a[Math.floor(Math.random()*a.length)]}
function autoBots(){[...S.need].forEach(id=>{const p=P(id);if(!p.bot)return;
 const t=alive().filter(x=>S.phase=='vote'||p.role=='doc'||x.id!=p.id).filter(x=>x.id!=p.id||p.role=='doc'&&S.phase=='night');
 submit(id,p.role=='inn'&&S.phase=='night'?null:rnd(t).id,true)});}
function submit(id,t,quiet){if(!S.need.has(id))return;const p=P(id);
 if(t!=null){const q=P(t);if(!q||!q.alive||(q.id==id&&!(S.phase=='night'&&p.role=='doc')))return}
 (S.phase=='night'?S.act:S.votes)[id]=t;S.need.delete(id);
 if(!S.need.size){S.phase=='night'?resolveNight():resolveVote()}else if(!quiet)sync()}
function force(){[...S.need].forEach(id=>{const p=P(id),t=alive().filter(x=>x.id!=id);submit(id,p.role=='inn'&&S.phase=='night'?null:rnd(t).id,true)})}
function win(){const I=alive().filter(p=>p.role=='imp').length,O=alive().length-I;
 return I==0?'Inocentes':I>=O?'Impostores':null}
function resolveNight(){const A=S.act,L=S.lines=[`🌅 Rodada ${S.round} — amanheceu na cidade...`],tally={};
 alive().filter(p=>p.role=='imp'&&A[p.id]).forEach(p=>tally[A[p.id]]=(tally[A[p.id]]||0)+1);
 let v=null,m=0;shuffle(Object.keys(tally)).forEach(k=>{if(tally[k]>m){m=tally[k];v=k}});
 const docs=alive().filter(p=>p.role=='doc'),saved=docs.filter(p=>v&&A[p.id]==v).length;
 const dets=alive().filter(p=>p.role=='det');let hits=0;
 dets.forEach(d=>{const t=P(A[d.id]);if(!t)return;const f=t.role=='imp';if(f)hits++;
  d.notes.push(`Rodada ${S.round}: ${t.name} ${f?'É IMPOSTOR! 🎯':'não é impostor.'}`)});
 if(v&&!saved){P(v).alive=false;L.push(`💀 ${P(v).name} foi eliminado(a) durante a noite.`)}
 else if(v)L.push('🩺 Alguém foi atacado, mas o médico salvou a vítima! Ninguém morreu.');
 else L.push('Ninguém foi atacado esta noite.');
 if(dets.length)L.push(`🔍 Detetives: ${hits} de ${dets.length} acertaram o impostor.`);
 if(docs.length)L.push(saved?`🩺 ${saved} de ${docs.length} médico(s) salvaram a vítima.`:'🩺 O médico não conseguiu salvar ninguém.');
 finish('dawn')}
function resolveVote(){const c={};Object.values(S.votes).forEach(t=>t&&(c[t]=(c[t]||0)+1));
 const L=S.lines=['🗳️ Resultado da votação:'];
 Object.keys(c).sort((a,b)=>c[b]-c[a]).forEach(k=>L.push(`${P(k).name}: ${c[k]} voto(s)`));
 const mx=Math.max(0,...Object.values(c)),top=Object.keys(c).filter(k=>c[k]==mx);
 if(top.length==1){const p=P(top[0]);p.alive=false;L.push(`⚖️ ${p.name} foi eliminado(a) — ${p.role=='imp'?'era um IMPOSTOR!':'NÃO era impostor.'}`)}
 else L.push('⚖️ Empate! Ninguém foi eliminado.');
 finish('vres')}
function finish(ph){const w=win();S.need=new Set();if(w){S.phase='end';S.end=w}else S.phase=ph;sync()}
function viewFor(id,dev){const p=id&&P(id);
 const v={phase:S.phase,round:S.round,players:S.players.map(x=>({id:x.id,name:x.name,alive:x.alive,bot:x.bot,role:S.phase=='end'?x.role:null})),
 me:p?{id:p.id,name:p.name,role:p.role,alive:p.alive,notes:p.notes}:null,
 prompt:p&&S.need.has(id)?S.phase:null,lines:S.lines,end:S.end,set:S.set,host:dev?dev=='host':(!id||id=='host'),wait:S.need.size,code:S.code,err:validate(),mode};
 if(dev)v.mine=S.players.filter(x=>x.owner==dev&&!x.bot).map(x=>({id:x.id,name:x.name,role:x.role,alive:x.alive,notes:x.notes,prompt:S.need.has(x.id)?S.phase:null,main:x.id==dev}));
 return v}
function sync(){
 Object.keys(net.conns).forEach(d=>{const c=net.conns[d];if(c&&c.open)c.send({t:'v',v:viewFor(d,d)})});
 view=mode=='local'?viewFor(cur):viewFor('host','host');render()}

/* ================= REDE ================= */
function onMsg(id,m){if(!S)return;
 if(m.t=='act'||m.t=='vote'){const pid=m.pid||id,p=P(pid);if(!p||p.owner!=id||p.bot)return;submit(pid,m.target)}
 else if(m.t=='addp'){const nm=String(m.name||'').trim().slice(0,16);if(S.phase!='lobby'||!nm)return;if(!addPlayer('x'+Date.now()+Math.random().toString(36).slice(2,6),nm,false,id)){const c=net.conns[id];c&&c.open&&c.send({t:'err2',m:'A sala está cheia.'})}sync()}
 else if(m.t=='rmp'){const p=P(m.id);if(S.phase!='lobby'||!p||p.owner!=id||p.id==id)return;S.players=S.players.filter(x=>x!=p);sync()}}
function hostOnline(){newState();S.code=Math.random().toString(36).slice(2,7).toUpperCase();
 net.peer=new Peer('crimenoturno-'+S.code,PCFG);
 net.peer.on('open',()=>{addPlayer('host',name);sync()});
 net.peer.on('disconnected',()=>{try{net.peer.reconnect()}catch(e){}});
 net.peer.on('error',e=>{if(e.type=='unavailable-id')hostOnline();else alert('Erro de conexão: '+e.type)});
 net.peer.on('connection',c=>{
  c.on('data',m=>{
   if(m.t=='join'){if(S.phase!='lobby'||S.players.length>=50){c.send({t:'err',m:'Sala cheia ou jogo já iniciado.'});return}
    net.conns[c.peer]=c;addPlayer(c.peer,(m.name||'Jogador').slice(0,16));sync()}
   else onMsg(c.peer,m)});
  c.on('close',()=>{const own=S.players.filter(x=>x.owner==c.peer);if(!own.length)return;delete net.conns[c.peer];if(S.phase=='lobby')S.players=S.players.filter(x=>x.owner!=c.peer);else{own.forEach(p=>p.bot=true);autoBots()}sync()})})}
function joinOnline(code){net.peer=new Peer(undefined,PCFG);
 net.to=setTimeout(()=>{alert('Tempo esgotado. Confira o código e a internet dos dois aparelhos.');home()},20000);
 net.peer.on('open',()=>{const c=net.conn=net.peer.connect('crimenoturno-'+code.toUpperCase().trim(),{reliable:true});
  c.on('open',()=>{clearTimeout(net.to);c.send({t:'join',name})});
  c.on('data',m=>{if(m.t=='v'){view=m.v;render()}else if(m.t=='err'){alert(m.m);home()}else if(m.t=='err2')alert(m.m)});
  c.on('close',()=>{alert('Conexão com a sala encerrada.');home()})});
 net.peer.on('error',e=>{alert('Não foi possível entrar na sala ('+e.type+').');home()})}
function myPl(){const v=view;if(mode!='online')return v.me;const mn=v.mine||[];
 if(mn.length>1){if(cur&&!mn.find(x=>x.id==cur&&x.prompt))cur=null;return cur?mn.find(x=>x.id==cur):null}
 return mn[0]||v.me}
function act(type,t){const me=myPl();if(!me)return;
 if(mode=='online'&&!view.host){net.conn.send({t:type,target:t,pid:me.id});const m=view.mine.find(x=>x.id==me.id);if(m)m.prompt=null;cur=null;sel=null;render();return}
 const id=mode=='local'?cur:me.id;cur=null;sel=null;submit(id,t)}

/* ================= TELAS ================= */
function home(){clearTimeout(net.to);mode=null;S=null;view=null;cur=null;try{net.peer&&net.peer.destroy()}catch(e){}net={peer:null,conns:{},conn:null};render()}
function stepper(k,l){return`<div class="row"><span>${l}</span><div><button onclick="S.set.${k}=Math.max(0,S.set.${k}-1);sync()">−</button> <b>${S.set[k]}</b> <button onclick="S.set.${k}++;sync()">+</button></div></div>`}
function plist(v){return`<div class="pl">${v.players.map(p=>`<span class="tag ${p.alive?'':'dead'}"><i>${p.bot?'🤖':esc(p.name[0]||'?').toUpperCase()}</i>${esc(p.name)}${v.phase=='end'&&p.role?' · '+RN[p.role]:''}</span>`).join('')}</div>`}
function render(){let h='<div class="moon"></div><h1>Crime Noturno</h1><p class="sub">// dedução social online</p>';const v=view;
 if(!mode){h+=`<div class="card"><button class="p big" onclick="menu('online')">🌐 Modo Online</button><button class="big" onclick="menu('local')">📱 Modo Local</button><p class="mut">Online: de 1 a 50 pessoas em salas (cada celular pode ter vários jogadores, e você pode usar bots para completar). Local: um único aparelho passado de mão em mão.</p></div>`}
 else if(!v&&mode=='online'){h+=`<div class="card"><h2>Modo Online</h2><input id="nm" placeholder="Seu nome" maxlength="16" value="${esc(name)}"><button class="p big" onclick="goOnline('create')">Criar sala</button><input id="cd" placeholder="Código da sala" maxlength="5" style="text-transform:uppercase" value="${pre}"><button class="big" onclick="goOnline('join')">Entrar na sala</button><button onclick="home()">← Voltar</button></div>`}
 else if(!v&&mode=='local'){newState();h+=''}
 else h+=game(v);
 const ol=$('#ln'),lv=ol?ol.value:'',lf=ol&&document.activeElement==ol,ls=lf?ol.selectionStart:0;
 APP.innerHTML=h;document.body.dataset.ph=(view&&mode)?view.phase:'home';
 const nl=$('#ln');if(nl&&lv){nl.value=lv;if(lf){nl.focus();try{nl.setSelectionRange(ls,ls)}catch(e){}}}else if(nl&&lf)nl.focus()}
function menu(m){mode=m;keepAwake();if(m=='local'){newState();sync()}else render()}
function goOnline(w){name=($('#nm').value||'').trim();if(!name)return alert('Digite seu nome.');
 if(w=='create')hostOnline();else{const c=$('#cd').value;if(!c)return alert('Digite o código.');joinOnline(c);APP.innerHTML+='<p class="mut">Conectando...</p>'}}
function share(){const u=location.origin+location.pathname+'?sala='+view.code;
 if(navigator.share)navigator.share({title:'Crime Noturno',text:'Entre na minha sala!',url:u}).catch(()=>{});
 else if(navigator.clipboard)navigator.clipboard.writeText(u).then(()=>alert('Link copiado! Envie para seus amigos.'));else prompt('Copie o link:',u)}
function addLocal(){const i=$('#ln'),nm=i.value.trim().slice(0,16);if(!nm)return;
 if(mode=='online'&&!view.host){net.conn.send({t:'addp',name:nm});i.value='';i.focus();return}
 if(!addPlayer('p'+Date.now()+Math.random(),nm,false,mode=='online'?'host':undefined))alert('A sala está cheia.');i.value=''; sync();const n=$('#ln');n&&n.focus()}
function rmp(id){if(mode=='online'&&!view.host){net.conn.send({t:'rmp',id});return}
 const p=P(id);if(!p||(mode=='online'&&p.owner!='host')||p.id=='host')return;S.players=S.players.filter(x=>x!=p);sync()}
function addBot(){botN++;addPlayer('bot'+botN+Date.now(),'Bot '+botN,true);sync()}
function rm(id){S.players=S.players.filter(p=>p.id!=id);sync()}
function addUI(v){const ex=(v.mine||[]).filter(x=>!x.main);
 return`<div style="margin:12px 0 4px"><h2 style="font-size:1rem">📱 Neste celular</h2><p class="mut">Adicione amigos para jogarem neste mesmo aparelho: basta digitar o nome. Na hora de agir, o celular é passado de mão em mão.</p>
 ${ex.length?`<div class="pl">${ex.map(x=>`<span class="tag"><i>${esc(x.name[0]||'?').toUpperCase()}</i>${esc(x.name)}<b onclick="rmp('${x.id}')" style="cursor:pointer;padding:6px 4px 6px 8px" aria-label="Remover">✕</b></span>`).join('')}</div>`:''}
 <input id="ln" placeholder="Nome do jogador" maxlength="16" onkeydown="if(event.key=='Enter')addLocal()"><button onclick="addLocal()">+ Adicionar jogador neste celular</button></div>`}
function game(v){let h='';
 if(v.phase=='lobby'){
  if(mode=='online')h+=`<div class="card"><div class="mut" style="text-align:center">Código da sala</div><div class="code">${v.code}</div><button class="big" onclick="share()">🔗 Copiar link da sala</button></div>`;
  h+=`<div class="card"><h2>Jogadores (${v.players.length}/50)</h2>${plist(v)}`;
  if(v.host){
   if(mode=='local')h+=`<input id="ln" placeholder="Nome do jogador" maxlength="16"><button onclick="addLocal()">+ Adicionar jogador</button> `;
   else h+=addUI(v);
   h+=`<button onclick="addBot()">🤖 + Bot</button> <button onclick="S.players=S.players.filter(p=>!p.bot);sync()">Remover bots</button></div>
   <div class="card"><h2>Funções</h2>${stepper('imp','🔪 Impostores')}${stepper('doc','🩺 Médicos')}${stepper('det','🔍 Detetives')}
   <div class="row"><span>🙂 Inocentes</span><b>${Math.max(0,v.players.length-v.set.imp-v.set.doc-v.set.det)}</b></div>
   ${v.err?`<p class="mut" style="color:var(--bad)">${v.err}</p>`:''}<button class="p big" onclick="startGame()" ${v.err?'disabled':''}>▶ Iniciar jogo</button></div>`;
  }else h+=addUI(v)+`<p class="mut">Aguardando o anfitrião iniciar...</p></div>`;
  return h+`<button onclick="home()">← Sair</button>`}
 // em jogo
 let me=v.me;
 if(mode=='online'){me=myPl();v.prompt=me?me.prompt:null;
  if((v.phase=='night'||v.phase=='vote')&&!me&&(v.mine||[]).length>1){
   const nx=v.mine.find(x=>x.prompt);
   if(nx)return h+`<div class="card" style="text-align:center"><h2 style="justify-content:center">Passe o celular para</h2><div class="win">${esc(nx.name)}</div><p class="mut">Os outros não podem olhar a tela!</p><button class="p big" onclick="cur='${nx.id}';render()">Sou eu, continuar</button></div>`}}
 if(mode=='local'&&(v.phase=='night'||v.phase=='vote')&&!cur){
  const nx=S.players.find(p=>S.need.has(p.id)&&!p.bot);
  if(nx)return h+`<div class="card" style="text-align:center"><h2>Passe o aparelho para</h2><div class="win">${esc(nx.name)}</div><p class="mut">Os outros não podem olhar a tela!</p><button class="p big" onclick="cur='${nx.id}';sync()">Sou eu, continuar</button></div>`;
  return h+'<p>Processando...</p>'}
 h+=`<div class="card"><div class="mut">Rodada ${v.round}</div>${plist(v)}</div>`;
 if(me&&v.phase!='end')h+=`<div class="role r-${me.role}${me.alive?'':' ghost'}">${me.alive?`Você é: <b>${RN[me.role]}</b>`:'☠️ Você foi eliminado(a) — assista em silêncio'}</div>${me.notes.length?`<div class="card"><h2>🔍 Suas investigações</h2>${me.notes.map(n=>`<div class="line">${esc(n)}</div>`).join('')}</div>`:''}`;
 if(v.phase=='night'||v.phase=='vote'){
  if(v.prompt){const night=v.phase=='night',r=me.role;
   const tg=v.players.filter(p=>p.alive&&(p.id!=me.id||(night&&r=='doc')));
   const title=!night?'🗳️ Quem você acha que é o impostor?':r=='imp'?'🔪 Quem você quer eliminar?':r=='doc'?'🩺 Quem você quer salvar?':r=='det'?'🔍 Quem você quer investigar?':'🙂 Você é inocente. A cidade dorme...';
   const needs=!night||r!='inn';
   h+=`<div class="card"><h2>${title}</h2>${needs?`<div class="grid">${tg.map(p=>`<button class="${sel==p.id?'sel':''}" onclick="sel='${p.id}';render()">${esc(p.name)}</button>`).join('')}</div>`:''}
   <button class="p big" ${needs&&!sel?'disabled':''} onclick="act('${night?'act':'vote'}',${needs?'sel':'null'})">${needs?'Confirmar':'😴 Dormir'}</button></div>`}
  else h+=`<div class="card" style="text-align:center"><div class="spin"></div><h2 style="justify-content:center">${v.phase=='night'?'🌙 A cidade dorme...':'🗳️ Votação em andamento'}</h2><p class="mut">Aguardando ${v.wait} jogador(es)...</p></div>`;
  if(v.host&&(mode=='online'))h+=`<button onclick="force()">⏭ Forçar fim da espera (jogadores lentos agem aleatoriamente)</button>`}
 else{
  h+=`<div class="card">${v.lines.map(l=>`<div class="line">${esc(l)}</div>`).join('')}</div>`;
  if(v.phase=='end')h+=`<div class="card"><div class="win">🏆 ${v.end} venceram!</div></div>`;
  if(v.host){h+=v.phase=='dawn'?`<button class="p big" onclick="startVote()">🗳️ Ir para a votação</button><p class="mut">Discutam antes de votar (use chamada de voz).</p>`
   :v.phase=='vres'?`<button class="p big" onclick="startNight()">🌙 Próxima noite</button>`
   :`<button class="p big" onclick="S.phase='lobby';S.players.forEach(p=>p.alive=true);sync()">↺ Voltar ao lobby</button>`}
  else h+=`<p class="mut" style="text-align:center">Aguardando o anfitrião...</p>`}
 return h+`<button onclick="if(confirm('Sair da partida?'))home()">← Sair</button>`}
const q=new URLSearchParams(location.search).get('sala');if(q){mode='online';pre=q.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5)}
render();

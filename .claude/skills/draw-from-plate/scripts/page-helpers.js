// In-page helpers for drawing in the Cartographer from a script — inject with the browser JavaScript tool,
// then `await __d.calib()`. Geography in, screen events out: every gesture is a real pointer event on the
// canvas, so the Pen decides exactly as it does under a hand. Read `__d.status()` after each step.
window.__d = {
 parse(t){ const m=t.match(/(\d+)°(\d+)′([EO])\s+(\d+)°(\d+)′([NS])/); let lo=+m[1]+m[2]/60; if(m[3]==='O') lo=-lo; let la=+m[4]+m[5]/60; if(m[6]==='S') la=-la; return [lo,la]; },
 M(p){ return Math.log(Math.tan(Math.PI/4+p*Math.PI/360)); },
 frame(){ return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); },
 canvas(){ return [...document.querySelectorAll('canvas')].find(c=>getComputedStyle(c).pointerEvents!=='none'); },
 async move(x,y){ this.canvas().dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true})); await this.frame(); },
 status(){ return { action: document.querySelector('.shell__action').textContent, result: document.querySelector('.shell__result').textContent, pos: document.querySelector('.shell__position').textContent }; },
 async calib(){ const r=this.canvas().getBoundingClientRect(); const p1=[r.left+150,r.top+120], p2=[r.right-150,r.bottom-120];
   await this.move(...p1); const g1=this.parse(this.status().pos); await this.move(...p2); const g2=this.parse(this.status().pos);
   this.C=(p2[0]-p1[0])/(g2[0]-g1[0]); this.D=p1[0]-this.C*g1[0]; this.A=(p2[1]-p1[1])/(this.M(g2[1])-this.M(g1[1])); this.B=p1[1]-this.A*this.M(g1[1]); this.rect=r; return {g1,g2}; },
 css(lo,la){ return [this.C*lo+this.D, this.A*this.M(la)+this.B]; },
 visible(lo,la){ const [x,y]=this.css(lo,la), r=this.rect; return x>r.left+20&&x<r.right-20&&y>r.top+20&&y<r.bottom-20; },
 async click(lo,la){ const [x,y]=this.css(lo,la); const cv=this.canvas(); await this.move(x,y); await this.frame(); const before=this.status().action;
   const o={clientX:x,clientY:y,bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:1};
   cv.dispatchEvent(new PointerEvent('pointerdown',o)); await this.frame(); cv.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0})); cv.dispatchEvent(new MouseEvent('click',{...o,buttons:0})); await this.frame();
   return {at:[lo,la], before, result:this.status().result}; },
 async pan(key,n){ const cv=this.canvas(); cv.focus(); for(let i=0;i<n;i++){ cv.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})); await this.frame(); } return await this.calib(); },
 async show(lo,la){ for(let k=0;k<60&&!this.visible(lo,la);k++){ const [x,y]=this.css(lo,la), r=this.rect; const key = y<r.top+40?'ArrowUp': y>r.bottom-40?'ArrowDown': x<r.left+40?'ArrowLeft':'ArrowRight'; await this.pan(key,2); } },
 async hoverAt(lo,la){ await this.show(lo,la); const [x,y]=this.css(lo,la); await this.move(x,y); await this.frame(); return this.status().action; },
 async coast(lo,la){ await this.show(lo,la); for(const rad of [0,0.02,0.04,0.06,0.08,0.1]){ const steps= rad===0?1:16; for(let k=0;k<steps;k++){ const a=2*Math.PI*k/steps, p=[lo+rad*Math.cos(a)/Math.cos(la*Math.PI/180), la+rad*Math.sin(a)]; if(!this.visible(...p)) continue; const [x,y]=this.css(...p); await this.move(x,y); await this.frame(); if(/^Following the coastline/.test(this.status().action)) return await this.click(...p); } } return {fail:[lo,la], action:this.status().action}; },
 async newPolity(name){ document.querySelector('button[aria-label="New polity"]').click(); await new Promise(r=>setTimeout(r,400)); const inp=document.querySelector('dialog[open] input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inp,name); inp.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,200)); [...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()==='OK').click(); await new Promise(r=>setTimeout(r,400)); await this.calib(); },
 async select(name){ const el=[...document.querySelectorAll('.shell__dock [role=option]')].find(e=>e.textContent.startsWith(name)); if(!el) return false; el.click(); await new Promise(r=>setTimeout(r,300)); return true; },
 async del(){ document.querySelector('button[aria-label="Delete polity"]').click(); await new Promise(r=>setTimeout(r,400)); [...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()==='Delete').click(); await new Promise(r=>setTimeout(r,400)); },
 async save(){ this.canvas().dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true})); await new Promise(r=>setTimeout(r,1500)); return this.status().result; },
 // One logged step: hover, read the sentence, click. Compose a polity from these when the plan is wrong.
 async step(p,log){ const h=await this.hoverAt(...p); const r=await this.click(...p); if(log) log.push(p.map(v=>(+v).toFixed(4)).join(',')+' | '+h.slice(0,40)+' | '+r.result); return r; },
 // Row centres of {Polities}, in screenshot coordinates — where to double-click for Edit polity.
 rows(){ const k=innerWidth/1568; return [...document.querySelectorAll('.shell__dock [role=option]')].map(e=>{const r=e.getBoundingClientRect(); return e.textContent.slice(0,30)+' @'+Math.round((r.top+r.height/2)/k)}); },
 // Play a plan from plan.py. A shared run clicks two anchors near its ends; a coast end may be a coast click.
 async exec(ops,E=3){ const log=[];
  for(const [k,p] of ops){
    if(k==='free'){ await this.show(...p); const r=await this.click(...p); if(/^Branching/.test(r.before)) log.push('joined anchor at '+p.map(v=>v.toFixed(2))); continue; }
    if(k==='coast'){ const r=await this.coast(...p); if(r.fail){ await this.show(...p); await this.click(...p); log.push('COAST FAIL→free '+p); } continue; }
    if(k==='close'){ const h=await this.hoverAt(...p); await this.click(...p); log.push(/^Closing/.test(h)?'closed':'close clicked (hover: '+h.slice(0,30)+')'); continue; }
    if(k==='shared'){ const n=p.length; const s0=Math.min(E,n-1), e0=Math.max(n-1-E,s0);
      const near=(c)=>{ const o=[]; for(let d=0;d<n;d++){ if(c+d<n) o.push(c+d); if(d&&c-d>=0) o.push(c-d);} return o; };
      const find=async(c,skip,re)=>{ for(const i of near(c)){ if(i===skip) continue; const h=await this.hoverAt(...p[i]); if(re.test(h)) return [i,h]; } return [null,'']; };
      let [a,ha]=await find(s0,-1,/^Branching/); if(a===null) [a,ha]=await find(s0,-1,/^Following the coastline/);
      let [b,hb]=await find(e0,a,/^Branching/); if(b===null) [b,hb]=await find(e0,a,/^Following the coastline/);
      if(a===null||b===null){ log.push('SHARED ends not found'); continue; }
      await this.hoverAt(...p[a]); await this.click(...p[a]); await this.hoverAt(...p[b]); const r=await this.click(...p[b]);
      log.push('shared '+a+'→'+b+'/'+(n-1)+' ['+ha.split(' ')[0]+'/'+hb.split(' ')[0]+']: '+r.result); }
  }
  return log; }
};
'ok'

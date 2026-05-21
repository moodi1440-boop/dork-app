// ==============================================
//  AUDIO UTILITIES - Web Audio API Synthesizer
// ==============================================

export function playTone(id, vol=0.7){
  try{
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    const ctx=new A();
    const g=ctx.createGain(); g.gain.value=vol; g.connect(ctx.destination);
    const beep=(freq,start,dur,type="sine",v=vol)=>{
      const o=ctx.createOscillator(),gn=ctx.createGain();
      o.type=type; o.frequency.value=freq;
      gn.gain.setValueAtTime(v,ctx.currentTime+start);
      gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+start+dur);
      o.connect(gn); gn.connect(ctx.destination);
      o.start(ctx.currentTime+start); o.stop(ctx.currentTime+start+dur);
    };
    const plays={
      scissors:   ()=>{ beep(1200,0,.05,"square",.6); beep(900,0.08,.05,"square",.6); beep(1200,0.16,.05,"square",.6); beep(900,0.24,.05,"square",.6); },
      razor:      ()=>{ [0,.06,.12,.18,.24].forEach(t=>beep(80+Math.random()*40,t,.07,"sawtooth",.7)); },
      bell:       ()=>{ beep(880,0,.6,"sine",.8); beep(1100,.15,.5,"sine",.6); beep(1320,.3,.8,"sine",.5); },
      cash:       ()=>{ beep(1800,0,.04,"square",.7); beep(2400,.05,.04,"square",.6); beep(1200,.12,.3,"triangle",.5); },
      welcome:    ()=>{ [523,659,784,1047].forEach((f,i)=>beep(f,i*.12,.25,"sine",.7)); },
      chime3:     ()=>{ [[880,.0],[1100,.18],[1320,.36],[1100,.54],[880,.72]].forEach(([f,t])=>beep(f,t,.25,"sine",.7)); },
      alert:      ()=>{ [0,.1,.2].forEach(t=>beep(1400,t,.08,"square",.8)); },
      classic:    ()=>{ [[440,0],[554,.15],[659,.3],[880,.5]].forEach(([f,t])=>beep(f,t,.3,"triangle",.7)); },
      barberpole: ()=>{ [440,550,660,770,880,770,660,550].forEach((f,i)=>beep(f,i*.1,.15,"sine",.6)); },
      clippers:   ()=>{ [0,.04,.08,.12,.16,.20,.24,.28].forEach(t=>beep(150+Math.random()*50,t,.05,"sawtooth",.5)); },
      towel:      ()=>{ beep(300,0,.2,"sine",.4); beep(400,.2,.3,"sine",.5); beep(500,.4,.4,"sine",.6); },
      mirror:     ()=>{ [[1047,0],[1319,.1],[1568,.2],[2093,.35]].forEach(([f,t])=>beep(f,t,.2,"sine",.7)); },
      spray:      ()=>{ [0,.05,.1,.15,.2,.25,.3].forEach(t=>beep(2000+Math.random()*500,t,.04,"square",.3)); },
      magazine:   ()=>{ beep(440,0,.1,"triangle",.5); beep(330,.15,.1,"triangle",.5); beep(440,.3,.3,"triangle",.6); },
      fanfare:    ()=>{ [[523,0],[659,.1],[784,.2],[1047,.3],[784,.5],[1047,.65]].forEach(([f,t])=>beep(f,t,.2,"square",.6)); },
      vip:        ()=>{ [[1047,0],[880,.15],[659,.3],[784,.45],[1047,.6],[1319,.8]].forEach(([f,t])=>beep(f,t,.25,"sine",.7)); },
      success:    ()=>{ beep(880,0,.1,"sine",.8); beep(1100,.12,.15,"sine",.7); },
      error:      ()=>{ beep(400,0,.1,"square",.8); beep(300,.12,.1,"square",.8); },
      notification: ()=>{ beep(1100,0,.15,"sine",.6); },
      click:      ()=>{ beep(500,0,.05,"square",.5); },
    };
    plays[id]?.();
  }catch(e){}
}

export function playSuccessSound() {
  playTone("success", 0.7);
}

export function playErrorSound() {
  playTone("error", 0.7);
}

export function playNotificationSound() {
  playTone("notification", 0.6);
}

export function playClickSound() {
  playTone("click", 0.5);
}

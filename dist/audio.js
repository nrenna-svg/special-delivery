// Special Delivery sound: a synthesized biplane engine and wind, short effects for every
// delivery moment, and a sweeping adventure theme (horn melody, string chords, harp-like
// arpeggios, timpani). Pure Web Audio, no files.
// Nothing plays until unlock() is called from a click or key press (browser autoplay rules).

export const BPM=92, STEPS_PER_BAR=8, BARS=16, LOOP_STEPS=STEPS_PER_BAR*BARS;
const CHORDS={D:[50,54,57],Bm:[47,50,54],G:[43,47,50],A:[45,49,52],'F#m':[42,45,49],E:[40,44,47]};
// D major, with a lift to E major (bar 12) for a sense of wonder before the turnaround.
const PROGRESSION=['D','D','Bm','Bm','G','G','A','A','D','F#m','G','E','Bm','G','A','A'];
// Horn melody, one token per eighth note: a note name starts a note, '-' holds it (across bars too), '.' rests.
const MELODY=[
 'D5 - - - A5 - - -','- - G5 F#5 E5 - F#5 -','D5 - - - B4 - - -','- - - - . . C#5 D5',
 'D5 - - - G5 - - -','F#5 - E5 - D5 - E5 -','C#5 - - - A4 - - -','- - - - . . C#5 E5',
 'D5 - - - A5 - - -','- - C#6 B5 A5 - F#5 -','G5 - - - D6 - - -','- - C#6 B5 G#5 - E5 -',
 'F#5 - - - B5 - - -','A5 - G5 - F#5 - E5 -','E5 - - - - - . .','A4 - C#5 - E5 - A5 -'
];
const TOKENS=MELODY.join(' ').split(' ');
const NOTE={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function noteToMidi(name){const sharp=name[1]==='#'?1:0;return 12*(Number(name.slice(-1))+1)+NOTE[name[0]]+sharp;}
export function midiToHz(m){return 440*Math.pow(2,(m-69)/12);}
const ARP=[0,1,2,1,0,2,1,2]; // chord-tone pattern for the rolling eighth-note arpeggio

// Everything that sounds on one eighth-note step of the loop (pure, so it can be tested).
export function musicEvents(step){
 step=((step%LOOP_STEPS)+LOOP_STEPS)%LOOP_STEPS;
 const bar=Math.floor(step/STEPS_PER_BAR),beat=step%STEPS_PER_BAR,chord=CHORDS[PROGRESSION[bar]],out=[];
 const tok=TOKENS[step];
 if(tok!=='-'&&tok!=='.'){let len=1;while(len<16&&TOKENS[(step+len)%LOOP_STEPS]==='-')len++;out.push({voice:'lead',midi:noteToMidi(tok),steps:len});}
 if(beat===0){out.push({voice:'pad',midis:[chord[0],...chord.map(n=>n+12)],steps:8});out.push({voice:'bass',midi:chord[0]-12,steps:4});out.push({voice:'timpani',midi:chord[0]-12,accent:bar%4===0});}
 if(beat===4)out.push({voice:'bass',midi:chord[0]-12,steps:4});
 out.push({voice:'arp',midi:chord[ARP[beat]]+12+(beat>=4&&ARP[beat]===0?12:0)});
 // Timpani roll building into the end of each half of the loop.
 if((bar===7||bar===15)&&beat>=4)out.push({voice:'timpani',midi:chord[0]-12,accent:false,roll:true});
 return out;
}

export function createAudio({context=null}={}){
 let ctx=null,master,sfxBus,musicBus,engineGain,engineOsc,engineSub,engineFilter,lfo,lfoDepth,windGain,windFilter,noiseBuffer;
 let sfxOn=true,musicOn=true,paused=false,timer=null,nextTime=0,step=0;
 try{const saved=JSON.parse(localStorage.getItem('special-delivery-audio')||'{}');if(saved.sfx===false)sfxOn=false;if(saved.music===false)musicOn=false;}catch{}
 const save=()=>{try{localStorage.setItem('special-delivery-audio',JSON.stringify({sfx:sfxOn,music:musicOn}));}catch{}};

 function build(){
  ctx=context||new AudioContext();
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(ctx.destination);
  master=ctx.createGain();master.gain.value=.9;master.connect(comp);
  sfxBus=ctx.createGain();sfxBus.gain.value=sfxOn?1:0;sfxBus.connect(master);
  musicBus=ctx.createGain();musicBus.gain.value=0;musicBus.connect(master);
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  // Engine: sawtooth + square sub-octave, muffled, with a propeller "chop" tremolo.
  engineFilter=ctx.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=380;engineFilter.Q.value=2;
  engineGain=ctx.createGain();engineGain.gain.value=0;
  const chop=ctx.createGain();chop.gain.value=.7;
  engineOsc=ctx.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=60;
  engineSub=ctx.createOscillator();engineSub.type='square';engineSub.frequency.value=30;const subGain=ctx.createGain();subGain.gain.value=.35;
  lfo=ctx.createOscillator();lfo.frequency.value=14;lfoDepth=ctx.createGain();lfoDepth.gain.value=.3;lfo.connect(lfoDepth).connect(chop.gain);
  engineOsc.connect(engineFilter);engineSub.connect(subGain).connect(engineFilter);engineFilter.connect(chop).connect(engineGain).connect(sfxBus);
  engineOsc.start();engineSub.start();lfo.start();
  // Wind: looping noise through a band-pass that opens up with airspeed.
  const wind=ctx.createBufferSource();wind.buffer=noiseBuffer;wind.loop=true;
  windFilter=ctx.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=600;windFilter.Q.value=.6;
  windGain=ctx.createGain();windGain.gain.value=0;wind.connect(windFilter).connect(windGain).connect(sfxBus);wind.start();
 }
 function unlock(){
  try{if(!ctx)build();if(ctx.state!=='running'&&!context)ctx.resume();}catch{ctx=null;return;}
  if(!timer){nextTime=ctx.currentTime+.1;timer=setInterval(schedule,25);}
  applyMusic();
 }
 function applyMusic(){if(!ctx)return;musicBus.gain.setTargetAtTime(musicOn?(paused?.08:.42):0,ctx.currentTime,.25);}

 // ── building blocks ─────────────────────────────────────────────────────────
 function tone(freq,dur,{type='sine',vol=.2,at=0,slide=null,attack=.005,bus=sfxBus}={}){
  if(!ctx)return;const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(bus);o.start(t);o.stop(t+dur+.05);
 }
 function noise(dur,{filter='lowpass',freq=1000,to=null,q=1,vol=.2,at=0,bus=sfxBus}={}){
  if(!ctx)return;const t=ctx.currentTime+at,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=noiseBuffer;s.loop=true;f.type=filter;f.frequency.setValueAtTime(freq,t);f.Q.value=q;if(to)f.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(bus);s.start(t,Math.random());s.stop(t+dur+.05);
 }
 const note=(n,dur,o={})=>tone(midiToHz(typeof n==='string'?noteToMidi(n):n),dur,o);

 // ── effects ─────────────────────────────────────────────────────────────────
 const sfx={
  drop(){noise(.09,{freq:700,vol:.3});tone(130,.16,{type:'square',vol:.07,slide:60});},
  chute(){noise(.32,{filter:'bandpass',freq:350,to:2200,q:1.4,vol:.32});tone(220,.2,{type:'triangle',vol:.05,slide:330,at:.05});},
  thud(){tone(95,.22,{vol:.4,slide:42});noise(.07,{freq:320,vol:.25});},
  stamp(at=0){noise(.06,{freq:1500,vol:.45,at});tone(170,.14,{vol:.35,slide:70,at});tone(1200,.05,{type:'square',vol:.03,at:at+.01});},
  delivered(){['C5','E5','G5','C6'].forEach((n,i)=>{note(n,.35,{type:'triangle',vol:.14,at:i*.075});note(noteToMidi(n)+12,.25,{vol:.04,at:i*.075});});note('E6',.6,{vol:.06,at:.32});sfx.stamp(.45);},
  missed(){note('E4',.22,{type:'triangle',vol:.1});note('C4',.38,{type:'triangle',vol:.1,at:.18});},
  smash(){noise(.4,{filter:'bandpass',freq:900,q:.8,vol:.4});for(let i=0;i<5;i++)noise(.05,{filter:'highpass',freq:2500,vol:.18,at:.04+i*.05+Math.random()*.03});tone(80,.25,{vol:.3,slide:40});},
  refill(){['G5','B5','D6','G6'].forEach((n,i)=>note(n,.4,{vol:.09,at:i*.09}));noise(.5,{filter:'highpass',freq:4000,to:9000,vol:.05});},
  whoosh(){noise(.75,{filter:'bandpass',freq:300,to:1600,q:.9,vol:.22});},
  complete(){[['C5',0],['E5',.14],['G5',.28],['C6',.42],['G5',.62],['C6',.76],['E6',.9]].forEach(([n,t],i)=>{note(n,i===6?1.1:.3,{type:'triangle',vol:.15,at:t});note(noteToMidi(n)-12,.3,{type:'sine',vol:.08,at:t});});noise(1.2,{filter:'highpass',freq:6000,vol:.04,at:.9});},
  touchdown(hard=false){tone(hard?70:90,.3,{vol:hard?.5:.3,slide:40});noise(hard?.35:.18,{filter:'bandpass',freq:hard?600:1800,q:1.5,vol:hard?.35:.18,at:.02});},
  ring(streak=1){const base=72+Math.min(4,streak)*2;[0,4,7].forEach((d,i)=>note(base+d+12,.4,{type:'triangle',vol:.09,at:i*.05}));note(base+24,.5,{vol:.03,at:.12});},
  squawk(){for(let i=0;i<3;i++)tone(900+Math.random()*500,.12,{type:'sawtooth',vol:.05,at:i*.09,slide:500+Math.random()*300});noise(.15,{filter:'bandpass',freq:1200,vol:.25});tone(70,.2,{vol:.35,slide:40});},
  thunder(dist=60){const at=Math.min(1.2,dist/220),v=Math.max(.08,Math.min(.5,30/dist));noise(1.8,{freq:220,to:80,vol:v,at});noise(.25,{freq:1400,vol:v*.6,at});},
  snag(){noise(.3,{filter:'bandpass',freq:600,to:2400,q:2,vol:.25});tone(180,.2,{type:'square',vol:.08,at:.18,slide:90});['G5','D6'].forEach((n,i)=>note(n,.3,{type:'triangle',vol:.09,at:.25+i*.08}));},
  winch(){noise(.05,{filter:'bandpass',freq:2600,q:4,vol:.06});tone(520,.03,{type:'square',vol:.015});},
  warn(){tone(880,.12,{type:'square',vol:.06});},
  lowfuel(){tone(660,.18,{type:'square',vol:.06});tone(440,.25,{type:'square',vol:.06,at:.2});},
  engineOut(){noise(.5,{freq:300,to:80,vol:.25});tone(90,.8,{type:'sawtooth',vol:.08,slide:30});},
  crash(){noise(1.4,{freq:900,to:90,vol:.6});tone(70,.9,{vol:.5,slide:30});for(let i=0;i<7;i++)noise(.08,{filter:'highpass',freq:3000,vol:.2,at:.1+i*.09+Math.random()*.05});},
  horn(type){const f=type==='cargo'?70:type==='tug'?110:type==='sail'?330:150;tone(f,1.1,{type:'sawtooth',vol:.05,attack:.08});tone(f*1.5,1.1,{type:'sawtooth',vol:.03,attack:.08});},
  tick(){tone(1400,.05,{type:'square',vol:.05});},
  // Air defences (v0.80).
  radar(){tone(1800,.08,{type:'sine',vol:.05});tone(1800,.08,{type:'sine',vol:.035,at:.16});},
  lockBeep(level=0){tone(1000+level*500,.07,{type:'square',vol:.05});},
  missileWarn(){tone(2100,.05,{type:'square',vol:.06});},
  launch(){noise(1.1,{filter:'bandpass',freq:500,to:2600,q:.9,vol:.35});tone(140,.5,{type:'sawtooth',vol:.08,slide:70});},
  boom(size=1){noise(.9+size*.6,{freq:900*size,to:70,vol:.35+.25*size});tone(60,.7,{vol:.35*size,slide:30});},
  flak(dist=20){const v=Math.max(.06,Math.min(.4,8/Math.max(1,dist)));noise(.35,{freq:700,to:120,vol:v});tone(85,.25,{vol:v*.8,slide:45});},
  flare(){for(let k=0;k<2;k++){noise(.12,{filter:'highpass',freq:1800,vol:.25,at:k*.08});tone(900,.15,{type:'triangle',vol:.04,at:k*.08,slide:400});}},
  // Workshop sounds for plane upgrades (v0.76): drills, hammers, ratchets and an impact wrench.
  drill(at=0,dur=.9){const f=260+Math.random()*80;tone(f*.6,.18,{type:'sawtooth',vol:.05,at,slide:f});for(let k=0;k<Math.round(dur/.12);k++)tone(f*(1+k%2*.04),.14,{type:'sawtooth',vol:.045,at:at+.15+k*.12,attack:.01});tone(f,.25,{type:'sawtooth',vol:.04,at:at+dur,slide:f*.5});noise(dur+.2,{filter:'bandpass',freq:2600,q:3,vol:.06,at});},
  hammer(at=0){tone(1900+Math.random()*700,.32,{type:'triangle',vol:.09,at});tone(3100+Math.random()*500,.18,{vol:.04,at});noise(.05,{filter:'highpass',freq:3500,vol:.3,at});tone(120,.08,{vol:.18,at,slide:70});},
  ratchet(at=0,clicks=7){for(let k=0;k<clicks;k++){noise(.025,{filter:'highpass',freq:4200,vol:.22,at:at+k*.07});tone(2400,.02,{type:'square',vol:.02,at:at+k*.07});}},
  impact(at=0){for(let k=0;k<5;k++){noise(.07,{filter:'bandpass',freq:900,q:2,vol:.28,at:at+k*.075});tone(150,.06,{type:'square',vol:.05,at:at+k*.075});}noise(.3,{filter:'highpass',freq:5000,vol:.06,at:at+.38});},
  workshop(kind='upgrade'){const plan=kind==='unlock'?[['impact',0],['hammer',.5],['hammer',.72],['drill',.95],['ratchet',1.95],['hammer',2.5]]:[['ratchet',0],['drill',.55],['hammer',1.55],['hammer',1.78],['impact',2.05]];
   for(const [k,t] of plan)sfx[k](t);['C5','G5','C6'].forEach((n,i)=>note(n,.3,{type:'triangle',vol:.08,at:(kind==='unlock'?2.9:2.55)+i*.08}));},
  late(){note('D4',.35,{type:'sawtooth',vol:.06});note('A3',.5,{type:'sawtooth',vol:.06,at:.25});},
  ontime(){['C6','E6','G6','C7'].forEach((n,i)=>note(n,.25,{vol:.05,at:.5+i*.06}));},
  cheer(){for(let i=0;i<14;i++)tone(500+Math.random()*700,.18+Math.random()*.2,{type:'triangle',vol:.025,at:Math.random()*.9,slide:600+Math.random()*900});noise(1.4,{filter:'bandpass',freq:1600,q:.4,vol:.08});}
 };

 // ── music ───────────────────────────────────────────────────────────────────
 const stepDur=60/BPM/2;
 // Sustained voice: detuned oscillators through a low-pass, with attack/release and optional vibrato.
 function voice(freqs,dur,{type='sawtooth',vol=.1,at=0,attack=.05,release=.3,cutoff=1200,detune=6,vibrato=0}={}){
  const t=ctx.currentTime+at,g=ctx.createGain(),f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cutoff;f.Q.value=.7;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.setValueAtTime(vol,t+Math.max(attack,dur));g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(attack,dur)+release);
  f.connect(g).connect(musicBus);const end=t+Math.max(attack,dur)+release+.05;
  let lfo=null;if(vibrato){lfo=ctx.createOscillator();lfo.frequency.value=5.2;const d=ctx.createGain();d.gain.setValueAtTime(0,t);d.gain.linearRampToValueAtTime(vibrato,t+.35);lfo.connect(d);lfo.start(t);lfo.stop(end);lfo._depth=d;}
  for(const fr of freqs)for(const dt of detune?[-detune,detune]:[0]){const o=ctx.createOscillator();o.type=type;o.frequency.value=fr;o.detune.value=dt;if(lfo)lfo._depth.connect(o.detune);o.connect(f);o.start(t);o.stop(end);}
 }
 function play(e,t){
  const at=Math.max(0,t-ctx.currentTime),len=e.steps*stepDur;
  if(e.voice==='lead'){voice([midiToHz(e.midi)],len*.95,{vol:.075,at,attack:.07,release:.35,cutoff:1700,detune:5,vibrato:14});voice([midiToHz(e.midi-12)],len*.95,{type:'triangle',vol:.05,at,attack:.07,release:.35,cutoff:900,detune:0});}
  else if(e.voice==='pad')voice(e.midis.map(midiToHz),len,{vol:.022,at,attack:.6,release:.9,cutoff:850,detune:9});
  else if(e.voice==='bass')voice([midiToHz(e.midi)],len*.9,{type:'triangle',vol:.16,at,attack:.03,release:.25,cutoff:500,detune:0});
  else if(e.voice==='arp'){const f=midiToHz(e.midi);tone(f,.45,{type:'triangle',vol:.045,at,bus:musicBus});tone(f*2,.2,{vol:.012,at,bus:musicBus});}
  else if(e.voice==='timpani'){const f=midiToHz(e.midi);tone(f*1.5,e.roll?.25:.9,{vol:e.roll?.12:e.accent?.34:.22,at,slide:f,attack:.004,bus:musicBus});noise(e.roll?.12:.25,{freq:260,vol:e.roll?.05:.1,at,bus:musicBus});}
 }
 function queue(until){while(nextTime<until){if(musicOn)for(const e of musicEvents(step))play(e,nextTime);nextTime+=stepDur;step=(step+1)%LOOP_STEPS;}}
 function schedule(){
  if(!ctx||ctx.state!=='running')return;
  if(nextTime<ctx.currentTime)nextTime=ctx.currentTime+.05;
  queue(ctx.currentTime+.12);
 }

 // Called every frame. active: the engine is running and audible (flight or cutscene).
 function update({speed=0,boost=false,pitch=0,active=false,windy=0,sputter=0}){
  if(!ctx)return;const t=ctx.currentTime,on=active&&!paused;
  // Low fuel: the engine coughs; empty: it is silent.
  const cough=sputter>=1?0:sputter>0&&Math.sin(t*9.3)*Math.sin(t*3.1)>.35?.15:1;
  engineGain.gain.setTargetAtTime(on?(.055+(boost?.02:0))*cough:0,t,.05);
  const f=40+speed*1.7+(boost?12:0);engineOsc.frequency.setTargetAtTime(f,t,.12);engineSub.frequency.setTargetAtTime(f/2,t,.12);
  engineFilter.frequency.setTargetAtTime(300+speed*12,t,.2);lfo.frequency.setTargetAtTime(6+speed*.9,t,.12);
  const rush=Math.max(0,Math.min(1,(speed-6)/30))+Math.max(0,-Math.sin(pitch))*.6;
  windGain.gain.setTargetAtTime(on?rush*.07+windy*.03:0,t,.3);windFilter.frequency.setTargetAtTime(400+rush*1400,t,.3);
 }
 return {
  unlock,update,sfx,
  // Offline preview/testing: schedule the theme from time 0 into a supplied OfflineAudioContext.
  queueMusic(seconds){if(!ctx)return;nextTime=0;step=0;musicBus.gain.value=.42;queue(seconds);},
  get sfxOn(){return sfxOn;},get musicOn(){return musicOn;},
  setSfx(v){sfxOn=v;save();if(ctx)sfxBus.gain.setTargetAtTime(v?1:0,ctx.currentTime,.05);},
  setMusic(v){musicOn=v;save();applyMusic();},
  setPaused(v){paused=v;applyMusic();}
 };
}

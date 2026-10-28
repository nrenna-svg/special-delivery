// Deterministic cargo handling shared by the board, flight and tests.
export const CARGO={
 standard:{name:'Everyday supplies',hint:'Normal handling.',color:'#d6b279'},
 fragile:{name:'Fragile cakes & ceramics',hint:'Keep banks gentle. Boost and stunts damage the load.',color:'#f4a9c0'},
 heavy:{name:'Machinery',hint:'Loaded speed −12%, climb −22%. Plan extra fuel.',color:'#a4bdce'},
 live:{name:'Live chickens',hint:'The flock shuffles every 12 seconds: expect a brief gentle sideways pull.',color:'#e8d26b'}
};
export function cargoFor(seed,type){return type==='mail'?'standard':type==='urgent'?'fragile':['fragile','heavy','live'][Math.abs(seed)%3];}
export function cargoEffect(kind,s,loaded,boost=false){
 if(!loaded)return {speed:1,climb:1,turn:0,wear:0};
 const phase=s.time%12;
 return {speed:kind==='heavy'?.88:1,climb:kind==='heavy'?.78:1,
 turn:kind==='live'&&phase>9?Math.sin((phase-9)*Math.PI/3)*.18*(Math.floor(s.time/12)%2?1:-1):0,
 wear:kind==='fragile'?(s.stunt?5:boost?2:Math.abs(s.bank)>.6?1:0):0};
}

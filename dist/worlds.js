// Worlds (v0.74). Kestrel is the starting ocean world; Mesa Rojo is a desert canyon world that has
// to be unlocked with a ferry license. The active world is read once when the game loads (switching
// worlds reloads the page). Tests can force a world with globalThis.__SD_WORLD.
export const WORLDS={
 kestrel:{id:'kestrel',name:'Kestrel',tagline:'Island-hopping over a little ocean planet.',art:'linear-gradient(160deg,#7fc7d6,#2f8aa6 60%,#e0c489)',
  home:'KESTREL ISLAND',payMult:1,fee:0,rank:0,req:{}},
 mesa:{id:'mesa',name:'Mesa Rojo',tagline:'A desert canyon world: red mesas, deep canyons, dust devils and sandstorms. Every job pays 1.8×.',art:'linear-gradient(160deg,#f2b56b,#c4572f 55%,#7a2f22)',
  home:'DUSTWATER FIELD',payMult:1.8,fee:100000,rank:2,req:{engine:3,fuel:3}}
};
export const WORLD_ORDER=['kestrel','mesa'];
const KEY='special-delivery-world';
export function currentWorldId(){const forced=globalThis.__SD_WORLD;if(forced&&WORLDS[forced])return forced;try{const w=localStorage.getItem(KEY);if(w&&WORLDS[w])return w;}catch{}return 'kestrel';}
export function setWorld(id){try{localStorage.setItem(KEY,id);}catch{}}
export const WORLD=WORLDS[currentWorldId()];
export const DESERT=WORLD.id==='mesa';

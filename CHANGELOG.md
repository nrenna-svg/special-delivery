# Special Delivery changelog

## v0.92 — Rival races (red rival couriers with radio banter)

- New rivals.js: three rival companies with red planes (seaplane, striped monoplane, triplane), honest steering AI with a light rubber band, drop fumbles, red parachute drops that claim pads, wake turbulence, and banter lines for every race moment.
- career.js: ~1 in 5 parcel/urgent jobs on tiers 0-2 are races (`job.race`); `settle` adds a 30% purse for a win and shows the score.
- game.js: rival spawns beside you after takeoff, radio box + crackle sound, pads lost to the rival turn red, race scoreboard in the HUD, rival on the map, race details and your record on the job board, feud record saved.
- New tests/rivals.test.mjs (92 tests total).

## v0.90 — Cargo personalities and risky shortcuts

- Deterministic fragile, machinery and live cargo contracts, job-board handling advice, flight HUD, visible parcel racks, loaded handling and condition effects; heavy-load fuel estimates.
- Optional teal fly-through arches on outbound routes, solid rock rims with swept collision checks, map markers and one tailwind reward per flight.
- Added focused cargo and arch-crossing tests.


## v0.86 — Title screen show reel

- The plane now flies itself on the title screen: weaving S-turns, barrel rolls, loops, boost bursts and parachute parcel drops, at full speed (was a slow-motion straight line).
- An orbiting camera circles it and keeps it right of the title text; the menu moved to a bar along the bottom, so nothing covers the plane.
- Fixed dark text on the hosted page: the host's page wrapper sets `body{color:#000}`, which made the title and menu buttons dark. The game now sets its own light text colour.

## v0.84 — The title screen is back

- Opens on the old title card with the plane flying around the planet behind it, now with a menu: Enter the hangar, Plane shop, Worlds, How to play, Settings, Credits (game.js `showTitle`, `leaveTitle`, `openPanel`).
- Settings: sound, music, invert mouse, mouse sensitivity (50-160%), show/hide the DEV button.
- Hangar: ◂ Title screen button. Pause is hidden on the title.

## v0.82 — Balance pass

Ran a route and economy simulator over every job type on every island (both worlds).
- Fuel: burn doubled (`FUEL_SCALE`), so a DEADLY 3-island run uses most of a stock tank and the Fuel tank part matters (+12%/level, was +10%). New fuel estimate on each job and a ⛽ flag on slips over 95%; BINGO FUEL warning in flight.
- Mesa Rojo pay 1.8× → 1.5×.
- Dodge window 40-240 m → 40-300 m.
- The TAKE THE JOB button stays pinned at the bottom of the board when the job details are long.
- Tests updated for the new tank (82 pass).

## v0.80 — Very hard jobs: multi-island routes, missiles, flak; unlockable hook and flares

- Hard jobs now span islands: ROUGH 2, DEADLY 3 (career.js `makeJob`: `islands`, stops/masts/medicine spread across them, crates carried to the next island). Pay +35% per extra island.
- New threats.js: SAM sites (radar, lock-on, homing missiles with lead pursuit, motor burn, seeker limit), flak guns, flares, explosions and smoke. Counters: fly under the radar floor, barrel roll/loop in the dodge window, flares. Missile hit = crash under the job's tier rules. Warning tones and a red screen pulse; HUD line shows lock %, missile distance and when to roll.
- Shop: new **Flare dispenser** part (9 parts now). **Winch & hook** is now a Rookie part that must be unlocked before hook jobs; upgrades add lifting strength (crate weights LIGHT→MASSIVE), winch speed, line length and reach. Hook jobs you can't do yet show a padlock and can't be taken. Too-heavy crates can't be lifted. Carrying a crate slows the plane.
- Visible flare dispensers on the plane; audio: radar ping, lock beeps, missile warning, launch, explosions, flak, flare pops.
- Board slips show the number of islands and air defences; the job details list them with survival tips.
- New tests: tests/threats.test.mjs (82 total).

## v0.78 — DEV test tools

- Hangar **DEV** button (bottom-left, purple) with play-testing tools: +$10k / +$100k / +$1M, unlimited cash toggle, rank up, max rank, max all parts, reset parts, unlock all worlds, new job board, reset career (two clicks within 5 s). Hidden outside the hangar.
- Starting a new career (DEV reset or after a career-ending crash) while in Mesa Rojo now returns you to Kestrel, since the new career hasn't unlocked it.

## v0.76 — Unlock fees everywhere, a plane that shows its upgrades, workshop sounds

- **Every part needs an unlock first**, starter parts included (Engine $600, Fuel tank $500, Cargo hold $400), so each part is six purchases. The shop shows a padlock pip then five level pips.
- **Visible upgrades for every level** (game.js `LOOKS`, one group per part): Engine (red cowl, chrome exhaust stacks, radial cylinder heads, chrome spinner, gold spinner + scoop), Fuel tank (belly tank growing, underwing tanks, gold bands), Cargo hold (belly pod, straps, roof rack with crates, side panniers), Wings (longer tips each level, winglets, leading-edge strips, gold trim), Ailerons (bigger red aileron panels, tail fin, ventral fin, chrome weights), Parachutes (canisters on the spine, drogue pack, gold), Winch (bigger drum, chrome coil, boom, pulley, gold hook guard), Landing gear (fat tyres, wheel spats, struts, tail wheel, gold hubs).
- **Workshop show on every purchase:** impact wrench, hammer strikes, a drill and a ratchet (audio.js `drill`/`hammer`/`ratchet`/`impact`/`workshop`; the unlock gets a longer sequence), sparks at the part, a little shake, and the new pieces pop into place.
- **Hangar framing:** the plane is parked deeper in the hangar (`PARK.x` 27) and the camera frames it left of the job board (or above it on phones), so the board no longer covers the plane.

## v0.74 — Plane shop, pilot ranks, and World 2: Mesa Rojo

Making money now buys something.
- **Plane shop** (new upgrades.js, hangar tab): 8 parts, each with a one-time unlock fee (gated by pilot rank) and 5 upgrade levels at roughly doubling prices; small gains per level. See README for each part's effects. Upgrades show on the plane.
- **Pilot rank** shown in the hangar with progress to the next rank (jobs done AND money earned).
- **Hangar tabs:** Jobs / Plane shop / Worlds.
- **Mesa Rojo** (new worlds.js): a desert canyon world unlocked with a ferry license (Senior Courier, Engine 3, Fuel tank 3, $100k). Mesas with cliffs (`mesaHeight` in hazards.js), canyon buttes, sand sea, hoodoos, dust devils, sandstorms, vultures, cacti, adobe houses, warm sky. Ground height is now per-point (`groundHeight`), so pads, crates, masts and parcel impacts sit on mesa tops. Job tiers per mesa; no boats; pay ×1.8.
- The other world hangs in the sky of each world.
- Flight model takes upgrade stats via `state.perf` (stock plane unchanged when absent). Legacy Endless Run/Training still Kestrel-only and hidden.
- New tests: tests/upgrades.test.mjs and tests/mesa.test.mjs (75 total).

## v0.72 — Missed crates

Play-test question: what happens if you hook the crate and miss the drop? It was a dead end (the job could never finish). Now it depends on the island tier:
- **CALM / BREEZY:** a crate that misses its pad stays where it landed, floating if it hit water, with its lifting ring up and a C flag over it. Hook it again and have another go (−15% cargo condition each miss, and a 3.4 hook radius instead of 2.6 since it sits low). A smashed crate is restacked on its tower by the crew (−30% condition). (extras.js `crateDown`, `crateRestock`; game.js `crateLost`.)
- **ROUGH / DEADLY:** one shot. A missed or smashed crate fails the job; the gold ring appears and the dispatch panel points you home. The ledger explains why the client paid nothing.
- **Never stranded:** a failed job, or a parcel job that runs out of parcels with stops still open, now always shows the gold ring and points home (out of parcels still pays for what was delivered).

## v0.70 — Career mode: hangar, job board, landings

A new direction. The game is now a career flown from a hangar.
- **Old modes hidden:** Endless Run and Training Days are gone from the menus (code kept behind `LEGACY_MODES` in game.js). The opening loading cutscene is gone too.
- **World +35%:** `RADIUS` 200 → 270. Kestrel Island moved to sit under the airfield and grew to size 62; one sea stack that ended up on it was moved (sealife.js).
- **Airfield (airfield.js, hangar.js):** a 66 × 8 runway built from short slabs that follow the planet's curve (wheels stay at `GROUND_ALT` along its length), threshold stripes, edge and approach lights, an apron, a windsock and a quonset hangar with sliding red doors, a sign, workbench, pegboard, drums, crates, tyres, lamps and a pinned-up job board. The old short runway and loading crew are hidden.
- **Hangar start:** the game opens inside the hangar with the job board (HTML, styled as a corkboard with pinned job slips). Taking a job plays the rollout: doors open, taxi out, right turn onto the runway, takeoff roll, climb-out (`rolloutPose`, ~12 s, Space skips).
- **Jobs (career.js):** five job types and four island danger tiers (see README). Fixed delivery sites per island (`SITES`) are kept clear of trees and houses. ROUGH and DEADLY jobs put storm cells across the flight out.
- **Crate hauls (extras.js):** a lattice tower with a strapped crate and a lifting ring at hook height. Sweep the hook through the ring and the crate hangs from the line; Space releases it. Crates only count on crate pads (`kind:'crate'` in delivery.js) and their chute opens at once, since they hang low.
- **Landing (game.js career section):** fly home and either touch down yourself (graded, cash bonus) or fly the gold ring for the old scripted auto-landing. New low-speed settling in flight.js makes landings learnable. Approach readout near the runway. PULL UP is muted on the approach.
- **Crashes by tier:** CALM/BREEZY respawn as before and cost repairs; ROUGH fails the job; DEADLY ends the career (career-over ledger, then a new career). A crash on the home runway ends the flight with repairs.
- **Pay ledger** in the hangar after every flight; cash / jobs done / best career shown at the top.
- The blue depot is hidden in career mode (the tank is filled in the hangar). The footer restart button became "Call off flight"; R no longer restarts during a job.
- New tests: tests/career.test.mjs (tiers, sites, every job type on every island, board rules, pay, crate pads, rollout path, runway frame, airfield placement, landing grades, low-speed settle, crate chutes).

## v0.68 — Clean HUD

Play-testing: the screen was too busy, leaving too little open sky in the middle. Most of this is CSS appended at the end of style.css (search "v0.68 clean HUD").
- **Action buttons hidden on keyboard-and-mouse computers** (DROP / ROLL / LOOP / throttle slider): the keys do the same. They still show on touch screens (`pointer:coarse`).
- **Control hints fade out:** the footer key bar shows as a small centered strip for 8 s after takeoff or resuming, then fades (`flashHints()` in game.js, body class `hints`).
- **H toggles the full HUD** (body class `fullhud`): brings back the buttons, key hints, map legend, drop hint and drop-altitude bar.
- **Smaller, tighter panels:** instruments and the deliveries/day-clock panel sit lower and are shorter, the dispatch panel moved up, the minimap is smaller with no legend, the header drops its subtitle in flight, and the "KESTREL COURIER / island" line is gone in flight.
- **Drop-altitude bar only near a stop:** hidden while the next stop is more than 400 m away (dispatch class `far`), unless a drop is pending.
- **Drop hint line** is hidden except when the next stop is a moving boat (dispatch class `boat`), where it explains the green lead ring.
- Phone layouts are unchanged apart from the hidden lines.

## v0.66 — Easier boat drops

Play-testing found the drops onto moving boats too hard: the parcel takes a few seconds to fall, so you had to guess where the boat would be when it landed.
- **Lead marker:** each boat stop now shows a pulsing green "DROP HERE" ring on the water ahead of the boat, at the spot where the boat will be when a parcel dropped right now lands. Line the gold landing preview up with it and drop. The preview also turns green when it's on target. (extras.js `setLead`, called from game.js every frame with the predicted fall time.)
- **Bigger catch zone:** boats now accept parcels within 13 m (`BOAT_PAD_RADIUS`); fixed pads are still 8 m. `padRadius(stop)` in delivery.js is used by `padAt` and `resolveDelivery`, and accuracy is scored against each stop's own radius.
- **Slower boats:** the ferry Gull's loop takes 115 s (was 80 s). The fishing boat Marlin sails a wider, gentler 15 m circle in 85 s (was a tight 11 m circle in 46 s).
- **Hint line:** when the nearest stop is a boat, the dispatch hint explains the lead marker.
- New test: boats have the wider catch zone and stay under the speed cap.

## v0.64 — Runs without landings (2026-10-27, made with Claude; +0.02)
- Endless runs never land: days change over in the air at dawn, planned from where the plane is; fuel carries over, parcels are air-dropped back to 12. Landing gate is training-only.
- run.js: planDay(day, seed, from); no home leg in the time estimate; nearest hoop to each day's route always kept. days.js buildFeatures(stops, f, from).
- Removed the run day-complete card (unreachable now); Restart restarts the whole run. 46/46 tests pass.

## v0.62 — Endless run (2026-10-27, made with Claude; +0.04, two features)
- Endless run is the main game: continuous days with a 6 AM to 10 PM clock and sky, growing parcel quotas, islands unlocking outward, hazards arriving on a schedule, tighter clocks; land before dark or the run ends. Day-complete card with tomorrow's preview; best run saved.
- Fuel scarcity in runs: fewer fuel hoops each day (6 down to 1); running dry and going down ends the run.
- Title card: Endless Run / Training Days tabs; the hand-made days are Training. Cards hide the flight HUD.
- New: dist/run.js, tests/run.test.mjs (4 tests, incl. 25 seeds x 12 days validated); days.js buildFeatures() shared by training and runs. 45/45 tests pass.

## v0.58 — Bigger world (2026-10-27, made with Claude; +0.04, two features)
- Planet radius 150 -> 200; islands ~15% larger; gentler curvature and a farther horizon. Home island layout unchanged in world units.
- Three new islands: Coral Keys, Puffin Rocks, Orchid Isle. Day 3 stop on Puffin Rocks; Day 5 fuel hoops on Coral Keys and Orchid Isle.
- Retuned par times, urgent clocks, fuel burn and the route-map scale; sea traffic, stacks, waterspouts and sea life regenerated (16 ships, 18 stacks).
- All hard-coded 150s replaced with RADIUS (days.js, game.js, minimap.js, tests). 41/41 tests pass.

## v0.54 — Graphics and the sea (2026-10-27, made with Claude; +0.08, four features)
- Graphics upgrade: following sun with shadows, sky dome with sun glow, animated faceted ocean with shallows and surf, island palms/rocks/bushes/flowers/docks, fuller clouds, plane details and exhaust, splashes, vignette.
- Sea traffic and life: 12 ships (sail, tug, cargo, trawler) with wakes, smoke and horns; whales; dolphin pods.
- Sea stacks: 14 rock pillars offshore, crash obstacles.
- Waterspouts (Days 3-5): wandering funnels that buffet the plane and wear cargo; the core is a crash.
- New: dist/graphics.js, dist/sealife.js, tests/sealife.test.mjs (3 tests). 41/41 tests pass.

## v0.46 — Fuel and crashes (2026-10-27, made with Claude; +0.04, two features)
- Fuel: gauge in the instrument panel, burn by throttle and boost, low and critical warnings, coughing engine, engine-out glide, home depot refuels, green F fuel hoops on Days 2-5 (shown on the mission map).
- Crashes: sea, beach and hillside floors, the Kestrel lighthouse and mail masts; PULL UP warning; crash animation with debris; respawn a few seconds back with a parcel, 15% condition and 15 s penalty; clean-flight bonus.
- New: dist/hazards.js, tests/hazards.test.mjs (5 tests). flight.js: fuel field, fuelBurn, input.floor, input.engineOut. 38/38 tests pass.

## v0.42 — Mouse controls and hook line (2026-10-27, made with Claude; +0.04, two features)
- Mouse steering: cursor offset from center banks and climbs (dead zone, crosshair, hidden system cursor in flight); W/S now control throttle (faster ramp, 0.6/s), F loops (L still works), arrow keys remain a keyboard fallback. A/D are no longer bound.
- Hook-line winch on the mouse wheel: a line with a hook pays out under the plane and streams back with airspeed; mailbags are now snagged by the hook end (within 2.6 units) instead of the plane body. Winch clicks, HOOK LINE readout on Day 4, auto-reel for landing.
- Updated footer, title hints, LOOP button label and Day 4 briefing. 33/33 tests pass.

## v0.38 — Day challenges (2026-10-27, made with Claude; +0.16, eight features)
- Sky rings with streak multipliers (Day 1, Day 5).
- Wind that drifts parachutes, with windsocks, streaks, a heading-relative wind arrow and a wind-aware landing preview (Day 2, Day 5).
- Moving boat delivery stops with pads on deck; the preview checks the boat's future position (Day 3).
- Urgent parcels with countdown, badge, ticking and a +150 rush bonus (Day 3 medicine, Day 5 birthday cake).
- Mailbag masts snagged with a hook, required before landing, +100 each (Day 4).
- Gull flocks that cost cargo condition when hit (Day 4, Day 5).
- Storm cells with rain, lightning, thunder and turbulence (Day 5).
- Sunset-to-night sky with stars, glowing houses and pads and a plane lamp (Day 5).
- Dispatch panel shows a challenge line; mission map shows storms, upcoming rings and mail masts; final card summarizes rings, mailbags, bird strikes and urgent deliveries.
- New: dist/challenges.js, dist/extras.js, tests/challenges.test.mjs (6 tests). Day 3 swaps the coconut co-op for two boats (6 stops); Day 4 par 540 s, Day 5 par 660 s. 33/33 tests pass.

## v0.22 — Delivery days (2026-10-27, made with Claude; +0.02, one feature)
- Five delivery days across the planet with 22 new named stops and goods on the seven outer islands, a day picker with per-day bests, unlocking, per-day par times, and day captions in the cutscene and briefing notice. Delivered counts, stamp and final card use the day's stop count.
- New: dist/days.js, tests/days.test.mjs (3 tests). delivery.js newRoute(specs) accepts a day's stops. 27/27 tests pass.
- Music: new adventure theme (see README); the previous tune felt too cheeky.
- Fix: the blue depot hoop was invisible in v0.20 (a comment swallowed the rest of its line); it now shows beside the runway again.
- Title card scrolls and sits below the header when the day picker makes it tall.

## v0.20 — Celebrations, sound and music, homecoming landing (2026-10-27, made with Claude; +0.06, three features)
- Delivery celebrations: named goods per stop; crate stays on the pad, a recipient runs out, picks it up, cheers and waves; confetti; LIVE picture-in-picture doorstep camera; postmark stamp with points and accuracy. Landing ring turns green when on target.
- Sound and music: synthesized engine, wind, ~13 effects and a looping jaunty tune; SOUND / MUSIC toggles (remembered).
- Homecoming landing: after the last delivery, fly through the gold gate off the runway end; scripted glide, flare, touchdown and rollout graded by approach speed and centerline accuracy; crew cheers; landing bonus on the final card. Route completion now happens after landing.
- New files: dist/people.js, dist/celebrate.js, dist/audio.js, dist/landing.js, tests/landing.test.mjs (7 tests). crew.js now builds its people from people.js. minimap.js takes an optional home marker. 24/24 tests pass.
- Gameplay tweaks: depot hoop moved beside the runway (same height); HUD drop-altitude line becomes landing-speed advice on the way home.

## v0.14 — Opening cutscene (2026-10-27, made with Claude; +0.02, one feature)
- New pre-mission cutscene on every Start / Replay / Restart: tiny ground crew loads parcels into the plane at Kestrel Field (close-up), camera sweeps back to the chase view, then a takeoff roll down the runway and climb-out before the player takes control. Skippable with Space / Enter / Escape or the SKIP button; pausable.
- New files: dist/takeoff.js (cutscene timing + runway takeoff path), dist/crew.js (loading apron, baggage cart, two loaders, marshal), tests/takeoff.test.mjs (3 tests: parked start, smooth roll/climb with no jumps, stable hand-off). 17/17 tests pass.
- game.js: new `cutscene` mode; Restart and R now replay the cutscene; pause remembers whether it paused a cutscene or flight; cargo door added to the plane's right side (opens for loading); trees/houses kept off the new apron (same random seed, so the rest of the island is unchanged).
- index.html/style.css: letterbox bars, caption, SKIP button; HUD hidden during the cutscene. Version label 0.14.

## v0.12 bug fixes (2026-10-27, made with Claude; no version bump, fixes only)
- Climb/dive rate halved (new `CLIMB_RATE` = 0.5 in dist/flight.js, shared via `verticalSpeed()`), so holding W climbs about 35 m/s instead of about 72 m/s and the safe-drop height is easier to hit. Loops keep their full vertical rate. Parcels inherit the same vertical speed, so the drop preview and safe-drop marker stay accurate.
- Airspeed now responds clearly to pitch (`PITCH_SPEED_COST` 6 → 8): about 54 → 43 knots in a sustained climb and up to about 64 knots in a dive. Previously the gauge looked stuck at 54.
- HUD says "CONDITION" instead of "CARGO" for cargo condition, which never drops when parcels are used (parcel count is shown separately).
- The drop-altitude line now names the actual problem: "TOO LOW · CLIMB TO 190m", "DIVING TOO STEEPLY · LEVEL OUT", or "SAFE DROP · MIN 190m". It used to show one combined "TOO LOW / DESCENDING" message.
- On-screen notices (MISSED, PARCEL AWAY, etc.) are now a readable box layered above the mission map and kept clear of it on narrower windows; they no longer run underneath the map.
- tests/delivery.test.mjs: dive safe-drop threshold relaxed from +15 to +10 because dives are now half as steep; the cargo-lands-intact check is unchanged. All 14 tests pass.
- Not yet republished: the live site still runs the previous build.

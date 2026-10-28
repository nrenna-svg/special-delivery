# Special Delivery changelog

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

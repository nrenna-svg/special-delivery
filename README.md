# Special Delivery — v0.08

Around the world. Right on time.

A separate tiny-planet delivery prototype; the original 2D BI-PLANE BATTLE is unchanged. Static HTML/JS, no build step. Serve dist/ over HTTP. Three.js 0.180.0 is vendored with its MIT license.

## Controls
- WASD / arrows: bank, climb, dive
- Q / E: left / right barrel roll
- L: loop (minimum 160m and 51 knots)
- Space: drop cargo; cargo retains flight velocity
- Minus / plus or slider: throttle; Shift: boost
- P / Escape: pause; R: restart route
- Touch: steering pad and on-screen action buttons

Deliver to five numbered pads on Kestrel Island, in any order. The gold ring predicts cargo impact. Pads accept drops within 8 world units. Fly through the blue depot hoop to refill 12 parcels and restore cargo condition. Stunts slightly reduce fragile cargo condition. Score reflects landing accuracy, cargo condition, and a route completion time bonus. Misses use a parcel; refill or restart to try again. Personal best is stored only in this browser.

Version increments: 0.04 throttle/momentum, 0.06 stunts, 0.08 five-stop delivery route. Renaming is copy-only.

Run `node --test tests/flight.test.mjs tests/delivery.test.mjs`. Tests cover spherical flight, altitude constraints, stunt recovery, throttle, cargo momentum/prediction, duplicate scoring, and route completion.

Flight remains assisted: no crash penalties or landing system in this prototype. The camera stays oriented to the planet during stunts. The existing hosting URL is retained.

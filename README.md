# BI-PLANE BATTLE: Little Planet

Separate 3D flight prototype. The original 2D game is unchanged.

Serve `dist/` with any static HTTP server. Three.js 0.180.0 is vendored locally with its MIT license. No build step. Run `node --test tests/*.test.mjs` for spherical movement tests.

Controls: W/S or up/down to climb/dive, A/D or left/right to bank, Shift to boost, P/Escape to pause, R to restart. Touch controls appear on touch devices. Engine audio is opt-in. Flight automatically pauses on focus loss.

This is an assisted-flight prototype: forward flight is automatic, altitude is bounded, and there are no combat systems or crash penalties yet. Circumnavigation follows an actual sphere, with an upright chase camera following local radial up. A complete straight flight takes approximately 46 seconds. Lap detection requires visiting the far hemisphere and returning near home.

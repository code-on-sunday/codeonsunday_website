# Taut-until-touched cloth + remove corner-pin tap

Date: 2026-05-11
Scope: `src/main.js` (the live cloth runtime served by `index.html`)

## Goal

Each cloth layer should appear **perfectly taut** when it first renders — visually indistinguishable from the underlying page snapshot. The cloth only "becomes cloth" (gravity, sag, tearable) the first time the user touches it. After that touch, the cloth behaves exactly as it does today.

Additionally, the existing corner-pin tap-to-release interaction is removed entirely. Corners remain structurally pinned (they're part of the top / left / right edge pin loops) but the user can no longer release them, and the visual halo/dots are removed since they would be a misleading affordance.

## Why this works visually for free

The cloth's grid vertices are seeded at `initX, initY` — a perfectly flat rectangular grid aligned with the page snapshot texture. The texture maps 1:1 onto that flat mesh. So if we simply do not run the physics substep, the mesh stays flat and the GL pass draws the snapshot exactly as it would appear in a normal browser tab. No shader changes, no special "flat mode" rendering — just don't advance the simulation.

The moment physics is allowed to run, gravity acts on every non-pinned point starting from zero velocity. The user's grabbed points are held in place by the existing `grabbed` override in `substep()`. The result: the page in the user's hand stays put while the rest of the page droops into cloth. Snap, no easing.

## Changes

### State

Add a single boolean in the layer-state block (near `currentLayer`, `falling`, etc.):

```js
let simulating = false;
```

Remove these existing pieces of state and code that exist solely to support corner-pin tap-to-release:

- `let pinIds = [];` declaration.
- The `corners` array, the `for (const c of corners)` pin loop, and the `pinIds.push(...)` in `buildCloth()`. The corner points stay pinned because they are already covered by the top-row / first-column / last-column loops immediately above.
- The `point.corner` field assignment in the same loop (the field itself can be removed from the point object literal — no consumers remain after the deletion).
- Function `tryReleaseCorner()` — delete entirely.
- The `if (tryReleaseCorner(p.x, p.y))` branch inside the `pointerdown` listener.
- The `for (const id of pinIds)` block inside `render()` that draws the pin halos and dots.

### Gating physics

In `step(dt)`, before `syncGrabs()` and the substep loop, add:

```js
if (!simulating && !falling) return;
```

`syncGrabs()` is harmless when no pointers are active, but `step()` is also where tear-arming and falling logic live. The guard must allow `falling` through (so a torn cloth can still tumble off-screen), and must allow `simulating === true` through (so user-initiated cloth behaves normally). Before the first touch on a fresh layer, both flags are `false` and we return early.

Note: the tear-arming block at the bottom of `step()` only fires when `simulating === true`, because if physics never ran, no links have torn and `alive < armedAliveAt` will not trigger. So no extra guarding is needed there.

### Flipping the flag

Inside the `pointerdown` listener, after `findGrabPoints(p.x, p.y)` returns:

```js
const grabs = findGrabPoints(p.x, p.y);
if (grabs.length > 0) simulating = true;
pointers.set(e.pointerId, { x: p.x, y: p.y, grabs });
```

Setting it only when `grabs.length > 0` means a tap on the dead zone outside the cloth (if any exists) doesn't start the sim. Given the grab radius spans roughly 10 cells, in practice any tap anywhere on the screen will start sim, which is the intended behavior.

### Resetting the flag

`simulating` must reset to `false` whenever a fresh cloth is built. Set it inside `buildCloth()`, at the top:

```js
function buildCloth() {
  simulating = false;
  points = []; links = []; /* ... */
}
```

This single assignment covers all entry paths to a fresh cloth: initial build, `advanceLayer()`, `resetAll()`, and `resize()`.

### Render path

`render()` continues to run every frame regardless of `simulating`. The GL path draws the mesh at its current point positions — which equal `initX, initY` when sim hasn't started — so the cloth looks flat. The 2D backdrop (next page peeking through torn holes) also still draws; since no links are torn pre-touch, the cloth fully occludes it, so the backdrop is invisible until the first tear, exactly as today.

After removing the pin-halo block, the 2D layer's only remaining responsibility is the next-page backdrop. Leave the clear + transform setup intact — it's still needed for the backdrop draw.

## Edge cases

| Case | Behavior |
| --- | --- |
| First touch is a single tap (no drag) | `simulating` flips on, gravity starts, cloth sags from flat. User sees "page droops into cloth" effect even without dragging. Intended. |
| User taps outside the cloth area | If `grabs.length === 0`, `simulating` stays `false`. Cloth remains taut. |
| Resize / orientation change | `buildCloth()` runs → `simulating = false` → new cloth is taut. Intended (resize gives a fresh page). |
| Layer advances after tear | `advanceLayer()` calls `buildCloth()` → next page renders taut. Intended (each page is a fresh "page becomes cloth" reveal). |
| Falling transition | `falling = true` while `simulating = true`, both gates passed in `step()`. No change to existing fall behavior. |
| Static (final) mode | `staticMode` short-circuits `step()` and `render()` already. Unaffected. |

## Non-goals

- No easing/animation when sim turns on. Snap is the chosen visual.
- No changes to the cloth physics, tear thresholds, or grab radius.
- No changes to corner pinning structure — corners stay pinned, only the tap-to-release interaction and its visual affordance are removed.
- No changes to the static / iframe final-page flow.

## Risk

Low. The change is additive (one flag + one early return) plus a localized deletion (corner-pin tap path). The corner-pin deletion has no structural side effects because the same vertices remain pinned through the existing edge-pin loops. If the snap effect ever feels too abrupt, easing in gravity over ~200ms is a trivial follow-up that requires no design changes here.

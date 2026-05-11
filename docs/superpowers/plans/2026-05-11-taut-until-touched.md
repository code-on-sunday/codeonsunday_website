# Taut-until-touched cloth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each cloth layer appears perfectly flat (taut) on first render. Gravity snaps on the moment the user grabs the cloth. Also remove the corner-pin tap-to-release interaction and its blue-dot visuals entirely.

**Architecture:** All changes live in a single file, `src/main.js`. The cloth runtime already initializes the vertex grid at a flat rectangular layout (`initX, initY`) that maps 1:1 onto the page snapshot texture. By gating the physics substep behind a new per-layer `simulating` flag, we get "taut until touched" for free — no shader changes, no special render path. Corner-pin removal is a localized deletion across one declaration, one builder block, one helper function, one pointerdown call, and one render block. Corners stay structurally pinned through the existing edge-pin loops.

**Tech Stack:** Plain JavaScript, WebGL, Vite dev server. No test framework covers `src/main.js`; verification is manual in the browser.

**Spec:** `docs/superpowers/specs/2026-05-11-taut-until-touched-design.md`

---

## File Structure

Single file, modified in-place:

- **Modify:** `src/main.js`
  - Task 1: deletions in 5 separate locations (corner-pin tap path)
  - Task 2: 1 new state variable, 1 early-return guard in `step()`, 1 flag-flip in `pointerdown`, 1 flag-reset in `buildCloth()`

No other files change. No test files exist for this runtime and none are being added (manual browser verification only — see Task 3).

---

## Task 1: Remove corner-pin tap interaction and visuals

**Files:**
- Modify: `src/main.js` (5 deletions across the file)

This task is pure deletion. After it ships, the cloth behaves exactly as before except (a) tapping a corner no longer releases its pin, and (b) the blue dots / halos on corners are gone. Corners remain pinned because they're already covered by the edge-pin loops (`top row`, `left column`, `right column`) immediately above the corner block. Commit this independently so the diff is reviewable on its own.

- [ ] **Step 1: Remove the `pinIds` declaration**

Around `src/main.js:355`, delete the line:

```js
  let pinIds = [];
```

- [ ] **Step 2: Remove `pinIds` from the per-build reset**

Around `src/main.js:385`, change:

```js
    points = []; links = []; pinIds = [];
```

to:

```js
    points = []; links = [];
```

- [ ] **Step 3: Remove the corner block inside `buildCloth()`**

Around `src/main.js:434-443`, delete the entire block:

```js
    const corners = [
      { id: idx(0, 0),               name: 'tl' },
      { id: idx(cols - 1, 0),        name: 'tr' },
      { id: idx(0, rows - 1),        name: 'bl' },
      { id: idx(cols - 1, rows - 1), name: 'br' },
    ];
    for (const c of corners) {
      points[c.id].corner = c.name;
      pinIds.push(c.id);
    }
```

Leave the three preceding pin loops (top row at `src/main.js:429`, left/right columns at `src/main.js:430-433`) untouched — those are what keep the corners pinned.

- [ ] **Step 4: Remove the `corner` field from the point object literal**

Around `src/main.js:405-410`, change:

```js
        points.push({
          x: px, y: py, px: px, py: py,
          initX: px, initY: py,
          pinned: false,
          corner: null,
        });
```

to:

```js
        points.push({
          x: px, y: py, px: px, py: py,
          initX: px, initY: py,
          pinned: false,
        });
```

- [ ] **Step 5: Remove the `tryReleaseCorner` function**

Around `src/main.js:606-619`, delete the entire function:

```js
  function tryReleaseCorner(x, y) {
    const r = Math.max(18, Math.min(W, H) * 0.04);
    const r2 = r * r;
    for (const id of pinIds) {
      const p = points[id];
      if (!p.pinned) continue;
      const dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy <= r2) {
        p.pinned = false;
        return true;
      }
    }
    return false;
  }
```

- [ ] **Step 6: Remove the `tryReleaseCorner` call in `pointerdown`**

Around `src/main.js:663-666`, change:

```js
    if (tryReleaseCorner(p.x, p.y)) {
      pointers.set(e.pointerId, { x: p.x, y: p.y, grabs: [] });
      return;
    }
    const grabs = findGrabPoints(p.x, p.y);
    pointers.set(e.pointerId, { x: p.x, y: p.y, grabs });
```

to:

```js
    const grabs = findGrabPoints(p.x, p.y);
    pointers.set(e.pointerId, { x: p.x, y: p.y, grabs });
```

- [ ] **Step 7: Remove the corner-pin halo/dot render block**

Around `src/main.js:637-650`, delete the entire block inside `render()`:

```js
    for (const id of pinIds) {
      const p = points[id];
      if (p.pinned) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(122,176,255,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.pinned ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = p.pinned ? '#7ab0ff' : 'rgba(255,255,255,0.25)';
      ctx.fill();
    }
```

Leave the rest of `render()` — including the `ctx.setTransform`, `ctx.clearRect`, and the `bgCanvas` backdrop draw — untouched. The 2D canvas is still needed to draw the next-page backdrop behind torn holes.

- [ ] **Step 8: Verify no remaining references**

Run:

```bash
grep -n "pinIds\|\.corner\|tryReleaseCorner" src/main.js
```

Expected output: **empty** (no matches).

- [ ] **Step 9: Verify nothing else broke (lint/syntax)**

Run:

```bash
npm test
```

Expected: PASS (tests cover other files; this confirms no syntax error broke the module graph).

- [ ] **Step 10: Commit**

```bash
git add src/main.js
git commit -m "$(cat <<'EOF'
refactor(cloth): remove corner-pin tap interaction and visuals

Corners stay structurally pinned via the existing top/left/right edge
pin loops, but the tap-to-release interaction and its blue-dot halos
are gone. Sets up the taut-until-touched change which would make those
dots a misleading affordance.
EOF
)"
```

---

## Task 2: Taut-until-touched physics gate

**Files:**
- Modify: `src/main.js` (1 new state variable, 1 guard in `step()`, 1 flag-flip in `pointerdown`, 1 reset in `buildCloth()`)

Gate physics behind a `simulating` flag that's `false` for each freshly built cloth and flips `true` the first time the user successfully grabs the cloth. While the flag is `false` (and the cloth isn't already falling from a tear), `step()` early-returns and points stay at their init positions — the GL pass then draws the snapshot texture onto a perfectly flat mesh, indistinguishable from the underlying page.

- [ ] **Step 1: Add the `simulating` state variable**

After Task 1, `staticMode` is declared around `src/main.js:251`. Add `simulating` to the same state cluster — find the line:

```js
  let staticMode = false;
```

and add directly below it:

```js
  let simulating = false;
```

- [ ] **Step 2: Reset `simulating` inside `buildCloth()`**

At the top of `buildCloth()` (around `src/main.js:384` after Task 1, immediately inside the function body), add the reset as the first line of the function body:

```js
  function buildCloth() {
    simulating = false;
    points = []; links = [];
```

This single line covers initial build, `advanceLayer()`, `resetAll()`, and `resize()` — every entry path to a fresh cloth calls `buildCloth()`.

- [ ] **Step 3: Add the early-return guard in `step()`**

Find `step(dt)` around `src/main.js:450`. The current function starts:

```js
  function step(dt) {
    if (staticMode) return;
    syncGrabs();
```

Change it to:

```js
  function step(dt) {
    if (staticMode) return;
    if (!simulating && !falling) return;
    syncGrabs();
```

The `falling` term is critical: once a tear has armed and gone into falling state, physics must keep running so the cloth tumbles off-screen even if `simulating` somehow became false. In practice `simulating` is always `true` by the time `falling` becomes `true` (the user had to touch the cloth to tear it), but the guard is defensive.

- [ ] **Step 4: Flip `simulating` to true on first successful grab**

Find the `pointerdown` handler. After Task 1 it looks like:

```js
  glCanvas.addEventListener('pointerdown', (e) => {
    if (falling) return;
    glCanvas.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    const grabs = findGrabPoints(p.x, p.y);
    pointers.set(e.pointerId, { x: p.x, y: p.y, grabs });
  });
```

Change to:

```js
  glCanvas.addEventListener('pointerdown', (e) => {
    if (falling) return;
    glCanvas.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    const grabs = findGrabPoints(p.x, p.y);
    if (grabs.length > 0) simulating = true;
    pointers.set(e.pointerId, { x: p.x, y: p.y, grabs });
  });
```

Guarding on `grabs.length > 0` is a no-op in practice (the grab radius spans ~10 cells, so any tap hits something), but it preserves the invariant that an empty-grab pointer never wakes physics.

- [ ] **Step 5: Verify the patches landed cleanly**

Run:

```bash
grep -n "simulating" src/main.js
```

Expected: 4 matches — the declaration, the `buildCloth` reset, the `step` guard, and the `pointerdown` flip.

- [ ] **Step 6: Syntax / unit-test check**

Run:

```bash
npm test
```

Expected: PASS. No tests cover `main.js` directly, but a syntax error would surface as a Vite/Vitest module-resolution failure elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "$(cat <<'EOF'
feat(cloth): taut until first touch

Each cloth layer renders perfectly flat (matching the underlying page
snapshot) until the user's first grab. On grab, gravity snaps on and
the cloth behaves normally. Resets per layer so every new page gets
the "page becomes cloth" reveal.
EOF
)"
```

---

## Task 3: Manual verification in the browser

**Files:**
- None modified. This task is verification only.

There is no automated test harness for `src/main.js` (it's a browser-resident WebGL script). Verify by running the dev server and exercising each behavior. Do not commit anything in this task — if a check fails, go back and fix the relevant task, then re-verify.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Vite prints a local URL, typically `http://localhost:5173/`.

- [ ] **Step 2: Open the dev URL in a desktop browser**

Visit the URL printed by Vite. The default site is `trung` (resolved by `resolveSiteName` at `src/main.js:17`).

- [ ] **Step 3: Verify the first page renders taut**

The page should appear identical to a normal HTML render of the first snapshot — perfectly flat, no sag at the bottom edge, no visible cloth distortion. There should be **no blue dots** in the corners.

If the bottom edge sags before you touch the cloth → Task 2 step 3 (the `step()` guard) is missing or wrong.
If blue dots appear in the corners → Task 1 step 7 (the render block deletion) is missing.

- [ ] **Step 4: Verify first touch flips into cloth mode**

Click and drag anywhere on the page. The grabbed region should follow your cursor while the rest of the page sags under gravity. Release.

Expected: the cloth keeps sagging from where you released — it does **not** return to taut. From this point on the cloth behaves exactly like the existing build.

If physics doesn't start → Task 2 step 4 (the `simulating = true` flip) is missing.
If the cloth springs back to flat on release → there's an unintended reset somewhere; re-check Task 2 step 2.

- [ ] **Step 5: Verify corner taps no longer release**

Try clicking right on a corner of the cloth (you'll have to estimate where the corner is now that the dot is gone). Expected: corner stays pinned. The click acts as a normal grab on nearby vertices, dragging them inward, but the corner itself remains anchored.

If the corner unpins on tap → Task 1 step 6 (the `tryReleaseCorner` call removal) is incomplete.

- [ ] **Step 6: Verify the layer advance keeps the taut behavior**

Tear the first cloth enough to trigger the fall transition. Wait for the next layer to appear.

Expected: the next page also renders taut. Touch it — it should snap into cloth behavior the same way the first one did.

If the second layer appears already sagging → Task 2 step 2 (the reset in `buildCloth()`) isn't firing on layer advance.

- [ ] **Step 7: Verify resize / orientation behavior**

With the cloth in mid-sag (after touching), resize the browser window. Expected: the cloth rebuilds taut, ready for another first-touch trigger.

- [ ] **Step 8: Verify on a coarse-pointer (touch) device if available**

Either open the dev URL on a phone on the same network, or use desktop devtools' device-toolbar to simulate touch. Expected: same behavior — first touch wakes physics, no corner-tap behavior, no dots.

This isn't strictly necessary for sign-off if no touch device is on hand, but the production audience is mobile-heavy so it's worth checking when possible.

- [ ] **Step 9: Final sanity check**

Reload the page once with devtools open. Expected: no JavaScript errors in the console.

---

## Out of scope

- No easing of the gravity onset. Snap is intentional (spec § Non-goals).
- No tests added — the runtime has no test harness and this change isn't worth bootstrapping one for.
- No changes to physics constants, tear thresholds, grab radius, or shader code.
- No changes to the static / iframe final-page mode.

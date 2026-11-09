# Glass surfaces on web (Skia backdrop)

Status: implemented on web: `GlassSurface`, backdrop snapshot, menu popover, and the submenu layer
(`openFlyout` in `menu-trigger.web.tsx`, touch and fine pointer). The Android side has its own layer
(`GlassSubmenuLayer.kt`); its status is in `docs/ESTADO.md`.
The slice test screen (`src/app/glass-slice.web.tsx`) is not in the repo: `src/app` has only `index.tsx` and `_layout.tsx`.
The `?perf=1` probe and the `exp=` switches are in `glass-perf.web.ts`.

## Goal

The web menu must match the Android overlay (Kotlin `GlassMenuSession`, `GlassRenderer`,
`GlassShaders`, `GlassMotion`) visually and in motion, run well on old and new devices, and be
reusable by every glass component without rewriting shaders or physics.

## (a) Shared primitive: `GlassSurface`

`glass-surface.web.tsx`. One component owns the glass of a Kotlin surface:

- **Material** (`GLASS_MATERIAL_SHADER_SKSL`, generated from `render/GlassShaders.kt` by
  `scripts/generate-menu-shaders.js`, unchanged SkSL). Its `content` child is the backdrop
  snapshot blurred by the Kotlin blur radius (`glass-uniforms.web.ts`, `computeBlurRadius`).
  Kotlin applies the blur to the content before the material
  (`GlassRenderer.kt:188-190`, `createChainEffect(outer = material, inner = blur)`), so it is a
  backdrop blur, not a blur of the glass output.
- **Shadow** (`GLASS_SHADOW_SHADER_SKSL`), same guard rect as `drawGlass`.
- **Uniforms**: `glass-uniforms.web.ts`, a transcription of `GlassRenderer.drawGlass` and
  `bindField`, and of `GlassRecipe`. Every uniform the shaders declare is supplied (Skia rejects a
  missing one by name).
- **Live / frozen**: while the animation runs, both passes are drawn in one Canvas (live). When
  the session has settled (`session.idle`), the same passes are rasterized once into an image of
  the glass bounds and the Canvas draws that image (frozen). Measured: the frozen image differs
  from the live render by at most 11/255 (mean 0.02) over the whole frame.
- **Motion**: `menu-motion.web.ts` (transcription of `GlassSpring`, `GlassMorphTuning`,
  `GlassMotion`, `GlassJelly`, plate springs). `GlassSurface` takes the frame; it runs no physics.

## (b) What is drawn in Skia and what stays in DOM

| Layer | Where | Why |
|---|---|---|
| Page background and skeleton shapes | Skia: `backdrop-surface.web.tsx` draws the scene into an offscreen surface once; the visible background is that snapshot | This is what the glass samples. |
| Glass (panel, neck, trigger lobe, shadow) | Skia: `GlassSurface` | Material, rim, shadow, refraction, blur of the backdrop. |
| Menu text, icons, separators, plate | DOM: `menu-popover.web.tsx` | Text, selection and accessibility. Transform follows Kotlin `rows` (scale, translate, alpha, blur). |
| Library toolbar pill (anchor) | DOM | Interactive; morphs into the lobe via transform. Not moved to Skia in this phase. |

Limit: the material samples only Skia content. DOM text behind a menu is not refracted (Android
refracts any RenderNode content).

## (c) Budget (what is implemented, and measured numbers)

The numbers below are from the slice phase (one popover, 2.875 DPR, headless software GL). They are not the current submenu numbers: see `docs/ESTADO.md`.

- Snapshot: 1 per backdrop (scene, size, scale). Blurred variants are created on demand, quantized
  to 2 dp, capped at 6, released with the backdrop.
- Shaders: compiled once per module (`getEffects`), not per render.
- One Canvas per surface, bounded to the glass bounds (shadow rect clamped to the window).
- Loop: the trigger's frame loop stops when the physics has settled; the popover re-renders only on
  notifications from moving frames (no ticker at rest).
- Frozen glass at rest (see numbers below).
- DPR: the backdrop snapshot uses `min(devicePixelRatio, dprCap)`, `dprCap = 2`. The glass Canvas
  and the backdrop Canvas use the device pixel ratio: `CanvasProps` in react-native-skia 3.9.1 has no
  pixel-ratio option, and the web renderer sets `canvas.width = clientWidth * devicePixelRatio`.
  So the cap is not enforced on the canvases. This is a limit of the library, not a choice.

Measured in headless Chromium (software GL, shared machine with an emulator and Gradle running),
2.875 DPR, 375x838 CSS viewport, `performance` frame intervals (`scripts` in scratch, not in the repo):

| Phase | Mean | Notes |
|---|---|---|
| Idle, no menu | 16.6 ms | vsync |
| Open, first 1 s (live) | 60-75 ms | includes first-open warm-up (p95 about 380 ms) |
| Open, settled (frozen) | 16.7 ms | p95 16.8 ms |
| Close, first 1 s (live) | about 28 ms | |
| Close, settled | 16.7 ms | |

Memory (canvas backing stores, device px, RGBA):
- Backdrop Canvas, full window at 2.875: 1078x2409 = 10.4 MB.
- Glass Canvas (bounds), open: 940x1420 = 5.3 MB.
- Backdrop snapshot at dpr 2: 750x1676 = 5.0 MB; each blurred variant 5.0 MB (max 6 = 30 MB).
- Frozen glass image: bounds at the backdrop scale, about 2-3 MB.

Interpretation: the open animation is the expensive phase on software GL. Every morph frame runs
the material shader over the glass bounds. On a GPU it should be far cheaper, but this was not
measured on a device. The settled cost is at the vsync floor because of the freeze.

## (d) Reuse rule

A new glass component:
1. Creates or reuses a backdrop scene (`MenuBackdrop`, `menu-backdrop.web.tsx`).
2. Drives a `GlassMotion` / `GlassJelly` / `PlateMotion` (same physics module) from a frame loop
   that stops at rest.
3. Renders `GlassSurface` with its frame and material config.
4. Puts its DOM content in a layer that follows the frame's transform.

It must not copy shaders or physics.

## (e) Not ported / deviations (see also the transcription notes in the source files)

- `smoothedField` (`GlassShaders.kt:58,92`, field texture `field/GlassFieldTexture.kt`): not ported.
  `smoothedFieldEnabled = 0`, the neck uses the shader's analytic field only.
- `GlassPortalShader` (portal blur during morph): not ported. `GLASS_PORTAL_SHADER_SKSL` is defined in `menu-shaders.web.ts` but nothing uses it.
- `applyLight` (`MenuLift`, `MenuRimLift`): the press pool is passed with the Kotlin constants; the
  rest of `applyLight` (`GlassMenuSession.kt`) is not transcribed.
- Touch swell of the trigger (`GlassJelly.swell` on the lobe, `GlassMenuSession.kt:190`): not applied.
- Haptics: `navigator.vibrate` (Android Chrome only).
- Window-level Choreographer: replaced by `requestAnimationFrame`.

## (f) Submenu layer on web

- `openFlyout` (`menu-trigger.web.tsx`) opens a second `GlassSurface` for a submenu row. Touch: the layer covers the root.
  Fine pointer: the layer sits beside the row (left when there is no room); the root keeps its size.
- Back and Escape close the layer first (`beginLayerClose`), then the menu.
- Measured frames for the layer opening (touch 17/59, desktop 14/76 over 33 ms, headless) do not meet the goal.
  With `noglass` there are none. The live glass of the layer is the measured cause.
- Parity with the native layer (`GlassSubmenuLayer.kt`, same motion and morph) is not confirmed. See `docs/ESTADO.md`.

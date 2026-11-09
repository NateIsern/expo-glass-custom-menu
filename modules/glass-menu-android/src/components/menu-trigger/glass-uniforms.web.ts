// Transcription of the numeric part of render/GlassRenderer.kt (bindField, drawGlass) and
// render/GlassRecipe.kt. Units are the Kotlin units. The web surface renders in dp space and
// passes `density` = 1 to the shaders, which is equivalent because every density term in the
// AGSL is a multiple of `density` (see docs/glass-web-architecture.md, section (a)).
//
// Every uniform the shaders declare is produced here (Skia rejects a missing uniform by name).

type TRect = { left: number; top: number; right: number; bottom: number };

// GlassRecipe.kt
type TRecipe = {
  saturation: number;
  black: number;
  white: number;
  rollOff: number;
  fillAlpha: number;
  tint: number;
  tintAlpha: number;
};
const ControlDark: TRecipe = { saturation: 1.3, black: 0.125, white: 1.125, rollOff: 0.4, fillAlpha: 0, tint: 0, tintAlpha: 0 };
const MenuDark: TRecipe = { saturation: 1.3, black: 0.125, white: 1.125, rollOff: 0.65, fillAlpha: 0, tint: 0.042, tintAlpha: 0.7 };
const ControlLight: TRecipe = { saturation: 1.2, black: 0.4, white: 1.03, rollOff: 0, fillAlpha: 0.2, tint: 0, tintAlpha: 0 };
const MenuLight: TRecipe = { saturation: 1.2, black: 0.4, white: 1.03, rollOff: 0, fillAlpha: 0.2, tint: 0.975, tintAlpha: 0.5 };

// GlassRenderer.kt companion
const MorphBlur = 1.2;
const RimAlphaDark = 1;
const RimAlphaLight = 0.55;

// GlassMenuConfigRecord / GlassTriggerConfigRecord defaults
type TMaterialConfig = {
  blur: number;
  saturation: number;
  refraction: number;
  rim: number;
  tintColor: [number, number, number] | null; // 0..1 channels
  tintOpacity: number | null;
};
const MENU_CONFIG_DEFAULT: TMaterialConfig = {
  blur: 16, saturation: 1, refraction: 1, rim: 1, tintColor: null, tintOpacity: null,
};
const TRIGGER_CONFIG_DEFAULT: TMaterialConfig = {
  blur: 1, saturation: 1, refraction: 1, rim: 1, tintColor: null, tintOpacity: null,
};

// GlassSurfaceState.kt
type TGlassState = {
  incoming: TRect;
  radiusX: number;
  radiusY: number;
  hasSource: boolean;
  source: TRect;
  sourceRadius: number;
  smoothing: number;
  lensHeight: number;
  lensAmount: number;
  materialProgress: number;
  surfaceOpacity: number;
  dark: boolean;
  pressX: number;
  pressY: number;
  pressRadius: number;
  poolGain: number;
  pressLift: number;
  rimLift: number;
};

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const rectW = (r: TRect): number => r.right - r.left;
const rectH = (r: TRect): number => r.bottom - r.top;
const rectCX = (r: TRect): number => (r.left + r.right) / 2;
const rectCY = (r: TRect): number => (r.top + r.bottom) / 2;

// Union of two rects (RectF.union).
const rectUnion = (a: TRect, b: TRect): TRect => ({
  left: Math.min(a.left, b.left),
  top: Math.min(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
});

// Field-texture uniforms are not produced (field texture not ported): smoothedFieldEnabled = 0.
const fieldUniforms = (state: TGlassState) => {
  const a = state.incoming;
  const b = state.hasSource ? state.source : a;
  return {
    center: [rectCX(a), rectCY(a)],
    halfSize: [rectW(a) / 2, rectH(a) / 2],
    cornerRadii: [state.radiusX, state.radiusY],
    secondaryEnabled: state.hasSource ? 1 : 0,
    secondaryCenter: [rectCX(b), rectCY(b)],
    secondaryHalfSize: [rectW(b) / 2, rectH(b) / 2],
    secondaryRadii: [state.sourceRadius, state.sourceRadius],
    smoothing: state.smoothing,
    smoothedFieldEnabled: 0,
    fieldCoordinateScale: [0, 0],
    fieldCoordinateOffset: [0, 0],
    fieldExtent: [0, 0],
  };
};

// GlassRenderer.kt blurRadius (drawGlass): the blur is applied to the backdrop content before the
// material (createChainEffect(outer = material, inner = blur)), so it is a backdrop blur.
const computeBlurRadius = (state: TGlassState, config: TMaterialConfig, trigger: TMaterialConfig): number => {
  const density = 1;
  const t = clamp(state.materialProgress, 0, 1);
  const clearing = Math.min(t * 6, 1);
  const base = trigger.blur + (MorphBlur - trigger.blur) * clearing;
  return Math.max(base + (config.blur - base) * t * t * t, 0.01) * density;
};

// GlassRenderer.drawGlass numeric part. Returns the material uniforms and the shadow uniforms
// and the shadow rect (guard-expanded union, Kotlin shadowRect).
const computeGlassUniforms = (
  state: TGlassState,
  config: TMaterialConfig,
  trigger: TMaterialConfig,
  sampleExtent: [number, number],
) => {
  const density = 1;
  const union = rectUnion(state.incoming, state.hasSource ? state.source : state.incoming);
  const t = clamp(state.materialProgress, 0, 1);
  const clearing = Math.min(t * 6, 1);
  const base = trigger.blur + (MorphBlur - trigger.blur) * clearing;
  const blurRadius = Math.max(base + (config.blur - base) * t * t * t, 0.01) * density;

  const shadowRadius = (4 + 20 * t) * density;
  const shadowGuard = shadowRadius * 2 + 9 * density + state.smoothing;
  const shadowRect: TRect = {
    left: union.left - shadowGuard,
    top: union.top - shadowGuard,
    right: union.right + shadowGuard,
    bottom: union.bottom + shadowGuard,
  };
  const shadowUniforms = {
    ...fieldUniforms(state),
    shadowParams: [shadowRadius, 0.04 + 0.56 * t, 8 * density, 0.3],
    surfaceOpacity: state.surfaceOpacity,
  };

  const control = state.dark ? ControlDark : ControlLight;
  const menu = state.dark ? MenuDark : MenuLight;
  const mix = (a: number, b: number): number => a + (b - a) * t;
  const saturation = mix(control.saturation * trigger.saturation, menu.saturation * config.saturation);
  const tintProgress = Math.min(t * 3, 1);
  const menuTint = config.tintColor;
  const triggerTint = trigger.tintColor;
  const channel = (menuValue: number | null, triggerValue: number | null): number => {
    const from = triggerValue ?? menuValue ?? menu.tint;
    const to = menuValue ?? menu.tint;
    return from + (to - from) * tintProgress;
  };
  const triggerAlpha = trigger.tintOpacity ?? control.tintAlpha;
  const menuAlpha = config.tintOpacity ?? menu.tintAlpha;
  const refraction = mix(trigger.refraction, config.refraction);
  const extent = Math.min(rectW(union), rectH(union)) / density;
  const innerHeight = Math.min(extent * 0.25, 20) * density;
  const innerAmount = Math.min(extent * 0.5, 60) * density;
  const outerHeight = Math.max(16, extent * 0.2) * density;
  const outerAmount = Math.max(16, extent * 0.25) * density;
  const lensHeight = Math.max(state.lensHeight, innerHeight);

  const materialUniforms = {
    ...fieldUniforms(state),
    nodeOrigin: [0, 0],
    sampleExtent,
    density,
    lensHeight,
    lensAmount: Math.min(state.lensAmount, -innerAmount) * refraction,
    outerHeight,
    outerAmount: -outerAmount * refraction,
    face: [
      saturation,
      mix(control.black, menu.black),
      mix(control.white, menu.white),
      mix(control.rollOff, menu.rollOff),
    ],
    faceFill: [1, 1, 1, mix(control.fillAlpha, menu.fillAlpha)],
    tint: [
      channel(menuTint ? menuTint[0] : null, triggerTint ? triggerTint[0] : null),
      channel(menuTint ? menuTint[1] : null, triggerTint ? triggerTint[1] : null),
      channel(menuTint ? menuTint[2] : null, triggerTint ? triggerTint[2] : null),
      triggerAlpha + (menuAlpha - triggerAlpha) * tintProgress,
    ],
    keyThreshold: state.dark ? 0.2588 : -0.2756,
    highlightAlpha: 1,
    rimAlpha: clamp((state.dark ? RimAlphaDark : RimAlphaLight) * mix(trigger.rim, config.rim), 0, 1),
    surfaceOpacity: state.surfaceOpacity,
    press: [state.pressX, state.pressY, state.pressRadius, state.poolGain],
    pressLift: state.pressLift,
    rimLift: state.rimLift,
  };
  return { blurRadius, shadowRect, materialUniforms, shadowUniforms };
};

export {
  computeBlurRadius,
  ControlDark,
  ControlLight,
  MenuDark,
  MenuLight,
  MENU_CONFIG_DEFAULT,
  MorphBlur,
  TRIGGER_CONFIG_DEFAULT,
  computeGlassUniforms,
  type TGlassState,
  type TMaterialConfig,
  type TRect,
};

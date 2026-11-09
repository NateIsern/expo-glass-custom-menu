import { GlassMorphFrame, GlassSpring, GlassSpringSpec, RectF, rectCopy, rectSet, type TRectF } from "./menu-motion.web";

// Web port of GlassSubmenuLayer (Kotlin). One progress drives the whole layer: 0 = the tapped row, 1 = the panel.
// The rect, the corner radius, the glass material and the rows all come from that progress, in both directions.
// No lens, no source lobe, no second morph: the same transform opens and closes the layer.
const ProgressTolerance = 0.002;
const ProgressVelocity = 0.01;
const Spec = new GlassSpringSpec(1, 0.28);
// Rows fade in over the second half of the transform (and out over the first half when closing).
const RowsFadeStart = 0.45;
const RowsFadeSpan = 0.3;
// The glass is gone before the panel reaches the row, and back in before the panel is open.
const GlassFadeStart = 0.35;
const GlassFadeEnd = 0.5;

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

class GlassSubmenuMotion {
  readonly frame = new GlassMorphFrame();
  private row: TRectF = RectF();
  private panel: TRectF = RectF();
  private panelRadius = 0;
  private readonly progress = new GlassSpring(ProgressTolerance, ProgressVelocity);
  // True while the layer is closing (or the gesture moves it back into the row).
  closing = false;
  scrubbing = false;

  // The progress: 1 = the panel (open), 0 = the row. The root recedes with it.
  get progressValue(): number {
    return clamp01(this.progress.value);
  }

  get isSettled(): boolean {
    return this.progress.isSettled;
  }

  // The tapped row (CSS px in the frame's px units: the caller scales by density).
  updateSource(_source: TRectF, through: TRectF): void {
    this.row = rectCopy(through);
    this.publish();
  }

  updateTarget(target: TRectF, radius: number): void {
    this.panel = rectCopy(target);
    this.panelRadius = radius;
    this.publish();
  }

  // Opens (true) or closes into the row (false): the same spring, reversed.
  retarget(open: boolean): void {
    this.closing = !open;
    this.progress.target(open ? 1 : 0, Spec);
  }

  // Opening from the row: the progress starts at the row.
  start(): void {
    this.progress.reset(0);
    this.closing = false;
    this.progress.target(1, Spec);
    this.publish();
  }

  // Advances the transform. Returns true when it has settled (open, or back in the row when closing).
  advanceBy(seconds: number): boolean {
    this.progress.advance(seconds);
    this.publish();
    return this.progress.isSettled;
  }

  private publish(): void {
    const p = clamp01(this.progress.value);
    const frame = this.frame;
    rectSet(
      frame.bounds,
      lerp(this.row.left, this.panel.left, p),
      lerp(this.row.top, this.panel.top, p),
      lerp(this.row.right, this.panel.right, p),
      lerp(this.row.bottom, this.panel.bottom, p),
    );
    const rowRadius = Math.min(rectW(this.row), rectH(this.row)) / 2;
    const radius = Math.min(
      lerp(rowRadius, this.panelRadius, p),
      Math.min(rectW(frame.bounds), rectH(frame.bounds)) / 2,
    );
    frame.radiusX = radius;
    frame.radiusY = radius;
    frame.sourceRadius = radius;
    rectSet(frame.sourceLobe, 0, 0, 0, 0);
    frame.smoothing = 0;
    frame.lensHeight = 0;
    frame.lensAmount = 0;
    frame.contentZoom = 1;
    frame.contentBlur = 0;
    // Glass material: faded out before the row, faded in while opening (surface opacity follows it).
    const glass = clamp01((p - GlassFadeStart) / (GlassFadeEnd - GlassFadeStart));
    frame.glassFade = glass;
    frame.contentProgress = glass;
    frame.rowsOpacity = clamp01((p - RowsFadeStart) / RowsFadeSpan);
    // Uniform scale of the rows: the rows keep their proportions while the panel narrows into the row.
    const panelWidth = rectW(this.panel);
    frame.rowScale = panelWidth > 0 ? rectW(frame.bounds) / panelWidth : 1;
  }
}

const rectW = (r: TRectF): number => r.right - r.left;
const rectH = (r: TRectF): number => r.bottom - r.top;

export { GlassSubmenuMotion };

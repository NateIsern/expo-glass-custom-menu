// Line-by-line transcription of:
//   motion/GlassSpring.kt, motion/GlassMorphTuning.kt, motion/GlassMorphFrame.kt,
//   motion/GlassMotion.kt, motion/GlassJelly.kt
// and the plate springs of overlay/GlassMenuSession.kt (PlateSlide, PlateFade).
// Same function names, same order, same constants. Units are the Kotlin units (px), with
// `density` passed in exactly as the Kotlin code receives it. Verified against the Kotlin
// run in scripts/verify-kotlin-motion.js (see that file for the comparison).

type TRectF = { left: number; top: number; right: number; bottom: number };

const RectF = (left = 0, top = 0, right = 0, bottom = 0): TRectF => ({ left, top, right, bottom });
const rectSet = (out: TRectF, left: number, top: number, right: number, bottom: number): void => {
  out.left = left;
  out.top = top;
  out.right = right;
  out.bottom = bottom;
};
const rectCopy = (other: TRectF): TRectF => RectF(other.left, other.top, other.right, other.bottom);
const width = (r: TRectF): number => r.right - r.left;
const height = (r: TRectF): number => r.bottom - r.top;
const centerX = (r: TRectF): number => (r.left + r.right) / 2;
const centerY = (r: TRectF): number => (r.top + r.bottom) / 2;

const coerceIn = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
const kotlinCeil = Math.ceil;
const kotlinFloor = Math.floor;

// GlassSpring.kt
class GlassSpringSpec {
  readonly omega: number;
  readonly alpha: number;
  readonly frequency: number;

  constructor(
    readonly dampingRatio: number,
    readonly response: number,
  ) {
    this.omega = (2.0 * Math.PI) / response;
    this.alpha = dampingRatio * this.omega;
    this.frequency = dampingRatio >= 0.9999 ? 0 : this.omega * Math.sqrt(1 - dampingRatio * dampingRatio);
  }
}

class GlassSpring {
  value = 0;
  private velocity = 0;
  private destination = 0;
  private spec = new GlassSpringSpec(1, 0.3);

  constructor(
    private readonly valueTolerance = 0.2,
    private readonly velocityTolerance = 3,
  ) {}

  get isSettled(): boolean {
    return Math.abs(this.value - this.destination) < this.valueTolerance &&
      Math.abs(this.velocity) < this.velocityTolerance;
  }

  reset(next: number): void {
    this.value = next;
    this.destination = next;
    this.velocity = 0;
  }

  target(next: number, nextSpec: GlassSpringSpec): void {
    this.destination = next;
    this.spec = nextSpec;
  }

  finish(): void {
    this.value = this.destination;
    this.velocity = 0;
  }

  advance(seconds: number): void {
    const omega = this.spec.omega;
    const displacement = this.value - this.destination;
    const alpha = this.spec.alpha;
    const decay = Math.exp(-alpha * seconds);
    if (this.spec.dampingRatio >= 0.9999) {
      const coefficient = this.velocity + omega * displacement;
      const nextDisplacement = decay * (displacement + coefficient * seconds);
      this.velocity = decay * (this.velocity - omega * coefficient * seconds);
      this.value = this.destination + nextDisplacement;
    } else {
      const frequency = this.spec.frequency;
      const cosine = Math.cos(frequency * seconds);
      const sine = Math.sin(frequency * seconds);
      const coefficient = (this.velocity + alpha * displacement) / frequency;
      const nextDisplacement = decay * (displacement * cosine + coefficient * sine);
      this.velocity = decay * (
        -alpha * (displacement * cosine + coefficient * sine) +
        frequency * (-displacement * sine + coefficient * cosine)
      );
      this.value = this.destination + nextDisplacement;
    }
    if (this.isSettled) {
      this.value = this.destination;
      this.velocity = 0;
    }
  }
}

// GlassMorphTuning.kt
const DefaultShrinkDuration = 0.21;
const DefaultShrinkScale = 0.25;
const DefaultEjectDamping = 0.75;
const DefaultAbsorbDuration = 0.35;
const DefaultAbsorbDamping = 0.8;
const EjectRatio = 0.32 / 0.21;
const MinimumDuration = 0.02;
const MinimumDamping = 0.1;

type TShrinkRecord = { duration?: number | null; damping?: number | null; scale?: number | null };
type TAbsorbRecord = { duration?: number | null; damping?: number | null };

class GlassMorphTuning {
  private readonly shrinkDuration: number;
  private readonly shrinkDamping: number | undefined;
  readonly shrinkScale: number;
  readonly collapse: GlassSpringSpec;
  readonly eject: GlassSpringSpec;
  readonly absorb: GlassSpringSpec;
  readonly neckHold: number;

  constructor(shrink: TShrinkRecord | null | undefined, absorb: TAbsorbRecord | null | undefined) {
    this.shrinkDuration = Math.max(shrink?.duration ?? DefaultShrinkDuration, MinimumDuration);
    this.shrinkDamping = shrink?.damping != null ? coerceIn(shrink.damping, MinimumDamping, 1) : undefined;
    this.shrinkScale = coerceIn(shrink?.scale ?? DefaultShrinkScale, 0.05, 1);
    this.collapse = new GlassSpringSpec(this.shrinkDamping ?? 1, this.shrinkDuration);
    this.eject = new GlassSpringSpec(this.shrinkDamping ?? DefaultEjectDamping, this.shrinkDuration * EjectRatio);
    this.absorb = new GlassSpringSpec(
      absorb?.damping != null ? coerceIn(absorb.damping, MinimumDamping, 1) : DefaultAbsorbDamping,
      Math.max(absorb?.duration ?? DefaultAbsorbDuration, MinimumDuration),
    );
    this.neckHold = Math.max(this.shrinkDuration / DefaultShrinkDuration, 1);
  }
}

// GlassMorphFrame.kt
class GlassMorphFrame {
  readonly bounds = RectF();
  radiusX = 0;
  radiusY = 0;
  contentProgress = 0;
  rowsOpacity = 0;
  readonly sourceLobe = RectF();
  sourceRadius = 0;
  smoothing = 0;
  sourceOpacity = 1;
  sourceBlur = 0;
  sourceZoom = 1;
  contentBlur = 0;
  contentZoom = 1;
  portalBlur = 0;
  lensHeight = 0;
  lensAmount = 0;
  // Submenu layer only (menu-submenu-motion.web.ts): the glass material opacity, and the uniform rows scale.
  glassFade?: number;
  rowScale?: number;
}

// GlassMotion.kt companion constants
const GeometrySpeed = 0.7;
const MaxGrowth = 1.2;
const ClosePinch = 0.84;
const RowsBlur = 18;
const PortalBlur = 6;
const CorrectionDelay = 0.1 * GeometrySpeed;
const SmoothingReleaseDelay = 0.3 * GeometrySpeed;
const EjectOpticalReleaseDelay = 0.12 * GeometrySpeed;
const AbsorbOpticalReleaseDelay = 0.1 * GeometrySpeed;
const AbsorbEjecteeUnkickDelay = 0.1 * GeometrySpeed;
const AbsorbSourceUnkickDelay = 0.15 * GeometrySpeed;
const AbsorbSmoothingReleaseDelay = 0.1 * GeometrySpeed;
const CollapseSpring = new GlassSpringSpec(1, 0.3 * GeometrySpeed);
const EjectSpring = new GlassSpringSpec(0.75, 0.32);
const CorrectionSpring = EjectSpring;
const KickSpring = new GlassSpringSpec(1, 0.2 * GeometrySpeed);
const BlurInSpring = new GlassSpringSpec(1, 0.3 * GeometrySpeed);
const BlurOutSpring = new GlassSpringSpec(0.8, 0.45 * GeometrySpeed);
const LensOnSpring = new GlassSpringSpec(1, 0.2 * GeometrySpeed);
const EjectLensOffSpring = new GlassSpringSpec(1, 0.6 * GeometrySpeed);
const AbsorbLensOffSpring = new GlassSpringSpec(1, 0.4 * GeometrySpeed);
const AbsorbContentSpring = new GlassSpringSpec(1, 0.15);
const RowsRevealSpring = new GlassSpringSpec(1, 0.3);
const AbsorbSmoothingSpring = new GlassSpringSpec(1, 0.1 * GeometrySpeed);
const SmoothingReleaseSpring = new GlassSpringSpec(1, 0.6 * GeometrySpeed);

class GlassMotion {
  readonly frame = new GlassMorphFrame();
  initialized = false;
  expanded = false;

  private readonly source = RectF();
  private readonly through = RectF();
  private readonly destination = RectF();
  private destinationRadius = 0;
  private zoomReferenceHeight = 0;
  private density = 1;
  private followsPress = false;
  private tuning = new GlassMorphTuning(null, null);
  private elapsed = 0;
  private correctionApplied = false;
  private smoothingReleased = false;
  private lensReleased = false;
  private closingKickReleased = false;
  private sourceKickReleased = false;
  private portalBlurReleased = false;

  private readonly x = new GlassSpring();
  private readonly y = new GlassSpring();
  private readonly width = new GlassSpring();
  private readonly height = new GlassSpring();
  private readonly radiusX = new GlassSpring();
  private readonly radiusY = new GlassSpring();
  private readonly sourceX = new GlassSpring();
  private readonly sourceY = new GlassSpring();
  private readonly sourceWidth = new GlassSpring();
  private readonly sourceHeight = new GlassSpring();
  private readonly sourceScale = new GlassSpring(0.0005, 0.01);
  private readonly incomingScale = new GlassSpring(0.0005, 0.01);
  private readonly kick = new GlassSpring();
  private readonly sourceKick = new GlassSpring();
  private readonly content = new GlassSpring(0.001, 0.01);
  private readonly rowsReveal = new GlassSpring(0.001, 0.01);
  private readonly sourceContent = new GlassSpring(0.001, 0.01);
  private readonly lens = new GlassSpring(0.001, 0.01);
  private readonly portalBlur = new GlassSpring(0.001, 0.01);
  private readonly smoothing = new GlassSpring(0.05, 1);
  private readonly channels: GlassSpring[] = [
    this.x, this.y, this.width, this.height, this.radiusX, this.radiusY,
    this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight, this.sourceScale, this.incomingScale,
    this.kick, this.sourceKick, this.content, this.rowsReveal, this.sourceContent, this.lens, this.portalBlur, this.smoothing,
  ];

  initialize(
    sourceRect: TRectF,
    target: TRectF,
    targetRadius: number,
    pixelDensity: number,
    throughRect: TRectF,
    fromPress: boolean,
    morphTuning: GlassMorphTuning,
  ): void {
    this.followsPress = fromPress;
    this.tuning = morphTuning;
    rectSet(this.source, sourceRect.left, sourceRect.top, sourceRect.right, sourceRect.bottom);
    rectSet(this.through, throughRect.left, throughRect.top, throughRect.right, throughRect.bottom);
    rectSet(this.destination, target.left, target.top, target.right, target.bottom);
    this.destinationRadius = Math.min(targetRadius, Math.min(width(target), height(target)) / 2);
    this.zoomReferenceHeight = height(target);
    this.density = pixelDensity;
    const diameter = this.initialIncomingDiameter();
    this.x.reset(this.pressedCenterX());
    this.y.reset(this.pressedCenterY());
    this.width.reset(width(target));
    this.height.reset(width(target));
    this.radiusX.reset(width(target) / 2);
    this.radiusY.reset(width(target) / 2);
    this.incomingScale.reset(diameter / width(target));
    this.sourceX.reset(centerX(this.source));
    this.sourceY.reset(centerY(this.source));
    this.sourceWidth.reset(width(this.source));
    this.sourceHeight.reset(height(this.source));
    this.sourceScale.reset(1);
    this.kick.reset(0);
    this.sourceKick.reset(0);
    this.content.reset(0);
    this.rowsReveal.reset(0);
    this.sourceContent.reset(1);
    this.lens.reset(1);
    this.portalBlur.reset(0);
    this.smoothing.reset(0);
    this.expanded = false;
    this.elapsed = 0;
    this.correctionApplied = false;
    this.smoothingReleased = false;
    this.lensReleased = false;
    this.closingKickReleased = false;
    this.sourceKickReleased = false;
    this.portalBlurReleased = false;
    this.initialized = true;
    this.publish();
  }

  updateSource(sourceRect: TRectF, throughRect: TRectF): void {
    if (!this.initialized) return;
    rectSet(this.source, sourceRect.left, sourceRect.top, sourceRect.right, sourceRect.bottom);
    rectSet(this.through, throughRect.left, throughRect.top, throughRect.right, throughRect.bottom);
    if (!this.expanded) this.configureCollapse();
  }

  updateTarget(target: TRectF, targetRadius: number): void {
    if (!this.initialized) return;
    rectSet(this.destination, target.left, target.top, target.right, target.bottom);
    this.destinationRadius = Math.min(targetRadius, Math.min(width(target), height(target)) / 2);
    if (this.expanded) this.configureExpansionGeometry();
    else this.configureCollapse();
    this.publish();
  }

  retarget(nextExpanded: boolean): void {
    if (!this.initialized) return;
    this.expanded = nextExpanded;
    this.zoomReferenceHeight = height(this.destination);
    this.elapsed = 0;
    this.correctionApplied = false;
    this.smoothingReleased = false;
    this.lensReleased = false;
    this.closingKickReleased = false;
    this.sourceKickReleased = nextExpanded;
    this.portalBlurReleased = false;
    this.portalBlur.target(1, BlurInSpring);
    this.lens.target(1, LensOnSpring);
    if (nextExpanded) {
      this.configureExpansionGeometry();
      this.incomingScale.target(1, EjectSpring);
      this.sourceKick.target(0, KickSpring);
      this.sourceContent.target(0, this.tuning.eject);
      this.content.target(1, EjectSpring);
      this.rowsReveal.target(1, RowsRevealSpring);
      this.smoothing.target(20 * this.density, CollapseSpring);
    } else {
      this.configureCollapse();
    }
    this.publish();
  }

  private configureExpansionGeometry(): void {
    const side = Math.min(width(this.source), height(this.source));
    const inset = side / 8;
    this.sourceX.target(
      this.alignedCenter(this.boundedCenter(centerX(this.through) * 0.75 + centerX(this.destination) * 0.25, this.destination.left, this.destination.right, inset), side),
      this.tuning.eject,
    );
    this.sourceY.target(
      this.alignedCenter(this.boundedCenter(centerY(this.through) * 0.75 + centerY(this.destination) * 0.25, this.destination.top, this.destination.bottom, inset), side),
      this.tuning.eject,
    );
    this.sourceWidth.target(side, this.tuning.collapse);
    this.sourceHeight.target(side, this.tuning.collapse);
    this.sourceScale.target(this.tuning.shrinkScale, this.tuning.eject);
    this.x.target(centerX(this.destination), EjectSpring);
    this.y.target(centerY(this.destination), EjectSpring);
    this.width.target(width(this.destination), EjectSpring);
    this.height.target(height(this.destination), EjectSpring);
    this.radiusX.target(this.correctionApplied ? this.destinationRadius : width(this.destination), EjectSpring);
    this.radiusY.target(this.correctionApplied ? this.destinationRadius : width(this.destination), EjectSpring);
    this.kick.target(this.correctionApplied ? 0 : this.kickAmount(-80), KickSpring);
  }

  // Returns true when the morph has settled (Kotlin advanceBy).
  advanceBy(seconds: number): boolean {
    if (!this.initialized) return true;
    let remaining = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0;
    while (remaining > 0) {
      this.applyTimelineActions();
      let next = Number.POSITIVE_INFINITY;
      if (this.expanded && !this.correctionApplied) next = Math.min(next, CorrectionDelay);
      if (!this.lensReleased || !this.portalBlurReleased) next = Math.min(next, this.opticalReleaseDelay());
      if (!this.smoothingReleased) {
        next = Math.min(next, this.expanded ? SmoothingReleaseDelay * this.tuning.neckHold : AbsorbSmoothingReleaseDelay);
      }
      if (!this.expanded && !this.closingKickReleased) next = Math.min(next, AbsorbEjecteeUnkickDelay);
      if (!this.expanded && !this.sourceKickReleased) next = Math.min(next, AbsorbSourceUnkickDelay);
      const step = Math.min(remaining, Math.max(next - this.elapsed, 0));
      if (step <= 0) {
        this.applyTimelineActions();
        continue;
      }
      for (const channel of this.channels) channel.advance(step);
      this.elapsed += step;
      remaining -= step;
    }
    this.applyTimelineActions();
    this.publish();
    if (!this.expanded && this.visuallyCollapsed()) {
      for (const channel of this.channels) channel.finish();
      this.publish();
      return true;
    }
    return (!this.expanded || this.smoothingReleased) && this.channels.every((channel) => channel.isSettled);
  }

  private applyTimelineActions(): void {
    const now = this.elapsed + 0.000001;
    if (!this.portalBlurReleased && now >= this.opticalReleaseDelay()) {
      this.portalBlurReleased = true;
      this.portalBlur.target(0, BlurOutSpring);
    }
    if (!this.lensReleased && now >= this.opticalReleaseDelay()) {
      this.lensReleased = true;
      this.lens.target(0, this.expanded ? EjectLensOffSpring : AbsorbLensOffSpring);
    }
    if (!this.expanded) {
      if (!this.closingKickReleased && now >= AbsorbEjecteeUnkickDelay) {
        this.closingKickReleased = true;
        this.kick.target(0, KickSpring);
      }
      if (!this.sourceKickReleased && now >= AbsorbSourceUnkickDelay) {
        this.sourceKickReleased = true;
        this.sourceKick.target(0, KickSpring);
      }
      if (!this.smoothingReleased && now >= AbsorbSmoothingReleaseDelay) {
        this.smoothingReleased = true;
        this.smoothing.target(0, SmoothingReleaseSpring);
      }
      return;
    }
    if (!this.correctionApplied && now >= CorrectionDelay) {
      this.correctionApplied = true;
      this.radiusX.target(this.destinationRadius, CorrectionSpring);
      this.radiusY.target(this.destinationRadius, CorrectionSpring);
      this.kick.target(0, KickSpring);
    }
    if (!this.smoothingReleased && now >= SmoothingReleaseDelay * this.tuning.neckHold) {
      this.smoothingReleased = true;
      this.smoothing.target(0, SmoothingReleaseSpring);
    }
  }

  private configureCollapse(): void {
    const diameter = this.initialIncomingDiameter();
    this.x.target(this.followsPress ? this.pressedCenterX() : centerX(this.source), this.tuning.absorb);
    this.y.target(this.followsPress ? this.pressedCenterY() : centerY(this.source), this.tuning.absorb);
    this.width.target(width(this.destination) * ClosePinch, this.tuning.absorb);
    this.height.target(width(this.destination), this.tuning.absorb);
    this.incomingScale.target(diameter / width(this.destination), this.tuning.absorb);
    this.radiusX.target(width(this.destination) / 2, this.tuning.absorb);
    this.radiusY.target(width(this.destination) / 2, this.tuning.absorb);
    this.sourceX.target(centerX(this.source), this.tuning.absorb);
    this.sourceY.target(centerY(this.source), this.tuning.absorb);
    this.sourceWidth.target(width(this.source), this.tuning.absorb);
    this.sourceHeight.target(height(this.source), this.tuning.absorb);
    this.sourceScale.target(1, this.tuning.absorb);
    this.kick.target(this.closingKickReleased ? 0 : this.kickAmount(-80), KickSpring);
    this.sourceKick.target(this.sourceKickReleased ? 0 : this.kickAmount(40), KickSpring);
    this.content.target(0, AbsorbContentSpring);
    this.rowsReveal.target(0, AbsorbContentSpring);
    this.sourceContent.target(1, this.tuning.absorb);
    this.smoothing.target(
      this.smoothingReleased ? 0 : 20 * this.density,
      this.smoothingReleased ? SmoothingReleaseSpring : AbsorbSmoothingSpring,
    );
  }

  private visuallyCollapsed(): boolean {
    const shell = this.frame.sourceLobe;
    const epsilon = this.density * 0.5;
    if (
      Math.abs(shell.left - this.source.left) > epsilon || Math.abs(shell.top - this.source.top) > epsilon ||
      Math.abs(shell.right - this.source.right) > epsilon || Math.abs(shell.bottom - this.source.bottom) > epsilon
    ) return false;
    const incoming = this.frame.bounds;
    return incoming.left >= this.source.left - epsilon && incoming.top >= this.source.top - epsilon &&
      incoming.right <= this.source.right + epsilon && incoming.bottom <= this.source.bottom + epsilon &&
      this.frame.contentProgress < 0.02 && this.frame.sourceOpacity > 0.98 &&
      Math.abs(this.kick.value) < epsilon && Math.abs(this.sourceKick.value) < epsilon &&
      this.frame.smoothing < epsilon && this.lens.value < 0.02;
  }

  private pressedCenterX(): number {
    return this.alignedCenter(
      this.boundedCenter(centerX(this.through), this.source.left, this.source.right, width(this.through) / 2),
      width(this.destination),
    );
  }

  private pressedCenterY(): number {
    return this.alignedCenter(
      this.boundedCenter(centerY(this.through), this.source.top, this.source.bottom, height(this.through) / 2),
      width(this.destination),
    );
  }

  private initialIncomingDiameter(): number {
    return Math.max(
      (width(this.destination) * 0.5 * height(this.through)) / Math.max(width(this.destination), height(this.destination)),
      1,
    );
  }

  private boundedCenter(value: number, start: number, end: number, inset: number): number {
    const minimum = start + inset;
    const maximum = end - inset;
    return minimum <= maximum ? coerceIn(value, minimum, maximum) : start + (end - start) / 2;
  }

  private alignedCenter(center: number, side: number): number {
    const points = (center - side / 2) / this.density;
    const aligned = (points < 0 ? kotlinCeil(points - 0.5) : kotlinFloor(points + 0.5)) * this.density;
    return aligned + side / 2;
  }

  private kickAmount(points: number): number {
    const heightPoints = height(this.destination) / this.density;
    const heightFactor = coerceIn((heightPoints - 60) / 140, 0.5, 1);
    const anchorY = coerceIn((centerY(this.through) - this.destination.top) / height(this.destination), 0, 1);
    return points * this.density * heightFactor * (2 * anchorY - 1);
  }

  private publish(): void {
    const density = this.density;
    const scaleIn = Math.max(this.incomingScale.value, 0.001);
    const w = Math.max(this.width.value * scaleIn, 1);
    const h = Math.max(this.height.value * scaleIn, 1);
    const restingScale = this.initialIncomingDiameter() / Math.max(width(this.destination), 1);
    const growth = this.followsPress
      ? coerceIn((scaleIn - restingScale) / Math.max(1 - restingScale, 0.001), 0, MaxGrowth)
      : 1;
    const originX = this.pressedCenterX();
    const originY = this.pressedCenterY();
    const cx = originX + (this.x.value - originX) * growth;
    const cy = originY + (this.y.value + this.kick.value * scaleIn - originY) * growth;
    rectSet(this.frame.bounds, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    const scale = Math.max(this.sourceScale.value, 0.01);
    const sw = Math.max(this.sourceWidth.value * scale, 1);
    const sh = Math.max(this.sourceHeight.value * scale, 1);
    const scy = this.sourceY.value + this.sourceKick.value * scale;
    rectSet(this.frame.sourceLobe, this.sourceX.value - sw / 2, scy - sh / 2, this.sourceX.value + sw / 2, scy + sh / 2);
    const contentValue = coerceIn(this.content.value, 0, 1);
    const sourceValue = coerceIn(this.sourceContent.value, 0, 1);
    const lensValue = coerceIn(this.lens.value, 0, 1);
    const lensDimension = Math.min(w, h);
    const lensHeight = 75 * density * lensValue * Math.min(lensDimension / (250 * density), 1);
    const zoom = 1 + (this.portalZoomScale() - 1) * this.portalBlur.value;
    this.frame.radiusX = Math.max(this.radiusX.value * scaleIn, 0);
    this.frame.radiusY = Math.max(this.radiusY.value * scaleIn, 0);
    this.frame.contentProgress = contentValue;
    this.frame.sourceRadius = Math.min(sw, sh) / 2;
    this.frame.smoothing = Math.max(this.smoothing.value, 0);
    this.frame.sourceOpacity = sourceValue;
    this.frame.sourceBlur = 4 * density * (1 - sourceValue);
    this.frame.sourceZoom = zoom;
    const reveal = coerceIn(this.rowsReveal.value, 0, 1);
    this.frame.rowsOpacity = reveal;
    this.frame.contentBlur = RowsBlur * density * (1 - reveal);
    this.frame.contentZoom = zoom;
    this.frame.portalBlur = PortalBlur * density * Math.max(this.portalBlur.value, 0);
    this.frame.lensHeight = lensHeight;
    this.frame.lensAmount = Math.min(-lensHeight, -0.001 * density);
  }

  private opticalReleaseDelay(): number {
    return this.expanded ? EjectOpticalReleaseDelay : AbsorbOpticalReleaseDelay;
  }

  private portalZoomScale(): number {
    const heightFactor = coerceIn((this.zoomReferenceHeight / this.density - 215) / 305, 0, 1);
    return 1.65 + (1.2 - 1.65) * heightFactor;
  }
}

// GlassJelly.kt
const MenuReach = 260;
const MenuStretch = 16;
const MenuSquash = 21;
const MenuShift = 21;
const ControlLift = 4;
const DragLean = 0.05;
const JellySpring = new GlassSpringSpec(0.5, 0.45);
const DragFollow = new GlassSpringSpec(0.65, 0.18);
const LightFollow = new GlassSpringSpec(0.8, 0.16);
const GlowIn = new GlassSpringSpec(1, 0.1);
const GlowOut = new GlassSpringSpec(1, 0.5);

class GlassJelly {
  private readonly press = new GlassSpring(0.002, 0.02);
  private readonly glow = new GlassSpring(0.002, 0.02);
  private readonly dragX = new GlassSpring(0.3, 6);
  private readonly dragY = new GlassSpring(0.3, 6);
  readonly lightX = new GlassSpring(0.3, 6);
  readonly lightY = new GlassSpring(0.3, 6);
  private startX = 0;
  private startY = 0;

  get glowValue(): number {
    return coerceIn(this.glow.value, 0, 1);
  }

  get lightPositionX(): number {
    return this.lightX.value;
  }

  get lightPositionY(): number {
    return this.lightY.value;
  }

  get isSettled(): boolean {
    return this.press.isSettled && this.glow.isSettled && this.dragX.isSettled && this.dragY.isSettled &&
      this.lightX.isSettled && this.lightY.isSettled;
  }

  down(x: number, y: number): void {
    this.startX = x;
    this.startY = y;
    if (this.glow.value < 0.02) {
      this.lightX.reset(x);
      this.lightY.reset(y);
    } else {
      this.lightX.target(x, LightFollow);
      this.lightY.target(y, LightFollow);
    }
    this.press.target(1, JellySpring);
    this.glow.target(1, GlowIn);
  }

  move(x: number, y: number): void {
    this.dragX.target(x - this.startX, DragFollow);
    this.dragY.target(y - this.startY, DragFollow);
    this.lightX.target(x, LightFollow);
    this.lightY.target(y, LightFollow);
  }

  release(): void {
    this.press.target(0, JellySpring);
    this.glow.target(0, GlowOut);
    this.dragX.target(0, JellySpring);
    this.dragY.target(0, JellySpring);
  }

  advance(seconds: number): void {
    this.press.advance(seconds);
    this.glow.advance(seconds);
    this.dragX.advance(seconds);
    this.dragY.advance(seconds);
    this.lightX.advance(seconds);
    this.lightY.advance(seconds);
  }

  // Mutates `out` like the Kotlin version.
  deformMenu(out: TRectF, awayX: number, awayY: number, density: number, amount: number): void {
    const reach = MenuReach * density;
    const dx = this.dragX.value;
    const dy = this.dragY.value;
    const pullX = Math.tanh((dx * awayX) / reach);
    const pullY = Math.tanh((dy * awayY) / reach);
    const w = width(out) + (MenuStretch * pullX - MenuSquash * pullY) * density * amount;
    const h = height(out) + (MenuStretch * pullY - MenuSquash * pullX) * density * amount;
    const cx = centerX(out) + MenuShift * Math.tanh(dx / reach) * density * amount;
    const cy = centerY(out) + MenuShift * Math.tanh(dy / reach) * density * amount;
    rectSet(out, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  }

  swell(height: number, density: number, amount: number): number {
    return 1 + (this.press.value * ControlLift * density * amount) / Math.max(height, 1);
  }

  // Mutates `out` like the Kotlin version.
  deformControl(out: TRectF, density: number, amount: number): void {
    const w = Math.max(width(out), 1);
    const h = Math.max(height(out), 1);
    const longest = Math.max(w, h);
    const shortest = Math.min(w, h);
    const dx = this.dragX.value;
    const dy = this.dragY.value;
    const scale = this.swell(h, density, amount);
    const angle = Math.atan2(dy, dx);
    const stretch = (ControlLift * density * amount) / h;
    const scaleX = scale + stretch * Math.abs(Math.cos(angle) * dx / longest) * Math.min(w / h, 1);
    const scaleY = scale + stretch * Math.abs(Math.sin(angle) * dy / longest) * Math.min(h / w, 1);
    const cx = centerX(out) + shortest * Math.tanh((DragLean * dx) / shortest) * amount;
    const cy = centerY(out) + shortest * Math.tanh((DragLean * dy) / shortest) * amount;
    const halfWidth = (w * scaleX) / 2;
    const halfHeight = (h * scaleY) / 2;
    rectSet(out, cx - halfWidth, cy - halfHeight, cx + halfWidth, cy + halfHeight);
  }

  releaseDrag(): void {
    this.dragX.target(0, JellySpring);
    this.dragY.target(0, JellySpring);
  }
}

// GlassMenuSession.kt: plate springs (PlateSlide, PlateFade) and their tolerances.
const PlateSlide = new GlassSpringSpec(0.85, 0.13);
const PlateFade = new GlassSpringSpec(1, 0.14);

// GlassMenuSession.kt: plateTop / plateHeight / plateAlpha and highlight().
// Row geometry is in content px (the caller multiplies dp by density).
type TPlateRow = { top: number; height: number; key: number };
class PlateMotion {
  readonly plateTop = new GlassSpring(0.25, 8);
  readonly plateHeight = new GlassSpring(0.25, 8);
  readonly plateAlpha = new GlassSpring(0.004, 0.05);
  private plateVisible = false;
  private activeRow: number | null = null;

  reset(): void {
    this.plateAlpha.reset(0);
    this.plateTop.reset(0);
    this.plateHeight.reset(0);
    this.activeRow = null;
    this.plateVisible = false;
  }

  // Returns true when the plate slid from one row to another (Kotlin hapticTick()).
  highlight(row: TPlateRow | null, immediate: boolean): boolean {
    const nextKey = row ? row.key : null;
    if (nextKey === this.activeRow) return false;
    const hadRow = this.activeRow !== null;
    this.activeRow = nextKey;
    if (row === null) {
      this.plateVisible = false;
      this.plateAlpha.target(0, PlateFade);
      return false;
    }
    if (!this.plateVisible && !hadRow) {
      this.plateTop.reset(row.top);
      this.plateHeight.reset(row.height);
    } else {
      this.plateTop.target(row.top, PlateSlide);
      this.plateHeight.target(row.height, PlateSlide);
    }
    this.plateVisible = true;
    if (immediate) this.plateAlpha.reset(1);
    else this.plateAlpha.target(1, PlateFade);
    return hadRow;
  }

  close(): void {
    this.plateVisible = false;
    this.plateAlpha.target(0, PlateFade);
  }

  get isSettled(): boolean {
    return this.plateTop.isSettled && this.plateHeight.isSettled && this.plateAlpha.isSettled;
  }

  advance(seconds: number): void {
    this.plateTop.advance(seconds);
    this.plateHeight.advance(seconds);
    this.plateAlpha.advance(seconds);
  }
}

export {
  CollapseSpring,
  EjectSpring,
  RowsRevealSpring,
  GlassJelly,
  GlassMorphFrame,
  GlassMorphTuning,
  GlassMotion,
  GlassSpring,
  GlassSpringSpec,
  PlateMotion,
  PlateFade,
  PlateSlide,
  RectF,
  rectCopy,
  rectSet,
  type TRectF,
};

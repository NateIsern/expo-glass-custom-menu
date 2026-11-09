import type { TNativeMenuItem } from "../../context/interface";
import type { TMenuAlignment, TMenuRect } from "../../interface";

// The Pixel reference runs with font_scale 1.15 (density 2.875). Kotlin scales sp
// text (fontScale * 0.978 FontFit) and row heights (max(fontScale, 1)); dp values stay fixed.
const FONT_SCALE = 1.15;
const FONT_FIT = 0.978;
const ROW_SCALE = Math.max(FONT_SCALE, 1);

// Metrics ported from android/.../content/GlassMenuContent.kt and
// overlay/GlassMenuSession.kt. Android dp maps 1:1 to CSS px on web.
const BASE_MENU_METRICS = {
  margin: 16,
  minimumWidth: 250,
  contentInsetY: 10,
  plateInsetX: 8,
  rowHeight: 42 * ROW_SCALE,
  subtitleExtra: 16 * ROW_SCALE,
  separatorBlock: 21,
  separatorInset: 24,
  headingHeight: 30 * ROW_SCALE,
  checkCenter: 28,
  leadingWithCheck: 44,
  iconCenterWithCheck: 55,
  textAfterIconWithCheck: 80,
  leadingPlain: 28,
  iconCenterPlain: 40,
  textAfterIconPlain: 64,
  trailingInset: 24,
  titleSize: 17 * FONT_SCALE * FONT_FIT,
  subtitleSize: 13 * FONT_SCALE * FONT_FIT,
  titleLine: 20,
  subtitleLine: 16,
  titleTracking: -0.012,
  iconSize: 19.5,
  checkSize: 13.5,
  cornerRadius: 34,
};

// The metrics the layout, the popover and the icons read. A desktop pointer (fine) uses a compact scale of the
// phone reference (setMenuMetricScale): every size scales, the screen margin and the tracking (an em ratio) do not.
const MENU_METRICS: Record<keyof typeof BASE_MENU_METRICS, number> = { ...BASE_MENU_METRICS };
const UNSCALED_METRICS: readonly (keyof typeof BASE_MENU_METRICS)[] = ["margin", "titleTracking"];

export const setMenuMetricScale = (scale: number): void => {
  (Object.keys(BASE_MENU_METRICS) as (keyof typeof BASE_MENU_METRICS)[]).forEach((key) => {
    MENU_METRICS[key] = UNSCALED_METRICS.includes(key) ? BASE_MENU_METRICS[key] : BASE_MENU_METRICS[key] * scale;
  });
};

type TMenuRowKind = "item" | "separator" | "heading";

type TMenuRowLayout = {
  index: number;
  // Submenu row (chevron; toggles the inline children) and whether it is expanded.
  submenu: boolean;
  expanded: boolean;
  // A child row of an expanded submenu.
  child: boolean;
  kind: TMenuRowKind;
  item: TNativeMenuItem;
  top: number;
  height: number;
  leading: number;
  iconCenter: number;
  selectable: boolean;
};

type TMenuContentLayout = {
  width: number;
  height: number;
  reservesCheck: boolean;
  rows: TMenuRowLayout[];
};

type TMenuPlacement = {
  left: number;
  top: number;
  width: number;
  height: number;
  maxHeight: number;
  opensFromRight: boolean;
  opensAbove: boolean;
};

// Bundled Inter (see menu-font.web.ts) with the system stack as fallback.
const MENU_FONT_FAMILY = "GlassMenuInter";
const FALLBACK_FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Inter hhea metrics. Kotlin centers the ink box (ascent + descent) on the row,
// so the baseline is centerY - (ascent + descent) / 2 with descent/ascent from Paint.FontMetrics.
const INTER_ASCENT = 0.96875;
const INTER_DESCENT = 0.2421875;

// CSS `top` that puts a text line's baseline at `baseline` for a box of `lineHeight`.
const textTopForBaseline = (baseline: number, size: number, lineHeight: number): number =>
  baseline - ((lineHeight - (INTER_ASCENT + INTER_DESCENT) * size) / 2 + INTER_ASCENT * size);

// Kotlin GlassSpringSpec: omega = 2 * PI / response, stiffness = omega^2, damping = 2 * ratio * omega.
const springOf = (response: number, dampingRatio: number): { stiffness: number; damping: number; mass: number } => {
  const omega = (2 * Math.PI) / response;
  return { stiffness: omega * omega, damping: 2 * dampingRatio * omega, mass: 1 };
};

// Baseline of a single-line title centered on `centerY`, as the Kotlin draw does it.
const centeredBaseline = (centerY: number, size: number): number =>
  centerY + ((INTER_ASCENT - INTER_DESCENT) / 2) * size;

let measureContext: CanvasRenderingContext2D | null | undefined;

const measureText = (
  text: string,
  size: number,
  fontFamily: string | undefined,
  tracking: number,
): number => {
  if (measureContext === undefined) {
    try {
      measureContext = document.createElement("canvas").getContext("2d");
    } catch {
      measureContext = null;
    }
  }
  if (!measureContext) return text.length * size * 0.55;
  const family = `"${fontFamily ?? MENU_FONT_FAMILY}", ${FALLBACK_FONT_STACK}`;
  measureContext.font = `${size}px ${family}`;
  (measureContext as CanvasRenderingContext2D & { letterSpacing: string })
    .letterSpacing = `${tracking * size}px`;
  return measureContext.measureText(text).width;
};

const hasIcon = (item: TNativeMenuItem): boolean =>
  item.icon != null || item.iconPath != null || item.iconSlot != null;

const isChecked = (item: TNativeMenuItem): boolean => item.checked != null;

const leadingFor = (
  item: TNativeMenuItem,
  reservesCheck: boolean,
): number => {
  const M = MENU_METRICS;
  if (item.heading) return reservesCheck ? M.leadingWithCheck : M.leadingPlain;
  if (reservesCheck) {
    return hasIcon(item) ? M.textAfterIconWithCheck : M.leadingWithCheck;
  }
  return hasIcon(item) ? M.textAfterIconPlain : M.leadingPlain;
};

// Submenu rows reserve room for their chevron at the trailing edge.
const CHEVRON_RESERVE = 24;

const layoutMenuContent = (
  items: TNativeMenuItem[],
  options: {
    requestedWidth?: number;
    maximumWidth: number;
    fontFamily?: string;
  },
  // Ids of submenus expanded inline (touch mode). Their child rows follow the submenu row.
  expanded: ReadonlySet<string> = new Set(),
): TMenuContentLayout => {
  const M = MENU_METRICS;
  const reservesCheck = items.some(isChecked);
  const all: TNativeMenuItem[] = items.flatMap(
    (item: TNativeMenuItem): TNativeMenuItem[] => [item, ...(item.items ?? [])],
  );

  let widest: number = M.minimumWidth;
  for (const item of all) {
    if (item.separator) continue;
    const text = measureText(
      item.title,
      M.titleSize,
      options.fontFamily,
      M.titleTracking,
    );
    widest = Math.max(
      widest,
      leadingFor(item, reservesCheck) + text + M.trailingInset + (item.items ? CHEVRON_RESERVE : 0),
    );
  }
  const width = Math.min(options.requestedWidth ?? Math.ceil(widest), options.maximumWidth);

  let y = M.contentInsetY;
  const entries: { item: TNativeMenuItem; child: boolean }[] = [];
  items.forEach((item: TNativeMenuItem): void => {
    entries.push({ item, child: false });
    if (item.items && expanded.has(item.id)) {
      item.items.forEach((c: TNativeMenuItem): void => {
        entries.push({ item: c, child: true });
      });
    }
  });
  const rows: TMenuRowLayout[] = entries.map(({ item, child }, index): TMenuRowLayout => {
    const kind: TMenuRowKind = item.separator
      ? "separator"
      : item.heading
        ? "heading"
        : "item";
    let height: number = M.rowHeight;
    if (kind === "separator") height = M.separatorBlock;
    else if (kind === "heading") height = M.headingHeight;
    else if (item.subtitle != null) height = M.rowHeight + M.subtitleExtra;
    const row: TMenuRowLayout = {
      index,
      kind,
      item,
      top: y,
      height,
      leading: leadingFor(item, reservesCheck),
      iconCenter: reservesCheck ? M.iconCenterWithCheck : M.iconCenterPlain,
      selectable: kind === "item" && !item.disabled,
      submenu: item.items !== undefined && !child,
      expanded: item.items !== undefined && !child && expanded.has(item.id),
      child,
    };
    y += height;
    return row;
  });

  return {
    width,
    height: y + M.contentInsetY,
    reservesCheck,
    rows,
  };
};

const placeMenu = (
  content: TMenuContentLayout,
  source: TMenuRect,
  through: TMenuRect,
  window: { width: number; height: number },
  alignment: TMenuAlignment,
): TMenuPlacement => {
  const margin = MENU_METRICS.margin;
  const top = 0;
  const bottom = window.height;
  const width = content.width;
  const maxHeight = bottom - top - margin;
  const height = Math.min(content.height, maxHeight);

  const throughCenterX = through.x + through.width / 2;
  const opensFromRight =
    alignment === "end" ||
    (alignment === "auto" && throughCenterX > window.width / 2);
  const rawLeft =
    alignment === "center"
      ? throughCenterX - width / 2
      : opensFromRight
        ? source.x + source.width - width
        : source.x;
  const left = Math.min(
    Math.max(rawLeft, margin),
    Math.max(window.width - width - margin, margin),
  );

  const roomBelow = bottom - source.y;
  const roomAbove = source.y + source.height - top;
  const opensAbove = roomBelow < height && roomAbove > roomBelow;
  const rawTop = opensAbove ? source.y + source.height - height : source.y;
  const menuTop = Math.min(
    Math.max(rawTop, top),
    Math.max(bottom - height, top),
  );

  return {
    left,
    top: menuTop,
    width,
    height,
    maxHeight,
    opensFromRight,
    opensAbove,
  };
};

export {
  MENU_FONT_FAMILY,
  MENU_METRICS,
  centeredBaseline,
  layoutMenuContent,
  placeMenu,
  springOf,
  textTopForBaseline,
  type TMenuContentLayout,
  type TMenuPlacement,
  type TMenuRowLayout,
};

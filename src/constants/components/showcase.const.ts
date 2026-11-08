import type { TTemplateSort, TShowcaseTab } from "../interface";

const SHOWCASE_GUTTER: number = 16;
const SHOWCASE_GAP: number = 8;
const SHOWCASE_MAX_FONT_SCALE: number = 1.3;

const SHOWCASE_TAB_CELL_WIDTH: number = 92;
const SHOWCASE_TAB_HEIGHT: number = 44;
const SHOWCASE_TAB_PADDING: number = 4;
const SHOWCASE_TAB_TOP_OFFSET: number = 8;
const SHOWCASE_TABS: readonly { id: TShowcaseTab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "gallery", label: "Gallery" },
];

const SHOWCASE_DOCK_BOTTOM_OFFSET: number = 12;
const SHOWCASE_DOCK_BUTTON_SIZE: number = 52;
const SHOWCASE_DOCK_CREATE_WIDTH: number = 84;

const SHOWCASE_EDGE_TOP_EXTRA: number = 76;
const SHOWCASE_EDGE_BOTTOM_EXTRA: number = 112;
const SHOWCASE_EDGE_WASH: string = "rgba(0, 0, 0, 0.72)";

const HERO_CARD_PEEK: number = 24;
const HERO_CARD_RADIUS: number = 32;
const HERO_CARD_HEIGHT_RATIO: number = 0.46;
const HERO_CARD_REST_SCALE: number = 0.95;
const HERO_CARD_REST_OPACITY: number = 0.72;
const HERO_BADGE_TINT: string = "rgba(72, 142, 255, 0.82)";
const HERO_BLUR_WASH: string = "rgba(20, 44, 96, 0.28)";

const TEMPLATE_TILE_HEIGHT_RATIO: number = 1.42;
const TEMPLATE_TILE_RADIUS: number = 28;
const TEMPLATE_TILE_BLUR_WASH: string = "rgba(0, 0, 0, 0.16)";
const TEMPLATE_PILL_WIDTH: number = 92;
const TEMPLATE_PILL_HEIGHT: number = 44;

const TEMPLATE_SORTS: readonly { id: TTemplateSort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
];

const GALLERY_ASPECTS: readonly (readonly number[])[] = [
  [1.32, 0.96, 1.18],
  [0.98, 1.3, 1.08],
];
const GALLERY_RADIUS: number = 22;

export {
  GALLERY_ASPECTS,
  GALLERY_RADIUS,
  HERO_BADGE_TINT,
  HERO_BLUR_WASH,
  HERO_CARD_HEIGHT_RATIO,
  HERO_CARD_PEEK,
  HERO_CARD_RADIUS,
  HERO_CARD_REST_OPACITY,
  HERO_CARD_REST_SCALE,
  SHOWCASE_DOCK_BOTTOM_OFFSET,
  SHOWCASE_DOCK_BUTTON_SIZE,
  SHOWCASE_DOCK_CREATE_WIDTH,
  SHOWCASE_EDGE_BOTTOM_EXTRA,
  SHOWCASE_EDGE_TOP_EXTRA,
  SHOWCASE_EDGE_WASH,
  SHOWCASE_GAP,
  SHOWCASE_GUTTER,
  SHOWCASE_MAX_FONT_SCALE,
  SHOWCASE_TAB_CELL_WIDTH,
  SHOWCASE_TAB_HEIGHT,
  SHOWCASE_TAB_PADDING,
  SHOWCASE_TAB_TOP_OFFSET,
  SHOWCASE_TABS,
  TEMPLATE_PILL_HEIGHT,
  TEMPLATE_PILL_WIDTH,
  TEMPLATE_SORTS,
  TEMPLATE_TILE_BLUR_WASH,
  TEMPLATE_TILE_HEIGHT_RATIO,
  TEMPLATE_TILE_RADIUS,
};

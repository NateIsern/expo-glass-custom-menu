import type { TShowcaseConfig } from "./interface";

/**
 * Every image on the showcase screen comes from this file.
 *
 * To use your own image:
 *   1. Drop the file into assets/showcase/
 *   2. Point a slot at it: image: require("@/assets/showcase/my-photo.jpg")
 *
 * A remote image works too: image: { uri: "https://example.com/photo.jpg" }
 *
 * Add or remove entries freely. The carousel, grid and gallery size themselves
 * to whatever is listed here. Each hero card takes exactly three images.
 */

const IMAGES = {
  beach: require("@/assets/showcase/beach.jpg"),
  flowers: require("@/assets/showcase/flowers.jpg"),
  forest: require("@/assets/showcase/forest.jpg"),
  hills: require("@/assets/showcase/hills.jpg"),
  lake: require("@/assets/showcase/lake.jpg"),
  meadow: require("@/assets/showcase/meadow.jpg"),
  mirror: require("@/assets/showcase/mirror.jpg"),
  path: require("@/assets/showcase/path.jpg"),
  peaks: require("@/assets/showcase/peaks.jpg"),
  road: require("@/assets/showcase/road.jpg"),
  sky: require("@/assets/showcase/sky.jpg"),
  stars: require("@/assets/showcase/stars.jpg"),
  trees: require("@/assets/showcase/trees.jpg"),
  valley: require("@/assets/showcase/valley.jpg"),
  waterfall: require("@/assets/showcase/waterfall.jpg"),
};

const SHOWCASE_CONFIG: TShowcaseConfig = {
  // The round image on the right of the bottom bar.
  avatar: IMAGES.flowers,

  // The swipeable cards at the top. `icon` is any Ionicons name.
  hero: [
    {
      id: "popular",
      label: "Popular",
      icon: "star",
      images: [IMAGES.beach, IMAGES.flowers, IMAGES.lake],
    },
    {
      id: "trending",
      label: "Trending",
      icon: "flame",
      images: [IMAGES.road, IMAGES.hills, IMAGES.waterfall],
    },
    {
      id: "fresh",
      label: "New",
      icon: "time",
      images: [IMAGES.stars, IMAGES.sky, IMAGES.mirror],
    },
  ],

  // The two-column grid on the Templates tab. Each tile opens the glass menu.
  // Listed oldest to newest: the "Newest" sort shows them in reverse.
  templates: [
    { id: "valley", name: "Valley", image: IMAGES.valley },
    { id: "trees", name: "Mist", image: IMAGES.trees },
    { id: "meadow", name: "Meadow", image: IMAGES.meadow },
    { id: "path", name: "Crossing", image: IMAGES.path },
    { id: "peaks", name: "Golden hour", image: IMAGES.peaks },
    { id: "sky", name: "Dusk", image: IMAGES.sky },
    { id: "forest", name: "Forest", image: IMAGES.forest },
    { id: "lake", name: "Lake", image: IMAGES.lake },
  ],

  // The masonry grid on the Gallery tab.
  gallery: [
    IMAGES.lake,
    IMAGES.stars,
    IMAGES.road,
    IMAGES.flowers,
    IMAGES.mirror,
    IMAGES.waterfall,
    IMAGES.beach,
    IMAGES.hills,
    IMAGES.forest,
    IMAGES.valley,
    IMAGES.sky,
    IMAGES.trees,
  ],
};

export { SHOWCASE_CONFIG };

import type { SharedValue } from "react-native-reanimated";

import type { THeroCard } from "@/config/interface";

interface IHeroCarousel {
  cards: readonly THeroCard[];
}

interface IHeroCardView {
  card: THeroCard;
  index: number;
  width: number;
  height: number;
  snap: number;
  offset: SharedValue<number>;
}

export { type IHeroCardView, type IHeroCarousel };

import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ImageSource } from "expo-image";
import type { ComponentProps } from "react";

type TShowcaseImage = number | string | ImageSource;

type THeroBadgeIcon = ComponentProps<typeof Ionicons>["name"];

type THeroCard = {
  id: string;
  label: string;
  icon: THeroBadgeIcon;
  images: readonly [TShowcaseImage, TShowcaseImage, TShowcaseImage];
};

type TTemplate = {
  id: string;
  name: string;
  image: TShowcaseImage;
};

type TShowcaseConfig = {
  avatar: TShowcaseImage;
  hero: readonly THeroCard[];
  templates: readonly TTemplate[];
  gallery: readonly TShowcaseImage[];
};

export {
  type THeroBadgeIcon,
  type THeroCard,
  type TShowcaseConfig,
  type TShowcaseImage,
  type TTemplate,
};

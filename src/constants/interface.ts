import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

type TScheme = "light" | "dark";

type TPalette = {
  background: string;
  ink: string;
  chevron: string;
};

type TPlaylist = {
  title: string;
  colors: readonly [string, string];
};

type TLibraryLayout = "grid" | "list";

type TLibraryLayoutIcon = ComponentProps<typeof Ionicons>["name"];

type TShowcaseTab = "templates" | "gallery";

type TTemplateSort = "featured" | "newest";

export {
  type TLibraryLayout,
  type TLibraryLayoutIcon,
  type TPalette,
  type TPlaylist,
  type TScheme,
  type TShowcaseTab,
  type TTemplateSort,
};

import type { SharedValue } from "react-native-reanimated";

import type { TShowcaseTab } from "@/constants/interface";

interface IShowcaseTabs {
  tab: TShowcaseTab;
  progress: SharedValue<number>;
  topInset: number;
  onChange: (tab: TShowcaseTab) => void;
}

interface IShowcaseTabCell {
  index: number;
  label: string;
  selected: boolean;
  progress: SharedValue<number>;
  onPress: () => void;
}

export { type IShowcaseTabCell, type IShowcaseTabs };

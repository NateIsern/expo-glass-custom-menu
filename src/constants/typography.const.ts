import { Platform } from "react-native";

const TYPOGRAPHY_FONT_FAMILY: string = Platform.select({
  ios: "SFProRounded-Medium",
  default: "SF-Pro-Rounded-Medium",
});

export { TYPOGRAPHY_FONT_FAMILY };

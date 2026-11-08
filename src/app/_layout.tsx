import { Stack } from "expo-router";
import type { FC } from "react";

import { NAVIGATION_STACK_OPTIONS } from "@/constants/navigation.const";

const RootLayout: FC = (): React.ReactNode & React.JSX.Element => (
  <Stack screenOptions={NAVIGATION_STACK_OPTIONS} />
);

export default RootLayout;

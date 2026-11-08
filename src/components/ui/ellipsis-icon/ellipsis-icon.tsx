import { ELLIPSIS_ICON_DOTS } from "@/constants/components/ellipsis-icon.const";
import { registerComponent } from "@/utils/register-component.util";
import type { FC } from "react";
import { StyleSheet, View } from "react-native";

import type { IEllipsisIcon } from "./interface";

const EllipsisIconBase: FC<IEllipsisIcon> = ({
  color,
}: IEllipsisIcon &
  React.ComponentProps<typeof EllipsisIconBase>): React.ReactNode &
  React.JSX.Element => (
  <View style={styles.container}>
    {ELLIPSIS_ICON_DOTS.map(
      (dot: number): React.JSX.Element => (
        <View key={dot} style={[styles.dot, { backgroundColor: color }]} />
      ),
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

const EllipsisIcon = registerComponent("EllipsisIcon", EllipsisIconBase);

export { EllipsisIcon };

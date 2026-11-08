import type { FC } from "react";
import { StyleSheet, View } from "react-native";

import { registerComponent } from "@/utils/register-component.util";

import type { IPlusIcon } from "./interface";

const PlusIconBase: FC<IPlusIcon> = ({
  color,
}: IPlusIcon & React.ComponentProps<typeof PlusIconBase>): React.ReactNode &
  React.JSX.Element => (
  <View style={styles.container}>
    <View style={[styles.horizontal, { backgroundColor: color }]} />
    <View style={[styles.vertical, { backgroundColor: color }]} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontal: {
    position: "absolute",
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  vertical: {
    position: "absolute",
    width: 2,
    height: 18,
    borderRadius: 1,
  },
});

const PlusIcon = registerComponent("PlusIcon", PlusIconBase);

export { PlusIcon };

import type { FC } from "react";
import { StyleSheet, View } from "react-native";

import { FILTER_ICON_BAR_WIDTHS } from "@/constants/components/filter-icon.const";
import { registerComponent } from "@/utils/register-component.util";

import type { IFilterIcon } from "./interface";

const FilterIconBase: FC<IFilterIcon> = ({
  color,
}: IFilterIcon & React.ComponentProps<typeof FilterIconBase>): React.ReactNode &
  React.JSX.Element => (
  <View style={styles.container}>
    {FILTER_ICON_BAR_WIDTHS.map((width: number): React.JSX.Element => (
      <View
        key={width}
        style={[styles.bar, { width, backgroundColor: color }]}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    height: 2,
    borderRadius: 1,
    marginVertical: 2,
  },
});

const FilterIcon = registerComponent("FilterIcon", FilterIconBase);

export { FilterIcon };

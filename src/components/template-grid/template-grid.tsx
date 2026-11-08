import type { FC } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { TemplateTile } from "@/components/template-tile";
import {
  SHOWCASE_GAP,
  SHOWCASE_GUTTER,
} from "@/constants/components/showcase.const";
import { SPRING } from "@/constants/motion.const";
import { registerComponent } from "@/utils/register-component.util";

import type { ITemplateGrid } from "./interface";

const REORDER_TRANSITION = LinearTransition.springify()
  .damping(SPRING.smooth.damping)
  .stiffness(SPRING.smooth.stiffness)
  .mass(SPRING.smooth.mass);

const TemplateGridBase: FC<ITemplateGrid> = ({
  templates,
}: ITemplateGrid &
  React.ComponentProps<typeof TemplateGridBase>): React.ReactNode &
  React.JSX.Element => {
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - SHOWCASE_GUTTER * 2 - SHOWCASE_GAP) / 2;

  return (
    <View style={styles.grid}>
      {templates.map((template) => (
        <Animated.View key={template.id} layout={REORDER_TRANSITION}>
          <TemplateTile template={template} width={tileWidth} />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SHOWCASE_GAP,
    paddingHorizontal: SHOWCASE_GUTTER,
  },
});

const TemplateGrid = registerComponent("TemplateGrid", TemplateGridBase);

export { TemplateGrid };

import {
  LIBRARY_HERO_GRADIENT,
  LIBRARY_HERO_SUBTITLE,
  LIBRARY_HERO_TITLE,
  LIBRARY_HERO_TOP_SPACING,
} from "@/constants/components/library-hero.const";
import { TYPOGRAPHY_FONT_FAMILY } from "@/constants/typography.const";
import { registerComponent } from "@/utils/register-component.util";
import type { FC } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ILibraryHero } from "./interface";

const LibraryHeroBase: FC<ILibraryHero> = ({
  topInset,
}: ILibraryHero &
  React.ComponentProps<typeof LibraryHeroBase>): React.ReactNode &
  React.JSX.Element => (
  <View
    style={[
      styles.container,
      { paddingTop: topInset + LIBRARY_HERO_TOP_SPACING },
    ]}
  >
    <Text style={styles.title}>{LIBRARY_HERO_TITLE}</Text>
    <Text style={styles.subtitle}>{LIBRARY_HERO_SUBTITLE}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    height: 340,
    justifyContent: "flex-end",
    padding: 20,
    experimental_backgroundImage: LIBRARY_HERO_GRADIENT,
  },
  title: {
    color: "#fff",
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontSize: 40,
  },
  subtitle: {
    color: "#fff",
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontSize: 16,
    marginTop: 4,
  },
});

const LibraryHero = registerComponent("LibraryHero", LibraryHeroBase);

export { LibraryHero };

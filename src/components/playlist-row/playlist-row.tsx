import type { FC } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TYPOGRAPHY_FONT_FAMILY } from "@/constants/typography.const";
import { registerComponent } from "@/utils/register-component.util";

import type { IPlaylistRow } from "./interface";

const PlaylistRowBase: FC<IPlaylistRow> = ({
  playlist,
  palette,
}: IPlaylistRow &
  React.ComponentProps<typeof PlaylistRowBase>): React.ReactNode &
  React.JSX.Element => (
  <View style={styles.container}>
    <View
      style={[
        styles.art,
        {
          experimental_backgroundImage: `linear-gradient(135deg, ${playlist.colors[0]}, ${playlist.colors[1]})`,
        },
      ]}
    />
    <Text numberOfLines={1} style={[styles.title, { color: palette.ink }]}>
      {playlist.title}
    </Text>
    <Text style={[styles.chevron, { color: palette.chevron }]}>›</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  art: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  title: {
    flex: 1,
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontSize: 16,
  },
  chevron: {
    fontSize: 22,
  },
});

const PlaylistRow = registerComponent("PlaylistRow", PlaylistRowBase);

export { PlaylistRow };

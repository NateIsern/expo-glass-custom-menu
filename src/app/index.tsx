import { LibraryToolbar } from "@/components/library-toolbar";
import { DevTestMenu } from "@/dev/dev-test-menu";
import { SkeletonList } from "@/components/skeleton-list";
import { PALETTE } from "@/constants/palette.const";
import { StatusBar } from "expo-status-bar";
import type { FC } from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
  useSafeAreaInsets,
  type EdgeInsets,
} from "react-native-safe-area-context";

const Index: FC = (): React.ReactNode & React.JSX.Element => {
  const insets: EdgeInsets = useSafeAreaInsets();

  // The dev menu is a sibling of the ScrollView: an absolute child of the scroll content would anchor to the
  // (much taller) content, not to the screen.
  return (
    <>
      <ScrollView bounces style={styles.screen} scrollEnabled>
        <StatusBar style="light" />
        <SkeletonList topInset={insets.top} />
        <LibraryToolbar topInset={insets.top} palette={PALETTE.dark} />
      </ScrollView>
      {__DEV__ ? <DevTestMenu /> : null}
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.dark.background,
  },
});

export default Index;

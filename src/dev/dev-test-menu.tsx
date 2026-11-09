import { Menu } from "@modules/glass-menu-android";
import type { FC } from "react";
import { StyleSheet, Text, View } from "react-native";

// A minimal second menu (not the toolbar), for checking the menu module on its own: two items and a submenu.
// Mounted only in development (see src/app/index.tsx); it is not part of the production screen.
const DevTestMenu: FC = (): React.ReactNode & React.JSX.Element => (
  <View style={styles.anchor} pointerEvents="box-none">
    <Menu colorScheme="dark">
      <Menu.Trigger openOnPress={true} glass={true} style={styles.pill}>
        <Text style={styles.label}>Prueba</Text>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item id="dev-a">
          <Menu.Item.Title>Elemento A</Menu.Item.Title>
        </Menu.Item>
        <Menu.Submenu id="dev-sub" title="Submenú de prueba">
          <Menu.Item id="dev-sub-1">
            <Menu.Item.Title>Hijo 1</Menu.Item.Title>
          </Menu.Item>
          <Menu.Item id="dev-sub-2">
            <Menu.Item.Title>Hijo 2</Menu.Item.Title>
          </Menu.Item>
        </Menu.Submenu>
        <Menu.Item id="dev-b">
          <Menu.Item.Title>Elemento B</Menu.Item.Title>
        </Menu.Item>
      </Menu.Content>
    </Menu>
  </View>
);

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 16,
    bottom: 120,
  },
  pill: {
    height: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 22,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
  },
});

export { DevTestMenu };

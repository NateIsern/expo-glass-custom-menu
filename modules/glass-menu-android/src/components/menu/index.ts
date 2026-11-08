import { createCompoundComponent } from "../../utils/create-compound-component.util";
import { MenuContent } from "../menu-content";
import { MenuItem } from "../menu-item";
import { MenuLabel } from "../menu-label";
import { MenuSeparator } from "../menu-separator";
import { MenuTrigger } from "../menu-trigger";
import { MenuTriggerButton } from "../menu-trigger-button";
import { MenuRoot } from "./menu";
const Menu = createCompoundComponent("Menu", MenuRoot, {
  Trigger: MenuTrigger,
  TriggerButton: MenuTriggerButton,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Label: MenuLabel,
});

export { Menu };

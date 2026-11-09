import type { ReactElement, ReactNode } from "react";

import { MenuItem } from "../components/menu-item/menu-item";
import { MenuSubmenu } from "../components/menu-submenu/menu-submenu";
import { MenuLabel } from "../components/menu-label/menu-label";
import { MenuSeparator } from "../components/menu-separator/menu-separator";
import type { TNativeMenuItem, TParsedMenu } from "../context/interface";
import type {
  IMenuContent,
  IMenuItem,
  IMenuLabel,
  ISubmenu,
  TMenuEntry,
  TMenuScheme,
} from "../interface";
import {
  flattenElements,
  type TElementWithChildren,
} from "./flatten-elements.util";
import { parseMenuItem } from "./parse-menu-item.util";
import { toNativeItem } from "./to-native-item.util";

const parseMenuContent = (
  content: IMenuContent | null,
  scheme: TMenuScheme,
): TParsedMenu => {
  const items: TNativeMenuItem[] = [];
  const icons: ReactNode[] = [];
  const handlers: Record<string, () => void> = {};
  if (!content) return { items, icons, handlers };

  (content.items ?? []).forEach((entry: TMenuEntry) => {
    items.push(toNativeItem(entry, items.length));
    if ("onSelect" in entry && entry.onSelect)
      handlers[entry.id] = entry.onSelect;
  });

  flattenElements(content.children).forEach((element: TElementWithChildren) => {
    if (element.type === MenuSeparator) {
      items.push({
        id: `separator-${items.length}`,
        title: "",
        separator: true,
      });
    } else if (element.type === MenuLabel) {
      const label: ReactElement<IMenuLabel> =
        element as ReactElement<IMenuLabel>;
      items.push({
        id: `heading-${items.length}`,
        title: label.props.children,
        heading: true,
      });
    } else if (element.type === MenuSubmenu) {
      const sub: ReactElement<ISubmenu> = element as ReactElement<ISubmenu>;
      const children: TNativeMenuItem[] = [];
      flattenElements(sub.props.children).forEach((part: TElementWithChildren): void => {
        if (part.type !== MenuItem) return;
        const entry: ReactElement<IMenuItem> = part as ReactElement<IMenuItem>;
        const child: TNativeMenuItem = parseMenuItem(entry, children.length, scheme, icons);
        children.push(child);
        if (entry.props.onSelect) handlers[child.id] = entry.props.onSelect;
      });
      items.push({
        id: sub.props.id ?? `submenu-${items.length}`,
        title: sub.props.title,
        icon: sub.props.icon,
        items: children,
      });
    } else if (element.type === MenuItem) {
      const entry: ReactElement<IMenuItem> = element as ReactElement<IMenuItem>;
      const item: TNativeMenuItem = parseMenuItem(
        entry,
        items.length,
        scheme,
        icons,
      );
      items.push(item);
      if (entry.props.onSelect) handlers[item.id] = entry.props.onSelect;
    }
  });

  return { items, icons, handlers };
};

export { parseMenuContent };

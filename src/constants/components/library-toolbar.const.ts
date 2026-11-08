import type { TLibraryLayout, TLibraryLayoutIcon } from "../interface";

const LIBRARY_TOOLBAR_DEFAULT_LAYOUT: TLibraryLayout = "list";
const LIBRARY_TOOLBAR_DEFAULT_SORT: string = "Playlist Type";
const LIBRARY_TOOLBAR_ICON_SIZE: number = 20;
const LIBRARY_TOOLBAR_LAYOUT_ICONS: Record<TLibraryLayout, TLibraryLayoutIcon> =
  {
    grid: "grid-outline",
    list: "list",
  };
const LIBRARY_TOOLBAR_LAYOUTS: readonly TLibraryLayout[] = ["grid", "list"];
const LIBRARY_TOOLBAR_LAYOUT_TITLES: Record<TLibraryLayout, string> = {
  grid: "Grid",
  list: "List",
};
const LIBRARY_TOOLBAR_SORTS: readonly string[] = [
  "Title",
  "Date Added",
  "Last Played Date",
  "Updated Date",
  "Playlist Type",
];
const LIBRARY_TOOLBAR_TOP_OFFSET: number = 6;
const LIBRARY_TOOLBAR_TRIGGER_LABEL: string = "Sort and view options";

export {
  LIBRARY_TOOLBAR_DEFAULT_LAYOUT,
  LIBRARY_TOOLBAR_DEFAULT_SORT,
  LIBRARY_TOOLBAR_ICON_SIZE,
  LIBRARY_TOOLBAR_LAYOUT_ICONS,
  LIBRARY_TOOLBAR_LAYOUT_TITLES,
  LIBRARY_TOOLBAR_LAYOUTS,
  LIBRARY_TOOLBAR_SORTS,
  LIBRARY_TOOLBAR_TOP_OFFSET,
  LIBRARY_TOOLBAR_TRIGGER_LABEL,
};

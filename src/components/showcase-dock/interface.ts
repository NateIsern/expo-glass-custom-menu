import type { TShowcaseImage } from "@/config/interface";
import type { TTemplateSort } from "@/constants/interface";

interface IShowcaseDock {
  avatar: TShowcaseImage;
  bottomInset: number;
  sort: TTemplateSort;
  onSortChange: (sort: TTemplateSort) => void;
}

export { type IShowcaseDock };

import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the site type scale and semantic colors so that
// e.g. `text-nav` and `text-(color:--nav-item-text)` are not treated as conflicts.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "heading-xl",
            "heading-lg",
            "heading-sm",
            "body-lg",
            "body-md",
            "body-sm",
            "label-lg",
            "label-sm",
            "nav",
          ],
        },
      ],
      "text-color": [
        {
          text: [
            "text-primary",
            "text-secondary",
            "text-tertiary",
            "text-white",
            "text-invert-primary",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the custom font-size tokens (text-body-md, text-h1,
// text-btn-md, …) so conflicting text-* classes resolve correctly.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "body-md",
            "body-sm",
            "body-xs",
            "body-2xs",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "s1",
            "s2",
            "btn-giant",
            "btn-lg",
            "btn-md",
            "btn-sm",
          ],
        },
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

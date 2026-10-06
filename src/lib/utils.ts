import { createCn } from "cn/config"

// Teach class merging about the Signal Lens scale; otherwise text-heading-* is
// read as a text color and dropped next to classes like text-positive-foreground.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["label", "heading-sm", "heading-md", "heading-lg"] }],
      shadow: [{ shadow: ["card", "overlay"] }],
    },
  },
})

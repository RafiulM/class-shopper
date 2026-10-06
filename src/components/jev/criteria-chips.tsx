import type { CriterionLevel } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CriteriaChipsProps {
  items: { label: string; level: CriterionLevel }[]
  className?: string
  "aria-label"?: string
}

/** Compact summary of a desire's criteria: solid = wajib, dashed = opsional. */
export function CriteriaChips({ items, className, ...props }: CriteriaChipsProps) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label={props["aria-label"] ?? "Kriteria"}>
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            "rounded-sm px-2 py-px text-xs/[18px] font-medium",
            item.level === "wajib"
              ? "bg-lens text-lens-foreground"
              : "border border-dashed border-input text-foreground",
          )}
        >
          {item.label}
        </li>
      ))}
    </ul>
  )
}

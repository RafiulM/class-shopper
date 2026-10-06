import { CheckIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  "aria-label": string
  className?: string
  /** Show a check next to the selected option (non-color cue). */
  showCheck?: boolean
  size?: "sm" | "default"
}

/** Single-choice segmented control that can never end up empty. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  showCheck,
  size = "default",
  ...props
}: SegmentedProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      spacing={1}
      size={size}
      className={cn("rounded-lg bg-muted p-1", className)}
      aria-label={props["aria-label"]}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="flex-1 rounded-md px-3 font-medium hover:bg-background/60 data-[state=on]:bg-background data-[state=on]:shadow-[0_0_0_1px_var(--border),0_1px_3px_rgb(0_0_0/8%)]"
        >
          {showCheck && value === option.value && <CheckIcon aria-hidden />}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

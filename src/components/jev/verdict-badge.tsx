import { CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react"

import type { Verdict } from "@/lib/types"
import { cn } from "@/lib/utils"

const COPY = {
  cocok: { label: "Cocok", Icon: CheckIcon },
  tidak_cocok: { label: "Tidak cocok", Icon: XIcon },
  pending: { label: "Menilai…", Icon: LoaderCircleIcon },
} as const

interface VerdictBadgeProps extends React.ComponentProps<"span"> {
  verdict: Verdict | "pending"
  /** Icon-only pill ("Ikon ringkas"); the label stays available to screen readers. */
  compact?: boolean
}

/** Mirrors the strip that src/content/overlay.ts draws on store cards. */
export function VerdictBadge({ verdict, compact, className, ...props }: VerdictBadgeProps) {
  const { label, Icon } = COPY[verdict]
  return (
    <span
      data-verdict={verdict}
      className={cn(
        "flex min-h-7.5 items-center py-1 pr-2.5 pl-2 text-xs/4 font-extrabold tracking-wide uppercase",
        verdict === "cocok" && "bg-match text-foreground",
        verdict === "tidak_cocok" && "bg-mismatch text-white",
        verdict === "pending" && "bg-primary text-primary-foreground",
        compact && "min-h-0 w-fit rounded-full p-1 shadow-[0_0_0_2px_#fff,0_2px_6px_rgb(0_0_0/30%)]",
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1">
        <Icon aria-hidden strokeWidth={3} className={cn("size-4", verdict === "pending" && "animate-spin")} />
        <span className={cn(compact && "sr-only")}>{label}</span>
      </span>
      <span className="sr-only"> menurut Jev</span>
    </span>
  )
}

import { useEffect, useRef } from "react"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** One popup view: a scrolling body and an optional pinned footer. */
export function View({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex min-h-0 flex-1 flex-col">
      {children}
    </section>
  )
}

export function ViewBody({ className, ...props }: React.ComponentProps<"div">) {
  // *:shrink-0 keeps fixed-height controls intact once the body starts scrolling.
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 *:shrink-0", className)} {...props} />
}

export function ViewFooter({ note, children }: { note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t bg-background px-4 pt-3 pb-4">
      {children}
      {note && <p className="text-center text-xs/[18px] text-muted-foreground [overflow-wrap:anywhere]">{note}</p>}
    </div>
  )
}

/** View title that takes focus when the view opens, so keyboard users land in context. */
export function ViewTitle({
  children,
  lead,
  focusOnMount = true,
}: {
  children: React.ReactNode
  lead?: React.ReactNode
  focusOnMount?: boolean
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
  }, [focusOnMount])
  return (
    <div>
      <h2 ref={ref} tabIndex={-1} className="text-heading-sm focus:outline-none">
        {children}
      </h2>
      {lead && <p className="mt-1 text-muted-foreground">{lead}</p>}
    </div>
  )
}

/** Quiet "← …" link at the top of a view. */
export function BackLink({ className, children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="link"
      className={cn("h-auto self-start p-0 font-normal text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      <ArrowLeftIcon aria-hidden />
      {children}
    </Button>
  )
}

export function SectionLabel({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-sans text-sm font-medium", className)} {...props} />
}

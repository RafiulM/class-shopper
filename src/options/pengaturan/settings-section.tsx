import { cn } from "@/lib/utils"

/** Two-column settings row: title and description on the left, controls on the right. */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={title}
      className={cn("grid grid-cols-[260px_minmax(0,1fr)] gap-x-8 gap-y-4 border-t py-8 max-md:grid-cols-1 max-md:py-6", className)}
    >
      <div>
        <h2 className="text-heading-sm">{title}</h2>
        <p className="mt-1.5 text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </section>
  )
}

export function SettingsCard({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", className)} {...props} />
}

import { useId } from "react"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface LensPhrase {
  text: string
  state: "on" | "off" | "active"
}

interface LensInputProps {
  label: string
  /** Small control on the label row, e.g. "Keinginan baru". */
  action?: React.ReactNode
  value: string
  onChange: (value: string) => void
  phrases: LensPhrase[]
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
  disabled?: boolean
  maxLength?: number
}

// Backdrop and textarea must share every metric so the marks sit exactly behind the words.
const METRICS =
  "block w-full m-0 border-0 px-3 py-2 font-sans text-sm/[23px] tracking-normal whitespace-pre-wrap [overflow-wrap:anywhere]"

/**
 * Editable desire with the Insight Lens drawn behind the text: phrases that
 * criteria came from stay highlighted while the user edits.
 */
export function LensInput({ label, action, value, onChange, phrases, onKeyDown, disabled, maxLength = 200 }: LensInputProps) {
  const id = useId()
  const lower = value.toLowerCase()
  const hits: { start: number; end: number; state: LensPhrase["state"] }[] = []
  for (const phrase of phrases) {
    const at = phrase.text ? lower.indexOf(phrase.text.toLowerCase()) : -1
    if (at < 0) continue
    const end = at + phrase.text.length
    if (!hits.some((h) => at < h.end && end > h.start)) hits.push({ start: at, end, state: phrase.state })
  }
  hits.sort((a, b) => a.start - b.start)
  const nodes: React.ReactNode[] = []
  let pos = 0
  for (const hit of hits) {
    if (hit.start > pos) nodes.push(value.slice(pos, hit.start))
    nodes.push(
      <mark
        key={hit.start}
        className={cn(
          "rounded-sm bg-lens text-transparent box-decoration-clone transition-shadow duration-150 ease-standard",
          hit.state === "active" && "shadow-[inset_0_-2px_0_var(--lens-foreground)]",
          hit.state === "off" && "bg-transparent line-through decoration-muted-foreground",
        )}
      >
        {value.slice(hit.start, hit.end)}
      </mark>,
    )
    pos = hit.end
  }
  // A trailing space keeps a final line break the same height as in the textarea.
  nodes.push(value.slice(pos) + " ")

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {action}
      </div>
      <div className="relative rounded-md border border-input bg-background transition-colors focus-within:border-primary-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:border-faint">
        <div aria-hidden className={cn(METRICS, "pointer-events-none absolute inset-0 overflow-hidden text-transparent")}>
          {nodes}
        </div>
        <textarea
          id={id}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          spellCheck={false}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            METRICS,
            "relative min-h-12 resize-none overflow-hidden bg-transparent text-foreground outline-none [field-sizing:content] disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
      </div>
    </div>
  )
}

interface DesireChangedProps {
  actionLabel: string
  onAction: () => void
  onUndo: () => void
  disabled?: boolean
  busy?: boolean
}

/** Shown under an edited desire: the criteria no longer match the text until re-run. */
export function DesireChanged({ actionLabel, onAction, onUndo, disabled, busy }: DesireChangedProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg bg-lens py-2 pr-2 pl-3 text-xs/[18px] text-lens-foreground"
    >
      <p>Keinginan berubah.</p>
      <div className="flex items-center gap-3">
        <Button variant="link" size="xs" className="h-auto p-0 text-lens-foreground underline" onClick={onUndo}>
          Batalkan
        </Button>
        <Button size="sm" disabled={disabled} onClick={onAction}>
          {busy && <LoaderCircleIcon aria-hidden className="animate-spin" />}
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}

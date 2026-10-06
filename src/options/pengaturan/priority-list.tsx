import { useEffect, useRef, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PRIORITY_COPY } from "@/shared/settings"
import type { Priority } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Atur Prioritas: reorder with up/down buttons; the new position is announced. */
export function PriorityList({ value, onChange }: { value: Priority[]; onChange: (next: Priority[]) => void }) {
  const [announcement, setAnnouncement] = useState("")
  const listRef = useRef<HTMLOListElement>(null)
  const focusAfterMove = useRef<{ key: Priority; dir: -1 | 1 } | null>(null)

  // Keep focus on the pressed button; if it just became disabled, use its sibling.
  useEffect(() => {
    const pending = focusAfterMove.current
    if (!pending) return
    focusAfterMove.current = null
    const pick = (dir: number) =>
      listRef.current?.querySelector<HTMLButtonElement>(`[data-move="${pending.key}:${dir}"]`)
    const same = pick(pending.dir)
    ;(same && !same.disabled ? same : pick(-pending.dir))?.focus()
  })

  const move = (key: Priority, dir: -1 | 1) => {
    const from = value.indexOf(key)
    const to = from + dir
    if (to < 0 || to >= value.length) return
    const next = [...value]
    ;[next[from], next[to]] = [next[to], next[from]]
    focusAfterMove.current = { key, dir }
    setAnnouncement(`${PRIORITY_COPY[key].label} sekarang prioritas ${to + 1}.`)
    onChange(next)
  }

  return (
    <>
      <ol ref={listRef} className="divide-y overflow-hidden rounded-xl border">
        {value.map((key, index) => (
          <li key={key} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 bg-card px-4 py-3">
            <span
              aria-hidden
              className={cn(
                "grid size-7 place-items-center rounded-full bg-muted font-medium tabular-nums",
                index === 0 && "bg-lens text-lens-foreground",
              )}
            >
              {index + 1}
            </span>
            <div>
              <p className="font-medium">{PRIORITY_COPY[key].label}</p>
              <p className="text-xs/[18px] text-muted-foreground">{PRIORITY_COPY[key].hint}</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                data-move={`${key}:-1`}
                disabled={index === 0}
                aria-label={`Naikkan prioritas ${PRIORITY_COPY[key].label}`}
                onClick={() => move(key, -1)}
              >
                <ArrowUpIcon aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                data-move={`${key}:1`}
                disabled={index === value.length - 1}
                aria-label={`Turunkan prioritas ${PRIORITY_COPY[key].label}`}
                onClick={() => move(key, 1)}
              >
                <ArrowDownIcon aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  )
}

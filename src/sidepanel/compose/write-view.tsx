import { useId, useRef } from "react"
import { ArrowRightIcon, HistoryIcon, SearchIcon } from "lucide-react"

import { Segmented } from "@/components/jev/segmented"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EXAMPLE_DESIRES } from "@/lib/examples"
import { STORES, type DesireHistoryItem, type StoreName } from "@/lib/types"
import { BackLink, SectionLabel, View, ViewBody, ViewFooter } from "@/sidepanel/view-layout"

const MAX_LENGTH = 200
/** The counter only appears once the limit is close enough to matter. */
const COUNTER_FROM = 160

interface WriteViewProps {
  text: string
  onTextChange: (text: string) => void
  store: StoreName
  onStoreChange: (store: StoreName) => void
  jevEnabled: boolean
  recent: DesireHistoryItem[]
  error: string | null
  onStart: () => void
  onReuse: (item: DesireHistoryItem) => void
  onOpenHistory: () => void
  onCancel?: () => void
}

/** Panel Keinginan: Tulis Keinginan, Contoh Keinginan, Mulai Pencarian. */
export function WriteView({
  text,
  onTextChange,
  store,
  onStoreChange,
  jevEnabled,
  recent,
  error,
  onStart,
  onReuse,
  onOpenHistory,
  onCancel,
}: WriteViewProps) {
  const inputId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canStart = jevEnabled && text.trim() !== ""

  return (
    <View label="Tulis keinginan">
      <ViewBody>
        {onCancel && <BackLink onClick={onCancel}>Kembali ke hasil</BackLink>}

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs/[18px] text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-heading-sm">
            <label htmlFor={inputId}>Mau cari apa?</label>
          </h2>
          <Textarea
            ref={textareaRef}
            id={inputId}
            autoFocus
            rows={3}
            maxLength={MAX_LENGTH}
            value={text}
            placeholder="Sebut barangnya, budget, dan yang penting buatmu"
            className="min-h-21 resize-y text-sm/[23px]"
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canStart) {
                e.preventDefault()
                onStart()
              }
            }}
          />
          {text.length >= COUNTER_FROM && (
            <p className="self-end text-xs/[18px] text-muted-foreground tabular-nums">
              {text.length}/{MAX_LENGTH}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span aria-hidden className="text-xs/[18px] text-muted-foreground">
              Cari di
            </span>
            <Segmented
              aria-label="Cari di toko"
              size="sm"
              value={store}
              onValueChange={onStoreChange}
              options={STORES.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Contoh</SectionLabel>
          <ul className="flex flex-wrap gap-1.5">
            {EXAMPLE_DESIRES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  className="rounded-md border px-2.5 py-1 text-left text-xs/[18px] transition-colors duration-150 hover:border-input hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  onClick={() => {
                    onTextChange(example)
                    textareaRef.current?.focus()
                  }}
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {recent.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <SectionLabel>Terakhir dicari</SectionLabel>
              <Button variant="link" size="xs" className="h-auto p-0 text-muted-foreground underline" onClick={onOpenHistory}>
                Lihat semua
              </Button>
            </div>
            <ul className="-mx-2">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!jevEnabled}
                    onClick={() => onReuse(item)}
                    className="group flex w-full items-start gap-2.5 rounded-md p-2 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
                  >
                    <HistoryIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      <span className="line-clamp-2">{item.text}</span>
                      <span className="block text-xs/[18px] text-muted-foreground">
                        {item.store}
                        {item.resultSummary ? ` · ${item.resultSummary}` : ""}
                        <span className="sr-only">. Cari lagi.</span>
                      </span>
                    </span>
                    <ArrowRightIcon
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-disabled:hidden"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ViewBody>

      <ViewFooter>
        <Button className="h-10 w-full" disabled={!canStart} onClick={onStart}>
          <SearchIcon aria-hidden />
          Mulai Pencarian
        </Button>
      </ViewFooter>
    </View>
  )
}

import { useState } from "react"
import { CheckIcon, ChevronDownIcon, HighlighterIcon, LoaderCircleIcon, MinusIcon, RefreshCwIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Toggle } from "@/components/ui/toggle"
import type { CheckStatus, CriterionCheck, SearchSession } from "@/lib/types"
import { cn } from "@/lib/utils"
import { send } from "@/shared/messages"
import { BackLink, SectionLabel, View, ViewBody } from "@/sidepanel/view-layout"

const STATUS: Record<CheckStatus, { label: string; Icon: typeof CheckIcon; className: string; text: string }> = {
  terpenuhi: { label: "Terpenuhi", Icon: CheckIcon, className: "bg-positive-muted text-positive-foreground", text: "text-positive-foreground" },
  sebagian: { label: "Sebagian", Icon: MinusIcon, className: "bg-warning-muted text-warning-foreground", text: "text-warning-foreground" },
  tidak: { label: "Tidak terpenuhi", Icon: XIcon, className: "bg-destructive/10 text-destructive", text: "text-destructive" },
}

const confidenceWord = (n: number) => (n >= 90 ? "Sangat yakin" : n >= 75 ? "Cukup yakin" : "Kurang yakin")

/** Konfirmasi Detail + Penjelasan Jev for the product page in the active tab. */
export function DetailView({ session }: { session: SearchSession }) {
  const [highlight, setHighlight] = useState(true)
  const detail = session.detail
  const result = detail?.result
  const matched = result?.classification.label === "cocok"
  const matchCount = session.products.filter((p) => p.classification?.label === "cocok").length

  return (
    <View label="Konfirmasi produk">
      <ViewBody>
        <BackLink onClick={() => void send({ type: "back-to-results" })}>
          Hasil di {session.store}
          {matchCount > 0 && ` · ${matchCount} cocok`}
        </BackLink>

        <div className="flex flex-col gap-0.5">
          <h2 className="font-sans text-sm font-medium">{detail?.page.title}</h2>
          {detail?.page.priceText && <p className="text-xs/[18px] text-muted-foreground tabular-nums">{detail.page.priceText}</p>}
        </div>

        {detail?.status === "checking" && (
          <div role="status" className="flex flex-col items-center gap-2 px-2 py-8 text-center text-muted-foreground">
            <LoaderCircleIcon aria-hidden className="size-6 animate-spin text-primary-strong" />
            <p>Jev sedang mengecek ulang judul &amp; deskripsi produk ini…</p>
          </div>
        )}

        {detail?.status === "error" && (
          <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs/[18px] text-destructive">
            <p>{detail.error}</p>
            <Button size="sm" variant="outline" className="self-start" onClick={() => void send({ type: "recheck-detail" })}>
              Coba lagi
            </Button>
          </div>
        )}

        {result && detail?.status === "done" && (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-muted", matched && "bg-positive-muted text-positive-foreground")}
                >
                  {matched ? <CheckIcon className="size-5" /> : <XIcon className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-heading text-heading-md", matched && "text-positive-foreground")}>
                    {matched ? "Cocok" : "Tidak cocok"}
                  </p>
                  <p className="text-xs/[18px] text-muted-foreground tabular-nums">
                    {confidenceWord(result.classification.confidence)} · {result.classification.confidence}%
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label="Cek ulang"
                  title="Cek ulang judul & deskripsi"
                  onClick={() => void send({ type: "recheck-detail" })}
                >
                  <RefreshCwIcon aria-hidden />
                </Button>
              </div>
              <p>{result.classification.summary}</p>
            </div>

            <section aria-label="Dibanding keinginanmu" className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <SectionLabel>Dibanding keinginanmu</SectionLabel>
                <Toggle
                  variant="outline"
                  size="sm"
                  pressed={highlight}
                  onPressedChange={(on) => {
                    setHighlight(on)
                    void send({ type: "highlight-evidence", quote: null, all: on })
                  }}
                  title="Sorot bukti di halaman produk"
                  className="gap-1.5 px-2.5 text-xs data-[state=on]:border-primary-strong data-[state=on]:bg-lens data-[state=on]:text-lens-foreground"
                >
                  <HighlighterIcon aria-hidden />
                  Sorot
                </Toggle>
              </div>
              <ul className="-mx-2 flex flex-col">
                {result.checks.map((check) => (
                  <li key={check.criterion}>
                    <CheckRow check={check} onShow={() => void send({ type: "highlight-evidence", quote: check.quote, all: highlight })} />
                  </li>
                ))}
              </ul>
              {result.note && <p className="rounded-md bg-muted px-3 py-2.5 text-xs/[18px]">{result.note}</p>}
            </section>

            {result.classification.reasons.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="group inline-flex items-center gap-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  Alasan Jev
                  <ChevronDownIcon aria-hidden className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 list-disc space-y-1 pl-[18px]">
                    {result.classification.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </ViewBody>
    </View>
  )
}

/** One criterion vs the page; the whole row points at its evidence when there is a quote. */
function CheckRow({ check, onShow }: { check: CriterionCheck; onShow: () => void }) {
  const status = STATUS[check.status]
  const content = (
    <>
      <span aria-hidden className={cn("mt-px grid size-5 place-items-center rounded-full", status.className)}>
        <status.Icon className="size-3" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">
          {check.criterion}
          {check.optional && " (opsional)"}: {check.want}
          {/* Terpenuhi is the expected case; only exceptions get a word. */}
          {check.status === "terpenuhi" ? (
            <span className="sr-only"> ({status.label})</span>
          ) : (
            <span className={cn("ml-1.5 text-label", status.text)}>{status.label}</span>
          )}
        </span>
        <span className="text-xs/[18px] text-muted-foreground">{check.evidence}</span>
        {check.quote && <span className="sr-only">. Lihat di halaman.</span>}
      </span>
    </>
  )
  const className = "grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 rounded-md p-2 text-left"
  if (!check.quote) return <div className={className}>{content}</div>
  return (
    <button
      type="button"
      title="Lihat di halaman produk"
      onClick={onShow}
      className={cn(
        className,
        "transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
      )}
    >
      {content}
    </button>
  )
}

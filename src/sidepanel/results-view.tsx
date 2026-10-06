import { useState } from "react"
import { ArrowDownWideNarrowIcon, CheckIcon, LoaderCircleIcon, PlusIcon, SquareArrowOutUpRightIcon, XIcon } from "lucide-react"

import { Segmented } from "@/components/jev/segmented"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { normalizeText, usedCriteria } from "@/lib/desire"
import { otherStore, type ProductResult, type SearchSession } from "@/lib/types"
import { cn } from "@/lib/utils"
import { send } from "@/shared/messages"
import { DesireChanged, LensInput } from "@/sidepanel/lens-input"
import { View, ViewBody } from "@/sidepanel/view-layout"

type Filter = "cocok" | "semua" | "tidak"

interface ResultsViewProps {
  session: SearchSession
  jevEnabled: boolean
  onEditCriteria: () => void
  onNewDesire: () => void
}

const rank = (p: ProductResult) => (p.classification?.label === "cocok" ? 0 : p.status === "pending" ? 1 : 2)

/** Hasil di sidebar: the desire, then the evaluated listings, linked to the store tab. */
export function ResultsView({ session, jevEnabled, onEditCriteria, onNewDesire }: ResultsViewProps) {
  const [filter, setFilter] = useState<Filter>("cocok")
  const [text, setText] = useState(session.desire.text)
  const [seenSession, setSeenSession] = useState(session.id)
  const [busy, setBusy] = useState<"research" | "switch" | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (seenSession !== session.id) {
    setSeenSession(session.id)
    setText(session.desire.text)
  }

  const products = session.products
  const match = products.filter((p) => p.classification?.label === "cocok").length
  const miss = products.filter((p) => p.classification?.label === "tidak_cocok").length
  const pending = products.filter((p) => p.status === "pending").length
  const failed = products.filter((p) => p.status === "error").length
  const dirty = normalizeText(text) !== normalizeText(session.desire.text)
  const criteria = usedCriteria(session.desire.criteria)
  const visible = products
    .filter((p) =>
      filter === "semua" ? true : filter === "cocok" ? p.classification?.label === "cocok" : p.classification?.label === "tidak_cocok",
    )
    .sort((a, b) => rank(a) - rank(b) || (b.classification?.confidence ?? 0) - (a.classification?.confidence ?? 0))
  const progress =
    session.phase === "opening" ? `Membuka ${session.store} dan membaca produk…` : pending > 0 ? `Menilai ${pending} produk…` : null

  const run = async (kind: "research" | "switch") => {
    setBusy(kind)
    setError(null)
    try {
      const desire = kind === "research" ? await send({ type: "understand", text: text.trim() }) : session.desire
      await send({ type: "start-search", desire, store: kind === "switch" ? otherStore(session.store) : session.store })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <View label="Hasil pencarian">
      <ViewBody>
        <section aria-label="Keinginanmu" className="flex flex-col gap-2">
          <LensInput
            label="Keinginanmu"
            action={
              <Button
                variant="link"
                size="xs"
                className="h-auto p-0 font-normal text-muted-foreground hover:text-foreground"
                onClick={onNewDesire}
              >
                <PlusIcon aria-hidden />
                Keinginan baru
              </Button>
            }
            value={text}
            onChange={setText}
            disabled={busy !== null}
            phrases={session.desire.criteria
              .filter((c) => c.phrase)
              .map((c) => ({ text: c.phrase!, state: c.enabled ? "on" : "off" }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && dirty && text.trim()) {
                e.preventDefault()
                void run("research")
              }
            }}
          />
          {dirty ? (
            <DesireChanged
              actionLabel="Cari ulang"
              disabled={!jevEnabled || busy !== null || !text.trim()}
              busy={busy === "research"}
              onAction={() => void run("research")}
              onUndo={() => setText(session.desire.text)}
            />
          ) : (
            <p className="text-xs/[18px] text-muted-foreground">
              Kriteria:{" "}
              {criteria.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ", "}
                  <span className="text-foreground">{c.value}</span>
                  {c.level === "opsional" && " (opsional)"}
                </span>
              ))}
              .{" "}
              <Button variant="link" size="xs" className="h-auto p-0 align-baseline text-foreground underline" onClick={onEditCriteria}>
                Atur
              </Button>
            </p>
          )}
        </section>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs/[18px] text-destructive">
            {error}
          </p>
        )}

        {jevEnabled && (
          <section aria-label="Hasil" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="text-heading-sm">Hasil di {session.store}</h2>
              <Toggle
                variant="outline"
                size="sm"
                pressed={session.sorted}
                onPressedChange={(on) => void send({ type: "sort-page", on })}
                disabled={products.length === 0}
                aria-label="Urutkan halaman: cocok dulu"
                title="Urutkan kartu di halaman toko: cocok dulu"
                className="gap-1.5 text-xs data-[state=on]:border-primary-strong data-[state=on]:bg-lens data-[state=on]:text-lens-foreground"
              >
                <ArrowDownWideNarrowIcon aria-hidden />
                Cocok dulu
              </Toggle>
            </div>

            <div aria-live="polite" className="contents">
              {progress && (
                <p className="flex items-center gap-2 text-xs/[18px] text-muted-foreground">
                  <LoaderCircleIcon aria-hidden className="size-4 animate-spin text-primary-strong" />
                  {progress}
                </p>
              )}
              {session.error && (
                <p className="rounded-lg border border-warning/40 bg-warning-muted p-3 text-xs/[18px] text-warning-foreground">{session.error}</p>
              )}
            </div>

            {products.length > 0 && (
              <>
                <Segmented
                  aria-label="Saring hasil"
                  size="sm"
                  value={filter}
                  onValueChange={setFilter}
                  className="w-full"
                  options={[
                    { value: "cocok", label: <>Cocok <Count n={match} /></> },
                    { value: "semua", label: <>Semua <Count n={products.length} /></> },
                    { value: "tidak", label: <>Tidak <Count n={miss} /></> },
                  ]}
                />
                {visible.length > 0 ? (
                  <ol aria-label="Produk yang dinilai" className="-mx-2 -mt-1 divide-y">
                    {visible.map((p) => (
                      <ProductRow key={p.url} product={p} />
                    ))}
                  </ol>
                ) : (
                  <p className="py-6 text-center text-muted-foreground">Belum ada produk di sini.</p>
                )}
                {failed > 0 && <p className="text-xs/[18px] text-muted-foreground">{failed} produk belum bisa dinilai.</p>}
              </>
            )}

            <Button variant="outline" className="h-9" disabled={busy !== null} onClick={() => void run("switch")}>
              {busy === "switch" && <LoaderCircleIcon aria-hidden className="animate-spin" />}
              Cari juga di {otherStore(session.store)}
            </Button>
          </section>
        )}
      </ViewBody>
    </View>
  )
}

function Count({ n }: { n: number }) {
  return <span className="text-muted-foreground tabular-nums">{n}</span>
}

const VERDICT_TEXT = { cocok: "Cocok", tidak_cocok: "Tidak cocok", pending: "Menilai…", error: "Gagal dinilai" } as const

function ProductRow({ product: p }: { product: ProductResult }) {
  const c = p.classification
  const verdict = p.status === "pending" ? "pending" : p.status === "error" ? "error" : (c?.label ?? "pending")
  // Cocok/Tidak cocok is carried by the mark; only in-between states need words.
  const status = verdict === "pending" || verdict === "error" ? VERDICT_TEXT[verdict] : null
  return (
    <li className="flex items-start gap-1 py-1">
      <button
        type="button"
        title="Tunjukkan di halaman toko"
        onClick={() => void send({ type: "locate", url: p.url })}
        className="grid min-w-0 flex-1 grid-cols-[20px_minmax(0,1fr)] gap-2.5 rounded-md p-2 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden
          className={cn(
            "mt-px grid size-5 place-items-center rounded-full bg-muted",
            verdict === "cocok" && "bg-positive-muted text-positive-foreground",
          )}
        >
          {verdict === "pending" ? (
            <LoaderCircleIcon className="size-3 animate-spin text-muted-foreground" />
          ) : verdict === "cocok" ? (
            <CheckIcon className="size-3" />
          ) : (
            <XIcon className="size-3" />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="sr-only">{VERDICT_TEXT[verdict]}: </span>
          <span className="line-clamp-2 font-medium">{p.title}</span>
          {(p.priceText || status) && (
            <span className="text-xs/[18px] text-muted-foreground tabular-nums">
              {p.priceText}
              {p.priceText && status && " · "}
              {status && <span aria-hidden>{status}</span>}
            </span>
          )}
          {c && <span className="text-xs/[18px]">{c.summary}</span>}
          <span className="sr-only">. Tunjukkan di halaman toko.</span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="mt-1.5 text-muted-foreground"
        aria-label={`Buka produk: ${p.title}`}
        title="Buka produk"
        onClick={() => void send({ type: "open-product", url: p.url })}
      >
        <SquareArrowOutUpRightIcon aria-hidden />
      </Button>
    </li>
  )
}

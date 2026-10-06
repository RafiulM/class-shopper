import { useEffect, useId, useMemo, useRef, useState } from "react"
import { HardDriveIcon, HistoryIcon, RotateCcwIcon, SearchIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { CriteriaChips } from "@/components/jev/criteria-chips"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usedCriteria } from "@/lib/desire"
import { STORES, type DesireHistoryItem, type StoreName } from "@/lib/types"
import { PageHeading } from "@/options/page-heading"
import { clearHistory, deleteHistory, saveHistory } from "@/shared/db"
import { useHistory } from "@/shared/hooks"
import { send } from "@/shared/messages"

const DAY = 86_400_000
const GROUPS = [
  { id: "hari-ini", title: "Hari ini" },
  { id: "minggu-ini", title: "Minggu ini" },
  { id: "lebih-lama", title: "Lebih lama" },
] as const

function groupOf(ts: number): (typeof GROUPS)[number]["id"] {
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  if (ts >= startOfToday) return "hari-ini"
  return ts >= startOfToday - 6 * DAY ? "minggu-ini" : "lebih-lama"
}

function usedLabel(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return "baru saja"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  if (ts >= startOfToday) return `${Math.floor(diff / 3_600_000)} jam lalu`
  if (ts >= startOfToday - DAY) return "kemarin"
  if (ts >= startOfToday - 6 * DAY) return `${Math.ceil((startOfToday - ts) / DAY)} hari lalu`
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

type StoreFilter = "semua" | StoreName
type Order = "baru" | "lama"

/** Riwayat Keinginan: Pakai Ulang, Kelola Riwayat, Cari di Riwayat. */
export function RiwayatPage() {
  const [loaded, reload] = useHistory()
  const items = useMemo(() => loaded ?? [], [loaded])
  const [query, setQuery] = useState("")
  const [store, setStore] = useState<StoreFilter>("semua")
  const [order, setOrder] = useState<Order>("baru")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const clearAllRef = useRef<HTMLButtonElement>(null)
  const emptyTitleRef = useRef<HTMLHeadingElement>(null)
  const focusNext = useRef<string | null>(null)
  const ids = { search: useId(), store: useId(), order: useId() }
  const windowId = useRef<number | undefined>(undefined)
  useEffect(() => {
    chrome.windows.getCurrent().then((w) => (windowId.current = w.id))
  }, [])

  useEffect(() => {
    if (!focusNext.current) return
    const target =
      focusNext.current === "search"
        ? searchRef.current
        : focusNext.current === "empty"
          ? emptyTitleRef.current
          : document.querySelector<HTMLElement>(focusNext.current)
    // Controls are disabled once the list is empty; land on the empty-state title instead.
    if (target && !(target as HTMLInputElement).disabled) target.focus()
    else emptyTitleRef.current?.focus()
    focusNext.current = null
  })

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      const haystack = `${item.text} ${item.criteria.map((c) => c.value).join(" ")}`.toLowerCase()
      return (!q || haystack.includes(q)) && (store === "semua" || item.store === store)
    })
  }, [items, query, store])

  const groups = (order === "baru" ? GROUPS : [...GROUPS].reverse())
    .map((group) => {
      const rows = visible.filter((item) => groupOf(item.lastUsedAt) === group.id)
      return { ...group, rows: order === "baru" ? rows : [...rows].reverse() }
    })
    .filter((group) => group.rows.length > 0)

  const total = items.length
  const countText =
    total === 0
      ? "Belum ada keinginan tersimpan"
      : visible.length === total
        ? `${total} keinginan tersimpan`
        : `Menampilkan ${visible.length} dari ${total} keinginan`

  const remove = (item: DesireHistoryItem) => {
    const flat = groups.flatMap((g) => g.rows)
    const index = flat.findIndex((i) => i.id === item.id)
    const neighbour = flat[index + 1] ?? flat[index - 1]
    focusNext.current = neighbour ? `[data-reuse="${neighbour.id}"]` : "search"
    void deleteHistory(item.id).then(reload)
    toast(`“${item.text}” dihapus dari riwayat.`, {
      duration: 8000,
      action: {
        label: "Urungkan",
        onClick: () => {
          focusNext.current = `[data-reuse="${item.id}"]`
          void saveHistory(item).then(reload)
        },
      },
    })
  }

  const reuse = (item: DesireHistoryItem) => {
    // Pakai Ulang: open the sidebar (needs this click as a user gesture), then search.
    if (windowId.current !== undefined) chrome.sidePanel.open({ windowId: windowId.current }).catch(() => {})
    send({ type: "start-search", desire: { text: item.text, keyword: item.keyword, criteria: item.criteria }, store: item.store })
      .then(() => toast(`Membuka ${item.store}. Hasil penilaian Jev muncul di sidebar.`))
      .catch((err: Error) => toast(err.message))
  }

  const clearAll = () => {
    const count = items.length
    focusNext.current = "empty"
    void clearHistory().then(reload)
    toast(`${count} keinginan dan cache penilaian dihapus.`)
  }

  const reset = () => {
    setQuery("")
    setStore("semua")
    setOrder("baru")
    focusNext.current = "search"
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Riwayat keinginan"
        actions={
          <Button ref={clearAllRef} variant="outline" disabled={total === 0} onClick={() => setConfirmOpen(true)}>
            <Trash2Icon aria-hidden />
            Hapus semua
          </Button>
        }
      />

      <section aria-label="Cari dan saring riwayat" className="grid grid-cols-[minmax(0,1fr)_180px_180px] items-end gap-3 max-md:grid-cols-2">
        <p className="col-span-full max-w-[60ch] text-muted-foreground">
          Setiap keinginan yang kamu cari tersimpan otomatis bersama kriterianya. Pakai ulang dengan sekali klik.
        </p>
        <div className="flex flex-col gap-1 max-md:col-span-full">
          <Label htmlFor={ids.search} className="text-xs">
            Cari di riwayat
          </Label>
          <div className="relative">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              id={ids.search}
              type="search"
              value={query}
              disabled={total === 0}
              placeholder="mis. sepatu, kado, laptop"
              className="h-10 pl-9"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={ids.store} className="text-xs">
            Toko
          </Label>
          <Select value={store} onValueChange={(v) => setStore(v as StoreFilter)} disabled={total === 0}>
            <SelectTrigger id={ids.store} className="h-10! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua toko</SelectItem>
              {STORES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={ids.order} className="text-xs">
            Urutan
          </Label>
          <Select value={order} onValueChange={(v) => setOrder(v as Order)} disabled={total === 0}>
            <SelectTrigger id={ids.order} className="h-10! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baru">Terakhir dipakai</SelectItem>
              <SelectItem value="lama">Paling lama</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p aria-live="polite" className="col-span-full text-muted-foreground tabular-nums">
          {countText}
        </p>
      </section>

      {loaded === null ? (
        <p role="status" className="text-muted-foreground">
          Memuat riwayat…
        </p>
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-input px-6 py-12 text-center">
          <HistoryIcon aria-hidden className="size-7 text-muted-foreground" />
          <h2 ref={emptyTitleRef} tabIndex={-1} className="text-heading-sm focus:outline-none">
            Riwayat masih kosong
          </h2>
          <p className="max-w-[44ch] text-muted-foreground">
            Keinginan yang kamu cari lewat panel Jev akan tersimpan di sini otomatis, lengkap dengan kriterianya.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-input px-6 py-12 text-center">
          <h2 className="text-heading-sm">Tidak ada yang cocok</h2>
          <p className="max-w-[44ch] text-muted-foreground">Tidak ada keinginan tersimpan yang sesuai pencarian atau filter ini.</p>
          <Button variant="outline" onClick={reset}>
            Hapus pencarian &amp; filter
          </Button>
        </div>
      ) : (
        <section aria-label="Daftar riwayat" className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <h2 className="font-sans text-xs/[18px] font-normal text-muted-foreground">{group.title}</h2>
              <ul className="divide-y overflow-hidden rounded-xl border">
                {group.rows.map((item) => (
                  <HistoryRow key={item.id} item={item} onReuse={() => reuse(item)} onRemove={() => remove(item)} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <p className="flex items-center gap-2 text-xs/[18px] text-muted-foreground">
        <HardDriveIcon aria-hidden className="size-3.5" />
        Riwayat tersimpan lokal di browser ini dan tidak disinkronkan ke perangkat lain.
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            // Opened without an AlertDialogTrigger, so Radix has nowhere to return focus.
            event.preventDefault()
            if (items.length > 0) clearAllRef.current?.focus()
            else emptyTitleRef.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua riwayat?</AlertDialogTitle>
            <AlertDialogDescription>
              {total} keinginan tersimpan dan cache penilaian Jev akan dihapus dari browser ini. Tindakan ini tidak bisa
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clearAll}>
              Hapus semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function HistoryRow({ item, onReuse, onRemove }: { item: DesireHistoryItem; onReuse: () => void; onRemove: () => void }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_190px_auto] items-center gap-x-6 gap-y-2 bg-card p-4 max-md:grid-cols-1">
      <div className="min-w-0">
        <h3 className="font-sans text-base/6 font-medium [overflow-wrap:anywhere]">{item.text}</h3>
        <CriteriaChips
          className="mt-2"
          items={usedCriteria(item.criteria).map((c) => ({
            label: c.level === "opsional" ? `Opsional: ${c.value}` : c.value,
            level: c.level,
          }))}
        />
      </div>
      <p className="flex flex-col gap-0.5 text-xs/[18px] text-muted-foreground">
        <strong className="font-medium text-foreground">{item.store}</strong>
        <span>Terakhir dipakai {usedLabel(item.lastUsedAt)}</span>
        {item.resultSummary && <span>{item.resultSummary}</span>}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" data-reuse={item.id} className="h-9 max-md:flex-1" onClick={onReuse}>
          <RotateCcwIcon aria-hidden />
          Pakai ulang
        </Button>
        <Button variant="outline" size="icon-lg" aria-label={`Hapus “${item.text}”`} className="text-muted-foreground" onClick={onRemove}>
          <Trash2Icon aria-hidden />
        </Button>
      </div>
    </li>
  )
}

import { useEffect, useRef, useState } from "react"
import { ArrowUpRightIcon, LoaderCircleIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { keywordFor, normalizeText, usedCriteria } from "@/lib/desire"
import { newId } from "@/lib/examples"
import type { Criterion, StoreName, UnderstoodDesire } from "@/lib/types"
import { CriterionRow } from "@/sidepanel/compose/criterion-row"
import { DesireChanged, LensInput } from "@/sidepanel/lens-input"
import { BackLink, SectionLabel, View, ViewBody, ViewFooter, ViewTitle } from "@/sidepanel/view-layout"

interface CriteriaViewProps {
  desire: UnderstoodDesire
  onDesireChange: (desire: UnderstoodDesire) => void
  store: StoreName
  jevEnabled: boolean
  onBack: () => void
  onSearch: (desire: UnderstoodDesire) => void
  /** Re-run Pemahaman Keinginan for edited text. */
  onRefresh: (text: string) => void
  refreshing: boolean
  searching: boolean
  error: string | null
}

/** Pemahaman Keinginan → Pilih & Sesuaikan: review the criteria before searching. */
export function CriteriaView({
  desire,
  onDesireChange,
  store,
  jevEnabled,
  onBack,
  onSearch,
  onRefresh,
  refreshing,
  searching,
  error,
}: CriteriaViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  // The desire stays editable here; criteria go stale until they are refreshed.
  const [lensText, setLensText] = useState(desire.text)
  const [understoodText, setUnderstoodText] = useState(desire.text)
  if (understoodText !== desire.text) {
    setUnderstoodText(desire.text)
    setLensText(desire.text)
  }
  const stale = normalizeText(lensText) !== normalizeText(desire.text)
  const rootRef = useRef<HTMLDivElement>(null)
  // Selector to focus after the next render (rows are re-created on edit).
  const focusNext = useRef<string | null>(null)

  useEffect(() => {
    if (!focusNext.current) return
    rootRef.current?.querySelector<HTMLElement>(focusNext.current)?.focus()
    focusNext.current = null
  })

  const criteria = desire.criteria
  const setCriteria = (next: Criterion[]) => onDesireChange({ ...desire, criteria: next })

  /** Criteria with the open edit applied: empty custom rows vanish, empty rows switch off. */
  const withEditCommitted = (): Criterion[] => {
    if (!editingId) return criteria
    const value = draft.trim()
    return criteria.flatMap((c) => {
      if (c.id !== editingId) return [c]
      if (!value) return c.custom ? [] : [{ ...c, value: "", enabled: false }]
      return [{ ...c, value, enabled: true }]
    })
  }

  const commitEdit = (focusBack: boolean) => {
    if (!editingId) return criteria
    const id = editingId
    const next = withEditCommitted()
    setCriteria(next)
    setEditingId(null)
    if (focusBack) focusNext.current = next.some((c) => c.id === id) ? `[data-edit="${id}"]` : "[data-add-criterion]"
    return next
  }

  const cancelEdit = () => {
    const current = criteria.find((c) => c.id === editingId)
    if (!current) return
    let next = criteria
    if (!current.value.trim()) {
      next = current.custom
        ? criteria.filter((c) => c.id !== current.id)
        : criteria.map((c) => (c.id === current.id ? { ...c, enabled: false } : c))
    }
    setCriteria(next)
    setEditingId(null)
    focusNext.current = next.some((c) => c.id === current.id) ? `[data-edit="${current.id}"]` : "[data-add-criterion]"
  }

  const startEdit = (id: string, base = withEditCommitted()) => {
    const target = base.find((c) => c.id === id)
    if (!target) return
    setCriteria(base.map((c) => (c.id === id ? { ...c, enabled: true } : c)))
    setEditingId(id)
    setDraft(target.value)
    focusNext.current = `[data-edit-input="${id}"]`
  }

  const toggle = (id: string, enabled: boolean) => {
    const base = editingId === id ? criteria : withEditCommitted()
    if (editingId !== id) setEditingId(null)
    const target = base.find((c) => c.id === id)
    if (enabled && target && !target.value.trim() && editingId !== id) return startEdit(id, base)
    setCriteria(base.map((c) => (c.id === id ? { ...c, enabled } : c)))
  }

  const addCriterion = () => {
    const base = withEditCommitted()
    const count = base.filter((c) => c.custom).length + 1
    const added: Criterion = {
      id: newId(),
      name: count > 1 ? `Tambahan ${count}` : "Tambahan",
      value: "",
      level: "opsional",
      enabled: true,
      custom: true,
    }
    setCriteria([...base, added])
    setEditingId(added.id)
    setDraft("")
    focusNext.current = `[data-edit-input="${added.id}"]`
  }

  const hasCriteria = usedCriteria(withEditCommitted()).length > 0
  const canSearch = jevEnabled && !stale && !refreshing && !searching && hasCriteria
  // Jev off, stale text and refreshing already explain themselves above.
  const note =
    !jevEnabled || stale || refreshing ? undefined : hasCriteria ? (
      <>
        Kata kunci: <span className="font-medium text-foreground">{keywordFor(desire)}</span>
      </>
    ) : (
      "Pilih minimal satu kriteria yang sudah diisi."
    )

  return (
    <View label="Tinjau kriteria">
      <ViewBody ref={rootRef}>
        <BackLink
          onClick={() => {
            commitEdit(false)
            onBack()
          }}
        >
          Kembali
        </BackLink>

        <ViewTitle>Ini yang Jev tangkap</ViewTitle>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs/[18px] text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <LensInput
            label="Keinginanmu"
            value={lensText}
            onChange={setLensText}
            disabled={refreshing}
            phrases={criteria
              .filter((c) => c.phrase)
              .map((c) => ({ text: c.phrase!, state: !c.enabled ? "off" : activeId === c.id ? "active" : "on" }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && stale && lensText.trim()) {
                e.preventDefault()
                onRefresh(lensText.trim())
              }
            }}
          />
          {stale && !refreshing && (
            <DesireChanged
              actionLabel="Perbarui kriteria"
              disabled={!lensText.trim()}
              onAction={() => onRefresh(lensText.trim())}
              onUndo={() => setLensText(desire.text)}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Kriteria penilaian</SectionLabel>
          {refreshing && (
            <p role="status" className="flex items-center gap-2 rounded-lg border px-3 py-4 text-muted-foreground">
              <LoaderCircleIcon aria-hidden className="size-4 animate-spin text-primary-strong" />
              Jev memahami ulang keinginanmu…
            </p>
          )}
          <ul
            hidden={refreshing}
            className={cn("divide-y overflow-hidden rounded-lg border transition-opacity", stale && "opacity-55")}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setActiveId(null)
            }}
          >
            {criteria.map((c) => (
              <CriterionRow
                key={c.id}
                criterion={c}
                active={activeId === c.id}
                editing={editingId === c.id}
                draft={draft}
                onDraftChange={setDraft}
                onToggle={(enabled) => toggle(c.id, enabled)}
                onLevelChange={(level) => setCriteria(criteria.map((x) => (x.id === c.id ? { ...x, level } : x)))}
                onEdit={() => startEdit(c.id)}
                onSave={() => commitEdit(true)}
                onCancel={cancelEdit}
                onRemove={() => {
                  setCriteria(criteria.filter((x) => x.id !== c.id))
                  setActiveId(null)
                  focusNext.current = "[data-add-criterion]"
                }}
                onActivate={setActiveId}
              />
            ))}
          </ul>
          <Button
            variant="link"
            data-add-criterion
            className="h-auto self-start p-0 font-normal text-muted-foreground hover:text-foreground"
            onClick={addCriterion}
          >
            <PlusIcon aria-hidden />
            Tambah kriteria
          </Button>
        </div>
      </ViewBody>

      <ViewFooter note={note}>
        <Button
          className="h-10 w-full"
          disabled={!canSearch}
          onClick={() => onSearch({ ...desire, criteria: commitEdit(false) })}
        >
          {searching ? <LoaderCircleIcon aria-hidden className="animate-spin" /> : <ArrowUpRightIcon aria-hidden />}
          Cari di {store}
        </Button>
      </ViewFooter>
    </View>
  )
}

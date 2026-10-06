import { CheckIcon, PencilIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Criterion, CriterionLevel } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CriterionRowProps {
  criterion: Criterion
  active: boolean
  editing: boolean
  draft: string
  onDraftChange: (value: string) => void
  onToggle: (enabled: boolean) => void
  onLevelChange: (level: CriterionLevel) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onRemove: () => void
  onActivate: (id: string | null) => void
}

export function CriterionRow({
  criterion: c,
  active,
  editing,
  draft,
  onDraftChange,
  onToggle,
  onLevelChange,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onActivate,
}: CriterionRowProps) {
  return (
    <li
      data-active={active}
      onPointerEnter={() => onActivate(c.id)}
      onPointerLeave={() => onActivate(null)}
      onFocus={() => onActivate(c.id)}
      className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-2.5 px-3 py-2.5 transition-colors duration-150 ease-standard data-[active=true]:bg-lens"
    >
      <Checkbox
        className="mt-[3px]"
        checked={c.enabled}
        onCheckedChange={(value) => onToggle(value === true)}
        aria-label={`Pakai kriteria ${c.name}`}
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-xs/[18px] text-muted-foreground">
          {c.name}
          {c.inferred && " · tebakan Jev"}
        </span>
        {editing ? (
          <div className="mt-0.5 flex items-center gap-1">
            <Input
              data-edit-input={c.id}
              value={draft}
              maxLength={60}
              placeholder={c.custom ? "mis. warna hitam" : `Isi ${c.name.toLowerCase()}`}
              aria-label={`Nilai ${c.name}`}
              className="h-8"
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  onSave()
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  onCancel()
                }
              }}
            />
            <Button variant="ghost" size="icon-sm" aria-label={`Simpan ${c.name}`} onClick={onSave}>
              <CheckIcon aria-hidden />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            data-edit={c.id}
            onClick={onEdit}
            className={cn(
              "group -mx-1 flex items-baseline gap-1.5 self-start rounded-sm px-1 text-left font-medium [overflow-wrap:anywhere] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
              !c.value && "font-normal text-muted-foreground italic",
              !c.enabled && c.value && "text-muted-foreground line-through",
            )}
          >
            <span className="sr-only">Ubah {c.name}: </span>
            {c.value || "Belum diisi"}
            <PencilIcon
              aria-hidden
              className="size-3 shrink-0 translate-y-px text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          </button>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <Select value={c.level} onValueChange={(value) => onLevelChange(value as CriterionLevel)} disabled={!c.enabled}>
          <SelectTrigger
            size="sm"
            aria-label={`Tingkat kriteria ${c.name}`}
            className={cn(
              "gap-1 py-0 pr-1.5 pl-2 text-xs font-medium data-[size=sm]:h-6 data-[size=sm]:rounded-sm [&_svg]:size-3.5!",
              c.level === "wajib"
                ? "border-transparent bg-lens text-lens-foreground [&_svg]:text-lens-foreground!"
                : "border-dashed",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wajib">Wajib</SelectItem>
            <SelectItem value="opsional">Opsional</SelectItem>
          </SelectContent>
        </Select>
        {c.custom && !editing && (
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`Hapus ${c.name}`} onClick={onRemove}>
            <XIcon aria-hidden />
          </Button>
        )}
      </div>
    </li>
  )
}

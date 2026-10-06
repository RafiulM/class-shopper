import { useId } from "react"
import { FootprintsIcon } from "lucide-react"

import { VerdictBadge } from "@/components/jev/verdict-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { LabelStyle, Settings, Verdict } from "@/lib/types"
import { cn } from "@/lib/utils"

const STYLES: { value: LabelStyle; title: string; hint: string }[] = [
  { value: "sorotan", title: "Label + sorotan", hint: "Produk cocok diberi bingkai hijau terang." },
  { value: "label", title: "Label saja", hint: "Tanpa garis, hanya label." },
  { value: "ikon", title: "Ikon ringkas", hint: "Paling tidak mengganggu." },
]

type LabelSettings = Pick<Settings, "labelStyle" | "dimMismatched" | "showReasons">

/** Tampilan Label: style choice, two toggles and a live preview. */
export function LabelStyleSettings({ value, onChange }: { value: LabelSettings; onChange: (patch: Partial<LabelSettings>) => void }) {
  const baseId = useId()
  return (
    <>
      <RadioGroup
        aria-label="Gaya label"
        value={value.labelStyle}
        onValueChange={(labelStyle) => onChange({ labelStyle: labelStyle as LabelStyle })}
        className="grid grid-cols-3 gap-2 max-md:grid-cols-1"
      >
        {STYLES.map((style) => (
          <Label
            key={style.value}
            htmlFor={`${baseId}-${style.value}`}
            className="relative flex-col items-start gap-0.5 rounded-lg border border-input bg-card p-3 font-normal transition-colors has-[[data-state=checked]]:border-primary-strong has-[[data-state=checked]]:bg-lens has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-primary-strong"
          >
            <RadioGroupItem id={`${baseId}-${style.value}`} value={style.value} className="absolute top-3 right-3" />
            <span className="pr-6 font-medium">{style.title}</span>
            <span className="text-xs/[18px] text-muted-foreground">{style.hint}</span>
          </Label>
        ))}
      </RadioGroup>

      <div className="divide-y overflow-hidden rounded-xl border">
        <CheckRow
          id={`${baseId}-dim`}
          checked={value.dimMismatched}
          onChange={(dimMismatched) => onChange({ dimMismatched })}
          label="Redupkan foto produk yang tidak cocok"
        />
        <CheckRow
          id={`${baseId}-reasons`}
          checked={value.showReasons}
          onChange={(showReasons) => onChange({ showReasons })}
          label="Tampilkan alasan singkat di bawah produk"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-4" aria-label="Pratinjau label" role="group">
        <p className="col-span-full text-label font-medium">Pratinjau</p>
        <PreviewCard settings={value} verdict="cocok" title="Sepatu Lari Ultralight Mesh · Rp429.000" reason="Bobot 210 g, masih di bawah budget." />
        <PreviewCard settings={value} verdict="tidak_cocok" title="Sepatu Trail Waterproof · Rp799.000" reason="Harga di atas budget." />
      </div>
    </>
  )
}

function CheckRow({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Label htmlFor={id} className="gap-3 bg-card px-4 py-3 font-medium">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </Label>
  )
}

function PreviewCard({ settings, verdict, title, reason }: { settings: LabelSettings; verdict: Verdict; title: string; reason: string }) {
  const matched = verdict === "cocok"
  const compact = settings.labelStyle === "ikon"
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border bg-card",
        matched && settings.labelStyle === "sorotan" && "border-match shadow-[0_0_0_3px_var(--match),0_0_0_6px_rgb(132_204_22/35%)]",
      )}
    >
      <VerdictBadge verdict={verdict} compact={compact} className={cn(compact && "absolute top-1.5 right-1.5 z-10")} />
      <div aria-hidden className="relative grid h-18 place-items-center bg-muted text-faint">
        {/* Stand-in for the store's own discount badge, which Jev's label must stay clear of. */}
        <span className="absolute top-1.5 left-0 rounded-r-md bg-[#f94d63] px-1.5 text-label font-bold text-white">45%</span>
        <FootprintsIcon className={cn("size-7", !matched && settings.dimMismatched && "opacity-40")} />
      </div>
      <p className="px-2.5 py-2 text-xs/[18px]">{title}</p>
      {settings.showReasons && (
        <p
          className={cn(
            "border-l-4 px-2.5 py-1.5 text-label font-medium",
            matched ? "border-match bg-match-muted text-match-foreground" : "border-mismatch bg-mismatch-muted text-mismatch-foreground",
          )}
        >
          {reason}
        </p>
      )}
    </div>
  )
}

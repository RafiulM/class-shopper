import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface JevSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

/** Kendali Jev: on/off switch with a visible state word. */
export function JevSwitch({ checked, onCheckedChange, className }: JevSwitchProps) {
  return (
    <Label className={cn("cursor-pointer gap-2 text-xs font-medium", className)}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label="Jev" />
      <span aria-hidden>{checked ? "Aktif" : "Nonaktif"}</span>
    </Label>
  )
}

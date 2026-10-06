import { PauseCircleIcon, SettingsIcon } from "lucide-react"

import { JevSwitch } from "@/components/jev/jev-switch"
import { Button } from "@/components/ui/button"
import { updateSettings } from "@/shared/settings"

export function SidePanelHeader({ jevEnabled }: { jevEnabled: boolean }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
      <h1 className="text-heading-sm">Jev</h1>
      <div className="flex shrink-0 items-center gap-2">
        <JevSwitch checked={jevEnabled} onCheckedChange={(on) => void updateSettings({ jevEnabled: on })} />
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label="Buka pengaturan"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          <SettingsIcon aria-hidden />
        </Button>
      </div>
    </header>
  )
}

/** Kendali Jev → Hormati Saat Nonaktif. */
export function JevOffAlert() {
  return (
    <div role="status" className="flex items-center gap-2 border-b bg-lens px-4 py-2 text-xs/[18px] text-lens-foreground">
      <PauseCircleIcon aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">Jev nonaktif.</strong> Tidak ada label maupun data produk yang dikirim.
      </p>
      <Button
        variant="link"
        size="xs"
        className="h-auto shrink-0 p-0 text-lens-foreground underline"
        onClick={() => void updateSettings({ jevEnabled: true })}
      >
        Nyalakan
      </Button>
    </div>
  )
}

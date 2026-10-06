import { useId, useRef, useState } from "react"
import { HardDriveIcon, RotateCcwIcon } from "lucide-react"

import { JevSwitch } from "@/components/jev/jev-switch"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { STORES, type Settings, type StoreName } from "@/lib/types"
import { useApiKeyMask, useSettings } from "@/shared/hooks"
import { DEFAULT_SETTINGS, MODELS, setApiKey, updateSettings } from "@/shared/settings"
import { cn } from "@/lib/utils"
import { PageHeading } from "@/options/page-heading"
import { ApiKeySection } from "@/options/pengaturan/api-key-section"
import { HelpSection } from "@/options/pengaturan/help-section"
import { LabelStyleSettings } from "@/options/pengaturan/label-style"
import { PriorityList } from "@/options/pengaturan/priority-list"
import { SettingsCard, SettingsSection } from "@/options/pengaturan/settings-section"

const STORE_DOMAIN: Record<StoreName, string> = { Tokopedia: "tokopedia.com", Shopee: "shopee.co.id" }

const CONFIRM = {
  reset: {
    title: "Kembalikan preferensi ke awal?",
    text: "Prioritas, toko favorit, tampilan label, dan model kembali ke pengaturan awal. API key dan riwayat tidak ikut terhapus.",
    action: "Reset preferensi",
  },
  "remove-key": {
    title: "Hapus API key?",
    text: "Fitur AI akan nonaktif sampai kamu memasang key baru. Riwayat dan pengaturan tidak ikut terhapus.",
    action: "Hapus key",
  },
} as const

/** Kendali Jev, Preferensi Saya, Pengaturan API Key and Bantuan. Changes save to chrome.storage.local. */
export function PengaturanPage() {
  const stored = useSettings()
  const settings = stored ?? DEFAULT_SETTINGS
  const keyMask = useApiKeyMask() ?? null
  const [savedText, setSavedText] = useState("Perubahan tersimpan otomatis di browser ini.")
  const [storeError, setStoreError] = useState(false)
  // Intent survives the close animation; `confirmOpen` drives visibility.
  const [confirm, setConfirm] = useState<keyof typeof CONFIRM>("reset")
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Controlled dialog without an AlertDialogTrigger: remember who opened it to restore focus.
  const opener = useRef<HTMLElement | null>(null)
  const askConfirm = (intent: keyof typeof CONFIRM, trigger: HTMLElement) => {
    opener.current = trigger
    setConfirm(intent)
    setConfirmOpen(true)
  }
  const storeIds = useId()

  const update = (patch: Partial<Settings>, text = "Tersimpan · baru saja") => {
    updateSettings(patch)
      .then(() => setSavedText(text))
      .catch(() => setSavedText("Gagal menyimpan. Coba lagi."))
  }

  const toggleStore = (store: StoreName, checked: boolean) => {
    const next = STORES.filter((s) => (s === store ? checked : settings.favoriteStores.includes(s)))
    if (next.length === 0) {
      setStoreError(true)
      return
    }
    setStoreError(false)
    update({ favoriteStores: next })
  }

  const onConfirm = () => {
    if (confirm === "reset") {
      update({ ...DEFAULT_SETTINGS, jevEnabled: settings.jevEnabled }, "Preferensi dikembalikan ke awal.")
      setStoreError(false)
    } else if (confirm === "remove-key") {
      void setApiKey(null).then(() => setSavedText("API key dihapus dari browser ini."))
    }
  }

  const diagnostics = `Jev ${chrome.runtime.getManifest().version} · ${navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? "Chrome"} · Toko: ${settings.favoriteStores.join(", ")} · Model: ${MODELS[settings.modelPreference].id}`

  if (!stored) {
    return (
      <p role="status" className="text-muted-foreground">
        Memuat pengaturan…
      </p>
    )
  }

  return (
    <div>
      <PageHeading
        title="Pengaturan"
        actions={
          <Button variant="outline" onClick={(event) => askConfirm("reset", event.currentTarget)}>
            <RotateCcwIcon aria-hidden />
            Reset preferensi
          </Button>
        }
      />
      <p role="status" className="flex items-center gap-1.5 pb-2 text-xs/[18px] text-muted-foreground">
        <HardDriveIcon aria-hidden className="size-3.5" />
        {savedText}
      </p>

      <SettingsSection title="Kendali Jev" description="Matikan kapan saja. Pilihanmu tetap tersimpan saat browser ditutup.">
        <SettingsCard className="flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium">{settings.jevEnabled ? "Jev aktif" : "Jev nonaktif"}</p>
            <p className="text-xs/[18px] text-muted-foreground">
              {settings.jevEnabled
                ? "Jev menilai produk dan memasang label di halaman Tokopedia dan Shopee."
                : "Jev tidak mengirim data produk dan tidak memasang label. Riwayat dan pengaturan tetap tersimpan."}
            </p>
          </div>
          <JevSwitch checked={settings.jevEnabled} onCheckedChange={(jevEnabled) => update({ jevEnabled })} />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Prioritas"
        description="Urutkan hal yang paling penting buatmu. Jev memakainya saat beberapa produk sama-sama cocok."
      >
        <PriorityList value={settings.priorities} onChange={(priorities) => update({ priorities })} />
      </SettingsSection>

      <SettingsSection title="Toko favorit" description="Toko yang sering kamu pakai muncul lebih dulu di panel Jev.">
        <fieldset className="divide-y overflow-hidden rounded-xl border">
          <legend className="sr-only">Toko favorit</legend>
          {STORES.map((store) => (
            <Label key={store} htmlFor={`${storeIds}-${store}`} className="items-start gap-3 bg-card px-4 py-3 font-normal">
              <Checkbox
                id={`${storeIds}-${store}`}
                className="mt-0.5"
                checked={settings.favoriteStores.includes(store)}
                onCheckedChange={(v) => toggleStore(store, v === true)}
              />
              <span className="flex flex-col">
                <span className="font-medium">{store}</span>
                <span className="text-xs/[18px] text-muted-foreground">{STORE_DOMAIN[store]}</span>
              </span>
            </Label>
          ))}
        </fieldset>
        <p role="status" className={cn("text-xs/[18px] text-muted-foreground", storeError && "text-destructive")}>
          {storeError
            ? "Pilih minimal satu toko agar Jev tahu harus mencari di mana."
            : `${settings.favoriteStores[0]} jadi pilihan awal di panel.`}
        </p>
      </SettingsSection>

      <SettingsSection title="Tampilan label" description="Atur seberapa mencolok label Jev di halaman toko.">
        <LabelStyleSettings value={settings} onChange={(patch) => update(patch)} />
      </SettingsSection>

      <SettingsSection
        title="API key & model"
        description="Jev memakai API key OpenRouter milikmu untuk memahami keinginan dan menilai produk."
      >
        <ApiKeySection
          keyMask={keyMask}
          onKeySaved={() => {
            setSavedText("Tersimpan · baru saja")
          }}
          onRemoveRequest={(trigger) => askConfirm("remove-key", trigger)}
          model={settings.modelPreference}
          onModelChange={(modelPreference) => update({ modelPreference })}
        />
      </SettingsSection>

      <SettingsSection title="Bantuan" description="Jawaban singkat untuk pertanyaan yang sering muncul.">
        <HelpSection diagnostics={diagnostics} />
      </SettingsSection>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            // "Hapus key" unmounts with the saved card; continue in the new key field.
            if (confirm === "remove-key" && !keyMask) {
              document.querySelector<HTMLInputElement>("[data-api-key-input]")?.focus()
            } else if (opener.current?.isConnected) {
              opener.current.focus()
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{CONFIRM[confirm].title}</AlertDialogTitle>
            <AlertDialogDescription>{CONFIRM[confirm].text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant={confirm === "remove-key" ? "destructive" : "default"} onClick={onConfirm}>
              {CONFIRM[confirm].action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

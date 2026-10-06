import { useEffect, useId, useRef, useState } from "react"
import { CheckIcon, KeyRoundIcon, PlugZapIcon, ShieldCheckIcon } from "lucide-react"

import { ApiKeyForm } from "@/components/jev/api-key-form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { send } from "@/shared/messages"
import { MODELS } from "@/shared/settings"
import type { ModelPreference } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SettingsCard } from "@/options/pengaturan/settings-section"

interface ApiKeySectionProps {
  keyMask: string | null
  onKeySaved: (mask: string) => void
  onRemoveRequest: (trigger: HTMLElement) => void
  model: ModelPreference
  onModelChange: (model: ModelPreference) => void
}

/** Pengaturan API Key: saved state, Ganti/Hapus Key, Uji Koneksi, model choice. */
export function ApiKeySection({ keyMask, onKeySaved, onRemoveRequest, model, onModelChange }: ApiKeySectionProps) {
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<{ tone: "busy" | "positive" | "error"; text: string } | null>(null)
  const testButton = useRef<HTMLButtonElement>(null)
  const replaceButton = useRef<HTMLButtonElement>(null)
  // Buttons only exist after the form closes, so focus them after that commit.
  const pendingFocus = useRef<"test" | "replace" | null>(null)
  const modelId = useId()
  const showForm = editing || !keyMask

  useEffect(() => {
    if (!pendingFocus.current) return
    ;(pendingFocus.current === "test" ? testButton : replaceButton).current?.focus()
    pendingFocus.current = null
  })

  const test = async () => {
    setMessage({ tone: "busy", text: "Menguji koneksi ke OpenRouter…" })
    try {
      await send({ type: "test-key" })
      setMessage({ tone: "positive", text: "Terhubung. Key bisa dipakai." })
    } catch (error) {
      setMessage({ tone: "error", text: (error as Error).message })
    }
  }

  return (
    <>
      {!keyMask && (
        <div className="flex items-start gap-3 rounded-lg border border-primary bg-lens px-4 py-3 text-lens-foreground">
          <KeyRoundIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>Fitur AI nonaktif karena belum ada API key. Jev belum bisa memahami keinginan atau menilai produk.</p>
        </div>
      )}

      {showForm ? (
        <SettingsCard>
          <ApiKeyForm
            autoFocus={editing}
            onSaved={(mask) => {
              onKeySaved(mask)
              setEditing(false)
              setMessage({ tone: "positive", text: "Key baru tersimpan dan terhubung." })
              pendingFocus.current = "test"
            }}
            onCancel={
              keyMask
                ? () => {
                    setEditing(false)
                    pendingFocus.current = "replace"
                  }
                : undefined
            }
          />
        </SettingsCard>
      ) : (
        <SettingsCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">API key OpenRouter</p>
              <p className="font-mono text-[13px] tracking-wide">{keyMask}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-positive-muted px-2 py-px text-xs/[18px] font-medium text-positive-foreground">
              <CheckIcon aria-hidden className="size-3.5" />
              Tersimpan
            </span>
          </div>
          <p
            role="status"
            className={cn(
              "text-xs/[18px] empty:hidden",
              message?.tone === "busy"
                ? "text-muted-foreground"
                : message?.tone === "error"
                  ? "text-destructive"
                  : "text-positive-foreground",
            )}
          >
            {message?.text}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button ref={testButton} variant="outline" className="h-9" disabled={message?.tone === "busy"} onClick={test}>
              <PlugZapIcon aria-hidden />
              Uji koneksi
            </Button>
            <Button
              ref={replaceButton}
              variant="outline"
              className="h-9"
              onClick={() => {
                setMessage(null)
                setEditing(true)
              }}
            >
              Ganti key
            </Button>
            <Button variant="destructive" className="h-9 bg-transparent hover:bg-destructive/10" onClick={(event) => onRemoveRequest(event.currentTarget)}>
              Hapus key
            </Button>
          </div>
        </SettingsCard>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={modelId}>Model</Label>
        <Select value={model} onValueChange={(v) => onModelChange(v as ModelPreference)}>
          <SelectTrigger id={modelId} className="h-10! w-full max-w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MODELS) as ModelPreference[]).map((m) => (
              <SelectItem key={m} value={m}>
                {MODELS[m].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs/[18px] text-muted-foreground">
          Dipakai untuk memahami keinginan dan menilai produk. Biaya token ditagihkan ke akun OpenRouter-mu.
        </p>
      </div>

      <p className="flex items-start gap-2 text-xs/[18px] text-muted-foreground">
        <ShieldCheckIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Key disimpan di browser ini dan hanya dikirim ke OpenRouter. Jev tidak punya server yang menyimpan datamu.
      </p>
    </>
  )
}

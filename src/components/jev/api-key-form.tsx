import { useEffect, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { send } from "@/shared/messages"

type Tone = "idle" | "busy" | "error" | "positive"

interface ApiKeyFormProps {
  /** Called with a masked key after the key passed Uji Koneksi and was saved. */
  onSaved: (mask: string) => void
  onCancel?: () => void
  autoFocus?: boolean
  className?: string
}

/** Pengaturan API Key: paste an OpenRouter key, then test the connection before saving. */
export function ApiKeyForm({ onSaved, onCancel, autoFocus, className }: ApiKeyFormProps) {
  const [value, setValue] = useState("")
  const [reveal, setReveal] = useState(false)
  const [status, setStatus] = useState<{ tone: Tone; text: string }>({ tone: "idle", text: "" })
  const inputRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const inputId = useId()
  const messageId = useId()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const key = value.trim()
    if (!key) {
      setStatus({ tone: "error", text: "Tempel API key dulu." })
      inputRef.current?.focus()
      return
    }
    setStatus({ tone: "busy", text: "Menguji koneksi ke OpenRouter…" })
    try {
      const { mask } = await send({ type: "save-key", key })
      if (!mounted.current) return
      setValue("")
      setStatus({ tone: "positive", text: "Terhubung. Key tersimpan di browser ini." })
      onSaved(mask)
    } catch (error) {
      if (!mounted.current) return
      setStatus({ tone: "error", text: (error as Error).message })
      inputRef.current?.focus()
    }
  }

  return (
    <form noValidate onSubmit={submit} className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>API key OpenRouter</Label>
        <div className="flex gap-2 max-sm:flex-col">
          <Input
            ref={inputRef}
            id={inputId}
            data-api-key-input
            type={reveal ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
            placeholder="sk-or-v1-…"
            value={value}
            aria-invalid={status.tone === "error" || undefined}
            aria-describedby={messageId}
            className="h-10 font-mono text-[13px]"
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="button" variant="outline" className="h-10" onClick={() => setReveal((r) => !r)}>
            {reveal ? "Sembunyikan" : "Tampilkan"}
          </Button>
        </div>
      </div>
      <p className="text-xs/[18px] text-muted-foreground">
        Buat key di dashboard OpenRouter (openrouter.ai → Keys), lalu tempel di sini. Key hanya disimpan di browser ini.
      </p>
      <p
        id={messageId}
        role="status"
        className={cn(
          "text-xs/[18px] empty:hidden",
          status.tone === "busy" && "text-muted-foreground",
          status.tone === "error" && "text-destructive",
          status.tone === "positive" && "text-positive-foreground",
        )}
      >
        {status.text}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-10" disabled={status.tone === "busy"}>
          Simpan &amp; uji koneksi
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
            Batal
          </Button>
        )}
      </div>
    </form>
  )
}

import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { View, ViewFooter } from "@/sidepanel/view-layout"

/** Pemahaman Keinginan: waiting for the LLM to turn the desire into criteria. */
export function UnderstandingView({ text, onCancel }: { text: string; onCancel: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => titleRef.current?.focus(), [])

  return (
    <View label="Memahami keinginan">
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div aria-hidden className="relative mb-2 h-1 w-40 overflow-hidden rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 w-2/5 animate-[jev-indeterminate_1.1s_var(--ease-standard)_infinite] rounded-full bg-primary motion-reduce:w-3/5 motion-reduce:animate-none" />
        </div>
        <h2 ref={titleRef} tabIndex={-1} className="text-heading-sm focus:outline-none">
          Jev sedang memahami keinginanmu
        </h2>
        <p className="max-w-75 text-muted-foreground [overflow-wrap:anywhere]">“{text.trim()}”</p>
        <p className="text-xs/[18px] text-muted-foreground">
          Biasanya beberapa detik. Kamu bisa meninjau hasilnya sebelum mencari.
        </p>
      </div>
      <ViewFooter>
        <Button variant="secondary" className="h-10 w-full" onClick={onCancel}>
          Batal
        </Button>
      </ViewFooter>
    </View>
  )
}

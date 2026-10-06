import { useState } from "react"
import { CopyIcon, MapIcon } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { SURFACE_URL } from "@/lib/surfaces"
import { SettingsCard } from "@/options/pengaturan/settings-section"

const FAQ = [
  {
    q: "Kenapa produk dinilai tidak cocok padahal kelihatannya pas?",
    a: "Jev hanya membaca judul dan deskripsi. Kalau info penting seperti bobot atau ukuran tidak ditulis penjual, Jev tidak bisa memastikannya. Buka halaman detail untuk cek ulang.",
  },
  {
    q: "Apakah Jev menyimpan dataku di server?",
    a: "Tidak. Riwayat, pengaturan, dan API key tersimpan di browser ini. Keinginan dan data produk hanya dikirim ke OpenRouter memakai key milikmu.",
  },
  {
    q: "Siapa yang membayar biaya AI?",
    a: "Biaya pemanggilan model ditagihkan OpenRouter ke akunmu sesuai pemakaian. Pilih model “Hemat biaya” kalau ingin lebih irit.",
  },
  { q: "Toko apa saja yang didukung?", a: "Saat ini Tokopedia dan Shopee." },
]

/** Panduan Pakai: Tur Pertama, Tanya Jawab, Hubungi Bantuan. */
export function HelpSection({ diagnostics }: { diagnostics: string }) {
  const [copyMessage, setCopyMessage] = useState("")

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(diagnostics)
      setCopyMessage("Disalin.")
    } catch {
      setCopyMessage("Tidak bisa menyalin otomatis. Pilih teksnya lalu salin manual.")
    }
  }

  return (
    <>
      <Button asChild variant="outline" className="h-9 self-start">
        <a href={SURFACE_URL.welcome}>
          <MapIcon aria-hidden />
          Ulangi tur pertama
        </a>
      </Button>

      <Accordion type="single" collapsible className="rounded-xl border px-4">
        {FAQ.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="text-sm">{item.q}</AccordionTrigger>
            <AccordionContent className="max-w-[64ch] text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <SettingsCard>
        <p className="font-medium">Hubungi bantuan</p>
        <p className="text-xs/[18px] text-muted-foreground">
          Laporkan masalah lewat halaman Jev di Chrome Web Store, dan sertakan info berikut.
        </p>
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-[13px] [overflow-wrap:anywhere]">{diagnostics}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-9" onClick={copy}>
            <CopyIcon aria-hidden />
            Salin info
          </Button>
          <p role="status" className="text-xs/[18px] text-muted-foreground">
            {copyMessage}
          </p>
        </div>
      </SettingsCard>
    </>
  )
}

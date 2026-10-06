import { useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, CheckIcon, HardDriveIcon, ReceiptIcon, SendIcon, XIcon } from "lucide-react"

import { ApiKeyForm } from "@/components/jev/api-key-form"
import { Button } from "@/components/ui/button"
import { SURFACE_URL } from "@/lib/surfaces"
import { useApiKeyMask } from "@/shared/hooks"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3
const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: "1. API key" },
  { step: 2, label: "2. Cara pakai" },
  { step: 3, label: "3. Siap" },
]

/** First-install tab: Alur Menyiapkan API Key + Tur Pertama + Tips Cepat. */
export function WelcomeApp() {
  const [step, setStep] = useState<Step>(1)
  const savedMask = useApiKeyMask()
  const [keyJustSaved, setKeyJustSaved] = useState(false)
  const keyReady = keyJustSaved || Boolean(savedMask)
  const windowId = useRef<number | undefined>(undefined)
  useEffect(() => {
    chrome.windows.getCurrent().then((w) => (windowId.current = w.id))
  }, [])
  // Move focus to each step title only after the user navigates (not on first load).
  const [navigated, setNavigated] = useState(false)
  const nextRef = useRef<HTMLButtonElement>(null)
  // Once the key passes, move on to "Lanjut" (it is enabled in the same commit).
  useEffect(() => {
    if (keyJustSaved) nextRef.current?.focus()
  }, [keyJustSaved])
  const go = (next: Step) => {
    setNavigated(true)
    setStep(next)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-180 items-center justify-between gap-4 px-6 pt-6 max-sm:px-4 max-sm:pt-4">
        <p className="font-heading text-heading-sm font-medium">Jev</p>
        <a href={SURFACE_URL.pengaturan} className="text-xs/[18px] font-medium underline underline-offset-3">
          Lewati ke pengaturan
        </a>
      </header>

      <main className="mx-auto flex max-w-180 flex-col gap-6 px-6 pt-8 pb-18 max-sm:px-4">
        <ol aria-label="Langkah" className="grid grid-cols-3 gap-2">
          {STEPS.map((s) => (
            <li
              key={s.step}
              aria-current={s.step === step ? "step" : undefined}
              className={cn(
                "flex flex-col gap-1.5 text-xs/[18px] font-medium text-muted-foreground before:h-1 before:rounded-full before:bg-muted",
                s.step < step && "before:bg-primary-strong",
                s.step === step && "text-foreground before:bg-primary",
              )}
            >
              {s.label}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <StepPanel kicker="Selamat datang" title="Pasang API key OpenRouter" focusTitle={navigated}
            lead="Jev memakai key milikmu untuk memahami keinginan dan menilai produk. Tanpa key, Jev belum bisa bekerja.">
            <div className="rounded-xl border bg-card p-5 shadow-card">
              {savedMask && !keyJustSaved && (
                <p className="mb-3 rounded-md bg-positive-muted px-3 py-2 text-xs/[18px] text-positive-foreground">
                  Key sudah tersimpan ({savedMask}). Tempel key baru hanya kalau mau mengganti.
                </p>
              )}
              <ApiKeyForm onSaved={() => setKeyJustSaved(true)} />
            </div>
            <ul className="flex flex-col gap-2 text-muted-foreground">
              <Fact icon={<HardDriveIcon />}>Key disimpan di browser ini saja.</Fact>
              <Fact icon={<SendIcon />}>Key hanya dikirim ke OpenRouter, tidak ke server lain.</Fact>
              <Fact icon={<ReceiptIcon />}>Biaya pemakaian model ditagihkan ke akun OpenRouter-mu.</Fact>
            </ul>
            <StepNav>
              <Button variant="ghost" className="h-10" onClick={() => go(2)}>
                Nanti saja
              </Button>
              <Button ref={nextRef} className="ml-auto h-10" disabled={!keyReady} onClick={() => go(2)}>
                Lanjut
              </Button>
            </StepNav>
          </StepPanel>
        )}

        {step === 2 && (
          <StepPanel kicker="Tur singkat" title="Begini cara Jev membantumu" lead="Tiga langkah dari keinginan sampai produk yang cocok.">
            <ol className="divide-y overflow-hidden rounded-xl border">
              <TourItem n={1} title="Tulis keinginanmu" text="Klik ikon Jev di toolbar Chrome, lalu tulis seperti ngobrol biasa.">
                “sepatu lari ringan di bawah 500 ribu”
              </TourItem>
              <TourItem n={2} title="Cek kriteria yang Jev tangkap" text="Jev memecah keinginanmu jadi kriteria. Centang, ubah, atau tambah sebelum mencari.">
                {["sepatu lari", "ringan", "di bawah 500 ribu"].map((p) => (
                  <mark key={p} className="rounded-sm bg-lens px-1 text-lens-foreground">
                    {p}
                  </mark>
                ))}
              </TourItem>
              <TourItem n={3} title="Lihat label di halaman toko" text="Jev mengisi kolom cari, lalu menandai tiap produk beserta alasannya. Buka detail produk untuk cek ulang.">
                <span className="inline-flex items-center gap-1 rounded-full border border-positive/35 bg-positive-muted px-2 text-xs/[18px] font-medium text-positive-foreground">
                  <CheckIcon aria-hidden className="size-3.5" /> Cocok
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2 text-xs/[18px] font-medium">
                  <XIcon aria-hidden className="size-3.5" /> Tidak cocok
                </span>
              </TourItem>
            </ol>
            <div className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-card">
              <p className="font-medium">Tips cepat</p>
              <ul className="list-disc space-y-1.5 pl-[18px] text-muted-foreground">
                <li>Sebut budget dengan angka, misalnya “di bawah 500 ribu”.</li>
                <li>Tulis hal yang wajib, misalnya “anti air” atau “muat laptop 14 inci”.</li>
                <li>Mau istirahat dari Jev? Matikan lewat switch di panel. Datamu tetap aman.</li>
              </ul>
            </div>
            <StepNav>
              <BackButton onClick={() => go(1)} />
              <Button className="ml-auto h-10" onClick={() => go(3)}>
                Lanjut
              </Button>
            </StepNav>
          </StepPanel>
        )}

        {step === 3 && (
          <StepPanel kicker="Siap dipakai" title="Jev siap membantumu belanja" lead="Pin Jev di toolbar Chrome lewat ikon puzzle supaya mudah dibuka.">
            <ul className="divide-y overflow-hidden rounded-xl border">
              <SummaryRow label="API key OpenRouter">
                <span
                  className={cn(
                    "rounded-full px-2 py-px text-xs/[18px] font-medium",
                    keyReady ? "bg-positive-muted text-positive-foreground" : "bg-warning-muted text-warning-foreground",
                  )}
                >
                  {keyReady ? "Terhubung" : "Belum dipasang"}
                </span>
              </SummaryRow>
              <SummaryRow label="Toko didukung">
                <span className="rounded-full bg-muted px-2 py-px text-xs/[18px] font-medium">Tokopedia, Shopee</span>
              </SummaryRow>
              <SummaryRow label="Riwayat & pengaturan">
                <span className="rounded-full bg-muted px-2 py-px text-xs/[18px] font-medium">Tersimpan di browser ini</span>
              </SummaryRow>
            </ul>
            {!keyReady && (
              <p className="text-xs/[18px] text-muted-foreground">
                Fitur AI nonaktif sampai kamu memasang API key di Pengaturan.
              </p>
            )}
            <StepNav>
              <BackButton onClick={() => go(2)} />
              <div className="ml-auto flex flex-wrap gap-2 max-sm:w-full">
                <Button asChild variant="outline" className="h-10 max-sm:flex-1">
                  <a href={SURFACE_URL.pengaturan}>{keyReady ? "Atur preferensi" : "Pasang API key"}</a>
                </Button>
                <Button
                  className="h-10 max-sm:flex-1"
                  onClick={() => {
                    // Needs this click as the user gesture; the toolbar icon works too.
                    if (windowId.current !== undefined) chrome.sidePanel.open({ windowId: windowId.current }).catch(() => {})
                  }}
                >
                  Buka sidebar Jev
                </Button>
              </div>
            </StepNav>
          </StepPanel>
        )}
      </main>
    </div>
  )
}

function StepPanel({
  kicker,
  title,
  lead,
  focusTitle = true,
  children,
}: {
  kicker: string
  title: string
  lead: string
  focusTitle?: boolean
  children: React.ReactNode
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusTitle) titleRef.current?.focus()
  }, [focusTitle])
  return (
    <section aria-label={title} className="flex flex-col gap-5">
      <div>
        <p className="text-xs/[18px] font-medium text-muted-foreground">{kicker}</p>
        <h1 ref={titleRef} tabIndex={-1} className="text-heading-lg focus:outline-none max-sm:text-heading-md">
          {title}
        </h1>
        <p className="mt-2 max-w-[60ch] text-base/[25px] text-muted-foreground">{lead}</p>
      </div>
      {children}
    </section>
  )
}

function StepNav({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 border-t pt-4">{children}</div>
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" className="h-10" onClick={onClick}>
      <ArrowLeftIcon aria-hidden />
      Kembali
    </Button>
  )
}

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 [&_svg]:mt-1 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-foreground">
      <span aria-hidden>{icon}</span>
      {children}
    </li>
  )
}

function TourItem({ n, title, text, children }: { n: number; title: string; text: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-4 gap-y-3 p-5 max-sm:grid-cols-1">
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-lens font-medium text-lens-foreground">
        {n}
      </span>
      <div>
        <h2 className="text-heading-sm">{title}</h2>
        <p className="mt-1 text-muted-foreground">{text}</p>
      </div>
      <p className="col-start-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted p-3 max-sm:col-start-1">{children}</p>
    </li>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span>{label}</span>
      {children}
    </li>
  )
}

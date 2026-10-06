import { Toaster } from "@/components/ui/sonner"
import { SURFACE_URL } from "@/lib/surfaces"
import { useHashRoute } from "@/lib/use-hash-route"
import { cn } from "@/lib/utils"
import { PengaturanPage } from "@/options/pengaturan/pengaturan-page"
import { RiwayatPage } from "@/options/riwayat-page"

const ROUTES = ["riwayat", "pengaturan"] as const
const NAV: { route: (typeof ROUTES)[number]; label: string }[] = [
  { route: "riwayat", label: "Riwayat" },
  { route: "pengaturan", label: "Pengaturan" },
]

/** Options page (opens in a tab): Riwayat Keinginan and Pengaturan. */
export function OptionsApp() {
  const route = useHashRoute(ROUTES, "pengaturan")
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex min-h-14 max-w-5xl items-stretch gap-8 px-6 max-sm:flex-wrap max-sm:gap-x-4 max-sm:gap-y-0 max-sm:px-4 max-sm:pt-2">
          <p className="flex items-baseline gap-2 self-center font-heading text-heading-sm font-medium">
            Jev <span className="font-sans text-xs font-normal text-muted-foreground">Pengaturan extension</span>
          </p>
          <nav aria-label="Menu Jev" className="flex gap-1 max-sm:order-3 max-sm:-ml-3 max-sm:min-h-11 max-sm:w-full">
            {NAV.map((item) => (
              <a
                key={item.route}
                href={`#/${item.route}`}
                aria-current={route === item.route ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center border-b-2 border-transparent px-3 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:-outline-offset-2",
                  route === item.route && "border-foreground text-foreground",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href={SURFACE_URL.welcome}
            className="ml-auto self-center text-xs/[18px] font-medium underline underline-offset-3"
          >
            Panduan awal
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 pt-8 pb-18 max-sm:px-4 max-sm:pt-6">
        {route === "riwayat" ? <RiwayatPage /> : <PengaturanPage />}
      </main>
      <Toaster position="bottom-center" />
    </div>
  )
}


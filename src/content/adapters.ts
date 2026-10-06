/**
 * Store adapters: read listings and product pages from the store DOM.
 * Store class names are obfuscated and change often, so this relies on
 * structure (product links, "Rp" prices, stable data-testid hooks) instead.
 */
import type { PageDetail, PageProduct, StoreName } from "@/lib/types"
import { canonicalProductUrl, STORE_CONFIG } from "@/shared/stores"

export interface Card {
  el: HTMLElement
  product: PageProduct
}

export interface DetailParts {
  detail: PageDetail
  /** Element to place the verdict chip after. */
  titleEl: HTMLElement
  /** Elements whose text may contain evidence quotes. */
  textRoots: HTMLElement[]
}

const PRICE = /^Rp\s?\d[\d.]*/i
const NOISE = [/%$/, /terjual/i, /^\d(?:[.,]\d)?$/, /hemat|bonus|cashback|gratis ongkir|bisa cod|^cod$|promo|diskon|^ad$|iklan|^star\+?/i, PRICE]
const isNoise = (line: string) => NOISE.some((r) => r.test(line))

function parseCardText(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  const candidates = lines.filter((l) => !isNoise(l))
  const title = [...candidates].sort((a, b) => b.length - a.length)[0]
  const rest = candidates.filter((l) => l !== title)
  return {
    title,
    priceText: lines.find((l) => PRICE.test(l)),
    rating: lines.find((l) => /^\d(?:[.,]\d)?$/.test(l)),
    sold: lines.find((l) => /terjual/i.test(l)),
    shop: rest.at(-2),
    location: rest.at(-1),
  }
}

/** Product cards on a results page: links to listings whose text includes a price. */
export function findCards(store: StoreName): Card[] {
  const config = STORE_CONFIG[store]
  const cards: Card[] = []
  const seen = new Set<string>()
  for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    let url: URL
    try {
      url = new URL(a.href)
    } catch {
      continue
    }
    if (url.host !== config.host || !config.productPath.test(url.pathname)) continue
    if (a.parentElement?.closest("a[href]")) continue
    const text = a.innerText
    if (!/Rp\s?\d/.test(text)) continue
    const parsed = parseCardText(text)
    if (!parsed.title || parsed.title.length < 8) continue
    const canonical = canonicalProductUrl(url.href)
    if (seen.has(canonical)) continue
    seen.add(canonical)
    cards.push({ el: a, product: { url: canonical, ...parsed, title: parsed.title } })
  }
  return cards
}

const text = (el: Element | null | undefined) => (el as HTMLElement | null | undefined)?.innerText?.trim() ?? ""

function readTokopedia(): DetailParts | null {
  const titleEl = document.querySelector<HTMLElement>('h1[data-testid="lblPDPDetailProductName"]') ?? document.querySelector("h1")
  const descEl = document.querySelector<HTMLElement>('[data-testid="lblPDPDescriptionProduk"]')
  if (!titleEl || !descEl || !text(descEl)) return null
  const infoEl = document.querySelector<HTMLElement>('[data-testid="lblPDPInfoProduk"]')
  return {
    titleEl,
    textRoots: [titleEl, infoEl, descEl].filter((e): e is HTMLElement => Boolean(e)),
    detail: {
      url: canonicalProductUrl(location.href),
      title: text(titleEl),
      priceText: text(document.querySelector('[data-testid="pdpProductPrice"]')) || undefined,
      description: text(descEl),
      info: text(infoEl) || undefined,
    },
  }
}

function readShopee(): DetailParts | null {
  const titleEl = document.querySelector<HTMLElement>("h1")
  // The description sits right after a "Deskripsi Produk" heading.
  const heading = [...document.querySelectorAll<HTMLElement>("h2, h3, div, span")].find(
    (el) => el.childElementCount === 0 && /^deskripsi produk$/i.test(el.textContent?.trim() ?? ""),
  )
  const descEl = (heading?.nextElementSibling ?? heading?.parentElement?.nextElementSibling) as HTMLElement | null
  if (!titleEl || !descEl || !text(descEl)) return null
  const priceEl = [...document.querySelectorAll<HTMLElement>("div, span")].find(
    (el) => el.childElementCount === 0 && PRICE.test(el.textContent?.trim() ?? ""),
  )
  return {
    titleEl,
    textRoots: [titleEl, descEl],
    detail: {
      url: canonicalProductUrl(location.href),
      title: text(titleEl),
      priceText: text(priceEl) || undefined,
      description: text(descEl),
    },
  }
}

export function readDetail(store: StoreName): DetailParts | null {
  return store === "Tokopedia" ? readTokopedia() : readShopee()
}

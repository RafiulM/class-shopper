import type { ActiveContext, StoreName } from "@/lib/types"

/** Supported stores (PRD `supportedStores`), bundled with the extension. */
export interface StoreConfig {
  name: StoreName
  host: string
  searchUrl: (keyword: string) => string
  /** Listing URL pattern used to recognise product links and product pages. */
  productPath: RegExp
  resultsPath: RegExp
}

export const STORE_CONFIG: Record<StoreName, StoreConfig> = {
  Tokopedia: {
    name: "Tokopedia",
    host: "www.tokopedia.com",
    searchUrl: (keyword) => `https://www.tokopedia.com/search?q=${encodeURIComponent(keyword)}`,
    // /{shop}/{product-slug}; excludes Tokopedia's own sections.
    productPath:
      /^\/(?!search|discovery|p\/|promo|help|cart|user|login|register|about|edu|blog|seller|mitra)[^/]+\/[^/]+\/?$/,
    resultsPath: /^\/search\/?$/,
  },
  Shopee: {
    name: "Shopee",
    host: "shopee.co.id",
    searchUrl: (keyword) => `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}`,
    productPath: /-i\.\d+\.\d+/,
    resultsPath: /^\/search\/?$/,
  },
}

export function storeForUrl(url: string | undefined): StoreName | undefined {
  if (!url) return undefined
  try {
    const { host } = new URL(url)
    return (Object.values(STORE_CONFIG).find((s) => s.host === host) ?? undefined)?.name
  } catch {
    return undefined
  }
}

export function contextForUrl(tabId: number | undefined, url: string | undefined): ActiveContext {
  const store = storeForUrl(url)
  if (!store || !url) return { tabId, kind: "other", url }
  const { pathname } = new URL(url)
  const config = STORE_CONFIG[store]
  if (config.resultsPath.test(pathname)) return { tabId, store, kind: "results", url }
  if (config.productPath.test(pathname)) return { tabId, store, kind: "detail", url }
  return { tabId, store, kind: "other", url }
}

/** Product URLs without tracking parameters, so the same listing matches across visits. */
export function canonicalProductUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname.replace(/\/$/, "")}`
  } catch {
    return url
  }
}

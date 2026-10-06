// Domain types shared by the side panel, options page, background worker and
// content script. Field names follow the data model in jev-pilih-produk-PRD.md.

export type StoreName = "Tokopedia" | "Shopee"
export const STORES: StoreName[] = ["Tokopedia", "Shopee"]
export const otherStore = (store: StoreName): StoreName => (store === "Tokopedia" ? "Shopee" : "Tokopedia")

export type CriterionLevel = "wajib" | "opsional"

export interface Criterion {
  id: string
  name: string
  value: string
  level: CriterionLevel
  enabled: boolean
  /** Exact part of the desire text this criterion came from; drives the Insight Lens. */
  phrase?: string
  /** Guessed by the model rather than stated by the user. */
  inferred?: boolean
  /** Added by the user while reviewing. */
  custom?: boolean
}

/** Output of the desire-processing LLM ("Pemahaman Keinginan"). */
export interface UnderstoodDesire {
  text: string
  keyword: string
  criteria: Criterion[]
}

/** IndexedDB `desireHistory` record. */
export interface DesireHistoryItem {
  id: string
  text: string
  store: StoreName
  keyword: string
  criteria: Criterion[]
  createdAt: number
  lastUsedAt: number
  /** e.g. "5 cocok dari 12", filled in once a search finishes. */
  resultSummary?: string
}

export type Verdict = "cocok" | "tidak_cocok"

export interface Classification {
  label: Verdict
  /** 0–100 for display. */
  confidence: number
  summary: string
  reasons: string[]
}

/** A listing as read from a store's results page by the content script. */
export interface PageProduct {
  url: string
  title: string
  priceText?: string
  rating?: string
  sold?: string
  shop?: string
  location?: string
}

export interface ProductResult extends PageProduct {
  status: "pending" | "done" | "error"
  classification?: Classification
}

/** A product page as read by the content script. */
export interface PageDetail {
  url: string
  title: string
  priceText?: string
  description: string
  info?: string
}

export type CheckStatus = "terpenuhi" | "sebagian" | "tidak"

export interface CriterionCheck {
  criterion: string
  want: string
  optional: boolean
  status: CheckStatus
  /** Short explanation for the sidebar. */
  evidence: string
  /** Exact text from the listing that backs the check ("" when none). */
  quote: string
}

export interface DetailResult {
  url: string
  title: string
  priceText?: string
  classification: Classification
  checks: CriterionCheck[]
  note?: string
}

export interface SearchSession {
  id: string
  desire: UnderstoodDesire
  store: StoreName
  searchUrl: string
  tabId?: number
  startedAt: number
  phase: "opening" | "classifying" | "done"
  products: ProductResult[]
  /** Page sort ("Urutkan yang cocok") currently applied in the store tab. */
  sorted: boolean
  error?: string
  detail?: {
    url: string
    /** Page text as read by the content script, kept for "Cek ulang". */
    page: PageDetail
    status: "checking" | "done" | "error"
    result?: DetailResult
    error?: string
  }
}

/** What the active tab is showing, so the side panel can follow along. */
export interface ActiveContext {
  tabId?: number
  store?: StoreName
  kind: "results" | "detail" | "other"
  url?: string
}

export type Priority = "harga" | "kualitas" | "pengiriman"
export type LabelStyle = "sorotan" | "label" | "ikon"
export type ModelPreference = "otomatis" | "hemat" | "teliti"

export interface Settings {
  jevEnabled: boolean
  priorities: Priority[]
  favoriteStores: StoreName[]
  labelStyle: LabelStyle
  dimMismatched: boolean
  showReasons: boolean
  modelPreference: ModelPreference
}

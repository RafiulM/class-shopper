/**
 * Content script for Tokopedia and Shopee. It reads listings and product pages,
 * reports them to the background worker, and draws Jev's labels on the page.
 * It never sends anything when Jev is switched off.
 */
import { findCards, readDetail, type DetailParts } from "@/content/adapters"
import {
  clearCard,
  clearDetailChip,
  clearHighlights,
  ensurePageStyle,
  highlightEvidence,
  locateCard,
  renderCard,
  renderDetailChip,
  sortCards,
  type CardStatus,
} from "@/content/overlay"
import type { Classification, DetailResult, Settings } from "@/lib/types"
import type { BackgroundRequest, ContentMessage } from "@/shared/messages"
import { getSettings, SETTINGS_KEY, DEFAULT_SETTINGS } from "@/shared/settings"
import { contextForUrl, storeForUrl } from "@/shared/stores"

const store = storeForUrl(location.href)

interface Tracked {
  el: HTMLElement
  status: CardStatus
  classification?: Classification
  /** Whether the background has answered for this card (so we draw on it). */
  rendered: boolean
}

const SCAN_DELAY = 600
const EMPTY_REPORT_DELAY = 10_000

let settings: Settings = DEFAULT_SETTINGS
let href = location.href
let cards = new Map<string, Tracked>()
let reported = new Set<string>()
let sorted = false
let detail: DetailParts | null = null
let detailSent: string | null = null
let detailResult: DetailResult | undefined
let emptyTimer: number | undefined
let scanTimer: number | undefined

const post = (request: BackgroundRequest) => chrome.runtime.sendMessage(request).catch(() => {})

function resetPage() {
  for (const card of cards.values()) clearCard(card.el)
  cards = new Map()
  reported = new Set()
  sorted = false
  clearDetailChip(detail?.titleEl ?? null)
  clearHighlights()
  detail = null
  detailSent = null
  detailResult = undefined
  window.clearTimeout(emptyTimer)
  emptyTimer = undefined
}

function scan() {
  if (!store || !settings.jevEnabled) return
  if (location.href !== href) {
    href = location.href
    resetPage()
  }
  const kind = contextForUrl(undefined, location.href).kind
  if (kind === "results") scanResults()
  else if (kind === "detail") scanDetail()
}

function scanResults() {
  if (!store) return
  const found = findCards(store)
  const toReport = []
  for (const { el, product } of found) {
    const tracked = cards.get(product.url)
    if (tracked && tracked.el !== el) {
      // The store re-rendered this card; move our label to the new element.
      clearCard(tracked.el)
      tracked.el = el
      if (tracked.rendered) renderCard(el, tracked.status, tracked.classification, settings)
    }
    if (!tracked) cards.set(product.url, { el, status: "pending", rendered: false })
    if (!reported.has(product.url)) {
      reported.add(product.url)
      toReport.push(product)
    }
  }
  if (toReport.length) {
    window.clearTimeout(emptyTimer)
    void post({ type: "page-products", products: toReport })
  } else if (!cards.size && emptyTimer === undefined) {
    emptyTimer = window.setTimeout(() => {
      if (!cards.size) void post({ type: "page-products", products: [] })
    }, EMPTY_REPORT_DELAY)
  }
}

function scanDetail() {
  if (!store) return
  const parts = readDetail(store)
  if (!parts) return
  detail = parts
  if (detailSent === parts.detail.url) return
  detailSent = parts.detail.url
  void post({ type: "page-detail", detail: parts.detail })
}

function scheduleScan() {
  window.clearTimeout(scanTimer)
  scanTimer = window.setTimeout(scan, SCAN_DELAY)
}

function applyDetail(status: "checking" | "done" | "error", result?: DetailResult) {
  if (!detail) return
  detailResult = result
  renderDetailChip(detail.titleEl, status, result)
  if (status === "done" && result) {
    highlightEvidence(detail.textRoots, result.checks.map((c) => c.quote).filter(Boolean), null)
  }
}

chrome.runtime.onMessage.addListener((message: ContentMessage) => {
  if (!settings.jevEnabled) return
  switch (message.type) {
    case "verdicts":
      for (const v of message.verdicts) {
        const tracked = cards.get(v.url)
        if (!tracked) continue
        tracked.status = v.status
        tracked.classification = v.classification
        tracked.rendered = true
        renderCard(tracked.el, v.status, v.classification, settings)
      }
      if (sorted) sortCards([...cards.values()], true)
      break
    case "detail-verdict":
      applyDetail(message.status, message.result)
      break
    case "locate": {
      const tracked = cards.get(message.url)
      if (tracked) locateCard(tracked.el)
      break
    }
    case "sort":
      sorted = message.on
      sortCards([...cards.values()], sorted)
      break
    case "highlight":
      if (detail) highlightEvidence(detail.textRoots, message.quotes, message.focus)
      break
    case "reset":
      resetPage()
      scheduleScan()
      break
  }
})

// Kendali Jev: switching off removes everything and stops reporting.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY]) return
  const next = { ...DEFAULT_SETTINGS, ...(changes[SETTINGS_KEY].newValue as Partial<Settings>) }
  const wasOn = settings.jevEnabled
  settings = next
  if (!next.jevEnabled) {
    resetPage()
    return
  }
  if (!wasOn) {
    scheduleScan()
    return
  }
  // Label style changed: redraw what we have.
  for (const card of cards.values()) if (card.rendered) renderCard(card.el, card.status, card.classification, next)
  if (detail && detailResult) applyDetail("done", detailResult)
})

async function init() {
  if (!store) return
  settings = await getSettings()
  ensurePageStyle()
  new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true })
  window.addEventListener("popstate", scheduleScan)
  scan()
}

void init()

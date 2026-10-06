/**
 * What Jev draws on store pages. Labels live in shadow roots so store CSS cannot
 * restyle them; card frames use data attributes plus one page stylesheet.
 * Nothing in the store's own DOM is moved or rewritten.
 */
import type { Classification, DetailResult, Settings } from "@/lib/types"

/*
 * Verdict colors are loud on purpose and avoid the store's own palette (Tokopedia
 * green, discount red-pink), so a Jev label never reads as part of the listing.
 * Cocok = lime, Tidak cocok = red, Menilai = Jev blue. No percentages anywhere:
 * the store already shows discount percentages on the same cards.
 */
const PAGE_CSS = `
[data-jev-card] { position: relative; }
[data-jev-card][data-jev-verdict="cocok"][data-jev-style="sorotan"]::after { content: ""; position: absolute; inset: 0; z-index: 5;
  border: 4px solid #84cc16; border-radius: inherit; box-shadow: 0 0 0 3px rgb(132 204 22 / 35%); pointer-events: none; }
[data-jev-card][data-jev-verdict="tidak_cocok"][data-jev-dim="true"] img { opacity: .4; filter: grayscale(1); transition: opacity .2s, filter .2s; }
[data-jev-card][data-jev-active="true"] { box-shadow: 0 0 0 4px #0c0a09, 0 0 0 8px #3ba6f1 !important; border-radius: 10px; }
::highlight(jev-evidence) { background-color: #e8f4fb; color: #0a558a; }
::highlight(jev-focus) { background-color: #3ba6f1; color: #0c0a09; }
@media (prefers-reduced-motion: reduce) { [data-jev-card] img { transition: none !important; } }
`

const SHADOW_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
svg { width: 16px; height: 16px; flex: none; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
[data-v="cocok"] { --bg: #84cc16; --fg: #0c0a09; --tint: #f2fbe3; --ink: #1a2e05; }
[data-v="tidak_cocok"] { --bg: #dc2626; --fg: #fff; --tint: #fef2f2; --ink: #7f1d1d; }
[data-v="pending"], [data-v="checking"] { --bg: #3ba6f1; --fg: #0c0a09; --tint: #e8f4fb; --ink: #0a558a; }
[data-v="error"] { --bg: #57534e; --fg: #fff; --tint: #f5f5f4; --ink: #44403c; }
.strip { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 4px 10px 4px 8px; background: var(--bg); color: var(--fg);
  font: 800 12px/16px "Inter Variable", Inter, system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase; }
.strip[data-compact="true"] { min-height: 0; padding: 4px; border-radius: 9999px; box-shadow: 0 0 0 2px #fff, 0 2px 6px rgb(0 0 0 / 30%); }
.verdict { display: inline-flex; align-items: center; gap: 4px; }
.reason { margin: 0; padding: 8px 10px; border-left: 4px solid var(--bg); background: var(--tint); color: var(--ink);
  font: 500 12px/18px "Inter Variable", Inter, system-ui, sans-serif; }
.chip { display: inline-flex; align-items: center; gap: 8px; margin: 8px 0; padding: 4px 12px 4px 10px; border-radius: 9999px; background: var(--bg); color: var(--fg);
  font: 800 13px/20px "Inter Variable", Inter, system-ui, sans-serif; letter-spacing: .03em; text-transform: uppercase; }
`

const ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  loader: '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>',
}

export function ensurePageStyle() {
  if (document.getElementById("jev-style")) return
  const style = document.createElement("style")
  style.id = "jev-style"
  style.textContent = PAGE_CSS
  document.head.append(style)
}

const HOST_RESET = "all:initial;display:block;"

function shadowHost(parent: HTMLElement, part: string, where: "prepend" | "append" | "after"): ShadowRoot {
  const existing =
    where === "after"
      ? (parent.nextElementSibling?.matches(`[data-jev-ui="${part}"]`) ? parent.nextElementSibling : null)
      : parent.querySelector(`:scope > [data-jev-ui="${part}"]`)
  if (existing?.shadowRoot) return existing.shadowRoot
  // A custom tag plus an inline reset, so store rules like `a div { padding }` miss the host.
  const host = document.createElement("jev-ui")
  host.style.cssText = HOST_RESET
  host.dataset.jevUi = part
  if (where === "prepend") parent.prepend(host)
  else if (where === "append") parent.append(host)
  else parent.insertAdjacentElement("afterend", host)
  const root = host.attachShadow({ mode: "open" })
  root.innerHTML = `<style>${SHADOW_CSS}</style><div class="body"></div>`
  return root
}

const body = (root: ShadowRoot) => root.querySelector(".body") as HTMLElement

export type CardStatus = "pending" | "done" | "error"

/** Label Etalase on one listing card. */
export function renderCard(el: HTMLElement, status: CardStatus, classification: Classification | undefined, settings: Settings) {
  const verdict = status === "done" && classification ? classification.label : status
  el.dataset.jevCard = ""
  el.dataset.jevVerdict = verdict
  el.dataset.jevStyle = settings.labelStyle
  el.dataset.jevDim = String(settings.dimMismatched)

  const label =
    verdict === "cocok" ? "Cocok" : verdict === "tidak_cocok" ? "Tidak cocok" : verdict === "error" ? "Gagal dinilai" : "Menilai…"
  const icon = verdict === "cocok" ? ICONS.check : verdict === "tidak_cocok" ? ICONS.x : verdict === "error" ? ICONS.x : ICONS.loader
  const compact = settings.labelStyle === "ikon"
  const root = shadowHost(el, "badge", "prepend")
  // Full strip sits in the flow above the photo, away from the store's discount
  // badge in the photo's top-left. Ikon ringkas floats in the opposite corner.
  ;(root.host as HTMLElement).style.cssText =
    HOST_RESET + (compact ? "position:absolute;top:8px;right:8px;" : "position:relative;") + "z-index:6;pointer-events:none;"
  body(root).innerHTML = `<div class="strip" data-v="${verdict}" data-compact="${compact}"><span class="verdict">${icon}<span${
    compact ? ' class="sr"' : ""
  }>${label}</span></span><span class="sr"> menurut Jev</span></div>`

  const reasonHost = el.querySelector(':scope > [data-jev-ui="reason"]')
  if (!settings.showReasons || verdict === "pending") {
    reasonHost?.remove()
    return
  }
  const reason = verdict === "error" ? "Jev belum bisa menilai produk ini." : (classification?.summary ?? "")
  const p = document.createElement("p")
  p.className = "reason"
  p.dataset.v = verdict
  p.innerHTML = `<span class="sr">Alasan Jev: </span>`
  p.append(reason)
  body(shadowHost(el, "reason", "append")).replaceChildren(p)
}

export function clearCard(el: HTMLElement) {
  el.querySelectorAll(':scope > [data-jev-ui]').forEach((n) => n.remove())
  for (const key of ["jevCard", "jevVerdict", "jevStyle", "jevDim", "jevActive"]) delete el.dataset[key]
  const item = gridItem(el)
  if (item) item.style.order = ""
}

/** Outermost ancestor that contains only this card, i.e. the grid item to reorder. */
function gridItem(el: HTMLElement): HTMLElement | null {
  let item: HTMLElement = el
  while (item.parentElement && item.parentElement !== document.body && item.parentElement.querySelectorAll("[data-jev-card]").length <= 1) {
    item = item.parentElement
  }
  return item
}

/** Urutkan yang Cocok: CSS order on grid items, so the store's own DOM stays untouched. */
export function sortCards(cards: { el: HTMLElement; status: CardStatus; classification?: Classification }[], on: boolean) {
  for (const card of cards) {
    const item = gridItem(card.el)
    if (!item) continue
    if (!on) {
      item.style.order = ""
      continue
    }
    const c = card.classification
    item.style.order = card.status === "done" && c?.label === "cocok" ? String(-c.confidence) : card.status === "pending" ? "0" : "1"
  }
}

let activeTimer: number | undefined
export function locateCard(el: HTMLElement) {
  document.querySelectorAll<HTMLElement>("[data-jev-active]").forEach((n) => delete n.dataset.jevActive)
  el.dataset.jevActive = "true"
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" })
  window.clearTimeout(activeTimer)
  activeTimer = window.setTimeout(() => delete el.dataset.jevActive, 2400)
}

/** Label di Halaman Detail: small verdict chip after the product title. */
export function renderDetailChip(titleEl: HTMLElement, status: "checking" | "done" | "error", result?: DetailResult) {
  const verdict = status === "done" && result ? result.classification.label : status
  const label =
    verdict === "cocok" ? "Cocok" : verdict === "tidak_cocok" ? "Tidak cocok" : verdict === "error" ? "Gagal mengecek" : "Mengecek…"
  const icon = verdict === "cocok" ? ICONS.check : verdict === "tidak_cocok" || verdict === "error" ? ICONS.x : ICONS.loader
  body(shadowHost(titleEl, "chip", "after")).innerHTML =
    `<span class="chip" data-v="${verdict}"><span class="verdict">${icon}${label}</span><span class="sr"> menurut Jev</span></span>`
}

export function clearDetailChip(titleEl: HTMLElement | null) {
  const next = titleEl?.nextElementSibling
  if (next?.matches('[data-jev-ui="chip"]')) next.remove()
}

// ------------------------------------------------------------- highlighting

/** Find `quote` inside `root`'s text, ignoring case and whitespace differences. */
function findRange(root: HTMLElement, quote: string): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const map: { node: Text; offset: number }[] = []
  let flat = ""
  let lastSpace = true
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const value = node.data
    for (let i = 0; i < value.length; i++) {
      const ch = value[i]
      if (/\s/.test(ch)) {
        if (lastSpace) continue
        flat += " "
        lastSpace = true
      } else {
        flat += ch.toLowerCase()
        lastSpace = false
      }
      map.push({ node, offset: i })
    }
  }
  const needle = quote.replace(/\s+/g, " ").trim().toLowerCase()
  const at = needle ? flat.indexOf(needle) : -1
  if (at < 0) return null
  const start = map[at]
  const end = map[at + needle.length - 1]
  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset + 1)
  return range
}

const highlightsSupported = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined"

/** Sorot Elemen Penting: mark every evidence quote; scroll to `focus` when given. */
export function highlightEvidence(roots: HTMLElement[], quotes: string[], focus: string | null) {
  if (!highlightsSupported()) return
  const ranges = quotes.flatMap((q) => roots.map((r) => findRange(r, q)).filter((r): r is Range => Boolean(r)).slice(0, 1))
  CSS.highlights.set("jev-evidence", new Highlight(...ranges))
  CSS.highlights.delete("jev-focus")
  if (!focus) return
  const target = roots.map((r) => findRange(r, focus)).find(Boolean)
  if (!target) return
  CSS.highlights.set("jev-focus", new Highlight(target))
  const rect = target.getBoundingClientRect()
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
  window.scrollBy({ top: rect.top - window.innerHeight / 2, behavior: reduced ? "auto" : "smooth" })
}

export function clearHighlights() {
  if (!highlightsSupported()) return
  CSS.highlights.delete("jev-evidence")
  CSS.highlights.delete("jev-focus")
}

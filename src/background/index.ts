/**
 * Background service worker: the "brain" from the PRD. It owns the OpenRouter
 * calls, the search session, storage writes and messaging with store tabs.
 */
import { checkDetail, classifyListings, understandDesire } from "@/background/jev"
import { checkKey, JevError } from "@/background/openrouter"
import { keywordFor, normalizeText, usedCriteria } from "@/lib/desire"
import type { Classification, PageDetail, PageProduct, ProductResult, SearchSession, UnderstoodDesire } from "@/lib/types"
import { getCached, listHistory, putCached, saveHistory } from "@/shared/db"
import type { BackgroundRequest, BackgroundResponses, ContentMessage, Reply } from "@/shared/messages"
import { readContext, readSession, writeContext, writeSession } from "@/shared/session"
import { getApiKey, getSettings, maskKey, MODELS, setApiKey } from "@/shared/settings"
import { canonicalProductUrl, contextForUrl, STORE_CONFIG, storeForUrl } from "@/shared/stores"

const BATCH_SIZE = 8

// ------------------------------------------------------------------ lifecycle

const enablePanelOnAction = () =>
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error))

enablePanelOnAction()
chrome.runtime.onStartup.addListener(enablePanelOnAction)
chrome.runtime.onInstalled.addListener(({ reason }) => {
  enablePanelOnAction()
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/welcome/index.html") })
  }
})

// Follow the active tab so the side panel can switch between results and detail.
async function refreshContext(tabId?: number) {
  const [tab] = tabId ? [await chrome.tabs.get(tabId)] : await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (tab) await writeContext(contextForUrl(tab.id, tab.url))
}
chrome.tabs.onActivated.addListener(({ tabId }) => void refreshContext(tabId).catch(() => {}))
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (tab.active && (info.url || info.status === "complete")) void refreshContext(tabId).catch(() => {})
})
chrome.windows.onFocusChanged.addListener(() => void refreshContext().catch(() => {}))

// ------------------------------------------------------------------- session

// Serialise read-modify-write so concurrent batches never overwrite each other.
let sessionChain: Promise<unknown> = Promise.resolve()
function mutateSession(fn: (s: SearchSession) => SearchSession | void): Promise<SearchSession | null> {
  const next = sessionChain.then(async () => {
    const current = await readSession()
    if (!current) return null
    const updated = fn(current) ?? current
    await writeSession(updated)
    return updated
  })
  sessionChain = next.catch(() => {})
  return next
}

async function requireAi() {
  const [apiKey, settings] = await Promise.all([getApiKey(), getSettings()])
  if (!apiKey) throw new JevError("Pasang API key OpenRouter dulu di Pengaturan.")
  return { ai: { apiKey, model: MODELS[settings.modelPreference].id }, settings }
}

/** Stable key for "these criteria", so cached verdicts are reused only for the same desire. */
function desireKey(desire: UnderstoodDesire): string {
  const basis = JSON.stringify(
    usedCriteria(desire.criteria)
      .map((c) => [normalizeText(c.name), normalizeText(c.value), c.level])
      .sort(),
  )
  let hash = 2166136261
  for (let i = 0; i < basis.length; i++) hash = Math.imul(hash ^ basis.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}

function toTab(tabId: number | undefined, message: ContentMessage) {
  if (tabId === undefined) return
  chrome.tabs.sendMessage(tabId, message).catch(() => {})
}

async function rememberDesire(desire: UnderstoodDesire, store: SearchSession["store"]) {
  const now = Date.now()
  const existing = (await listHistory()).find((h) => normalizeText(h.text) === normalizeText(desire.text))
  await saveHistory({
    id: existing?.id ?? crypto.randomUUID(),
    text: desire.text,
    store,
    keyword: keywordFor(desire),
    criteria: desire.criteria,
    createdAt: existing?.createdAt ?? now,
    lastUsedAt: now,
    resultSummary: existing?.resultSummary,
  })
}

async function startSearch(desire: UnderstoodDesire, store: SearchSession["store"]) {
  const settings = await getSettings()
  if (!settings.jevEnabled) throw new JevError("Jev sedang nonaktif. Nyalakan dulu lewat switch di sidebar.")
  const searchUrl = STORE_CONFIG[store].searchUrl(keywordFor(desire))
  // Reuse the active tab only when it already shows a supported store; never hijack other sites.
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const tab =
    active?.id !== undefined && storeForUrl(active.url)
      ? await chrome.tabs.update(active.id, { url: searchUrl, active: true })
      : await chrome.tabs.create({ url: searchUrl, active: true })
  await writeSession({
    id: crypto.randomUUID(),
    desire,
    store,
    searchUrl,
    tabId: tab?.id,
    startedAt: Date.now(),
    phase: "opening",
    products: [],
    sorted: false,
  })
  await rememberDesire(desire, store)
}

async function finishIfIdle(session: SearchSession | null) {
  if (!session || session.phase !== "classifying" || session.products.some((p) => p.status === "pending")) return
  const done = await mutateSession((s) => ({ ...s, phase: "done" }))
  if (!done) return
  const match = done.products.filter((p) => p.classification?.label === "cocok").length
  const item = (await listHistory()).find((h) => normalizeText(h.text) === normalizeText(done.desire.text))
  if (item) await saveHistory({ ...item, resultSummary: `${match} cocok dari ${done.products.length}` })
}

/** Label Etalase: classify newly seen listings in batches, using the cache first. */
async function handleProducts(found: PageProduct[], tabId: number | undefined) {
  const session = await readSession()
  const settings = await getSettings()
  if (!session || !settings.jevEnabled || tabId === undefined || tabId !== session.tabId) return
  const apiKey = await getApiKey()
  if (!apiKey) return

  if (!found.length) {
    // The content script gave up waiting for listings on this page.
    if (session.phase === "opening") {
      await mutateSession((s) => ({
        ...s,
        phase: "done",
        error: "Jev belum menemukan produk di halaman ini. Coba gulir halaman atau muat ulang tab toko.",
      }))
    }
    return
  }

  const known = new Map(session.products.map((p) => [p.url, p]))
  const fresh: ProductResult[] = []
  for (const p of found) {
    const url = canonicalProductUrl(p.url)
    if (!known.has(url) && !fresh.some((f) => f.url === url)) fresh.push({ ...p, url, status: "pending" })
  }
  // Re-apply labels the page may have lost on re-render.
  toTab(tabId, {
    type: "verdicts",
    verdicts: found
      .map((p) => known.get(canonicalProductUrl(p.url)))
      .filter((p): p is ProductResult => Boolean(p))
      .map((p) => ({ url: p.url, status: p.status, classification: p.classification })),
  })
  if (!fresh.length) return

  const key = desireKey(session.desire)
  const cached = await Promise.all(fresh.map((p) => getCached(`${key}|${p.url}`)))
  fresh.forEach((p, i) => {
    const hit = cached[i]?.classification
    if (hit) Object.assign(p, { status: "done", classification: hit })
  })
  await mutateSession((s) => ({ ...s, phase: "classifying", error: undefined, products: [...s.products, ...fresh] }))
  toTab(tabId, { type: "verdicts", verdicts: fresh.map((p) => ({ url: p.url, status: p.status, classification: p.classification })) })

  const todo = fresh.filter((p) => p.status === "pending")
  const { ai } = await requireAi()
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE)
    let results: (Classification | null)[] = []
    let error: string | undefined
    try {
      results = await classifyListings(ai, session.desire, batch, settings.priorities)
    } catch (err) {
      error = err instanceof JevError ? err.message : "Jev gagal menilai sebagian produk."
    }
    const verdicts = batch.map((p, j) => {
      const classification = results[j] ?? undefined
      return { url: p.url, status: classification ? ("done" as const) : ("error" as const), classification }
    })
    const updated = await mutateSession((s) => {
      if (s.id !== session.id) return
      const byUrl = new Map(verdicts.map((v) => [v.url, v]))
      return {
        ...s,
        error: error ?? s.error,
        products: s.products.map((p) => (byUrl.has(p.url) ? { ...p, ...byUrl.get(p.url) } : p)),
      }
    })
    toTab(tabId, { type: "verdicts", verdicts })
    await Promise.all(
      verdicts
        .filter((v) => v.classification)
        .map((v) =>
          putCached({ id: `${key}|${v.url}`, desireKey: key, productUrl: v.url, kind: "listing", classification: v.classification, createdAt: Date.now() }),
        ),
    )
    if (updated?.id !== session.id) return
    await finishIfIdle(updated)
  }
  await finishIfIdle(await readSession())
}

/** Konfirmasi Detail: re-check one product page with its description. */
async function handleDetail(page: PageDetail, tabId: number | undefined, force = false) {
  const session = await readSession()
  const settings = await getSettings()
  if (!session || !settings.jevEnabled) return
  const url = canonicalProductUrl(page.url)
  const key = desireKey(session.desire)
  await mutateSession((s) => ({ ...s, detail: { url, page, status: "checking" } }))
  toTab(tabId, { type: "detail-verdict", status: "checking" })
  try {
    const cached = force ? undefined : (await getCached(`${key}|detail|${url}`))?.detail
    const { ai } = await requireAi()
    const result = cached ?? (await checkDetail(ai, session.desire, { ...page, url }))
    if (!cached) await putCached({ id: `${key}|detail|${url}`, desireKey: key, productUrl: url, kind: "detail", detail: result, createdAt: Date.now() })
    await mutateSession((s) => (s.detail?.url === url ? { ...s, detail: { url, page, status: "done", result } } : s))
    toTab(tabId, { type: "detail-verdict", status: "done", result })
  } catch (err) {
    const message = err instanceof JevError ? err.message : "Jev gagal mengecek produk ini."
    await mutateSession((s) => (s.detail?.url === url ? { ...s, detail: { url, page, status: "error", error: message } } : s))
    toTab(tabId, { type: "detail-verdict", status: "error" })
  }
}

// ------------------------------------------------------------------ messages

type Handlers = {
  [K in BackgroundRequest["type"]]: (
    request: Extract<BackgroundRequest, { type: K }>,
    sender: chrome.runtime.MessageSender,
  ) => Promise<BackgroundResponses[K]>
}

const handlers: Handlers = {
  async understand({ text }) {
    const { ai } = await requireAi()
    return understandDesire(ai, text)
  },
  async "start-search"({ desire, store }) {
    await startSearch(desire, store)
    return null
  },
  async "save-key"({ key }) {
    const trimmed = key.trim()
    if (!trimmed) throw new JevError("Tempel API key dulu.")
    await checkKey(trimmed)
    await setApiKey(trimmed)
    return { mask: maskKey(trimmed) }
  },
  async "test-key"() {
    const key = await getApiKey()
    if (!key) throw new JevError("Belum ada API key yang tersimpan.")
    await checkKey(key)
    return null
  },
  async locate({ url }) {
    const session = await readSession()
    if (session?.tabId === undefined) return null
    await chrome.tabs.update(session.tabId, { active: true })
    toTab(session.tabId, { type: "locate", url })
    return null
  },
  async "sort-page"({ on }) {
    const session = await mutateSession((s) => ({ ...s, sorted: on }))
    toTab(session?.tabId, { type: "sort", on })
    return null
  },
  async "open-product"({ url }) {
    const session = await readSession()
    if (session?.tabId !== undefined) await chrome.tabs.update(session.tabId, { url, active: true })
    else await chrome.tabs.create({ url })
    return null
  },
  async "back-to-results"() {
    const session = await readSession()
    if (session?.tabId !== undefined) await chrome.tabs.update(session.tabId, { url: session.searchUrl, active: true })
    return null
  },
  async "recheck-detail"() {
    const [session, context] = await Promise.all([readSession(), readContext()])
    if (session?.detail) await handleDetail(session.detail.page, context.tabId, true)
    return null
  },
  async "highlight-evidence"({ quote, all }) {
    const [session, context] = await Promise.all([readSession(), readContext()])
    const quotes = all ? (session?.detail?.result?.checks.map((c) => c.quote).filter(Boolean) ?? []) : []
    toTab(context.tabId, { type: "highlight", quotes, focus: quote })
    return null
  },
  async "page-products"({ products }, sender) {
    void handleProducts(products, sender.tab?.id).catch((err) => console.error("Jev classify", err))
    return null
  },
  async "page-detail"({ detail }, sender) {
    void handleDetail(detail, sender.tab?.id).catch((err) => console.error("Jev detail", err))
    return null
  },
}

chrome.runtime.onMessage.addListener((request: BackgroundRequest, sender, sendResponse) => {
  const handler = handlers[request?.type] as ((r: BackgroundRequest, s: chrome.runtime.MessageSender) => Promise<unknown>) | undefined
  if (!handler) return false
  handler(request, sender).then(
    (data) => sendResponse({ ok: true, data } satisfies Reply<unknown>),
    (err) => {
      if (!(err instanceof JevError)) console.error("Jev", err)
      sendResponse({ ok: false, error: err instanceof JevError ? err.message : "Terjadi kesalahan di Jev. Coba lagi." } satisfies Reply<unknown>)
    },
  )
  return true
})

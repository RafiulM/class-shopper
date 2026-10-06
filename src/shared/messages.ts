import type {
  Classification,
  DetailResult,
  PageDetail,
  PageProduct,
  StoreName,
  UnderstoodDesire,
} from "@/lib/types"

/** Requests handled by the background service worker. */
export type BackgroundRequest =
  | { type: "understand"; text: string }
  | { type: "start-search"; desire: UnderstoodDesire; store: StoreName }
  | { type: "save-key"; key: string }
  | { type: "test-key" }
  | { type: "locate"; url: string }
  | { type: "sort-page"; on: boolean }
  | { type: "open-product"; url: string }
  | { type: "back-to-results" }
  | { type: "recheck-detail" }
  | { type: "highlight-evidence"; quote: string | null; all: boolean }
  // from content scripts
  | { type: "page-products"; products: PageProduct[] }
  | { type: "page-detail"; detail: PageDetail }

export interface BackgroundResponses {
  understand: UnderstoodDesire
  "start-search": null
  "save-key": { mask: string }
  "test-key": null
  locate: null
  "sort-page": null
  "open-product": null
  "back-to-results": null
  "recheck-detail": null
  "highlight-evidence": null
  "page-products": null
  "page-detail": null
}

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string }

/** Send a request to the background worker; rejects with a user-facing message. */
export async function send<R extends BackgroundRequest>(request: R): Promise<BackgroundResponses[R["type"]]> {
  const reply = (await chrome.runtime.sendMessage(request)) as Reply<BackgroundResponses[R["type"]]> | undefined
  if (!reply) throw new Error("Jev tidak merespons. Coba muat ulang extension.")
  if (!reply.ok) throw new Error(reply.error)
  return reply.data
}

/** Messages the background sends to a store tab's content script. */
export type ContentMessage =
  | { type: "verdicts"; verdicts: { url: string; classification?: Classification; status: "pending" | "done" | "error" }[] }
  | { type: "detail-verdict"; status: "checking" | "done" | "error"; result?: DetailResult }
  | { type: "locate"; url: string }
  | { type: "sort"; on: boolean }
  | { type: "highlight"; quotes: string[]; focus: string | null }
  | { type: "reset" }

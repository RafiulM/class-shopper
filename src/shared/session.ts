import type { ActiveContext, SearchSession } from "@/lib/types"

/**
 * chrome.storage.session holds the current search and what the active tab shows.
 * Only the background worker writes it; the side panel subscribes.
 */
export const SESSION_KEY = "session"
export const CONTEXT_KEY = "context"

export async function readSession(): Promise<SearchSession | null> {
  const stored = await chrome.storage.session.get(SESSION_KEY)
  return (stored[SESSION_KEY] as SearchSession | undefined) ?? null
}

export async function writeSession(session: SearchSession | null): Promise<void> {
  if (session) await chrome.storage.session.set({ [SESSION_KEY]: session })
  else await chrome.storage.session.remove(SESSION_KEY)
}

export async function readContext(): Promise<ActiveContext> {
  const stored = await chrome.storage.session.get(CONTEXT_KEY)
  return (stored[CONTEXT_KEY] as ActiveContext | undefined) ?? { kind: "other" }
}

export async function writeContext(context: ActiveContext): Promise<void> {
  await chrome.storage.session.set({ [CONTEXT_KEY]: context })
}

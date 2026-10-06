import type { Classification, DesireHistoryItem, DetailResult } from "@/lib/types"

/**
 * IndexedDB (PRD): `desireHistory` for saved desires and `classifications` as a
 * cache of Jev verdicts so the same listing is not paid for twice.
 */
const DB_NAME = "jev"
const DB_VERSION = 1
const HISTORY = "desireHistory"
const CLASSIFICATIONS = "classifications"
export const HISTORY_CHANGED = "jev-history-changed"

interface CachedClassification {
  id: string
  desireKey: string
  productUrl: string
  kind: "listing" | "detail"
  classification?: Classification
  detail?: DetailResult
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(HISTORY)) {
        db.createObjectStore(HISTORY, { keyPath: "id" }).createIndex("lastUsedAt", "lastUsedAt")
      }
      if (!db.objectStoreNames.contains(CLASSIFICATIONS)) {
        db.createObjectStore(CLASSIFICATIONS, { keyPath: "id" }).createIndex("createdAt", "createdAt")
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const request = fn(tx.objectStore(store))
        tx.oncomplete = () => resolve(request ? request.result : (undefined as T))
        tx.onerror = () => reject(tx.error)
      }),
  )
}

/** Notify other surfaces (side panel, options) that history changed. */
function announce() {
  chrome.runtime.sendMessage({ type: HISTORY_CHANGED }).catch(() => {})
}

export async function listHistory(): Promise<DesireHistoryItem[]> {
  const all = await run<DesireHistoryItem[]>(HISTORY, "readonly", (s) => s.getAll())
  return all.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
}

export async function saveHistory(item: DesireHistoryItem): Promise<void> {
  await run(HISTORY, "readwrite", (s) => s.put(item))
  announce()
}

export async function deleteHistory(id: string): Promise<void> {
  await run(HISTORY, "readwrite", (s) => s.delete(id))
  announce()
}

export async function clearHistory(): Promise<void> {
  await run(HISTORY, "readwrite", (s) => s.clear())
  await run(CLASSIFICATIONS, "readwrite", (s) => s.clear())
  announce()
}

export async function getCached(id: string): Promise<CachedClassification | undefined> {
  return run<CachedClassification | undefined>(CLASSIFICATIONS, "readonly", (s) => s.get(id))
}

export async function putCached(entry: CachedClassification): Promise<void> {
  await run(CLASSIFICATIONS, "readwrite", (s) => s.put(entry))
}

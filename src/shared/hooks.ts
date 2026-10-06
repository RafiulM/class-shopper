import { useCallback, useEffect, useState } from "react"

import type { ActiveContext, DesireHistoryItem, SearchSession, Settings } from "@/lib/types"
import { HISTORY_CHANGED, listHistory } from "@/shared/db"
import { CONTEXT_KEY, readContext, readSession, SESSION_KEY } from "@/shared/session"
import { API_KEY, DEFAULT_SETTINGS, getApiKey, getSettings, maskKey, SETTINGS_KEY } from "@/shared/settings"

type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void

function useStorage<T>(area: "local" | "session", key: string, load: () => Promise<T>, map: (value: unknown) => T) {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    let alive = true
    load().then((v) => alive && setValue(v))
    const onChange: StorageListener = (changes, changedArea) => {
      if (changedArea === area && key in changes) setValue(map(changes[key].newValue))
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => {
      alive = false
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [area, key, load, map])
  return value
}

const mapSettings = (v: unknown): Settings => ({ ...DEFAULT_SETTINGS, ...(v as Partial<Settings> | undefined) })
const loadMask = async () => {
  const key = await getApiKey()
  return key ? maskKey(key) : null
}
const mapMask = (v: unknown) => (typeof v === "string" ? maskKey(v) : null)
const mapSession = (v: unknown) => (v as SearchSession | undefined) ?? null
const mapContext = (v: unknown): ActiveContext => (v as ActiveContext | undefined) ?? { kind: "other" }

/** Live settings; `undefined` until loaded. */
export const useSettings = () => useStorage("local", SETTINGS_KEY, getSettings, mapSettings)

/** Masked API key; `undefined` while loading, `null` when none is saved. */
export const useApiKeyMask = () => useStorage("local", API_KEY, loadMask, mapMask)

/** Current search; `undefined` while loading, `null` when there is none. */
export const useSession = () => useStorage("session", SESSION_KEY, readSession, mapSession)

export const useActiveContext = () => useStorage("session", CONTEXT_KEY, readContext, mapContext) ?? { kind: "other" }

/** Live history list; `null` until loaded. */
export function useHistory(): [DesireHistoryItem[] | null, () => void] {
  const [items, setItems] = useState<DesireHistoryItem[] | null>(null)
  const reload = useCallback(() => {
    listHistory().then(setItems).catch(() => setItems([]))
  }, [])
  useEffect(() => {
    reload()
    const onMessage = (message: { type?: string }) => {
      if (message?.type === HISTORY_CHANGED) reload()
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [reload])
  return [items, reload]
}

import type { ModelPreference, Priority, Settings } from "@/lib/types"

/** chrome.storage.local keys. The API key never leaves this browser except to OpenRouter. */
export const SETTINGS_KEY = "settings"
export const API_KEY = "apiKey"

export const DEFAULT_SETTINGS: Settings = {
  jevEnabled: true,
  priorities: ["harga", "kualitas", "pengiriman"],
  favoriteStores: ["Tokopedia", "Shopee"],
  labelStyle: "sorotan",
  dimMismatched: true,
  showReasons: true,
  modelPreference: "otomatis",
}

export const PRIORITY_COPY: Record<Priority, { label: string; hint: string }> = {
  harga: { label: "Harga", hint: "Utamakan yang paling hemat dalam budget." },
  kualitas: { label: "Kualitas", hint: "Utamakan rating tinggi dan bahan yang dijelaskan dengan jelas." },
  pengiriman: { label: "Pengiriman", hint: "Utamakan yang dikirim dari kota terdekat." },
}

/** OpenRouter models per preference (all support structured outputs). */
export const MODELS: Record<ModelPreference, { label: string; id: string }> = {
  otomatis: { label: "Otomatis (disarankan)", id: "google/gemini-3.8-flash" },
  hemat: { label: "Hemat biaya", id: "openai/gpt-6-luna" },
  teliti: { label: "Paling teliti", id: "anthropic/claude-sonnet-5.5" },
}

export const maskKey = (key: string) => `${key.slice(0, 9)}••••••••••••${key.slice(-4)}`

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await chrome.storage.local.set({ [SETTINGS_KEY]: next })
  return next
}

export async function getApiKey(): Promise<string | null> {
  const stored = await chrome.storage.local.get(API_KEY)
  return (stored[API_KEY] as string | undefined) ?? null
}

export async function setApiKey(key: string | null): Promise<void> {
  if (key) await chrome.storage.local.set({ [API_KEY]: key })
  else await chrome.storage.local.remove(API_KEY)
}

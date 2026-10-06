/**
 * Minimal OpenRouter client used only by the background service worker.
 * Calls go straight from the extension to OpenRouter with the user's own key.
 */
const BASE_URL = "https://openrouter.ai/api/v1"
const TIMEOUT_MS = 60_000

/** Error with a message that is safe to show in the UI as-is. */
export class JevError extends Error {}

function friendly(status: number): string {
  if (status === 401 || status === 403) return "API key tidak dikenali OpenRouter. Periksa lagi atau buat key baru."
  if (status === 402) return "Saldo OpenRouter habis. Isi ulang kredit di dashboard OpenRouter, lalu coba lagi."
  if (status === 429) return "Terlalu banyak permintaan ke OpenRouter. Tunggu sebentar, lalu coba lagi."
  if (status === 400 || status === 404) return "Model yang dipilih tidak bisa dipakai saat ini. Ganti model di Pengaturan."
  return "OpenRouter sedang bermasalah. Coba lagi beberapa saat lagi."
}

async function request(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new JevError("OpenRouter terlalu lama merespons. Coba lagi.")
    }
    throw new JevError("Tidak bisa terhubung ke OpenRouter. Periksa koneksi internet.")
  }
}

/** Uji Koneksi: validates the key without spending credits. */
export async function checkKey(apiKey: string): Promise<void> {
  const res = await request("/key", { headers: { Authorization: `Bearer ${apiKey}` } })
  if (!res.ok) throw new JevError(friendly(res.status))
}

interface ChatJsonOptions {
  apiKey: string
  model: string
  system: string
  user: string
  schemaName: string
  schema: Record<string, unknown>
}

/** Chat completion with a strict JSON schema; returns the parsed object. */
export async function chatJson<T>({ apiKey, model, system, user, schemaName, schema }: ChatJsonOptions): Promise<T> {
  const res = await request("/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Jev",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
    }),
  })
  if (!res.ok) throw new JevError(friendly(res.status))
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) {
    throw new JevError("Model tidak memberi jawaban. Coba lagi atau ganti model di Pengaturan.")
  }
  try {
    return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")) as T
  } catch {
    throw new JevError("Jawaban model tidak bisa dibaca. Coba lagi atau ganti model di Pengaturan.")
  }
}

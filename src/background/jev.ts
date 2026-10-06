/**
 * The two AI roles from the PRD:
 *   1. Pemroses Keinginan: free text → structured criteria.
 *   2. Jev classifier: criteria + listing/product text → Cocok / Tidak cocok with reasons.
 */
import { chatJson } from "@/background/openrouter"
import { usedCriteria } from "@/lib/desire"
import type {
  CheckStatus,
  Classification,
  Criterion,
  DetailResult,
  PageDetail,
  PageProduct,
  Priority,
  UnderstoodDesire,
  Verdict,
} from "@/lib/types"
import { PRIORITY_COPY } from "@/shared/settings"

interface Ai {
  apiKey: string
  model: string
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim()
const includesLoose = (haystack: string, needle: string) =>
  needle !== "" && clean(haystack).toLowerCase().includes(clean(needle).toLowerCase())
const toPercent = (n: number) => Math.round(Math.min(1, Math.max(0, Number(n) || 0)) * 100)

function criteriaLines(criteria: Criterion[]): string {
  return usedCriteria(criteria)
    .map((c) => `- [${c.level}] ${c.name}: ${c.value}`)
    .join("\n")
}

// ---------------------------------------------------------------- understand

const UNDERSTAND_SCHEMA = {
  type: "object",
  properties: {
    keyword: { type: "string", description: "Kata kunci 2–5 kata untuk kolom cari toko, tanpa harga" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nama kriteria singkat, mis. Kategori, Harga maksimum, Bobot, Ukuran, Bahan, Warna" },
          value: { type: "string", description: "Nilai kriteria dalam bahasa sederhana" },
          level: { type: "string", enum: ["wajib", "opsional"] },
          phrase: { type: "string", description: "Potongan persis dari teks user yang menjadi sumber, atau string kosong" },
          inferred: { type: "boolean", description: "true jika ditebak, bukan disebut user" },
        },
        required: ["name", "value", "level", "phrase", "inferred"],
        additionalProperties: false,
      },
    },
  },
  required: ["keyword", "criteria"],
  additionalProperties: false,
}

const UNDERSTAND_SYSTEM = `Kamu adalah Jev, asisten belanja untuk toko online Indonesia seperti Tokopedia dan Shopee.
Ubah keinginan belanja user menjadi kriteria terstruktur untuk menilai produk.
Aturan:
- Buat 3–7 kriteria: mulai dari Kategori, lalu harga jika disebut, lalu atribut wajib lain, lalu yang opsional.
- Tulis harga dalam Rupiah, mis. "Rp500.000". "di bawah 500 ribu" = harga maksimum Rp500.000; "300 ribuan" = sekitar Rp300.000–Rp399.000.
- "phrase" harus disalin persis dari teks user. Jika kriteria tidak punya sumber di teks, isi "" dan inferred = true.
- Boleh menambah paling banyak 2 kriteria tebakan yang membantu menilai, dengan level "opsional".
- keyword: kata kunci yang biasa dipakai orang Indonesia di marketplace, 2–5 kata, tanpa harga.
- Pakai bahasa Indonesia sehari-hari, tanpa istilah teknis.`

interface UnderstandOutput {
  keyword: string
  criteria: { name: string; value: string; level: string; phrase: string; inferred: boolean }[]
}

export async function understandDesire(ai: Ai, text: string): Promise<UnderstoodDesire> {
  const out = await chatJson<UnderstandOutput>({
    ...ai,
    system: UNDERSTAND_SYSTEM,
    user: text,
    schemaName: "pemahaman_keinginan",
    schema: UNDERSTAND_SCHEMA,
  })
  const criteria: Criterion[] = (out.criteria ?? []).slice(0, 8).map((c) => ({
    id: crypto.randomUUID(),
    name: clean(c.name) || "Kriteria",
    value: clean(c.value),
    level: c.level === "opsional" ? "opsional" : "wajib",
    enabled: clean(c.value) !== "",
    // Only keep phrases that really appear in the text; they drive the highlight.
    phrase: includesLoose(text, c.phrase) ? clean(c.phrase) : undefined,
    inferred: Boolean(c.inferred) || !includesLoose(text, c.phrase),
  }))
  return { text: clean(text), keyword: clean(out.keyword) || clean(text).split(" ").slice(0, 4).join(" "), criteria }
}

// ------------------------------------------------------------------ listings

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          label: { type: "string", enum: ["cocok", "tidak_cocok"] },
          confidence: { type: "number", description: "0 sampai 1" },
          summary: { type: "string", description: "Satu kalimat singkat, maksimal 90 karakter" },
          reasons: { type: "array", items: { type: "string" }, description: "1–3 poin singkat" },
        },
        required: ["index", "label", "confidence", "summary", "reasons"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
}

const CLASSIFY_SYSTEM = `Kamu adalah Jev. Nilai apakah setiap produk dari halaman hasil pencarian COCOK atau TIDAK COCOK dengan kriteria user.
Kamu hanya melihat judul, harga, rating, jumlah terjual, dan toko. Deskripsi belum tersedia.
Aturan:
- COCOK jika semua kriteria wajib kemungkinan besar terpenuhi berdasarkan judul dan harga. Kriteria opsional hanya memengaruhi keyakinan.
- Jika judul tidak menyebut sebuah kriteria wajib (mis. bobot), jangan langsung menolak: nilai dari petunjuk lain dan turunkan keyakinan.
- Harga di atas batas maksimum = TIDAK COCOK. Produk kategori lain atau aksesori = TIDAK COCOK.
- Jika dua produk sama-sama cocok, prioritas user boleh menaikkan keyakinan.
- summary: satu kalimat sederhana tanpa istilah teknis (maks 90 karakter). reasons: 1–3 poin singkat.
- Kembalikan tepat satu hasil untuk SETIAP index.`

interface ClassifyOutput {
  results: { index: number; label: string; confidence: number; summary: string; reasons: string[] }[]
}

export async function classifyListings(
  ai: Ai,
  desire: UnderstoodDesire,
  products: PageProduct[],
  priorities: Priority[],
): Promise<(Classification | null)[]> {
  const lines = products.map((p, i) =>
    [`[${i}] Judul: ${p.title}`, p.priceText && `Harga: ${p.priceText}`, p.rating && `Rating: ${p.rating}`, p.sold && `Terjual: ${p.sold}`, p.shop && `Toko: ${p.shop}`]
      .filter(Boolean)
      .join(" | "),
  )
  const out = await chatJson<ClassifyOutput>({
    ...ai,
    system: CLASSIFY_SYSTEM,
    user: `Keinginan: "${desire.text}"\nKriteria:\n${criteriaLines(desire.criteria)}\nPrioritas user (urut): ${priorities
      .map((p) => PRIORITY_COPY[p].label)
      .join(", ")}\n\nProduk:\n${lines.join("\n")}`,
    schemaName: "label_etalase",
    schema: CLASSIFY_SCHEMA,
  })
  return products.map((_, i) => {
    const r = out.results?.find((x) => x.index === i)
    if (!r) return null
    const label: Verdict = r.label === "cocok" ? "cocok" : "tidak_cocok"
    return {
      label,
      confidence: toPercent(r.confidence),
      summary: clean(r.summary).slice(0, 140),
      reasons: (r.reasons ?? []).map(clean).filter(Boolean).slice(0, 3),
    }
  })
}

// -------------------------------------------------------------------- detail

const DETAIL_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string", enum: ["cocok", "tidak_cocok"] },
    confidence: { type: "number", description: "0 sampai 1" },
    reasons: { type: "array", items: { type: "string" }, description: "2–4 kalimat pendek" },
    checks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criterion: { type: "string" },
          want: { type: "string" },
          optional: { type: "boolean" },
          status: { type: "string", enum: ["terpenuhi", "sebagian", "tidak"] },
          evidence: { type: "string", description: "Penjelasan singkat, maks 80 karakter" },
          quote: { type: "string", description: "Kutipan persis 3–12 kata dari teks produk, atau string kosong" },
        },
        required: ["criterion", "want", "optional", "status", "evidence", "quote"],
        additionalProperties: false,
      },
    },
    note: { type: "string", description: "Catatan penting lain, atau string kosong" },
  },
  required: ["label", "confidence", "reasons", "checks", "note"],
  additionalProperties: false,
}

const DETAIL_SYSTEM = `Kamu adalah Jev. Periksa ulang satu halaman produk terhadap kriteria user memakai judul, harga, info produk, dan deskripsi.
Aturan:
- Buat satu check untuk SETIAP kriteria, dengan urutan yang sama. status: "terpenuhi", "sebagian", atau "tidak".
- evidence: penjelasan singkat dari mana kamu menyimpulkan (maks 80 karakter).
- quote: salin PERSIS 3–12 kata dari judul, info, atau deskripsi yang menjadi bukti. Isi "" jika tidak ada bukti di teks.
- label COCOK hanya jika semua kriteria wajib terpenuhi atau sangat mungkin terpenuhi.
- reasons: 2–4 kalimat pendek bahasa sehari-hari. note: batasan atau hal penting lain, atau "".
- Jangan mengarang fakta yang tidak ada di teks.`

interface DetailOutput {
  label: string
  confidence: number
  reasons: string[]
  checks: { criterion: string; want: string; optional: boolean; status: string; evidence: string; quote: string }[]
  note: string
}

export async function checkDetail(ai: Ai, desire: UnderstoodDesire, page: PageDetail): Promise<DetailResult> {
  const source = [page.title, page.info ?? "", page.description].join("\n")
  const out = await chatJson<DetailOutput>({
    ...ai,
    system: DETAIL_SYSTEM,
    user: `Keinginan: "${desire.text}"\nKriteria:\n${criteriaLines(desire.criteria)}\n\nJudul: ${page.title}\nHarga: ${
      page.priceText ?? "tidak diketahui"
    }\nInfo produk:\n${page.info ?? "-"}\nDeskripsi:\n${page.description.slice(0, 6000)}`,
    schemaName: "konfirmasi_detail",
    schema: DETAIL_SCHEMA,
  })
  const statuses: CheckStatus[] = ["terpenuhi", "sebagian", "tidak"]
  const checks = (out.checks ?? []).map((c) => ({
    criterion: clean(c.criterion),
    want: clean(c.want),
    optional: Boolean(c.optional),
    status: statuses.includes(c.status as CheckStatus) ? (c.status as CheckStatus) : "sebagian",
    evidence: clean(c.evidence),
    // Quotes must exist on the page so the content script can highlight them.
    quote: includesLoose(source, c.quote) ? clean(c.quote) : "",
  }))
  const met = checks.filter((c) => c.status === "terpenuhi").length
  return {
    url: page.url,
    title: page.title,
    priceText: page.priceText,
    classification: {
      label: out.label === "cocok" ? "cocok" : "tidak_cocok",
      confidence: toPercent(out.confidence),
      summary: `${met} dari ${checks.length} kriteria terpenuhi`,
      reasons: (out.reasons ?? []).map(clean).filter(Boolean).slice(0, 4),
    },
    checks,
    note: clean(out.note ?? "") || undefined,
  }
}

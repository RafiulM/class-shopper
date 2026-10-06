// Local HTTPS stand-in for openrouter.ai and www.tokopedia.com, used by
// smoke-extension.mjs. Store pages are synthetic fixtures that only mimic the
// structure the content script relies on; AI answers are deterministic.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync } from "node:fs"
import https from "node:https"
import { tmpdir } from "node:os"
import path from "node:path"

export const TEST_KEY = "sk-or-test-key-1234567890abcdef"

const PRODUCTS = [
  ["sepatu-lari-ultralight-mesh", "Sepatu Lari Pria Ultralight Mesh Sol Empuk 210 g", "Rp429.000"],
  ["sepatu-running-wanita-knit", "Sepatu Running Wanita Knit Ringan Breathable", "Rp349.000"],
  ["sepatu-trail-waterproof", "Sepatu Trail Running Waterproof Grip Kuat", "Rp799.000"],
  ["sepatu-lari-daily-trainer", "Sepatu Lari Unisex Daily Trainer 230 g", "Rp489.000"],
  ["sneakers-kanvas-putih", "Sneakers Casual Kanvas Putih Klasik", "Rp189.000"],
  ["sepatu-lari-anak-anti-slip", "Sepatu Lari Anak Sol Karet Anti Slip", "Rp259.000"],
  ["kaos-kaki-lari-3-pasang", "Kaos Kaki Lari Anti Lecet isi 3 Pasang", "Rp79.000"],
  ["sepatu-lari-slip-on-ringan", "Sepatu Lari Slip On Ringan Tanpa Tali", "Rp299.000"],
]
const LAZY = [
  ["sepatu-lari-cushion-max", "Sepatu Lari Pria Cushion Max Bantalan Tebal", "Rp459.000"],
  ["sepatu-running-lightweight-195", "Sepatu Running Wanita Lightweight 195 g", "Rp479.000"],
]

const card = ([slug, title, price], i) => `
  <div class="item"><a href="https://www.tokopedia.com/toko-${i}/${slug}-${1000 + i}?extParam=src%3Dsearch">
    <div class="img"><img alt="product-image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><div class="disc">45%</div></div>
    <div class="t">${title}</div><div>${price}</div><div>4.7</div><div>1rb+ terjual</div><div>Toko ${i}</div><div>Jakarta Barat</div>
  </a></div>`

const SEARCH_PAGE = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Jual sepatu | Tokopedia</title>
<style>body{font-family:sans-serif;margin:0}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px}
.item a{display:flex;flex-direction:column;border:1px solid #ddd;border-radius:10px;color:inherit;text-decoration:none;overflow:hidden}
.img{position:relative;height:120px;background:#eee}.item a div{padding:2px 8px}
.item a .disc{position:absolute;top:10px;left:0;padding:1px 6px;border-radius:0 6px 6px 0;background:#f94d63;color:#fff;font-weight:700;font-size:12px}</style></head><body>
<input type="search" data-unify="Search" aria-label="Cari di Tokopedia" value="">
<div class="grid" id="grid">${PRODUCTS.map(card).join("")}</div>
<script>
  document.querySelector('input').value = new URLSearchParams(location.search).get('q') || ''
  // Simulate lazy loading on scroll, like the real store.
  setTimeout(() => { document.getElementById('grid').insertAdjacentHTML('beforeend', ${JSON.stringify(
    LAZY.map((p, i) => card(p, PRODUCTS.length + i)).join(""),
  )}) }, 2500)
</script></body></html>`

const DETAIL_PAGE = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Sepatu Lari Pria Ultralight Mesh | Tokopedia</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:760px">
<h1 data-testid="lblPDPDetailProductName">Sepatu Lari Pria Ultralight Mesh Sol Empuk 210 g</h1>
<div data-testid="pdpProductPrice">Rp429.000</div>
<div data-testid="lblPDPInfoProduk">Kondisi: Baru
Kategori: Sepatu Lari Pria</div>
<div data-testid="lblPDPDescriptionProduk">Sepatu lari untuk jogging dan lari harian dengan upper mesh yang bernapas.
Bobotnya hanya 210 g per sepatu (ukuran 42), jadi kaki tetap terasa ringan walau dipakai lama.
Sol tengah EVA memberi bantalan empuk untuk jarak 5–10 km.</div>
</body></html>`

function priceOf(line) {
  const m = line.match(/Harga: Rp([\d.]+)/)
  return m ? Number(m[1].replace(/\./g, "")) : 0
}

function answer(schemaName, userText) {
  if (schemaName === "pemahaman_keinginan") {
    const ringan = /ringan/i.test(userText)
    return {
      keyword: "sepatu lari ringan",
      criteria: [
        { name: "Kategori", value: "Sepatu lari", level: "wajib", phrase: "sepatu lari", inferred: false },
        { name: "Harga maksimum", value: "Rp500.000", level: "wajib", phrase: /di bawah 500 ribu/i.test(userText) ? "di bawah 500 ribu" : "", inferred: false },
        ...(ringan ? [{ name: "Bobot", value: "Ringan", level: "wajib", phrase: "ringan", inferred: false }] : []),
        ...(/hitam/i.test(userText) ? [{ name: "Warna", value: "Hitam", level: "wajib", phrase: "warna hitam", inferred: false }] : []),
        { name: "Kegunaan", value: "Lari harian", level: "opsional", phrase: "", inferred: true },
      ],
    }
  }
  if (schemaName === "label_etalase") {
    const lines = userText.split("\n").filter((l) => /^\[\d+\]/.test(l))
    return {
      results: lines.map((line) => {
        const index = Number(line.match(/^\[(\d+)\]/)[1])
        const ok = /lari|running/i.test(line) && !/anak|kaos|trail/i.test(line) && priceOf(line) <= 500000
        return {
          index,
          label: ok ? "cocok" : "tidak_cocok",
          confidence: ok ? 0.88 : 0.9,
          summary: ok ? "Sepatu lari dan harganya masuk budget." : "Tidak sesuai kategori atau di atas budget.",
          reasons: ok ? ["Judul menyebut sepatu lari", "Harga di bawah Rp500.000"] : ["Kriteria wajib tidak terpenuhi"],
        }
      }),
    }
  }
  return {
    label: "cocok",
    confidence: 0.92,
    reasons: ["Ini memang sepatu lari.", "Bobotnya 210 g, termasuk ringan.", "Harganya di bawah budget."],
    checks: [
      { criterion: "Kategori", want: "Sepatu lari", optional: false, status: "terpenuhi", evidence: "Judul menyebut sepatu lari.", quote: "Sepatu Lari Pria Ultralight Mesh" },
      { criterion: "Harga maksimum", want: "Rp500.000", optional: false, status: "terpenuhi", evidence: "Harganya Rp429.000.", quote: "" },
      { criterion: "Bobot", want: "Ringan", optional: false, status: "terpenuhi", evidence: "Deskripsi: 210 g per sepatu.", quote: "Bobotnya hanya 210 g per sepatu" },
    ],
    note: "Bantalan dibuat untuk jarak 5–10 km.",
  }
}

export function startMockServer(port = 8443) {
  const dir = mkdtempSync(path.join(tmpdir(), "jev-mock-"))
  const key = path.join(dir, "key.pem")
  const cert = path.join(dir, "cert.pem")
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost", "-keyout", key, "-out", cert], {
    stdio: "ignore",
  })
  const calls = []
  const server = https.createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
    const host = req.headers.host?.split(":")[0]
    const url = new URL(req.url, `https://${host}`)
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end()
    if (host === "openrouter.ai") {
      const authed = req.headers.authorization === `Bearer ${TEST_KEY}`
      if (url.pathname === "/api/v1/key") {
        calls.push("key")
        return res.writeHead(authed ? 200 : 401, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ data: {} }))
      }
      if (url.pathname === "/api/v1/chat/completions") {
        let body = ""
        req.on("data", (c) => (body += c))
        req.on("end", () => {
          if (!authed) return res.writeHead(401, cors).end()
          const payload = JSON.parse(body)
          const schema = payload.response_format?.json_schema?.name
          calls.push(schema)
          const content = JSON.stringify(answer(schema, payload.messages.at(-1).content))
          setTimeout(() => {
            res.writeHead(200, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ choices: [{ message: { content } }] }))
          }, 300)
        })
        return
      }
    }
    if (host === "www.tokopedia.com") {
      if (url.pathname === "/search") return res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(SEARCH_PAGE)
      if (/^\/toko-\d+\/[^/]+$/.test(url.pathname)) return res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(DETAIL_PAGE)
    }
    res.writeHead(404).end("not found")
  })
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, calls, port })))
}

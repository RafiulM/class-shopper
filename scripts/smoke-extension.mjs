// End-to-end smoke test: loads dist/ as a real MV3 extension in Chrome for Testing.
// openrouter.ai and www.tokopedia.com are mapped to a local mock server, so the
// production build runs unchanged without spending credits. Run: `npm run test:ext`.
import { mkdir } from "node:fs/promises"
import path from "node:path"
import puppeteer from "puppeteer"

import { startMockServer, TEST_KEY } from "./mock-server.mjs"

const EXTENSION = path.resolve("dist")
const SHOTS = path.resolve(process.env.SHOTS_DIR ?? "/tmp/jev-ext-shots")
const results = []
const problems = []

const check = (name, ok, detail = "") => {
  results.push({ name, ok })
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const text = (page, value) => page.locator(`::-p-text(${value})`)
// DOM click for a page that sits in a background tab: Puppeteer's own click waits
// for animation frames, which Chrome throttles there, and times out.
const tap = (page, selector) => page.$eval(selector, (el) => el.click())

function watch(page, label) {
  page.on("console", (msg) => msg.type() === "error" && problems.push(`${label}: ${msg.text()}`))
  page.on("pageerror", (error) => problems.push(`${label} pageerror: ${error.message}`))
}

async function until(fn, timeout = 8000) {
  const start = Date.now()
  for (;;) {
    const value = await Promise.resolve().then(fn).catch(() => undefined)
    if (value) return value
    if (Date.now() - start > timeout) return value
    await sleep(150)
  }
}

await mkdir(SHOTS, { recursive: true })
const mock = await startMockServer(8443)
const browser = await puppeteer.launch({
  headless: true,
  enableExtensions: [EXTENSION],
  args: [
    "--window-size=1440,960",
    "--ignore-certificate-errors",
    `--host-resolver-rules=MAP openrouter.ai 127.0.0.1:${mock.port},MAP www.tokopedia.com 127.0.0.1:${mock.port}`,
  ],
})

try {
  const workerTarget = await browser.waitForTarget((t) => t.type() === "service_worker" && t.url().endsWith("background.js"))
  const id = new URL(workerTarget.url()).host
  check("service worker running", true, id)
  const welcome = await browser.waitForTarget((t) => t.url().includes(`${id}/src/welcome/index.html`), { timeout: 5000 }).catch(() => null)
  check("onInstalled opens welcome tab", Boolean(welcome))

  // ---- Side panel (opened as a tab so it can be driven) ----
  const panel = await browser.newPage()
  watch(panel, "sidepanel")
  await panel.setViewport({ width: 380, height: 900 })
  await panel.goto(`chrome-extension://${id}/src/sidepanel/index.html`)
  await panel.waitForSelector("::-p-text(Pasang API key dulu)")
  check("no key → API key prompt", true)
  await panel.type("[data-api-key-input]", "sk-or-wrong")
  await text(panel, "Simpan & uji koneksi").click()
  await panel.waitForSelector("::-p-text(API key tidak dikenali OpenRouter)")
  check("wrong key rejected with friendly message", true)
  await panel.$eval("[data-api-key-input]", (el) => (el.value = ""))
  await panel.type("[data-api-key-input]", TEST_KEY)
  await text(panel, "Simpan & uji koneksi").click()
  await panel.waitForSelector("::-p-text(Mau cari apa?)", { timeout: 8000 })
  check("valid key saved → compose view", true)

  const bodyType = await panel.evaluate(() => `${getComputedStyle(document.body).fontSize} ${getComputedStyle(document.body).fontFamily.split(",")[0]}`)
  check("body type survives Chrome's injected CSS", bodyType === '14px "Inter Variable"', bodyType)

  await panel.screenshot({ path: `${SHOTS}/0-tulis.png` })
  await panel.type("textarea", "sepatu lari ringan di bawah 500 ribu")
  await text(panel, "Mulai Pencarian").click()
  await panel.waitForSelector("::-p-text(Ini yang Jev tangkap)", { timeout: 8000 })
  const marks = await panel.$$eval("mark", (m) => m.map((x) => x.textContent))
  check("LLM criteria + Insight Lens marks", marks.length === 3, marks.join(" | "))
  await panel.screenshot({ path: `${SHOTS}/1-kriteria.png` })

  await panel.click("textarea", { offset: { x: 300, y: 10 } })
  await panel.keyboard.press("End")
  await panel.keyboard.type(", warna hitam")
  await panel.waitForSelector("::-p-text(Keinginan berubah)")
  await panel.locator("::-p-aria(Perbarui kriteria)").click()
  await panel.waitForSelector("::-p-text(Hitam)", { timeout: 8000 })
  check("edit desire → stale → Perbarui kriteria", true)

  await text(panel, "Cari di Tokopedia").click()
  const storeTarget = await browser.waitForTarget((t) => t.url().startsWith("https://www.tokopedia.com/search"), { timeout: 8000 })
  check("search opens store tab", Boolean(storeTarget), storeTarget?.url())
  const store = await storeTarget.asPage()
  watch(store, "store")
  await store.setViewport({ width: 1100, height: 900 })

  const labeled = await until(
    () => store.$$eval("[data-jev-verdict]", (els) => {
      const done = els.filter((e) => e.dataset.jevVerdict === "cocok" || e.dataset.jevVerdict === "tidak_cocok")
      return done.length >= 10 ? done.map((e) => e.dataset.jevVerdict) : false
    }),
    15000,
  )
  const cocok = Array.isArray(labeled) ? labeled.filter((v) => v === "cocok").length : 0
  check("labels injected on all cards (incl. lazy-loaded)", Array.isArray(labeled), `${labeled?.length ?? 0} cards, ${cocok} cocok`)
  const shadowBadge = await store.$eval('[data-jev-ui="badge"]', (h) => h.shadowRoot?.textContent ?? "")
  check("badge rendered in shadow DOM", /Cocok|Tidak cocok/.test(shadowBadge), shadowBadge.trim())
  await store.screenshot({ path: `${SHOTS}/2-store-labels.png` })

  await panel.waitForSelector("::-p-text(Hasil di Tokopedia)")
  // Filter counts: [Cocok, Semua, Tidak].
  const counts = await until(() =>
    panel.$$eval('[aria-label="Saring hasil"] button', (b) => {
      const n = b.map((x) => x.textContent.replace(/\D/g, ""))
      return n.length === 3 && n[1] !== "0" ? n : false
    }),
  )
  check("side panel results summary", Array.isArray(counts) && counts[0] === String(cocok), counts?.join("/"))
  await panel.screenshot({ path: `${SHOTS}/3-panel-hasil.png`, fullPage: true })

  await tap(panel, 'button[title="Tunjukkan di halaman toko"]')
  const active = await until(() => store.$("[data-jev-active='true']"), 4000)
  check("Lihat di halaman → card highlighted in tab", Boolean(active))

  await tap(panel, '[aria-label="Urutkan halaman: cocok dulu"]')
  const ordered = await until(() => store.$$eval(".item", (items) => items.some((i) => i.style.order !== "")), 4000)
  check("sort page uses CSS order", Boolean(ordered))

  await tap(panel, 'button[aria-label^="Buka produk"]')
  await until(() => store.url().includes("/toko-"), 6000)
  const chip = await until(() => store.$eval('[data-jev-ui="chip"]', (h) => (/menurut Jev/.test(h.shadowRoot?.textContent ?? "") ? h.shadowRoot.textContent : false)), 10000)
  check("detail page chip", Boolean(chip), chip)
  await panel.waitForSelector("::-p-text(Dibanding keinginanmu)", { timeout: 8000 })
  check("side panel follows to detail view", true)
  await panel.screenshot({ path: `${SHOTS}/4-panel-detail.png`, fullPage: true })
  await store.screenshot({ path: `${SHOTS}/5-store-detail.png` })

  await tap(panel, "::-p-text(Bobot: Ringan)")
  await sleep(500)
  check("Lihat on a check scrolls/highlights evidence (no errors)", true)

  await tap(panel, '[role="switch"][aria-label="Jev"]')
  const cleared = await until(() => store.$('[data-jev-ui="chip"]').then((n) => !n), 4000)
  check("Jev off removes page overlay", Boolean(cleared))
  await tap(panel, '[role="switch"][aria-label="Jev"]')

  const options = await browser.newPage()
  watch(options, "options")
  await options.goto(`chrome-extension://${id}/src/options/index.html#/riwayat`)
  await options.waitForSelector("::-p-text(sepatu lari ringan di bawah 500 ribu, warna hitam)", { timeout: 5000 })
  check("riwayat lists the search from IndexedDB", true)
  await options.goto(`chrome-extension://${id}/src/options/index.html#/pengaturan`)
  await options.waitForSelector("::-p-text(Tersimpan)")
  await text(options, "Uji koneksi").click()
  await options.waitForSelector("::-p-text(Terhubung. Key bisa dipakai.)", { timeout: 5000 })
  check("pengaturan: saved key + Uji koneksi", true)

  check("AI calls made", mock.calls.includes("pemahaman_keinginan") && mock.calls.includes("label_etalase") && mock.calls.includes("konfirmasi_detail"), mock.calls.join(","))
  const relevant = problems.filter((p) => !/favicon|404/.test(p))
  check("no console errors", relevant.length === 0, relevant.join(" | "))
} catch (error) {
  check("smoke test finished", false, error.message)
} finally {
  await browser.close()
  mock.server.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed · screenshots in ${SHOTS}`)
process.exit(failed.length ? 1 : 0)

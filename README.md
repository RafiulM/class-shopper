# Jev — Pilih Produk (UI, data dummy)

Chrome Extension (Manifest V3) sesuai `jev-pilih-produk-PRD.md`: React + TypeScript + Vite, Tailwind CSS v4 + shadcn/ui.
Tahap ini **hanya UI**: semua data dan proses AI/penyimpanan masih dummy.

## Menjalankan

```bash
npm install
npm run dev      # buka http://localhost:5173 untuk daftar semua layar
npm run build    # hasil di dist/, muat lewat chrome://extensions → Load unpacked
npm run lint
npm run test:ext # build + muat dist/ sebagai extension di Chrome for Testing, klik semua layar
```

`test:ext` memakai Puppeteer (mengunduh Chrome for Testing saat `npm install`). Screenshot tersimpan di
`/tmp/jev-ext-shots` (ubah lewat `SHOTS_DIR`).

## Struktur

| Folder | Isi |
| --- | --- |
| `src/popup/` | Popup 400×600: Panel Keinginan → Pemahaman Keinginan → status Cari Otomatis |
| `src/options/` | Halaman opsi: `#/riwayat` (Riwayat Keinginan) dan `#/pengaturan` (Kendali, Preferensi, API key, Bantuan) |
| `src/welcome/` | Tab sambutan saat pertama dipasang (API key → tur → siap) |
| `src/content/` | UI yang nanti disuntikkan content script: bar hasil, label produk, panel konfirmasi detail |
| `src/preview/` | Toko tiruan khusus dev untuk melihat UI content script (`#/hasil`, `#/detail`) |
| `src/background/` | Service worker: sementara hanya membuka tab sambutan saat install |
| `src/components/jev/` | Komponen Jev yang dipakai ulang (tag, label verdict, Insight Lens, switch, form API key) |
| `src/components/ui/` | Komponen shadcn/ui |
| `src/lib/types.ts` | Tipe domain, mengikuti model data PRD |

## Bagian dummy (ganti saat implementasi nyata)

- `src/lib/dummy-api.ts` — semua "panggilan" (pahami keinginan, cari & nilai, cek ulang, uji key) memakai jeda tetap. Ganti dengan pesan ke background service worker (OpenRouter).
- `src/lib/dummy/*` — contoh keinginan, produk, riwayat, dan pengaturan awal.
- Validasi key prototipe: key berawalan `sk-or-` dianggap valid.
- Pengaturan tidak disimpan (belum ada `chrome.storage` / IndexedDB), manifest belum punya `host_permissions` maupun content script.

## Desain

Token "Signal Lens" dari prototipe DesainPakeAI dipetakan ke peran shadcn di `src/index.css`
(`primary`, `muted`, `border`, …) plus peran tambahan: `lens` (sorotan biru Insight Lens),
`primary-strong`, `positive`, `warning`. Tema hanya terang. Font Inter & Inter Tight di-bundle
lewat Fontsource (tanpa CDN).

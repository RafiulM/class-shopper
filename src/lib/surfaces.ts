// Links between extension pages. Every page lives under src/<surface>/index.html in
// the built extension, so relative URLs work from any of them.
export const SURFACE_URL = {
  riwayat: "../options/index.html#/riwayat",
  pengaturan: "../options/index.html#/pengaturan",
  welcome: "../welcome/index.html",
} as const

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"

/** Mounts one extension surface (popup, options, welcome, preview) into #root. */
export function mount(node: React.ReactNode) {
  const root = document.getElementById("root")
  if (!root) throw new Error("Missing #root element")
  createRoot(root).render(<StrictMode>{node}</StrictMode>)
}

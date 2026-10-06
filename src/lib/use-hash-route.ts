import { useEffect, useState } from "react"

function readRoute<T extends string>(routes: readonly T[], fallback: T): T {
  const route = window.location.hash.replace(/^#\/?/, "") as T
  return routes.includes(route) ? route : fallback
}

/**
 * Minimal hash router for multi-view extension pages (#/riwayat, #/pengaturan, …).
 * Pass module-level constants so the listener is registered once.
 */
export function useHashRoute<T extends string>(routes: readonly T[], fallback: T): T {
  const [route, setRoute] = useState<T>(() => readRoute(routes, fallback))

  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute(routes, fallback))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [routes, fallback])

  return route
}

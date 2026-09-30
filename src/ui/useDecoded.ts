import { useEffect, useState } from 'react'

/**
 * The most recent URL the browser has fully decoded. A new URL is decoded off the paint path first, so
 * swapping a large image never shows a half-drawn or blank frame; until then the previous value stays.
 */
export function useDecoded(url: string | null): string | null {
  const [decoded, setDecoded] = useState<string | null>(null)
  useEffect(() => {
    if (!url) return
    let live = true
    const img = new Image()
    img.src = url
    const done = () => {
      if (live) setDecoded(url)
    }
    img.decode().then(done, done)
    return () => {
      live = false
    }
  }, [url])
  return decoded
}

/* Neighbouring proofs decoded ahead of time so arrow-key browsing lands on ready pixels. */
const PRELOAD_LIMIT = 6
const preloaded = new Map<string, HTMLImageElement>()

export function preload(urls: ReadonlyArray<string | null>) {
  for (const url of urls) {
    if (!url || preloaded.has(url)) continue
    const img = new Image()
    img.src = url
    img.decode().catch(() => preloaded.delete(url))
    preloaded.set(url, img)
    if (preloaded.size > PRELOAD_LIMIT) preloaded.delete(preloaded.keys().next().value!)
  }
}

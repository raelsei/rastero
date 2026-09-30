import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Relative base: every URL in the build resolves against the page, so the same build works at a domain
 * root or under any path GitHub Pages gives the repository (koray.dev/rastero/) without naming it here.
 */
const BASE = './'

// Codec packages locate their .wasm via `new URL(…, import.meta.url)`; pre-bundling would break those URLs.
const WASM_PACKAGES = [
  '@jsquash/avif',
  '@jsquash/jpeg',
  '@jsquash/jxl',
  '@jsquash/oxipng',
  '@jsquash/png',
  '@jsquash/webp',
  'libheif-js',
  'libimagequant-wasm',
]

/**
 * GitHub Pages cannot send response headers, so production pages carry their Content Security Policy as a
 * meta tag. connect-src 'self' is what makes "nothing leaves your device" enforceable. (frame-ancestors is
 * ignored in meta tags, so it is omitted.) Dev skips it so Vite's inline HMR preamble keeps working.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "img-src 'self' blob: data:",
  "style-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'rastero-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  }
}

/**
 * Emits sw.js: the app shell (entry JS/CSS, latin fonts, icons) is precached so the app opens offline;
 * codec chunks and wasm are cached the first time they are used. URLs are relative to the worker's scope.
 */
function serviceWorker(): Plugin {
  return {
    name: 'rastero-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const shell = ['./', './favicon.svg', './manifest.webmanifest', './icons/icon-192.png']
      for (const file of Object.values(bundle)) {
        const entryChunk = file.type === 'chunk' && file.isEntry
        const entryCss = file.type === 'asset' && file.fileName.endsWith('.css')
        const latinFont = file.type === 'asset' && /inter-latin-wght-normal.*\.woff2$/.test(file.fileName)
        if (entryChunk || entryCss || latinFont) shell.push(`./${file.fileName}`)
      }
      const version = createHash('sha256').update(shell.join('\n')).digest('hex').slice(0, 12)
      const source = readFileSync(new URL('./sw/service-worker.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version)
        .replace('__SHELL__', JSON.stringify(shell))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), contentSecurityPolicy(), serviceWorker()],
  optimizeDeps: { exclude: WASM_PACKAGES },
  worker: { format: 'es' },
})

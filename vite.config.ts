import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PACKAGE = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
/** The repository this build is made from, so a fork's app and notices point at the fork. */
const SOURCE_URL = String(PACKAGE.repository.url).replace(/^git\+/, '').replace(/\.git$/, '')

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

/** Finds a dependency the way Node does: the nearest node_modules walking up from its dependent. */
function packageDir(name: string, from: string): string {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    if (dir === dirname(dir)) throw new Error(`license notices: ${name} is not installed (needed by ${from})`)
  }
}

/** LICENSE / COPYING / NOTICE files a package ships, including jSquash's codec/LICENSE.codec.md. */
function noticeFiles(dir: string, depth = 0): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && depth < 2) found.push(...noticeFiles(path, depth + 1))
    } else if (/^(licen[cs]e|copying|notice)\b/i.test(entry.name) && !/\.([cm]?js|ts|json|css|wasm)$/.test(entry.name)) {
      found.push(path)
    }
  }
  return found.sort()
}

/**
 * licenses.txt: Rastero's GPL notice, then every production dependency (walked transitively) with the license
 * files it ships, then the upstream codec libraries compiled into those packages' wasm (licenses/*.txt, which
 * the packages don't ship themselves), then the GPL text. Identical texts are printed once.
 */
function licenseNotices(): string {
  const packages = new Map<string, { name: string; version: string; license: string }>()
  const visit = (deps: Record<string, string> | undefined, from: string) => {
    for (const name of Object.keys(deps ?? {})) {
      const dir = packageDir(name, from)
      if (packages.has(dir)) continue
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      packages.set(dir, { name, version: pkg.version, license: pkg.license ?? 'see license file' })
      visit(pkg.dependencies, dir)
    }
  }
  visit(PACKAGE.dependencies, ROOT)
  const sorted = [...packages].sort(([, a], [, b]) => a.name.localeCompare(b.name))
  const upstream = readdirSync(join(ROOT, 'licenses')).filter((f) => f.endsWith('.txt')).sort()

  const rule = '='.repeat(78)
  const printed = new Map<string, string>()
  const section = (title: string, text: string) => {
    const hash = createHash('sha256').update(text.trim()).digest('hex')
    const first = printed.get(hash)
    if (!first) printed.set(hash, title)
    return `${rule}\n${title}\n${rule}\n\n${first ? `Same text as ${first} above.` : text.trim()}\n\n`
  }

  let out = `Rastero
Copyright (C) 2026 Koray Guler

Rastero is free software: you can redistribute it and/or modify it under the terms of the GNU General
Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
option) any later version. It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
General Public License, printed at the end of this file, for more details.

Complete source code: ${SOURCE_URL}

This build includes the third-party software below, each under its own license.

Packages:
${sorted.map(([, p]) => `  ${p.name} ${p.version} (${p.license})`).join('\n')}

Codec libraries compiled into those packages:
${upstream.map((f) => `  ${readFileSync(join(ROOT, 'licenses', f), 'utf8').split('\n')[0]}`).join('\n')}

`
  for (const [dir, p] of sorted) {
    for (const file of noticeFiles(dir)) {
      out += section(`${p.name} ${p.version}: ${relative(dir, file)}`, readFileSync(file, 'utf8'))
    }
  }
  for (const f of upstream) {
    const [title, ...text] = readFileSync(join(ROOT, 'licenses', f), 'utf8').split('\n')
    out += section(title, text.join('\n'))
  }
  return out + section('GNU General Public License v3 (Rastero, libimagequant)', readFileSync(join(ROOT, 'LICENSE'), 'utf8'))
}

/** Serves licenses.txt in dev and emits it with the build, where the app links to it. */
function licenses(): Plugin {
  return {
    name: 'rastero-licenses',
    configureServer(server) {
      server.middlewares.use('/licenses.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(licenseNotices())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: licenseNotices() })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), contentSecurityPolicy(), serviceWorker(), licenses()],
  define: { __SOURCE_URL__: JSON.stringify(SOURCE_URL) },
  optimizeDeps: { exclude: WASM_PACKAGES },
  worker: { format: 'es' },
})

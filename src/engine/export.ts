import { downloadZip as makeZipResponse } from 'client-zip'

export interface ExportEntry {
  path: string
  blob: Blob
  lastModified?: Date
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<FileSystemDirectoryHandle>
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  // The download has started reading the URL by the next task; give slow browsers a margin.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Segments safe for zip entries and real filesystems: no '..', '.', empty or reserved characters. */
function sanitizeSegments(path: string): string[] {
  const segments = path
    .split(/[/\\]+/)
    .map((seg) =>
      seg
        // Control characters are invalid in Windows filenames and zip readers; replacing them is the point.
        // oxlint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f<>:"|?*]/g, '_')
        .replace(/[. ]+$/, '')
        .trim(),
    )
    .filter((seg) => seg !== '' && seg !== '.' && seg !== '..')
  return segments.length > 0 ? segments : ['file']
}

function prepare(entries: ExportEntry[]): ExportEntry[] {
  return dedupePaths(entries.map((e) => ({ ...e, path: sanitizeSegments(e.path).join('/') })))
}

/** Stored (uncompressed) zip; image payloads are already compressed. Paths keep the folder tree. */
export async function downloadZip(entries: ExportEntry[], zipName: string): Promise<void> {
  const files = prepare(entries).map((e) => ({ name: e.path, input: e.blob, lastModified: e.lastModified }))
  const blob = await makeZipResponse(files).blob()
  downloadBlob(blob, /\.zip$/i.test(zipName) ? zipName : `${zipName}.zip`)
}

export const canSaveToDirectory: boolean = typeof window !== 'undefined' && 'showDirectoryPicker' in window

/** Writes entries under a user-picked directory, creating nested folders. null if the picker is cancelled. */
export async function saveToDirectory(entries: ExportEntry[]): Promise<{ written: number } | null> {
  const picker = window.showDirectoryPicker
  if (!picker) throw new Error('Saving to a folder is not supported in this browser')
  let root: FileSystemDirectoryHandle
  try {
    root = await picker({ mode: 'readwrite', id: 'rastero-export' })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null
    throw err
  }
  const dirs = new Map<string, Promise<FileSystemDirectoryHandle>>([['', Promise.resolve(root)]])
  const dirFor = (segments: string[]): Promise<FileSystemDirectoryHandle> => {
    const key = segments.join('/')
    let handle = dirs.get(key)
    if (!handle) {
      handle = dirFor(segments.slice(0, -1)).then((parent) =>
        parent.getDirectoryHandle(segments[segments.length - 1], { create: true }),
      )
      dirs.set(key, handle)
    }
    return handle
  }
  let written = 0
  for (const entry of prepare(entries)) {
    const segments = entry.path.split('/')
    const name = segments.pop() as string
    const dir = await dirFor(segments)
    const fileHandle = await dir.getFileHandle(name, { create: true })
    const writable = await fileHandle.createWritable()
    try {
      await writable.write(entry.blob)
      await writable.close()
    } catch (err) {
      await writable.abort().catch(() => {})
      throw err
    }
    written++
  }
  return { written }
}

/** Same path twice -> 'name (2).ext', 'name (3).ext', … Case-insensitive, never steals an existing path. */
export function dedupePaths(entries: ExportEntry[]): ExportEntry[] {
  const original = new Set(entries.map((e) => e.path.toLowerCase()))
  const taken = new Set<string>()
  return entries.map((entry) => {
    const key = entry.path.toLowerCase()
    if (!taken.has(key)) {
      taken.add(key)
      return entry
    }
    const slash = entry.path.lastIndexOf('/')
    const dot = entry.path.lastIndexOf('.')
    const splitAt = dot > slash + 1 ? dot : entry.path.length
    const stem = entry.path.slice(0, splitAt)
    const ext = entry.path.slice(splitAt)
    for (let n = 2; ; n++) {
      const candidate = `${stem} (${n})${ext}`
      const candidateKey = candidate.toLowerCase()
      if (taken.has(candidateKey) || original.has(candidateKey)) continue
      taken.add(candidateKey)
      return { ...entry, path: candidate }
    }
  })
}

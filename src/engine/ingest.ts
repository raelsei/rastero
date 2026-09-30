import { sniffFile, type SourceType } from './sniff'

export interface IngestedFile {
  file: File
  relativePath: string
  sourceType: SourceType
}

export interface IngestResult {
  files: IngestedFile[]
  /** Relative paths of non-image / unsupported / unreadable files. Dotfiles are ignored silently. */
  skipped: string[]
}

interface Candidate {
  /** null when the entry could not be read (permissions, vanished file). */
  file: File | null
  relativePath: string
}

async function classify(candidates: Candidate[]): Promise<IngestResult> {
  const visible = candidates.filter((c) => !c.relativePath.split('/').some((seg) => seg.startsWith('.')))
  const types = await Promise.all(visible.map((c) => (c.file ? sniffFile(c.file).catch(() => null) : null)))
  const files: IngestedFile[] = []
  const skipped: string[] = []
  visible.forEach((c, i) => {
    const sourceType = types[i]
    if (c.file && sourceType) files.push({ file: c.file, relativePath: c.relativePath, sourceType })
    else skipped.push(c.relativePath)
  })
  return { files, skipped }
}

/** Folder inputs carry webkitRelativePath ('shots/a/photo.jpg'); plain file inputs fall back to the name. */
export function fromFileList(list: FileList | File[]): Promise<IngestResult> {
  return classify(Array.from(list, (file) => ({ file, relativePath: file.webkitRelativePath || file.name })))
}

async function readAllEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader()
  const all: FileSystemEntry[] = []
  // readEntries returns batches (Chromium: 100 at a time); an empty batch means done.
  for (;;) {
    const { promise, resolve, reject } = Promise.withResolvers<FileSystemEntry[]>()
    reader.readEntries(resolve, reject)
    const batch = await promise
    if (batch.length === 0) return all
    all.push(...batch)
  }
}

async function walk(entry: FileSystemEntry, out: Candidate[]): Promise<void> {
  const relativePath = entry.fullPath.replace(/^\/+/, '') || entry.name
  if (entry.isDirectory) {
    // Hidden directories (.git, …) are not descended; hidden files are dropped in classify.
    if (entry.name.startsWith('.')) return
    const children = await readAllEntries(entry as FileSystemDirectoryEntry).catch(() => [])
    await Promise.all(children.map((child) => walk(child, out)))
    return
  }
  if (!entry.isFile) return
  const { promise, resolve, reject } = Promise.withResolvers<File>()
  ;(entry as FileSystemFileEntry).file(resolve, reject)
  out.push({ file: await promise.catch(() => null), relativePath })
}

/**
 * Drop handler input. DataTransfer items are only readable during the event dispatch,
 * so entries and fallback files are captured synchronously before the first await.
 */
export async function fromDataTransfer(dt: DataTransfer): Promise<IngestResult> {
  const entries: FileSystemEntry[] = []
  const looseFiles: File[] = []
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== 'file') continue
    const entry = item.webkitGetAsEntry?.()
    if (entry) {
      entries.push(entry)
      continue
    }
    const file = item.getAsFile()
    if (file) looseFiles.push(file)
  }
  if (entries.length === 0 && looseFiles.length === 0) looseFiles.push(...Array.from(dt.files))

  const walked: Candidate[] = []
  await Promise.all(entries.map((entry) => walk(entry, walked)))
  walked.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }))
  return classify([...looseFiles.map((file) => ({ file, relativePath: file.name })), ...walked])
}

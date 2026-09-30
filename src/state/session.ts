import { create } from 'zustand'
import { getFormat, outputPath, tierSpecs, variantKey, type FormatId, type VariantSpec } from '../engine/formats'
import type { IngestResult } from '../engine/ingest'
import type { SourceType } from '../engine/sniff'
import { CodecPool } from '../engine/pool'
import { canSaveToDirectory, downloadBlob, downloadZip, saveToDirectory, type ExportEntry } from '../engine/export'
import { currentPick, formatVariant } from './pick'
import {
  clearSaved,
  deleteImage,
  deleteVariants,
  loadSaved,
  saveImage,
  saveMeta,
  saveVariant,
  type SavedImage,
  type SavedMeta,
  type SavedProbe,
  type SavedSession,
} from './persist'
import { useSettings } from './settings'
import { ORIGINAL, type ExportContent, type ImageEntry, type Variant, type VariantTier, type View } from './types'

interface SessionState {
  images: Record<string, ImageEntry>
  order: string[]
  selectedId: string | null
  view: View
  notice: { id: number; text: string } | null
  busy: { encoding: number; queued: number }
  exporting: boolean
  /** False until the saved session (if any) has been read back, so the empty state never flashes. */
  restored: boolean
}

export const useSession = create<SessionState>()(() => ({
  images: {},
  order: [],
  selectedId: null,
  view: 'stage',
  notice: null,
  busy: { encoding: 0, queued: 0 },
  exporting: false,
  restored: false,
}))

/* Job priorities: higher runs first. The selected image jumps ahead of the batch. */
const PRIORITY = { probe: 30, balanced: 10, tier: 5, selectedBoost: 20, tuned: 60 } as const

const pool = new CodecPool()
pool.onActivity = (encoding, queued) => useSession.setState({ busy: { encoding, queued } })

interface Job {
  controller: AbortController
  started: boolean
}
/** Live encode jobs by `${imageId}|${variantKey}`. */
const jobs = new Map<string, Job>()
let nextImageId = 1
let nextNoticeId = 1

function patchImage(id: string, update: (image: ImageEntry) => ImageEntry) {
  useSession.setState((s) => {
    const image = s.images[id]
    return image ? { images: { ...s.images, [id]: update(image) } } : {}
  })
}

function patchVariant(id: string, key: string, update: Partial<Variant>) {
  patchImage(id, (image) => {
    const variant = image.variants[key]
    return variant ? { ...image, variants: { ...image.variants, [key]: { ...variant, ...update } } } : image
  })
}

function revokeVariant(v: Variant) {
  if (v.viewUrl) URL.revokeObjectURL(v.viewUrl)
  if (v.patchUrl) URL.revokeObjectURL(v.patchUrl)
}

export function notify(text: string) {
  useSession.setState({ notice: { id: nextNoticeId++, text } })
}

let storageWarned = false

/** Saving is best effort: the session keeps working in memory, and the user hears once if it can't be kept. */
function persist(task: Promise<void>) {
  task.catch((error: unknown) => {
    console.warn('Rastero: saving the session failed', error)
    if (storageWarned) return
    storageWarned = true
    const full = error instanceof DOMException && error.name === 'QuotaExceededError'
    notify(
      full
        ? 'Browser storage is full: some images or results will not survive a reload'
        : 'This browser cannot keep your images across reloads',
    )
  })
}

function savedImage(image: ImageEntry, probe: SavedProbe | null): SavedImage {
  return {
    id: image.id,
    name: image.name,
    relativePath: image.relativePath,
    folder: image.folder,
    file: image.file,
    sourceType: image.sourceType,
    status: image.status,
    error: image.error,
    probe,
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Unknown error'
}

function priorityFor(imageId: string, tier: VariantTier): number {
  const base = tier === 'tuned' ? PRIORITY.tuned : tier === 'balanced' || tier === null ? PRIORITY.balanced : PRIORITY.tier
  return base + (useSession.getState().selectedId === imageId ? PRIORITY.selectedBoost : 0)
}

function runEncode(image: ImageEntry, key: string, spec: VariantSpec, tier: VariantTier) {
  const jobKey = `${image.id}|${key}`
  jobs.get(jobKey)?.controller.abort()
  const job: Job = { controller: new AbortController(), started: false }
  jobs.set(jobKey, job)
  pool
    .encode(image.id, image.file, spec, {
      priority: priorityFor(image.id, tier),
      signal: job.controller.signal,
      onStart: () => {
        job.started = true
        patchVariant(image.id, key, { status: 'encoding' })
      },
    })
    .then((result) => {
      if (jobs.get(jobKey) !== job) return
      // The image or this result may have been removed while it encoded; never resurrect it in storage.
      if (!useSession.getState().images[image.id]?.variants[key]) return
      const encodedUrl = URL.createObjectURL(result.previewBlob ?? result.blob)
      patchVariant(image.id, key, {
        status: 'done',
        bytes: result.bytes,
        ms: result.ms,
        blob: result.blob,
        viewUrl: encodedUrl,
        patchUrl: URL.createObjectURL(result.patchBlob),
        error: null,
      })
      persist(
        saveVariant({
          id: jobKey,
          imageId: image.id,
          key,
          spec,
          tier,
          status: 'done',
          bytes: result.bytes,
          ms: result.ms,
          blob: result.blob,
          previewBlob: result.previewBlob,
          patchBlob: result.patchBlob,
        }),
      )
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (jobs.get(jobKey) !== job) return
      patchVariant(image.id, key, { status: 'error', error: describeError(error) })
    })
    .finally(() => {
      if (jobs.get(jobKey) === job) jobs.delete(jobKey)
    })
}

function newVariant(spec: VariantSpec, tier: VariantTier): Variant {
  return {
    key: variantKey(spec),
    spec,
    tier,
    status: 'queued',
    bytes: null,
    ms: null,
    blob: null,
    viewUrl: null,
    patchUrl: null,
    error: null,
  }
}

/** Adds tier variants for every enabled format the image does not have yet and queues their encodes. */
function ensureTiers(id: string) {
  const image = useSession.getState().images[id]
  if (!image || image.status === 'error') return
  const added: Variant[] = []
  for (const spec of tierSpecs(useSettings.getState().enabled)) {
    const key = variantKey(spec)
    if (image.variants[key]) continue
    added.push(newVariant({ format: spec.format, quality: spec.quality }, spec.tier))
  }
  if (added.length === 0) return
  patchImage(id, (img) => ({ ...img, variants: { ...img.variants, ...Object.fromEntries(added.map((v) => [v.key, v])) } }))
  for (const v of added) runEncode(image, v.key, v.spec, v.tier)
}

/** Sources every browser can show in an <img> straight away; the rest wait for the probe's decoded PNG. */
const NATIVE_DISPLAY: Partial<Record<SourceType, true>> = { jpeg: true, png: true, gif: true, webp: true, avif: true, bmp: true }

export function addFiles({ files, skipped }: IngestResult) {
  if (skipped.length > 0) {
    notify(`${skipped.length} ${skipped.length === 1 ? 'file' : 'files'} skipped: not a supported image`)
  }
  if (files.length === 0) {
    if (skipped.length === 0) notify('No images found')
    return
  }
  const entries: ImageEntry[] = files.map(({ file, relativePath, sourceType }) => {
    const slash = relativePath.lastIndexOf('/')
    return {
      id: `img${nextImageId++}`,
      name: relativePath.slice(slash + 1),
      relativePath,
      folder: slash === -1 ? '' : relativePath.slice(0, slash),
      file,
      bytes: file.size,
      sourceType,
      status: 'probing',
      width: null,
      height: null,
      hasAlpha: false,
      originalUrl: NATIVE_DISPLAY[sourceType] ? URL.createObjectURL(file) : null,
      thumbUrl: null,
      patch: null,
      error: null,
      variants: {},
      pinned: null,
    }
  })
  useSession.setState((s) => ({
    images: { ...s.images, ...Object.fromEntries(entries.map((e) => [e.id, e])) },
    order: [...s.order, ...entries.map((e) => e.id)],
    selectedId: s.selectedId ?? entries[0].id,
  }))
  for (const entry of entries) {
    persist(saveImage(savedImage(entry, null)))
    startProbe(entry)
    ensureTiers(entry.id)
  }
}

/** Reads dimensions, alpha, thumbnail and the detail patch; an unreadable source becomes an error row. */
function startProbe(entry: ImageEntry) {
  pool
    .probe(entry.id, entry.file, { priority: PRIORITY.probe })
    .then((probe) => {
      if (!useSession.getState().images[entry.id]) return
      patchImage(entry.id, (image) => {
        if (probe.displayBlob && image.originalUrl) URL.revokeObjectURL(image.originalUrl)
        return {
          ...image,
          status: 'ready',
          width: probe.width,
          height: probe.height,
          hasAlpha: probe.hasAlpha,
          originalUrl: probe.displayBlob ? URL.createObjectURL(probe.displayBlob) : image.originalUrl,
          thumbUrl: URL.createObjectURL(probe.thumbBlob),
          patch: { url: URL.createObjectURL(probe.patch.blob), x: probe.patch.x, y: probe.patch.y, size: probe.patch.size },
        }
      })
      const saved: SavedProbe = {
        width: probe.width,
        height: probe.height,
        hasAlpha: probe.hasAlpha,
        displayBlob: probe.displayBlob,
        thumbBlob: probe.thumbBlob,
        patch: probe.patch,
      }
      persist(saveImage(savedImage(useSession.getState().images[entry.id], saved)))
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (!useSession.getState().images[entry.id]) return
      // An unreadable source has no results to wait for: drop its queued variants with the jobs.
      cancelJobs(entry.id)
      patchImage(entry.id, (image) => {
        for (const v of Object.values(image.variants)) revokeVariant(v)
        return { ...image, status: 'error', error: describeError(error), variants: {} }
      })
      persist(saveImage(savedImage(useSession.getState().images[entry.id], null)))
      persist(deleteVariants(entry.id))
    })
}

function cancelJobs(imageId: string) {
  for (const [jobKey, job] of jobs) {
    if (!jobKey.startsWith(`${imageId}|`)) continue
    job.controller.abort()
    jobs.delete(jobKey)
  }
}

function releaseImage(image: ImageEntry) {
  cancelJobs(image.id)
  for (const url of [image.originalUrl, image.thumbUrl, image.patch?.url]) if (url) URL.revokeObjectURL(url)
  for (const v of Object.values(image.variants)) revokeVariant(v)
}

export function removeImage(id: string) {
  const { images, order, selectedId } = useSession.getState()
  const image = images[id]
  if (!image) return
  releaseImage(image)
  const index = order.indexOf(id)
  const nextOrder = order.filter((x) => x !== id)
  const rest = { ...images }
  delete rest[id]
  useSession.setState({
    images: rest,
    order: nextOrder,
    selectedId: selectedId === id ? (nextOrder[Math.min(index, nextOrder.length - 1)] ?? null) : selectedId,
  })
  persist(deleteImage(id))
}

/** Empties the session and the saved copy of it. */
export function clearAll() {
  for (const image of Object.values(useSession.getState().images)) releaseImage(image)
  useSession.setState({ images: {}, order: [], selectedId: null, view: 'stage' })
  persist(clearSaved())
}

/** Selecting an image moves its not-yet-started encodes ahead of the batch. */
export function selectImage(id: string) {
  const state = useSession.getState()
  if (state.selectedId === id || !state.images[id]) return
  useSession.setState({ selectedId: id })
  const image = state.images[id]
  for (const v of Object.values(image.variants)) {
    const job = jobs.get(`${id}|${v.key}`)
    if (job && !job.started) runEncode(image, v.key, v.spec, v.tier)
  }
}

export function moveSelection(delta: number) {
  const { order, selectedId } = useSession.getState()
  if (order.length === 0) return
  const index = selectedId === null ? -1 : order.indexOf(selectedId)
  selectImage(order[Math.max(0, Math.min(order.length - 1, index + delta))])
}

export function setView(view: View) {
  useSession.setState({ view })
}

/** Sign off a result (or the original) for export. */
export function pin(id: string, key: string) {
  patchImage(id, (image) => ({ ...image, pinned: key }))
}

/** Re-encode one format of one image at a custom quality and sign it off. Matching a tier just picks that tier. */
export function tune(id: string, format: FormatId, quality: number) {
  const image = useSession.getState().images[id]
  if (!image || image.status === 'error') return
  const key = variantKey({ format, quality })
  const existing = image.variants[key]
  const previousTuned = Object.values(image.variants).find((v) => v.spec.format === format && v.tier === 'tuned')
  if (existing && existing.tier !== 'tuned') {
    dropTuned(id, previousTuned)
    pin(id, key)
    return
  }
  if (existing) {
    pin(id, key)
    return
  }
  dropTuned(id, previousTuned)
  const variant = newVariant({ format, quality }, 'tuned')
  patchImage(id, (img) => ({ ...img, pinned: key, variants: { ...img.variants, [key]: variant } }))
  // Stored as queued right away so a reload mid-encode re-runs the user's tuning instead of losing it.
  persist(
    saveVariant({
      id: `${id}|${key}`,
      imageId: id,
      key,
      spec: variant.spec,
      tier: 'tuned',
      status: 'queued',
      bytes: null,
      ms: null,
      blob: null,
      previewBlob: null,
      patchBlob: null,
    }),
  )
  runEncode(image, key, variant.spec, 'tuned')
}

function dropTuned(id: string, tuned: Variant | undefined) {
  if (!tuned) return
  jobs.get(`${id}|${tuned.key}`)?.controller.abort()
  jobs.delete(`${id}|${tuned.key}`)
  revokeVariant(tuned)
  patchImage(id, (image) => {
    const variants = { ...image.variants }
    delete variants[tuned.key]
    return { ...image, variants }
  })
  persist(deleteVariants(id, [tuned.key]))
}

/** Forget a tuned result and sign off the format's balanced tier instead. */
export function resetTune(id: string, format: FormatId) {
  const image = useSession.getState().images[id]
  if (!image) return
  dropTuned(id, Object.values(image.variants).find((v) => v.spec.format === format && v.tier === 'tuned'))
  const base = formatVariant(useSession.getState().images[id], format)
  patchImage(id, (img) => ({ ...img, pinned: base?.key ?? null }))
}

/**
 * Sign off one format and quality for every readable image, encoding it where that exact result does not
 * exist yet. Images with transparency skip formats that cannot keep it and hold their current pick.
 */
export function applyToAll(format: FormatId, quality: number | null) {
  const { images, order } = useSession.getState()
  const def = getFormat(format)
  const key = variantKey({ format, quality })
  let applied = 0
  let kept = 0
  for (const id of order) {
    const image = images[id]
    if (image.status === 'error') continue
    if (image.hasAlpha && !def.supportsAlpha) {
      kept++
      continue
    }
    if (image.variants[key] || quality === null) pin(id, key)
    else tune(id, format, quality)
    applied++
  }
  const name = quality === null ? def.label : `${def.label} q${quality}`
  notify(
    `${name} applied to ${applied} ${applied === 1 ? 'image' : 'images'}` +
      (kept > 0 ? ` · ${kept} with transparency kept their pick` : ''),
  )
}

/** Apply the enabled-format set: queue missing tiers, drop results of formats switched off. */
export function applyEnabledFormats(enabled: FormatId[]) {
  useSettings.getState().setEnabled(enabled)
  const on = new Set(enabled)
  for (const image of Object.values(useSession.getState().images)) {
    const dropped = Object.values(image.variants).filter((v) => !on.has(v.spec.format))
    if (dropped.length > 0) {
      for (const v of dropped) {
        jobs.get(`${image.id}|${v.key}`)?.controller.abort()
        jobs.delete(`${image.id}|${v.key}`)
        revokeVariant(v)
      }
      patchImage(image.id, (img) => {
        const variants = { ...img.variants }
        for (const v of dropped) delete variants[v.key]
        return { ...img, variants, pinned: img.pinned && variants[img.pinned] ? img.pinned : img.pinned === ORIGINAL ? ORIGINAL : null }
      })
      persist(deleteVariants(image.id, dropped.map((v) => v.key)))
    }
    ensureTiers(image.id)
  }
}

/* ---- Reload survival ---- */

function savedMeta(): SavedMeta {
  const { images, order, selectedId, view } = useSession.getState()
  const pinned: Record<string, string> = {}
  for (const id of order) if (images[id].pinned !== null) pinned[id] = images[id].pinned!
  return { order, selectedId, view, pinned }
}

/* Order, selection, view and sign-offs are written after changes settle (they change on every click). */
let metaTimer: number | undefined
let lastMeta = ''
useSession.subscribe((state, previous) => {
  if (!state.restored) return
  if (state.order === previous.order && state.selectedId === previous.selectedId && state.view === previous.view && state.images === previous.images) return
  window.clearTimeout(metaTimer)
  metaTimer = window.setTimeout(() => {
    const meta = savedMeta()
    const text = JSON.stringify(meta)
    if (text === lastMeta) return
    lastMeta = text
    persist(saveMeta(meta))
  }, 250)
})

/** Brings back the last session from this browser's storage; tiers that never finished are queued again. */
export async function restoreSession() {
  let saved: SavedSession | null = null
  try {
    saved = await loadSaved()
  } catch (error) {
    console.warn('Rastero: could not read the saved session', error)
  }
  if (!saved) {
    useSession.setState({ restored: true })
    return
  }
  const images: Record<string, ImageEntry> = {}
  for (const s of saved.images) {
    const variants: Record<string, Variant> = {}
    for (const v of saved.variants) {
      if (v.imageId !== s.id) continue
      const done = v.status === 'done' && v.blob !== null && v.patchBlob !== null
      variants[v.key] = {
        ...newVariant(v.spec, v.tier),
        ...(done && {
          status: 'done',
          bytes: v.bytes,
          ms: v.ms,
          blob: v.blob,
          viewUrl: URL.createObjectURL(v.previewBlob ?? v.blob!),
          patchUrl: URL.createObjectURL(v.patchBlob!),
        }),
      }
    }
    const probe = s.probe
    images[s.id] = {
      id: s.id,
      name: s.name,
      relativePath: s.relativePath,
      folder: s.folder,
      file: s.file,
      bytes: s.file.size,
      sourceType: s.sourceType,
      status: s.status,
      width: probe?.width ?? null,
      height: probe?.height ?? null,
      hasAlpha: probe?.hasAlpha ?? false,
      originalUrl: probe?.displayBlob
        ? URL.createObjectURL(probe.displayBlob)
        : NATIVE_DISPLAY[s.sourceType]
          ? URL.createObjectURL(s.file)
          : null,
      thumbUrl: probe ? URL.createObjectURL(probe.thumbBlob) : null,
      patch: probe ? { url: URL.createObjectURL(probe.patch.blob), x: probe.patch.x, y: probe.patch.y, size: probe.patch.size } : null,
      error: s.error,
      variants,
      pinned: saved.meta.pinned[s.id] ?? null,
    }
  }
  nextImageId = Math.max(nextImageId, ...saved.meta.order.map((id) => Number(id.slice(3)) + 1).filter(Number.isFinite))
  lastMeta = JSON.stringify(saved.meta)
  useSession.setState({
    images,
    order: saved.meta.order,
    selectedId: saved.meta.selectedId,
    view: saved.meta.view,
    restored: true,
  })
  const count = saved.meta.order.length
  notify(`Restored ${count} ${count === 1 ? 'image' : 'images'} from your last session`)
  for (const id of saved.meta.order) {
    const image = images[id]
    if (image.status === 'probing') startProbe(image)
    if (image.status === 'error') continue
    for (const v of Object.values(image.variants)) if (v.status === 'queued') runEncode(image, v.key, v.spec, v.tier)
    ensureTiers(id)
  }
}

export function downloadVariant(id: string, key: string) {
  const image = useSession.getState().images[id]
  if (!image) return
  if (key === ORIGINAL) {
    downloadBlob(image.file, image.name)
    return
  }
  const v = image.variants[key]
  if (!v?.blob) return
  downloadBlob(v.blob, outputPath(image.name, v.spec, { withQuality: v.spec.quality !== null }))
}

/** What an export would write right now, and how many images are still waiting on their result. */
export function exportPlan(content: ExportContent): { entries: ExportEntry[]; pending: number; failed: number } {
  const { images, order } = useSession.getState()
  const enabled = useSettings.getState().enabled
  const entries: ExportEntry[] = []
  let pending = 0
  let failed = 0
  for (const id of order) {
    const image = images[id]
    if (image.status === 'error') {
      failed++
      continue
    }
    const lastModified = new Date(image.file.lastModified)
    const key = content === 'picks' ? currentPick(image, enabled) : (formatVariant(image, content)?.key ?? null)
    if (key === ORIGINAL) {
      entries.push({ path: image.relativePath, blob: image.file, lastModified })
      continue
    }
    const v = key === null ? null : image.variants[key]
    if (v?.status === 'done' && v.blob) entries.push({ path: outputPath(image.relativePath, v.spec), blob: v.blob, lastModified })
    else if (v?.status === 'error') failed++
    else pending++
  }
  return { entries, pending, failed }
}

export async function runExport() {
  const { exportContent, exportDestination } = useSettings.getState()
  const { entries, pending, failed } = exportPlan(exportContent)
  if (entries.length === 0) {
    notify(pending > 0 ? 'Nothing to export yet: results are still encoding' : 'Nothing to export')
    return
  }
  useSession.setState({ exporting: true })
  try {
    if (exportDestination === 'folder' && canSaveToDirectory) {
      const result = await saveToDirectory(entries)
      if (result === null) return
      notify(`Saved ${result.written} ${result.written === 1 ? 'file' : 'files'}${skippedNote(pending, failed)}`)
    } else {
      await downloadZip(entries, zipName())
      notify(`Exported ${entries.length} ${entries.length === 1 ? 'file' : 'files'}${skippedNote(pending, failed)}`)
    }
  } catch (error) {
    notify(`Export failed: ${describeError(error)}`)
  } finally {
    useSession.setState({ exporting: false })
  }
}

function skippedNote(pending: number, failed: number): string {
  const parts = []
  if (pending > 0) parts.push(`${pending} still encoding`)
  if (failed > 0) parts.push(`${failed} failed`)
  return parts.length > 0 ? ` · ${parts.join(', ')} not included` : ''
}

function zipName(): string {
  const { images, order } = useSession.getState()
  const folders = new Set(order.map((id) => images[id].relativePath.split('/')[0]))
  const first = images[order[0]]
  const root = folders.size === 1 && first.folder !== '' ? first.relativePath.split('/')[0] : 'rastero'
  return `${root}-compressed.zip`
}

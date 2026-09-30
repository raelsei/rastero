import type { VariantSpec } from '../engine/formats'
import type { SourceType } from '../engine/sniff'
import type { View, VariantTier } from './types'

/**
 * The session survives reloads in this browser's IndexedDB: source files, probe output and finished
 * results are stored as Blobs, so a reload restores instantly without re-encoding. Nothing leaves the device.
 */

export interface SavedProbe {
  width: number
  height: number
  hasAlpha: boolean
  displayBlob: Blob | null
  thumbBlob: Blob
  patch: { blob: Blob; x: number; y: number; size: number }
}

export interface SavedImage {
  id: string
  name: string
  relativePath: string
  folder: string
  file: File
  sourceType: SourceType
  status: 'probing' | 'ready' | 'error'
  error: string | null
  probe: SavedProbe | null
}

export interface SavedVariant {
  /** `${imageId}|${key}` */
  id: string
  imageId: string
  key: string
  spec: VariantSpec
  tier: VariantTier
  /** 'queued' is stored only for tuned results, so a reload re-runs them; tiers are recreated anyway. */
  status: 'queued' | 'done'
  bytes: number | null
  ms: number | null
  blob: Blob | null
  previewBlob: Blob | null
  patchBlob: Blob | null
}

export interface SavedMeta {
  order: string[]
  selectedId: string | null
  view: View
  pinned: Record<string, string>
}

export interface SavedSession {
  meta: SavedMeta
  images: SavedImage[]
  variants: SavedVariant[]
}

const DB_NAME = 'rastero'
const DB_VERSION = 1
const META_KEY = 'session'

let dbPromise: Promise<IDBDatabase> | null = null

/** Settles with an IndexedDB request's result. */
function settle<T>(request: IDBRequest<T>): Promise<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>()
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
  return promise
}

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('images', { keyPath: 'id' })
      db.createObjectStore('variants', { keyPath: 'id' })
      db.createObjectStore('meta')
    }
    dbPromise = settle(request)
  }
  return dbPromise
}

/** Runs one read-write transaction and resolves when it commits. */
async function write(stores: string[], run: (tx: IDBTransaction) => void): Promise<void> {
  const db = await open()
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const tx = db.transaction(stores, 'readwrite')
  tx.oncomplete = () => resolve()
  tx.onerror = () => reject(tx.error)
  tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'))
  run(tx)
  return promise
}

/** Every key of an image's variants: `${imageId}|` up to the highest code unit. */
function variantRange(imageId: string): IDBKeyRange {
  return IDBKeyRange.bound(`${imageId}|`, `${imageId}|\uffff`)
}

export function saveImage(image: SavedImage): Promise<void> {
  return write(['images'], (tx) => tx.objectStore('images').put(image))
}

export function saveVariant(variant: SavedVariant): Promise<void> {
  return write(['variants'], (tx) => tx.objectStore('variants').put(variant))
}

export function deleteVariants(imageId: string, keys?: readonly string[]): Promise<void> {
  return write(['variants'], (tx) => {
    const store = tx.objectStore('variants')
    if (keys) for (const key of keys) store.delete(`${imageId}|${key}`)
    else store.delete(variantRange(imageId))
  })
}

export function deleteImage(imageId: string): Promise<void> {
  return write(['images', 'variants'], (tx) => {
    tx.objectStore('images').delete(imageId)
    tx.objectStore('variants').delete(variantRange(imageId))
  })
}

export function saveMeta(meta: SavedMeta): Promise<void> {
  return write(['meta'], (tx) => tx.objectStore('meta').put(meta, META_KEY))
}

export function clearSaved(): Promise<void> {
  return write(['images', 'variants', 'meta'], (tx) => {
    for (const name of ['images', 'variants', 'meta']) tx.objectStore(name).clear()
  })
}

/** The last session, or null when there is none. */
export async function loadSaved(): Promise<SavedSession | null> {
  const db = await open()
  const tx = db.transaction(['images', 'variants', 'meta'], 'readonly')
  const [images, variants, meta] = await Promise.all([
    settle(tx.objectStore('images').getAll()) as Promise<SavedImage[]>,
    settle(tx.objectStore('variants').getAll()) as Promise<SavedVariant[]>,
    settle(tx.objectStore('meta').get(META_KEY)) as Promise<SavedMeta | undefined>,
  ])
  if (images.length === 0) return null
  const known = new Set(images.map((i) => i.id))
  // Order comes from the meta record; images it does not list (written just before a reload) go last.
  const order = (meta?.order ?? []).filter((id) => known.has(id))
  for (const image of images) if (!order.includes(image.id)) order.push(image.id)
  return {
    meta: {
      order,
      selectedId: meta?.selectedId && known.has(meta.selectedId) ? meta.selectedId : order[0],
      view: meta?.view ?? 'stage',
      pinned: meta?.pinned ?? {},
    },
    images,
    variants: variants.filter((v) => known.has(v.imageId)),
  }
}

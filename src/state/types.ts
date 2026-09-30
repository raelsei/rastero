import type { FormatId, TierId, VariantSpec } from '../engine/formats'
import type { SourceType } from '../engine/sniff'

export type VariantStatus = 'queued' | 'encoding' | 'done' | 'error'

/** A tier result, or a user-tuned one that left its tier default. PNG lossless has no tier. */
export type VariantTier = TierId | 'tuned' | null

export interface Variant {
  key: string
  spec: VariantSpec
  tier: VariantTier
  status: VariantStatus
  bytes: number | null
  ms: number | null
  blob: Blob | null
  /** What an <img> shows: the encoded file, or a decoded PNG when the browser can't display the format. */
  viewUrl: string | null
  /** 1:1 detail crop of the decoded output. */
  patchUrl: string | null
  error: string | null
}

export interface ImageEntry {
  id: string
  name: string
  relativePath: string
  /** Folder part of relativePath ('' for loose files). */
  folder: string
  file: File
  bytes: number
  sourceType: SourceType
  status: 'probing' | 'ready' | 'error'
  width: number | null
  height: number | null
  hasAlpha: boolean
  originalUrl: string | null
  thumbUrl: string | null
  patch: { url: string; x: number; y: number; size: number } | null
  error: string | null
  variants: Record<string, Variant>
  /** Variant key the user signed off; null means the automatic pick applies. */
  pinned: string | null
}

/** The original file is itself a valid pick when no result beats it. */
export const ORIGINAL = 'original'

export type ExportContent = 'picks' | FormatId
export type ExportDestination = 'zip' | 'folder'
export type View = 'stage' | 'grid'

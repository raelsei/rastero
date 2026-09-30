import type { VariantSpec } from '../formats'

/** Edge of the square 1:1 detail crop in source pixels (clamped to the image's smaller dimension). */
export const PATCH_SIZE = 192

/** Square region in source pixel coordinates. */
export interface PatchRect {
  x: number
  y: number
  size: number
}

export interface ProbeResult {
  width: number
  height: number
  hasAlpha: boolean
  /** Set only when the browser could not decode the source natively (wasm fallback, e.g. HEIC on Chrome): a PNG for <img>. */
  displayBlob: Blob | null
  /** Always set: small list-row preview, longest edge ≤ 256 px; JPEG, or PNG when the image has alpha. */
  thumbBlob: Blob
  /** Deterministic detail crop of the ORIGINAL (same rect for every variant of this image), lossless PNG. */
  patch: PatchRect & { blob: Blob }
}

export interface EncodeResult {
  blob: Blob
  bytes: number
  width: number
  height: number
  /** Encode time in the worker (excludes source decode, preview and patch generation). */
  ms: number
  /** Set when the browser cannot decode the output natively (jxl on most browsers): wasm-decoded PNG showing the true artifacts. */
  previewBlob: Blob | null
  /** ProbeResult.patch's rect cropped from the DECODED output, lossless PNG. */
  patchBlob: Blob
}

export type WorkerRequest =
  | { id: number; kind: 'probe'; imageId: string; source: Blob }
  | { id: number; kind: 'encode'; imageId: string; source: Blob; spec: VariantSpec }

export type WorkerResponse =
  | { id: number; ok: true; result: ProbeResult | EncodeResult }
  | { id: number; ok: false; error: { name: string; message: string } }

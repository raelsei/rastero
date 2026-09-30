import { cropImageData, decodeSource, toPngBlob, toThumbBlob, type Decoded } from './decode'
import { encodeVariant, outputViews } from './encode'
import type { EncodeResult, ProbeResult, WorkerRequest, WorkerResponse } from './protocol'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage(message: WorkerResponse): void
}

/** Single-entry decoded-pixel cache (with its detail rect); the pool routes jobs for the same imageId here when it can. */
let cache: (Decoded & { imageId: string }) | null = null

async function decoded(imageId: string, source: Blob): Promise<Decoded> {
  if (cache?.imageId === imageId) return cache
  cache = null // release the previous image before allocating the next one
  const fresh = await decodeSource(source)
  cache = { ...fresh, imageId }
  return fresh
}

async function handle(req: WorkerRequest): Promise<ProbeResult | EncodeResult> {
  const { imageData, hasAlpha, native, patch } = await decoded(req.imageId, req.source)
  if (req.kind === 'probe') {
    const [displayBlob, thumbBlob, patchBlob] = await Promise.all([
      native ? null : toPngBlob(imageData),
      toThumbBlob(imageData, hasAlpha),
      toPngBlob(cropImageData(imageData, patch)),
    ])
    return {
      width: imageData.width,
      height: imageData.height,
      hasAlpha,
      displayBlob,
      thumbBlob,
      patch: { ...patch, blob: patchBlob },
    }
  }
  const start = performance.now()
  const blob = await encodeVariant(imageData, req.spec, hasAlpha)
  const ms = performance.now() - start
  const { previewBlob, patchBlob } = await outputViews(req.spec.format, blob, patch)
  return { blob, bytes: blob.size, width: imageData.width, height: imageData.height, ms, previewBlob, patchBlob }
}

scope.onmessage = (event) => {
  const req = event.data
  handle(req).then(
    (result) => scope.postMessage({ id: req.id, ok: true, result }),
    (err: unknown) => {
      const error =
        err instanceof Error ? { name: err.name, message: err.message } : { name: 'Error', message: String(err) }
      scope.postMessage({ id: req.id, ok: false, error })
    },
  )
}

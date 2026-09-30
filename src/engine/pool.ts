import type { VariantSpec } from './formats'
import type { EncodeResult, ProbeResult, WorkerRequest, WorkerResponse } from './worker/protocol'

export { PATCH_SIZE } from './worker/protocol'
export type { EncodeResult, PatchRect, ProbeResult } from './worker/protocol'

export interface JobOptions {
  /** Higher runs first; FIFO within a priority. */
  priority?: number
  /** Queued jobs are dropped; running jobs have their result discarded. Both reject with AbortError. */
  signal?: AbortSignal
  /** Called once when the job is dispatched to a worker (queued → running). Never called for jobs aborted while queued. */
  onStart?: () => void
}

type JobRequest = { kind: 'probe' } | { kind: 'encode'; spec: VariantSpec }

interface Job {
  id: number
  request: JobRequest
  imageId: string
  source: Blob
  priority: number
  settled: boolean
  onStart?: () => void
  resolve(value: ProbeResult | EncodeResult): void
  reject(reason: unknown): void
  cleanup(): void
}

interface Slot {
  worker: Worker
  job: Job | null
  /** imageId the worker has (or is about to have) in its decoded-pixel cache. */
  imageId: string | null
}

const abortError = () => new DOMException('The operation was aborted.', 'AbortError')

function defaultSize(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  return Math.min(8, Math.max(1, cores - 1))
}

/**
 * Pool of codec workers (single-threaded wasm each). Workers spawn lazily, decode sources themselves,
 * and keep one decoded image cached; the scheduler routes jobs to a worker already holding that image.
 */
export class CodecPool {
  readonly size: number
  onActivity?: (busyWorkers: number, queued: number) => void

  #slots: Slot[] = []
  /** Sorted by priority desc, then submission order. */
  #queue: Job[] = []
  #nextId = 1
  #disposed = false

  constructor(size?: number) {
    this.size = Math.max(1, Math.floor(size ?? defaultSize()))
  }

  probe(imageId: string, source: Blob, opts?: JobOptions): Promise<ProbeResult> {
    return this.#submit({ kind: 'probe' }, imageId, source, opts) as Promise<ProbeResult>
  }

  encode(imageId: string, source: Blob, spec: VariantSpec, opts?: JobOptions): Promise<EncodeResult> {
    return this.#submit({ kind: 'encode', spec }, imageId, source, opts) as Promise<EncodeResult>
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    const pending = [...this.#queue, ...this.#slots.flatMap((s) => (s.job ? [s.job] : []))]
    for (const slot of this.#slots) slot.worker.terminate()
    this.#slots = []
    this.#queue = []
    for (const job of pending) this.#settle(job, () => job.reject(abortError()))
    this.#notify()
  }

  #submit(request: JobRequest, imageId: string, source: Blob, opts?: JobOptions): Promise<ProbeResult | EncodeResult> {
    const signal = opts?.signal
    if (this.#disposed) return Promise.reject(abortError())
    if (signal?.aborted) return Promise.reject(abortError())

    const { promise, resolve, reject } = Promise.withResolvers<ProbeResult | EncodeResult>()
    const onAbort = () => {
      const index = this.#queue.indexOf(job)
      if (index !== -1) {
        this.#queue.splice(index, 1)
        this.#notify()
      }
      // A running job keeps its worker busy until the worker replies; the reply is then ignored.
      this.#settle(job, () => reject(abortError()))
    }
    const job: Job = {
      id: this.#nextId++,
      request,
      imageId,
      source,
      priority: opts?.priority ?? 0,
      settled: false,
      onStart: opts?.onStart,
      resolve,
      reject,
      cleanup: () => signal?.removeEventListener('abort', onAbort),
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    const at = this.#queue.findIndex((queued) => queued.priority < job.priority)
    this.#queue.splice(at === -1 ? this.#queue.length : at, 0, job)
    this.#pump()
    return promise
  }

  #settle(job: Job, finish: () => void): void {
    if (job.settled) return
    job.settled = true
    job.cleanup()
    finish()
  }

  #pump(): void {
    const started: Job[] = []
    while (this.#queue.length > 0) {
      const pick = this.#pick()
      if (!pick) break
      const [slot, job] = pick
      this.#queue.splice(this.#queue.indexOf(job), 1)
      slot.job = job
      slot.imageId = job.imageId
      const message: WorkerRequest =
        job.request.kind === 'probe'
          ? { id: job.id, kind: 'probe', imageId: job.imageId, source: job.source }
          : { id: job.id, kind: 'encode', imageId: job.imageId, source: job.source, spec: job.request.spec }
      slot.worker.postMessage(message)
      started.push(job)
    }
    this.#notify()
    // Callbacks run after scheduling state is consistent, so they may re-enter the pool (abort, submit).
    for (const job of started) {
      if (job.settled || !job.onStart) continue
      try {
        job.onStart()
      } catch (err) {
        reportError(err)
      }
    }
  }

  /** Choose the next (worker, job) pair among top-priority jobs, or null when no worker can take one. */
  #pick(): [Slot, Job] | null {
    const top = this.#queue[0].priority
    const candidates = this.#queue.filter((job) => job.priority === top)
    const idle = this.#slots.filter((slot) => slot.job === null)

    // 1. An idle worker already holding the image: no decode needed.
    for (const job of candidates) {
      const slot = idle.find((s) => s.imageId === job.imageId)
      if (slot) return [slot, job]
    }

    // 2. Prefer an image no worker holds (spreads distinct images, avoids duplicate decodes);
    //    otherwise duplicate a busy worker's image to keep cores busy.
    const held = new Set(this.#slots.map((s) => s.imageId))
    const job = candidates.find((j) => !held.has(j.imageId)) ?? candidates[0]

    // 3. Prefer a worker whose cached image no queued job needs, then a fresh worker, then any idle one.
    const needed = new Set(this.#queue.map((j) => j.imageId))
    const slot =
      idle.find((s) => s.imageId === null || !needed.has(s.imageId)) ??
      (this.#slots.length < this.size ? this.#spawn() : idle[0])
    return slot ? [slot, job] : null
  }

  #spawn(): Slot {
    const worker = new Worker(new URL('./worker/codec.worker.ts', import.meta.url), {
      type: 'module',
      name: `rastero-codec-${this.#slots.length + 1}`,
    })
    const slot: Slot = { worker, job: null, imageId: null }
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.#onMessage(slot, event.data)
    worker.onerror = (event) => {
      event.preventDefault()
      this.#crash(slot, new Error(`Codec worker crashed: ${event.message || 'unknown error'}`))
    }
    worker.onmessageerror = () => this.#crash(slot, new Error('Codec worker sent an unreadable message'))
    this.#slots.push(slot)
    return slot
  }

  #onMessage(slot: Slot, response: WorkerResponse): void {
    const job = slot.job
    if (!job || job.id !== response.id) return
    slot.job = null
    if (response.ok) {
      this.#settle(job, () => job.resolve(response.result))
    } else {
      const error = new Error(response.error.message)
      error.name = response.error.name
      this.#settle(job, () => job.reject(error))
      // A wasm trap (OOM, unreachable) can leave an Emscripten module unusable: recycle the worker.
      if (response.error.name === 'RuntimeError') this.#retire(slot)
    }
    this.#pump()
  }

  #crash(slot: Slot, error: Error): void {
    const job = slot.job
    this.#retire(slot)
    if (job) this.#settle(job, () => job.reject(error))
    this.#pump()
  }

  /** Terminate and forget a worker; a replacement is spawned lazily by the next pump. */
  #retire(slot: Slot): void {
    slot.worker.terminate()
    slot.job = null
    const index = this.#slots.indexOf(slot)
    if (index !== -1) this.#slots.splice(index, 1)
  }

  #notify(): void {
    this.onActivity?.(this.#slots.filter((s) => s.job !== null).length, this.#queue.length)
  }
}

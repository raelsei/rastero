import { fromDataTransfer, fromFileList, type IngestResult } from '../engine/ingest'
import { addFiles, notify } from '../state/session'

const ACCEPT = 'image/*,.heic,.heif,.jxl,.avif'

/** Opens the native picker for images, or for a whole folder (keeps each file's relative path). */
export function pickFiles(folder: boolean) {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  if (folder) input.webkitdirectory = true
  else input.accept = ACCEPT
  input.addEventListener('change', () => {
    if (input.files && input.files.length > 0) void ingest(fromFileList(input.files))
  })
  input.click()
}

export function ingestTransfer(dt: DataTransfer) {
  void ingest(fromDataTransfer(dt))
}

/** AI-generated sample photos (public/samples), for trying Rastero without images at hand: a camera JPEG and a product PNG. */
const SAMPLES = ['street-cafe.jpg', 'oak-chair.png']

export function loadSamples() {
  void ingest(
    Promise.all(
      SAMPLES.map(async (name) => {
        const response = await fetch(`${import.meta.env.BASE_URL}samples/${name}`)
        if (!response.ok) throw new Error(`sample ${name} is missing (${response.status})`)
        const blob = await response.blob()
        return new File([blob], name, { type: blob.type })
      }),
    ).then(fromFileList),
  )
}

async function ingest(pending: Promise<IngestResult>) {
  try {
    addFiles(await pending)
  } catch (error) {
    notify(`Couldn't read those files: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

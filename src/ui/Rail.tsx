import { memo } from 'react'
import { Folder, X } from 'lucide-react'
import { formatBytes, savings } from '../engine/format-bytes'
import { currentPick, pickBytes } from '../state/pick'
import { useSettings } from '../state/settings'
import { removeImage, selectImage, useSession } from '../state/session'
import type { ImageEntry } from '../state/types'
import { formatSaving } from './format'
import './Rail.css'

export function Rail() {
  const order = useSession((s) => s.order)
  const images = useSession((s) => s.images)

  const groups: Array<{ folder: string; ids: string[] }> = []
  for (const id of order) {
    const folder = images[id].folder
    const group = groups.find((g) => g.folder === folder)
    if (group) group.ids.push(id)
    else groups.push({ folder, ids: [id] })
  }

  return (
    <aside className="rail" aria-label="Images">
      {groups.map((group) => (
        <section key={group.folder || '(loose)'} className="rail-group">
          {group.folder !== '' && (
            <h2 className="rail-folder">
              <Folder aria-hidden="true" />
              <span className="rail-folder-name">{group.folder}/</span>
              <span className="rail-folder-count num">
                {group.ids.length} {group.ids.length === 1 ? 'image' : 'images'}
              </span>
            </h2>
          )}
          <ul className="rail-list">
            {group.ids.map((id) => (
              <RailRow key={id} image={images[id]} />
            ))}
          </ul>
        </section>
      ))}
    </aside>
  )
}

const RailRow = memo(function RailRow({ image }: { image: ImageEntry }) {
  const selected = useSession((s) => s.selectedId === image.id)
  const enabled = useSettings((s) => s.enabled)
  const bytes = pickBytes(image, currentPick(image, enabled))
  const variants = Object.values(image.variants)
  const encoding = variants.some((v) => v.status === 'encoding')

  let status: { text: string; tone: 'saving' | 'muted' | 'error' }
  if (image.status === 'error') status = { text: 'Unreadable', tone: 'error' }
  else if (bytes !== null) status = { text: formatSaving(savings(image.bytes, bytes)), tone: 'saving' }
  else status = { text: encoding ? 'Encoding' : 'Queued', tone: 'muted' }

  return (
    <li className="rail-row" aria-current={selected || undefined}>
      <button
        type="button"
        className="rail-row-main"
        onClick={() => selectImage(image.id)}
        title={image.error ?? image.relativePath}
      >
        <span className="rail-thumb">{image.thumbUrl && <img src={image.thumbUrl} alt="" decoding="async" />}</span>
        <span className="rail-text">
          <span className="rail-name">{image.name}</span>
          <span className="rail-size num">{formatBytes(image.bytes)}</span>
        </span>
        <span className="rail-status num" data-tone={status.tone}>
          {status.text}
        </span>
      </button>
      <button
        type="button"
        className="rail-remove icon-btn"
        aria-label={`Remove ${image.name}`}
        onClick={() => removeImage(image.id)}
      >
        <X />
      </button>
    </li>
  )
})

import { useEffect } from 'react'
import { currentPick } from '../state/pick'
import { useSession } from '../state/session'
import { useSettings } from '../state/settings'
import { ORIGINAL } from '../state/types'
import { CompareView } from './CompareView'
import { QualityBar } from './QualityBar'
import { Strip } from './Strip'
import { preload } from './useDecoded'
import './Stage.css'

/** The proof for the selected image: before/after, every result along its edge, and fine tuning. */
export function Stage() {
  const image = useSession((s) => (s.selectedId ? s.images[s.selectedId] : null))
  const enabled = useSettings((s) => s.enabled)
  useNeighbourPreload()
  if (!image) return <main className="stage" />
  const pickKey = currentPick(image, enabled)

  return (
    <main className="stage" aria-label={`Proof of ${image.name}`}>
      <CompareView image={image} pickKey={pickKey} />
      {image.status !== 'error' && (
        <div className="stage-controls">
          <Strip image={image} pickKey={pickKey} />
          <QualityBar key={`${image.id}|${pickKey}`} image={image} pickKey={pickKey} />
        </div>
      )}
    </main>
  )
}

/** Decodes the previous and next proofs (original and picked result) while the current one is on screen. */
function useNeighbourPreload() {
  const selectedId = useSession((s) => s.selectedId)
  useEffect(() => {
    const { images, order } = useSession.getState()
    const enabled = useSettings.getState().enabled
    const index = selectedId === null ? -1 : order.indexOf(selectedId)
    if (index === -1) return
    const urls: Array<string | null> = []
    for (const id of [order[index + 1], order[index - 1]]) {
      const image = id ? images[id] : undefined
      if (!image) continue
      const key = currentPick(image, enabled)
      urls.push(image.originalUrl, key && key !== ORIGINAL ? (image.variants[key]?.viewUrl ?? null) : null)
    }
    preload(urls)
  }, [selectedId])
}

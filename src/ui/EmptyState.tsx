import { FolderOpen, ImagePlus } from 'lucide-react'
import { LICENSES_URL, SOURCE_URL } from './links'
import { LogoMark } from './Logo'
import { loadSamples, pickFiles } from './pickers'
import './EmptyState.css'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** First run: one clear drop target, the two ways in, what Rastero reads and writes, and where its source is. */
export function EmptyState({ dragging }: { dragging: boolean }) {
  // Phones can't drop files, paste from a keyboard, or pick folders; offer what they can do.
  const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  return (
    <main className="empty" data-dragging={dragging}>
      <div className="empty-panel">
        <LogoMark size={52} />
        <h1>{dragging ? 'Drop to add' : touchOnly ? 'Choose photos to compress' : 'Drop images or a folder'}</h1>
        <p>Every format and quality, measured side by side. Nothing leaves your device.</p>
        <div className="empty-actions">
          <button type="button" className="btn btn-primary" onClick={() => pickFiles(false)}>
            <ImagePlus aria-hidden="true" /> Choose {touchOnly ? 'photos' : 'images'}
          </button>
          {!touchOnly && (
            <button type="button" className="btn btn-solid" onClick={() => pickFiles(true)}>
              <FolderOpen aria-hidden="true" /> Choose folder
            </button>
          )}
        </div>
        <p className="empty-hint">
          {touchOnly ? 'or ' : `or paste with ${IS_MAC ? '⌘V' : 'Ctrl+V'} · `}
          <button type="button" className="link-btn" onClick={loadSamples}>
            try two sample photos
          </button>{' '}
          (AI-generated)
        </p>
      </div>
      <dl className="empty-facts">
        <div>
          <dt>Reads</dt>
          <dd>JPEG, PNG, WebP, AVIF, HEIC, JPEG XL, GIF, BMP</dd>
        </div>
        <div>
          <dt>Writes</dt>
          <dd>AVIF, WebP, JPEG, PNG, JPEG XL</dd>
        </div>
        <div>
          <dt>Runs</dt>
          <dd>in your browser · offline after first use · nothing is uploaded</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            free software, GPL-3.0 ·{' '}
            <a className="quiet-link" href={SOURCE_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>{' '}
            ·{' '}
            <a className="quiet-link" href={LICENSES_URL} target="_blank" rel="noreferrer">
              licenses
            </a>
          </dd>
        </div>
      </dl>
    </main>
  )
}

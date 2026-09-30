import { create } from 'zustand'

interface ViewerState {
  zoom: 'fit' | 'actual'
  loupe: boolean
  /** Divider position across the proof, 0..1; the result shows to its right. */
  split: number
  /** Held Space: the whole proof shows the original. */
  showOriginal: boolean
  shortcutsOpen: boolean
}

export const useViewer = create<ViewerState>()(() => ({
  zoom: 'fit',
  loupe: false,
  split: 0.5,
  showOriginal: false,
  shortcutsOpen: false,
}))

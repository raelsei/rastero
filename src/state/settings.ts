import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FORMATS, type FormatId } from '../engine/formats'
import type { ExportContent, ExportDestination } from './types'

interface SettingsState {
  enabled: FormatId[]
  exportContent: ExportContent
  exportDestination: ExportDestination
  setEnabled: (enabled: FormatId[]) => void
  setExportContent: (content: ExportContent) => void
  setExportDestination: (destination: ExportDestination) => void
}

const DEFAULT_ENABLED = FORMATS.filter((f) => f.defaultEnabled).map((f) => f.id)

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      enabled: DEFAULT_ENABLED,
      exportContent: 'picks',
      exportDestination: 'zip',
      setEnabled: (enabled) => set({ enabled: FORMATS.map((f) => f.id).filter((id) => enabled.includes(id)) }),
      setExportContent: (exportContent) => set({ exportContent }),
      setExportDestination: (exportDestination) => set({ exportDestination }),
    }),
    {
      name: 'rastero.settings',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>
        const enabled = (p.enabled ?? current.enabled).filter((id) => FORMATS.some((f) => f.id === id))
        return {
          ...current,
          ...p,
          enabled: enabled.length > 0 ? enabled : DEFAULT_ENABLED,
        }
      },
    },
  ),
)

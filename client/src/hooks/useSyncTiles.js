import { useCallback } from 'react'
import { useSyncEvent } from './useSyncEvents'

/**
 * Hook qui branche les évènements SSE upload:started / file:created / file:deleted
 * sur l'état d'une page (liste de fichiers / dossiers).
 *
 * @param {object} opts
 * @param {(data: object) => boolean} opts.matches  filtre — true si l'évènement
 *   doit affecter la page courante (ex: parent_id === folderId, mime.startsWith('image/')…)
 * @param {function} opts.setItems  setter React (équivalent à setFiles)
 * @param {function} [opts.setFolders]  setter pour les dossiers (optionnel)
 *
 * Le hook merge automatiquement :
 * - upload:started → ajoute une tuile { id: temp_id, _uploading: true, name, … }
 * - file:created   → si temp_id match un placeholder, remplace ; sinon prepend
 * - file:deleted   → retire des deux listes
 */
export function useSyncTiles({ matches, setItems, setFolders }) {
  useSyncEvent('upload:started', useCallback((data) => {
    if (!data?.temp_id) return
    if (!matches(data)) return
    setItems(prev => {
      if (prev.find(f => f.id === data.temp_id)) return prev
      return [{
        id: data.temp_id,
        name: data.name,
        size: data.size,
        mime_type: data.mime_type,
        icon: data.icon,
        icon_color: data.icon_color,
        icon_bg: data.icon_bg,
        _uploading: true,
      }, ...prev]
    })
  }, [matches, setItems]))

  useSyncEvent('file:created', useCallback((data) => {
    if (!data?.id) return
    if (!matches(data)) return
    if (data.is_folder && setFolders) {
      setFolders(prev => prev.find(f => f.id === data.id) ? prev : [data, ...prev])
      return
    }
    setItems(prev => {
      const idx = data.temp_id ? prev.findIndex(f => f.id === data.temp_id) : -1
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = data
        return next
      }
      if (prev.find(f => f.id === data.id)) return prev
      return [data, ...prev]
    })
  }, [matches, setItems, setFolders]))

  useSyncEvent('file:deleted', useCallback((data) => {
    if (!data?.id) return
    setItems(prev => prev.filter(f => f.id !== data.id))
    if (setFolders) setFolders(prev => prev.filter(f => f.id !== data.id))
  }, [setItems, setFolders]))
}

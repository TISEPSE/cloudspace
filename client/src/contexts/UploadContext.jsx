import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { getAccessToken } from '../lib/api'

const UploadContext = createContext(null)

export function useUpload() {
  return useContext(UploadContext)
}

export function UploadProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [visible, setVisible] = useState(false)
  const idCounter = useRef(0)
  // Dossier actif (mis à jour par MyDrive lors de la navigation). Permet aux uploads
  // déclenchés depuis la sidebar/galerie d'atterrir dans le dossier courant.
  const currentFolderIdRef = useRef(null)

  const setCurrentFolderId = useCallback((id) => {
    currentFolderIdRef.current = id || null
  }, [])

  const uploadFiles = useCallback((fileList, parentId = undefined) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    // Si parentId non fourni explicitement, on utilise le dossier courant
    const targetParentId = parentId === undefined ? currentFolderIdRef.current : parentId

    const entries = files.map(file => ({
      id: ++idCounter.current,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      parentId: targetParentId,
      progress: 0,
      status: 'pending',
    }))

    setQueue(prev => [...entries, ...prev])
    setVisible(true)

    // Start uploading each file
    entries.forEach(entry => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', entry.file)
      if (targetParentId) formData.append('parent_id', targetParentId)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          setQueue(prev =>
            prev.map(f => f.id === entry.id ? { ...f, progress: percent, status: 'uploading' } : f)
          )
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setQueue(prev =>
            prev.map(f => f.id === entry.id ? { ...f, progress: 100, status: 'done' } : f)
          )
        } else {
          setQueue(prev =>
            prev.map(f => f.id === entry.id ? { ...f, status: 'error' } : f)
          )
        }
      })

      xhr.addEventListener('error', () => {
        setQueue(prev =>
          prev.map(f => f.id === entry.id ? { ...f, status: 'error' } : f)
        )
      })

      xhr.open('POST', '/api/files/upload')
      const token = getAccessToken()
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)

      setQueue(prev =>
        prev.map(f => f.id === entry.id ? { ...f, status: 'uploading' } : f)
      )
    })
  }, [])

  // Auto-dismiss 5s after all uploads finish
  const autoDismissTimer = useRef(null)
  useEffect(() => {
    clearTimeout(autoDismissTimer.current)
    const doneOrError = queue.filter(f => f.status === 'done' || f.status === 'error').length
    if (queue.length > 0 && doneOrError === queue.length && visible) {
      autoDismissTimer.current = setTimeout(() => {
        setVisible(false)
        setTimeout(() => setQueue([]), 300)
      }, 5000)
    }
    return () => clearTimeout(autoDismissTimer.current)
  }, [queue, visible])

  const clearDone = useCallback(() => {
    setQueue(prev => prev.filter(f => f.status !== 'done'))
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(() => setQueue([]), 300)
  }, [])

  return (
    <UploadContext.Provider value={{ queue, visible, uploadFiles, clearDone, dismiss, setCurrentFolderId }}>
      {children}
    </UploadContext.Provider>
  )
}

import { useCallback } from 'react'
import { apiFetch } from '../lib/api'

/**
 * Hook centralisant les mutations REST sur les fichiers (star, rename, trash,
 * lock/unlock). Les pages restent libres de gérer leurs propres modals : ce
 * hook ne s'occupe que des appels API + retry/refetch.
 *
 * @param {object}   opts
 * @param {function} [opts.onChange]  callback appelé après chaque mutation réussie
 *                                    (typiquement la fonction de refetch de la page)
 * @returns {{
 *   star: (file: {id:string}) => Promise<Response>,
 *   rename: (id: string, name: string) => Promise<Response>,
 *   trash: (id: string) => Promise<Response>,
 *   verifyLock: (id: string, password: string) => Promise<Response>,
 *   setLock: (id: string, password: string) => Promise<Response>,
 *   removeLock: (id: string) => Promise<Response>,
 * }}
 */
export function useFileMutations({ onChange } = {}) {
  const _refresh = useCallback((res) => {
    if (res?.ok && onChange) onChange()
    return res
  }, [onChange])

  const star = useCallback(async ({ id }) => {
    const res = await apiFetch(`/api/files/${id}/star`, { method: 'PUT' })
    return _refresh(res)
  }, [_refresh])

  const rename = useCallback(async (id, name) => {
    const res = await apiFetch(`/api/files/${id}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    return _refresh(res)
  }, [_refresh])

  const trash = useCallback(async (id) => {
    const res = await apiFetch(`/api/files/${id}`, { method: 'DELETE' })
    return _refresh(res)
  }, [_refresh])

  const verifyLock = useCallback(async (id, password) => {
    return apiFetch(`/api/files/${id}/verify-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
  }, [])

  const setLock = useCallback(async (id, password) => {
    const res = await apiFetch(`/api/files/${id}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'set' }),
    })
    return _refresh(res)
  }, [_refresh])

  const removeLock = useCallback(async (id, password) => {
    const res = await apiFetch(`/api/files/${id}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'unset' }),
    })
    return _refresh(res)
  }, [_refresh])

  return { star, rename, trash, verifyLock, setLock, removeLock }
}

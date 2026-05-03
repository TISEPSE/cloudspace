// Utilitaires pour gérer les noms de fichiers et leurs extensions

const EXT_RE = /\.[a-z0-9]{1,8}$/i

export function splitNameExt(filename) {
  if (!filename) return { base: '', ext: '' }
  const m = filename.match(EXT_RE)
  if (!m) return { base: filename, ext: '' }
  return { base: filename.slice(0, m.index), ext: m[0] }
}

export function formatDisplayName(filename, showExtensions, isFolder = false) {
  if (showExtensions || isFolder) return filename
  const { base, ext } = splitNameExt(filename)
  return ext ? base : filename
}

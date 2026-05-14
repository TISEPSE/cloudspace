/**
 * Tuile placeholder affichée pendant qu'un upload est en cours (depuis n'importe
 * quel appareil de l'utilisateur). Animation shimmer + icône cloud_upload pulsée.
 *
 * Variantes :
 *  - `grid`   : aspect 4/3 avec carte et bordure pointillée — convient à MyDrive
 *  - `photo`  : aspect carré sans cartouche bas — convient à la grille Galerie
 *  - `mosaic` : ratio libre avec min-height — convient au mode mosaïque Galerie
 */
export default function UploadingTilePlaceholder({ variant = 'grid', name }) {
  const shimmer = (
    <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(59,130,246,0.12)_50%,transparent_75%)] bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]" />
  )
  const icon = (
    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
      <span className="material-symbols-outlined text-primary animate-pulse">cloud_upload</span>
    </div>
  )

  if (variant === 'photo') {
    return (
      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
        {shimmer}
        <div className="relative flex flex-col items-center gap-2 px-2 text-center">
          {icon}
          {name && <p className="text-[10px] text-primary/80 font-medium truncate max-w-full">{name}</p>}
        </div>
      </div>
    )
  }

  if (variant === 'mosaic') {
    return (
      <div className="break-inside-avoid mb-2">
        <div className="relative min-h-[140px] rounded-lg overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
          {shimmer}
          <div className="relative flex flex-col items-center gap-2 px-2 text-center">
            {icon}
            {name && <p className="text-[10px] text-primary/80 font-medium truncate max-w-full">{name}</p>}
          </div>
        </div>
      </div>
    )
  }

  // variant === 'grid' (default)
  return (
    <div className="relative bg-white dark:bg-surface-dark border-2 border-dashed border-primary/40 rounded-lg p-2 overflow-hidden">
      {shimmer}
      <div className="relative aspect-[4/3] rounded-md mb-2 flex items-center justify-center bg-primary/5">
        {icon}
      </div>
      <div className="relative">
        {name && <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={name}>{name}</p>}
        <p className="text-[11px] text-primary mt-0.5">Téléversement en cours…</p>
      </div>
    </div>
  )
}

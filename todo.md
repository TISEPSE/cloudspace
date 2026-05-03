# TODO — CloudSpace

> Liste vivante des choses à corriger / améliorer. À cocher au fur et à mesure.

## En cours

_(rien)_

## Prio audit sécurité (à traiter)

- [ ] Réduire la durée de vie du token URL pour les médias inline (token "media" 5 min plutôt que l'access token JWT 15 min réutilisé)
- [ ] CSP : enlever `'unsafe-inline'` sur `script-src` (nécessite config Vite avec nonces)

## Idées / backlog

- [ ] Migration des comptes existants `sidebar_hover` de `false` → `true` (changement de défaut côté backend)
- [ ] Bouton "Se déconnecter de tous les appareils" dans Settings (utiliserait `logoutEverywhere`)
- [ ] Indicateur visuel discret quand le timer 24h approche de l'expiration
- [ ] Étendre `formatDisplayName` aux autres pages : Recent, Starred, Trash, History, SharedWithMe, FilePreviewModal (titre)

## Fait récemment ✅

- ✅ Auto-déconnexion 24h avec vérification au focus de l'onglet
- ✅ Auto-login en cliquant sur un profil sauvegardé (refresh token par profil)
- ✅ Sidebar : push le contenu au hover (plus d'overlay)
- ✅ Sidebar : sidebar_hover activé par défaut pour les nouveaux comptes
- ✅ Avatar `object-cover` sur AccountSelector (plus d'image étirée)
- ✅ Espacement bas de la légende du dashboard storage
- ✅ Galerie : token passé dans l'URL des images (plus de 401)
- ✅ Galerie : bouton Upload branché sur `UploadContext`
- ✅ Bouton 3-points sur tuiles dossiers : icône `text-[16px]`
- ✅ Breadcrumb du Drive : `text-sm` partout (discret), bold sur l'élément courant
- ✅ Bouton 3-points en vue liste : `inline-flex items-center justify-center` + icône explicite `text-[18px] leading-none`
- ✅ Pref « Afficher les extensions » dans Paramètres → Apparence (clé `cloudspace_show_extensions`)
- ✅ Rename ne touche plus l'extension (input pour la base seulement, extension grisée à droite)
- ✅ Galerie utilise `FilePreviewModal` (mêmes contrôles que clic sur fichier) + flèches clavier prev/next
- ✅ Endpoint `/api/files/gallery` enrichi (icon/icon_color/icon_bg/has_content) pour FilePreviewModal
- ✅ Upload dans le dossier courant : `UploadContext` expose `setCurrentFolderId`, MyDrive le synchronise via useEffect
- ✅ `SECRET_KEY` requise au démarrage (RuntimeError si absente ou < 32 chars), plus de fallback `'dev-secret'`
- ✅ Backend Flask tourne en non-root (UID 1000 `appuser`) via `gosu` dans l'entrypoint, qui chown le volume au boot puis drop les privilèges

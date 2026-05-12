# TODO — CloudSpace

> Liste vivante des choses à corriger / améliorer. À cocher au fur et à mesure.

## En cours

### Adaptation mobile + APK Android (Capacitor)

- [x] **Phase 1 — Responsive**
  - [x] `Layout.jsx` : sidebar → drawer overlay sous 768px + bouton hamburger
  - [x] `MyDrive.jsx` : toolbar/filtres/grilles responsive + modals (CreateFolder, Rename, Lock, Trash) en bottom-sheet
  - [x] Modals globaux : `MoveItemModal`, `ShareModal`, `ItemDetailsModal` → bottom-sheets sous 640px
  - [x] `FileContextMenu` → bottom sheet sur mobile (détection `matchMedia('(max-width: 639px)')`, force visibilité — pas de hover sur tactile)
  - [x] Audit responsive autres pages : Galerie, Trash, Shared, Settings, Dashboard, Starred, History (padding `p-3 sm:p-6`, toolbars flex-wrap, actions toujours visibles sur mobile)
- [ ] **Phase 2 — UX tactile**
  - [x] Long-press = menu contextuel (sur cartes Drive grille — `useLongPress` + `forwardRef` sur `FileContextMenu.open()`)
  - [x] Pull-to-refresh sur la liste Drive (`usePullToRefresh` + indicateur visuel, seuil 70px, masqué desktop)
  - [x] Swipe sur item = actions rapides (étoile / corbeille) — `SwipeableRow` + liste mobile `sm:hidden` dans DriveListSection, swipe droite = étoile, swipe gauche = corbeille (avec confirmation)
  - [x] Bottom navigation sur mobile (Drive / Galerie / Favoris / Partagés / Réglages)
  - [x] Bouton retour Android branché sur react-router (`@capacitor/app` + `useAndroidBackButton`)
- [x] **Phase 3 — Backend ready**
  - [x] Endpoint `GET /api/health` (no auth, retourne db status)
  - [x] CORS : autoriser `capacitor://localhost`, `http://localhost`, `https://localhost`
  - [ ] CSP : autoriser origine `capacitor://` (à valider quand on testera l'APK)
  - [ ] Cloudflare Turnstile : fallback ou exemption pour origin app
- [x] **Phase 4 — Capacitor**
  - [x] `npm i @capacitor/core @capacitor/cli @capacitor/android` + `cap init` + `cap add android`
  - [x] Mode embarqué : `webDir: dist`
  - [x] Écran de configuration URL backend au premier lancement
  - [x] Écran d'erreur "Backend indisponible" avec retry (ping `/api/health` au boot)
  - [ ] Tokens : migrer localStorage → `@capacitor/preferences` (optionnel, peut attendre)
- [ ] **Phase 5 — Plugins natifs**
  - [x] Installer `@capacitor/camera`, `@capacitor/share`, `@capacitor/preferences`, `@capacitor/app`
  - [x] `@capacitor/camera` : bouton "Prendre une photo" dans la Galerie (sur native uniquement) → upload via `uploadFiles`
  - [x] `@capacitor/share` : action « Partager via… » dans le menu contextuel (sur native uniquement) — partage métadonnées + lien deep CloudSpace
  - [ ] `@capacitor-community/biometric-auth` : Face ID/empreinte au démarrage + dossiers verrouillés (plugin pas installé)
- [x] **Phase 6 — Build & distribution**
  - [x] Script `generate-keystore.sh` pour créer le keystore
  - [x] `build.gradle` configuré pour signature release
  - [x] GitHub Action `android-apk.yml` build automatique sur tag git
  - [ ] Générer le keystore + ajouter les 4 secrets GitHub (action utilisateur)
  - [ ] Push un tag `v1.0.0` pour déclencher le premier build (action utilisateur)
  - [ ] Page `/download` ou bouton Settings → téléchargement APK (plus tard)

### Fait dans cette session

- [x] Onglet « Application » dans Settings (visible uniquement sur native) : changer l'URL serveur + bouton réinitialiser

## Idées / backlog

_(rien)_

## Fait récemment ✅

- ✅ Bouton "Se déconnecter de tous les appareils" dans Paramètres → Sécurité
- ✅ Indicateur 24h dans le header (badge amber, affiché quand < 60 min restantes)
- ✅ `formatDisplayName` étendu à Starred, Trash, SharedWithMe, FilePreviewModal
- ✅ Migration sidebar_hover : comptes existants migrés à `true`
- ✅ Sécurité : token media court (5 min) pour les URLs inline images/vidéos
- ✅ Sécurité : suppression `'unsafe-inline'` du CSP `script-src` (loader déplacé dans `/loading.js`)
- ✅ Sécurité : Cloudflare Turnstile sur login, register et account selector (fail-closed)
- ✅ Sécurité : sessions liées à l'appareil via device_id dans le JWT refresh
- ✅ Sécurité : rotation des refresh tokens avec blocklist JTI
- ✅ Sécurité : SECRET_KEY obligatoire au démarrage
- ✅ Sécurité : backend non-root (UID 1000)
- ✅ Suppression page Récents (doublon avec Historique)
- ✅ Galerie : slider de taille (5 crans) + bouton mosaïque séparé
- ✅ Fermeture modal sur clic extérieur (FilePreviewModal)
- ✅ Tuiles dossiers : layout horizontal, plus hautes, moins larges
- ✅ Boutons fermer : centrage corrigé sur tous les modals
- ✅ Métadonnées PDF dans la modal de détails
- ✅ Labels français dans la modal de détails
- ✅ UI : Agrandir le titre de l'application, le logo et le bouton "Ajouter" dans la navbar (centré)
- ✅ Auto-déconnexion 24h avec vérification au focus de l'onglet
- ✅ Auto-login en cliquant sur un profil sauvegardé (refresh token par profil)
- ✅ Sidebar : push le contenu au hover (plus d'overlay)
- ✅ Galerie : mode mosaïque, vue persistée, flèches clavier prev/next
- ✅ Pref « Afficher les extensions » dans Paramètres → Apparence
- ✅ Rename ne touche plus l'extension
- ✅ Upload dans le dossier courant

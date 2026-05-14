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

### Phase 7 — Pairing sécurisé téléphone ↔ drive (QR code)

**But** : remplacer la saisie manuelle URL + email + mot de passe sur le téléphone par un scan de QR code généré côté web. Plus rapide et plus sécurisé (token éphémère, à usage unique, lié au compte connecté).

**Flux utilisateur** :
1. Sur le web (connecté), Settings → onglet « Appareils » → bouton « Ajouter un appareil » → QR code s'affiche (valide 5 min)
2. Sur le téléphone, premier lancement → écran de setup → bouton « Scanner un QR code » en plus du champ URL manuel
3. Scan → app récupère l'URL serveur + jeton de pairing
4. App POST `/api/auth/device-pair/consume` avec le jeton → reçoit access/refresh tokens du compte propriétaire
5. App stocke l'URL backend + les tokens → utilisateur connecté, plus jamais besoin de retaper

#### Backend (`backend/`)
- [x] Modèle SQLAlchemy `DevicePairing` (token urlsafe 256 bits, expires_at, used_at, ips, UA, device label)
- [x] Migration auto via `db.create_all` (import ajouté dans `src/__init__.py`)
- [x] `POST /api/auth/device-pair/create` (auth requis, rate-limit 10/h)
- [x] `POST /api/auth/device-pair/consume` (no auth, rate-limit 10/15min) → access/refresh tokens
- [x] `GET /api/auth/device-pair/list` (auth requis) → `{ active, consumed }`
- [x] `DELETE /api/auth/device-pair/:id` (auth requis)
- [x] Blueprint enregistré dans `src/routes/__init__.py`
- [ ] Tâche cron / lazy cleanup : purger les pairings expirés > 24h (optionnel)

#### Frontend web — générateur QR
- [x] `npm i qrcode`
- [x] Section « Appareils » dans Settings (web uniquement)
  - Génération QR contenant `{v:1, url, token}` en JSON brut
  - Compte à rebours visuel (5 min) + bouton « Régénérer »
- [x] Liste des appareils consommés (date, IP) avec bouton « Révoquer »

#### Frontend mobile — scanner QR
- [x] `npm i @capacitor-mlkit/barcode-scanning`
- [x] Permission `CAMERA` ajoutée dans `AndroidManifest.xml`
- [x] `BackendGate` : bouton « Scanner un QR code » en haut + saisie manuelle en fallback
- [x] Au scan : parse JSON, vérifie `v === 1`, ping serveur, POST `/consume`, sauve URL + tokens + session_started

#### Sécurité
- [x] Token à usage unique (consume marque `used_at`, second consume = 409)
- [x] TTL court (5 min)
- [x] Rate-limit consume : 10/15min/IP
- [x] Log de l'IP + UA qui consomme — exposé dans `/list`
- [x] Validation stricte côté mobile : refus si URL n'est pas http(s)://

#### Polish (plus tard)
- [ ] Onboarding : tutoriel inline « Comment connecter mon téléphone »

---

### Fait dans cette session

- [x] Onglet « Application » dans Settings (visible uniquement sur native) : changer l'URL serveur + bouton réinitialiser
- [x] Drawer (sidebar) : items 48px hauteur sur mobile (icônes 26px, texte 16px) pour accessibilité au pouce, desktop inchangé
- [x] BottomNav : compteurs d'items uniformes par page (style Galerie) pour transition visuelle naturelle

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

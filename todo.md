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

### Phase 8 — UX mobile + sync temps réel — ✅ implémenté

**Bilan** :
- ✅ 8.1 BackendGate : input URL supprimé, QR contient juste `{v:1, url}`, login normal après scan
- ✅ 8.2 Plugin `@aparajita/capacitor-biometric-auth` + BiometricGate + toggle Settings → Sécurité (mobile only)
- ✅ 8.3 Bug menu 3 points : capture-phase click swallower 400ms après fermeture du bottom-sheet
- ✅ 8.4 SSE backend `/api/sync/events` + hook `useSyncEvents` + insertion temps réel dans MyDrive (file:created, file:deleted)

**Limites connues** :
- SSE in-memory hub : pub/sub par worker gunicorn. Avec 4 workers, les events ne traversent pas. À migrer vers Redis pub/sub si on scale.
- Auth biométrique : protège l'accès à l'UI (gate au boot), mais le refresh token reste en clair dans localStorage. Pour chiffrer réellement, passer par un module natif Keystore.
- Pas d'animation tuile en cours d'upload sur l'appareil distant : seul l'évènement final `file:created` est émis. Phase 8.5 si besoin.

---

### Phase 8 — Plan d'origine (référence)

**4 chantiers indépendants** : revoir le flux de pairing, ajouter l'auth biométrique, corriger un bug de menu contextuel, et brancher une synchronisation live PC ↔ téléphone.

#### 8.1 — Refonte du flux de pairing mobile

**Constat** : actuellement le QR contient URL + token et logue directement → trop magique, et empêche l'enrôlement biométrique car aucune saisie de mot de passe n'a lieu.

**Nouveau flux** :
1. Premier lancement → écran setup mobile : **un seul bouton « Scanner un QR code »** (l'input URL manuel est supprimé)
2. Scan du QR → on extrait uniquement l'URL serveur, on la sauve en local, on ping `/api/health`
3. L'app affiche un écran login (email + mot de passe) — flux normal
4. Après login réussi → prompt « Activer la connexion par empreinte digitale ? »
   - Si oui : génère une clé Android Keystore liée à l'empreinte, chiffre le refresh token avec, stocke en `@capacitor/preferences`
   - Si non : l'utilisateur devra retaper son mot de passe à chaque session

**Backend** : aucune nouvelle route nécessaire. Le QR contient juste l'URL → on peut soit garder le flux `device-pair/consume` actuel pour les utilisateurs qui veulent zéro-saisie, soit basculer sur un payload QR minimaliste `{v:1, url}`.

**Décision à prendre** : faut-il garder l'option « QR direct » (consume token immédiat) en parallèle, ou supprimer complètement pour forcer la saisie du mot de passe + biométrie ?

#### 8.2 — Auth biométrique (Face ID / empreinte)

- [ ] Installer `@aparajita/capacitor-biometric-auth` (compatible Capacitor 8)
- [ ] Permission manifest : `<uses-permission android:name="android.permission.USE_BIOMETRIC" />`
- [ ] Module `client/src/lib/biometric.js` :
  - `isAvailable()` : check capabilities
  - `enrollRefreshToken(refreshToken)` : prompt biométrie + chiffre + stocke
  - `unlock()` : prompt biométrie + déchiffre → retourne le refresh token
  - `disable()` : efface la clé chiffrée
- [ ] BackendGate (après login réussi) : modal « Activer la biométrie ? Oui / Plus tard »
- [ ] Settings → onglet « Sécurité » mobile : toggle « Déverrouillage par empreinte » + bouton « Désactiver »
- [ ] Au boot mobile :
  - Si `biometricEnabled` true → prompt biométrie en remplacement de l'écran login
  - Sinon → écran login classique
- [ ] Fallback : 3 échecs biométriques → bascule sur login mot de passe

#### 8.3 — Bug menu contextuel mobile (3 points → fermeture modal ouvre le fichier)

**Symptôme** : sur mobile, taper sur les 3 points (`⋮`) d'un fichier ouvre le bottom-sheet du menu. Fermer le bottom-sheet (backdrop tap ou bouton fermer) → le clic « traverse » et déclenche le `onClick` de la carte fichier sous-jacente → le fichier s'ouvre en preview. Comportement non désiré.

**Cause probable** : le `onClick` de la carte se propage après que le bottom-sheet ait été démonté. Touchend du backdrop = mousedown sur la carte.

**Fix** :
- [ ] `BottomSheetMenu` (dans `FileContextMenu.jsx`) : sur `onClose`, appeler `e.preventDefault()` + `e.stopPropagation()` sur l'event du backdrop
- [ ] Ajouter un délai bref (50ms via `setTimeout`) avant de démonter le sheet, pour que le clic ne traverse pas
- [ ] OU : poser un overlay invisible plein écran de 200ms après fermeture, qui absorbe le premier clic post-fermeture
- [ ] Vérifier aussi sur Drive, Galerie, Starred, SharedWithMe (toutes les vues qui utilisent FileContextMenu)

#### 8.4 — Synchronisation temps réel des uploads (PC ↔ mobile)

**But** : quand un fichier est uploadé depuis le téléphone (ou un autre onglet), tous les clients connectés (web PC + mobile) voient apparaître la nouvelle tuile **en temps réel**, avec animation de progression pendant l'upload, puis tuile finalisée.

**Architecture** : Server-Sent Events (SSE) ou WebSocket. SSE plus simple côté Flask, suffisant pour des notifications unidirectionnelles serveur → client.

**Backend** :
- [ ] Nouvelle route `GET /api/sync/events` (auth requise) → renvoie un stream `text/event-stream`
  - Filtre par `user_id` (chaque client n'écoute que ses propres events)
  - Garde une connexion ouverte, envoie heartbeat toutes les 30s
- [ ] Système de publication d'events (in-memory `Queue` par user, ou Redis si scale prévu)
- [ ] Émettre un event à chaque mutation pertinente :
  - `upload_started` : `{type, file_id (temp), name, size, folder_id}` → tuile placeholder
  - `upload_progress` : `{file_id, progress}` (10 % d'intervalle pour limiter le trafic)
  - `upload_done` : `{file_id, full_metadata}` → remplace placeholder par vraie tuile
  - `file_deleted`, `folder_created`, `file_renamed`, `file_moved` (bonus)
- [ ] Backend doit émettre AVANT le stream PUT vers le storage (état "en cours") et APRÈS commit DB (état "terminé")

**Frontend** :
- [ ] Hook global `useSyncEvents()` monté dans `AuthProvider` ou `Layout` :
  - Ouvre la connexion SSE après login
  - Reconnecte automatiquement si la connexion tombe (exponential backoff)
  - Dispatch les events dans un EventTarget global (ou Zustand store)
- [ ] Pages Drive / Galerie / Starred : s'abonnent aux events `upload_started/progress/done/deleted` filtrés par `folder_id` courant, insèrent/mettent à jour la tuile sans refetch complet
- [ ] Tuile placeholder : aspect-ratio identique, fond gris animé (skeleton shimmer), bandeau bas avec barre de progression + nom du fichier
- [ ] Lorsqu'un upload se termine sur l'appareil courant : ne PAS dédoubler avec l'UploadContext local (réconcilier via le file_id qui passera de temp → permanent)

**Test** :
- PC : ouvrir Drive
- Mobile : prendre une photo → uploader
- PC : doit voir apparaître une tuile placeholder, progresser, puis se finaliser, sans refresh manuel

#### Estimation
- 8.1 + 8.2 : ~1 journée (UX + plugin biométrique + intégration auth)
- 8.3 : ~30 min (petit bug isolé)
- 8.4 : ~1-2 jours (SSE backend + hook frontend + intégration tuiles + tests cross-device)

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

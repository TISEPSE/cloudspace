# CloudSpace — Application mobile Android (APK)

L'app mobile est un wrapper [Capacitor](https://capacitorjs.com/) autour du frontend React. Le code source reste **le même** que la version web ; seul le packaging change.

## Fonctionnement

- Le frontend web (`client/dist`) est embarqué dans l'APK
- Au premier lancement, l'utilisateur saisit l'adresse de son serveur CloudSpace (n'importe quelle instance auto-hébergée)
- L'app ping `/api/health` à chaque démarrage et affiche un écran d'erreur si le serveur est injoignable
- Tous les appels API sont préfixés par l'URL configurée (`client/src/lib/backendUrl.js`)

L'URL backend est stockée localement (clé `cloudspace_backend_url` dans `localStorage`). Elle peut être changée à tout moment depuis l'écran d'erreur "Serveur indisponible".

## Build d'un APK

### Option rapide — APK debug (sans keystore)

Pour tester immédiatement, lance le workflow GitHub manuellement :

1. Pousse les changements (`git push`)
2. Va sur **Actions → Build Android APK → Run workflow**
3. Choisis **build_type = debug** → **Run**
4. ~10 min plus tard, télécharge l'artefact `cloudspace-debug-apk` depuis la page du run

L'APK debug est non-signé mais installable directement sur Android (paramètres → autoriser sources inconnues). Idéal pour tester avant de configurer le keystore.

### Option production — APK release signé

### 1. Générer le keystore (une seule fois, en local)

```bash
cd client/android
./generate-keystore.sh
```

Le script te demande deux mots de passe et crée `cloudspace.jks`.

⚠️ **Garde précieusement** le keystore et les mots de passe (gestionnaire de mots de passe). Si tu les perds, tu ne pourras plus jamais publier de mise à jour avec la même signature.

### 2. Ajouter les secrets GitHub

Dans **Settings → Secrets and variables → Actions** du dépôt, ajoute :

| Secret | Valeur |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Sortie de `base64 -w 0 cloudspace.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Le store password choisi |
| `ANDROID_KEY_ALIAS` | `cloudspace` |
| `ANDROID_KEY_PASSWORD` | Le key password choisi |

### 3. Déclencher un build

Pousser un tag git :

```bash
git tag v1.0.0
git push origin v1.0.0
```

Le workflow `.github/workflows/android-apk.yml` se lance automatiquement :
1. Build le frontend React (`npm run build`)
2. Synchronise les assets dans `android/app/src/main/assets/public` (`cap sync`)
3. Décode le keystore depuis les secrets
4. Build l'APK release signé (`./gradlew assembleRelease`)
5. Crée une release GitHub avec l'APK en attached file

L'APK est aussi disponible comme artifact du workflow (`Actions → run → cloudspace-release-apk`).

### Build manuel (dev local)

Si tu installes le SDK Android sur ta machine :

```bash
cd client
npm run build
npx cap sync android
cd android
./gradlew assembleDebug      # debug, non signé
# ou
./gradlew assembleRelease    # release, nécessite keystore.properties
```

L'APK est généré dans `client/android/app/build/outputs/apk/`.

## Installation sur Android

1. Télécharger l'APK depuis la page Releases GitHub
2. Sur le téléphone : **Paramètres → Sécurité → Sources inconnues** (ou autoriser l'install depuis le navigateur dans Android 12+)
3. Ouvrir le fichier APK pour installer
4. Au premier lancement, entrer l'URL du serveur CloudSpace (ex: `https://cloudspace.tisepse.com`)

## CORS backend

Les origines Capacitor (`capacitor://localhost`, `http://localhost`, `https://localhost`) sont automatiquement ajoutées à `ALLOWED_ORIGINS` côté backend (`backend/src/__init__.py`). Aucune config à faire côté serveur.

## Plugins natifs disponibles

Déjà installés et prêts à utiliser :

- `@capacitor/camera` — prise de photo
- `@capacitor/preferences` — stockage clé/valeur natif (plus sûr que localStorage)
- `@capacitor/share` — menu de partage natif Android

Pour ajouter d'autres plugins :

```bash
cd client
npm install @capacitor/nom-du-plugin
npx cap sync android
```

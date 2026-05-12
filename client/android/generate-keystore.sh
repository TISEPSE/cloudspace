#!/usr/bin/env bash
# Génère le keystore de signature pour les APK release de CloudSpace.
#
# Lance ce script UNE FOIS, puis encode le keystore en base64 et ajoute
# les valeurs aux secrets GitHub (voir README à la fin).
#
# IMPORTANT : conserve une copie du keystore et des mots de passe en lieu sûr.
# Si tu les perds, tu ne pourras plus jamais publier de mise à jour de l'APK
# avec la même signature → les utilisateurs devront désinstaller / réinstaller.

set -euo pipefail

KEYSTORE_FILE="cloudspace.jks"
ALIAS="cloudspace"
VALIDITY_DAYS=10950  # ~30 ans

if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "⚠️  $KEYSTORE_FILE existe déjà. Renomme-le ou supprime-le avant de relancer ce script." >&2
  exit 1
fi

read -rs -p "Mot de passe du keystore (min 6 caractères) : " STORE_PASSWORD
echo
read -rs -p "Mot de passe de la clé (souvent identique) : " KEY_PASSWORD
echo

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=CloudSpace, OU=CloudSpace, O=tisepse, L=Unknown, ST=Unknown, C=FR"

echo
echo "✅ Keystore créé : $KEYSTORE_FILE"
echo
echo "------------------------------------------------------------"
echo "Étapes suivantes :"
echo "  1) Encoder le keystore en base64 :"
echo "       base64 -w 0 $KEYSTORE_FILE > keystore.b64"
echo
echo "  2) Sur GitHub, aller dans Settings → Secrets and variables → Actions"
echo "     et ajouter les 4 secrets suivants :"
echo
echo "       ANDROID_KEYSTORE_BASE64  = (contenu de keystore.b64)"
echo "       ANDROID_KEYSTORE_PASSWORD = (le store password ci-dessus)"
echo "       ANDROID_KEY_ALIAS         = $ALIAS"
echo "       ANDROID_KEY_PASSWORD      = (le key password ci-dessus)"
echo
echo "  3) Conserver le keystore et les mots de passe dans un gestionnaire"
echo "     de mots de passe — SANS les perdre."
echo
echo "  4) Pour déclencher un build : push un tag git :"
echo "       git tag v1.0.0 && git push origin v1.0.0"
echo "------------------------------------------------------------"

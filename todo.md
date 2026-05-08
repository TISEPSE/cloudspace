# TODO — CloudSpace

> Liste vivante des choses à corriger / améliorer. À cocher au fur et à mesure.

## En cours

_(rien)_

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

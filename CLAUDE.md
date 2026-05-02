# CloudSpace — Instructions pour Claude

## Déploiement après chaque modification

Après **toute modification** du projet (frontend ou backend), tu dois obligatoirement :

1. Arrêter et supprimer les conteneurs existants
2. Rebuild les images
3. Relancer les conteneurs

```bash
cd /home/ubuntu/projets/cloudspace
docker compose down --remove-orphans
docker compose up -d --build
```

L'application est ensuite accessible sur **https://cloudspace.tisepse.com** (port 8080 en interne, exposé via nginx).

## Architecture

- `client/` — Frontend React/Vite, servi par nginx dans le conteneur `Frontend-Vite` (port 8080)
- `backend/` — API Flask, conteneur `Backend-Flask` (port 5000 interne)
- `docker-compose.yml` — Orchestre les trois services : `db` (Postgres), `api` (Flask), `client` (Vite/nginx)

## Commandes utiles

```bash
# Voir les logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs api --tail=50
docker compose logs client --tail=50

# Vérifier l'état des conteneurs
docker compose ps
```

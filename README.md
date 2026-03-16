# Stack conteneurisé

Ce dépôt fournit l’ossature Docker pour :
- Front web Angular (servi via nginx).
- Backend Java Spring Boot (REST + JWT).
- Base de données PostgreSQL.
- Variables pour intégrer les facteurs d’émission officiels (ADEME / bases publiques).

## Prérequis
- Docker + Docker Compose.
- Code applicatif placé dans `backend/`, `frontend-web/` avec leurs `package.json`/`pom.xml`.

## Démarrage rapide
1. Copiez `.env.example` en `.env` et ajustez les secrets (`JWT_SECRET`, mots de passe DB, `API_URL`, `ADEME_FACTORS_URL`).
2. Construisez et lancez :  
   `docker compose up --build`
3. Accès :  
   - API Spring Boot : http://localhost:8080  
   - Angular : http://localhost:4200  

## Lancer le Docker
1. Cloner le dépôt et se placer dedans : `cd HACKATHON`.
2. Copier l'environnement : `cp .env.example .env` puis, si besoin, modifier `POSTGRES_PASSWORD`, `JWT_SECRET` (≥32 caractères), `API_URL`.
3. Démarrer les conteneurs : `docker compose up --build -d`
4. Vérifier :  
   - Front : http://localhost:4200  
   - API : http://localhost:8080  
   - Santé : http://localhost:8080/api/health  
   - Auth démo : POST http://localhost:8080/api/auth/token avec `{"username":"demo","password":"demo"}`
5. Logs si problème : `docker compose logs -f backend` (ou `web`, `db`).
6. Arrêter : `docker compose down`.

## Détails par service
- **PostgreSQL (`db`)** : volume `db_data` persistant ; crédentials depuis `.env`.
- **Backend (`backend`)** : multi-stage Maven+JRE ; profil `docker`; URL DB injectée via env ; `JWT_SECRET` obligatoire. Prévoir un endpoint santé (ex `/actuator/health`).
- **Web Angular (`web`)** : build Node -> assets nginx. L’URL API est passée via l’argument `API_URL` et écrite dans `assets/runtime-config.js` au démarrage. Ajouter dans `index.html` :  
  `<script src="assets/runtime-config.js"></script>` et lire `window.__RUNTIME_CONFIG__.API_URL`.
- **Identifiants de démo** : utilisateur `demo` / mot de passe `demo` (InMemory). Le secret JWT doit faire au moins 32 caractères (`JWT_SECRET`).

## Bonnes pratiques à prévoir côté code
- Spring Security avec filtres JWT (HMAC basé sur `JWT_SECRET`).
- Validation des schémas d’API (ex. `springdoc-openapi`) et versionnage REST.
- Module d’import des facteurs ADEME : stocker les versions + source (URL/horodatage) pour traçabilité.
- Logs structurés (JSON) + corrélation requête (`X-Request-ID`).
- Séparer les modules par domaine (ex. `emissions`, `users`, `reports`) pour faciliter les évolutions et futures API externes.

## Commandes utiles
- Rebuild complet : `docker compose build --no-cache`
- Purge data Postgres : `docker volume rm hackathon_db_data`
- Logs en direct : `docker compose logs -f backend web db`

# Facturation Interne

Monorepo pour une application de facturation interne.

## Structure

- `apps/frontend` : interface React + Vite
- `apps/backend` : API Express + Prisma

## Démarrage

1. Installer les dépendances à la racine :

```bash
npm install
```

2. Préparer la base Prisma et synchroniser le schéma :

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

La base de données peut être fournie par Docker via PostgreSQL ou par une base distante. Lance la stack Docker avant les commandes Prisma si tu travailles en local.

3. Lancer le frontend et le backend :

```bash
npm run dev
```

## Commandes

- `npm run dev` : lance frontend et backend ensemble
- `npm run dev:backend` : lance uniquement l’API
- `npm run dev:frontend` : lance uniquement le frontend
- `npm run build` : compile les deux workspaces
- `npm run lint` : lance les vérifications disponibles
- `npm test` : lance les tests backend
- `npm run db:generate` : génère le client Prisma
- `npm run db:migrate` : applique les migrations Prisma
- `npm run db:seed` : initialise les paramètres manquants et crée l’administrateur défini par `apps/backend/.env` (`SEED_ADMIN_USERNAME`, `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) uniquement si la base ne contient aucun utilisateur. Le nom, l’adresse e-mail et le nom d’utilisateur ont des valeurs par défaut ; le mot de passe doit être fourni.
- `npm run db:seed:demo` : ajoute des données de démonstration (développement uniquement)
- `npm run docker:up` : démarre PostgreSQL, backend et frontend
- `npm run docker:down` : arrête et retire les conteneurs sans supprimer les données du volume PostgreSQL
- `npm run docker:seed` / `npm run docker:seed:demo` : lance le seed sûr ou le seed de démonstration dans la stack de développement
- `npm run docker:prod:up`, `docker:prod:ps`, `docker:prod:logs`, `docker:prod:down` : commandes de gestion de la stack de production
- `npm run docker:prod:migrate` : applique manuellement les migrations (elles sont aussi appliquées au démarrage)
- `npm run docker:prod:seed` : initialise les paramètres manquants et l’administrateur initial si aucun utilisateur n’existe

## Docker

Lancer la stack complète avec PostgreSQL, backend et frontend :

```bash
npm run docker:up
```

- PostgreSQL : localhost:5432
- Backend : localhost:4000
- Frontend : localhost:5173

Arrêter les services en conservant la base de données :

```bash
npm run docker:down
```

Le seed standard charge `apps/backend/.env` quel que soit le répertoire depuis lequel il est lancé. Il est idempotent et ne réinitialise aucun compte ni aucune donnée déjà présente. Il crée l’administrateur initial uniquement si la base ne contient encore aucun utilisateur et qu’un mot de passe est défini. Les informations de profil peuvent être configurées avec `SEED_ADMIN_USERNAME`, `SEED_ADMIN_NAME` et `SEED_ADMIN_EMAIL` ; les anciennes variables `USERNAME` et `PASSWORD` restent acceptées. Pour ajouter des exemples en développement, lance explicitement `npm run db:seed:demo` ou `npm run docker:seed:demo`. Le seed de démonstration refuse de fonctionner quand `NODE_ENV=production`.

## Déploiement interne en production

La stack de développement utilise Vite. Pour servir l’application en production, utilisez plutôt `docker-compose.production.yml` : le frontend est compilé puis servi par Nginx, qui transmet les requêtes `/api` au backend. PostgreSQL et l’API ne publient aucun port sur l’hôte.

Sur le PC Windows hôte, créez un fichier `.env` à la racine du dépôt (ne le commitez pas) :

```dotenv
POSTGRES_PASSWORD=mot_de_passe_long_alphanumerique
APP_USERNAME=admin
APP_PASSWORD=mot_de_passe_admin_long_et_unique
FRONTEND_BIND_ADDRESS=127.0.0.1
FRONTEND_PORT=8080
```

Dans PowerShell, depuis le dépôt :

```powershell
git pull origin master
npm run docker:prod:up
```

L’application sera disponible localement sur `http://localhost:8080`. Pour la rendre accessible au réseau interne, définissez `FRONTEND_BIND_ADDRESS` dans `.env` sur l’adresse IP LAN fixe ou réservée du PC Windows, puis créez une règle Windows Firewall autorisant le port `FRONTEND_PORT` depuis le sous-réseau interne. Les postes clients accèdent alors à `http://<IP-LAN-DU-SERVEUR>:8080`.

Pour un déploiement pérenne, placez cette adresse derrière un proxy HTTPS avec un certificat de l’entreprise et limitez l’accès au réseau interne. Sauvegardez régulièrement le volume Docker `postgres-data`. Les mots de passe PostgreSQL doivent rester alphanumériques pour éviter les problèmes d’encodage dans l’URL de connexion.

Les ports publiés et les identifiants initiaux peuvent être configurés avec `DB_PORT`, `API_PORT`, `FRONTEND_PORT`, `POSTGRES_PASSWORD`, `APP_USERNAME` et `APP_PASSWORD`. Les valeurs par défaut sont réservées au développement local.

La stack de production applique automatiquement les migrations Prisma avant de démarrer l’API. Les scripts `docker:prod:*` utilisent le fichier Compose de production. Pour arrêter la stack, utilise `npm run docker:prod:down` ; cette commande conserve aussi le volume PostgreSQL. Ne lance pas le seed de démonstration en production.

## Configuration

Le backend lit les variables d’environnement définies dans `apps/backend/.env`.

Copie d’abord `apps/backend/.env.example` vers `apps/backend/.env`, puis ajuste:

- `DATABASE_URL` : connexion Prisma/PostgreSQL
- `PORT` : port du backend, par défaut `4000`
- `USERNAME` et `PASSWORD` : compte bootstrap optionnel si la base est vide
- `NODE_ENV` : active les messages d’erreur détaillés hors production
- `CORS_ORIGINS` : liste séparée par des virgules des origines frontend autorisées (par exemple `https://app.example.com`). En développement, les URLs locales `localhost:5173` et `127.0.0.1:5173` sont utilisées par défaut.

Le frontend peut aussi utiliser des variables Vite:

- `VITE_API_URL` : URL de l’API si elle n’est pas servie sur la même origine
- `VITE_PROXY_TARGET` : cible du proxy de développement Vite

## Données persistées

- Les paramètres de l’entreprise, dont son secteur d’activité, sont stockés dans `WorkspaceSetting`
- Les clients, factures, paiements et compteurs de facture sont persistés via Prisma
- La configuration d’interface reste dans `localStorage` pour le thème et certains brouillons ; le jeton de session est conservé dans un cookie `HttpOnly`.

## Routes

- `/dashboard`
- `/tools`
- `/invoices`
- `/clients`
- `/users`

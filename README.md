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
- `npm run db:generate` : génère le client Prisma
- `npm run db:migrate` : applique les migrations Prisma
- `npm run db:seed` : charge les données de démo
- `npm run docker:up` : démarre PostgreSQL, backend et frontend
- `npm run docker:down` : arrête la stack Docker et supprime les volumes

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

Les ports publiés et les identifiants initiaux peuvent être configurés avec `DB_PORT`, `API_PORT`, `FRONTEND_PORT`, `POSTGRES_PASSWORD`, `APP_USERNAME` et `APP_PASSWORD`. Les valeurs par défaut sont réservées au développement local.

## Configuration

Le backend lit les variables d’environnement définies dans `apps/backend/.env`.

Copie d’abord `apps/backend/.env.example` vers `apps/backend/.env`, puis ajuste:

- `DATABASE_URL` : connexion Prisma/PostgreSQL
- `PORT` : port du backend, par défaut `4000`
- `USERNAME` et `PASSWORD` : compte bootstrap optionnel si la base est vide
- `NODE_ENV` : active les messages d’erreur détaillés hors production

Le frontend peut aussi utiliser des variables Vite:

- `VITE_API_URL` : URL de l’API si elle n’est pas servie sur la même origine
- `VITE_PROXY_TARGET` : cible du proxy de développement Vite

## Données persistées

- Les paramètres de l’entreprise, dont son secteur d’activité, sont stockés dans `WorkspaceSetting`
- Les clients, factures, paiements et compteurs de facture sont persistés via Prisma
- La configuration d’interface reste dans `localStorage` pour le thème et le jeton de session

## Routes

- `/dashboard`
- `/tools`
- `/invoices`
- `/clients`
- `/users`

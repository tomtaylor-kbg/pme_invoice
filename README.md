# Facturation Interne

Monorepo pour une application de facturation interne.

## Structure

- `apps/frontend` : dashboard React + Vite
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

La base de données est fournie par Docker via PostgreSQL. Lance la stack avant les commandes Prisma si tu travailles en local.

3. Lancer le frontend et le backend :

```bash
npm run dev
```

## Docker

Lancer la stack complète avec PostgreSQL, backend et frontend :

```bash
npm run docker:up
```

Arrêter et supprimer les volumes :

```bash
npm run docker:down
```

## Configuration

Le backend lit les variables d’environnement définies dans `apps/backend/.env`.

## Routes

- `/dashboard`
- `/tools`
- `/receipts`
- `/invoices`
- `/clients`
- `/users`

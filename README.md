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

3. Lancer le frontend et le backend :

```bash
npm run dev
```

## Docker

Lancer la stack complète :

```bash
npm run docker:up
```

Arrêter et supprimer les volumes :

```bash
npm run docker:down
```

## Identifiants de démo

Le backend lit les variables suivantes dans `apps/backend/.env` :

- `USERNAME=admin`
- `PASSWORD=changeme`

## Routes

- `/dashboard`
- `/invoices`
- `/clients`
- `/users`

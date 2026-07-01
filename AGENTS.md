# Repository Guidelines

## Project Structure & Module Organization
This is an npm workspace monorepo with two apps:

- `apps/frontend/`: React 19 + Vite UI
- `apps/backend/`: Express API with Prisma

Frontend source lives in `apps/frontend/src/` (`main.jsx`, `App.jsx`, `api.js`, `styles.css`). Backend source lives in `apps/backend/src/` (`server.js`, `auth.js`, `prisma.js`). Database schema and seed logic are in `apps/backend/prisma/`. Dockerfiles are kept next to each app.

## Build, Test, and Development Commands
Run commands from the repository root:

- `npm install`: install workspace dependencies
- `npm run dev`: start backend and frontend together
- `npm run dev:backend`: run only the API server
- `npm run dev:frontend`: run only the Vite app
- `npm run build`: build both workspaces
- `npm run lint`: run each workspace lint script
- `npm run db:generate`: generate Prisma client
- `npm run db:migrate`: push the Prisma schema to the database
- `npm run db:seed`: load demo data
- `npm run docker:up`: build and start the Docker stack

## Coding Style & Naming Conventions
Use the existing style in each app. Frontend files use ES modules and React function components; backend files use CommonJS. Keep indentation consistent with surrounding code, prefer clear camelCase for variables/functions, and use PascalCase for React components. Name feature files by purpose, such as `InvoiceList.jsx` or `auth.js`.

## Testing Guidelines
No automated test framework is configured yet. If you add tests, place them near the code or in a dedicated `tests/` area and name them by behavior, such as `auth.spec.js` or `server.test.js`. Until a test suite exists, verify changes by running the relevant app and checking the affected routes manually.

## Commit & Pull Request Guidelines
The Git history currently shows only a single initial commit, so no commit convention is established. Use short, imperative commit messages, for example `Add invoice filter`. For pull requests, include a brief summary, the scope of the change, setup or migration steps, and screenshots for UI work.

## Security & Configuration Tips
Backend demo credentials are read from `apps/backend/.env`. Do not commit secrets or local database credentials. Update Prisma files together: schema changes, generated client, and seed data should stay in sync.

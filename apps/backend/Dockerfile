FROM node:20-alpine

WORKDIR /app

ENV DATABASE_URL=file:/app/data/dev.db

COPY apps/backend/package.json ./package.json

RUN npm install

COPY apps/backend/prisma ./prisma
COPY apps/backend/src ./src

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npm start"]

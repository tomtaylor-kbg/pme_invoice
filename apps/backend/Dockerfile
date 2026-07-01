FROM node:20-alpine

WORKDIR /app

COPY apps/backend/package.json ./package.json

RUN npm install

COPY apps/backend/prisma ./prisma
COPY apps/backend/src ./src

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && npm start"]

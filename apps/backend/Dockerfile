FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && npm start"]

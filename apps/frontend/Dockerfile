FROM node:20-alpine

WORKDIR /app

COPY apps/frontend/package.json ./package.json

RUN npm install

COPY apps/frontend/index.html ./index.html
COPY apps/frontend/vite.config.js ./vite.config.js
COPY apps/frontend/src ./src

EXPOSE 5173

CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0"]


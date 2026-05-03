FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/ .
COPY data/ ./data/
COPY frontend/ ./public/

EXPOSE 4100

CMD ["sh", "-c", "npx prisma migrate deploy && node src/seed.js && node src/index.js"]

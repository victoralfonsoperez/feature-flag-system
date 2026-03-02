FROM node:20-slim AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/api/package.json packages/api/

RUN npm install --workspace=packages/api

COPY packages/api packages/api

RUN npm run build --workspace=packages/api

EXPOSE 3100
CMD ["node", "packages/api/dist/server.js"]

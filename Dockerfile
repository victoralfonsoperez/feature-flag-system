FROM node:24-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY packages/api/package.json packages/api/

RUN npm install --workspace=packages/api

COPY packages/api packages/api

RUN npm run build --workspace=packages/api

FROM node:24-slim
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/api ./packages/api

EXPOSE 3100
CMD ["node", "packages/api/dist/server.js"]

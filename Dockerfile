FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json packages/api/

RUN pnpm install --filter @feature-flags/api --frozen-lockfile

COPY packages/api packages/api

RUN pnpm --filter @feature-flags/api run build

FROM node:24-slim
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/api ./packages/api

ENV NODE_OPTIONS="--dns-result-order=ipv4first"
EXPOSE 3100
CMD ["node", "packages/api/dist/server.js"]

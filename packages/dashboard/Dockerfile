FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_CALLBACK_URL=http://localhost:3200

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/dashboard/package.json packages/dashboard/

RUN pnpm install --filter @feature-flags/dashboard --frozen-lockfile

COPY packages/dashboard packages/dashboard

RUN pnpm --filter @feature-flags/dashboard run build

FROM nginx:alpine
COPY --from=build /app/packages/dashboard/dist /usr/share/nginx/html
COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

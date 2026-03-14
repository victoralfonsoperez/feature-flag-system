FROM node:24-slim AS build
WORKDIR /app

ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_CALLBACK_URL=http://localhost:3200

COPY package.json package-lock.json* ./
COPY packages/dashboard/package.json packages/dashboard/

RUN npm install --workspace=packages/dashboard

COPY packages/dashboard packages/dashboard

RUN npm run build --workspace=packages/dashboard

FROM nginx:alpine
COPY --from=build /app/packages/dashboard/dist /usr/share/nginx/html
COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

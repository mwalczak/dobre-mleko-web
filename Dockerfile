FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Another map style: --build-arg VITE_MAP_STYLE=<style.json URL>, and add its hosts to MAP_ORIGINS.
ARG VITE_MAP_STYLE
ARG VITE_GEOCODER_URL
RUN npm run build

FROM nginx:1.28-alpine
RUN apk upgrade --no-cache
# API_UPSTREAM: where /api and /files go (the API's in-cluster service by default).
# MAP_ORIGINS: hosts the map style and tiles load from; GEOCODER_ORIGIN: the place search (Photon). Both for the
# CSP's connect-src, so they must match VITE_MAP_STYLE and VITE_GEOCODER_URL.
ENV API_UPSTREAM=http://api.dobre-mleko.svc.cluster.local \
    MAP_ORIGINS=https://tiles.openfreemap.org \
    GEOCODER_ORIGIN=https://photon.komoot.io \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

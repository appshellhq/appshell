# syntax=docker/dockerfile:1.7
# =============================================================================
# Appshell example micro-frontends
#
# One parameterised build for every app in the workspace, after the pattern in
# navaris/platform-services: adding a micro-frontend requires no Dockerfile change.
#
#   docker build --build-arg APP_DIR=sample-mfe-ping -t ghcr.io/appshellhq/sample-mfe-ping .
#
# The output is static — remoteEntry.js and its chunks — so unlike a Next.js service
# there is no server in the build. nginx-unprivileged supplies one: non-root by
# construction, writing only under /tmp, which is what lets the deployment keep
# readOnlyRootFilesystem.
# =============================================================================

FROM node:22-alpine AS base
WORKDIR /appshell

# ---------------------------------------------------------------------------
# deps — install once for the whole workspace
#
# Manifests are discovered rather than listed. The previous Dockerfile copied each
# app's package.json by name, so a fourth micro-frontend would have built against a
# lock file that never mentioned it — an omission nothing would have reported.
# ---------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN --mount=type=bind,source=apps,target=/src/apps,readonly \
    --mount=type=bind,source=packages,target=/src/packages,readonly \
    find /src/apps /src/packages -mindepth 2 -maxdepth 2 -type f -name package.json | sort | \
      while read -r manifest; do \
        rel="${manifest#/src/}"; \
        mkdir -p "$(dirname "$rel")"; \
        cp "$manifest" "$rel"; \
      done
RUN npm ci

# ---------------------------------------------------------------------------
# build — the shared component library, then the one app being imaged
# ---------------------------------------------------------------------------
FROM deps AS build
ARG APP_DIR
RUN test -n "$APP_DIR" || (echo "APP_DIR is required, e.g. --build-arg APP_DIR=sample-mfe-ping" && false)
COPY . .
RUN npm run build --workspace packages/components
RUN npm run build --workspace "apps/${APP_DIR}"

# ---------------------------------------------------------------------------
# runtime — nginx serving that app's dist, and nothing else
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ARG APP_DIR
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /appshell/apps/${APP_DIR}/dist /usr/share/nginx/html

# Matches the port every other frontend on the platform listens on.
EXPOSE 3000

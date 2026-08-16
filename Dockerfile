### BASE
FROM node:22-alpine AS base
LABEL maintainer="Robert Hamilton <rh@navaris.com>"
WORKDIR /appshell

# Install global dependencies (cached layer)
RUN npm install -g dotenv-cli serve npm-run-all

# Declare build-time variables with defaults
ARG APPSHELL_PORT=3030
ARG APPSHELL_REGISTRY=/appshell/appshell_registry
ARG APPSHELL_BASE_REGISTRY=
ARG APPSHELL_ROOT=Appshell/Root
ARG APPSHELL_PUBLIC_URL=
ARG APPSHELL_ENV_PREFIX=
ARG APPSHELL_ROOT_PROPS={}
ARG APPSHELL_PRIMARY_COLOR=#8ed6fb
ARG APPSHELL_THEME_COLOR=#282c34
ARG APPSHELL_API_KEY_HEADER=x-api-key
ARG APPSHELL_PROXY_URL=
ARG ENV_TARGET=production
ARG APPSHELL_CONTAINER_COMMAND=

# Setup environment variables
ENV APPSHELL_PORT=${APPSHELL_PORT}
ENV APPSHELL_REGISTRY=${APPSHELL_REGISTRY}
ENV APPSHELL_BASE_REGISTRY=${APPSHELL_BASE_REGISTRY}
ENV APPSHELL_ROOT=${APPSHELL_ROOT}
ENV APPSHELL_PUBLIC_URL=${APPSHELL_PUBLIC_URL}
ENV APPSHELL_ENV_PREFIX=${APPSHELL_ENV_PREFIX}
ENV APPSHELL_ROOT_PROPS=${APPSHELL_ROOT_PROPS}
ENV APPSHELL_CONFIG_URL=${APPSHELL_PUBLIC_URL}/appshell.config.json
ENV APPSHELL_PRIMARY_COLOR=${APPSHELL_PRIMARY_COLOR}
ENV APPSHELL_THEME_COLOR=${APPSHELL_THEME_COLOR}
ENV APPSHELL_API_KEY_HEADER=${APPSHELL_API_KEY_HEADER}
ENV APPSHELL_PROXY_URL=${APPSHELL_PROXY_URL}
ENV ENV_TARGET=${ENV_TARGET}
ENV APPSHELL_CONTAINER_COMMAND=${APPSHELL_CONTAINER_COMMAND}

EXPOSE ${APPSHELL_PORT}

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["ln -sf /appshell/${ENV_TARGET}.env .env && [ -e ./appshell_registry ] || ln -sf /appshell/appshell_registry . && ${APPSHELL_CONTAINER_COMMAND}"]

### DEPENDENCIES — copy lockfile first for layer caching
FROM base AS dependencies
COPY package.json package-lock.json ./
COPY packages/cli/package.json ./packages/cli/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/loader/package.json ./packages/loader/
COPY packages/manifest-webpack-plugin/package.json ./packages/manifest-webpack-plugin/
COPY packages/react/package.json ./packages/react/
COPY packages/react-host/package.json ./packages/react-host/
COPY packages/react-refresh-singleton-plugin/package.json ./packages/react-refresh-singleton-plugin/
RUN npm ci

# Copy source after install to preserve npm cache layer
COPY . .

### BUILD — skip lint/test (already validated in CI build job)
FROM dependencies AS build
RUN npm run build

### RELEASE
FROM base AS production
ARG SOURCE_DIR
ARG APPSHELL_CONTAINER_COMMAND='npm run serve'
ENV SOURCE_DIR=${SOURCE_DIR}
ENV APPSHELL_CONTAINER_COMMAND=${APPSHELL_CONTAINER_COMMAND}

RUN npm install -g dotenv-cli

WORKDIR /appshell/${SOURCE_DIR}

COPY --from=build /appshell/${SOURCE_DIR}/package.json .
COPY --from=build /appshell/${SOURCE_DIR}/dist ./dist
COPY --from=build /appshell/node_modules /appshell/node_modules

COPY --from=build /appshell/packages/cli /appshell/packages/cli
RUN npm install -g file:/appshell/packages/cli
RUN npm install --omit=dev


### DEVELOPMENT
FROM base AS developer
ARG SOURCE_DIR
ARG APPSHELL_CONTAINER_COMMAND='npm run serve:developer'
ENV SOURCE_DIR=${SOURCE_DIR}
ENV APPSHELL_CONTAINER_COMMAND=${APPSHELL_CONTAINER_COMMAND}

WORKDIR /appshell/${SOURCE_DIR}

COPY --from=build /appshell/package.json /appshell/package.json
COPY --from=build /appshell/tsconfig.json /appshell/tsconfig.json
COPY --from=build /appshell/lerna.json /appshell/lerna.json
COPY --from=build /appshell/packages /appshell/packages
COPY --from=build /appshell/node_modules /appshell/node_modules

RUN npm install -g file:/appshell/packages/cli

# Overwrite production build with development build
RUN npm run build:development

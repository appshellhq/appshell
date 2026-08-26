### BASE
FROM node:22-alpine AS base
LABEL maintainer "Robert Hamilton <rh@navaris.com>"

# Set the working directory
WORKDIR /appshell

### DEPENDENCIES
FROM base AS dependencies
RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
COPY apps/sample-mfe-container/package.json apps/sample-mfe-container/
COPY apps/sample-mfe-ping/package.json apps/sample-mfe-ping/
COPY apps/sample-mfe-pong/package.json apps/sample-mfe-pong/
COPY packages/components/package.json packages/components/
RUN npm ci

# Copy remaining source
COPY . .

### BUILD
FROM dependencies as build
RUN npm run build

### DEVELOPMENT
FROM build AS development

# Environment
ENV APPSHELL_REGISTRY=${APPSHELL_REGISTRY:-'http://host.docker.internal:7150'}
ENV CONTAINER_COMMAND=${CONTAINER_COMMAND:-'npm run serve'}

ENV SAMPLE_MFE_CONTAINER_PORT=${SAMPLE_MFE_CONTAINER_PORT:-3000}
ENV SAMPLE_MFE_PING_PORT=${SAMPLE_MFE_PING_PORT:-3001}
ENV SAMPLE_MFE_PONG_PORT=${SAMPLE_MFE_PONG_PORT:-3002}

# Expose application ports
EXPOSE ${SAMPLE_MFE_CONTAINER_PORT}
EXPOSE ${SAMPLE_MFE_PING_PORT}
EXPOSE ${SAMPLE_MFE_PONG_PORT}

CMD ["sh", "-c", "${CONTAINER_COMMAND}"]

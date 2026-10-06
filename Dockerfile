FROM node:24.19.0 AS builder
WORKDIR /app
COPY package.json package-lock.json ./

# Docker's build network often resets a long registry download. Prefer IPv4,
# keep npm's own retries long, and start a clean install again if one dies.
ENV NODE_OPTIONS=--dns-result-order=ipv4first \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000

RUN --mount=type=cache,target=/root/.npm \
    set -eu; \
    for attempt in 1 2 3; do \
      rm -rf node_modules; \
      if npm ci; then \
        exit 0; \
      fi; \
      echo "npm ci failed (attempt ${attempt}), retrying..."; \
      sleep $((attempt * 5)); \
    done; \
    exit 1

COPY . ./
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

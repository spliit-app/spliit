FROM node:24-alpine AS base

WORKDIR /usr/app
COPY ./package.json \
     ./package-lock.json \
     ./next.config.mjs \
     ./prisma.config.ts \
     ./tsconfig.json \
     ./reset.d.ts \
     ./tailwind.config.js \
     ./postcss.config.js ./
COPY ./scripts ./scripts
COPY ./prisma ./prisma

# Install build dependencies for better-sqlite3 native addon
RUN apk add --no-cache openssl python3 make g++ && \
    for i in 1 2 3 4 5; do \
      npm ci --ignore-scripts --fetch-retries=5 --fetch-timeout=600000 && exit 0; \
      echo "npm ci failed (attempt $i of 5), retrying in 10s..."; \
      sleep 10; \
    done; \
    exit 1

COPY ./src ./src
COPY ./messages ./messages

# Prisma 7 generates the client into ./src/generated/prisma instead of
# node_modules, so this has to run after the source tree is in place.
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

COPY scripts/build.env .env
RUN npm run build

# Next.js copies .env into the standalone output. Drop it.
RUN rm -f .next/standalone/.env

# The standalone output traces its own dependencies, but needs Prisma CLI and SQLite adapter
# at container start to run `prisma db push`.
FROM node:24-alpine AS prisma-cli

WORKDIR /opt/prisma-cli
ENV CHECKPOINT_DISABLE=1
RUN apk add --no-cache openssl python3 make g++
COPY --from=base /usr/app/node_modules/prisma/package.json ./_prisma.json
RUN PRISMA_VERSION="$(node -p "require('./_prisma.json').version")" && \
    rm -f ./_prisma.json && \
    npm init -y > /dev/null && \
    for i in 1 2 3 4 5; do \
      npm install --no-audit --no-fund --fetch-retries=5 \
        --fetch-timeout=600000 "prisma@${PRISMA_VERSION}" "@prisma/adapter-better-sqlite3" "better-sqlite3" && exit 0; \
      echo "prisma install failed (attempt $i of 5), retrying in 10s..."; \
      sleep 10; \
    done; \
    exit 1

FROM node:24-alpine AS runner

EXPOSE 3000/tcp
WORKDIR /usr/app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apk add --no-cache openssl

# The traced server, plus static assets and public/
COPY --from=base /usr/app/.next/standalone ./
COPY --from=base /usr/app/.next/static ./.next/static
COPY ./public ./public

# prisma config and schema
COPY --from=base /usr/app/prisma ./prisma
COPY --from=base /usr/app/prisma.config.ts ./
COPY --from=prisma-cli /opt/prisma-cli/node_modules ./node_modules
COPY ./scripts ./scripts

ENTRYPOINT ["/bin/sh", "/usr/app/scripts/container-entrypoint.sh"]

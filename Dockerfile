FROM node:26-alpine AS base

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

# The registry occasionally resets a connection mid-install, which fails the
# whole image build for a reason that has nothing to do with the code. Retry a
# few times before giving up.
RUN apk add --no-cache openssl && \
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

# Next.js copies .env into the standalone output, which would ship the mocked
# build values (a database URL pointing at `db`, placeholder S3 and OpenAI
# credentials) inside the image. Real configuration comes from the container
# environment and would win, but a variable the operator *forgot* to set would
# silently resolve to a build placeholder instead of failing. Drop it.
RUN rm -f .next/standalone/.env

# The standalone output traces its own dependencies, so the runtime stage no
# longer installs a production node_modules. What it does still need is the
# Prisma CLI, to run `migrate deploy` at container start — and the CLI is not
# part of the app's module graph, so nothing traces it.
#
# It gets its own isolated install rather than being copied out of the base
# stage: that stage installs with --ignore-scripts (the repo's postinstall runs
# migrate deploy, which cannot run at build time), so @prisma/engines never
# downloads the schema engine that `migrate deploy` needs. Installing the same
# version here, with scripts, produces a complete self-contained CLI.
FROM node:26-alpine AS prisma-cli

WORKDIR /opt/prisma-cli
ENV CHECKPOINT_DISABLE=1
RUN apk add --no-cache openssl
COPY --from=base /usr/app/node_modules/prisma/package.json ./_prisma.json
RUN PRISMA_VERSION="$(node -p "require('./_prisma.json').version")" && \
    rm -f ./_prisma.json && \
    npm init -y > /dev/null && \
    for i in 1 2 3 4 5; do \
      npm install --no-audit --no-fund --fetch-retries=5 \
        --fetch-timeout=600000 "prisma@${PRISMA_VERSION}" && exit 0; \
      echo "prisma install failed (attempt $i of 5), retrying in 10s..."; \
      sleep 10; \
    done; \
    exit 1

FROM node:26-alpine AS runner

EXPOSE 3000/tcp
WORKDIR /usr/app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The standalone server binds to localhost by default, which is unreachable
# from outside the container.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apk add --no-cache openssl

# The traced server, plus the two things tracing cannot know about: the static
# assets it serves and the public/ directory.
COPY --from=base /usr/app/.next/standalone ./
COPY --from=base /usr/app/.next/static ./.next/static
COPY ./public ./public

# prisma.config.ts carries the connection URLs that used to live in
# schema.prisma; `prisma migrate deploy` reads it at container start.
COPY --from=base /usr/app/prisma ./prisma
COPY --from=base /usr/app/prisma.config.ts ./
COPY --from=prisma-cli /opt/prisma-cli/node_modules ./node_modules
COPY ./scripts ./scripts

ENTRYPOINT ["/bin/sh", "/usr/app/scripts/container-entrypoint.sh"]

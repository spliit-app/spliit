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

RUN rm -r .next/cache

FROM node:24-alpine AS runtime-deps

WORKDIR /usr/app
COPY --from=base /usr/app/package.json /usr/app/package-lock.json /usr/app/next.config.mjs ./
COPY --from=base /usr/app/prisma ./prisma

# No `prisma generate` here: the generated client is bundled into .next by the
# build, and regenerating would need the source tree this stage does not have.
RUN npm ci --omit=dev --ignore-scripts

FROM node:24-alpine AS runner

EXPOSE 3000/tcp
WORKDIR /usr/app

# prisma.config.ts carries the connection URLs that used to live in
# schema.prisma; `prisma migrate deploy` reads it at container start.
COPY --from=base /usr/app/package.json /usr/app/package-lock.json /usr/app/next.config.mjs /usr/app/prisma.config.ts ./
COPY --from=runtime-deps /usr/app/node_modules ./node_modules
COPY ./public ./public
COPY ./scripts ./scripts
COPY --from=base /usr/app/prisma ./prisma
COPY --from=base /usr/app/.next ./.next

ENTRYPOINT ["/bin/sh", "/usr/app/scripts/container-entrypoint.sh"]

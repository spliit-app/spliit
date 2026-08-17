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

RUN apk add --no-cache openssl && \
    npm ci --ignore-scripts

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

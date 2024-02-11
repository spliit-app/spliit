FROM node:21-alpine as base

WORKDIR /usr/app
COPY ./package.json \
     ./package-lock.json \
     ./next.config.js \
     ./tsconfig.json \
     ./reset.d.ts \
     ./tailwind.config.js \
     ./postcss.config.js ./
COPY ./prisma ./prisma
COPY ./src ./src

RUN apk add --no-cache openssl && \
    npm ci --ignore-scripts && \
    npx prisma generate

# env vars needed for build not to fail
ENV POSTGRES_PRISMA_URL=http://temporary.build.url
ENV POSTGRES_URL_NON_POOLING=http://temporary.build.url

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

RUN rm -r .next/cache

FROM node:21-alpine as runtime-deps

WORKDIR /usr/app
COPY --from=base /usr/app/package.json /usr/app/package-lock.json ./
COPY --from=base /usr/app/prisma ./prisma

RUN npm ci --omit=dev --omit=optional --ignore-scripts && \
    npx prisma generate

FROM node:21-alpine as runner

EXPOSE 3000/tcp
WORKDIR /usr/app

COPY --from=base /usr/app/package.json /usr/app/package-lock.json ./
COPY --from=runtime-deps /usr/app/node_modules ./node_modules
COPY ./public ./public
COPY ./scripts ./scripts
COPY --from=base /usr/app/prisma ./prisma
COPY --from=base /usr/app/.next ./.next

ENTRYPOINT ["/bin/sh", "/usr/app/scripts/container-entrypoint.sh"]

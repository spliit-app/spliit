FROM node:21-alpine as base

WORKDIR /usr/app
COPY ./package.json \
     ./package-lock.json \
     ./next.config.js \
     ./tsconfig.json \
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
RUN apk add --no-cache zstd
COPY --from=base /usr/app/package.json /usr/app/package-lock.json ./
COPY --from=base /usr/app/.next ./.next
COPY --from=base /usr/app/prisma ./prisma
COPY ./public ./public

RUN npm ci --omit=dev --omit=optional --ignore-scripts && \
    npx prisma generate

RUN tar cvf - . | zstd -o app.tar.zst

FROM node:21-alpine as runner

WORKDIR /usr/app
RUN apk add --no-cache zstd

COPY ./scripts ./scripts
COPY --from=runtime-deps /usr/app/app.tar.zst ./app.tar.zst

EXPOSE 3000/tcp

ENTRYPOINT ["/bin/sh", "/usr/app/scripts/container-entrypoint.sh"]

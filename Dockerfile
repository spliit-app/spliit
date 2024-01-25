FROM node:21-slim as base

EXPOSE 3000/tcp
WORKDIR /usr/app
COPY ./ ./

RUN apt update && \
    apt install openssl -y && \
    apt clean && \
    apt autoclean && \
    apt autoremove && \
    npm ci --ignore-scripts && \
    npm install -g prisma && \
    prisma generate


FROM base as build
WORKDIR /usr/app

# env vars needed for build not to fail
ARG POSTGRES_PRISMA_URL
ARG POSTGRES_URL_NON_POOLING

RUN npm run build


FROM build as production
WORKDIR /usr/app
ENTRYPOINT ["/usr/app/scripts/container-entrypoint.sh"]


FROM base as development
WORKDIR /usr/app
ENTRYPOINT ["/usr/app/scripts/container-entrypoint.sh"]
CMD ["dev"]

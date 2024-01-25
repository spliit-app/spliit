FROM node:21-slim as base

EXPOSE 3000/tcp
WORKDIR /usr/app
COPY ./ ./

RUN apt update && \
    apt install openssl -y && \
    apt clean && \
    apt autoclean && \
    apt autoremove

RUN npm ci --ignore-scripts
RUN npm install -g prisma
RUN prisma generate


FROM base as build
WORKDIR /usr/app

# env vars needed for build not to fail
ARG POSTGRES_PRISMA_URL
ARG POSTGRES_URL_NON_POOLING

RUN npm run build


FROM build as production
WORKDIR /usr/app
CMD ["npm", "run", "start"]


FROM base as development
WORKDIR /usr/app
CMD ["/bin/bash", "-c", "scripts/image-startup.sh"]

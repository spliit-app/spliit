FROM node:21-slim as base

EXPOSE 3000/tcp
WORKDIR /usr/app
COPY ./ ./

# remove any local env files and replace with build.env
RUN rm .env*
COPY scripts/build.env .env

RUN apt update && \
    apt install openssl -y && \
    apt clean && \
    apt autoclean && \
    apt autoremove && \
    npm ci --ignore-scripts && \
    npm install -g prisma && \
    prisma generate

RUN npm run build

ENTRYPOINT ["/usr/app/scripts/container-entrypoint.sh"]

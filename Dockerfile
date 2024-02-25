ARG SPLIIT_NODE_VERSION="21-alpine"

FROM node:${SPLIIT_NODE_VERSION}

ARG SPLIIT_APP_NAME="spliit2"
ARG SPLIIT_VERSION=""
ARG SPLIIT_DEST_DIR="./"

WORKDIR /usr/app

COPY ${SPLIIT_DEST_DIR} ./
COPY ./scripts/container-entrypoint.sh ./

RUN apk add --no-cache openssl

ENV NEXT_TELEMETRY_DISABLED=1
ENV SPLIIT_APP_NAME=${SPLIIT_APP_NAME}
ENV SPLIIT_VERSION=${SPLIIT_VERSION}

EXPOSE 3000/tcp

ENTRYPOINT ["/bin/sh", "/usr/app/container-entrypoint.sh"]

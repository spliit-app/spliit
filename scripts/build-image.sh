#!/bin/bash

if [ -f container.env.example ]; then
    set -a
    source container.env.example
    set +a
else
    echo "container.env.example needed to build"
    exit
fi

SPLIIT_APP_NAME=$(node -p -e "require('./package.json').name")
SPLIIT_VERSION=$(node -p -e "require('./package.json').version")

if [[ $1 == 'dev' ]]; then
    TARGET=development
else
    TARGET=production
fi

docker buildx build \
    --no-cache \
    --build-arg POSTGRES_PRISMA_URL\
    --build-arg POSTGRES_URL_NON_POOLING\
    -t ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} \
    -t ${SPLIIT_APP_NAME}:latest \
    --target ${TARGET} \
    .

docker image prune -f

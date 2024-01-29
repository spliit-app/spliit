#!/bin/bash

SPLIIT_APP_NAME=$(node -p -e "require('./package.json').name")
SPLIIT_VERSION=$(node -p -e "require('./package.json').version")

# we need to set dummy data for POSTGRES env vars in order for build not to fail
docker buildx build \
    --no-cache \
    --build-arg POSTGRES_PRISMA_URL=postgresql://build:@db \
    --build-arg POSTGRES_URL_NON_POOLING=postgresql://build:@db \
    -t ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} \
    -t ${SPLIIT_APP_NAME}:latest \
    .

docker image prune -f

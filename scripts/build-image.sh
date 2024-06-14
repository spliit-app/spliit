#!/bin/bash

SPLIIT_APP_NAME=$(node -p -e "require('./package.json').name")
SPLIIT_VERSION=$(node -p -e "require('./package.json').version")

# we need to set dummy data for POSTGRES env vars in order for build not to fail
docker buildx build \
    -t ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} \
    -t ${SPLIIT_APP_NAME}:latest \
    .

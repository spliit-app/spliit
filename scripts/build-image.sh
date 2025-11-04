#!/bin/bash

KNOT_APP_NAME=$(node -p -e "require('./package.json').name")
KNOT_VERSION=$(node -p -e "require('./package.json').version")

# we need to set dummy data for POSTGRES env vars in order for build not to fail
docker buildx build \
    -t ${KNOT_APP_NAME}:${KNOT_VERSION} \
    -t ${KNOT_APP_NAME}:latest \
    .

docker image prune -f

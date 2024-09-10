#!/bin/bash

SPLIIT_APP_NAME=$(cat ./package.json | grep name | awk '{print $2}' | sed -r s/\"\,?//g)
SPLIIT_VERSION=$(cat ./package.json | grep version | awk '{print $2}' | sed -r s/\"\,?//g)

# we need to set dummy data for POSTGRES env vars in order for build not to fail
docker buildx build \
    -t ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} \
    -t ${SPLIIT_APP_NAME}:latest \
    .

docker image prune -f

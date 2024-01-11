#!/bin/bash

SPLIIT_APP_NAME=$(node -p -e "require('./package.json').name")
SPLIIT_VERSION=$(node -p -e "require('./package.json').version")

docker buildx build --no-cache -t ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} -t ${SPLIIT_APP_NAME}:latest .

docker image prune -f

#!/bin/bash

source scripts/set-env.sh

if [ ! -d "${SPLIIT_DEST_DIR}" ]; then
    echo "Build folder ${SPLIIT_DEST_DIR} not found"
    exit 1
fi

mkdir -p ${SPLIIT_DIST_FOLDER}

docker buildx   build \
                --no-cache \
                --build-arg "SPLIIT_APP_NAME=${SPLIIT_APP_NAME}" \
                --build-arg "SPLIIT_VERSION=${SPLIIT_VERSION}" \
                --build-arg "SPLIIT_DEST_DIR=${SPLIIT_DEST_DIR}" \
                --build-arg "SPLIIT_NODE_VERSION=${SPLIIT_NODE_VERSION}" \
                -t ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} \
                -t ${SPLIIT_APP_NAME}:latest .
docker save ${SPLIIT_APP_NAME}:${SPLIIT_VERSION} > ./${SPLIIT_DIST_FOLDER}/${SPLIIT_APP_NAME}-${SPLIIT_VERSION}-docker.tar.gz

docker image prune -f

#!/bin/bash

export SPLIIT_NODE_VERSION="21-alpine"

export SPLIIT_TMP_DIR=tmp
export SPLIIT_DIST_FOLDER=dist

export SPLIIT_APP_NAME=$(node -p -e "require('./package.json').name")
export SPLIIT_COMMIT_HASH=$(git rev-parse --short HEAD)

VERSION=$(node -p -e "require('./package.json').version")

export SPLIIT_DEST_DIR=./${SPLIIT_TMP_DIR}/${SPLIIT_APP_NAME}

# Get version based on release type
if [ ! -z ${SPLIIT_RELEASE_TYPE+x} ]; then
    if [ "${SPLIIT_RELEASE_TYPE}" = "prod" ]; then
        export SPLIIT_VERSION=${VERSION}
    elif [ "${SPLIIT_RELEASE_TYPE}" = "nightly" ]; then
        export SPLIIT_VERSION=${VERSION}-${SPLIIT_COMMIT_HASH}
    else
        echo "First argument must be either \"prod\" or \"nightly\""
        exit 1
    fi
elif [ -d ${SPLIIT_DEST_DIR} ]; then
    export SPLIIT_VERSION=$(node -p -e "require('${SPLIIT_DEST_DIR}/package.json').version")
fi

export SPLIIT_RELEASE_NAME=${SPLIIT_APP_NAME}-${SPLIIT_VERSION}

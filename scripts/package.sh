#!/bin/bash

source scripts/set-env.sh

if [ ! -d "${SPLIIT_DEST_DIR}" ]; then
    echo "Build folder ${SPLIIT_DEST_DIR} not found"
    exit 1
fi

mkdir -p ${SPLIIT_DIST_FOLDER}

tar -zcvf ./${SPLIIT_DIST_FOLDER}/${SPLIIT_RELEASE_NAME}.tar.gz -C ./${SPLIIT_TMP_DIR} ${SPLIIT_APP_NAME}

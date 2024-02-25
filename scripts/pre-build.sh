#!/bin/bash

ENV_FILE=".env"
EXAMPLE_ENV_FILE=".env.example"
NEXT_BUILD_DIR=.next

export SPLIIT_RELEASE_TYPE=$1
source scripts/set-env.sh

# Create env file if not exists
if [ ! -f "${ENV_FILE}" ]; then  
    echo "Missing ${ENV_FILE} file, creating it from ${EXAMPLE_ENV_FILE}"
    cat "${EXAMPLE_ENV_FILE}" > ${ENV_FILE}
fi

# Get dependencies and build
npm i
npx prisma generate
npx next build

# Package
if [ -d ${SPLIIT_DEST_DIR} ]; then
    rm -rf ${SPLIIT_DEST_DIR}
else
    mkdir -p ${SPLIIT_DEST_DIR}
fi

mv ./${NEXT_BUILD_DIR} ${SPLIIT_DEST_DIR}
rm -rf ${NEXT_BUILD_DIR}
rm -rf ${SPLIIT_DEST_DIR}/.next/cache
cp package.json package-lock.json ${SPLIIT_DEST_DIR}
if [ "${SPLIIT_RELEASE_TYPE}" = "nightly" ]; then
    sed -i "s/\s*\"version\":.*/  \"version\":\"${SPLIIT_VERSION}\",/" ${SPLIIT_DEST_DIR}/package.json
fi
PROJECT_DIR=$(pwd)
cp -r ./prisma ${SPLIIT_DEST_DIR}
cp -r ./public ${SPLIIT_DEST_DIR}
cp LICENSE README.md ${SPLIIT_DEST_DIR}
cd ${SPLIIT_DEST_DIR}
npm ci --omit=dev --omit=optional --ignore-scripts
npx prisma generate
cd ${PROJECT_DIR}

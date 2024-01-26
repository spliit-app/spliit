#!/bin/bash

ENV_FILE=".env"
EXAMPLE_ENV_FILE=".env.example"

if [ ! -f "${ENV_FILE}" ]; then  
    echo "Missing ${ENV_FILE} file, creating it from ${EXAMPLE_ENV_FILE}"
    cat "${EXAMPLE_ENV_FILE}" > ${ENV_FILE}
fi

npm i
npx prisma generate
npx next build

mkdir -p spliit
mv ./.next ./spliit
cp -r ./node_modules ./spliit/.next
cp LICENSE ./spliit
cp README.md ./spliit

tar -zcvf spliit.tar.gz ./spliit
rm -rf ./spliit

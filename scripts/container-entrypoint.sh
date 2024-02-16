#!/bin/sh

set -euxo pipefail

echo ${SPLIIT_APP_NAME} v${SPLIIT_VERSION}

npx prisma migrate deploy
npx next start

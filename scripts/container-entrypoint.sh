#!/bin/bash

set -euxo pipefail

if [[ -f "app.tar.zst" ]]; then
  zstd -d app.tar.zst -c | tar xf -
  rm app.tar.zst
fi

npx prisma migrate deploy
npm run start

#!/bin/bash

set -euxo pipefail

npx prisma migrate deploy
npm run start

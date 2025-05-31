#!/bin/bash

set -euxo pipefail

npx prisma migrate deploy
exec npm run start

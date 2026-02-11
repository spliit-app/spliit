#!/bin/bash

set -euxo pipefail

npx prisma migrate deploy --schema "prisma/$DATABASE_PROVIDER"
exec npm run start

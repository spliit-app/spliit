#!/bin/bash

set -euxo pipefail

# Invoke the Prisma CLI by path: the standalone image has no package.json
# scripts and no .bin on PATH, so `npx prisma` would try to fetch it.
node node_modules/prisma/build/index.js migrate deploy

# The standalone build's own server entry point, in place of `next start`.
exec node server.js

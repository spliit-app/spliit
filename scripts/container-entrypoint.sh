#!/bin/bash

set -euxo pipefail

# Ensure parent directory for SQLite db exists if needed
if [ -n "${DATABASE_URL:-}" ]; then
  db_path=$(echo "$DATABASE_URL" | sed 's/^file://')
  db_dir=$(dirname "$db_path")
  if [ -n "$db_dir" ] && [ "$db_dir" != "." ]; then
    mkdir -p "$db_dir"
  fi
fi

# Push schema to SQLite database
node node_modules/prisma/build/index.js db push

# The standalone build's own server entry point
exec node server.js

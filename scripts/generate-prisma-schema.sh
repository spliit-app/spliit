#!/bin/bash

PRISMA_SCHEMA="./prisma/schema.prisma"
PRISMA_SCHEMA_TEMPLATE="${PRISMA_SCHEMA}.template"

if [ -f ".env" ]; then
    source .env
fi

if [ ! -f "$PRISMA_SCHEMA_TEMPLATE" ]; then
    echo "ERROR: Prisma schema template file ${PRISMA_SCHEMA_TEMPLATE} is missing!"
    exit 1
fi

PROVIDER=$( echo "$PRISMA_URL" | cut -d ':' -f 1 )

if [ -z "$PROVIDER" ]; then
    echo "Environment variable PRISMA_URL not defined!"
else
    echo "Generating prisma schema for provider \"${PROVIDER}\""

    while IFS='' read -r a; do
        echo "${a//env(\"PRISMA_PROVIDER\")/\"${PROVIDER}\"}"
    done < "$PRISMA_SCHEMA_TEMPLATE" > "$PRISMA_SCHEMA"

    cd prisma
    rm -rf migrations
    ln -s "migrations_${PROVIDER}" migrations
fi

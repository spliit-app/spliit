#!/bin/bash
if [[ $1 == 'dev' ]]; then
    TARGET=dev
else
    TARGET=start
fi

prisma migrate deploy
npm run $TARGET

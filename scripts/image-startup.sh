#!/bin/bash

prisma migrate deploy
prisma generate
npm run dev

FROM node:21 as base

EXPOSE 3000/tcp
WORKDIR /usr/app
COPY ./ ./
RUN npm ci
RUN npm install -g prisma

FROM base as build
RUN npm run build
RUN npm postinstall

FROM build as production
WORKDIR /app
CMD ["npm", "run", "start"]

FROM base as development
WORKDIR /app
CMD ["npm", "run", "dev"]

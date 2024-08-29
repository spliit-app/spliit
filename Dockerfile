# Dockerfile
# Use the official Node.js image as the base image
FROM node:18-alpine AS base

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Run Prisma migrations and generate Prisma client
RUN npx prisma migrate deploy && npx prisma generate

# Use a smaller, production-only image
FROM node:18-alpine AS production

# Set the working directory inside the container
WORKDIR /app

# Copy only the necessary files from the base image
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/next.config.mjs ./next.config.mjs
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/prisma ./prisma

# Expose the port that Next.js will run on
EXPOSE 3000

# Run Prisma migrations and generate Prisma client at runtime
CMD npx prisma migrate deploy && npx prisma generate && npm run start
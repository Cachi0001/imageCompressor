# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies including devDependencies for build
COPY package*.json ./
# Clean install
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build:cjs

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist/cjs ./dist
# Copy other necessary files
COPY --from=builder /app/.env.example ./.env

# Create data directory for local storage
RUN mkdir -p /data/images

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start command
CMD ["node", "dist/server.js"]

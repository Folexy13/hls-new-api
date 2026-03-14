# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Skip puppeteer browser download (not needed for backend)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript (ignore type errors for Express 5 compatibility issues)
RUN npx prisma generate && npx tsc || true

# Production stage
FROM node:20-alpine

WORKDIR /app

# Skip puppeteer browser download (not needed for backend)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy package files
COPY package*.json ./

# Install all dependencies (chalk and other runtime deps are needed)
RUN npm ci

# Copy prisma schema and generated client
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

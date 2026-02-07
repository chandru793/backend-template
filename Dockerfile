# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm via corepack (built into Node.js 22)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install OpenSSL for Prisma query engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy dependency files first (cache layer)
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm prisma generate

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Prune devDependencies after build
RUN pnpm prune --prod

# Production stage
FROM node:22-slim AS production

WORKDIR /app

# Install OpenSSL for Prisma query engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m fastify

# Copy only production artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R fastify:nodejs /app

# Switch to non-root user
USER fastify

# Expose port
EXPOSE 3000

# Health check using Node.js built-in fetch()
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health/live').then(r=>{if(!r.ok)throw new Error()})" || exit 1

# Start the application
CMD ["node", "dist/server.js"]

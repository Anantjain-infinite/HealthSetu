# ─────────────────────────────────────────────────────────────────
# Stage 1: Install ALL dependencies (including devDeps for TypeScript build)
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

# Install all dependencies (we need devDeps for tsc + prisma generate)
RUN npm ci

# ─────────────────────────────────────────────────────────────────
# Stage 2: Build TypeScript → JavaScript
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client (reads prisma/schema.prisma)
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ─────────────────────────────────────────────────────────────────
# Stage 3: Production image — only production dependencies
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma schema and generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Create logs directory (mounted as a volume in docker-compose)
RUN mkdir -p /app/logs

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 nodeuser \
  && chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 5000

# Health check — hits the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/server.js"]

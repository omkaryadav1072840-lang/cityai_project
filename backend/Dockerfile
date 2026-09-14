# =========================================================
# SmartCity AI - Backend Production Dockerfile
# Multi-stage lean build for Node.js 20 Alpine
# =========================================================

FROM node:20-alpine AS base

# Install dumb-init for proper PID 1 signal forwarding and curl for healthcheck
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Production release stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy production node_modules and app sources
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Ensure upload directory exists and set proper permissions
RUN mkdir -p uploads && chown -R node:node /app

# Switch to non-root user for security
USER node

EXPOSE 5000

# Health check probe against the native /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]

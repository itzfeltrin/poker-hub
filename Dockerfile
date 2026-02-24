# Build stage: install deps and build frontend + backend
FROM oven/bun:1 AS builder

# Install build dependencies for native modules (like better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json bun.lock turbo.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/db/package.json ./packages/db/

# Install all dependencies (workspace)
RUN bun install --frozen-lockfile

# Copy source
COPY backend ./backend
COPY frontend ./frontend
COPY packages ./packages

# Build frontend (API calls will be same-origin in production)
ENV VITE_API_URL=
RUN bun run build

# Production stage: run backend and serve frontend from ./public
FROM oven/bun:1-slim

# Install build dependencies for native modules (like better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config and lockfile for install
COPY package.json bun.lock turbo.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/db/package.json ./packages/db/

RUN bun install --frozen-lockfile --production

# Copy backend and shared packages
COPY backend ./backend
COPY packages ./packages

# Frontend build goes into backend/public so static serving finds it
COPY --from=builder /app/frontend/dist ./backend/public

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/poker-hub.sqlite

# Ensure DB directory exists and is writable (PaaS often run as non-root)
RUN mkdir -p /data && chmod 777 /data

EXPOSE 3000

# Run from backend dir so migrations (drizzle/) and ./public resolve correctly
WORKDIR /app/backend
CMD ["bun", "run", "src/index.ts"]

# ── Stage 1: Install dependencies ────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ── Stage 2: Build ───────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env defaults (override at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_DB_BACKEND=drizzle
ENV NEXT_PUBLIC_AUTH_ENABLED=false

RUN pnpm build

# Install better-sqlite3 with flat node_modules for easy copying
RUN mkdir -p /tmp/sqlite3 && cd /tmp/sqlite3 && npm init -y && npm install better-sqlite3

# ── Stage 3: Production runner ───────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Reuse the built-in node user (uid 1000, gid 1000) from node:22-slim
# This matches clawhost sidecar securityContext and PVC ownership

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy better-sqlite3 native binding (not traced by Next.js standalone)
COPY --from=builder /tmp/sqlite3/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /tmp/sqlite3/node_modules/bindings ./node_modules/bindings
COPY --from=builder /tmp/sqlite3/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Data directory for SQLite (mount as volume)
RUN mkdir -p /data && chown node:node /data
ENV CHATCLAW_DATA_DIR=/data

USER node

EXPOSE 3000

CMD ["node", "server.js"]

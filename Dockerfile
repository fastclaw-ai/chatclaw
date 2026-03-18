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

# ── Stage 3: Production runner ───────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Data directory for SQLite (mount as volume)
RUN mkdir -p /data && chown nextjs:nodejs /data
ENV CHATCLAW_DATA_DIR=/data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

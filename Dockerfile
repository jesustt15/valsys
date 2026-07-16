# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root workspace package.json + pnpm-lock if exists
COPY package.json pnpm-lock.yaml* ./
COPY front/package.json ./front/

# Install pnpm and dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile || pnpm install

# ---- Builder ----
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/front/node_modules ./front/node_modules
COPY . .

WORKDIR /app/front

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable pnpm && pnpm build

# ---- Runner ----
FROM node:20-alpine AS runner
RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/front/public ./front/public
COPY --from=builder --chown=nextjs:nodejs /app/front/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/front/.next/static ./front/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "front/server.js"]

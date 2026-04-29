# SourceDeck API container.
# Brownfield: containerizes the additive Node.js backend in /server only.
# The static SourceDeck site continues to ship via its existing pipeline
# (Vercel / GitHub Pages) and is not bundled into this image.
#
# Multi-stage to keep the runtime image small and free of dev tooling.

# ───── Stage 1: install production deps ─────
FROM node:20-alpine AS deps
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ───── Stage 2: runtime ─────
FROM node:20-alpine AS runtime
WORKDIR /app

# Non-root user for least-privilege runtime.
RUN addgroup -S sd && adduser -S sd -G sd

ENV NODE_ENV=production \
    APP_ENV=production \
    PORT=8080 \
    LOG_LEVEL=info

# Copy installed deps and source.
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./

# Container will receive secrets at runtime via Code Engine secrets,
# k8s Secret, or OpenShift sealed-secret — never baked into the image.
USER sd
EXPOSE 8080

# Liveness/readiness handled by /health/* endpoints; container probe just
# checks the HTTP listener.
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health/live || exit 1

CMD ["node", "server.js"]

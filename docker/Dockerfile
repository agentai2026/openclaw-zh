# OpenClaw 汉化版 Docker 镜像
# 镜像: agentai2027/openclaw-zh

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git curl \
    && rm -rf /var/lib/apt/lists/*

# ---------- 依赖层 ----------
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# ---------- 构建层 ----------
FROM deps AS build
COPY . .
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; else npm run build; fi

# ---------- 运行层 ----------
FROM base AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY --from=build /app /app
WORKDIR /app

# OpenClaw 默认网关端口（可按官方文档调整）
EXPOSE 18789

LABEL org.opencontainers.image.title="OpenClaw 汉化版"
LABEL org.opencontainers.image.description="OpenClaw Chinese distribution by agentai2026"
LABEL org.opencontainers.image.source="https://github.com/agentai2026/openclaw-zh"
LABEL org.opencontainers.image.vendor="agentai2027"

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "openclaw.mjs", "gateway", "run"]

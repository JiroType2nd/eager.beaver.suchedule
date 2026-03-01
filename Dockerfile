# 本番用 Docker イメージ（Cloud Run 想定）
# ビルド: docker build -t schedule .
# 実行: docker run -p 3000:3000 --env-file .env schedule
# Debian ベースに統一（Alpine は Prisma の libssl 互換でビルドが落ちるため）

FROM node:20-bookworm-slim AS base

# 依存関係のみインストール（キャッシュ活用）
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ソースをコピーしてビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 本番ランタイム（Prisma OpenSSL 3 エンジン用に libssl3 をインストール）
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_QUERY_ENGINE_LIBRARY="/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node"
RUN apt-get update && apt-get install -y --no-install-recommends libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

# standalone 出力から必要なファイルだけコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

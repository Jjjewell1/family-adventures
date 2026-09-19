FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-pillow ffmpeg && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir --break-system-packages insightface onnxruntime
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV BODY_SIZE_LIMIT=104857600
RUN mkdir -p /app/data/uploads
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "build"]

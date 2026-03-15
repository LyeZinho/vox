FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

WORKDIR /app

FROM base AS builder
RUN apk add --no-cache python3 make g++ curl
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build:core
RUN npm run build -w apps/server

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tchat

USER tchat
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]

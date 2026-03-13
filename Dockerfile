FROM node:20-alpine AS builder
WORKDIR /app

# Install deps for nats-bridge
COPY nats-bridge/package*.json ./nats-bridge/
WORKDIR /app/nats-bridge
RUN npm install

# Build TypeScript
COPY nats-bridge/tsconfig.json ./
COPY nats-bridge/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY nats-bridge/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/nats-bridge/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]

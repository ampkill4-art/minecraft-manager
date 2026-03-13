FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Build TypeScript inside the image so dist/ exists
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Drop dev deps for smaller runtime
RUN npm prune --omit=dev

EXPOSE 3001
CMD ["node", "dist/index.js"]

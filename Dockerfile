# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /build
COPY package*.json ./
# Slim images might need some build essentials for certain packages
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Setup the backend
FROM node:20-slim
WORKDIR /app

# Copy backend package files first for caching
COPY backend/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy the rest of the backend source
COPY backend/ .

# Copy frontend build from Stage 1
COPY --from=frontend-builder /build/dist ./dist

# Expose the port
ENV PORT=10000
EXPOSE 10000

# Start the application
CMD ["node", "--max-http-header-size=81920", "server.js"]

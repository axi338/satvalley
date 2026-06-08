# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY package*.json ./
# Using legacy-peer-deps to avoid dependency resolution conflicts
RUN npm install --legacy-peer-deps
COPY . .
# We pass empty env vars during build so the app uses relative paths/env at runtime if needed
RUN npm run build

# Stage 2: Setup the backend
FROM node:20-alpine
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy backend source
COPY backend/ .

# Copy frontend build from Stage 1
COPY --from=frontend-builder /build/dist ./dist

# Expose the port
ENV PORT=10000
EXPOSE 10000

# Start the application
CMD ["node", "--max-http-header-size=81920", "server.js"]

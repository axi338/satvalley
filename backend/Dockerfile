# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /build
COPY package*.json ./
RUN npm install
COPY . .
# We pass empty env vars during build so the app uses relative paths/env at runtime if needed
# However, Vite embeds VITE_ variables at build time. 
# We'll assume the backend URL is relative or correctly set in Render env.
RUN npm run build

# Stage 2: Setup the backend
FROM node:18-alpine
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/ .

# Copy frontend build from Stage 1
COPY --from=frontend-builder /build/dist ./dist

# Expose the port
ENV PORT=10000
EXPOSE 10000

# Start the application
CMD ["node", "--max-http-header-size=32768", "server.js"]

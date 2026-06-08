# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /build
COPY package*.json ./
# Added --ignore-scripts to bypass the postinstall script which fails because backend/ isn't copied yet
RUN npm install --legacy-peer-deps --ignore-scripts
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

# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Expose the port (Cloud Run uses 8080 by default, but we can configure it)
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]

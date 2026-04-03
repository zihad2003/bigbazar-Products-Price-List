# Use Node.js 18
FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including MySQL and Express)
RUN npm install --production

# Copy the server files
COPY server/ ./server/

# Create uploads directory
RUN mkdir -p server/uploads

# Expose the API port
EXPOSE 3001

# Start the server
CMD ["node", "server/index.cjs"]

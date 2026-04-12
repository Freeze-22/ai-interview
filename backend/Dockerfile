# backend/Dockerfile
FROM node:20-slim

# Install system dependencies for faiss-node and audio processing
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  libopenblas-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Cloud Run uses PORT env variable
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/index.js"]

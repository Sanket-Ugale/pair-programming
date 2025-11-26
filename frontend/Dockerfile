# Frontend Dockerfile
FROM node:20-alpine AS builder

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for API URL
ARG VITE_API_URL=http://localhost:8000
ARG VITE_WS_URL=ws://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a script to replace environment variables at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-envsubst-config.sh && \
    echo 'if [ -f /usr/share/nginx/html/config.template.js ]; then' >> /docker-entrypoint.d/40-envsubst-config.sh && \
    echo '  envsubst < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-envsubst-config.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-envsubst-config.sh && \
    chmod +x /docker-entrypoint.d/40-envsubst-config.sh

# Expose port (will be overridden)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-80}/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

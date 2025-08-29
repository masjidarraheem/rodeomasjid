# Use nginx to serve static files
FROM nginx:alpine

# Install bash for environment variable injection
RUN apk add --no-cache bash

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy all files to nginx directory
COPY . /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create entrypoint script directly in Dockerfile
RUN echo '#!/bin/bash' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo 'echo "🚀 Starting admin panel deployment..."' >> /docker-entrypoint.sh && \
    echo 'cd /usr/share/nginx/html' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Generate env.js with environment variables' >> /docker-entrypoint.sh && \
    echo 'echo "🔧 Injecting environment variables..."' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo 'cat > env.js << EOF' >> /docker-entrypoint.sh && \
    echo '// Environment variables configuration' >> /docker-entrypoint.sh && \
    echo '// Generated at runtime from environment variables' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo 'window.ENV = {' >> /docker-entrypoint.sh && \
    echo '  FIREBASE_API_KEY: "${FIREBASE_API_KEY:-your-api-key}",' >> /docker-entrypoint.sh && \
    echo '  FIREBASE_AUTH_DOMAIN: "${FIREBASE_AUTH_DOMAIN:-your-project.firebaseapp.com}",' >> /docker-entrypoint.sh && \
    echo '  FIREBASE_PROJECT_ID: "${FIREBASE_PROJECT_ID:-your-project-id}",' >> /docker-entrypoint.sh && \
    echo '  FIREBASE_STORAGE_BUCKET: "${FIREBASE_STORAGE_BUCKET:-your-project.appspot.com}",' >> /docker-entrypoint.sh && \
    echo '  FIREBASE_MESSAGING_SENDER_ID: "${FIREBASE_MESSAGING_SENDER_ID:-123456789}",' >> /docker-entrypoint.sh && \
    echo '  FIREBASE_APP_ID: "${FIREBASE_APP_ID:-your-app-id}"' >> /docker-entrypoint.sh && \
    echo '};' >> /docker-entrypoint.sh && \
    echo 'EOF' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo 'echo "✅ Environment variables injected successfully!"' >> /docker-entrypoint.sh && \
    echo 'echo "🌐 Starting nginx..."' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Start nginx' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Override the default nginx entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
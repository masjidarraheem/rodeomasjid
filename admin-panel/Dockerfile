# Use nginx to serve static files
FROM nginx:alpine

# Install bash for build script
RUN apk add --no-cache bash

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy admin panel files
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Make build script executable and run it
RUN chmod +x /usr/share/nginx/html/build.sh

# Expose port 80
EXPOSE 80

# Create entrypoint script
RUN echo '#!/bin/bash' > /entrypoint.sh && \
    echo 'cd /usr/share/nginx/html' >> /entrypoint.sh && \
    echo './build.sh' >> /entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Start with environment variable injection
CMD ["/entrypoint.sh"]
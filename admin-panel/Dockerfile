# Use nginx to serve static files
FROM nginx:alpine

# Install bash for environment variable injection
RUN apk add --no-cache bash

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy specific admin panel files
COPY index.html /usr/share/nginx/html/
COPY admin.js /usr/share/nginx/html/
COPY firebase-config.js /usr/share/nginx/html/
COPY env.js /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script to root
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Start with environment variable injection
CMD ["/entrypoint.sh"]
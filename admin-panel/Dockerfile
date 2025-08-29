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

# Copy and setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Start with environment variable injection
CMD ["/entrypoint.sh"]
# Use nginx to serve static files
FROM nginx:alpine

# Install bash for environment variable injection
RUN apk add --no-cache bash

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy all files except those in .dockerignore
COPY . /usr/share/nginx/html/

# Move entrypoint to root and make executable
RUN mv /usr/share/nginx/html/entrypoint.sh /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start with environment variable injection  
CMD ["/entrypoint.sh"]
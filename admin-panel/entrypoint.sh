#!/bin/bash
set -e

echo "🚀 Starting admin panel deployment..."
cd /usr/share/nginx/html

# Generate env.js with environment variables
echo "🔧 Injecting environment variables..."

if [ -z "$FIREBASE_API_KEY" ] || [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "⚠️  Warning: Firebase environment variables not set, using defaults"
    echo "Required: FIREBASE_API_KEY, FIREBASE_PROJECT_ID, etc."
fi

cat > env.js << EOL
// Environment variables configuration
// Generated at build time from environment variables

window.ENV = {
  FIREBASE_API_KEY: "${FIREBASE_API_KEY:-your-api-key}",
  FIREBASE_AUTH_DOMAIN: "${FIREBASE_AUTH_DOMAIN:-your-project.firebaseapp.com}",
  FIREBASE_PROJECT_ID: "${FIREBASE_PROJECT_ID:-your-project-id}",
  FIREBASE_STORAGE_BUCKET: "${FIREBASE_STORAGE_BUCKET:-your-project.appspot.com}",
  FIREBASE_MESSAGING_SENDER_ID: "${FIREBASE_MESSAGING_SENDER_ID:-123456789}",
  FIREBASE_APP_ID: "${FIREBASE_APP_ID:-your-app-id}"
};
EOL

echo "✅ Environment variables injected successfully!"
echo "🌐 Starting nginx..."

# Start nginx
nginx -g "daemon off;"
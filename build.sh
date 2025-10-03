#!/bin/bash

# Build script for main website to inject environment variables
# This script replaces placeholders with actual environment variable values

echo "🔧 Building main website with environment variables..."

# Check if all required environment variables are set
if [ -z "$FIREBASE_API_KEY" ] || [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "❌ Error: Required Firebase environment variables are not set!"
    echo "Required variables:"
    echo "  - FIREBASE_API_KEY"
    echo "  - FIREBASE_AUTH_DOMAIN"
    echo "  - FIREBASE_PROJECT_ID"
    echo "  - FIREBASE_STORAGE_BUCKET"
    echo "  - FIREBASE_MESSAGING_SENDER_ID"
    echo "  - FIREBASE_APP_ID"
    echo "Optional push notification variables:"
    echo "  - CLOUDFLARE_WORKER_URL"
    echo "  - PUSH_API_KEY"
    echo "  - VAPID_KEY"
    exit 1
fi

# Generate env.js with actual values
cat > js/env.js << EOF
// Environment variables configuration for main website
// Generated at build time from environment variables

window.ENV = {
  FIREBASE_API_KEY: "${FIREBASE_API_KEY}",
  FIREBASE_AUTH_DOMAIN: "${FIREBASE_AUTH_DOMAIN}",
  FIREBASE_PROJECT_ID: "${FIREBASE_PROJECT_ID}",
  FIREBASE_STORAGE_BUCKET: "${FIREBASE_STORAGE_BUCKET}",
  FIREBASE_MESSAGING_SENDER_ID: "${FIREBASE_MESSAGING_SENDER_ID}",
  FIREBASE_APP_ID: "${FIREBASE_APP_ID}",
  // Push notification configuration
  CLOUDFLARE_WORKER_URL: "${CLOUDFLARE_WORKER_URL:-https://masjid-push-notifications.rodeomasjid.workers.dev}",
  PUSH_API_KEY: "${PUSH_API_KEY:-default-api-key}",
  VAPID_KEY: "${VAPID_KEY:-BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44}"
};
EOF

# Update Firebase service worker with environment variables
echo "🔧 Updating Firebase service worker..."
sed -i "s/PLACEHOLDER_FIREBASE_API_KEY/${FIREBASE_API_KEY}/g" firebase-messaging-sw.js
sed -i "s/PLACEHOLDER_FIREBASE_AUTH_DOMAIN/${FIREBASE_AUTH_DOMAIN}/g" firebase-messaging-sw.js
sed -i "s/PLACEHOLDER_FIREBASE_PROJECT_ID/${FIREBASE_PROJECT_ID}/g" firebase-messaging-sw.js
sed -i "s/PLACEHOLDER_FIREBASE_STORAGE_BUCKET/${FIREBASE_STORAGE_BUCKET}/g" firebase-messaging-sw.js
sed -i "s/PLACEHOLDER_FIREBASE_MESSAGING_SENDER_ID/${FIREBASE_MESSAGING_SENDER_ID}/g" firebase-messaging-sw.js
sed -i "s/PLACEHOLDER_FIREBASE_APP_ID/${FIREBASE_APP_ID}/g" firebase-messaging-sw.js

echo "✅ Environment variables injected successfully!"
echo "✅ Firebase service worker updated!"
echo "📦 Main website ready for deployment"
#!/bin/bash

# Build script to inject environment variables into JavaScript files
# This script replaces placeholders with actual environment variable values

echo "🔧 Building admin panel with environment variables..."

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
    exit 1
fi

# Generate env.js with actual values
cat > env.js << EOF
// Environment variables configuration
// Generated at build time from environment variables

window.ENV = {
  FIREBASE_API_KEY: "${FIREBASE_API_KEY}",
  FIREBASE_AUTH_DOMAIN: "${FIREBASE_AUTH_DOMAIN}",
  FIREBASE_PROJECT_ID: "${FIREBASE_PROJECT_ID}",
  FIREBASE_STORAGE_BUCKET: "${FIREBASE_STORAGE_BUCKET}",
  FIREBASE_MESSAGING_SENDER_ID: "${FIREBASE_MESSAGING_SENDER_ID}",
  FIREBASE_APP_ID: "${FIREBASE_APP_ID}"
};
EOF

echo "✅ Environment variables injected successfully!"
echo "📦 Admin panel ready for deployment"
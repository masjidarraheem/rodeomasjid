# Complete Setup Guide
## Firebase FCM + Cloudflare Workers Push Notifications

**Estimated Setup Time:** 30-45 minutes
**Prerequisites:** Existing Firebase project, GitHub account
**Cost:** $0 (Free tiers only)

---

## 🔥 Part 1: Firebase Configuration

### Step 1.1: Enable Cloud Messaging
```bash
# You should already have this, but let's verify
```

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `rodeomasjid` (or your project name)
3. **Navigate to Project Settings** (gear icon → Project settings)
4. **Click "Cloud Messaging" tab**
5. **Verify Web Configuration exists**:
   - If you see "Web Push certificates" section → ✅ Good to go
   - If not, click "Generate key pair" → Copy the VAPID key

### Step 1.2: Get Firebase Server Key (Legacy)
1. **In Cloud Messaging tab**, scroll down to "Cloud Messaging API (Legacy)"
2. **Copy the "Server key"** - this starts with `AAAA...`
3. **⚠️ Important**: Keep this secret - we'll use it in Cloudflare Workers

**Example Server Key:**
```
AAAAxxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 1.3: Get VAPID Key (if needed)
1. **In "Web Push certificates" section**
2. **If no key exists**: Click "Generate key pair"
3. **Copy the public key** - starts with `B...`
4. **Keep this for frontend integration**

**Example VAPID Key:**
```
BCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 1.4: Verify Firebase Config
In your existing `admin-new.html`, you should already have:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "rodeomasjid.firebaseapp.com",
  projectId: "rodeomasjid",
  storageBucket: "rodeomasjid.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

**✅ If you have this, Firebase is ready!**

---

## ☁️ Part 2: Cloudflare Workers Setup

### Step 2.1: Create Cloudflare Account
1. **Go to**: https://cloudflare.com
2. **Sign up** for free account (if you don't have one)
3. **Skip domain setup** for now - we just need Workers
4. **Go to Workers & Pages** in left sidebar

### Step 2.2: Install Wrangler CLI
```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Verify installation
wrangler --version
# Should show: ⛅️ wrangler 3.x.x

# Login to Cloudflare
wrangler login
# This will open browser for authentication
```

### Step 2.3: Create Worker Project
```bash
# Create new project directory
mkdir masjid-push-worker
cd masjid-push-worker

# Initialize project
wrangler init

# Answer prompts:
# ✅ Would you like to use TypeScript? → No
# ✅ Would you like to use git? → Yes
# ✅ Would you like to deploy your application? → No (we'll do this manually)
```

### Step 2.4: Project Structure
Your project should look like this:
```
masjid-push-worker/
├── src/
│   └── index.js          # Main worker code
├── wrangler.toml         # Configuration
├── package.json          # Dependencies
└── README.md
```

### Step 2.5: Update wrangler.toml
Replace the contents of `wrangler.toml`:
```toml
name = "masjid-push-notifications"
main = "src/index.js"
compatibility_date = "2024-01-15"

# KV Namespace (we'll create this next)
kv_namespaces = [
  { binding = "FCM_TOKENS", preview_id = "", id = "" }
]

# Environment variables (public)
[vars]
CORS_ORIGIN = "https://masjidarraheem.github.io"

# Secrets (set separately via CLI)
# FCM_SERVER_KEY - your Firebase server key
# API_KEY - your custom API key for authentication
```

### Step 2.6: Create KV Namespace
```bash
# Create KV namespace for storing FCM tokens
wrangler kv:namespace create "FCM_TOKENS"

# Output will be something like:
# { binding = "FCM_TOKENS", id = "abcdef1234567890" }

# Copy this ID and update wrangler.toml
# Replace the empty id = "" with your actual ID
```

**Update wrangler.toml with your KV namespace ID:**
```toml
kv_namespaces = [
  { binding = "FCM_TOKENS", preview_id = "", id = "your-actual-kv-id-here" }
]
```

### Step 2.7: Add Dependencies
```bash
# Add itty-router for routing
npm install itty-router
```

Update `package.json`:
```json
{
  "name": "masjid-push-notifications",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "itty-router": "^4.0.0"
  }
}
```

---

## 💾 Part 3: Worker Code Implementation

### Step 3.1: Create Main Worker (src/index.js)
Replace the contents of `src/index.js` with this complete code:

```javascript
import { Router } from 'itty-router'

const router = Router()

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://masjidarraheem.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight
router.options('*', () => new Response(null, { headers: corsHeaders }))

// Health check endpoint
router.get('/', () => {
  return new Response('Masjid Push Notifications API - Running! 🚀', {
    headers: corsHeaders
  })
})

// Store FCM token
router.post('/api/store-token', async (request, env) => {
  try {
    const { userId, fcmToken } = await request.json()

    if (!userId || !fcmToken) {
      return new Response(JSON.stringify({
        error: 'Missing userId or fcmToken'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Store token with metadata
    const tokenData = {
      fcmToken,
      userId,
      storedAt: Date.now(),
      isActive: true,
      userAgent: request.headers.get('user-agent') || 'Unknown'
    }

    await env.FCM_TOKENS.put(`token:${userId}`, JSON.stringify(tokenData))
    await env.FCM_TOKENS.put(`user:${userId}`, fcmToken) // For easy counting

    return new Response(JSON.stringify({
      success: true,
      message: 'FCM token stored successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error storing token:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Send push notification
router.post('/api/send-push', async (request, env) => {
  try {
    // Verify API key
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${env.API_KEY}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { title, message, priority = 'normal' } = await request.json()

    if (!title || !message) {
      return new Response(JSON.stringify({
        error: 'Missing title or message'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get all FCM tokens
    const tokenList = await env.FCM_TOKENS.list({ prefix: 'user:' })
    const fcmTokens = []

    for (const key of tokenList.keys) {
      const token = await env.FCM_TOKENS.get(key.name)
      if (token) {
        fcmTokens.push(token)
      }
    }

    if (fcmTokens.length === 0) {
      return new Response(JSON.stringify({
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No FCM tokens found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Send via FCM
    const result = await sendFCMNotification(env.FCM_SERVER_KEY, fcmTokens, {
      title,
      message,
      priority
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error sending push:', error)
    return new Response(JSON.stringify({
      error: 'Failed to send push notification'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Get subscriber stats
router.get('/api/stats', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${env.API_KEY}`) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    const tokenList = await env.FCM_TOKENS.list({ prefix: 'user:' })

    return new Response(JSON.stringify({
      subscriberCount: tokenList.keys.length,
      timestamp: Date.now()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get stats' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Remove token (unsubscribe)
router.delete('/api/remove-token/:userId', async (request, env) => {
  try {
    const { userId } = request.params

    await env.FCM_TOKENS.delete(`token:${userId}`)
    await env.FCM_TOKENS.delete(`user:${userId}`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Token removed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to remove token' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// FCM API function
async function sendFCMNotification(serverKey, tokens, payload) {
  const fcmPayload = {
    registration_ids: tokens,
    notification: {
      title: payload.title,
      body: payload.message,
      icon: 'https://masjidarraheem.github.io/icons/icon-192.png',
      click_action: 'https://masjidarraheem.github.io'
    },
    data: {
      priority: payload.priority,
      timestamp: Date.now().toString(),
      url: 'https://masjidarraheem.github.io'
    }
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fcmPayload)
    })

    const result = await response.json()

    return {
      sent: result.success || 0,
      failed: result.failure || 0,
      total: tokens.length,
      message: `Sent ${result.success || 0} notifications, ${result.failure || 0} failed`,
      fcmResponse: result
    }

  } catch (error) {
    console.error('FCM API Error:', error)
    return {
      sent: 0,
      failed: tokens.length,
      total: tokens.length,
      message: 'FCM API call failed',
      error: error.message
    }
  }
}

// Default handler
export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx).catch(err => {
      console.error('Worker error:', err)
      return new Response('Internal Server Error', {
        status: 500,
        headers: corsHeaders
      })
    })
  }
}
```

---

## 🔑 Part 4: Set Secrets & Deploy

### Step 4.1: Set Cloudflare Secrets
```bash
# Set Firebase Server Key (the one you copied earlier)
wrangler secret put FCM_SERVER_KEY
# Paste your Firebase server key: AAAA...

# Set API key for authentication (create your own strong key)
wrangler secret put API_KEY
# Create a strong API key like: masjid_2025_super_secret_key_xyz789
```

### Step 4.2: Test Locally
```bash
# Start local development server
wrangler dev

# Test in another terminal
curl http://localhost:8787/
# Should return: "Masjid Push Notifications API - Running! 🚀"
```

### Step 4.3: Deploy to Production
```bash
# Deploy to Cloudflare
wrangler deploy

# Output will show your Worker URL:
# Published masjid-push-notifications (1.2 sec)
#   https://masjid-push-notifications.your-subdomain.workers.dev
```

**🎉 Your Worker is now live!** Copy the URL - you'll need it for the frontend.

---

## 🔗 Part 5: Frontend Integration

### Step 5.1: Create Firebase Messaging Service Worker
Create file: `/firebase-messaging-sw.js` (in your website root):

```javascript
// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase with your config
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "rodeomasjid.firebaseapp.com",
  projectId: "rodeomasjid",
  storageBucket: "rodeomasjid.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background Message:', payload)

  const notificationTitle = payload.notification?.title || 'New Notification'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'masjid-announcement',
    data: payload.data
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const clickAction = event.notification.data?.url || 'https://masjidarraheem.github.io'

  event.waitUntil(
    clients.openWindow(clickAction)
  )
})
```

### Step 5.2: Add to Admin Panel (admin-new.html)
Add this code to your `admin-new.html` before the closing `</script>` tag:

```javascript
// FCM Push Manager Class
class FCMPushManager {
  constructor(workerUrl, apiKey, vapidKey) {
    this.workerUrl = workerUrl
    this.apiKey = apiKey
    this.vapidKey = vapidKey
    this.messaging = null
  }

  async initialize() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      throw new Error('Push notifications not supported')
    }

    // Initialize Firebase Messaging (you already have Firebase initialized)
    const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js')

    this.messaging = getMessaging()
    return this.messaging
  }

  async requestPermissionAndSubscribe(userId) {
    if (!this.messaging) {
      await this.initialize()
    }

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    // Get FCM token
    const fcmToken = await getToken(this.messaging, {
      vapidKey: this.vapidKey
    })

    if (!fcmToken) {
      throw new Error('Failed to get FCM token')
    }

    // Store token in Cloudflare Worker
    const response = await fetch(`${this.workerUrl}/api/store-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        fcmToken
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to store FCM token')
    }

    return fcmToken
  }

  async sendPushNotification(title, message, priority = 'normal') {
    const response = await fetch(`${this.workerUrl}/api/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        title,
        message,
        priority
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send notification')
    }

    return response.json()
  }

  async getSubscriberCount() {
    const response = await fetch(`${this.workerUrl}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get subscriber count')
    }

    const data = await response.json()
    return data.subscriberCount
  }
}

// Initialize FCM Push Manager
const fcmPushManager = new FCMPushManager(
  'https://masjid-push-notifications.your-subdomain.workers.dev', // Replace with your Worker URL
  'your-api-key', // Replace with your API key
  'your-vapid-public-key' // Replace with your VAPID key from Firebase
)

// Add this to your existing AdminApp class
class AdminApp {
  // ... your existing methods ...

  async initializePushNotifications() {
    try {
      if (this.currentUser) {
        await fcmPushManager.requestPermissionAndSubscribe(this.currentUser.uid)
        console.log('Push notifications initialized')

        // Update subscriber count display if needed
        const count = await fcmPushManager.getSubscriberCount()
        console.log(`Current subscribers: ${count}`)
      }
    } catch (error) {
      console.error('Push notification setup failed:', error)
      // Don't break the app if push notifications fail
    }
  }

  // Call this after successful login
  async showApp() {
    // ... your existing showApp code ...

    // Initialize push notifications after login
    await this.initializePushNotifications()
  }
}
```

---

## 🧪 Part 6: Testing

### Step 6.1: Test Worker Endpoints
```bash
# Test health check
curl https://your-worker-url.workers.dev/

# Test storing a token (replace with real values)
curl -X POST https://your-worker-url.workers.dev/api/store-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","fcmToken":"fake-token-for-testing"}'

# Test getting stats (replace API_KEY)
curl -H "Authorization: Bearer your-api-key" \
  https://your-worker-url.workers.dev/api/stats
```

### Step 6.2: Test Push Notification
Once you have real FCM tokens stored:
```bash
# Send test notification (replace with your values)
curl -X POST https://your-worker-url.workers.dev/api/send-push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test from your Masjid admin!",
    "priority": "high"
  }'
```

---

## ✅ Part 7: Final Checklist

### Firebase ✅
- [ ] Cloud Messaging enabled in Firebase Console
- [ ] Server key copied and stored as Cloudflare secret
- [ ] VAPID key copied for frontend use
- [ ] `firebase-messaging-sw.js` created and deployed

### Cloudflare Workers ✅
- [ ] Cloudflare account created
- [ ] Wrangler CLI installed and authenticated
- [ ] KV namespace created and configured
- [ ] Secrets set (FCM_SERVER_KEY, API_KEY)
- [ ] Worker deployed and accessible

### Frontend Integration ✅
- [ ] FCMPushManager class added to admin-new.html
- [ ] Worker URL and API key configured
- [ ] Push notification initialization added to login flow
- [ ] Service worker registered and working

### Testing ✅
- [ ] Worker health check responds
- [ ] Can store FCM tokens
- [ ] Can send test notifications
- [ ] Notifications appear on devices
- [ ] Click actions work correctly

**🎉 You're now ready to send push notifications!**

---

## 🆘 Troubleshooting

### Common Issues:

**1. "FCM Server Key Invalid"**
- Verify you copied the correct server key from Firebase Console
- Make sure it starts with `AAAA`
- Check it's set correctly: `wrangler secret list`

**2. "CORS Error"**
- Verify your domain in `corsHeaders` matches exactly
- Include `https://` in the domain

**3. "No FCM Token Generated"**
- Check Firebase config is correct
- Verify VAPID key is from the same Firebase project
- Ensure HTTPS (required for service workers)

**4. "Notifications Not Appearing"**
- Check browser notification permissions
- Verify `firebase-messaging-sw.js` is accessible
- Test in Chrome DevTools → Application → Service Workers

**Need Help?** Check the browser console for detailed error messages!

This complete setup gives you a production-ready push notification system at zero cost! 🚀
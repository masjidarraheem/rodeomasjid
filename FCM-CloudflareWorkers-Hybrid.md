# Firebase FCM + Cloudflare Workers Hybrid
## Minimal Free Push Notification System

**Architecture:** Firebase FCM + Cloudflare Workers + KV
**Cost:** $0 (Firebase free tier + Cloudflare free tier)
**Benefits:** Leverage existing FCM setup + Free edge computing

---

## 🏗️ Hybrid Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin Panel   │───▶│ Cloudflare Worker│───▶│   Firebase FCM  │
│  (Firebase Auth)│    │   (Webhook Hub)  │    │   (Push Service)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       ▼
         ▼                        │              ┌─────────────────┐
┌─────────────────┐               │              │   User Devices  │
│   Service       │               │              │  (Notifications)│
│   Worker        │◀──────────────┘              └─────────────────┘
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  Cloudflare KV  │
│ (FCM Tokens)    │
└─────────────────┘
```

### Why This Hybrid Approach?

**Leverage Existing FCM:**
- You already have Firebase set up
- FCM handles all push service complexity (Apple, Google, Mozilla)
- No VAPID key management needed
- Robust delivery infrastructure

**Add Cloudflare Benefits:**
- Free webhook endpoint (100k requests/day)
- Global edge performance
- KV storage for token management
- No Firebase Cloud Functions costs

---

## 🔧 Implementation

### 1. Minimal Cloudflare Worker (src/index.js)
```javascript
import { Router } from 'itty-router'

const router = Router()

// CORS headers for your domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://masjidarraheem.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

router.options('*', () => new Response(null, { headers: corsHeaders }))

// Store FCM token
router.post('/api/store-token', async (request, env) => {
  try {
    const { userId, fcmToken } = await request.json()

    if (!userId || !fcmToken) {
      return new Response('Missing userId or fcmToken', {
        status: 400,
        headers: corsHeaders
      })
    }

    // Store token in KV with user ID as key
    await env.FCM_TOKENS.put(`token:${userId}`, JSON.stringify({
      fcmToken,
      userId,
      storedAt: Date.now(),
      isActive: true
    }))

    // Also store reverse mapping for cleanup
    await env.FCM_TOKENS.put(`user:${userId}`, fcmToken)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Send push notification via FCM
router.post('/api/send-push', async (request, env) => {
  try {
    // Simple API key authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${env.API_KEY}`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { title, message, priority = 'normal' } = await request.json()

    if (!title || !message) {
      return new Response('Missing title or message', {
        status: 400,
        headers: corsHeaders
      })
    }

    // Get all FCM tokens from KV
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
        message: 'No FCM tokens found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Send via FCM REST API
    const fcmResponse = await sendFCMNotification(
      env.FCM_SERVER_KEY,
      fcmTokens,
      { title, message, priority }
    )

    return new Response(JSON.stringify(fcmResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Get subscriber count
router.get('/api/stats', async (request, env) => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${env.API_KEY}`) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const tokenList = await env.FCM_TOKENS.list({ prefix: 'user:' })

  return new Response(JSON.stringify({
    subscriberCount: tokenList.keys.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

// Remove token (unsubscribe)
router.delete('/api/remove-token/:userId', async (request, env) => {
  const { userId } = request.params

  await env.FCM_TOKENS.delete(`token:${userId}`)
  await env.FCM_TOKENS.delete(`user:${userId}`)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

// FCM REST API function
async function sendFCMNotification(serverKey, tokens, payload) {
  const fcmPayload = {
    registration_ids: tokens,
    notification: {
      title: payload.title,
      body: payload.message,
      icon: '/icons/icon-192.png',
      click_action: 'https://masjidarraheem.github.io/admin-new.html'
    },
    data: {
      priority: payload.priority,
      timestamp: Date.now().toString()
    }
  }

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
}

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

### 2. Admin Panel Integration (admin-new.html)
```javascript
class FCMPushManager {
  constructor(workerUrl, apiKey) {
    this.workerUrl = workerUrl
    this.apiKey = apiKey
    this.messaging = null
  }

  async initialize() {
    // Import Firebase SDK (you already have this)
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js')
    const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js')

    // Use your existing Firebase config
    this.messaging = getMessaging()
    return this.messaging
  }

  async requestPermissionAndGetToken(userId) {
    if (!this.messaging) {
      await this.initialize()
    }

    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    // Get FCM token
    const fcmToken = await getToken(this.messaging, {
      vapidKey: 'your-firebase-vapid-key' // From Firebase Console
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
      throw new Error('Failed to store FCM token')
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
      throw new Error('Failed to send push notification')
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

  async unsubscribe(userId) {
    const response = await fetch(`${this.workerUrl}/api/remove-token/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    return response.ok
  }
}

// Initialize with your Cloudflare Worker URL
const fcmPushManager = new FCMPushManager(
  'https://masjid-push.your-subdomain.workers.dev',
  'your-api-key'
)

// Usage in your existing announcement form submission
async function publishAnnouncementWithPush(announcementData) {
  try {
    // 1. Save announcement to Firebase (your existing code)
    const docRef = await addDoc(collection(db, 'announcements'), {
      ...announcementData,
      createdAt: new Date()
    })

    // 2. Send push notification if requested
    if (announcementData.sendPush) {
      const result = await fcmPushManager.sendPushNotification(
        announcementData.title,
        announcementData.message,
        announcementData.priority
      )

      console.log('Push notification result:', result)

      // 3. Update announcement with push status
      await updateDoc(docRef, {
        pushSent: true,
        pushSentAt: new Date(),
        pushRecipients: result.sent
      })
    }

    this.showSuccess('Announcement published successfully!')
    if (announcementData.sendPush) {
      this.showSuccess(`Push notification sent to ${result.sent} subscribers`)
    }

  } catch (error) {
    console.error('Error publishing announcement:', error)
    this.showError('Failed to publish announcement')
  }
}
```

### 3. Service Worker Update (firebase-messaging-sw.js)
```javascript
// Import Firebase scripts (you might already have this)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase (use your existing config)
firebase.initializeApp({
  // Your Firebase config
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)

  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'announcement',
    data: payload.data
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.openWindow('https://masjidarraheem.github.io/admin-new.html')
  )
})
```

---

## ⚙️ Configuration & Deployment

### 1. Cloudflare Setup

#### wrangler.toml
```toml
name = "masjid-fcm-bridge"
main = "src/index.js"
compatibility_date = "2024-01-15"

[env.production]
kv_namespaces = [
  { binding = "FCM_TOKENS", id = "your-kv-namespace-id" }
]

# Secrets (set via wrangler secret put)
# FCM_SERVER_KEY - from Firebase Console
# API_KEY - your custom API key for authentication
```

#### package.json
```json
{
  "name": "masjid-fcm-bridge",
  "version": "1.0.0",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "itty-router": "^4.0.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

### 2. Firebase Configuration

#### Get FCM Server Key
1. Go to Firebase Console → Project Settings
2. Cloud Messaging tab
3. Copy "Server key" (legacy)
4. Store as Cloudflare Worker secret:
```bash
wrangler secret put FCM_SERVER_KEY
```

#### Get VAPID Key (Optional - for advanced features)
1. Firebase Console → Project Settings → Cloud Messaging
2. Web configuration → Generate key pair
3. Use public key in frontend FCM setup

### 3. Deployment Commands
```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "FCM_TOKENS"

# Set secrets
wrangler secret put FCM_SERVER_KEY
wrangler secret put API_KEY

# Deploy
wrangler deploy
```

---

## 💰 Cost Analysis

### Completely Free Setup
| Service | Usage | Cost |
|---------|--------|------|
| **Firebase FCM** | Unlimited messages | $0 |
| **Firebase Auth** | <50k users/month | $0 |
| **Firebase Firestore** | <50k reads/writes | $0 |
| **Cloudflare Workers** | 100k requests/day | $0 |
| **Cloudflare KV** | 10GB storage | $0 |

**Total Monthly Cost: $0** 🎉

### Benefits vs Pure Solutions

| Approach | Setup Complexity | Cost | Performance | Vendor Lock-in |
|----------|------------------|------|-------------|----------------|
| **FCM + Cloudflare** | ⭐⭐ Medium | 🆓 Free | ⭐⭐⭐ Excellent | ⭐⭐ Low |
| Pure Firebase | ⭐ Easy | 💰 $0.40/M after 2M | ⭐⭐ Good | ⭐ High |
| Pure Cloudflare + Web Push | ⭐⭐⭐ Complex | 🆓 Free | ⭐⭐⭐ Excellent | ⭐⭐⭐ None |

---

## 🚀 Implementation Steps

### Phase 1: Cloudflare Worker (1-2 days)
1. Create Cloudflare account and install Wrangler
2. Deploy the minimal FCM bridge worker
3. Set up KV namespace and secrets
4. Test endpoints with curl/Postman

### Phase 2: Admin Panel Integration (1-2 days)
1. Add FCMPushManager class to admin-new.html
2. Update announcement form with push notification checkbox
3. Integrate push sending into form submission
4. Add subscriber count display

### Phase 3: Service Worker & Frontend (1 day)
1. Update firebase-messaging-sw.js for background messages
2. Add permission request flow for new users
3. Test end-to-end notification flow
4. Add unsubscribe functionality

### Phase 4: Testing & Polish (1 day)
1. Cross-browser testing (Chrome, Firefox, Safari)
2. Mobile device testing
3. Error handling and edge cases
4. Performance optimization

**Total Implementation Time: 5-6 days**

---

## 🔍 Why This Hybrid Approach?

### Advantages
✅ **Leverages existing Firebase setup** - no migration needed
✅ **Completely free** - both services have generous free tiers
✅ **Global performance** - Cloudflare edge + Firebase infrastructure
✅ **Minimal complexity** - simple webhook bridge
✅ **Standard FCM** - works with all devices and browsers
✅ **No VAPID management** - Firebase handles all push service complexity

### Trade-offs
⚠️ **Two services to manage** - Cloudflare + Firebase
⚠️ **FCM REST API dependency** - using legacy server key
⚠️ **Simple authentication** - basic API key (can be enhanced)

This hybrid approach gives you the best of both worlds: Firebase's robust FCM infrastructure with Cloudflare's free, fast edge computing!
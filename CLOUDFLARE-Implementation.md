# Cloudflare Workers + KV Push Notifications
## Complete Implementation Guide

**Technology Stack:** Cloudflare Workers + KV + Web Push API
**Cost:** Free (100k requests/day, 10GB storage)
**Global Performance:** Edge locations worldwide

---

## 🚀 Architecture Overview

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin Panel   │───▶│ Cloudflare Worker│───▶│ Push Services   │
│  (Firebase Auth)│    │   + KV Storage   │    │ (FCM, Mozilla)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       ▼
         ▼                        │              ┌─────────────────┐
┌─────────────────┐               │              │   User Devices  │
│   Service       │               │              │  (Notifications)│
│   Worker        │◀──────────────┘              └─────────────────┘
└─────────────────┘
```

### Benefits of Cloudflare Workers
- **Free Tier**: 100,000 requests/day (more than enough)
- **Global Edge**: <50ms latency worldwide
- **No Cold Starts**: Always warm, instant response
- **KV Storage**: 10GB free storage for subscriptions
- **Simple Deployment**: Git-based deployments

---

## 📁 Project Structure

```
cloudflare-push-worker/
├── src/
│   ├── index.js           # Main worker logic
│   ├── push-handler.js    # Push notification logic
│   ├── subscription.js    # Subscription management
│   └── auth.js           # Authentication helpers
├── wrangler.toml         # Cloudflare configuration
├── package.json          # Dependencies
└── README.md            # Setup instructions
```

---

## 🔧 Complete Implementation

### 1. Cloudflare Worker (src/index.js)
```javascript
import { Router } from 'itty-router'
import { handleSubscription, unsubscribe, getSubscriptionCount } from './subscription'
import { sendPushToAll, sendPushToUser } from './push-handler'
import { verifyAuth } from './auth'

const router = Router()

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://masjidarraheem.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight
router.options('*', () => new Response(null, { headers: corsHeaders }))

// Subscription endpoints
router.post('/api/subscribe', async (request, env) => {
  try {
    const { userId, subscription } = await request.json()

    if (!userId || !subscription) {
      return new Response('Missing required fields', {
        status: 400,
        headers: corsHeaders
      })
    }

    await handleSubscription(env.PUSH_SUBSCRIPTIONS, userId, subscription)

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

router.delete('/api/subscribe/:userId', async (request, env) => {
  const { userId } = request.params
  await unsubscribe(env.PUSH_SUBSCRIPTIONS, userId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

// Push notification endpoints
router.post('/api/send-push', async (request, env) => {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request, env)
    if (!authResult.valid) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    const { title, message, priority, targetUserId } = await request.json()

    if (!title || !message) {
      return new Response('Missing title or message', {
        status: 400,
        headers: corsHeaders
      })
    }

    let result
    if (targetUserId) {
      // Send to specific user
      result = await sendPushToUser(
        env.PUSH_SUBSCRIPTIONS,
        env.VAPID_PRIVATE_KEY,
        targetUserId,
        { title, message, priority }
      )
    } else {
      // Send to all subscribers
      result = await sendPushToAll(
        env.PUSH_SUBSCRIPTIONS,
        env.VAPID_PRIVATE_KEY,
        { title, message, priority }
      )
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Get subscription stats
router.get('/api/stats', async (request, env) => {
  const authResult = await verifyAuth(request, env)
  if (!authResult.valid) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const count = await getSubscriptionCount(env.PUSH_SUBSCRIPTIONS)

  return new Response(JSON.stringify({ subscriberCount: count }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

// Default export
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

### 2. Subscription Management (src/subscription.js)
```javascript
export async function handleSubscription(kv, userId, subscription) {
  const subscriptionData = {
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userAgent: subscription.userAgent || 'Unknown',
    subscribedAt: Date.now(),
    isActive: true,
    lastSeen: Date.now()
  }

  // Store subscription with user ID as key
  await kv.put(`subscription:${userId}`, JSON.stringify(subscriptionData))

  // Also maintain a reverse index for counting
  await kv.put(`user:${userId}`, 'subscribed')

  return subscriptionData
}

export async function unsubscribe(kv, userId) {
  // Mark subscription as inactive
  const existing = await kv.get(`subscription:${userId}`)
  if (existing) {
    const data = JSON.parse(existing)
    data.isActive = false
    data.unsubscribedAt = Date.now()
    await kv.put(`subscription:${userId}`, JSON.stringify(data))
  }

  // Remove from active user index
  await kv.delete(`user:${userId}`)
}

export async function getAllActiveSubscriptions(kv) {
  // Get list of all subscription keys
  const list = await kv.list({ prefix: 'subscription:' })
  const subscriptions = []

  for (const key of list.keys) {
    const data = await kv.get(key.name)
    if (data) {
      const subscription = JSON.parse(data)
      if (subscription.isActive) {
        subscriptions.push(subscription)
      }
    }
  }

  return subscriptions
}

export async function getSubscriptionCount(kv) {
  const list = await kv.list({ prefix: 'user:' })
  return list.keys.length
}

export async function getSubscription(kv, userId) {
  const data = await kv.get(`subscription:${userId}`)
  return data ? JSON.parse(data) : null
}
```

### 3. Push Handler (src/push-handler.js)
```javascript
import webpush from 'web-push'
import { getAllActiveSubscriptions, getSubscription } from './subscription'

// Initialize web-push with VAPID keys
function initWebPush(privateKey, publicKey) {
  webpush.setVapidDetails(
    'mailto:admin@rodeomasjid.org',
    publicKey,
    privateKey
  )
}

export async function sendPushToAll(kv, privateKey, payload) {
  const publicKey = 'your-vapid-public-key' // Store in environment
  initWebPush(privateKey, publicKey)

  const subscriptions = await getAllActiveSubscriptions(kv)

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, message: 'No active subscriptions' }
  }

  const pushPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys
        },
        JSON.stringify({
          title: payload.title,
          body: payload.message,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: `announcement-${Date.now()}`,
          data: {
            priority: payload.priority,
            timestamp: Date.now()
          }
        })
      )
      return { success: true }
    } catch (error) {
      console.error('Push failed for user:', sub.userId, error)

      // Handle expired subscriptions
      if (error.statusCode === 410) {
        await unsubscribe(kv, sub.userId)
      }

      return { success: false, error: error.message }
    }
  })

  const results = await Promise.allSettled(pushPromises)

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length

  return {
    sent,
    failed,
    total: subscriptions.length,
    message: `Sent ${sent} notifications, ${failed} failed`
  }
}

export async function sendPushToUser(kv, privateKey, userId, payload) {
  const publicKey = 'your-vapid-public-key' // Store in environment
  initWebPush(privateKey, publicKey)

  const subscription = await getSubscription(kv, userId)

  if (!subscription || !subscription.isActive) {
    return { sent: 0, failed: 1, message: 'User not subscribed' }
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      JSON.stringify({
        title: payload.title,
        body: payload.message,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: `notification-${userId}-${Date.now()}`,
        data: {
          priority: payload.priority,
          timestamp: Date.now()
        }
      })
    )

    return { sent: 1, failed: 0, message: 'Notification sent successfully' }
  } catch (error) {
    console.error('Push failed for user:', userId, error)

    // Handle expired subscriptions
    if (error.statusCode === 410) {
      await unsubscribe(kv, userId)
    }

    return { sent: 0, failed: 1, error: error.message }
  }
}
```

### 4. Authentication (src/auth.js)
```javascript
export async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.substring(7) // Remove 'Bearer '

  // For Firebase Auth, verify the JWT token
  try {
    // In a real implementation, you'd verify the Firebase JWT
    // For now, we'll use a simple API key approach
    const validApiKey = env.API_KEY || 'your-secret-api-key'

    if (token !== validApiKey) {
      return { valid: false, error: 'Invalid API key' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Token verification failed' }
  }
}

// Future: Firebase JWT verification
export async function verifyFirebaseToken(token) {
  // This would verify Firebase JWT tokens
  // Implementation depends on your Firebase setup
  // Could use Firebase Admin SDK or manual JWT verification
}
```

---

## ⚙️ Configuration Files

### wrangler.toml
```toml
name = "masjid-push-notifications"
main = "src/index.js"
compatibility_date = "2024-01-15"

[env.production]
kv_namespaces = [
  { binding = "PUSH_SUBSCRIPTIONS", id = "your-kv-namespace-id" }
]

[vars]
VAPID_PUBLIC_KEY = "your-vapid-public-key"

# Secrets (set via wrangler secret put)
# VAPID_PRIVATE_KEY
# API_KEY
```

### package.json
```json
{
  "name": "masjid-push-worker",
  "version": "1.0.0",
  "description": "Cloudflare Worker for push notifications",
  "main": "src/index.js",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "itty-router": "^4.0.0",
    "web-push": "^3.6.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

---

## 🚀 Deployment Steps

### 1. Setup Cloudflare Account
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "PUSH_SUBSCRIPTIONS"
```

### 2. Generate VAPID Keys
```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output:
# Public Key: BH7Lx... (use in frontend)
# Private Key: m2Tc... (store as secret)
```

### 3. Set Secrets
```bash
# Set VAPID private key
wrangler secret put VAPID_PRIVATE_KEY

# Set API key for authentication
wrangler secret put API_KEY
```

### 4. Deploy Worker
```bash
# Deploy to production
wrangler deploy

# Your worker will be available at:
# https://masjid-push-notifications.your-subdomain.workers.dev
```

---

## 🔗 Frontend Integration

### Admin Panel Subscription (admin-new.html)
```javascript
class PushNotificationManager {
  constructor(workerUrl, apiKey) {
    this.workerUrl = workerUrl
    this.apiKey = apiKey
    this.vapidPublicKey = 'your-vapid-public-key'
  }

  async requestPermission() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push messaging not supported')
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Permission denied')
    }

    return permission
  }

  async subscribe(userId) {
    const registration = await navigator.serviceWorker.ready

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
    })

    // Send subscription to Cloudflare Worker
    const response = await fetch(`${this.workerUrl}/api/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        userId,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
          },
          userAgent: navigator.userAgent
        }
      })
    })

    if (!response.ok) {
      throw new Error('Failed to save subscription')
    }

    return subscription
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
      throw new Error('Failed to send notification')
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
      throw new Error('Failed to get stats')
    }

    const data = await response.json()
    return data.subscriberCount
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }
}

// Initialize the manager
const pushManager = new PushNotificationManager(
  'https://masjid-push-notifications.your-subdomain.workers.dev',
  'your-api-key'
)
```

---

## 🧪 Testing

### Local Development
```bash
# Start local development server
wrangler dev

# Your worker runs at http://localhost:8787
# Test endpoints:
# POST http://localhost:8787/api/subscribe
# POST http://localhost:8787/api/send-push
# GET http://localhost:8787/api/stats
```

### Test Notifications
```javascript
// Test push notification
fetch('http://localhost:8787/api/send-push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    title: 'Test Notification',
    message: 'This is a test from Cloudflare Workers!',
    priority: 'high'
  })
})
```

---

## 💰 Cost Analysis

### Cloudflare Workers Free Tier
- **100,000 requests/day** - More than enough for push notifications
- **10GB KV storage** - Can store 100,000+ subscriptions
- **Global edge locations** - Sub-50ms latency worldwide
- **No cold starts** - Always warm and ready

### Comparison with Alternatives
| Service | Cost | Requests/Month | Storage |
|---------|------|----------------|---------|
| Cloudflare Workers | **$0** | 3M free | 10GB |
| Firebase Functions | $0.40/M | 2M free | Pay per GB |
| AWS Lambda | $0.20/M | 1M free | Pay per GB |
| Vercel Functions | $20/month | 100k free | Limited |

**Winner: Cloudflare Workers** - Best free tier, no cold starts, global performance.

This Cloudflare Workers implementation provides a robust, free, and globally distributed push notification system that will scale with your needs!
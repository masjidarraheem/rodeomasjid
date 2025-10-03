# Product Requirements Document (PRD)
## Cloudflare Worker: FCM Push Notification Bridge

**Repository:** `masjid-push-worker` (Cloudflare Workers)
**Related Repository:** `rodeomasjid` (Main website with admin panel)
**Created:** January 2025
**Status:** Implementation Ready

---

## 🎯 Project Overview

### Purpose
Create a **Cloudflare Worker** that serves as a bridge between a Firebase-based admin panel and Firebase Cloud Messaging (FCM) for sending push notifications to community members when announcements are published.

### Architecture
```
Admin Panel (Firebase) → Cloudflare Worker → FCM API → User Devices
                        ↑
                    KV Storage (FCM Tokens)
```

### Why This Approach
- **Cost**: $0/month using free tiers (Cloudflare Workers + Firebase FCM)
- **Performance**: Global edge locations via Cloudflare (<50ms latency)
- **Reliability**: Firebase FCM handles all push service complexity
- **Simplicity**: Minimal worker code, leverages existing Firebase setup

---

## 🔑 Credentials & Configuration

### Firebase Credentials (Already Obtained)
```
Firebase Server Key (Legacy API): AIzaSyCxyJSgaYeY4C0g9tcV58dEjQMZ_EllNgc
VAPID Public Key: BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44
```

**⚠️ Security Note**: These keys will be stored as Cloudflare Workers secrets, NOT in code

### Cloudflare Setup (Completed)
- **Project Directory**: `pwa-noti/`
- **KV Namespace**: `FCM_TOKENS` (ID: `99969e9f43754e74b2458bd8173648eb`)
- **Worker Name**: `pwa-noti` (will be renamed to `masjid-push-notifications`)

---

## 🛠️ Technical Requirements

### API Endpoints Required

#### 1. Store FCM Token
```
POST /api/store-token
Content-Type: application/json

Request Body:
{
  "userId": "firebase-auth-uid",
  "fcmToken": "fcm-device-token"
}

Response:
{
  "success": true,
  "message": "FCM token stored successfully"
}
```

#### 2. Send Push Notification
```
POST /api/send-push
Content-Type: application/json
Authorization: Bearer {API_KEY}

Request Body:
{
  "title": "Announcement Title",
  "message": "Announcement message body",
  "priority": "high" | "normal"
}

Response:
{
  "sent": 25,
  "failed": 0,
  "total": 25,
  "message": "Sent 25 notifications, 0 failed"
}
```

#### 3. Get Subscriber Statistics
```
GET /api/stats
Authorization: Bearer {API_KEY}

Response:
{
  "subscriberCount": 25,
  "timestamp": 1704067200000
}
```

#### 4. Remove Token (Unsubscribe)
```
DELETE /api/remove-token/{userId}
Authorization: Bearer {API_KEY}

Response:
{
  "success": true,
  "message": "Token removed successfully"
}
```

#### 5. Health Check
```
GET /

Response: "Masjid Push Notifications API - Running! 🚀"
```

### KV Storage Schema

#### FCM Token Storage
```javascript
// Key: `token:${userId}`
{
  "fcmToken": "fcm-device-token",
  "userId": "firebase-auth-uid",
  "storedAt": 1704067200000,
  "isActive": true,
  "userAgent": "Mozilla/5.0..."
}

// Key: `user:${userId}` (for easy counting)
// Value: "fcm-device-token"
```

### FCM API Integration

#### Send Notification Payload
```javascript
{
  "registration_ids": ["token1", "token2", ...],
  "notification": {
    "title": "Announcement Title",
    "body": "Message content",
    "icon": "https://masjidarraheem.github.io/icons/icon-192.png",
    "click_action": "https://masjidarraheem.github.io"
  },
  "data": {
    "priority": "high",
    "timestamp": "1704067200000",
    "url": "https://masjidarraheem.github.io"
  }
}
```

### CORS Configuration
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://masjidarraheem.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

---

## 💻 Implementation Specifications

### Dependencies Required
```json
{
  "dependencies": {
    "itty-router": "^4.0.0"
  }
}
```

### Environment Variables (Cloudflare Secrets)
```bash
FCM_SERVER_KEY="AIzaSyCxyJSgaYeY4C0g9tcV58dEjQMZ_EllNgc"
API_KEY="masjid_2025_secure_api_key_xyz789" # Create secure key
```

### Configuration (wrangler.jsonc)
```json
{
  "name": "masjid-push-notifications",
  "main": "src/index.js",
  "compatibility_date": "2024-01-15",
  "kv_namespaces": [
    {
      "binding": "FCM_TOKENS",
      "id": "99969e9f43754e74b2458bd8173648eb"
    }
  ]
}
```

### Error Handling Requirements
- **401 Unauthorized**: Invalid/missing API key
- **400 Bad Request**: Missing required fields
- **500 Internal Server Error**: FCM API failures, KV storage errors
- **Graceful degradation**: Continue operation if some tokens fail
- **Token cleanup**: Remove invalid/expired FCM tokens (HTTP 410 responses)

### Security Requirements
- **API Key Authentication**: All admin endpoints require Bearer token
- **CORS Restriction**: Only allow requests from admin panel domain
- **Input Validation**: Validate all request bodies
- **Rate Limiting**: Natural rate limiting via Cloudflare (100k req/day)

---

## 🔄 Integration Points

### Frontend Integration (admin-new.html)
The worker will be called from the existing admin panel:

#### FCM Manager Class Usage
```javascript
const fcmPushManager = new FCMPushManager(
  'https://masjid-push-notifications.your-subdomain.workers.dev',
  'your-secure-api-key',
  'BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44'
)

// Store token when user grants permission
await fcmPushManager.requestPermissionAndSubscribe(userId)

// Send notification when admin publishes announcement
await fcmPushManager.sendPushNotification(title, message, priority)
```

### Service Worker Integration (firebase-messaging-sw.js)
```javascript
// Handle background FCM messages
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'masjid-announcement',
    data: payload.data
  }
  return self.registration.showNotification(notificationTitle, notificationOptions)
})
```

---

## 📊 Success Criteria

### Functional Requirements
- [ ] **Health Check**: Worker responds to GET / with success message
- [ ] **Token Storage**: Can store FCM tokens in KV with user ID mapping
- [ ] **Push Sending**: Can send notifications via FCM to all stored tokens
- [ ] **Statistics**: Can retrieve current subscriber count
- [ ] **Token Removal**: Can unsubscribe users by removing tokens
- [ ] **Error Handling**: Graceful handling of FCM API errors and invalid tokens

### Performance Requirements
- **Response Time**: <200ms for API endpoints
- **FCM Delivery**: <5 seconds to send to 100 subscribers
- **Global Latency**: <100ms via Cloudflare edge locations
- **Throughput**: Handle 1000+ notification sends per day

### Reliability Requirements
- **Uptime**: >99.9% availability
- **Error Rate**: <1% for valid requests
- **Token Persistence**: KV storage reliability for subscriber data
- **FCM Integration**: Handle FCM service interruptions gracefully

---

## 🧪 Testing Requirements

### Unit Testing
- [ ] API endpoint routing works correctly
- [ ] KV storage operations (put/get/delete)
- [ ] FCM API payload formatting
- [ ] Error handling for various failure modes
- [ ] CORS header application

### Integration Testing
- [ ] End-to-end token storage and retrieval
- [ ] FCM notification sending with real tokens
- [ ] Authentication with valid/invalid API keys
- [ ] Cross-browser compatibility for CORS

### Load Testing
- [ ] Concurrent token storage requests
- [ ] Bulk notification sending (100+ subscribers)
- [ ] KV storage performance under load

---

## 📚 Implementation Resources

### Complete Worker Code
**The AI agent should implement the complete worker code as specified in:**
- `FCM-CloudflareWorkers-Hybrid.md` (full implementation example)
- `SETUP-Guide.md` (step-by-step setup instructions)

### Key Functions to Implement
1. **Request Router**: Handle all API endpoints with proper CORS
2. **Token Management**: Store/retrieve/delete FCM tokens in KV
3. **FCM Integration**: Send notifications via Firebase FCM REST API
4. **Authentication**: Validate API keys for admin endpoints
5. **Error Handling**: Comprehensive error responses and logging

### Deployment Steps
```bash
# Set secrets
wrangler secret put FCM_SERVER_KEY
wrangler secret put API_KEY

# Deploy to production
wrangler deploy

# Test deployment
curl https://your-worker-url.workers.dev/
```

---

## 🔗 Related Documentation

### Reference Files (from main repository)
- `PLANNING-Notifications.md` - Overall project planning
- `FCM-CloudflareWorkers-Hybrid.md` - Complete implementation guide
- `SETUP-Guide.md` - Step-by-step setup instructions
- `DEPLOYMENT-Checklist.md` - Deployment verification steps

### Firebase Project Details
- **Project ID**: `rodeomasjid`
- **Domain**: `https://masjidarraheem.github.io`
- **Admin Panel**: `https://masjidarraheem.github.io/admin-new.html`

---

## 🎯 Expected Deliverables

### Code Deliverables
- [ ] `src/index.js` - Complete Cloudflare Worker implementation
- [ ] `package.json` - Updated with itty-router dependency
- [ ] `wrangler.jsonc` - Proper configuration with KV namespace
- [ ] `README.md` - Setup and deployment instructions

### Testing Deliverables
- [ ] **API Testing**: All endpoints respond correctly
- [ ] **FCM Integration**: Successful notification delivery
- [ ] **Error Scenarios**: Proper error handling verification
- [ ] **Performance**: Response time benchmarks

### Documentation Deliverables
- [ ] **API Documentation**: Endpoint specifications and examples
- [ ] **Deployment Guide**: How to deploy and configure secrets
- [ ] **Troubleshooting**: Common issues and solutions
- [ ] **Integration Guide**: How frontend calls the worker

---

## ⚠️ Important Notes

### Security Considerations
- **Never commit Firebase server key to repository**
- **Use Cloudflare Workers secrets for all sensitive data**
- **Validate all inputs to prevent injection attacks**
- **Implement proper CORS to prevent unauthorized access**

### Cost Monitoring
- **Cloudflare Workers**: 100,000 requests/day free tier
- **Cloudflare KV**: 10GB storage, 100,000 reads/day free tier
- **Firebase FCM**: Unlimited messages free
- **Total Expected Cost**: $0/month

### Future Enhancements
- **Push notification scheduling**
- **User segmentation and targeting**
- **Notification analytics and tracking**
- **Integration with Firebase Auth for enhanced security**

---

## 🚀 Ready to Implement

**The AI agent has everything needed to:**
1. **Replace the default Hello World worker code**
2. **Implement all required API endpoints**
3. **Configure KV storage integration**
4. **Set up FCM API integration**
5. **Deploy and test the complete system**

**Current State**: Cloudflare Workers project created, KV namespace configured, Firebase credentials available.

**Next Step**: Implement the complete FCM push notification worker code.
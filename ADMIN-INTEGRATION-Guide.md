# Admin Panel Integration Guide
## Connecting Cloudflare Worker to Your Admin Panel

**Status:** Cloudflare Worker ✅ Complete - Ready for Integration
**Next Steps:** Deploy Worker + Integrate with admin-new.html

---

## 🎉 **Cloudflare Worker Status: COMPLETE**

The other AI agent successfully implemented:
- ✅ Health Check endpoint
- ✅ FCM token storage in KV
- ✅ Push notification sending via FCM API
- ✅ Subscriber statistics
- ✅ Token removal (unsubscribe)
- ✅ CORS configuration for your domain
- ✅ API key authentication
- ✅ Comprehensive error handling

---

## 🚀 **Step 1: Deploy Your Cloudflare Worker**

### Set Required Secrets
```bash
cd /home/qcloud/masjid-push-worker/pwa-noti

# Set Firebase server key (keep this secret!)
wrangler secret put FCM_SERVER_KEY
# When prompted, paste: AIzaSyCxyJSgaYeY4C0g9tcV58dEjQMZ_EllNgc

# Set API key for authentication (create a strong key)
wrangler secret put API_KEY
# When prompted, create something like: masjid_push_2025_secure_xyz789
```

### Deploy to Production
```bash
# Deploy the worker
npm run deploy

# Or alternatively:
wrangler deploy
```

**Expected Output:**
```
✨ Successfully published your Worker to
   https://masjid-push-notifications.your-subdomain.workers.dev
```

**📝 Copy this Worker URL - you'll need it for the admin panel!**

### Test the Deployment
```bash
# Test health endpoint
curl https://masjid-push-notifications.your-subdomain.workers.dev/

# Should return: "Masjid Push Notifications API - Running! 🚀"
```

---

## 🔗 **Step 2: Integrate with Admin Panel**

### Add Service Worker for FCM

Create file: `/firebase-messaging-sw.js` (in your website root directory):

```javascript
// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase with your existing config
firebase.initializeApp({
  apiKey: "YOUR_EXISTING_FIREBASE_API_KEY",
  authDomain: "rodeomasjid.firebaseapp.com",
  projectId: "rodeomasjid",
  storageBucket: "rodeomasjid.appspot.com",
  messagingSenderId: "YOUR_EXISTING_SENDER_ID",
  appId: "YOUR_EXISTING_APP_ID"
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background Message:', payload)

  const notificationTitle = payload.notification?.title || 'Masjid Announcement'
  const notificationOptions = {
    body: payload.notification?.body || 'New announcement available',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'masjid-announcement',
    data: payload.data,
    requireInteraction: true
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

### Update Admin Panel (admin-new.html)

Add this FCM Push Manager class to your `admin-new.html` file before the closing `</script>` tag:

```javascript
// FCM Push Notification Manager
class FCMPushManager {
  constructor(workerUrl, apiKey, vapidKey) {
    this.workerUrl = workerUrl
    this.apiKey = apiKey
    this.vapidKey = vapidKey
    this.messaging = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return this.messaging

    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      throw new Error('Push notifications not supported in this browser')
    }

    try {
      // Initialize Firebase Messaging (reuse existing Firebase instance)
      const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js')

      this.messaging = getMessaging()
      this.isInitialized = true

      // Handle foreground messages
      onMessage(this.messaging, (payload) => {
        console.log('Foreground message:', payload)
        this.showNotificationBanner(payload.notification?.title, payload.notification?.body)
      })

      return this.messaging
    } catch (error) {
      console.error('FCM initialization failed:', error)
      throw new Error('Failed to initialize push notifications')
    }
  }

  async requestPermissionAndSubscribe(userId) {
    try {
      await this.initialize()

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission denied. Please enable notifications in your browser settings.')
      }

      // Get FCM token
      const fcmToken = await getToken(this.messaging, {
        vapidKey: this.vapidKey
      })

      if (!fcmToken) {
        throw new Error('Failed to get FCM token. Please try again.')
      }

      // Store token in Cloudflare Worker
      const response = await fetch(`${this.workerUrl}/api/store-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          fcmToken: fcmToken
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to store FCM token')
      }

      console.log('✅ Push notifications enabled successfully')
      return fcmToken

    } catch (error) {
      console.error('❌ Push notification setup failed:', error)
      throw error
    }
  }

  async sendPushNotification(title, message, priority = 'normal') {
    try {
      const response = await fetch(`${this.workerUrl}/api/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          title: title,
          message: message,
          priority: priority
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send push notification')
      }

      return result

    } catch (error) {
      console.error('❌ Push notification sending failed:', error)
      throw error
    }
  }

  async getSubscriberCount() {
    try {
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

    } catch (error) {
      console.error('❌ Failed to get subscriber count:', error)
      return 0
    }
  }

  showNotificationBanner(title, message) {
    // Show in-app notification for foreground messages
    const banner = document.createElement('div')
    banner.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: var(--primary); color: white; padding: 16px;
      border-radius: 8px; box-shadow: var(--shadow-lg);
      max-width: 300px; font-size: 14px;
    `
    banner.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
      <div>${message}</div>
    `

    document.body.appendChild(banner)

    setTimeout(() => {
      banner.remove()
    }, 5000)
  }

  async unsubscribe(userId) {
    try {
      const response = await fetch(`${this.workerUrl}/api/remove-token/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      return response.ok
    } catch (error) {
      console.error('❌ Unsubscribe failed:', error)
      return false
    }
  }
}

// Initialize FCM Push Manager with your values
const fcmPushManager = new FCMPushManager(
  'https://masjid-push-notifications.your-subdomain.workers.dev', // Replace with your actual Worker URL
  'your-secure-api-key', // Replace with the API key you created
  'BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44'
)
```

### Update Your AdminApp Class

Add these methods to your existing `AdminApp` class in `admin-new.html`:

```javascript
class AdminApp {
  // ... your existing methods ...

  // Add this method to initialize push notifications after login
  async initializePushNotifications() {
    try {
      if (!this.currentUser) {
        console.log('❌ No user logged in, skipping push notifications')
        return
      }

      console.log('🔔 Initializing push notifications...')

      // Request permission and subscribe
      await fcmPushManager.requestPermissionAndSubscribe(this.currentUser.uid)

      // Get and display subscriber count
      const count = await fcmPushManager.getSubscriberCount()
      console.log(`📊 Current subscribers: ${count}`)

      // You can show this count in the UI if desired
      this.updateSubscriberCount(count)

    } catch (error) {
      console.error('⚠️ Push notification setup failed (non-critical):', error.message)
      // Don't break the app if push notifications fail
      this.showNotificationSetupError(error.message)
    }
  }

  updateSubscriberCount(count) {
    // Optional: Update UI to show subscriber count
    // You can add this to your dashboard stats if desired
    console.log(`📱 Push notification subscribers: ${count}`)
  }

  showNotificationSetupError(message) {
    // Optional: Show user-friendly message about push notifications
    console.log(`ℹ️ Push notifications unavailable: ${message}`)
  }

  // Update your existing showApp method to include push notification setup
  async showApp() {
    // ... your existing showApp code ...

    // Add this at the end of showApp method:
    setTimeout(async () => {
      await this.initializePushNotifications()
    }, 1000) // Delay to ensure app is fully loaded
  }
}
```

### Update Announcement Creation

Modify your existing announcement form submission to include push notifications.

**Find your announcement form in `admin-new.html` and update it:**

```javascript
// Update your getAnnouncementForm method to include push notification checkbox
getAnnouncementForm() {
  return `
    <form id="announcementForm">
      <div class="form-group">
        <label for="announcementTitle">Title</label>
        <input type="text" id="announcementTitle" class="form-input" placeholder="Enter announcement title" required>
      </div>
      <div class="form-group">
        <label for="announcementMessage">Message</label>
        <textarea id="announcementMessage" class="form-input" rows="4" placeholder="Enter your message" required></textarea>
      </div>
      <div class="form-group">
        <label for="announcementPriority">Priority</label>
        <select id="announcementPriority" class="form-input">
          <option value="low">Normal</option>
          <option value="medium">Important</option>
          <option value="high">Urgent</option>
        </select>
      </div>
      <div class="form-group">
        <label for="announcementExpiry">Expires On (Optional)</label>
        <input type="datetime-local" id="announcementExpiry" class="form-input">
      </div>

      <!-- NEW: Push Notification Section -->
      <div class="form-group" style="background: #f0f9ff; padding: 16px; border-radius: 8px; border: 1px solid #0ea5e9;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <input type="checkbox" id="sendPushNotification" style="width: auto;">
          <label for="sendPushNotification" style="margin: 0; font-weight: 600; color: #0369a1;">
            📱 Send push notification
          </label>
        </div>
        <div id="pushNotificationInfo" style="color: #0369a1; font-size: 13px;">
          Loading subscriber count...
        </div>
      </div>

      <button type="submit" class="btn btn-primary">Publish Announcement</button>
    </form>
  `
}
```

**Update your form submission handler:**

```javascript
// Find where you handle announcement form submission and replace/update it
async function handleAnnouncementSubmission(formData) {
  try {
    const sendPush = document.getElementById('sendPushNotification')?.checked || false

    // Create announcement data
    const announcementData = {
      title: formData.get('title') || document.getElementById('announcementTitle').value,
      message: formData.get('message') || document.getElementById('announcementMessage').value,
      priority: formData.get('priority') || document.getElementById('announcementPriority').value,
      expiresAt: formData.get('expiresAt') || document.getElementById('announcementExpiry').value || null,
      createdAt: new Date(),
      publishedBy: this.currentUser?.email || 'admin'
    }

    // 1. Save announcement to Firebase Firestore
    console.log('💾 Saving announcement to Firebase...')
    const docRef = await addDoc(collection(db, 'announcements'), announcementData)

    // 2. Send push notification if requested
    if (sendPush) {
      console.log('📤 Sending push notification...')

      try {
        const pushResult = await fcmPushManager.sendPushNotification(
          announcementData.title,
          announcementData.message,
          announcementData.priority
        )

        console.log('✅ Push notification result:', pushResult)

        // 3. Update announcement with push status
        await updateDoc(docRef, {
          pushSent: true,
          pushSentAt: new Date(),
          pushRecipients: pushResult.sent,
          pushFailed: pushResult.failed
        })

        this.showSuccess(`✅ Announcement published and sent to ${pushResult.sent} subscribers!`)

      } catch (pushError) {
        console.error('⚠️ Push notification failed:', pushError)

        // Update with failed status
        await updateDoc(docRef, {
          pushSent: false,
          pushError: pushError.message,
          pushAttemptedAt: new Date()
        })

        this.showSuccess('✅ Announcement published (push notification failed)')
        this.showError(`⚠️ Push notification error: ${pushError.message}`)
      }
    } else {
      this.showSuccess('✅ Announcement published successfully!')
    }

    // Close modal and refresh if needed
    this.closeModal()
    if (typeof this.loadAnnouncementsList === 'function') {
      this.loadAnnouncementsList()
    }

  } catch (error) {
    console.error('❌ Failed to publish announcement:', error)
    this.showError('❌ Failed to publish announcement. Please try again.')
  }
}
```

**Update the modal display to show subscriber count:**

```javascript
// Add this to run when the announcement form is shown
async function updatePushNotificationInfo() {
  try {
    const count = await fcmPushManager.getSubscriberCount()
    const infoDiv = document.getElementById('pushNotificationInfo')

    if (infoDiv) {
      if (count > 0) {
        infoDiv.innerHTML = `✅ Will notify ${count} subscriber${count !== 1 ? 's' : ''}`
        infoDiv.style.color = '#059669'
      } else {
        infoDiv.innerHTML = '⚠️ No subscribers yet. Users need to enable notifications first.'
        infoDiv.style.color = '#d97706'
      }
    }
  } catch (error) {
    const infoDiv = document.getElementById('pushNotificationInfo')
    if (infoDiv) {
      infoDiv.innerHTML = '❌ Unable to load subscriber count'
      infoDiv.style.color = '#dc2626'
    }
  }
}

// Call this function when showing the announcement form
// Add to your handleQuickAction method for 'new-announcement':
case 'new-announcement':
  title = 'Create New Announcement';
  content = this.getAnnouncementForm();

  // Show modal first
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modal.style.display = 'flex';

  // Then update subscriber count
  setTimeout(updatePushNotificationInfo, 100);
  break;
```

---

## 🔧 **Configuration Values to Update**

### Replace These Placeholders:

**In the FCMPushManager initialization:**
```javascript
const fcmPushManager = new FCMPushManager(
  'https://YOUR-ACTUAL-WORKER-URL.workers.dev', // Replace with deployed worker URL
  'your-actual-api-key', // Replace with the API key you set as secret
  'BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44'
)
```

**In firebase-messaging-sw.js:**
- Replace Firebase config with your actual values from `admin-new.html`

---

## 🧪 **Testing Your Integration**

### 1. Test Worker Deployment
```bash
curl https://your-worker-url.workers.dev/
# Should return: "Masjid Push Notifications API - Running! 🚀"
```

### 2. Test Admin Panel Integration
1. **Login to admin panel**
2. **Check browser console** for push notification initialization
3. **Grant notification permission** when prompted
4. **Create test announcement** with push notification enabled
5. **Verify notification appears** on your device

### 3. End-to-End Test
1. **Multiple devices/browsers** subscribe to notifications
2. **Publish announcement** from admin panel
3. **Verify all devices** receive the notification
4. **Check click action** opens your website

---

## 📊 **Success Checklist**

- [ ] **Worker deployed** and health check returns success
- [ ] **Secrets configured** (FCM_SERVER_KEY, API_KEY)
- [ ] **Service worker created** (firebase-messaging-sw.js)
- [ ] **FCM manager added** to admin-new.html
- [ ] **Announcement form updated** with push notification checkbox
- [ ] **Form submission updated** to send push notifications
- [ ] **Subscriber count displays** correctly
- [ ] **Test notification sent** successfully
- [ ] **Notifications received** on devices
- [ ] **Click actions work** (open website)

**🎉 Once complete, you'll have a fully functional push notification system at $0/month cost!**
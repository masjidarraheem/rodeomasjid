// Firebase Cloud Messaging Service Worker
// Handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase configuration (must match main app config)
// Note: These values are public and safe to include in service worker
const firebaseConfig = {
  apiKey: "PLACEHOLDER_FIREBASE_API_KEY",
  authDomain: "PLACEHOLDER_FIREBASE_AUTH_DOMAIN",
  projectId: "PLACEHOLDER_FIREBASE_PROJECT_ID",
  storageBucket: "PLACEHOLDER_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "PLACEHOLDER_FIREBASE_MESSAGING_SENDER_ID",
  appId: "PLACEHOLDER_FIREBASE_APP_ID"
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging()

// Message deduplication for iOS Safari
const processedMessages = new Set();
const MESSAGE_TIMEOUT = 5000; // 5 seconds

// Handle background messages when app is not in focus
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  // Create unique message ID for deduplication
  const messageId = payload.data?.timestamp || payload.notification?.title + Date.now();

  // Check if we've already processed this message recently
  if (processedMessages.has(messageId)) {
    console.log('[firebase-messaging-sw.js] Duplicate message detected, ignoring:', messageId);
    return;
  }

  // Mark message as processed
  processedMessages.add(messageId);

  // Clean up old message IDs after timeout
  setTimeout(() => {
    processedMessages.delete(messageId);
  }, MESSAGE_TIMEOUT);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Masjid Ar-Raheem'
  const notificationOptions = {
    body: payload.notification?.body || 'New announcement available',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'masjid-announcement', // Replaces previous notifications with same tag
    renotify: false, // Don't renotify for same tag (prevents iOS duplicates)
    requireInteraction: false, // Don't require user interaction to dismiss
    silent: false, // Allow sound/vibration
    data: {
      click_action: payload.data?.url || 'https://rodeomasjid.org',
      priority: payload.data?.priority || 'normal',
      timestamp: payload.data?.timestamp || Date.now(),
      announcement: payload.data?.announcement || null
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/icon-32.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-32.png'
      }
    ]
  }

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event)

  event.notification.close()

  // Handle action buttons
  if (event.action === 'dismiss') {
    return // Just close the notification
  }

  // Default action or 'view' action - open the website
  const clickAction = event.notification.data?.click_action || 'https://rodeomasjid.org'

  // Check if this notification has announcement data
  const announcementData = event.notification.data?.announcement

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If a window is already open, focus it and show the announcement
      for (const client of clientList) {
        if (client.url.includes('rodeomasjid.org') && 'focus' in client) {
          // Send message to the page to show the specific announcement
          if (announcementData) {
            client.postMessage({
              type: 'SHOW_ANNOUNCEMENT',
              announcement: announcementData
            })
          }
          return client.focus()
        }
      }

      // If no window is open, open a new one with announcement parameter
      if (clients.openWindow) {
        let targetUrl = clickAction
        if (announcementData) {
          // Add announcement ID as URL parameter
          const url = new URL(targetUrl)
          url.searchParams.set('showAnnouncement', announcementData.id)
          targetUrl = url.toString()
        }
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Note: Removed generic 'push' event handler to prevent iOS Safari duplicate notifications
// Firebase's onBackgroundMessage handles all push notifications properly

console.log('[firebase-messaging-sw.js] Service Worker loaded successfully')
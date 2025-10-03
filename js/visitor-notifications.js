// Visitor Push Notification Manager for Main Website
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

class VisitorNotificationManager {
    constructor() {
        this.workerUrl = window.ENV?.CLOUDFLARE_WORKER_URL || 'https://masjid-push-notifications.rodeomasjid.workers.dev';
        this.vapidKey = window.ENV?.VAPID_KEY || 'BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44';
        this.messaging = null;
        this.isInitialized = false;
        this.notificationBanner = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize Firebase for main website
            const firebaseConfig = {
                apiKey: window.ENV?.FIREBASE_API_KEY || "your-api-key",
                authDomain: window.ENV?.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
                projectId: window.ENV?.FIREBASE_PROJECT_ID || "your-project-id",
                storageBucket: window.ENV?.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
                messagingSenderId: window.ENV?.FIREBASE_MESSAGING_SENDER_ID || "123456789",
                appId: window.ENV?.FIREBASE_APP_ID || "your-app-id"
            };

            const app = initializeApp(firebaseConfig);
            this.messaging = getMessaging(app);

            // Handle foreground messages
            onMessage(this.messaging, (payload) => {
                console.log('Received foreground message:', payload);
                this.showNotificationBanner(
                    payload.notification?.title || 'New Announcement',
                    payload.notification?.body || 'You have a new message from Masjid Ar-Raheem'
                );
            });

            this.isInitialized = true;
            console.log('✅ Visitor notifications initialized');
        } catch (error) {
            console.error('❌ Failed to initialize visitor notifications:', error);
        }
    }

    async checkAndPromptForNotifications() {
        // Check if browser supports notifications
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            console.log('Browser does not support push notifications');
            return;
        }

        // Check current permission status
        const permission = Notification.permission;

        if (permission === 'granted') {
            console.log('Notifications already granted');
            await this.subscribeToNotifications();
            return;
        }

        if (permission === 'denied') {
            console.log('Notifications denied by user');
            return;
        }

        // Show notification prompt banner for first-time visitors
        this.showNotificationPromptBanner();
    }

    showNotificationPromptBanner() {
        // Don't show if already shown in this session
        if (sessionStorage.getItem('notificationPromptShown')) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'notificationPromptBanner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 500px;
            margin: 0 auto;
            font-family: 'Poppins', sans-serif;
        `;

        banner.innerHTML = `
            <div style="font-size: 24px;">🔔</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">Stay Updated</div>
                <div style="font-size: 14px; opacity: 0.9;">Get notified about prayer times, events, and important announcements from Masjid Ar-Raheem</div>
            </div>
            <button id="enableNotifications" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
            ">Enable</button>
            <button id="dismissNotifications" style="
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.7);
                cursor: pointer;
                font-size: 18px;
                padding: 4px;
            ">&times;</button>
        `;

        document.body.appendChild(banner);

        // Handle enable button
        document.getElementById('enableNotifications').onclick = async () => {
            await this.requestNotificationPermission();
            banner.remove();
        };

        // Handle dismiss button
        document.getElementById('dismissNotifications').onclick = () => {
            banner.remove();
            sessionStorage.setItem('notificationPromptShown', 'true');
        };

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (document.getElementById('notificationPromptBanner')) {
                banner.remove();
                sessionStorage.setItem('notificationPromptShown', 'true');
            }
        }, 10000);
    }

    async requestNotificationPermission() {
        try {
            await this.initialize();

            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                await this.subscribeToNotifications();
                this.showSuccessMessage();
            } else {
                console.log('❌ Notification permission denied');
                this.showErrorMessage('Notifications disabled. You can enable them in your browser settings.');
            }

            sessionStorage.setItem('notificationPromptShown', 'true');
        } catch (error) {
            console.error('❌ Error requesting notification permission:', error);
            this.showErrorMessage('Failed to enable notifications. Please try again.');
        }
    }

    async subscribeToNotifications() {
        try {
            if (!this.messaging) {
                await this.initialize();
            }

            // Get FCM token
            const fcmToken = await getToken(this.messaging, {
                vapidKey: this.vapidKey
            });

            if (!fcmToken) {
                throw new Error('Failed to get FCM token');
            }

            // Store token with Cloudflare Worker
            const response = await fetch(`${this.workerUrl}/api/store-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    fcmToken: fcmToken,
                    userType: 'visitor',
                    subscribedAt: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            });

            if (!response.ok) {
                throw new Error('Failed to subscribe to notifications');
            }

            console.log('✅ Successfully subscribed to notifications');

            // Store subscription status locally
            localStorage.setItem('notificationsEnabled', 'true');
            localStorage.setItem('fcmToken', fcmToken);

        } catch (error) {
            console.error('❌ Failed to subscribe to notifications:', error);
            throw error;
        }
    }

    showNotificationBanner(title, message) {
        // Remove existing banner if present
        const existing = document.getElementById('notificationBanner');
        if (existing) {
            existing.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'notificationBanner';
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2c3e50;
            color: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            max-width: 350px;
            font-family: 'Poppins', sans-serif;
            cursor: pointer;
        `;

        banner.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 16px;">${title}</div>
            <div style="font-size: 14px; line-height: 1.4; opacity: 0.9;">${message}</div>
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Tap to dismiss</div>
        `;

        document.body.appendChild(banner);

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.remove();
            }
        }, 8000);

        // Remove on click
        banner.onclick = () => banner.remove();
    }

    showSuccessMessage() {
        this.showNotificationBanner(
            '🔔 Notifications Enabled!',
            'You\'ll now receive updates about prayer times, events, and announcements from Masjid Ar-Raheem.'
        );
    }

    showErrorMessage(message) {
        this.showNotificationBanner('❌ Notification Error', message);
    }

    // Check if user is already subscribed
    isSubscribed() {
        return localStorage.getItem('notificationsEnabled') === 'true';
    }
}

// Initialize and start the visitor notification system
const visitorNotifications = new VisitorNotificationManager();

// Start the process after page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the page to fully load, then check for notifications
    setTimeout(() => {
        if (!visitorNotifications.isSubscribed()) {
            visitorNotifications.checkAndPromptForNotifications();
        } else {
            // Already subscribed, just initialize for foreground messages
            visitorNotifications.initialize();
        }
    }, 3000); // Wait 3 seconds after page load
});

export default visitorNotifications;
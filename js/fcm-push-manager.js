// FCM Push Notification Manager for Admin Panel
import { messaging } from './firebase-config.js';
import { getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

class FCMPushManager {
    constructor() {
        this.workerUrl = window.ENV?.CLOUDFLARE_WORKER_URL || 'https://masjid-push-notifications.rodeomasjid.workers.dev';
        this.apiKey = window.ENV?.PUSH_API_KEY || 'masjid_push_2025_secure_xyz789'; // Use actual API key as fallback
        this.vapidKey = window.ENV?.VAPID_KEY || 'BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44';
        this.messaging = messaging;
        this.isInitialized = false;

        // Debug: Log what we're using
        console.log('🔧 FCM Push Manager initialized with:');
        console.log('  Worker URL:', this.workerUrl);
        console.log('  API Key (first 10 chars):', this.apiKey?.substring(0, 10) + '...');
        console.log('  Using placeholder env?', window.ENV?.PUSH_API_KEY === 'PLACEHOLDER_PUSH_API_KEY' ? '❌ YES (using fallback)' : '✅ NO (using env)');
    }

    async initialize() {
        if (this.isInitialized) return this.messaging;

        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            throw new Error('Push notifications not supported in this browser');
        }

        try {
            this.isInitialized = true;

            // Handle foreground messages
            onMessage(this.messaging, (payload) => {
                console.log('Foreground message:', payload);
                this.showNotificationBanner(payload.notification?.title, payload.notification?.body);
            });

            return this.messaging;
        } catch (error) {
            console.error('FCM initialization failed:', error);
            throw new Error('Failed to initialize push notifications');
        }
    }

    async requestPermissionAndSubscribe(userId) {
        try {
            await this.initialize();

            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied. Please enable notifications in your browser settings.');
            }

            // Get FCM token
            const fcmToken = await getToken(this.messaging, {
                vapidKey: this.vapidKey
            });

            if (!fcmToken) {
                throw new Error('Failed to get FCM token. Please try again.');
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
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to store FCM token');
            }

            console.log('✅ Push notifications enabled successfully');
            return fcmToken;

        } catch (error) {
            console.error('❌ Push notification setup failed:', error);
            throw error;
        }
    }

    async sendPushNotification(title, message, priority = 'normal') {
        try {
            console.log('📤 Sending push notification:', { title, message, priority });
            console.log('🔗 Worker URL:', this.workerUrl);
            console.log('🔑 Using API Key:', this.apiKey?.substring(0, 10) + '...');

            const requestData = {
                title: title,
                message: message,
                priority: priority
            };

            const response = await fetch(`${this.workerUrl}/api/send-push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            console.log('📡 Response status:', response.status, response.statusText);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            let result;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                // If response is not JSON, get text for debugging
                const textResponse = await response.text();
                console.error('❌ Non-JSON response received:', textResponse);
                console.error('❌ Full response text (first 500 chars):', textResponse.substring(0, 500));
                console.error('❌ Response URL:', response.url);
                console.error('❌ Request headers sent:', {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                });

                // Check if this is a Cloudflare error page
                if (textResponse.includes('<html') || textResponse.includes('<!DOCTYPE')) {
                    console.error('❌ Received HTML page instead of API response');

                    if (textResponse.includes('404') || textResponse.includes('not found')) {
                        throw new Error('API endpoint /api/send-push not found on Cloudflare Worker');
                    } else if (textResponse.includes('500') || textResponse.includes('internal server error')) {
                        throw new Error('Cloudflare Worker crashed with internal server error');
                    } else if (textResponse.includes('403') || textResponse.includes('forbidden')) {
                        throw new Error('Access denied to Cloudflare Worker API endpoint');
                    } else {
                        throw new Error('Cloudflare Worker returned HTML error page instead of JSON API response');
                    }
                }

                if (response.status === 500) {
                    throw new Error('Cloudflare Worker internal server error. Check worker logs.');
                } else if (response.status === 404) {
                    throw new Error('Send-push endpoint not found. Check worker deployment.');
                } else if (response.status === 401) {
                    throw new Error('Invalid API key for push notifications.');
                } else {
                    throw new Error(`Server returned ${response.status}: ${textResponse.substring(0, 200)}...`);
                }
            }

            if (!response.ok) {
                console.error('❌ Push notification failed:', result);
                throw new Error(result.error || `Failed to send push notifications (${response.status})`);
            }

            console.log('✅ Push notification sent successfully:', result);
            return result;

        } catch (error) {
            console.error('❌ Push notification sending failed:', error);

            // Provide specific error guidance
            if (error.message.includes('fetch')) {
                throw new Error('Network error: Unable to reach Cloudflare Worker. Check internet connection.');
            } else if (error.message.includes('JSON')) {
                throw new Error('Worker response error: Cloudflare Worker returned invalid response.');
            } else {
                throw error;
            }
        }
    }

    async getSubscriberCount() {
        try {
            const response = await fetch(`${this.workerUrl}/api/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get subscriber count');
            }

            const data = await response.json();
            return data.subscriberCount;

        } catch (error) {
            console.error('❌ Failed to get subscriber count:', error);
            return 0;
        }
    }

    showNotificationBanner(title, message) {
        // Show in-app notification for foreground messages
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #667eea; color: white; padding: 16px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 300px; font-size: 14px;
        `;
        banner.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
            <div>${message}</div>
        `;

        document.body.appendChild(banner);

        setTimeout(() => {
            banner.remove();
        }, 5000);
    }

    async unsubscribe(userId) {
        try {
            const response = await fetch(`${this.workerUrl}/api/remove-token/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Unsubscribe failed:', error);
            return false;
        }
    }
}

export default FCMPushManager;
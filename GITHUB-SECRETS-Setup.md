# GitHub Secrets Setup for Push Notifications

## 🔐 Required GitHub Repository Secrets

You need to add these secrets to your GitHub repository for push notifications to work on GitHub Pages.

### How to Add Secrets:
1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## 📋 Secrets to Add

### Firebase Configuration (Existing)
```
FIREBASE_API_KEY = AIzaSyDI7ygCJMLhAVWM-cFfTAIv6edbRskAD0s
FIREBASE_AUTH_DOMAIN = rodeo-masjid-admin.firebaseapp.com
FIREBASE_PROJECT_ID = rodeo-masjid-admin
FIREBASE_STORAGE_BUCKET = rodeo-masjid-admin.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID = 409876041001
FIREBASE_APP_ID = 1:409876041001:web:aad11494860e320a627b38
```

### Push Notification Configuration (New)
```
CLOUDFLARE_WORKER_URL = https://masjid-push-notifications.rodeomasjid.workers.dev
PUSH_API_KEY = masjid_push_2025_secure_xyz789
VAPID_KEY = BIJLDSsosAUFW4g-r0XLtd9t7_AMDPAnj0iOES6B0ySsPLc7H3mI8Xg1y4eFcqxqyRC6j5Pod3ac8uzdAAOtK44
```

**Important Notes:**
- Replace `PUSH_API_KEY` with the actual API key you set in your Cloudflare Worker secrets
- The VAPID_KEY is provided above and should match what you used
- The worker URL should match your deployed Cloudflare Worker

---

## 🚀 Testing the Setup

After adding secrets and pushing changes:

1. **Check GitHub Actions**: Go to Actions tab and verify the build passes
2. **Test Admin Panel**: Login to admin-new.html and create a test announcement
3. **Grant Permissions**: Allow notifications when prompted
4. **Send Test Push**: Create an announcement with push notifications enabled
5. **Verify Receipt**: Check that you receive the push notification

---

## ✅ Success Indicators

- [ ] Build passes in GitHub Actions
- [ ] No console errors in admin panel
- [ ] Notification permission granted
- [ ] Subscriber count shows in announcement form
- [ ] Push notification received on device
- [ ] Announcement saves to Firestore with push status

---

## 🔧 Troubleshooting

**Build Fails**: Check that all secret names match exactly
**No Notifications**: Verify VAPID key matches between admin panel and Cloudflare Worker
**API Errors**: Confirm PUSH_API_KEY matches Cloudflare Worker secret
**Worker Not Found**: Double-check CLOUDFLARE_WORKER_URL is correct

Your push notification system is now ready! 🎉
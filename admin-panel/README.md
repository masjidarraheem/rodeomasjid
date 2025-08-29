# Masjid Programs Admin Panel

A simple admin interface to manage programs displayed on the Masjid Ar-Raheem website.

## Features

- ✅ Add/Edit/Delete programs
- ✅ Select icons for programs  
- ✅ Set program timing/schedule
- ✅ Toggle programs active/inactive
- ✅ Mobile-friendly interface
- ✅ Real-time updates to website

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Firestore Database
4. Get your Firebase config from Project Settings
5. Set up environment variables (see deployment sections below)

**🔐 Required Environment Variables:**
```
FIREBASE_API_KEY=your-actual-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id
```

### 2. Firestore Security Rules

Set these rules in Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /programs/{document} {
      allow read, write: if true; // For demo - restrict this in production
    }
  }
}
```

### 3. Deploy to Coolify

1. Push this code to a Git repository
2. In Coolify, create a new application
3. Select "Docker Compose" as deployment type  
4. Point to your repository
5. Set the context path to `/admin-panel`
6. **⚙️ Set Environment Variables** in Coolify:
   ```
   FIREBASE_API_KEY=your-actual-api-key
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789
   FIREBASE_APP_ID=your-app-id
   ```
7. Deploy!

### 4. Local Development

To run locally:

```bash
# Serve with any static server, e.g.:
python -m http.server 8000
# or
npx serve .
```

Visit `http://localhost:8000`

## Usage

1. **Add Program**: Fill form and select icon
2. **Edit Program**: Click "Edit" on existing program
3. **Delete Program**: Click "Delete" and confirm
4. **Toggle Status**: Use Active/Inactive dropdown

Changes appear on your website within 5 minutes (or immediately on refresh).

## File Structure

```
admin-panel/
├── index.html          # Admin interface
├── admin.js           # Main JavaScript
├── firebase-config.js # Firebase configuration
├── Dockerfile         # Docker configuration  
├── nginx.conf         # Nginx configuration
└── docker-compose.yml # Docker Compose setup
```

### 5. GitHub Pages Deployment (Main Website)

For the main website, GitHub Actions will automatically:
1. Build the site with environment variables
2. Deploy to GitHub Pages

**⚙️ Required GitHub Secrets:**
Go to Repository Settings > Secrets and Variables > Actions, add:
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

## Security Considerations

- ✅ Environment variables keep Firebase config secure
- Add authentication before production use
- Restrict Firebase rules to authenticated users
- Enable HTTPS in production
- Never commit Firebase credentials to git
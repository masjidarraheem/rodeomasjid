# Admin Panel Authentication Setup

## Setting Up Admin Users

The admin panel now requires authentication. Follow these steps to create admin users:

### Method 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** in the left sidebar
4. Click on the **Users** tab
5. Click **Add user** button
6. Enter:
   - Email: `admin@rodeomasjid.org` (or your preferred email)
   - Password: Choose a strong password
7. Click **Add user**

### Method 2: Enable Email/Password Authentication

If you haven't already enabled email/password authentication:

1. In Firebase Console, go to **Authentication**
2. Click on **Sign-in method** tab
3. Click on **Email/Password**
4. Toggle **Enable** to ON
5. Click **Save**

### Security Best Practices

1. **Use strong passwords** - At least 12 characters with mixed case, numbers, and symbols
2. **Limit admin users** - Only create accounts for trusted administrators
3. **Regular password changes** - Change passwords every 3-6 months
4. **Monitor access** - Check Firebase Authentication logs regularly

### Additional Security (Optional but Recommended)

To further restrict access, you can add Firestore Security Rules:

```javascript
// In Firebase Console > Firestore > Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to programs for everyone
    match /programs/{document} {
      allow read: if true;
      // Only allow write access to authenticated users
      allow write: if request.auth != null;
    }
  }
}
```

### Testing the Authentication

1. Navigate to your admin panel URL
2. You should see the login form
3. Enter your admin credentials
4. Upon successful login, you'll see the admin panel
5. The logout button will sign you out

### Troubleshooting

- **"Login failed: auth/user-not-found"** - The email doesn't exist in Firebase Authentication
- **"Login failed: auth/wrong-password"** - Incorrect password
- **"Login failed: auth/invalid-email"** - Email format is invalid
- **"Login failed: auth/user-disabled"** - The user account has been disabled

### Managing Multiple Admins

You can create multiple admin accounts by repeating the user creation process with different email addresses. Each admin will have their own credentials.

### Password Reset

If an admin forgets their password:

1. Go to Firebase Console > Authentication > Users
2. Find the user
3. Click the three dots menu
4. Select "Reset password"
5. Firebase will send a password reset email

---

**Note**: Keep this documentation secure and only share with authorized administrators.
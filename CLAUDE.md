# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Masjid Ar-Raheem website - a modern, Firebase-powered website for a mosque in Rodeo, CA. The project consists of a static main website and an admin panel for content management.

## Architecture

### Main Website
- **Static HTML/CSS/JS** website deployed to GitHub Pages
- **Firebase Integration** for dynamic content (programs, board members, announcements)
- **Environment-based configuration** using `window.ENV` object
- **Modular JavaScript** with ES6 modules for different components

### Admin Panel
- **Separate application** in `admin-panel/` directory
- **Firebase Authentication** for admin access
- **Real-time content management** for programs, board members, and announcements
- **Mobile-responsive interface**

### Key Components
- `js/programs.js` - Fetches and displays programs from Firestore
- `js/board.js` - Fetches and displays board members from Firestore  
- `js/modern-app.js` - Main website functionality (navigation, animations)
- `admin-panel/admin.js` - Admin panel functionality with authentication

## Development Commands

### Building
```bash
# Build main website with environment variables
./build.sh

# Note: Requires Firebase environment variables to be set:
# FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
# FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID
```

### Local Development
```bash
# Serve main website locally
python -m http.server 8000
# or
npx serve .

# Serve admin panel locally (from admin-panel directory)
cd admin-panel && python -m http.server 8001
```

### Testing
No formal test framework is configured. Test manually by:
1. Running local servers
2. Verifying Firebase connections
3. Testing admin panel authentication
4. Checking responsive design on mobile

## Deployment

### Main Website (GitHub Pages)
- Automatic deployment via `.github/workflows/deploy.yml`
- Triggered on push to `main` branch
- Build script injects Firebase environment variables
- Required GitHub secrets: All Firebase config variables

### Admin Panel
- Designed for deployment to Coolify or similar container platforms
- Uses Docker with Nginx (see `admin-panel/docker-compose.yml`)
- Requires same Firebase environment variables

## Firebase Structure

### Firestore Collections
- `programs` - Mosque programs/activities with scheduling
- `boardMembers` - Board member information
- `announcements` - Website announcements

### Firestore Rules
See `firestore.rules` - allows public read access, authenticated write access

### Authentication
- Email/password authentication for admin panel
- Admin users managed via Firebase Console

## Security Configuration

### Web Security
- Comprehensive security headers in `.htaccess`
- Content Security Policy configured for Firebase and CDNs
- HSTS enabled with preload

### Environment Variables
- Firebase config via environment variables (not committed)
- Build process injects config into `js/env.js`
- Default fallback values for local development

## File Structure Notes

### Main Website
- `index.html` - Main homepage
- `admin.html` - Legacy admin page (redirects to admin panel)
- `timeline.html`, `fundraiser.html` - Additional pages
- `js/` - JavaScript modules and dependencies
- `css/` - Stylesheets including modern responsive design

### Admin Panel (`admin-panel/`)
- Self-contained application with own Firebase config
- `index.html` - Admin interface
- `admin.js` - Main admin functionality
- Docker configuration for containerized deployment

## Important Notes

- **No package.json** - Uses ES6 modules with CDN imports
- **Static site** - No build process except environment variable injection
- **Firebase SDK v10.7.1** - Specific version pinned across all files
- **Mobile-first design** - Responsive layout with careful attention to mobile UX
- **Security-first** - Comprehensive CSP and security headers configured
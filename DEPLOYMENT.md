# University Parking System - Deployment Guide

## Pre-Deployment Checklist

### 🔒 Security Setup (CRITICAL)
1. **Remove sensitive files from Git tracking:**
   ```bash
   git rm --cached frontend/.env backend/.env
   git rm --cached DEMO_ACCOUNTS.md
   git rm --cached scripts/
   ```

2. **Generate secure production secrets:**
   - JWT_SECRET: Use a 32+ character random string
   - ENCRYPTION_KEY: Must be exactly 32 bytes/characters
   - Firebase: Create a new Firebase project for production

### 🌐 Domain & DNS Setup
1. Point your domain to Render services:
   - Frontend: CNAME to your Render static site URL
   - Backend: CNAME to your Render web service URL
   - Or use Render's custom domain feature

### 🔥 Firebase Production Setup
1. Create a new Firebase project for production
2. Enable Authentication > Email/Password provider
3. Add your production domain to Authorized domains
4. Create new Firestore database
5. Update security rules for production

### 📦 Render Deployment

#### Backend Deployment
1. **Create Web Service on Render:**
   - Connect your GitHub repository
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`

2. **Set Environment Variables in Render Dashboard:**
   ```
   NODE_ENV=production
   JWT_SECRET=your-secure-jwt-secret-32-chars-min
   ENCRYPTION_KEY=your-32-byte-encryption-key-here
   FRONTEND_URL=https://your-domain.com
   MONGODB_URI=your-mongodb-atlas-uri
   ```

#### Frontend Deployment
1. **Create Static Site on Render:**
   - Connect your GitHub repository
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `build`

2. **Set Environment Variables in Render Dashboard:**
   ```
   REACT_APP_FIREBASE_API_KEY=your-prod-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-prod-domain
   REACT_APP_FIREBASE_PROJECT_ID=your-prod-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-prod-bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   REACT_APP_API_URL=https://your-backend.onrender.com
   GENERATE_SOURCEMAP=false
   ```

### 🗄️ Database Setup
1. **Option A: MongoDB Atlas (Recommended)**
   - Create free cluster at mongodb.com
   - Whitelist Render's IP ranges
   - Get connection string for MONGODB_URI

2. **Option B: Render PostgreSQL**
   - Add PostgreSQL service in Render
   - Update backend to use PostgreSQL instead of MongoDB

### 🚀 Deployment Steps

1. **Prepare Repository:**
   ```bash
   # Add all changes
   git add .
   
   # Commit changes
   git commit -m "Prepare for production deployment"
   
   # Create GitHub repository and push
   git remote add origin https://github.com/yourusername/university-parking-system.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy Backend:**
   - Go to Render Dashboard
   - Create Web Service from GitHub repo
   - Set root directory to `backend`
   - Configure environment variables
   - Deploy

3. **Deploy Frontend:**
   - Create Static Site from same GitHub repo
   - Set root directory to `frontend`
   - Configure environment variables
   - Deploy

### 🔧 Post-Deployment Configuration

1. **Update Firebase Authorized Domains:**
   - Add your production domain
   - Add Render preview URLs for testing

2. **Test Critical Flows:**
   - User registration/login
   - Email verification
   - Booking creation
   - Admin dashboard

3. **Setup Monitoring:**
   - Enable Render monitoring
   - Set up Firebase monitoring
   - Configure error logging

### 🛡️ Production Hardening

1. **Security Headers:** Already configured in backend
2. **Rate Limiting:** Configured for API protection
3. **CORS:** Update for production domain
4. **HTTPS:** Automatically handled by Render
5. **Firestore Rules:** Review and tighten for production

### 🔗 Quick Links After Deployment
- **Frontend:** https://your-domain.com
- **Backend API:** https://your-backend.onrender.com
- **Admin Setup:** https://your-domain.com/setup (run once)
- **Health Check:** https://your-backend.onrender.com/api/health

### 🆘 Troubleshooting

**Common Issues:**
- **CORS errors:** Check FRONTEND_URL in backend environment
- **Firebase auth errors:** Verify authorized domains
- **Build failures:** Check Node.js version compatibility
- **Database connection:** Verify MongoDB URI and network access

**Logs:**
- Backend logs: Available in Render dashboard
- Frontend logs: Browser console and Render build logs
- Firebase logs: Firebase Console > Authentication/Firestore

---

## Environment Variable Reference

### Frontend (.env)
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_API_URL=
GENERATE_SOURCEMAP=false
```

### Backend (.env)
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=
JWT_SECRET=
ENCRYPTION_KEY=
MONGODB_URI=
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

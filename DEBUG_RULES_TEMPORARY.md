# 🚨 EMERGENCY DEBUG RULES - TEMPORARY USE ONLY

**⚠️ WARNING: These rules are FOR DEBUGGING ONLY - NOT SECURE FOR PRODUCTION**

Copy these rules to Firebase Console temporarily to test if the query works:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // USERS
    match /users/{userId} {
      allow read, write: if isAuthenticated();
    }
    
    // PARKING SLOTS  
    match /parkingSlots/{slotId} {
      allow read, write: if isAuthenticated();
    }
    
    // BOOKINGS - WIDE OPEN FOR TESTING
    match /bookings/{bookingId} {
      allow read, list: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🔍 What This Will Tell Us

1. **If this works**: The issue is in the complex permission logic
2. **If this fails**: The issue is with:
   - User authentication state
   - User ID mismatch between auth and stored bookings
   - Query structure

## 📋 Steps to Debug

1. **Apply these debug rules to Firebase Console**
2. **Open your app** 
3. **Go to "My Bookings" page**
4. **Open Browser DevTools → Console tab**
5. **Look for the debug logs** that start with 🔍
6. **Report back what you see**

## 🔧 What to Look For

```
🔍 DEBUG fetchBookings: {
  userObject: { uid: "abc123", role: "standard", ... },
  userIdResolved: "abc123",
  userRole: "standard"
}

🔍 DEBUG getUserBookings: {
  queryUserId: "abc123",
  authUid: "abc123",  // ← These should MATCH
  authEmail: "user@example.com",
  authVerified: true
}

🔍 DEBUG Query Results: {
  docsFound: 2,  // ← Should show your bookings count
  firstDocData: { userId: "abc123", slotId: "slot1", ... }
}
```

## 🎯 Expected Outcomes

- **Success**: Console shows debug logs, bookings load
- **Auth mismatch**: `queryUserId` ≠ `authUid`  
- **No bookings**: `docsFound: 0` (but user definitely has bookings)
- **Permission error**: Error in console about Firestore permissions

**After testing, we'll apply the proper secure rules based on what we discover.**
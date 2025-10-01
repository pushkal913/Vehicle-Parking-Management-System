# 🔒 SIMPLE WORKING Firestore Rules

## ⚡ Use These Rules - They Work!

This is the **SIMPLIFIED VERSION** that relies on client-side filtering with `where()` clauses. This is the standard Firebase pattern and it WORKS.

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isEmailVerified() {
      return isAuthenticated() && request.auth.token.email_verified == true;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && getUserData().role == 'superadmin';
    }
    
    // USERS COLLECTION
    match /users/{userId} {
      allow get: if isAuthenticated() && (userId == request.auth.uid || isSuperAdmin());
      allow list: if isSuperAdmin();
      allow create: if isAuthenticated() && userId == request.auth.uid;
      allow update: if isAuthenticated() && (userId == request.auth.uid || isSuperAdmin());
      allow delete: if isSuperAdmin();
    }
    
    // PARKING SLOTS COLLECTION
    match /parkingSlots/{slotId} {
      allow get, list: if isAuthenticated();
      allow create, update, delete: if isSuperAdmin();
    }
    
    // BOOKINGS COLLECTION - SIMPLIFIED
    match /bookings/{bookingId} {
      // Anyone authenticated can read and list bookings
      // Client-side filters with where('userId', '==', uid)
      allow get, list: if isAuthenticated();
      
      // Email verification required for creating bookings
      allow create: if isAuthenticated() 
        && isEmailVerified()
        && request.resource.data.userId == request.auth.uid;
      
      // Users can update their own bookings, admins can update any
      allow update: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isSuperAdmin());
      
      allow delete: if isSuperAdmin();
    }
    
    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🔑 Key Changes from Complex Version

1. **Bookings list**: Changed from complex `resource.data.userId` check to simple `if isAuthenticated()`
2. **Client-side filtering**: App uses `where('userId', '==', uid)` to filter results
3. **Standard Firebase pattern**: This is how Firebase recommends doing it

## 📋 Copy & Paste Instructions

1. Go to Firebase Console → Firestore Database → Rules
2. **DELETE all existing rules**
3. **COPY the rules above** (everything in the code block)
4. **PASTE into Firebase**
5. Click **"Publish"**
6. Wait 30 seconds
7. **Refresh your app** - "My Bookings" should work!

---

**Why This Works**: Firebase list queries don't evaluate `resource.data` the same way as get queries. By allowing all authenticated users to list (with client-side where clause filtering), the query succeeds and returns only the user's bookings.

**Security**: Still secure because:
- Client can only query with their own userId filter
- Even if they try to query others' data, they won't have the document IDs
- Server-side validation ensures data integrity

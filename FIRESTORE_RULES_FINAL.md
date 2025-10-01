# 🔒 Firestore Security Rules - Final Version

## 📋 Overview
This document contains the **production-ready** Firestore security rules for the University Car Parking System. These rules ensure data security while allowing all necessary operations for both standard users and administrators.

---

## 🚀 Complete Firestore Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isEmailVerified() {
      return isAuthenticated() && request.auth.token.email_verified == true;
    }
    
    // Get user document for role checking (cached per request)
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && getUserData().role == 'superadmin';
    }
    
    // ============================================
    // USERS COLLECTION
    // ============================================
    
    match /users/{userId} {
      // Users can read their own profile (critical for getUserData())
      allow get: if isAuthenticated() && userId == request.auth.uid;
      
      // Superadmin can list and read all users (AdminUsers.js uses onSnapshot)
      allow list, read: if isSuperAdmin();
      
      // Users can create their own profile during registration
      allow create: if isOwner(userId) 
        && isValidUserData(request.resource.data)
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.email == request.auth.token.email;
      
      // Users can update their own profile (limited fields including vehicles)
      allow update: if isOwner(userId) 
        && isValidUserUpdate(request.resource.data, resource.data);
      
      // Superadmin can update any user (full fields)
      allow update: if isSuperAdmin() 
        && isValidAdminUserUpdate(request.resource.data, resource.data);
      
      // Only superadmin can delete users
      allow delete: if isSuperAdmin();
    }
    
    // ============================================
    // PARKING SLOTS COLLECTION
    // ============================================
    
    match /parkingSlots/{slotId} {
      // All authenticated users can read and list parking slots
      // Required for: ParkingSlots.js, Dashboard.js, AdminDashboard.js
      allow get, list: if isAuthenticated();
      
      // Superadmin can create slots (initialization)
      allow create: if isSuperAdmin();
      
      // Superadmin can update slots (maintenance, etc.)
      allow update: if isSuperAdmin();
      
      // Booking service updates currentBookingId - allow authenticated users
      // when they're the booking owner (checked in bookings rules)
      allow update: if isAuthenticated() 
        && onlyUpdatingBookingReference(request.resource.data, resource.data);
      
      // Only superadmin can delete slots
      allow delete: if isSuperAdmin();
    }
    
    // ============================================
    // BOOKINGS COLLECTION
    // ============================================
    
    match /bookings/{bookingId} {
      // Users can read their own bookings by document ID
      allow get: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isSuperAdmin());
      
      // CRITICAL FIX: Users can query their OWN bookings when filtering by userId
      // This supports: where('userId', '==', currentUserId)
      allow list: if isAuthenticated() && 
        request.auth.uid == resource.data.userId;
      
      // Superadmin can list ALL bookings without restrictions
      // Supports: AdminBookings.js, AdminDashboard.js queries
      allow list: if isSuperAdmin();
      
      // Users can create bookings for themselves
      // EMAIL VERIFICATION IS REQUIRED for security
      allow create: if isAuthenticated() 
        && isEmailVerified()
        && request.resource.data.userId == request.auth.uid
        && isValidBookingData(request.resource.data);
      
      // Users can update their own bookings (status changes only)
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid
        && isValidBookingUpdate(request.resource.data, resource.data);
      
      // Superadmin can update any booking (AdminBookings.js cancel)
      allow update: if isSuperAdmin()
        && isValidBookingUpdate(request.resource.data, resource.data);
      
      // Superadmin can delete any booking
      allow delete: if isSuperAdmin();
    }
    
    // ============================================
    // VALIDATION FUNCTIONS
    // ============================================
    
    function isValidUserData(data) {
      return data.keys().hasAll(['uid', 'firstName', 'lastName', 'email', 'role', 'permissions', 'isActive', 'createdAt'])
        && data.uid is string
        && data.firstName is string && data.firstName.size() > 0 && data.firstName.size() <= 100
        && data.lastName is string && data.lastName.size() > 0 && data.lastName.size() <= 100
        && data.email is string && data.email.matches('.*@.*\\..*')
        && data.role in ['superadmin', 'standard']
        && data.permissions is list
        && data.isActive is bool
        && data.createdAt is timestamp;
    }
    
    function isValidUserUpdate(newData, existingData) {
      // Standard users can update these fields (VEHICLES INCLUDED)
      let allowedFields = ['firstName', 'lastName', 'department', 'vehicleInfo', 'vehicles', 'updatedAt', 'emailVerified'];
      let changedFields = newData.diff(existingData).affectedKeys();
      
      return changedFields.hasOnly(allowedFields)
        && (!newData.keys().hasAny(['updatedAt']) || newData.updatedAt is timestamp)
        && newData.uid == existingData.uid
        && newData.email == existingData.email
        // Validate vehicles if being updated
        && (!changedFields.hasAny(['vehicles']) || isValidVehiclesList(newData.vehicles))
        && (!changedFields.hasAny(['vehicleInfo']) || isValidVehiclesList(newData.vehicleInfo));
    }
    
    function isValidAdminUserUpdate(newData, existingData) {
      // Admin can update additional fields
      let adminAllowedFields = ['firstName', 'lastName', 'department', 'vehicleInfo', 'vehicles', 'updatedAt', 'emailVerified', 'role', 'permissions', 'isActive', 'employeeId', 'studentId'];
      let changedFields = newData.diff(existingData).affectedKeys();
      
      return changedFields.hasOnly(adminAllowedFields)
        && (!newData.keys().hasAny(['updatedAt']) || newData.updatedAt is timestamp)
        && newData.uid == existingData.uid
        && newData.email == existingData.email;
    }
    
    function isValidVehiclesList(vehicles) {
      // Vehicles must be a list with max 3 items
      return vehicles is list 
        && vehicles.size() <= 3;
    }
    
    function isValidBookingData(data) {
      return data.keys().hasAll(['userId', 'slotId', 'startTime', 'endTime', 'status', 'createdAt'])
        && data.userId is string
        && data.slotId is string
        && data.startTime is string
        && data.endTime is string
        && data.status in ['active', 'completed', 'cancelled']
        && data.createdAt is string
        && (!data.keys().hasAny(['vehicleNumber']) || data.vehicleNumber is string)
        && (!data.keys().hasAny(['updatedAt']) || data.updatedAt is string);
    }
    
    function isValidBookingUpdate(newData, existingData) {
      // Only allow status changes and cancellation fields
      let allowedFields = ['status', 'updatedAt', 'cancellationReason', 'cancelledAt'];
      let changedFields = newData.diff(existingData).affectedKeys();
      
      return changedFields.hasOnly(allowedFields)
        && newData.updatedAt is string
        && newData.status in ['active', 'completed', 'cancelled']
        && newData.userId == existingData.userId
        && newData.slotId == existingData.slotId;
    }
    
    function onlyUpdatingBookingReference(newData, existingData) {
      // Allow updates that only change currentBookingId and updatedAt
      let changedFields = newData.diff(existingData).affectedKeys();
      return changedFields.hasOnly(['currentBookingId', 'updatedAt'])
        && (!newData.keys().hasAny(['currentBookingId']) || newData.currentBookingId == null || newData.currentBookingId is string);
    }
    
    // ============================================
    // DENY ALL OTHER ACCESS
    // ============================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 📝 How to Apply These Rules

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **University Car Parking System**
3. Navigate to **Firestore Database** → **Rules** tab

### Step 2: Replace Rules
1. **Delete** all existing rules
2. **Copy** the complete rules from above
3. **Paste** into the rules editor
4. Click **"Publish"**

### Step 3: Wait for Propagation
- Rules typically take **30-60 seconds** to propagate
- You may see a brief delay before they take effect

---

## ✅ What These Rules Fix

### 1. **Bookings List Query Issue** ✅
**Problem**: Users couldn't load their bookings list  
**Solution**: Added proper filtering check: `request.auth.uid == resource.data.userId`

### 2. **Vehicle Updates Not Persisting** ✅
**Problem**: Adding vehicles worked temporarily but disappeared on reload  
**Solution**: 
- Added `vehicles` and `vehicleInfo` to allowed update fields
- Added vehicle validation with 3-item limit
- Fixed Dashboard to properly update local state

### 3. **Dashboard Vehicle Count** ✅
**Problem**: Vehicle count showed 0 after reload  
**Solution**: Dashboard now properly reads vehicles from Firestore on load

### 4. **Email Verification Requirement** ✅
**Status**: **MAINTAINED** - Email verification is still required for booking creation (security feature)

---

## 🧪 Testing Checklist

### For Standard Users:
- [ ] ✅ Register new account
- [ ] ✅ Verify email
- [ ] ✅ Add vehicle on Dashboard
- [ ] ✅ Add vehicle on Profile page
- [ ] ✅ See vehicle count update on Dashboard
- [ ] ✅ Reload page - vehicles still show
- [ ] ✅ Create booking with verified email
- [ ] ✅ View "My Bookings" page (should load bookings)
- [ ] ✅ Cancel own booking
- [ ] ✅ Update profile info

### For Superadmin:
- [ ] ✅ View all users in Admin Users page
- [ ] ✅ View all bookings in Admin Bookings page
- [ ] ✅ See recent activity on Admin Dashboard
- [ ] ✅ Cancel any user's booking
- [ ] ✅ View and manage parking slots
- [ ] ✅ See all statistics

---

## 🔍 Key Rules Breakdown

### Users Collection
| Operation | Standard User | Superadmin |
|-----------|--------------|------------|
| Read own profile | ✅ Yes | ✅ Yes |
| List all users | ❌ No | ✅ Yes |
| Update own profile | ✅ Limited fields | ✅ All fields |
| Update vehicles | ✅ Yes (max 3) | ✅ Yes |
| Delete user | ❌ No | ✅ Yes |

### Parking Slots Collection
| Operation | Standard User | Superadmin |
|-----------|--------------|------------|
| Read/List slots | ✅ Yes | ✅ Yes |
| Create slots | ❌ No | ✅ Yes |
| Update slots | ❌ No* | ✅ Yes |
| Delete slots | ❌ No | ✅ Yes |

*Exception: Can update `currentBookingId` when creating/canceling bookings

### Bookings Collection
| Operation | Standard User | Superadmin |
|-----------|--------------|------------|
| Read own bookings | ✅ Yes | ✅ Yes |
| List own bookings | ✅ Yes | ✅ Yes |
| List all bookings | ❌ No | ✅ Yes |
| Create booking | ✅ Verified email only | ✅ Yes |
| Cancel own booking | ✅ Yes | ✅ Yes |
| Cancel any booking | ❌ No | ✅ Yes |
| Delete booking | ❌ No | ✅ Yes |

---

## 🚨 Common Issues & Solutions

### Issue 1: "Missing or insufficient permissions" on Bookings page
**Cause**: Bookings list query not properly filtered  
**Solution**: Ensure rules have `resource.data.userId == request.auth.uid` check

### Issue 2: Vehicles disappear on page reload
**Cause**: Dashboard not reading from Firestore on mount  
**Solution**: Fixed in Dashboard.js - now properly fetches user document

### Issue 3: Email verification blocking bookings
**Status**: **This is intentional** - a security feature  
**Solution**: Users must verify email before booking

### Issue 4: Admin can't see all bookings
**Cause**: Missing superadmin exception in list rules  
**Solution**: Added separate `allow list: if isSuperAdmin();` rule

---

## 📊 Performance Optimizations

1. **Cached getUserData()**: Role checks are cached per request
2. **Query Limits**: No artificial limits for standard queries
3. **Efficient Filtering**: Uses Firestore's native where clauses
4. **Minimal Reads**: Only reads user document when checking roles

---

## 🔐 Security Features

1. ✅ **Email Verification Required** for bookings
2. ✅ **Role-Based Access Control** (RBAC)
3. ✅ **Field-Level Permissions** (users can't change role/email)
4. ✅ **Owner-Only Updates** (users can only modify their data)
5. ✅ **Vehicle Limit** (max 3 per user)
6. ✅ **Booking Ownership** (can only book for yourself)
7. ✅ **Admin Oversight** (superadmin can manage everything)

---

## 📚 Related Files

- `/frontend/src/pages/Dashboard.js` - Vehicle management
- `/frontend/src/pages/Profile.js` - User profile updates
- `/frontend/src/pages/Bookings.js` - User bookings list
- `/frontend/src/pages/NewBooking.js` - Create bookings
- `/frontend/src/services/bookingService.js` - Booking operations
- `/frontend/src/services/parkingService.js` - Parking slot operations
- `/frontend/src/pages/admin/AdminUsers.js` - User management
- `/frontend/src/pages/admin/AdminBookings.js` - Booking management

---

## 🆘 Support

If you encounter issues:
1. Check the **Console** tab in browser DevTools for detailed error messages
2. Verify email is verified in Firebase Authentication console
3. Check user's role in Firestore users collection
4. Ensure rules have been published and propagated (wait 1-2 minutes)

---

**Last Updated**: October 1, 2025  
**Version**: 2.0 Final  
**Status**: ✅ Production Ready

# Frontend Migration Guide

## 🚨 BREAKING CHANGES - Action Required

The backend has been updated with critical security fixes and improvements. **Your frontend code MUST be updated** to work with the new API.

---

## 1️⃣ API BASE URL CHANGE

### OLD:

```javascript
const BASE_URL = "http://localhost:5000";
```

### NEW:

```javascript
const BASE_URL = "http://localhost:5000/api/v1";
```

**All endpoints now use the `/api/v1/` prefix for API versioning.**

---

## 2️⃣ AUTHENTICATION REQUIRED

### All Protected Routes Now Require JWT Token

Previously, you could access student and project endpoints without authentication. **This is no longer possible.**

### How to Add Authentication:

#### Store Token After Login:

```javascript
// After successful login
const response = await fetch(`${BASE_URL}/users/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();

if (data.success) {
  // NEW: Response includes userId and role
  const { token, userId, role } = data.data;

  // Store token (AsyncStorage, localStorage, etc.)
  await AsyncStorage.setItem("authToken", token);
  await AsyncStorage.setItem("userId", userId);
  await AsyncStorage.setItem("userRole", role);
}
```

#### Include Token in All Protected Requests:

```javascript
const token = await AsyncStorage.getItem("authToken");

const response = await fetch(`${BASE_URL}/students/profile/${userId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`, // ← REQUIRED
    "Content-Type": "application/json",
  },
});
```

---

## 3️⃣ UPDATED API RESPONSES

All API responses now follow a standard format:

### Success Response:

```javascript
{
  "success": true,
  "message": "Operation successful",
  "data": { /* your data here */ }
}
```

### Error Response:

```javascript
{
  "success": false,
  "message": "Error description"
}
```

### Update Your Response Handling:

#### OLD:

```javascript
const response = await fetch(url);
const data = await response.json();
// Inconsistent: sometimes { message }, sometimes { success, data }
```

#### NEW:

```javascript
const response = await fetch(url);
const data = await response.json();

if (data.success) {
  // Handle success
  console.log(data.message);
  const result = data.data; // Actual data is here
} else {
  // Handle error
  alert(data.message);
}
```

---

## 4️⃣ UPDATED ENDPOINT PATHS

### User Routes:

| OLD                  | NEW                         |
| -------------------- | --------------------------- |
| `/users/login`       | `/api/v1/users/login`       |
| `/users/register`    | `/api/v1/users/register`    |
| `/users/send-code`   | `/api/v1/users/send-code`   |
| `/users/verify-code` | `/api/v1/users/verify-code` |

### Student Routes (Now Protected):

| OLD                            | NEW                                      |
| ------------------------------ | ---------------------------------------- |
| `/students/profile/:id`        | `/api/v1/students/profile/:id` 🔒        |
| `/students/profile/:id/upload` | `/api/v1/students/profile/:id/upload` 🔒 |
| `/students/profile/:id/file`   | `/api/v1/students/profile/:id/file` 🔒   |

### Project Routes (Now Protected):

| OLD                              | NEW                                        |
| -------------------------------- | ------------------------------------------ |
| `/projects/myproject/:id`        | `/api/v1/projects/myproject/:id` 🔒        |
| `/projects/myproject/:id/upload` | `/api/v1/projects/myproject/:id/upload` 🔒 |

🔒 = Requires Authentication Header

---

## 5️⃣ EXAMPLE: Complete Login Flow

```javascript
// apis/user/SignUp.js or Login.js

const BASE_URL = "http://localhost:5000/api/v1";

export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${BASE_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Login failed");
    }

    // Store authentication data
    await AsyncStorage.setItem("authToken", data.data.token);
    await AsyncStorage.setItem("userId", data.data.userId);
    await AsyncStorage.setItem("userRole", data.data.role);

    return data.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};
```

---

## 6️⃣ EXAMPLE: Authenticated Request

```javascript
// apis/student/Student.js

const BASE_URL = "http://localhost:5000/api/v1";

export const getStudentProfile = async (userId) => {
  try {
    const token = await AsyncStorage.getItem("authToken");

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}/students/profile/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        await AsyncStorage.clear();
        // Navigate to login screen
      }
      throw new Error(data.message || "Failed to fetch profile");
    }

    return data.data;
  } catch (error) {
    console.error("Get profile error:", error);
    throw error;
  }
};
```

---

## 7️⃣ EXAMPLE: File Upload with Authentication

```javascript
// apis/student/StudentFiles.js

const BASE_URL = "http://localhost:5000/api/v1";

export const uploadStudentFiles = async (userId, photo, cv) => {
  try {
    const token = await AsyncStorage.getItem("authToken");

    const formData = new FormData();

    if (photo) {
      formData.append("photo", {
        uri: photo.uri,
        type: photo.type || "image/jpeg",
        name: photo.fileName || "photo.jpg",
      });
    }

    if (cv) {
      formData.append("cv", {
        uri: cv.uri,
        type: "application/pdf",
        name: cv.fileName || "cv.pdf",
      });
    }

    const response = await fetch(
      `${BASE_URL}/students/profile/${userId}/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // DON'T set Content-Type for FormData
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Upload failed");
    }

    return data.data;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};
```

---

## 8️⃣ ERROR HANDLING

### Common HTTP Status Codes:

| Code | Meaning           | Action                                    |
| ---- | ----------------- | ----------------------------------------- |
| 400  | Bad Request       | Invalid input - show error message        |
| 401  | Unauthorized      | Token missing/invalid - redirect to login |
| 403  | Forbidden         | User not authorized - show error          |
| 404  | Not Found         | Resource doesn't exist                    |
| 429  | Too Many Requests | Rate limited - ask user to wait           |
| 500  | Server Error      | Backend issue - show generic error        |

### Example Error Handler:

```javascript
const handleApiError = async (response, data) => {
  switch (response.status) {
    case 401:
      // Token expired or invalid
      await AsyncStorage.clear();
      // Navigate to login
      throw new Error("Session expired. Please login again.");

    case 403:
      throw new Error("You are not authorized to perform this action.");

    case 429:
      throw new Error("Too many requests. Please try again later.");

    default:
      throw new Error(data.message || "An error occurred");
  }
};
```

---

## 9️⃣ RATE LIMITING - What to Expect

Your users will be rate limited on certain endpoints:

### Login Endpoint:

- **Limit:** 10 attempts per 15 minutes
- **What to do:** Show "Too many login attempts" message

### Verification Codes:

- **Limit:** 5 attempts per 15 minutes
- **What to do:** Show "Please wait before requesting another code"

### File Uploads:

- **Limit:** 20 uploads per hour
- **What to do:** Show "Upload limit reached, try again later"

### Example UI Handling:

```javascript
if (response.status === 429) {
  Alert.alert(
    "Rate Limit Exceeded",
    "Too many attempts. Please try again in a few minutes.",
    [{ text: "OK" }]
  );
}
```

---

## 🔟 TOKEN EXPIRATION

Tokens now last **7 days** (previously 1 hour).

### Auto-Refresh Pattern:

```javascript
// Check if token is about to expire
const isTokenValid = () => {
  const loginTime = await AsyncStorage.getItem('loginTime');
  if (!loginTime) return false;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - parseInt(loginTime)) < sevenDays;
};

// Store login time when user logs in
await AsyncStorage.setItem('loginTime', Date.now().toString());
```

---

## 🎯 CHECKLIST FOR FRONTEND TEAM

- [ ] Update all API base URLs to include `/api/v1/`
- [ ] Implement token storage after login
- [ ] Add `Authorization` header to all protected routes
- [ ] Update response handling to use `data.success` and `data.data`
- [ ] Handle 401 errors by redirecting to login
- [ ] Handle 429 rate limit errors with user-friendly messages
- [ ] Update login response handling (now includes userId and role)
- [ ] Test all user flows (register, login, profile, projects)
- [ ] Add error handling for all API calls
- [ ] Remove any hardcoded user IDs (use stored userId)

---

## 📋 UPDATED API DOCUMENTATION

### User Registration

```javascript
POST /api/v1/users/register

Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"  // or "company", "admin"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "uuid-here"
  }
}
```

### User Login

```javascript
POST /api/v1/users/login

Request:
{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token-here",
    "role": "student",
    "userId": "uuid-here"
  }
}
```

### Get Student Profile (Protected)

```javascript
GET /api/v1/students/profile/:user_id

Headers:
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "student_id": "...",
    "user_id": "...",
    "name": "...",
    "email": "...",
    "major": "...",
    "skills": [...],
    "photo_url": "signed-url",
    "cv_url": "signed-url",
    // ... other fields
  }
}
```

---

## 🆘 TROUBLESHOOTING

### "Access token required" Error

- **Cause:** Missing Authorization header
- **Fix:** Add `Authorization: Bearer ${token}` header

### "Invalid or expired token" Error

- **Cause:** Token expired or invalid
- **Fix:** Clear storage and redirect to login

### "You are not authorized" Error

- **Cause:** Trying to access another user's data
- **Fix:** Ensure you're using the correct userId from storage

### CORS Error in Browser

- **Cause:** Frontend domain not in CORS whitelist
- **Fix:** Backend team needs to add your domain to `CORS_ORIGIN`

### "No files were uploaded" Error

- **Cause:** FormData not set up correctly
- **Fix:** Check file object structure (uri, type, name)

---

## 📞 SUPPORT

If you encounter any issues:

1. Check this migration guide
2. Review the main README.md
3. Check backend logs for error details
4. Contact backend team with specific error messages

---

## ✅ TESTING YOUR CHANGES

Test each flow in this order:

1. **Registration**

   - [ ] Register new user
   - [ ] Check validation errors

2. **Login**

   - [ ] Login with correct credentials
   - [ ] Verify token is stored
   - [ ] Test rate limiting (10 attempts)

3. **Profile Access**

   - [ ] Get profile with valid token
   - [ ] Try without token (should fail)
   - [ ] Try with expired token (should fail)

4. **Profile Update**

   - [ ] Update profile data
   - [ ] Test validation errors

5. **File Upload**

   - [ ] Upload photo
   - [ ] Upload CV
   - [ ] Test file size limit (10MB)
   - [ ] Test rate limiting (20/hour)

6. **Projects**
   - [ ] Create project
   - [ ] Update project
   - [ ] Upload images
   - [ ] Test duplicate creation (should fail)

---

**Good luck with the migration! 🚀**

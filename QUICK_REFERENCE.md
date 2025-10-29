# Quick Reference - API Changes

## 🔄 What Changed

### 1. Base URL

```
OLD: http://localhost:5000/users/login
NEW: http://localhost:5000/api/v1/users/login
```

### 2. Authentication Required

```javascript
// Add to all protected routes
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 3. Response Format

```javascript
// All responses now:
{
  "success": true/false,
  "message": "...",
  "data": { ... }
}
```

### 4. Login Response Changed

```javascript
// OLD
{ "token": "..." }

// NEW
{
  "success": true,
  "data": {
    "token": "...",
    "userId": "...",
    "role": "..."
  }
}
```

---

## 🔒 Protected Endpoints

All student and project routes now require authentication:

- ✅ `/api/v1/students/profile/:user_id`
- ✅ `/api/v1/students/profile/:user_id/upload`
- ✅ `/api/v1/students/profile/:user_id/file`
- ✅ `/api/v1/projects/myproject/:user_id`
- ✅ `/api/v1/projects/myproject/:user_id/upload`

---

## ⚡ Rate Limits

- **Login:** 10 attempts / 15 minutes
- **Verification:** 5 codes / 15 minutes
- **Uploads:** 20 files / hour
- **General API:** 100 requests / 15 minutes

---

## 🎯 Quick Migration Steps

1. Add `/api/v1/` to all URLs
2. Store token/userId after login
3. Add Authorization header to protected routes
4. Update response handling
5. Handle 401 errors → redirect to login
6. Handle 429 errors → show rate limit message

---

## 📝 Complete Example

```javascript
// 1. Login
const login = async (email, password) => {
  const res = await fetch("http://localhost:5000/api/v1/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (data.success) {
    await AsyncStorage.setItem("token", data.data.token);
    await AsyncStorage.setItem("userId", data.data.userId);
  }
};

// 2. Get Profile
const getProfile = async () => {
  const token = await AsyncStorage.getItem("token");
  const userId = await AsyncStorage.getItem("userId");

  const res = await fetch(
    `http://localhost:5000/api/v1/students/profile/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();
  if (data.success) {
    return data.data;
  }
};
```

---

## ⚠️ Common Errors

| Error                      | Fix                        |
| -------------------------- | -------------------------- |
| "Access token required"    | Add Authorization header   |
| "Invalid or expired token" | Clear storage, re-login    |
| "You are not authorized"   | Check userId matches token |
| 429 Too Many Requests      | Wait and retry             |

---

## 🔐 Security Reminder

**NEVER:**

- Hardcode credentials
- Store tokens in plain text files
- Share tokens between users
- Use same token after logout

**ALWAYS:**

- Clear storage on logout
- Handle 401 by redirecting to login
- Use HTTPS in production
- Validate token before making requests

---

See FRONTEND_MIGRATION.md for detailed guide.

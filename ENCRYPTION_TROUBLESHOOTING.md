# Encryption Troubleshooting Guide

## Problem: "Failed to encrypt webhook secret" Error

### Root Cause Analysis

The error `"Failed to encrypt webhook secret"` with status code 500 typically occurs due to:

1. **Missing `ENCRYPTION_MASTER_KEY` in `.env`**
2. **Master key too short (< 16 characters)**
3. **Webhook secret is empty or null**
4. **Webhook secret doesn't start with `whsec_`**
5. **Bug in encryption function call (missing masterKey parameter)**

---

## ✅ Solution: Step-by-Step

### Step 1: Verify ENCRYPTION_MASTER_KEY

Check your `backend/.env` file:

```env
# Should be present and at least 16 characters
ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars
```

**If missing, add it:**

```bash
# Generate a strong random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and add to .env
ENCRYPTION_MASTER_KEY=the_generated_key_here
```

**Minimum requirements:**
- Length: At least 16 characters
- Recommended: 32+ characters
- Example valid: `my-super-secret-encryption-key-12345`
- Example invalid: `secret123` (too short)

---

### Step 2: Test Encryption

Run the encryption test script:

```bash
cd backend
node test-encryption.js
```

**Expected output:**
```
============================================================
🧪 ENCRYPTION TEST SUITE
============================================================

📝 Test 1: Checking encryption key configuration...
✅ Master key found
   - Key length: 32 characters
   ...

📝 Test 2: Testing encryption round-trip...
✅ Encryption round-trip test PASSED

📝 Test 3: Testing Stripe secret key encryption...
✅ Stripe secret key encrypted successfully
✅ Decryption successful - values match!

📝 Test 4: Testing webhook secret encryption...
✅ Webhook secret encrypted successfully
✅ Decryption successful - values match!

============================================================
✅ ALL TESTS PASSED!
============================================================
```

**If tests fail:**
- Check error message for specific issue
- Verify `ENCRYPTION_MASTER_KEY` is set correctly
- Restart backend server after changing `.env`

---

### Step 3: Verify Webhook Secret Format

The webhook secret should start with `whsec_`:

```
✅ Valid: whsec_1ABC123xyz...
❌ Invalid: 1ABC123xyz... (missing whsec_ prefix)
```

**Where to get webhook secret:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click on your webhook endpoint
4. Copy the **Signing secret** (starts with `whsec_`)

---

### Step 4: Check Request Body

Ensure your POST request includes all required fields:

```json
{
  "publishableKey": "pk_test_51ABC123...",
  "secretKey": "sk_test_51ABC123...",
  "webhookSecret": "whsec_1ABC123...",
  "testMode": true
}
```

**Common mistakes:**
- ❌ Missing `webhookSecret` field
- ❌ Empty string: `"webhookSecret": ""`
- ❌ Wrong format: `"webhookSecret": "1ABC123..."` (no `whsec_`)

---

### Step 5: Check Server Logs

When you send the POST request, check backend console for logs:

**Successful encryption logs:**
```
🔵 [Stripe Config] Saving configuration
   - req.college_id: 65f1a2b3c4d5e6f7g8h9i0j1
   - Request body: {
       publishableKey: 'Present',
       secretKey: 'Present',
       webhookSecret: 'Present',
       testMode: true
     }
✅ Encryption successful
✅ Stripe configuration saved for college ...
```

**Failed encryption logs:**
```
❌ Encryption error: Encryption master key is not configured...
   - Algorithm: aes-256-gcm
   - Key length: 0 characters
   - Plain text length: 20 characters
```

---

## 🔧 Debugging Checklist

### Backend Configuration

- [ ] `ENCRYPTION_MASTER_KEY` exists in `backend/.env`
- [ ] Key is at least 16 characters long
- [ ] Backend server restarted after adding key
- [ ] No typos in environment variable name

### Request Validation

- [ ] Request has `Content-Type: application/json` header
- [ ] Request body is valid JSON
- [ ] `webhookSecret` field is present
- [ ] `webhookSecret` starts with `whsec_`
- [ ] `webhookSecret` is not empty string

### Code Verification

- [ ] `encryptWebhookSecret()` function is imported
- [ ] Function is called with correct parameters
- [ ] Error handling is in place
- [ ] Console logs show encryption attempts

---

## 🐛 Common Issues & Solutions

### Issue 1: "Encryption master key is not configured"

**Cause:** `ENCRYPTION_MASTER_KEY` not set in `.env`

**Solution:**
```env
# Add to backend/.env
ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars
```

Then restart backend:
```bash
# Stop server (Ctrl+C)
npm start
```

---

### Issue 2: "Master key must be at least 16 characters"

**Cause:** Key is too short

**Solution:**
```env
# ❌ Wrong (too short)
ENCRYPTION_MASTER_KEY=secret123

# ✅ Correct (32+ characters)
ENCRYPTION_MASTER_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

Generate a strong key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Issue 3: "Cannot encrypt empty or null text"

**Cause:** Webhook secret is empty or undefined

**Solution:**
1. Check request body includes webhook secret
2. Verify frontend is sending the value
3. Add webhook secret field if optional:

```javascript
// In controller - make webhook secret optional
let encryptedWebhookSecret = null;
if (webhookSecret && webhookSecret.startsWith("whsec_")) {
  encryptedWebhookSecret = encryptWebhookSecret(webhookSecret);
}
```

---

### Issue 4: "Webhook secret doesn't start with whsec_"

**Cause:** Invalid webhook secret format

**Solution:**
1. Get correct webhook secret from Stripe Dashboard
2. Ensure it starts with `whsec_`
3. Copy entire secret including `whsec_` prefix

---

### Issue 5: Encryption works but decryption fails

**Cause:** Different encryption keys used or data corrupted

**Solution:**
1. Ensure same `ENCRYPTION_MASTER_KEY` is used
2. Don't modify encrypted data in database
3. Check database field type is String (not Object)

---

## 📊 Encryption Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Frontend sends POST request                            │
│  { publishableKey, secretKey, webhookSecret, testMode } │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Backend Controller receives request                    │
│  - Validates input                                      │
│  - Checks key format                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Encrypt secretKey                                      │
│  encryptStripeKey(secretKey)                            │
│  - Gets ENCRYPTION_MASTER_KEY from env                 │
│  - Derives 32-byte key using PBKDF2                     │
│  - Encrypts with AES-256-GCM                            │
│  - Returns base64 encoded ciphertext                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Encrypt webhookSecret (if provided)                    │
│  encryptWebhookSecret(webhookSecret)                    │
│  - Validates whsec_ prefix                              │
│  - Same encryption process                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Save to MongoDB                                        │
│  {                                                      │
│    collegeId: ObjectId,                                 │
│    credentials: {                                       │
│      keyId: "pk_test_...",          (NOT encrypted)     │
│      keySecret: "base64...",        (ENCRYPTED)         │
│      webhookSecret: "base64..."     (ENCRYPTED)         │
│    }                                                    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Best Practices

### DO ✅
- Use strong random encryption keys (32+ characters)
- Store `ENCRYPTION_MASTER_KEY` in `.env` only
- Add `.env` to `.gitignore`
- Rotate encryption keys periodically
- Use different keys for development and production

### DON'T ❌
- Commit `.env` file to Git
- Use weak keys like "password123"
- Share encryption keys in chat/email
- Store keys in plaintext in database
- Use same key across multiple projects

---

## 📝 Quick Reference

### Generate Strong Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 64 character hex string (256 bits)
```

### Test Encryption
```bash
cd backend
node test-encryption.js
```

### Check Current Key
```bash
# In backend directory
node -e "console.log('Key length:', require('dotenv').config().parsed.ENCRYPTION_MASTER_KEY.length)"
```

### Verify Environment
```javascript
// Add to server.js temporarily
console.log('ENCRYPTION_MASTER_KEY set:', !!process.env.ENCRYPTION_MASTER_KEY);
console.log('Key length:', process.env.ENCRYPTION_MASTER_KEY?.length || 0);
```

---

## 🆘 Still Having Issues?

1. **Run test script:** `node test-encryption.js`
2. **Check logs:** Look for encryption error details
3. **Verify .env:** Ensure key is set and long enough
4. **Restart server:** Changes to .env require restart
5. **Test manually:** Use Postman/cURL to test API

---

**Version:** 1.0.0  
**Last Updated:** March 2026

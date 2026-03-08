# 🚀 Deployment Configuration Guide

## Dynamic URL Configuration for Production

This guide explains how to configure the application for production deployment with dynamic URLs.

---

## 🔧 Environment Variables to Configure

### 1. FRONTEND_URL (Critical for Production)

**Location:** `backend/.env`

**Purpose:** This URL is used for all system-generated email links including:
- Student approval emails
- Rejection emails  
- Password reset emails
- Any other authentication-related links

**Configuration:**

```env
# Development (Local)
FRONTEND_URL=http://localhost:5173

# Production Examples:
FRONTEND_URL=https://yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
FRONTEND_URL=https://yourdomain.com:3000
```

**⚠️ IMPORTANT:** 
- Change this value when deploying to production
- Include `https://` protocol
- Don't include trailing slash (`/`)
- Include port number if using custom port

---

## 📝 Step-by-Step Deployment Configuration

### Step 1: Update Backend .env

Create or update `backend/.env` file:

```env
# ========================
# SERVER CONFIGURATION
# ========================
PORT=5000
NODE_ENV=production

# ========================
# DATABASE
# ========================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-college

# ========================
# JWT SECURITY
# ========================
JWT_SECRET=your-super-secret-production-key-change-this

# ========================
# EMAIL CONFIGURATION
# ========================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASS=your-production-app-password
EMAIL_FROM=Smart College <noreply@yourdomain.com>
SUPPORT_EMAIL=support@yourdomain.com

# ========================
# FRONTEND URL (CRITICAL!)
# ========================
FRONTEND_URL=https://yourdomain.com

# ========================
# CORS CONFIGURATION
# ========================
CLIENT_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ========================
# PAYMENT GATEWAYS
# ========================
STRIPE_SECRET_KEY=sk_live_your_live_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key

RAZORPAY_KEY_ID=rzp_live_your_live_razorpay_key
RAZORPAY_KEY_SECRET=your_live_razorpay_secret
```

### Step 2: Update Frontend Environment

If using Vite (which you are), create `frontend/.env` or `frontend/.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Smart College
```

### Step 3: Configure CORS

In `backend/.env`, update CORS settings:

```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CLIENT_URL=https://yourdomain.com
```

### Step 4: Update Frontend API Configuration

Check `frontend/src/api/axios.js` and ensure it uses the correct backend URL:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // Important for cookies
});

export default api;
```

---

## 🌐 Common Deployment Scenarios

### Scenario 1: Same Domain (Recommended)

```
Frontend: https://yourdomain.com
Backend:  https://yourdomain.com/api
```

**Backend .env:**
```env
FRONTEND_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

**Frontend .env:**
```env
VITE_API_URL=https://yourdomain.com/api
```

---

### Scenario 2: Subdomain Setup

```
Frontend: https://app.yourdomain.com
Backend:  https://api.yourdomain.com
```

**Backend .env:**
```env
FRONTEND_URL=https://app.yourdomain.com
CLIENT_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://www.app.yourdomain.com
```

**Frontend .env:**
```env
VITE_API_URL=https://api.yourdomain.com
```

---

### Scenario 3: Different Domains

```
Frontend: https://mycollege-app.com
Backend:  https://mycollege-api.com
```

**Backend .env:**
```env
FRONTEND_URL=https://mycollege-app.com
CLIENT_URL=https://mycollege-app.com
CORS_ORIGINS=https://mycollege-app.com,https://www.mycollege-app.com
```

**Frontend .env:**
```env
VITE_API_URL=https://mycollege-api.com
```

---

### Scenario 4: With Custom Port

```
Frontend: https://yourdomain.com:3000
Backend:  https://yourdomain.com:5000
```

**Backend .env:**
```env
FRONTEND_URL=https://yourdomain.com:3000
CLIENT_URL=https://yourdomain.com:3000
CORS_ORIGINS=https://yourdomain.com:3000
```

**Frontend .env:**
```env
VITE_API_URL=https://yourdomain.com:5000
```

---

## ✅ Pre-Deployment Checklist

### Backend
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Update `CLIENT_URL` to production domain
- [ ] Update `CORS_ORIGINS` to production domain
- [ ] Change `JWT_SECRET` to a strong production key
- [ ] Update `MONGODB_URI` to production database
- [ ] Update email credentials (`EMAIL_USER`, `EMAIL_PASS`)
- [ ] Set `NODE_ENV=production`
- [ ] Update payment gateway keys to production keys
- [ ] Test email sending functionality

### Frontend
- [ ] Update `VITE_API_URL` to production backend URL
- [ ] Test all API calls
- [ ] Test login/registration flow
- [ ] Test approval email links
- [ ] Build production bundle (`npm run build`)

### Database
- [ ] Set up production MongoDB (MongoDB Atlas recommended)
- [ ] Configure database user with proper permissions
- [ ] Test database connection
- [ ] Set up database backups

### Email
- [ ] Configure production email service
- [ ] Test approval email delivery
- [ ] Test rejection email delivery
- [ ] Verify email links point to correct domain

---

## 🧪 Testing After Deployment

### 1. Test Student Registration

```
1. Register as student
2. Check success message appears
3. Verify redirect to login
```

### 2. Test Login Restriction

```
1. Try to login with pending account
2. Should see: "Your account is awaiting admin approval"
3. Error message should be clear
```

### 3. Test Admin Approval

```
1. Login as College Admin
2. Navigate to /students/pending-approvals
3. Click "Approve" on a student
4. Check student receives email
5. **VERIFY EMAIL LINK POINTS TO PRODUCTION DOMAIN**
```

### 4. Test Email Links

```
1. Open approval email
2. Click "Login to Student Portal" button
3. Should redirect to: https://yourdomain.com/login
4. NOT: http://localhost:5173/login
```

### 5. Test Student Login After Approval

```
1. Login with approved student credentials
2. Should successfully login
3. Should redirect to student dashboard
```

---

## 🐛 Troubleshooting

### Issue: Email links point to localhost

**Solution:** Update `FRONTEND_URL` in `backend/.env`:
```env
FRONTEND_URL=https://yourdomain.com
```
Then restart backend server.

---

### Issue: CORS errors after deployment

**Solution:** Update CORS configuration in `backend/.env`:
```env
CORS_ORIGINS=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
```

---

### Issue: Cookies not working in production

**Solutions:**
1. Ensure `secure: true` in cookie settings when in production
2. Use `sameSite: 'none'` for cross-origin setups
3. Use HTTPS in production (required for secure cookies)

---

### Issue: API calls failing after deployment

**Solution:** Check frontend API configuration:
```javascript
// frontend/src/api/axios.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.yourdomain.com',
  withCredentials: true,
});
```

---

## 🔒 Security Best Practices for Production

### 1. Environment Variables
- Never commit `.env` files to Git
- Use `.env.example` as template
- Rotate secrets regularly
- Use strong JWT secrets (minimum 32 characters)

### 2. HTTPS
- Always use HTTPS in production
- Get SSL certificate (Let's Encrypt is free)
- Redirect HTTP to HTTPS

### 3. CORS
- Be specific with allowed origins
- Don't use `*` in production
- List all valid domains explicitly

### 4. Cookies
- Set `secure: true` in production
- Set `httpOnly: true` for all auth cookies
- Set appropriate `sameSite` value
- Use reasonable expiration times

### 5. Rate Limiting
- Enable rate limiting in production
- Set appropriate limits (e.g., 100 requests per 15 minutes)
- Protect authentication endpoints

---

## 📊 Monitoring After Deployment

### Logs to Monitor
- Email sending failures
- Authentication errors
- CORS errors
- Database connection issues
- API response times

### Metrics to Track
- Number of student registrations
- Approval/rejection rates
- Email delivery rates
- Login success/failure rates
- API error rates

---

## 🎯 Quick Reference

### Development Configuration
```env
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Production Configuration
```env
FRONTEND_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
NODE_ENV=production
```

### Email Link Format
```
Development: http://localhost:5173/login
Production:  https://yourdomain.com/login
```

---

## 📞 Support

If you encounter issues during deployment:

1. Check all environment variables are set correctly
2. Verify `FRONTEND_URL` matches your production domain
3. Test email functionality
4. Check CORS configuration
5. Review server logs for errors
6. Test all user flows (registration, approval, login)

---

**Last Updated:** March 7, 2026  
**Version:** 1.0

# Razorpay Payment Gateway Integration

## 🎯 Overview
Implement Razorpay payment gateway integration following the existing multi-tenant Stripe architecture. This will allow colleges to configure their own Razorpay credentials and accept payments directly to their Razorpay accounts.

## 📊 Current Status

### ✅ What Exists
- **Database Schema**: `CollegePaymentConfig` model already supports `gatewayCode: "razorpay"`
- **Encryption Utils**: `encryptRazorpayKey()` and `decryptRazorpayKey()` functions exist in `encryption.util.js`
- **Frontend Placeholder**: Razorpay option exists in `FeeSetting.jsx` with "coming-soon" badge

### ❌ What's Missing
- **Service Layer**: No `collegeRazorpay.service.js` for dynamic Razorpay instances
- **Controllers**: No payment controllers for creating orders or verifying payments
- **Webhook Handler**: No multi-tenant webhook routing for Razorpay events
- **Routes**: No API routes configured for Razorpay
- **Frontend Integration**: `MakePayments.jsx` only supports Stripe (no Razorpay option)

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         NOVAA SaaS Platform             │
│                                         │
│  College A → Razorpay Account A        │
│  College B → Razorpay Account B        │
│  College C → Razorpay Account C        │
│                                         │
│  All keys encrypted with Master Key    │
└─────────────────────────────────────────┘
```

## 📋 Implementation Requirements

### Backend (7 New Files)

1. **`backend/src/services/collegeRazorpay.service.js`**
   - Dynamic Razorpay instance per college
   - Credential verification
   - Cache management (similar to Stripe)
   - Decrypt Razorpay keys on-demand

2. **`backend/src/controllers/razorpay.payment.controller.js`**
   - `createOrder()` - Create Razorpay order
   - `verifyPayment()` - Verify payment signature
   - `confirmPayment()` - Update database after payment

3. **`backend/src/controllers/collegeRazorpayConfig.controller.js`**
   - `saveRazorpayConfig()` - Save college credentials
   - `getRazorpayConfig()` - Get college config
   - `verifyRazorpayConfig()` - Verify credentials
   - `deleteRazorpayConfig()` - Delete config
   - `testRazorpayConnection()` - Test API connectivity

4. **`backend/src/webhooks/razorpay.webhook.js`**
   - Multi-tenant webhook routing
   - Signature verification (HMAC-SHA256)
   - Handle events: `payment.captured`, `order.paid`, `payment.failed`
   - Update payment status
   - Send receipt emails

5. **`backend/src/routes/razorpay.routes.js`**
   - `POST /api/razorpay/create-order`
   - `POST /api/razorpay/verify-payment`
   - `POST /api/razorpay/confirm-payment`

6. **`backend/src/routes/collegeRazorpayConfig.routes.js`**
   - `GET /api/admin/razorpay/config`
   - `POST /api/admin/razorpay/config`
   - `POST /api/admin/razorpay/verify`
   - `DELETE /api/admin/razorpay/config`

7. **Update `backend/src/app.js`**
   - Register new routes

### Frontend (2 Files to Update)

1. **`frontend/src/pages/dashboard/College-Admin/SystemSetting/FeeSetting.jsx`**
   - Remove "coming-soon" badge from Razorpay
   - Enable Razorpay configuration tab
   - Add Key ID and Key Secret input fields

2. **`frontend/src/pages/dashboard/Student/MakePayments.jsx`**
   - Add Razorpay payment option
   - Integrate Razorpay checkout modal
   - Handle payment success/failure callbacks

### Documentation (1 File)

1. **`RAZORPAY_INTEGRATION_GUIDE.md`**
   - Setup instructions
   - API documentation
   - Testing guide
   - Troubleshooting

## 🔑 Razorpay API Reference

### Create Order
```javascript
POST https://api.razorpay.com/v1/orders
Headers:
  Authorization: Basic base64(key_id:key_secret)
Body:
  {
    amount: 50000,        // Amount in paise (₹500 = 50000 paise)
    currency: "INR",
    receipt: "order_rcptid_11",
    notes: {
      studentId: "...",
      installmentName: "...",
      collegeId: "..."
    }
  }
```

### Verify Payment
```javascript
const signature = crypto
  .createHmac("sha256", key_secret)
  .update(order_id + "|" + payment_id)
  .digest("hex");
```

### Webhook Events
- `payment.captured`
- `order.paid`
- `payment.failed`

## 🚀 Development Without Test Keys

### Problem
We don't have Razorpay test credentials for development and testing.

### Proposed Solution

#### Phase 1: Build Complete Infrastructure (No Keys Needed)
- ✅ Implement all service layers
- ✅ Implement all controllers
- ✅ Implement webhook handlers
- ✅ Implement routes
- ✅ Update frontend UI
- ✅ Add mock mode for development

#### Phase 2: Mock Mode for Development
```javascript
// Graceful degradation when keys not configured
if (!razorpayInstance) {
  if (process.env.NODE_ENV === 'development') {
    // Return mock order for UI testing
    return {
      id: "mock_order_" + Date.now(),
      amount: installment.amount * 100,
      currency: "INR",
      status: "created"
    };
  }
  throw new AppError('Razorpay not configured', 400);
}
```

#### Phase 3: Testing When Colleges Add Keys
- College admin adds their Razorpay credentials via dashboard
- Test payment flow in production for that specific college
- Logs show real API calls
- Webhook verification works
- Production ready for that college

## 📦 Environment Variables

```env
# Razorpay Global Fallback (Optional)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# NOT needed for multi-tenant (colleges add their own via dashboard)
ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars
```

## ✅ Testing Checklist

### Without Keys (Development)
- [ ] Admin can navigate to Razorpay config page
- [ ] Admin can save credentials (UI validation only)
- [ ] Student can see Razorpay payment option
- [ ] Mock order creation works
- [ ] Mock payment flow completes
- [ ] Receipt generation works (mock data)

### With Keys (Production Testing)
- [ ] College admin can configure Razorpay
- [ ] Credentials can be verified
- [ ] Test mode works with Razorpay test cards
- [ ] Webhook signature verification works
- [ ] Payment creates real order
- [ ] Payment updates database
- [ ] Receipt email is sent
- [ ] Error handling works (failed payments)
- [ ] Duplicate payment protection works

## 🔒 Security Considerations

- ✅ AES-256-GCM encryption for secret keys
- ✅ PBKDF2 key derivation (100,000 iterations)
- ✅ Webhook signature verification
- ✅ JWT authentication required
- ✅ Role-based access control
- ✅ Multi-tenant isolation

## 📊 Key Differences: Stripe vs Razorpay

| Feature | Stripe | Razorpay |
|---------|--------|----------|
| Order Creation | Checkout Session | Order API |
| Payment Method | Redirect to Stripe | Modal/Popup |
| Amount Format | Paise (×100) | Paise (×100) |
| Verification | Webhook + Session | Signature HMAC-SHA256 |
| Webhook Events | checkout.session.completed | payment.captured |
| Test Cards | 4242 4242... | Test mode enabled |
| Currency | Multi-currency | INR primary |

## 🎯 Acceptance Criteria

- [ ] College admin can configure Razorpay credentials
- [ ] Credentials are encrypted before storage
- [ ] Student can select Razorpay as payment option
- [ ] Razorpay checkout modal opens correctly
- [ ] Payment completes successfully
- [ ] Database updates with payment status
- [ ] Receipt email is sent to student
- [ ] Webhook handles payment events
- [ ] Error scenarios are handled gracefully
- [ ] Mock mode works in development

## 🔗 References

- Razorpay Docs: https://razorpay.com/docs/payments/
- Razorpay Node.js SDK: https://github.com/razorpay/razorpay-node
- Existing Stripe Implementation: `backend/src/services/collegeStripe.service.js`
- Multi-Tenant Guide: `MULTI_TENANT_STRIPE_GUIDE.md`

## 📝 Notes

- **DO NOT** test with real money until proper test credentials are available
- Use mock mode for all development and UI testing
- Request test credentials from manager before production testing
- Follow existing Stripe implementation patterns
- Maintain code consistency with existing payment gateway code

---

**Priority**: High (Required for Indian market)  
**Estimated Effort**: 2-3 days  
**Dependencies**: Manager approval for test credentials  
**Labels**: enhancement, backend, frontend, payment-gateway, razorpay

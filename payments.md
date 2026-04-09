# Payment Gateway Module

**Last Updated**: April 8, 2026  
**Status**: ✅ Production-Ready (Dual Gateway: Stripe + Razorpay)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Stripe Integration](#stripe-integration)
- [Razorpay Integration](#razorpay-integration)
- [Webhook Setup](#webhook-setup)
- [Admin Configuration](#admin-configuration)
- [Student Payment Flow](#student-payment-flow)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Overview

### Dual-Gateway Payment System

The NOVAA platform supports **two fully-implemented payment gateways: Stripe and Razorpay**. Both are **primary gateways** - students can choose either option during checkout. Neither is a fallback or secondary system.

**Key Features**:
- ✅ Multi-tenant support (per-college configuration)
- ✅ Encrypted credential storage (AES-256-GCM)
- ✅ Webhook signature verification
- ✅ Duplicate payment protection
- ✅ Email notifications (receipts & failures)
- ✅ Admin configuration UI
- ✅ Production-ready

### Gateway Comparison

| Feature | Stripe | Razorpay |
|---------|--------|----------|
| **Status** | ✅ Production-Ready | ✅ Production-Ready |
| **Checkout Type** | Redirect to hosted page | Embedded modal |
| **Geographic Focus** | Global | India-focused |
| **Payment Methods** | Card, UPI, Net Banking | Card, UPI, Net Banking, Wallets |
| **Currency** | Multi-currency | INR (primary) |
| **Webhook Events** | 3 events | 3 events |
| **Duplicate Protection** | 2-layer | 3-layer |
| **Admin UI** | ✅ Complete | ✅ Complete |

---

## Architecture

### High-Level Flow

```
Student Payment Page
         │
         ├──► [Stripe Button] ──► /api/stripe/create-checkout-session
         │                              │
         │                              ▼
         │                         Stripe Checkout (redirect)
         │                              │
         │                              ▼
         │                         Stripe Webhook ──► /api/stripe/webhook
         │
         │
         ├──► [Razorpay Button] ──► /api/razorpay/create-order
         │                              │
         │                              ▼
         │                         Razorpay Modal (embedded)
         │                              │
         │                              ▼
         │                         Razorpay Webhook ──► /api/razorpay/webhook
         │
         ▼
    Both paths converge:
    - Update StudentFee record
    - Mark installment as PAID
    - Send receipt email
    - Return success response
```

### Multi-Tenant Design

Each college configures its own payment gateway credentials:

```
College A ──► Stripe: sk_test_AAAAA, Razorpay: rzp_test_AAAAA
College B ──► Stripe: sk_test_BBBBB, Razorpay: rzp_test_BBBBB
College C ──► Stripe: sk_test_CCCCC, Razorpay: (not configured)
```

All credentials are encrypted in the database using AES-256-GCM.

---

## Getting Started

### Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** (running and accessible)
3. **Payment Gateway Accounts**:
   - Stripe account: https://dashboard.stripe.com
   - Razorpay account: https://dashboard.razorpay.com
4. **Environment Variables** configured

### Installation

```bash
# Backend dependencies
cd backend
npm install

# Ensure payment gateway SDKs are installed
npm install stripe razorpay
```

### Environment Setup

```env
# Required: Encryption key for payment secrets
ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars

# Optional: Global fallback keys (not used in multi-tenant mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

RAZORPAY_KEY_ID=rzp_test_your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Email (for payment receipts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
```

---

## Stripe Integration

### 1. Backend Components

**Service Layer**: `backend/src/services/collegeStripe.service.js`

```javascript
const { getStripeInstance, getCollegeStripeConfig } = require("../services/collegeStripe.service");

// Get Stripe instance for a specific college
const { stripe, config } = await getStripeInstance(collegeId);

// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount * 100, // Convert to cents
  currency: "INR",
  metadata: {
    collegeId,
    studentId,
    installmentName
  }
});
```

**Controller**: `backend/src/controllers/stripe.payment.controller.js`

```javascript
// Create checkout session
exports.createCheckoutSession = async (req, res, next) => {
  const { collegeId, installmentName } = req.body;
  
  // Get Stripe instance for this college
  const { stripe, config } = await getStripeInstance(collegeId);
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "INR",
        product_data: { name: installmentName },
        unit_amount: amount * 100
      },
      quantity: 1
    }],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    metadata: {
      collegeId,
      studentId: student._id,
      installmentName
    }
  });
  
  res.json({ url: session.url });
};
```

**Routes**: `backend/src/routes/stripe.routes.js`

```javascript
const express = require("express");
const router = express.Router();
const { createCheckoutSession } = require("../controllers/stripe.payment.controller");
const { auth, role } = require("../middlewares/auth.middleware");
const paymentLimiter = require("../middlewares/rateLimit.middleware").paymentLimiter;

router.post("/create-checkout-session", 
  auth, 
  role("STUDENT"), 
  paymentLimiter, 
  createCheckoutSession
);

module.exports = router;
```

### 2. Frontend Integration

**Student Payment Page**: `frontend/src/pages/dashboard/Student/MakePayments.jsx`

```javascript
const handleStripePayment = async () => {
  try {
    setLoading(true);
    
    const response = await axios.post(
      "/api/stripe/create-checkout-session",
      { installmentName: selectedInstallment.name }
    );
    
    // Redirect to Stripe Checkout
    window.location.href = response.data.url;
  } catch (error) {
    console.error("Stripe payment error:", error);
    toast.error("Failed to initiate payment");
  } finally {
    setLoading(false);
  }
};

// In JSX:
<button 
  className="payment-gateway-btn stripe-gateway"
  onClick={handleStripePayment}
  disabled={loading}
>
  <FaCreditCard className="gateway-icon" />
  <span>Stripe</span>
  <span>Card / UPI / Net Banking</span>
</button>
```

**Admin Configuration UI**: `frontend/src/pages/dashboard/College-Admin/SystemSetting/StripeConfiguration.jsx`

```javascript
// College admins can configure Stripe credentials via this UI
const handleSaveConfig = async () => {
  await axios.post("/api/admin/stripe/config", {
    collegeId,
    keyId: publishableKey,
    keySecret: secretKey,
    webhookSecret,
    testMode
  });
};
```

---

## Razorpay Integration

### 1. Backend Components

**Service Layer**: `backend/src/services/collegeRazorpay.service.js`

```javascript
const { getRazorpayInstance, getCollegeRazorpayConfig } = require("../services/collegeRazorpay.service");

// Get Razorpay instance for a specific college
const { razorpay, config } = await getRazorpayInstance(collegeId);

// Create order
const order = await razorpay.orders.create({
  amount: amount * 100, // Convert to paise
  currency: "INR",
  receipt: `order_${Date.now()}`,
  notes: {
    collegeId,
    studentId,
    installmentName
  }
});
```

**Controller**: `backend/src/controllers/razorpay.payment.controller.js`

```javascript
// Create payment order
exports.createOrder = async (req, res, next) => {
  const { collegeId, installmentName } = req.body;
  
  // Get Razorpay instance for this college
  const { razorpay, config } = await getRazorpayInstance(collegeId);
  
  // Create order
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `order_${Date.now()}`,
    notes: {
      collegeId,
      studentId: student._id,
      installmentName
    }
  });
  
  res.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: config.credentials.keyId
  });
};

// Verify payment signature
exports.verifyPayment = async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  // Generate expected signature
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  
  if (expectedSignature === razorpay_signature) {
    // Payment verified
    res.json({ valid: true });
  } else {
    throw new AppError("Payment verification failed", 400, "INVALID_SIGNATURE");
  }
};
```

**Routes**: `backend/src/routes/razorpay.routes.js`

```javascript
const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("../controllers/razorpay.payment.controller");
const { auth, role } = require("../middlewares/auth.middleware");
const paymentLimiter = require("../middlewares/rateLimit.middleware").paymentLimiter;

router.post("/create-order", 
  auth, 
  role("STUDENT"), 
  paymentLimiter, 
  createOrder
);

router.post("/verify-payment", 
  auth, 
  role("STUDENT"), 
  paymentLimiter, 
  verifyPayment
);

module.exports = router;
```

### 2. Frontend Integration

**Student Payment Page**: `frontend/src/pages/dashboard/Student/MakePayments.jsx`

```javascript
const handleRazorpayPayment = async () => {
  try {
    setLoading(true);
    
    // Create order
    const orderResponse = await axios.post("/api/razorpay/create-order", {
      installmentName: selectedInstallment.name
    });
    
    const { orderId, amount, currency, key } = orderResponse.data;
    
    // Open Razorpay checkout modal
    const options = {
      key: key,
      amount: amount,
      currency: currency,
      name: "College Fee Payment",
      description: selectedInstallment.name,
      order_id: orderId,
      handler: async function (response) {
        // Verify payment
        const verifyResponse = await axios.post("/api/razorpay/verify-payment", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
        
        if (verifyResponse.data.valid) {
          toast.success("Payment successful!");
          navigate("/payment/success");
        }
      },
      prefill: {
        name: student.fullName,
        email: student.email
      },
      theme: { color: "#3399cc" }
    };
    
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error("Razorpay payment error:", error);
    toast.error("Failed to initiate payment");
  } finally {
    setLoading(false);
  }
};

// In JSX:
<button 
  className="payment-gateway-btn razorpay-gateway"
  onClick={handleRazorpayPayment}
  disabled={loading}
>
  <FaMoneyBillWave className="gateway-icon" />
  <span>Razorpay</span>
  <span>Card / UPI / Net Banking</span>
</button>
```

**Admin Configuration UI**: `frontend/src/pages/dashboard/College-Admin/SystemSetting/RazorpayConfiguration.jsx`

```javascript
// College admins can configure Razorpay credentials via this UI
const handleSaveConfig = async () => {
  await axios.post("/api/admin/razorpay/config", {
    collegeId,
    keyId: keyId,
    keySecret: keySecret,
    webhookSecret,
    testMode
  });
};
```

---

## Webhook Setup

### Stripe Webhook

**Route**: `POST /api/stripe/webhook`  
**Handler**: `backend/src/webhooks/stripe.webhook.js`

**Setup Steps**:

1. **Configure in Stripe Dashboard**:
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

2. **Get Webhook Secret**:
   - Copy the signing secret (whsec_...)
   - Store it securely

3. **Configure in Admin Panel**:
   - College Admin → System Settings → Stripe Configuration
   - Paste webhook secret
   - Save configuration

**Webhook Handler Logic**:

```javascript
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  
  // 1. Verify webhook signature
  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  
  // 2. Extract college ID from metadata
  collegeId = event.data.object.metadata?.collegeId;
  
  // 3. Get college-specific Stripe config
  const { stripe, config } = await getCollegeStripeWebhookConfig(collegeId);
  
  // 4. Process event
  switch (event.type) {
    case "checkout.session.completed":
      await processSuccessfulPayment(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await processFailedPayment(event.data.object);
      break;
  }
  
  res.json({ received: true });
};
```

**Supported Events**:
- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment intent completed
- `payment_intent.payment_failed` - Payment failed

### Razorpay Webhook

**Route**: `POST /api/razorpay/webhook`  
**Handler**: `backend/src/webhooks/razorpay.webhook.js`

**Setup Steps**:

1. **Configure in Razorpay Dashboard**:
   - Go to Settings → Webhooks
   - Add endpoint: `https://yourdomain.com/api/razorpay/webhook`
   - Select events:
     - `payment.captured`
     - `order.paid`
     - `payment.failed`

2. **Get Webhook Secret**:
   - Copy the webhook signing secret
   - Store it securely

3. **Configure in Admin Panel**:
   - College Admin → System Settings → Razorpay Configuration
   - Paste webhook secret
   - Save configuration

**Webhook Handler Logic**:

```javascript
exports.handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  
  // 1. Verify webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(JSON.stringify(req.body))
    .digest("hex");
  
  if (expectedSignature !== signature) {
    return res.status(400).json({ error: "Invalid signature" });
  }
  
  // 2. Extract college ID from order metadata
  const event = req.body;
  collegeId = extractCollegeIdFromOrder(event.payload.payment.entity);
  
  // 3. Get college-specific Razorpay config
  const { razorpay, config } = await getCollegeRazorpayWebhookConfig(collegeId);
  
  // 4. Process event
  switch (event.event) {
    case "payment.captured":
    case "order.paid":
      await processSuccessfulPayment(event);
      break;
    case "payment.failed":
      await processFailedPayment(event);
      break;
  }
  
  res.json({ received: true });
};
```

**Supported Events**:
- `payment.captured` - Payment captured successfully
- `order.paid` - Order marked as paid
- `payment.failed` - Payment failed

---

## Admin Configuration

### Stripe Configuration UI

**Path**: College Admin Dashboard → System Settings → Stripe Configuration

**Fields**:
- **Publishable Key** (pk_test_... or pk_live_...)
- **Secret Key** (sk_test_... or sk_live_...) - encrypted before storage
- **Webhook Secret** (whsec_...) - encrypted before storage
- **Test Mode** toggle

**Actions**:
- **Save Configuration**: Encrypts and stores credentials
- **Verify Credentials**: Tests connection with Stripe API
- **Test Connection**: Creates a test session
- **Delete Configuration**: Removes stored credentials

### Razorpay Configuration UI

**Path**: College Admin Dashboard → System Settings → Razorpay Configuration

**Fields**:
- **Key ID** (rzp_test_... or live key)
- **Key Secret** - encrypted before storage
- **Webhook Secret** - encrypted before storage
- **Test Mode** toggle

**Actions**:
- **Save Configuration**: Encrypts and stores credentials
- **Verify Credentials**: Tests connection with Razorpay API
- **Test Connection**: Creates a test order
- **Delete Configuration**: Removes stored credentials

---

## Student Payment Flow

### Complete Payment Journey

```
1. Student Login
   │
   ▼
2. Navigate to "Make Payment" page
   │
   ▼
3. View pending installments
   │
   ▼
4. Select installment to pay
   │
   ▼
5. Choose payment gateway (Stripe or Razorpay)
   │
   ├────► [Stripe]
   │       │
   │       ▼
   │     Click "Pay via Stripe"
   │       │
   │       ▼
   │     Backend creates checkout session
   │       │
   │       ▼
   │     Student redirected to Stripe Checkout
   │       │
   │       ▼
   │     Student completes payment
   │       │
   │       ▼
   │     Stripe redirects to success/cancel URL
   │       │
   │       ▼
   │     Stripe sends webhook to backend
   │       │
   │       ▼
   │     Backend updates StudentFee record
   │       │
   │       ▼
   │     Receipt email sent
   │
   │
   └────► [Razorpay]
           │
           ▼
         Click "Pay via Razorpay"
           │
           ▼
         Backend creates order
           │
           ▼
         Razorpay modal opens
           │
           ▼
         Student completes payment
           │
           ▼
         Frontend verifies signature
           │
           ▼
         Razorpay sends webhook to backend
           │
           ▼
         Backend updates StudentFee record
           │
           ▼
         Receipt email sent
```

### Payment Success Response

```json
{
  "success": true,
  "installment": {
    "_id": "installment_id",
    "name": "Installment 1",
    "amount": 5000,
    "status": "PAID",
    "paidAt": "2026-04-08T10:30:00.000Z",
    "transactionId": "pi_3OxYz2...",
    "paymentGateway": "stripe"
  },
  "receipt": {
    "receiptNumber": "RCP-2026-00001",
    "downloadUrl": "/api/fees/receipt/RCP-2026-00001"
  }
}
```

### Payment Failure Response

```json
{
  "success": false,
  "error": "Payment failed",
  "message": "Your payment could not be processed. Please try again.",
  "installment": {
    "_id": "installment_id",
    "name": "Installment 1",
    "amount": 5000,
    "status": "PENDING"
  }
}
```

---

## Security

### Credential Encryption

All payment gateway secrets are encrypted before storage:

```javascript
// Encryption utilities: backend/src/utils/encryption.util.js

// AES-256-GCM encryption
const algorithm = "aes-256-gcm";

// Encrypt Stripe secret
const encrypted = encryptStripeKey("sk_test_secret_key");
// Result: { encrypted: "...", iv: "...", authTag: "..." }

// Decrypt Stripe secret
const decrypted = decryptStripeKey(encrypted);
// Result: "sk_test_secret_key"

// Same for Razorpay
const encrypted = encryptRazorpayKey("razorpay_secret");
const decrypted = decryptRazorpayKey(encrypted);
```

### Webhook Verification

**Stripe**:
```javascript
// Verify webhook signature
const event = stripe.webhooks.constructEvent(
  rawBody,           // Raw request body
  signature,         // stripe-signature header
  webhookSecret      // College-specific webhook secret
);
```

**Razorpay**:
```javascript
// Verify webhook signature
const expectedSignature = crypto
  .createHmac("sha256", webhookSecret)
  .update(JSON.stringify(req.body))
  .digest("hex");

if (expectedSignature !== req.headers["x-razorpay-signature"]) {
  throw new Error("Invalid webhook signature");
}
```

### Duplicate Payment Protection

**Layer 1**: Check if installment is already marked as PAID

```javascript
if (installment.status === "PAID") {
  return res.json({ valid: true, alreadyPaid: true, installment });
}
```

**Layer 2**: Check if payment ID matches existing transaction

```javascript
if (installment.transactionId === paymentId) {
  return res.json({ valid: true, alreadyProcessed: true, installment });
}
```

**Layer 3** (Razorpay only): Check if order ID was already processed

```javascript
const existingOrder = await StudentFee.findOne({
  "installments.razorpayOrderId": orderId
});

if (existingOrder) {
  return res.json({ valid: true, orderAlreadyProcessed: true });
}
```

### Rate Limiting

```javascript
// Payment endpoints: 50 requests per 15 minutes
app.use("/api/stripe", paymentLimiter);
app.use("/api/razorpay", paymentLimiter);

// Webhook endpoints: 200 requests per 15 minutes
app.use("/api/stripe/webhook", webhookLimiter);
app.use("/api/razorpay/webhook", webhookLimiter);
```

---

## Testing

### Test Mode Setup

Both gateways support test mode for development:

**Stripe Test Mode**:
```env
# Use test keys (sk_test_..., pk_test_...)
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
```

**Razorpay Test Mode**:
```env
# Use test keys (rzp_test_...)
RAZORPAY_KEY_ID=rzp_test_your_test_key
RAZORPAY_KEY_SECRET=your_test_secret
```

### Test Cards

**Stripe Test Cards**:

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Declined |
| 4000 0025 0000 3155 | Requires authentication |

**Razorpay Test Cards**:

| Card Number | Description |
|-------------|-------------|
| 4111 1111 1111 1111 | Success |
| 4000 0000 0000 0002 | Failed |
| 5200 0000 0000 1096 | Success (Mastercard) |

### Testing Checklist

```
□ Environment variables configured
□ ENCRYPTION_MASTER_KEY set
□ Payment gateway test keys obtained
□ Admin configuration UI accessible
□ Credentials saved and encrypted
□ Webhook endpoints accessible
□ Student payment page loads
□ Both Stripe and Razorpay buttons visible
□ Stripe checkout redirects correctly
□ Razorpay modal opens correctly
□ Test payments complete successfully
✓ Webhooks received and processed
✓ StudentFee records updated
✓ Receipt emails sent
□ Duplicate payment protection works
□ Failure handling works correctly
```

### Mock Mode (Development)

For development without real credentials:

```javascript
// Mock mode is automatically enabled when gateway is not configured
if (!stripeInstance) {
  if (process.env.NODE_ENV === "development") {
    return {
      id: "mock_session_" + Date.now(),
      amount: installment.amount * 100,
      currency: "INR",
      status: "created"
    };
  }
  throw new AppError("Stripe not configured", 400);
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Payment gateway not configured for this college"

**Cause**: College admin hasn't configured payment credentials

**Solution**:
- Navigate to College Admin → System Settings
- Configure Stripe or Razorpay credentials
- Click "Save Configuration"

#### 2. "Invalid webhook signature"

**Cause**: Webhook secret mismatch

**Solution**:
- Verify webhook secret in admin panel matches dashboard
- Ensure raw body parsing is enabled for webhook route
- Check that webhook secret is encrypted before storage

#### 3. "Failed to decrypt payment credentials"

**Cause**: ENCRYPTION_MASTER_KEY changed or missing

**Solution**:
- Verify `ENCRYPTION_MASTER_KEY` in .env file
- Key must be at least 16 characters
- If key was changed, re-encrypt all credentials

#### 4. Duplicate webhook processing

**Cause**: Webhook called multiple times

**Solution**:
- Duplicate payment protection is built-in (3 layers)
- Check logs for duplicate webhook calls
- Verify webhook endpoint is correctly configured

#### 5. Student redirected to cancel page

**Cause**: Payment cancelled by student or failed

**Solution**:
- Check Stripe/Razorpay dashboard for payment status
- Verify error message shown to student
- Check backend logs for specific error

### Debug Logging

Enable debug logging:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

**Key Log Messages**:
```
🔵 [Stripe Payment] Creating checkout session
🟢 Student lookup result: FOUND
🔵 [Razorpay Payment] Creating order
✅ [Webhook] Payment processed successfully
⚠️ [Duplicate Protection] Installment already paid
❌ [Webhook] Invalid signature
```

### Checking Payment Status

```javascript
// Check StudentFee record
const studentFee = await StudentFee.findOne({ student_id: studentId });

// Check installment status
const installment = studentFee.installments.id(installmentId);
console.log(installment.status); // "PAID" or "PENDING"
console.log(installment.paymentGateway); // "stripe" or "razorpay"
console.log(installment.transactionId); // Payment gateway transaction ID
```

---

## API Reference

### Student Endpoints

#### Create Stripe Checkout Session

```
POST /api/stripe/create-checkout-session
Authorization: Bearer <token>
Role: STUDENT

Request Body:
{
  "installmentName": "Installment 1"
}

Response (302 Redirect):
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

#### Create Razorpay Order

```
POST /api/razorpay/create-order
Authorization: Bearer <token>
Role: STUDENT

Request Body:
{
  "installmentName": "Installment 1"
}

Response:
{
  "orderId": "order_xxxxx",
  "amount": 500000,
  "currency": "INR",
  "key": "rzp_test_xxxxx"
}
```

#### Verify Razorpay Payment

```
POST /api/razorpay/verify-payment
Authorization: Bearer <token>
Role: STUDENT

Request Body:
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature"
}

Response:
{
  "valid": true,
  "installment": { ... }
}
```

### Admin Endpoints

#### Stripe Configuration

```
GET /api/admin/stripe/config
POST /api/admin/stripe/config
POST /api/admin/stripe/verify
DELETE /api/admin/stripe/config
GET /api/admin/stripe/test
GET /api/admin/stripe/colleges
```

#### Razorpay Configuration

```
GET /api/admin/razorpay/config
POST /api/admin/razorpay/config
POST /api/admin/razorpay/verify
DELETE /api/admin/razorpay/config
GET /api/admin/razorpay/test
GET /api/admin/razorpay/colleges
```

#### Webhook Endpoints

```
POST /api/stripe/webhook
Content-Type: application/json
Stripe-Signature: <signature>

POST /api/razorpay/webhook
Content-Type: application/json
X-Razorpay-Signature: <signature>
```

---

## File Locations

### Backend

```
backend/src/
├── controllers/
│   ├── stripe.payment.controller.js          ✅
│   ├── razorpay.payment.controller.js        ✅
│   ├── collegeStripeConfig.controller.js     ✅
│   └── collegeRazorpayConfig.controller.js   ✅
├── services/
│   ├── collegeStripe.service.js              ✅
│   └── collegeRazorpay.service.js            ✅
├── webhooks/
│   ├── stripe.webhook.js                     ✅
│   └── razorpay.webhook.js                   ✅
├── routes/
│   ├── stripe.routes.js                      ✅
│   ├── razorpay.routes.js                    ✅
│   ├── collegeStripeConfig.routes.js         ✅
│   └── collegeRazorpayConfig.routes.js       ✅
├── models/
│   └── collegePaymentConfig.model.js         ✅
└── utils/
    └── encryption.util.js                    ✅
```

### Frontend

```
frontend/src/
└── pages/
    └── dashboard/
        ├── College-Admin/
        │   └── SystemSetting/
        │       ├── StripeConfiguration.jsx   ✅
        │       └── RazorpayConfiguration.jsx ✅
        └── Student/
            ├── MakePayments.jsx              ✅
            ├── PaymentSuccess.jsx            ✅
            └── PaymentCancel.jsx             ✅
```

---

## Related Documentation

- [System Architecture](../core/ARCHITECTURE.md) - Overall platform architecture
- [Multi-Tenant Stripe Guide](../../MULTI_TENANT_STRIPE_GUIDE.md) - Stripe setup guide
- [Encryption Troubleshooting](../../ENCRYPTION_TROUBLESHOOTING.md) - Encryption issues
- [Razorpay Integration Complete](../../RAZORPAY_INTEGRATION_COMPLETE.md) - Razorpay setup details

---

**Maintained By**: NOVAA Development Team  
**Last Review**: April 8, 2026  
**Next Review**: May 8, 2026

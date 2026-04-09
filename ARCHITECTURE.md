# NOVAA Platform - System Architecture

**Last Updated**: April 8, 2026  
**Version**: 2.0  
**Branch**: main

---

## 📋 Table of Contents

- [Platform Overview](#platform-overview)
- [System Architecture](#system-architecture)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Payment Gateway Architecture](#payment-gateway-architecture)
- [Database Architecture](#database-architecture)
- [Security Architecture](#security-architecture)
- [API Architecture](#api-architecture)

---

## Platform Overview

NOVAA is a multi-tenant SaaS platform for college/university management. Each college operates as an isolated tenant with its own:

- Student records
- Course catalogs
- Fee structures
- Payment gateway configurations
- Users and roles

### Key Architectural Principles

1. **Multi-Tenant Isolation**: Each college's data and configurations are isolated
2. **Dual Payment Gateways**: Both Stripe and Razorpay are fully implemented as primary options
3. **Encrypted Credentials**: All payment gateway secrets are encrypted at rest
4. **Role-Based Access**: JWT-based authentication with granular role permissions
5. **Event-Driven Webhooks**: Real-time payment processing via webhook handlers

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NOVAA SaaS Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Frontend (React + Vite)          Backend (Node.js + Express)       │
│  ┌──────────────────────┐          ┌──────────────────────────┐    │
│  │  Student Dashboard   │          │  Authentication Layer    │    │
│  │  College Admin Panel │ ◄──────► │  Rate Limiting           │    │
│  │  Super Admin Panel   │  HTTPS   │  CORS + Security Headers │    │
│  │  Faculty Portal      │          │  JWT Verification        │    │
│  └──────────────────────┘          └──────────────────────────┘    │
│                                        │                             │
│                                        ▼                             │
│                          ┌──────────────────────────┐               │
│                          │   Routing Layer          │               │
│                          │  /api/auth               │               │
│                          │  /api/students           │               │
│                          │  /api/stripe             │               │
│                          │  /api/razorpay           │               │
│                          │  /api/admin/*            │               │
│                          └──────────────────────────┘               │
│                                        │                             │
│                    ┌───────────────────┼───────────────────┐        │
│                    ▼                   ▼                   ▼        │
│          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│          │ Stripe API   │  │ Razorpay API │  │ MongoDB      │     │
│          │ (Checkout)   │  │ (Checkout)   │  │ (Database)   │     │
│          └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Architecture

### Tenant Isolation Model

Each college is a separate tenant with isolated data and configurations:

```
┌─────────────────────────────────────────────────────────────┐
│                    NOVAA Platform                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  College A            College B            College C        │
│  ┌─────────┐          ┌─────────┐          ┌─────────┐     │
│  │ Students│          │ Students│          │ Students│     │
│  │ Courses │          │ Courses │          │ Courses │     │
│  │ Fees    │          │ Fees    │          │ Fees    │     │
│  │ Stripe  │          │ Stripe  │          │ Stripe  │     │
│  │ Razorpay│          │ Razorpay│          │ Razorpay│     │
│  └─────────┘          └─────────┘          └─────────┘     │
│       │                    │                    │            │
│       └────────────────────┼────────────────────┘            │
│                            ▼                                 │
│              ┌─────────────────────────┐                     │
│              │  Shared MongoDB         │                     │
│              │  (isolated by collegeId)│                     │
│              └─────────────────────────┘                     │
│                            │                                 │
│              ┌─────────────┴─────────────┐                   │
│              ▼                           ▼                   │
│     ┌────────────────┐        ┌────────────────┐            │
│     │ Stripe (per    │        │ Razorpay (per  │            │
│     │  college keys) │        │  college keys) │            │
│     └────────────────┘        └────────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### College-Specific Configuration

Each college manages its own payment gateway credentials:

```javascript
// CollegePaymentConfig Model
{
  collegeId: ObjectId,          // References the college
  gatewayCode: "stripe" | "razorpay",
  credentials: {
    keyId: String,              // Public key (stored as-is)
    keySecret: String,          // Secret key (AES-256-GCM encrypted)
    webhookSecret: String       // Webhook secret (AES-256-GCM encrypted)
  },
  configuration: {
    currency: "INR",
    enabled: true,
    testMode: true
  },
  isActive: true,
  lastVerifiedAt: Date,
  verifiedBy: ObjectId
}
```

---

## Payment Gateway Architecture

### Dual-Gateway Design

**Both Stripe and Razorpay are primary payment gateways**. Students can choose either option at checkout. Neither is a fallback or secondary system.

```
┌──────────────────────────────────────────────────────────────┐
│                  Student Payment Page                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────┐    ┌────────────────────┐            │
│  │  💳 Stripe         │    │  💵 Razorpay       │            │
│  │  Card / UPI /      │ OR │  Card / UPI /      │            │
│  │  Net Banking       │    │  Net Banking       │            │
│  │                    │    │                    │            │
│  │  [Pay Now]         │    │  [Pay Now]         │            │
│  └────────────────────┘    └────────────────────┘            │
│         │                              │                      │
│         ▼                              ▼                      │
│  ┌─────────────────┐          ┌─────────────────┐            │
│  │ POST /api/stripe│          │ POST /api/      │            │
│  │ /create-checkout│          │ razorpay/create │            │
│  │ -session        │          │ -order          │            │
│  └─────────────────┘          └─────────────────┘            │
│         │                              │                      │
│         ▼                              ▼                      │
│  ┌─────────────────┐          ┌─────────────────┐            │
│  │ Stripe Checkout │          │ Razorpay Modal  │            │
│  │ (redirect)      │          │ (embedded)      │            │
│  └─────────────────┘          └─────────────────┘            │
│         │                              │                      │
│         ▼                              ▼                      │
│  ┌─────────────────┐          ┌─────────────────┐            │
│  │ Webhook:        │          │ Webhook:        │            │
│  │ /api/stripe/    │          │ /api/razorpay/  │            │
│  │ webhook         │          │ webhook         │            │
│  └─────────────────┘          └─────────────────┘            │
│         │                              │                      │
│         └──────────┬───────────────────┘                      │
│                    ▼                                           │
│         ┌─────────────────────┐                               │
│         │ Update StudentFee   │                               │
│         │ Mark Installment    │                               │
│         │ Send Receipt Email  │                               │
│         └─────────────────────┘                               │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Stripe Implementation

**Status**: ✅ Production-Ready

**Components**:
- Service: `backend/src/services/collegeStripe.service.js`
- Controller: `backend/src/controllers/stripe.payment.controller.js`
- Webhook: `backend/src/webhooks/stripe.webhook.js`
- Routes: `backend/src/routes/stripe.routes.js`
- Admin Config: `backend/src/controllers/collegeStripeConfig.controller.js`

**Features**:
- Multi-tenant college-specific configuration
- AES-256-GCM encrypted credential storage
- Webhook signature verification
- Duplicate payment protection (2-layer)
- Session expiration handling
- Email notifications (receipts, failures)
- Cached Stripe instances (5-min TTL)

**Webhook Events**:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Razorpay Implementation

**Status**: ✅ Production-Ready

**Components**:
- Service: `backend/src/services/collegeRazorpay.service.js`
- Controller: `backend/src/controllers/razorpay.payment.controller.js`
- Webhook: `backend/src/webhooks/razorpay.webhook.js`
- Routes: `backend/src/routes/razorpay.routes.js`
- Admin Config: `backend/src/controllers/collegeRazorpayConfig.controller.js`

**Features**:
- Multi-tenant college-specific configuration
- AES-256-GCM encrypted credential storage
- Webhook signature verification
- Duplicate payment protection (3-layer)
- Order ID validation
- Email notifications (receipts, failures)
- Cached Razorpay instances (5-min TTL)

**Webhook Events**:
- `payment.captured`
- `order.paid`
- `payment.failed`

### Payment Flow Comparison

| Feature | Stripe | Razorpay |
|---------|--------|----------|
| Checkout Type | Redirect to hosted page | Embedded modal |
| Multi-Tenant | ✅ Per-college config | ✅ Per-college config |
| Encrypted Secrets | ✅ AES-256-GCM | ✅ AES-256-GCM |
| Webhook Verification | ✅ Signature check | ✅ Signature check |
| Duplicate Protection | ✅ 2-layer | ✅ 3-layer |
| Email Notifications | ✅ Receipt + failure | ✅ Receipt + failure |
| Instance Caching | ✅ 5-min TTL | ✅ 5-min TTL |
| Mock Mode | ✅ Development | ✅ Development |
| Admin Config UI | ✅ Complete | ✅ Complete |

### API Endpoints

#### Student Payment Flow

```
Stripe:
POST   /api/stripe/create-checkout-session    - Create checkout session
POST   /api/stripe/confirm-payment            - Confirm payment

Razorpay:
POST   /api/razorpay/create-order             - Create payment order
POST   /api/razorpay/verify-payment           - Verify payment signature
```

#### Admin Configuration

```
Stripe:
GET    /api/admin/stripe/config               - Get Stripe config
POST   /api/admin/stripe/config               - Save Stripe config
POST   /api/admin/stripe/verify               - Verify Stripe credentials
DELETE /api/admin/stripe/config               - Delete Stripe config
GET    /api/admin/stripe/test                 - Test Stripe connection
GET    /api/admin/stripe/colleges             - List colleges with Stripe

Razorpay:
GET    /api/admin/razorpay/config             - Get Razorpay config
POST   /api/admin/razorpay/config             - Save Razorpay config
POST   /api/admin/razorpay/verify             - Verify Razorpay credentials
DELETE /api/admin/razorpay/config             - Delete Razorpay config
GET    /api/admin/razorpay/test               - Test Razorpay connection
GET    /api/admin/razorpay/colleges           - List colleges with Razorpay
```

#### Webhooks

```
POST   /api/stripe/webhook                    - Stripe webhook handler
POST   /api/razorpay/webhook                  - Razorpay webhook handler
```

---

## Database Architecture

### Core Collections

```
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Collections                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Tenant Management:                                          │
│  ├─ colleges                  - College/institution records  │
│  ├─ users                     - All users (students, staff)  │
│  └─ CollegePaymentConfig      - Payment gateway configs      │
│                                                               │
│  Academic Structure:                                          │
│  ├─ departments               - Academic departments         │
│  ├─ courses                   - Course definitions           │
│  ├─ subjects                  - Subject records              │
│  └─ academicYears             - Academic year tracking       │
│                                                               │
│  Student Management:                                         │
│  ├─ students                  - Student profiles             │
│  ├─ studentFee                - Fee records + installments   │
│  ├─ attendance                - Attendance tracking          │
│  └─ promotions                - Student promotions           │
│                                                               │
│  Payments:                                                   │
│  ├─ studentFee.installments   - Payment installments         │
│  └─ CollegePaymentConfig      - Gateway credentials          │
│                                                               │
│  Security & Audit:                                           │
│  ├─ securityAudits            - Security events              │
│  └─ auditLogs                 - Admin action logs            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Indexing Strategy

```javascript
// CollegePaymentConfig indexes
{ collegeId: 1, gatewayCode: 1, isActive: 1 }  // Multi-tenant lookup

// Student indexes
{ user_id: 1 }                                  // User-to-student mapping
{ collegeId: 1 }                                // Tenant isolation

// StudentFee indexes
{ student_id: 1 }                               // Student fee lookup
{ "installments.status": 1 }                    // Payment status queries
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Rate Limiting                                            │
│     ├─ Global: 100 req/15min per IP                         │
│     ├─ Auth: 20 req/15min                                   │
│     ├─ Payment: 50 req/15min                                │
│     └─ Webhook: 200 req/15min                               │
│                                                               │
│  2. CORS Configuration                                       │
│     ├─ Allowed origins from env var                          │
│     └─ Credentials: true                                     │
│                                                               │
│  3. JWT Authentication                                       │
│     ├─ Access tokens (short-lived)                           │
│     ├─ Refresh tokens (httpOnly cookies)                     │
│     └─ Role-based access control                             │
│                                                               │
│  4. Data Encryption                                          │
│     ├─ AES-256-GCM for payment secrets                       │
│     ├─ PBKDF2 key derivation (100k iterations)               │
│     └─ Master key from environment variable                  │
│                                                               │
│  5. Webhook Security                                         │
│     ├─ Stripe: signature verification                        │
│     ├─ Razorpay: HMAC signature verification                 │
│     └─ College-specific webhook secrets                      │
│                                                               │
│  6. Input Validation                                         │
│     ├─ express-validator for request bodies                  │
│     └─ Schema validation for MongoDB                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Encryption Implementation

```javascript
// Encryption utilities: backend/src/utils/encryption.util.js

// Stripe encryption
encryptStripeKey(secretKey)     // Encrypt Stripe secret
decryptStripeKey(encryptedKey)  // Decrypt Stripe secret

// Razorpay encryption
encryptRazorpayKey(razorpayKeySecret)  // Encrypt Razorpay secret
decryptRazorpayKey(encryptedKey)       // Decrypt Razorpay secret

// Generic encryption
encrypt(plainText)              // Generic encryption
decrypt(encryptedText)          // Generic decryption
```

---

## API Architecture

### Route Registration Order

```javascript
// backend/app.js

// 1. Webhooks (before JSON parsing - need raw body)
app.use("/api/stripe/webhook", stripeWebhook);
app.use("/api/razorpay/webhook", razorpayWebhook);

// 2. JSON parser (excludes webhook routes)
app.use(express.json());

// 3. Security middleware
app.use(securityMiddleware);

// 4. Rate limiting
app.use("/api/stripe", paymentLimiter);
app.use("/api/admin/payments", paymentLimiter);

// 5. Auth & core routes
app.use("/api/auth", authRoutes);
app.use("/api/college", collegeRoutes);

// 6. Payment routes
app.use("/api/student/payments", studentPaymentRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);

// 7. Stripe routes
app.use("/api/stripe", stripeRoutes);
app.use("/api/admin/stripe", stripeConfigRoutes);

// 8. Razorpay routes
app.use("/api/razorpay", razorpayRoutes);
app.use("/api/admin/razorpay", razorpayConfigRoutes);
```

### Middleware Stack

```
Request
  │
  ▼
┌─────────────────────┐
│  CORS               │ ← Cross-origin policy
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Cookie Parser      │ ← Parse cookies
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Morgan Logger      │ ← HTTP request logging
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Rate Limiter       │ ← Prevent abuse
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Security Headers   │ ← Helmet, XSS protection
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  JSON Parser        │ ← Parse JSON bodies
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  JWT Auth           │ ← Verify token (protected routes)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Role Check         │ ← Verify permissions
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Route Handler      │ ← Business logic
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Error Handler      │ ← Global error handling
└─────────────────────┘
```

---

## Environment Variables

### Required Variables

```env
# Server Configuration
NODE_ENV=development|production
PORT=5000
MONGO_URI=mongodb://localhost:27017/novaa

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=90d

# Encryption (REQUIRED for payment gateways)
ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Email (for payment receipts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
```

### Optional Global Fallback Keys

```env
# Stripe (Global fallback - optional, not used in multi-tenant)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Razorpay (Global fallback - optional, not used in multi-tenant)
RAZORPAY_KEY_ID=rzp_test_your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

## File Structure

```
smart-college-mern/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── stripe.payment.controller.js          ✅
│   │   │   ├── razorpay.payment.controller.js        ✅
│   │   │   ├── collegeStripeConfig.controller.js     ✅
│   │   │   └── collegeRazorpayConfig.controller.js   ✅
│   │   ├── services/
│   │   │   ├── collegeStripe.service.js              ✅
│   │   │   ├── collegeRazorpay.service.js            ✅
│   │   │   └── email.service.js                      ✅
│   │   ├── webhooks/
│   │   │   ├── stripe.webhook.js                     ✅
│   │   │   └── razorpay.webhook.js                   ✅
│   │   ├── routes/
│   │   │   ├── stripe.routes.js                      ✅
│   │   │   ├── razorpay.routes.js                    ✅
│   │   │   ├── collegeStripeConfig.routes.js         ✅
│   │   │   └── collegeRazorpayConfig.routes.js       ✅
│   │   ├── models/
│   │   │   └── collegePaymentConfig.model.js         ✅
│   │   └── utils/
│   │       └── encryption.util.js                    ✅
│   └── app.js
│
├── frontend/
│   └── src/
│       └── pages/
│           └── dashboard/
│               ├── College-Admin/
│               │   └── SystemSetting/
│               │       ├── StripeConfiguration.jsx   ✅
│               │       └── RazorpayConfiguration.jsx ✅
│               └── Student/
│                   ├── MakePayments.jsx              ✅
│                   ├── PaymentSuccess.jsx            ✅
│                   └── PaymentCancel.jsx             ✅
│
└── NOVAA/
    └── docs/
        ├── core/
        │   └── ARCHITECTURE.md (this file)
        └── modules/
            └── payments.md
```

---

## Related Documentation

- [Payment Gateway Module](../modules/payments.md) - Detailed payment integration guide
- [Multi-Tenant Stripe Guide](../../MULTI_TENANT_STRIPE_GUIDE.md) - Stripe setup
- [Encryption Troubleshooting](../../ENCRYPTION_TROUBLESHOOTING.md) - Encryption issues

---

**Maintained By**: NOVAA Development Team  
**Last Review**: April 8, 2026

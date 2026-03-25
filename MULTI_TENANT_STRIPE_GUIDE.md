# Multi-Tenant Stripe Integration Guide

## Overview

NOVAA now supports **college-specific Stripe configurations** in a multi-tenant SaaS architecture. Each college can configure their own Stripe account, and payments go directly to their Stripe account.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NOVAA SaaS Platform                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  College A        College B        College C            │
│  Stripe: sk_A     Stripe: sk_B     Stripe: sk_C         │
│  (Encrypted)      (Encrypted)      (Encrypted)          │
│       │                │                │                │
│       └────────────────┼────────────────┘                │
│                        ▼                                 │
│         ┌──────────────────────────┐                     │
│         │  CollegePaymentConfig    │                     │
│         │  - collegeId (indexed)   │                     │
│         │  - gatewayCode: "stripe" │                     │
│         │  - credentials (encrypted)│                    │
│         └──────────────────────────┘                     │
│                        │                                 │
│                        ▼                                 │
│         ┌──────────────────────────┐                     │
│         │  Encryption Service      │                     │
│         │  - AES-256-GCM           │                     │
│         │  - Key from env          │                     │
│         └──────────────────────────┘                     │
│                        │                                 │
│                        ▼                                 │
│         ┌──────────────────────────┐                     │
│         │  Dynamic Stripe Service  │                     │
│         │  - getStripeInstance()   │                     │
│         └──────────────────────────┘                     │
│                        │                                 │
│         ┌──────────────┴──────────────┐                  │
│         ▼                             ▼                  │
│  Payment Controller          Webhook Handler            │
│  - Per-college sessions      - Multi-tenant routing     │
│  - Dynamic initialization    - Signature verification   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Security Features

### 1. **Encryption at Rest**
- All Stripe secret keys are encrypted using **AES-256-GCM** before storage
- Encryption key stored in `ENCRYPTION_MASTER_KEY` environment variable
- Keys are decrypted only in memory when needed

### 2. **Multi-Tenant Isolation**
- Each college has separate Stripe credentials
- College admins can only access their own configuration
- Students can only make payments through their college's Stripe account

### 3. **Secure Transmission**
- All API calls use HTTPS with JWT authentication
- Webhook signatures are verified using college-specific webhook secrets
- Raw body parsing prevents signature verification issues

### 4. **Access Control**
- College Admins: Can configure their own Stripe account
- Students: Can only make payments (cannot view config)
- Super Admins: Can view all colleges' configurations

## Setup Instructions

### Step 1: Backend Configuration

1. **Add Encryption Master Key** to `.env`:

```env
# CRITICAL: Generate a strong random key
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars
```

2. **Install Dependencies** (if not already installed):

```bash
cd backend
npm install stripe crypto
```

### Step 2: College Admin Configuration

1. **Login as College Admin**

2. **Navigate to System Settings → Fee Settings → Stripe**

3. **Get Stripe Keys**:
   - Login to [Stripe Dashboard](https://dashboard.stripe.com)
   - Go to Developers → API Keys
   - Copy your keys

4. **Configure Stripe**:
   - Enable **Test Mode** for testing
   - Enter **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - Enter **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - (Optional) Enter **Webhook Secret** for enhanced security

5. **Save Configuration**:
   - Click "Save Configuration"
   - Click "Verify" to test credentials
   - Click "Test Connection" to verify connectivity

### Step 3: Webhook Configuration

1. **Get Webhook URL**:
   ```
   https://your-domain.com/api/stripe/webhook
   ```

2. **Configure in Stripe Dashboard**:
   - Go to Developers → Webhooks
   - Click "Add Endpoint"
   - Enter your webhook URL
   - Select events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy the webhook secret (starts with `whsec_`)

3. **Add Webhook Secret to Configuration**:
   - Go back to Stripe Configuration page
   - Enter the webhook secret
   - Save configuration

## API Endpoints

### College Admin Endpoints

```
GET    /api/admin/stripe/config      - Get current college's Stripe config
POST   /api/admin/stripe/config      - Save/Update Stripe configuration
POST   /api/admin/stripe/verify      - Verify Stripe credentials
DELETE /api/admin/stripe/config      - Delete Stripe configuration
GET    /api/admin/stripe/test        - Test Stripe connection
```

### Student Payment Endpoints

```
POST   /api/stripe/create-checkout-session  - Create Stripe checkout
POST   /api/stripe/confirm-payment          - Confirm payment after redirect
```

### Webhook Endpoint

```
POST   /api/stripe/webhook           - Handle Stripe webhooks (multi-tenant)
```

## Payment Flow

### Student Payment Flow

```
1. Student selects installment to pay
        ↓
2. Frontend calls /stripe/create-checkout-session
        ↓
3. Backend fetches college's Stripe config
        ↓
4. Backend decrypts secret key
        ↓
5. Backend creates Stripe instance for that college
        ↓
6. Backend creates checkout session
        ↓
7. Student redirected to Stripe checkout
        ↓
8. Student completes payment
        ↓
9. Stripe redirects to /student/payment-success
        ↓
10. Frontend calls /stripe/confirm-payment
        ↓
11. Backend updates payment status
        ↓
12. Receipt email sent to student
```

### Webhook Flow (Background)

```
1. Student completes payment on Stripe
        ↓
2. Stripe sends webhook to /api/stripe/webhook
        ↓
3. Backend extracts college ID from session metadata
        ↓
4. Backend fetches college's Stripe config
        ↓
5. Backend verifies webhook signature
        ↓
6. Backend updates payment status
        ↓
7. Receipt email sent to student
```

## Error Handling

### Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `STRIPE_NOT_CONFIGURED` | College hasn't configured Stripe | "Payment gateway is not configured for your college. Please contact the college administrator." |
| `PAYMENT_CONFIG_ERROR` | Encryption/decryption failed | "Payment configuration error. Please contact support." |
| `PAYMENT_INIT_FAILED` | Stripe initialization failed | "Failed to initialize payment gateway. Please try again later." |
| `INSTALLMENT_NOT_FOUND` | Invalid or already paid installment | "This installment has already been paid or is invalid." |

### Frontend Error Handling

The `MakePayments.jsx` component handles specific error codes and displays appropriate user-friendly messages.

## Database Schema

### CollegePaymentConfig Model

```javascript
{
  collegeId: ObjectId,          // Reference to College
  gatewayCode: "stripe",        // "stripe" or "razorpay"
  credentials: {
    keyId: String,              // Publishable key (not encrypted)
    keySecret: String,          // Secret key (encrypted)
    webhookSecret: String       // Webhook secret (encrypted, optional)
  },
  configuration: {
    currency: "INR",
    enabled: true,
    testMode: true              // true = test keys, false = live keys
  },
  isActive: true,
  lastVerifiedAt: Date,
  verifiedBy: ObjectId
}
```

## Testing

### Test Mode

1. Enable **Test Mode** in Stripe configuration
2. Use test keys (pk_test_*, sk_test_*)
3. Use test card numbers:
   - `4242 4242 4242 4242` (Success)
   - `5555 5555 5555 4444` (Mastercard)
   - Any future date, any CVC

### Production Mode

1. Disable **Test Mode** in Stripe configuration
2. Use live keys (pk_live_*, sk_live_*)
3. Verify webhook signature is configured
4. Test with real payment (small amount recommended)

## Troubleshooting

### "Stripe is not configured for this college"

**Cause**: College admin hasn't configured Stripe credentials.

**Solution**: 
1. Login as college admin
2. Navigate to System Settings → Fee Settings → Stripe
3. Configure Stripe credentials
4. Save and verify

### "Webhook signature verification failed"

**Cause**: Webhook secret is incorrect or not configured.

**Solution**:
1. Get webhook secret from Stripe Dashboard
2. Update configuration with correct webhook secret
3. Save and verify

### "Decryption failed"

**Cause**: Encryption master key changed or missing.

**Solution**:
1. Ensure `ENCRYPTION_MASTER_KEY` is set in `.env`
2. If key was changed, re-enter all Stripe credentials
3. Contact support if issue persists

## Migration from Single-Tenant

If you're migrating from the old single-tenant Stripe setup:

1. **Keep global keys** in `.env` as fallback
2. **Notify colleges** to configure their own Stripe accounts
3. **Monitor webhooks** to ensure proper routing
4. **Test thoroughly** in staging environment first

## Best Practices

### Security

- ✅ Use strong encryption master key (32+ characters)
- ✅ Enable webhook signature verification
- ✅ Use HTTPS in production
- ✅ Regularly rotate encryption keys
- ✅ Monitor webhook failures

### Operations

- ✅ Test in test mode before going live
- ✅ Verify credentials after saving
- ✅ Keep webhook URL updated in Stripe
- ✅ Monitor payment failures
- ✅ Set up alerts for webhook errors

### Development

- ✅ Use test keys in development
- ✅ Never commit `.env` file
- ✅ Use environment-specific configurations
- ✅ Test error scenarios

## Support

For issues or questions:
- Check logs for detailed error messages
- Verify Stripe dashboard for payment status
- Contact NOVAA support team

---

**Version**: 1.0.0  
**Last Updated**: March 2026

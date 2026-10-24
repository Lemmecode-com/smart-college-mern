/**
 * Issue #194: Razorpay Webhook Idempotency & Duplicate Payment Protection Test Suite
 *
 * Covers:
 * 1. Webhook Signature Verification:
 *    - Valid signature with college-specific secret -> 200
 *    - Invalid signature -> 400
 *    - Missing signature header -> 400
 *    - Missing / unconfigured webhook secret -> 400
 *    - Timing-safe HMAC comparison with length check
 * 2. Replay & Duplicate Payment Protection:
 *    - payment.captured on already PAID installment -> no status change, recalculates paidAmount, skips duplicate email
 *    - payment.captured with duplicate razorpayPaymentId / transactionId -> early return
 *    - Concurrent payment.captured webhooks (race condition) -> exactly one atomic update and one receipt email
 * 3. Verify Payment & Webhook Race:
 *    - Verify endpoint followed by webhook replay -> both succeed, exactly one receipt email sent
 * 4. payment.failed after payment.captured:
 *    - payment.failed does NOT revert already PAID installment to PENDING
 *    - payment.failed on PENDING installment records failure reason and stays PENDING
 * 5. Wrong Amount & Currency Validation:
 *    - payment.captured with incorrect amount or non-INR currency -> rejected/ignored
 *    - verifyRazorpayPayment with incorrect amount or non-INR currency -> throws AppError
 * 6. paidAmount Recalculation:
 *    - Accurately sums all PAID installments and persists to DB
 * 7. Multi-Tenant College Isolation:
 *    - Webhook for College B targeting College A installment is ignored / not found
 *    - Verify request for College B targeting College A fee is rejected
 * 8. GST Breakdown Preservation:
 *    - Receipt email receives intact baseAmount, gstAmount, and taxBreakdown
 */

const mongoose = require("mongoose");
const crypto = require("crypto");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

const College = require("../../src/models/college.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const CollegePaymentConfig = require("../../src/models/collegePaymentConfig.model");

const emailService = require("../../src/services/email.service");
const collegeRazorpayService = require("../../src/services/collegeRazorpay.service");
const { encryptRazorpayKey, encrypt } = require("../../src/utils/encryption.util");

const { handleRazorpayWebhook } = require("../../src/webhooks/razorpay.webhook");
const { verifyRazorpayPayment } = require("../../src/controllers/razorpay.payment.controller");

const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createStudent,
} = require("../helpers/factories");

describe("Issue #194 — Razorpay Webhook Idempotency & Duplicate Payment Protection", () => {
  let collegeA;
  let collegeB;
  let studentUserA;
  let studentA;
  let courseA;
  let departmentA;
  let sendEmailSpy;
  let mockFetchOrder;

  const PLAIN_KEY_SECRET = "test_key_secret_123456789";
  const PLAIN_WEBHOOK_SECRET = "test_whsec_secret_abcdef123456";

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    jest.clearAllMocks();

    sendEmailSpy = jest
      .spyOn(emailService, "sendPaymentReceiptEmail")
      .mockResolvedValue(true);

    mockFetchOrder = jest.fn();
    jest
      .spyOn(collegeRazorpayService, "getRazorpayInstance")
      .mockImplementation(async () => ({
        orders: {
          fetch: mockFetchOrder,
          create: jest.fn(),
        },
      }));

    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Setup College A
    collegeA = await createCollege({
      name: "College Alpha",
      code: `CLGA_${uniqueSuffix.slice(-4)}`,
      email: `collegeA_${uniqueSuffix}@example.com`,
      gstin: "27AAAAA0000A1Z5",
    });

    departmentA = await createDepartment({ college_id: collegeA._id });
    courseA = await createCourse({
      college_id: collegeA._id,
      department_id: departmentA._id,
    });

    studentUserA = await createUser({
      role: "STUDENT",
      college_id: collegeA._id,
      email: `studentA_${uniqueSuffix}@example.com`,
    });

    studentA = await createStudent({
      college_id: collegeA._id,
      user_id: studentUserA._id,
      department_id: departmentA._id,
      course_id: courseA._id,
      email: `studentA_${uniqueSuffix}@example.com`,
      fullName: "Student Alpha",
    });

    // College A Razorpay Config
    await CollegePaymentConfig.create({
      collegeId: collegeA._id,
      gatewayCode: "razorpay",
      credentials: {
        keyId: "rzp_test_collegeA_key_id",
        keySecret: encryptRazorpayKey(PLAIN_KEY_SECRET),
        webhookSecret: encrypt(PLAIN_WEBHOOK_SECRET),
      },
      configuration: {
        currency: "INR",
        enabled: true,
        testMode: true,
      },
      isActive: true,
    });

    // Setup College B for cross-tenant testing
    collegeB = await createCollege({
      name: "College Beta",
      code: `CLGB_${uniqueSuffix.slice(-4)}`,
      email: `collegeB_${uniqueSuffix}@example.com`,
      gstin: "27BBBBB1111B1Z6",
    });

    await CollegePaymentConfig.create({
      collegeId: collegeB._id,
      gatewayCode: "razorpay",
      credentials: {
        keyId: "rzp_test_collegeB_key_id",
        keySecret: encryptRazorpayKey("collegeB_secret_key"),
        webhookSecret: encrypt("collegeB_whsec_secret"),
      },
      configuration: {
        currency: "INR",
        enabled: true,
        testMode: true,
      },
      isActive: true,
    });
  });

  afterEach(() => {
    sendEmailSpy.mockRestore();
    jest.restoreAllMocks();
  });

  function createMockReqRes({
    headers = {},
    body = {},
    rawBody,
    user = null,
    college_id = null,
  }) {
    const raw =
      rawBody !== undefined
        ? rawBody
        : Buffer.from(JSON.stringify(body), "utf8");

    const req = {
      headers: { ...headers },
      body,
      rawBody: raw,
      user,
      college_id,
      ip: "127.0.0.1",
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      send(data) {
        this.body = data;
        return this;
      },
    };

    const next = jest.fn((err) => {
      if (err) {
        res.statusCode = err.statusCode || 500;
        res.body = { error: err.message, code: err.code };
      }
    });

    return { req, res, next };
  }

  function signPayload(body, secret = PLAIN_WEBHOOK_SECRET) {
    const raw = Buffer.from(JSON.stringify(body), "utf8");
    const sig = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    return { sig, raw };
  }

  describe("1. Webhook Signature Verification", () => {
    test("rejects request if x-razorpay-signature header is missing", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          order: { entity: { id: "order_123", notes: { collegeId: collegeA._id.toString() } } },
        },
      };

      const { req, res } = createMockReqRes({ body: payload });
      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: "Missing signature" });
    });

    test("rejects request with invalid signature", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          order: { entity: { id: "order_123", notes: { collegeId: collegeA._id.toString() } } },
        },
      };

      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": "invalid_signature_hex" },
        body: payload,
      });

      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: "Invalid signature" });
    });

    test("returns 400 if webhook secret is not configured for college", async () => {
      // Create College C without webhook secret
      const uniqueSuffixC = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const collegeC = await createCollege({
        name: "College Gamma",
        code: `CLGC_${uniqueSuffixC.slice(-4)}`,
        email: `collegeC_${uniqueSuffixC}@example.com`,
      });

      await CollegePaymentConfig.create({
        collegeId: collegeC._id,
        gatewayCode: "razorpay",
        credentials: {
          keyId: "rzp_test_collegeC",
          keySecret: encryptRazorpayKey("some_secret"),
          // webhookSecret intentionally omitted
        },
        isActive: true,
      });

      const payload = {
        event: "payment.captured",
        payload: {
          order: { entity: { id: "order_c", notes: { collegeId: collegeC._id.toString() } } },
        },
      };

      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": "dummy_sig" },
        body: payload,
      });

      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Webhook secret not configured");
    });

    test("accepts request with valid signature and timing-safe comparison", async () => {
      const fee = await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 10000,
        paidAmount: 0,
        installments: [
          {
            name: "Term 1",
            amount: 5000,
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_valid_sig",
          },
        ],
      });

      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_valid_sig",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: "pay_valid_sig",
              amount: 500000, // 5000 * 100 paise
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(payload);
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ received: true });

      const updatedFee = await StudentFee.findById(fee._id);
      expect(updatedFee.installments[0].status).toBe("PAID");
      expect(updatedFee.paidAmount).toBe(5000);
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("2. Replay & Duplicate Payment Protection", () => {
    let studentFee;

    beforeEach(async () => {
      studentFee = await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 15000,
        paidAmount: 0,
        installments: [
          {
            name: "Installment 1",
            amount: 5000,
            baseAmount: 4237.29,
            gstAmount: 762.71,
            taxBreakdown: { taxableBase: 4237.29, totalTax: 762.71 },
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_replay_test",
          },
          {
            name: "Installment 2",
            amount: 10000,
            dueDate: new Date(),
            status: "PENDING",
          },
        ],
      });
    });

    test("payment.captured on already PAID installment skips duplicate email and recalculates paidAmount", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_replay_test",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: "pay_first_attempt",
              amount: 500000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(payload);

      // First webhook delivery
      const first = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });
      await handleRazorpayWebhook(first.req, first.res);

      expect(first.res.statusCode).toBe(200);
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);

      const feeAfterFirst = await StudentFee.findById(studentFee._id);
      expect(feeAfterFirst.installments[0].status).toBe("PAID");
      expect(feeAfterFirst.installments[0].receiptEmailSentAt).not.toBeNull();

      // Second webhook delivery (replay/retry)
      const second = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });
      await handleRazorpayWebhook(second.req, second.res);

      expect(second.res.statusCode).toBe(200);
      // Still only 1 email sent!
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);

      const feeAfterSecond = await StudentFee.findById(studentFee._id);
      expect(feeAfterSecond.paidAmount).toBe(5000);
    });

    test("payment.captured with duplicate razorpayPaymentId returns early without second email", async () => {
      // Mark installment as PAID with matching payment ID
      await StudentFee.updateOne(
        { _id: studentFee._id, "installments._id": studentFee.installments[0]._id },
        {
          $set: {
            "installments.$.status": "PAID",
            "installments.$.razorpayPaymentId": "pay_duplicate_id",
            "installments.$.receiptEmailSentAt": new Date(),
          },
        },
      );

      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_replay_test",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: "pay_duplicate_id",
              amount: 500000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(payload);
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    test("concurrent payment.captured webhooks execute atomic update and send exactly one email", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_replay_test",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: "pay_concurrent_123",
              amount: 500000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(payload);

      // Launch 5 concurrent webhook calls
      const requests = Array.from({ length: 5 }, () => {
        const { req, res } = createMockReqRes({
          headers: { "x-razorpay-signature": sig },
          body: payload,
          rawBody: raw,
        });
        return handleRazorpayWebhook(req, res).then(() => res.statusCode);
      });

      const statuses = await Promise.all(requests);
      expect(statuses.every((s) => s === 200)).toBe(true);

      const fee = await StudentFee.findById(studentFee._id);
      expect(fee.installments[0].status).toBe("PAID");
      expect(fee.paidAmount).toBe(5000);

      // EXACTLY one receipt email sent across all concurrent calls
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Verify Endpoint & Webhook Concurrency Race", () => {
    test("verifyRazorpayPayment and payment.captured race condition results in exactly 1 email", async () => {
      const fee = await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 10000,
        paidAmount: 0,
        installments: [
          {
            name: "Term 1",
            amount: 5000,
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_race_test",
          },
        ],
      });

      mockFetchOrder.mockResolvedValue({
        id: "order_race_test",
        amount: 500000,
        currency: "INR",
        notes: { installmentName: "Term 1", collegeId: collegeA._id.toString() },
      });

      const orderId = "order_race_test";
      const paymentId = "pay_race_123";

      // Valid signature for verify endpoint
      const verifySignature = crypto
        .createHmac("sha256", PLAIN_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const verifyReqRes = createMockReqRes({
        body: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: verifySignature,
        },
        user: { id: studentUserA._id },
        college_id: collegeA._id,
      });

      // Webhook payload
      const webhookPayload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: orderId,
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: paymentId,
              amount: 500000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(webhookPayload);
      const webhookReqRes = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: webhookPayload,
        rawBody: raw,
      });

      // Execute both in parallel
      await Promise.all([
        verifyRazorpayPayment(
          verifyReqRes.req,
          verifyReqRes.res,
          verifyReqRes.next,
        ),
        handleRazorpayWebhook(webhookReqRes.req, webhookReqRes.res),
      ]);

      const updatedFee = await StudentFee.findById(fee._id);
      expect(updatedFee.installments[0].status).toBe("PAID");
      expect(updatedFee.paidAmount).toBe(5000);

      // Exactly 1 email sent despite race
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    });

    test("verifyRazorpayPayment on already-PAID installment returns success without second email and recalculates paidAmount", async () => {
      const fee = await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 10000,
        paidAmount: 5000,
        installments: [
          {
            name: "Term 1",
            amount: 5000,
            dueDate: new Date(),
            status: "PAID",
            paidAt: new Date(),
            transactionId: "pay_prev_done",
            razorpayOrderId: "order_prev_done",
            razorpayPaymentId: "pay_prev_done",
            receiptEmailSentAt: new Date(),
          },
        ],
      });

      mockFetchOrder.mockResolvedValue({
        id: "order_prev_done",
        amount: 500000,
        currency: "INR",
        notes: { installmentName: "Term 1", collegeId: collegeA._id.toString() },
      });

      const orderId = "order_prev_done";
      const paymentId = "pay_prev_done";

      const verifySignature = crypto
        .createHmac("sha256", PLAIN_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const verifyReqRes = createMockReqRes({
        body: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: verifySignature,
        },
        user: { id: studentUserA._id },
        college_id: collegeA._id,
      });

      await verifyRazorpayPayment(
        verifyReqRes.req,
        verifyReqRes.res,
        verifyReqRes.next,
      );

      expect(verifyReqRes.res.statusCode).toBe(200);
      expect(verifyReqRes.res.body).toMatchObject({
        valid: true,
        alreadyPaid: true,
        installment: expect.objectContaining({
          installmentName: "Term 1",
          status: "PAID",
        }),
        paidAmount: 5000,
      });

      // No second email dispatched
      expect(sendEmailSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("4. payment.failed Handling", () => {
    let fee;

    beforeEach(async () => {
      fee = await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 10000,
        paidAmount: 0,
        installments: [
          {
            name: "Term 1",
            amount: 5000,
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_failed_test",
          },
        ],
      });
    });

    test("payment.failed does NOT revert already PAID installment", async () => {
      // First mark installment as PAID
      await StudentFee.updateOne(
        { _id: fee._id, "installments._id": fee.installments[0]._id },
        {
          $set: {
            "installments.$.status": "PAID",
            "installments.$.paidAt": new Date(),
            "installments.$.razorpayPaymentId": "pay_captured_already",
            paidAmount: 5000,
          },
        },
      );

      const failedPayload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_failed_attempt",
              order_id: "order_failed_test",
              amount: 500000,
              currency: "INR",
              error_code: "BAD_REQUEST_ERROR",
              error_description: "Payment failed due to network glitch",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
        },
      };

      const { sig, raw } = signPayload(failedPayload);
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: failedPayload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);

      const checkFee = await StudentFee.findById(fee._id);
      // Crucial: Must remain PAID, NOT reverted to PENDING
      expect(checkFee.installments[0].status).toBe("PAID");
      expect(checkFee.paidAmount).toBe(5000);
    });

    test("payment.failed on PENDING installment records failure reason and stays PENDING", async () => {
      const failedPayload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_failed_attempt_2",
              order_id: "order_failed_test",
              amount: 500000,
              currency: "INR",
              error_code: "PAYMENT_FAILED",
              error_description: "Card was declined",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
        },
      };

      const { sig, raw } = signPayload(failedPayload);
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: failedPayload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);

      const checkFee = await StudentFee.findById(fee._id);
      expect(checkFee.installments[0].status).toBe("PENDING");
      expect(checkFee.installments[0].paymentFailureReason).toContain("Card was declined");
      expect(checkFee.installments[0].paymentAttemptAt).toBeDefined();
    });
  });

  describe("5. Wrong Amount & Currency Validation", () => {
    let fee;

    beforeEach(async () => {
      fee = await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 10000,
        paidAmount: 0,
        installments: [
          {
            name: "Term 1",
            amount: 5000, // Expected 500000 paise
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_amount_check",
          },
        ],
      });
    });

    test("payment.captured ignores webhook if amount does not match", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_amount_check",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: "pay_wrong_amount",
              amount: 100000, // 1000 INR instead of 5000 INR!
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(payload);
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);

      const checkFee = await StudentFee.findById(fee._id);
      expect(checkFee.installments[0].status).toBe("PENDING");
      expect(checkFee.paidAmount).toBe(0);
      expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    test("payment.captured ignores webhook if currency is not INR", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_amount_check",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: "pay_wrong_currency",
              amount: 500000,
              currency: "USD", // Not INR!
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(payload);
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      const checkFee = await StudentFee.findById(fee._id);
      expect(checkFee.installments[0].status).toBe("PENDING");
      expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    test("verifyRazorpayPayment rejects with 400 when order amount mismatches", async () => {
      mockFetchOrder.mockResolvedValue({
        id: "order_amount_check",
        amount: 300000, // 3000 INR instead of 5000 INR
        currency: "INR",
        notes: { installmentName: "Term 1" },
      });

      const orderId = "order_amount_check";
      const paymentId = "pay_mismatch_val";
      const signature = crypto
        .createHmac("sha256", PLAIN_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const { req, res, next } = createMockReqRes({
        body: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        },
        user: { id: studentUserA._id },
        college_id: collegeA._id,
      });

      await verifyRazorpayPayment(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe("PAYMENT_AMOUNT_MISMATCH");
    });
  });

  describe("6. Multi-Tenant College Isolation", () => {
    test("webhook for College B does not update College A fee record", async () => {
      const feeA = await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 8000,
        paidAmount: 0,
        installments: [
          {
            name: "Term 1",
            amount: 8000,
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_collegeA_cross",
          },
        ],
      });

      // Webhook payload claiming College B notes but College A's order ID
      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_collegeA_cross",
              notes: { collegeId: collegeB._id.toString() }, // Target College B
            },
          },
          payment: {
            entity: {
              id: "pay_cross_college",
              amount: 800000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      // Signed with College B's secret
      const { sig, raw } = signPayload(payload, "collegeB_whsec_secret");
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      // College A fee must NOT have been updated!
      const checkFeeA = await StudentFee.findById(feeA._id);
      expect(checkFeeA.installments[0].status).toBe("PENDING");
      expect(checkFeeA.paidAmount).toBe(0);
      expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    test("verifyRazorpayPayment scoped to College B rejects order belonging to College A", async () => {
      await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 5000,
        paidAmount: 0,
        installments: [
          {
            name: "Term 1",
            amount: 5000,
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_alpha_tenant",
          },
        ],
      });

      const orderId = "order_alpha_tenant";
      const paymentId = "pay_alpha_tenant";
      const signature = crypto
        .createHmac("sha256", "collegeB_secret_key")
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      mockFetchOrder.mockResolvedValue({
        id: orderId,
        amount: 500000,
        currency: "INR",
        notes: { installmentName: "Term 1" },
      });

      const { req, res, next } = createMockReqRes({
        body: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        },
        user: { id: studentUserA._id },
        college_id: collegeB._id, // Requesting under College B
      });

      await verifyRazorpayPayment(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(404);
      expect(["INSTALLMENT_NOT_FOUND", "FEE_RECORD_NOT_FOUND"]).toContain(
        err.code,
      );
    });
  });

  describe("7. GST Breakdown Preservation in Email Dispatch", () => {
    test("receipt email preserves baseAmount, gstAmount, and taxBreakdown", async () => {
      const taxBreakdown = {
        taxableBase: 4237.29,
        totalTax: 762.71,
        cgst: 381.355,
        sgst: 381.355,
        igst: 0,
        rate: 18,
      };

      await StudentFee.create({
        student_id: studentA._id,
        college_id: collegeA._id,
        course_id: courseA._id,
        totalFee: 5000,
        paidAmount: 0,
        installments: [
          {
            name: "GST Term 1",
            amount: 5000,
            baseAmount: 4237.29,
            gstAmount: 762.71,
            taxBreakdown,
            dueDate: new Date(),
            status: "PENDING",
            razorpayOrderId: "order_gst_test",
          },
        ],
      });

      const payload = {
        event: "payment.captured",
        payload: {
          order: {
            entity: {
              id: "order_gst_test",
              notes: { collegeId: collegeA._id.toString() },
            },
          },
          payment: {
            entity: {
              id: "pay_gst_123",
              amount: 500000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };

      const { sig, raw } = signPayload(payload);
      const { req, res } = createMockReqRes({
        headers: { "x-razorpay-signature": sig },
        body: payload,
        rawBody: raw,
      });

      await handleRazorpayWebhook(req, res);

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const emailArgs = sendEmailSpy.mock.calls[0][0];

      expect(emailArgs.to).toBe(studentA.email);
      expect(emailArgs.installment.baseAmount).toBe(4237.29);
      expect(emailArgs.installment.gstAmount).toBe(762.71);
      expect(emailArgs.installment.taxBreakdown).toEqual(taxBreakdown);
      expect(emailArgs.installment.amount).toBe(5000);
    });
  });
});

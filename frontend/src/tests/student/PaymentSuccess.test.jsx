import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";
import PaymentSuccess from "../../pages/dashboard/Student/PaymentSuccess";

vi.mock("../../components/Loading", () => ({
  default: ({ text }) => <div data-testid="loading">{text || "Loading..."}</div>,
}));

describe("PaymentSuccess Component — Razorpay Verification & Error Handling", () => {
  let container;
  let root;
  let mock;

  const mockUser = {
    _id: "user-student-1",
    name: "John Doe",
    role: "STUDENT",
    collegeName: "Novaa Institute of Technology",
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mock = new MockAdapter(api);

    // Default mock for profile fetch
    mock.onGet("/students/my-profile").reply(200, {
      student: {
        _id: "student-1",
        fullName: "John Doe",
        enrollmentNumber: "ENR12345",
        currentSemester: 4,
        category: "OPEN",
      },
      course: { name: "B.Tech Computer Science" },
      college: { name: "Novaa Institute of Technology" },
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders with razorpay query params without throwing, calls verify once, and shows success", async () => {
    const paymentId = "pay_TqsehDt1LI4cMk";
    const orderId = "order_alpha_123";

    mock
      .onGet(`/student/payments/status?orderId=${orderId}&gateway=razorpay`)
      .reply(200, {
        installmentId: "inst_12345",
        installmentName: "Semester 4 Tuition Fee",
        amount: 25000,
        paidAt: "2026-10-22T08:00:00.000Z",
        transactionId: paymentId,
        paymentGateway: "RAZORPAY",
        status: "PAID",
        totalFee: 50000,
        paidAmount: 25000,
        remainingAmount: 25000,
      });

    mock
      .onGet("/student/payments/receipt/inst_12345")
      .reply(200, {
        receiptNumber: "REC-2026-9999",
        paidAt: "2026-10-22T08:00:00.000Z",
        installmentName: "Semester 4 Tuition Fee",
        amount: 25000,
      });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <MemoryRouter
            initialEntries={[
              `/student/payment-success?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay`,
            ]}
          >
            <PaymentSuccess />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    // Verify verify status was called once
    const statusCalls = mock.history.get.filter((r) =>
      r.url.includes("/student/payments/status")
    );
    expect(statusCalls.length).toBe(1);

    // Verify successful render
    expect(container.textContent).toContain("Payment Successful");
    expect(container.textContent).toContain("RAZORPAY");
    expect(container.textContent).toContain("Semester 4 Tuition Fee");
    expect(container.textContent).toContain(paymentId);
  });

  it("handles failure without crashing (no handleRetry TDZ error) and Retry button re-calls verify", async () => {
    const paymentId = "pay_TqsehDt1LI4cMk";
    const orderId = "order_error_test";

    // First call returns failure status
    mock
      .onGet(`/student/payments/status?orderId=${orderId}&gateway=razorpay`)
      .replyOnce(200, {
        status: "FAILED",
        failureReason: "Payment was declined by issuing bank",
      });

    // Render component — should NOT crash with ReferenceError: Cannot access 'handleRetry' before initialization
    let renderError = null;
    try {
      await act(async () => {
        root.render(
          <AuthContext.Provider value={{ user: mockUser, loading: false }}>
            <MemoryRouter
              initialEntries={[
                `/student/payment-success?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay`,
              ]}
            >
              <PaymentSuccess />
            </MemoryRouter>
          </AuthContext.Provider>
        );
      });
    } catch (err) {
      renderError = err;
    }

    expect(renderError).toBeNull();

    // Verify ApiError is displayed with retry button
    const retryBtn = Array.from(container.querySelectorAll("button")).find(
      (b) =>
        b.textContent.includes("Try Again") ||
        b.textContent.includes("Retry")
    );
    expect(retryBtn).toBeDefined();

    // Setup second call response for Retry to succeed
    mock
      .onGet(`/student/payments/status?orderId=${orderId}&gateway=razorpay`)
      .reply(200, {
        installmentId: "inst_retry_success",
        installmentName: "Semester 4 Tuition Fee",
        amount: 25000,
        paidAt: "2026-10-22T08:15:00.000Z",
        transactionId: paymentId,
        paymentGateway: "RAZORPAY",
        status: "PAID",
        totalFee: 50000,
        paidAmount: 25000,
        remainingAmount: 25000,
      });

    mock
      .onGet("/student/payments/receipt/inst_retry_success")
      .reply(200, {});

    // Click Retry
    await act(async () => {
      retryBtn.click();
    });

    // Verify verify status API was called again
    const statusCalls = mock.history.get.filter((r) =>
      r.url.includes("/student/payments/status")
    );
    expect(statusCalls.length).toBeGreaterThanOrEqual(2);

    // Verify success is now shown
    expect(container.textContent).toContain("Payment Successful");
    expect(container.textContent).toContain("RAZORPAY");
  });

  it("handles missing order_id gracefully without throwing TDZ error", async () => {
    let renderError = null;
    try {
      await act(async () => {
        root.render(
          <AuthContext.Provider value={{ user: mockUser, loading: false }}>
            <MemoryRouter
              initialEntries={["/student/payment-success?gateway=razorpay"]}
            >
              <PaymentSuccess />
            </MemoryRouter>
          </AuthContext.Provider>
        );
      });
    } catch (err) {
      renderError = err;
    }

    expect(renderError).toBeNull();
    expect(container.textContent).toContain("No payment session found");
    const retryBtn = Array.from(container.querySelectorAll("button")).find(
      (b) =>
        b.textContent.includes("Try Again") ||
        b.textContent.includes("Retry")
    );
    expect(retryBtn).toBeDefined();
  });

  it("calls verify-payment with order_id, payment_id, and signature once, and shows success", async () => {
    const paymentId = "pay_TqsehDt1LI4cMk";
    const orderId = "order_alpha_verify";
    const signature = "sig_valid_test_12345";

    mock.onPost("/razorpay/verify-payment", {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }).reply(200, {
      valid: true,
      installment: {
        _id: "inst_verified_1",
        installmentName: "Term 1 Tuition",
        amount: 30000,
        paidAt: "2026-10-22T08:00:00.000Z",
        transactionId: paymentId,
        paymentGateway: "RAZORPAY",
        status: "PAID",
      },
      totalFee: 60000,
      paidAmount: 30000,
      remainingAmount: 30000,
    });

    mock.onGet("/student/payments/receipt/inst_verified_1").reply(200, {});

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <MemoryRouter
            initialEntries={[
              `/student/payment-success?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay&signature=${signature}`,
            ]}
          >
            <PaymentSuccess />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    const verifyCalls = mock.history.post.filter((r) =>
      r.url.includes("/razorpay/verify-payment")
    );
    expect(verifyCalls.length).toBe(1);
    expect(JSON.parse(verifyCalls[0].data)).toEqual({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    // Does NOT poll status since verify succeeded immediately
    const statusCalls = mock.history.get.filter((r) =>
      r.url.includes("/student/payments/status")
    );
    expect(statusCalls.length).toBe(0);

    expect(container.textContent).toContain("Payment Successful");
    expect(container.textContent).toContain("Term 1 Tuition");
    expect(container.textContent).toContain(paymentId);
  });

  it("shows clear error on verify-payment signature/amount error (400) without showing still processing", async () => {
    const paymentId = "pay_TqsehDt1LI4cMk";
    const orderId = "order_bad_signature";
    const signature = "sig_invalid_xyz";

    mock.onPost("/razorpay/verify-payment").reply(400, {
      code: "INVALID_SIGNATURE",
      message: "Payment verification failed. Invalid signature.",
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <MemoryRouter
            initialEntries={[
              `/student/payment-success?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay&signature=${signature}`,
            ]}
          >
            <PaymentSuccess />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    // Should display the specific verification failure message
    expect(container.textContent).toContain("Payment verification failed. Invalid signature.");
    // Should NOT show "still processing"
    expect(container.textContent).not.toContain("still processing");

    // Status polling should NOT have run
    const statusCalls = mock.history.get.filter((r) =>
      r.url.includes("/student/payments/status")
    );
    expect(statusCalls.length).toBe(0);
  });

  it("displays payment success immediately when verifiedData is passed in location state", async () => {
    const paymentId = "pay_TqsehDt1LI4cMk";
    const orderId = "order_state_verified";

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/student/payment-success",
                search: `?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay`,
                state: {
                  paymentGateway: "RAZORPAY",
                  orderId,
                  paymentId,
                  verifiedData: {
                    valid: true,
                    installment: {
                      _id: "inst_from_state",
                      installmentName: "Term 2 Fee",
                      amount: 15000,
                      paidAt: "2026-10-22T08:30:00.000Z",
                      transactionId: paymentId,
                      status: "PAID",
                      paymentGateway: "RAZORPAY",
                    },
                    totalFee: 45000,
                    paidAmount: 15000,
                    remainingAmount: 30000,
                  },
                },
              },
            ]}
          >
            <PaymentSuccess />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    // Receipt details fetch
    expect(container.textContent).toContain("Payment Successful");
    expect(container.textContent).toContain("Term 2 Fee");
    expect(container.textContent).toContain(paymentId);

    // No extra verify or status network calls needed
    const verifyCalls = mock.history.post.filter((r) =>
      r.url.includes("/razorpay/verify-payment")
    );
    expect(verifyCalls.length).toBe(0);
  });

  it("prevents double verify call on re-renders (ref guard against double run)", async () => {
    const paymentId = "pay_double_guard";
    const orderId = "order_double_guard";
    const signature = "sig_guard_123";

    mock.onPost("/razorpay/verify-payment").reply(200, {
      valid: true,
      installment: {
        _id: "inst_double",
        installmentName: "Guard Fee",
        amount: 20000,
        paidAt: "2026-10-22T08:00:00.000Z",
        transactionId: paymentId,
        paymentGateway: "RAZORPAY",
        status: "PAID",
      },
      totalFee: 40000,
      paidAmount: 20000,
      remainingAmount: 20000,
    });

    mock.onGet("/student/payments/receipt/inst_double").reply(200, {});

    // Render first time
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <MemoryRouter
            initialEntries={[
              `/student/payment-success?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay&signature=${signature}`,
            ]}
          >
            <PaymentSuccess />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    // Re-render (simulating StrictMode or parent update without retry)
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <MemoryRouter
            initialEntries={[
              `/student/payment-success?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay&signature=${signature}`,
            ]}
          >
            <PaymentSuccess />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    const verifyCalls = mock.history.post.filter((r) =>
      r.url.includes("/razorpay/verify-payment")
    );
    expect(verifyCalls.length).toBe(1);
  });
});

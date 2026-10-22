import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";
import MakePayments from "../../pages/dashboard/Student/MakePayments";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../components/Loading", () => ({
  default: ({ text }) => <div data-testid="loading">{text || "Loading..."}</div>,
}));

describe("MakePayments Component — Razorpay Checkout Handler & Verification", () => {
  let container;
  let root;
  let mock;
  let razorpayInstanceMock;

  const mockUser = {
    _id: "user-student-1",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "9876543210",
    role: "STUDENT",
    collegeName: "Novaa Tech",
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mock = new MockAdapter(api);
    sessionStorage.clear();
    mockNavigate.mockClear();

    // Mock gateways API
    mock.onGet("/admin/payment/gateways").reply(200, {
      success: true,
      gateways: [{ code: "razorpay" }, { code: "stripe" }],
    });

    // Mock Razorpay script loading
    const origAppendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, "appendChild").mockImplementation((el) => {
      if (el && el.tagName === "SCRIPT" && el.src && el.src.includes("razorpay")) {
        setTimeout(() => {
          if (el.onload) el.onload();
        }, 0);
      }
      return origAppendChild(el);
    });

    // Mock Razorpay SDK on window
    razorpayInstanceMock = {
      open: vi.fn(),
      on: vi.fn(),
    };

    window.Razorpay = vi.fn(function (options) {
      this.options = options;
      this.open = razorpayInstanceMock.open;
      this.on = razorpayInstanceMock.on;
      razorpayInstanceMock.lastOptions = options;
      return this;
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    mock.restore();
    vi.restoreAllMocks();
    delete window.Razorpay;
  });

  it("calls verify-payment once with order_id, payment_id, and signature in checkout handler then redirects", async () => {
    const orderId = "order_test_999";
    const paymentId = "pay_test_888";
    const signature = "sig_test_777";

    // Mock create-order
    mock.onPost("/razorpay/create-order").reply(200, {
      orderId,
      amount: 100000,
      currency: "INR",
      keyId: "rzp_test_key123",
    });

    // Mock verify-payment
    mock.onPost("/razorpay/verify-payment").reply(200, {
      valid: true,
      installment: {
        _id: "inst_999",
        installmentName: "Semester 1",
        amount: 1000,
        status: "PAID",
      },
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/student/make-payment",
                state: {
                  installmentId: "inst_999",
                  installmentName: "Semester 1",
                  amount: 1000,
                },
              },
            ]}
          >
            <MakePayments />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    // Click Pay with Razorpay button
    const razorpayButton = Array.from(
      container.querySelectorAll("button")
    ).find((b) => b.textContent.includes("Razorpay"));

    expect(razorpayButton).toBeDefined();

    await act(async () => {
      razorpayButton.click();
    });

    // Razorpay instance should have been initialized with options
    expect(window.Razorpay).toHaveBeenCalled();
    const capturedOptions = razorpayInstanceMock.lastOptions;
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.order_id).toBe(orderId);

    // Simulate checkout success calling options.handler
    await act(async () => {
      await capturedOptions.handler({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      });
    });

    // Verify verify-payment API was called once with the three values
    const verifyCalls = mock.history.post.filter((r) =>
      r.url.includes("/razorpay/verify-payment")
    );
    expect(verifyCalls.length).toBe(1);
    expect(JSON.parse(verifyCalls[0].data)).toEqual({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    // Signature was saved in sessionStorage
    const stored = JSON.parse(
      sessionStorage.getItem(`rzp_sig_${orderId}`) || "{}"
    );
    expect(stored.signature).toBe(signature);
    expect(stored.paymentId).toBe(paymentId);
    expect(stored.orderId).toBe(orderId);

    // Redirected to payment-success with state
    expect(mockNavigate).toHaveBeenCalledWith(
      `/student/payment-success?payment_id=${paymentId}&order_id=${orderId}&gateway=razorpay`,
      expect.objectContaining({
        state: expect.objectContaining({
          paymentGateway: "RAZORPAY",
          orderId,
          paymentId,
          signature,
          verifiedData: expect.objectContaining({ valid: true }),
        }),
      })
    );

    // Calling handler a second time should be guarded and not trigger a second verify call
    await act(async () => {
      await capturedOptions.handler({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      });
    });

    const verifyCallsAfter = mock.history.post.filter((r) =>
      r.url.includes("/razorpay/verify-payment")
    );
    expect(verifyCallsAfter.length).toBe(1);
  });
});

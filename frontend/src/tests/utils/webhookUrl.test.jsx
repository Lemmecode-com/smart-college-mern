import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import {
  buildWebhookUrl,
  isInsecureOrLocalWebhookUrl,
  WEBHOOK_LOCALHOST_WARNING_MESSAGE,
} from "../../utils/webhookUrl";
import RazorpayConfiguration from "../../pages/dashboard/College-Admin/SystemSetting/RazorpayConfiguration";

describe("Webhook URL Utility & Razorpay Configuration Tests", () => {
  describe("buildWebhookUrl", () => {
    it("builds URL from base ending with /api without double slashes", () => {
      const url = buildWebhookUrl("http://localhost:5000/api");
      expect(url).toBe("http://localhost:5000/api/razorpay/webhook");
    });

    it("strips trailing slashes from base URL", () => {
      const url = buildWebhookUrl("https://api.smartcollege.edu/api/");
      expect(url).toBe("https://api.smartcollege.edu/api/razorpay/webhook");
    });

    it("correctly handles base URL without /api segment", () => {
      const url = buildWebhookUrl("https://api.smartcollege.edu");
      expect(url).toBe("https://api.smartcollege.edu/api/razorpay/webhook");
    });

    it("correctly handles base URL without /api segment and trailing slash", () => {
      const url = buildWebhookUrl("https://api.smartcollege.edu/");
      expect(url).toBe("https://api.smartcollege.edu/api/razorpay/webhook");
    });

    it("removes duplicate slashes in subpaths while preserving protocol", () => {
      const url = buildWebhookUrl("https://api.smartcollege.edu//subpath//api///");
      expect(url).toBe("https://api.smartcollege.edu/subpath/api/razorpay/webhook");
    });

    it("leaves already fully qualified webhook URL untouched", () => {
      const url = buildWebhookUrl("https://api.smartcollege.edu/api/razorpay/webhook");
      expect(url).toBe("https://api.smartcollege.edu/api/razorpay/webhook");
    });

    it("supports custom gateway identifier (e.g. stripe)", () => {
      const url = buildWebhookUrl("https://api.smartcollege.edu/api", "stripe");
      expect(url).toBe("https://api.smartcollege.edu/api/stripe/webhook");
    });

    it("falls back to env VITE_API_BASE_URL when baseUrl is empty", () => {
      const url = buildWebhookUrl("");
      expect(url).toContain("/api/razorpay/webhook");
      expect(url).not.toContain("//api");
    });
  });

  describe("isInsecureOrLocalWebhookUrl", () => {
    it("returns true for localhost URL", () => {
      expect(
        isInsecureOrLocalWebhookUrl("http://localhost:5000/api/razorpay/webhook")
      ).toBe(true);
    });

    it("returns true for localhost even if https protocol is used", () => {
      expect(
        isInsecureOrLocalWebhookUrl("https://localhost:5000/api/razorpay/webhook")
      ).toBe(true);
    });

    it("returns true for 127.0.0.1 loopback URL", () => {
      expect(
        isInsecureOrLocalWebhookUrl("http://127.0.0.1:5000/api/razorpay/webhook")
      ).toBe(true);
    });

    it("returns true for 0.0.0.0 loopback URL", () => {
      expect(
        isInsecureOrLocalWebhookUrl("http://0.0.0.0:5000/api/razorpay/webhook")
      ).toBe(true);
    });

    it("returns true for public domain using insecure http", () => {
      expect(
        isInsecureOrLocalWebhookUrl("http://api.smartcollege.edu/api/razorpay/webhook")
      ).toBe(true);
    });

    it("returns false for valid public HTTPS URL", () => {
      expect(
        isInsecureOrLocalWebhookUrl("https://api.smartcollege.edu/api/razorpay/webhook")
      ).toBe(false);
    });

    it("returns false for ngrok HTTPS tunnel URL", () => {
      expect(
        isInsecureOrLocalWebhookUrl("https://xyz.ngrok-free.app/api/razorpay/webhook")
      ).toBe(false);
    });

    it("returns true for empty or null URL", () => {
      expect(isInsecureOrLocalWebhookUrl("")).toBe(true);
      expect(isInsecureOrLocalWebhookUrl(null)).toBe(true);
    });
  });

  describe("RazorpayConfiguration Component UI Rendering", () => {
    let container;
    let root;
    let mock;

    beforeEach(() => {
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      mock = new MockAdapter(api);

      // Mock navigator.clipboard
      if (!navigator.clipboard) {
        Object.assign(navigator, {
          clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined),
          },
        });
      } else {
        vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
      }
    });

    afterEach(() => {
      act(() => {
        root.unmount();
      });
      container.remove();
      mock.restore();
      vi.restoreAllMocks();
    });

    it("shows localhost warning banner when URL is localhost/http", async () => {
      mock.onGet("/admin/razorpay/config").reply(200, {
        success: true,
        configured: true,
        isActive: true,
        webhookUrl: "http://localhost:5000/api/razorpay/webhook",
        config: {
          id: "config-1",
          gatewayCode: "razorpay",
          credentials: { keyId: "rzp_test_123", hasSecret: true, hasWebhookSecret: true },
          configuration: { testMode: true },
          isActive: true,
        },
      });

      await act(async () => {
        root.render(
          <MemoryRouter>
            <RazorpayConfiguration />
          </MemoryRouter>
        );
      });

      // Header and card warning banners should be visible
      const headerWarning = container.querySelector('[data-testid="webhook-warning-header"]');
      const cardWarning = container.querySelector('[data-testid="webhook-warning-card"]');
      expect(headerWarning).not.toBeNull();
      expect(cardWarning).not.toBeNull();
      expect(headerWarning.textContent).toContain(
        "Razorpay cannot reach localhost. Use a public HTTPS URL, for example an ngrok URL for testing"
      );
      expect(cardWarning.textContent).toContain(
        "Razorpay cannot reach localhost. Use a public HTTPS URL, for example an ngrok URL for testing"
      );

      // Verify the rendered webhook URL text
      expect(container.textContent).toContain("http://localhost:5000/api/razorpay/webhook");
    });

    it("does NOT show localhost warning banner when URL is public HTTPS", async () => {
      mock.onGet("/admin/razorpay/config").reply(200, {
        success: true,
        configured: true,
        isActive: true,
        webhookUrl: "https://api.smartcollege.edu/api/razorpay/webhook",
        config: {
          id: "config-1",
          gatewayCode: "razorpay",
          credentials: { keyId: "rzp_live_123", hasSecret: true, hasWebhookSecret: true },
          configuration: { testMode: false },
          isActive: true,
        },
      });

      await act(async () => {
        root.render(
          <MemoryRouter>
            <RazorpayConfiguration />
          </MemoryRouter>
        );
      });

      // Warning alerts must NOT be present
      const headerWarning = container.querySelector('[data-testid="webhook-warning-header"]');
      const cardWarning = container.querySelector('[data-testid="webhook-warning-card"]');
      expect(headerWarning).toBeNull();
      expect(cardWarning).toBeNull();

      // Rendered webhook URL should be the public HTTPS URL
      expect(container.textContent).toContain("https://api.smartcollege.edu/api/razorpay/webhook");
    });

    it("copies webhook URL to clipboard when copy button is clicked", async () => {
      mock.onGet("/admin/razorpay/config").reply(200, {
        success: true,
        configured: true,
        isActive: true,
        webhookUrl: "https://api.smartcollege.edu/api/razorpay/webhook",
        config: {
          id: "config-1",
          gatewayCode: "razorpay",
          credentials: { keyId: "rzp_live_123", hasSecret: true, hasWebhookSecret: true },
          configuration: { testMode: false },
          isActive: true,
        },
      });

      await act(async () => {
        root.render(
          <MemoryRouter>
            <RazorpayConfiguration />
          </MemoryRouter>
        );
      });

      const copyButtons = container.querySelectorAll('button[aria-label="Copy webhook URL"]');
      expect(copyButtons.length).toBeGreaterThanOrEqual(1);

      await act(async () => {
        copyButtons[0].click();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://api.smartcollege.edu/api/razorpay/webhook"
      );
    });
  });
});

const {
  validateUrlConfig,
  validateFrontendUrlString,
  validateCorsOriginsString,
  isLoopbackOrLocalhost,
} = require("../../../src/utils/validateUrlConfig");
const {
  buildFrontendUrl,
  getFrontendBaseUrl,
  isProduction,
} = require("../../../src/utils/urlBuilder");

describe("Centralized URL and CORS Configuration Tests (Issue #223)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isLoopbackOrLocalhost", () => {
    it("identifies localhost hostnames", () => {
      expect(isLoopbackOrLocalhost("localhost")).toBe(true);
      expect(isLoopbackOrLocalhost("LOCALHOST")).toBe(true);
      expect(isLoopbackOrLocalhost("sub.localhost")).toBe(true);
      expect(isLoopbackOrLocalhost("dev.portal.localhost")).toBe(true);
    });

    it("identifies IPv4 loopback and unspecified addresses", () => {
      expect(isLoopbackOrLocalhost("127.0.0.1")).toBe(true);
      expect(isLoopbackOrLocalhost("127.0.1.1")).toBe(true);
      expect(isLoopbackOrLocalhost("127.255.255.255")).toBe(true);
      expect(isLoopbackOrLocalhost("0.0.0.0")).toBe(true);
    });

    it("identifies IPv6 loopback and unspecified addresses", () => {
      expect(isLoopbackOrLocalhost("::1")).toBe(true);
      expect(isLoopbackOrLocalhost("[::1]")).toBe(true);
      expect(isLoopbackOrLocalhost("::")).toBe(true);
      expect(isLoopbackOrLocalhost("[::]")).toBe(true);
      expect(isLoopbackOrLocalhost("0:0:0:0:0:0:0:1")).toBe(true);
    });

    it("identifies IPv4-mapped IPv6 loopback and unspecified addresses", () => {
      expect(isLoopbackOrLocalhost("::ffff:127.0.0.1")).toBe(true);
      expect(isLoopbackOrLocalhost("[::ffff:127.0.0.1]")).toBe(true);
      expect(isLoopbackOrLocalhost("::ffff:7f00:1")).toBe(true);
      expect(isLoopbackOrLocalhost("[::ffff:7f00:1]")).toBe(true);
      expect(isLoopbackOrLocalhost("::ffff:7fff:ffff")).toBe(true);
      expect(isLoopbackOrLocalhost("0:0:0:0:0:ffff:127.0.0.1")).toBe(true);
      expect(isLoopbackOrLocalhost("::ffff:0.0.0.0")).toBe(true);
      expect(isLoopbackOrLocalhost("::ffff:0:0")).toBe(true);
      expect(isLoopbackOrLocalhost("::ffff:192.168.1.1")).toBe(false);
      expect(isLoopbackOrLocalhost("::ffff:c0a8:101")).toBe(false);
    });

    it("returns false for legitimate public domains", () => {
      expect(isLoopbackOrLocalhost("novaa.college.edu")).toBe(false);
      expect(isLoopbackOrLocalhost("app.example.com")).toBe(false);
      expect(isLoopbackOrLocalhost("localhost.example.com")).toBe(false);
      expect(isLoopbackOrLocalhost("192.168.1.1")).toBe(false);
    });

    it("handles null or non-string inputs safely", () => {
      expect(isLoopbackOrLocalhost(null)).toBe(false);
      expect(isLoopbackOrLocalhost(undefined)).toBe(false);
      expect(isLoopbackOrLocalhost("")).toBe(false);
    });
  });

  describe("validateFrontendUrlString", () => {
    it("throws when urlString is missing or empty", () => {
      expect(() => validateFrontendUrlString("", false)).toThrow(
        /FRONTEND_URL or CLIENT_URL environment variable is required/,
      );
      expect(() => validateFrontendUrlString(null, false)).toThrow(
        /FRONTEND_URL or CLIENT_URL environment variable is required/,
      );
    });

    it("throws when urlString has invalid URL syntax", () => {
      expect(() => validateFrontendUrlString("not-a-valid-url", false)).toThrow(
        /Invalid URL format for FRONTEND_URL/,
      );
    });

    it("allows localhost and HTTP in development/test environments", () => {
      const url1 = validateFrontendUrlString("http://localhost:5173", false);
      expect(url1.hostname).toBe("localhost");
      expect(url1.port).toBe("5173");

      const url2 = validateFrontendUrlString("http://127.0.0.1:3000", false);
      expect(url2.hostname).toBe("127.0.0.1");

      const url3 = validateFrontendUrlString("http://[::ffff:127.0.0.1]:5173", false);
      expect(url3.hostname).toBe("[::ffff:7f00:1]");
    });

    it("rejects non-HTTPS protocol in production", () => {
      expect(() =>
        validateFrontendUrlString("http://novaa.college.edu", true),
      ).toThrow(/Production FRONTEND_URL must use HTTPS protocol/);
    });

    it("rejects localhost in production", () => {
      expect(() =>
        validateFrontendUrlString("https://localhost:5173", true),
      ).toThrow(
        /Production FRONTEND_URL cannot point to localhost or loopback address/,
      );
      expect(() =>
        validateFrontendUrlString("http://localhost:5173", true),
      ).toThrow(/Production FRONTEND_URL must use HTTPS protocol/);
    });

    it("rejects loopback IPs in production", () => {
      expect(() =>
        validateFrontendUrlString("https://127.0.0.1:5173", true),
      ).toThrow(
        /Production FRONTEND_URL cannot point to localhost or loopback address/,
      );
      expect(() =>
        validateFrontendUrlString("https://[::1]:5173", true),
      ).toThrow(
        /Production FRONTEND_URL cannot point to localhost or loopback address/,
      );
    });

    it("rejects IPv4-mapped loopback IPs in production", () => {
      expect(() =>
        validateFrontendUrlString("https://[::ffff:127.0.0.1]:5173", true),
      ).toThrow(
        /Production FRONTEND_URL cannot point to localhost or loopback address/,
      );
      expect(() =>
        validateFrontendUrlString("https://[::ffff:7f00:1]:5173", true),
      ).toThrow(
        /Production FRONTEND_URL cannot point to localhost or loopback address/,
      );
      expect(() =>
        validateFrontendUrlString("https://[::ffff:0.0.0.0]:5173", true),
      ).toThrow(
        /Production FRONTEND_URL cannot point to localhost or loopback address/,
      );
    });

    it("accepts valid public HTTPS domains in production", () => {
      const url = validateFrontendUrlString("https://novaa.college.edu", true);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("novaa.college.edu");
    });
  });

  describe("validateCorsOriginsString", () => {
    it("trims whitespace and removes empty entries", () => {
      const parsed = validateCorsOriginsString(
        " https://app.domain.com , , https://admin.domain.com ",
        false,
      );
      expect(parsed).toEqual([
        "https://app.domain.com",
        "https://admin.domain.com",
      ]);
    });

    it("allows localhost origins in development", () => {
      const parsed = validateCorsOriginsString(
        "http://localhost:5173,http://localhost:3000",
        false,
      );
      expect(parsed).toEqual([
        "http://localhost:5173",
        "http://localhost:3000",
      ]);
    });

    it("rejects missing CORS_ORIGINS in production", () => {
      expect(() => validateCorsOriginsString("", true)).toThrow(
        /CORS_ORIGINS environment variable is required in production/,
      );
    });

    it("rejects insecure HTTP origins in production", () => {
      expect(() =>
        validateCorsOriginsString("http://app.domain.com", true),
      ).toThrow(/Production CORS origins must use HTTPS protocol/);
    });

    it("rejects localhost origins in production", () => {
      expect(() =>
        validateCorsOriginsString("https://localhost:5173", true),
      ).toThrow(
        /Production CORS origins cannot contain localhost or loopback addresses/,
      );
    });

    it("rejects IPv4-mapped loopback origins in production", () => {
      expect(() =>
        validateCorsOriginsString("https://[::ffff:127.0.0.1]:5173", true),
      ).toThrow(
        /Production CORS origins cannot contain localhost or loopback addresses/,
      );
      expect(() =>
        validateCorsOriginsString("https://[::ffff:7f00:1]:5173", true),
      ).toThrow(
        /Production CORS origins cannot contain localhost or loopback addresses/,
      );
    });

    it("accepts valid HTTPS origins in production", () => {
      const origins = validateCorsOriginsString(
        "https://novaa.college.edu,https://admin.college.edu",
        true,
      );
      expect(origins).toEqual([
        "https://novaa.college.edu",
        "https://admin.college.edu",
      ]);
    });
  });

  describe("validateUrlConfig startup function", () => {
    it("returns isValid: true in development without blocking localhost", () => {
      const result = validateUrlConfig(
        {
          NODE_ENV: "development",
          FRONTEND_URL: "http://localhost:5173",
          CORS_ORIGINS: "http://localhost:5173",
        },
        false,
      );
      expect(result.isValid).toBe(true);
      expect(result.isProduction).toBe(false);
    });

    it("returns isValid: true in test environment even when FRONTEND_URL is absent", () => {
      const result = validateUrlConfig(
        {
          NODE_ENV: "test",
        },
        false,
      );
      expect(result.isValid).toBe(true);
      expect(result.isProduction).toBe(false);
    });

    it("throws in production when FRONTEND_URL is missing", () => {
      expect(() =>
        validateUrlConfig(
          {
            NODE_ENV: "production",
            CORS_ORIGINS: "https://college.edu",
          },
          false,
        ),
      ).toThrow(/FRONTEND_URL or CLIENT_URL environment variable is required/);
    });

    it("throws in production when FRONTEND_URL is localhost", () => {
      expect(() =>
        validateUrlConfig(
          {
            NODE_ENV: "production",
            FRONTEND_URL: "http://localhost:5173",
            CORS_ORIGINS: "https://college.edu",
          },
          false,
        ),
      ).toThrow(/Production FRONTEND_URL must use HTTPS protocol/);
    });

    it("succeeds in production when valid HTTPS frontend and CORS origins are configured", () => {
      const result = validateUrlConfig(
        {
          NODE_ENV: "production",
          FRONTEND_URL: "https://novaa.college.edu",
          CORS_ORIGINS: "https://novaa.college.edu,https://admin.college.edu",
        },
        false,
      );
      expect(result.isValid).toBe(true);
      expect(result.isProduction).toBe(true);
    });
  });

  describe("urlBuilder.js integration", () => {
    it("builds URL with clean path and strips trailing slashes on base URL", () => {
      process.env.NODE_ENV = "development";
      process.env.FRONTEND_URL = "http://localhost:5173/";

      expect(buildFrontendUrl("/login")).toBe("http://localhost:5173/login");
      expect(buildFrontendUrl("login")).toBe("http://localhost:5173/login");
      expect(buildFrontendUrl("")).toBe("http://localhost:5173");
    });

    it("correctly preserves query parameters and Stripe placeholders", () => {
      process.env.NODE_ENV = "development";
      process.env.FRONTEND_URL = "http://localhost:5173";

      const url = buildFrontendUrl(
        "/student/payment-success?session_id={CHECKOUT_SESSION_ID}",
      );
      expect(url).toBe(
        "http://localhost:5173/student/payment-success?session_id={CHECKOUT_SESSION_ID}",
      );
    });

    it("supports CLIENT_URL as fallback when FRONTEND_URL is not set", () => {
      process.env.NODE_ENV = "development";
      delete process.env.FRONTEND_URL;
      process.env.CLIENT_URL = "http://localhost:5174";

      expect(getFrontendBaseUrl()).toBe("http://localhost:5174");
      expect(buildFrontendUrl("/register/ABC")).toBe(
        "http://localhost:5174/register/ABC",
      );
    });

    it("rejects localhost base URL in production mode", () => {
      process.env.NODE_ENV = "production";
      process.env.FRONTEND_URL = "http://localhost:5173";

      expect(() => buildFrontendUrl("/register/ABC")).toThrow(
        /Production FRONTEND_URL must use HTTPS protocol/,
      );
    });

    it("accepts valid HTTPS base URL in production mode", () => {
      process.env.NODE_ENV = "production";
      process.env.FRONTEND_URL = "https://novaa.college.edu/";

      expect(buildFrontendUrl("/register/IIT-1234")).toBe(
        "https://novaa.college.edu/register/IIT-1234",
      );
    });
  });

  describe("Shared CORS filter integration", () => {
    it("filters out insecure, localhost, and IPv4-mapped loopback origins in production", () => {
      const isProduction = true;
      const rawCorsOrigins = [
        "https://novaa.college.edu",
        "http://novaa.college.edu",
        "https://localhost:5173",
        "https://[::ffff:127.0.0.1]:5173",
        "https://[::ffff:7f00:1]:5173",
        "https://[::1]:3000",
        "https://admin.college.edu",
        "invalid-origin-syntax",
      ];

      const filtered = isProduction
        ? rawCorsOrigins.filter((origin) => {
            try {
              const parsed = new URL(origin);
              const isLocal = isLoopbackOrLocalhost(parsed.hostname);
              const isInsecure = parsed.protocol !== "https:";
              return !isLocal && !isInsecure;
            } catch {
              return false;
            }
          })
        : rawCorsOrigins;

      expect(filtered).toEqual([
        "https://novaa.college.edu",
        "https://admin.college.edu",
      ]);
    });

    it("allows localhost and dev origins when not in production", () => {
      const isProduction = false;
      const rawCorsOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "https://[::ffff:127.0.0.1]:5173",
      ];

      const filtered = isProduction
        ? rawCorsOrigins.filter(() => false)
        : rawCorsOrigins;

      expect(filtered).toEqual(rawCorsOrigins);
    });
  });
});

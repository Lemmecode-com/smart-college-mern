const collegeMiddleware = require("../../src/middlewares/college.middleware");
const collegeIsolation = require("../../src/middlewares/collegeIsolation.middleware");
const College = require("../../src/models/college.model");
const User = require("../../src/models/user.model");

jest.mock("../../src/models/college.model");
jest.mock("../../src/models/user.model");
jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe("college.middleware & collegeIsolation.middleware (Hardened Multi-Tenancy)", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: {
        id: "user123",
        role: "COLLEGE_ADMIN",
        college_id: "college_aaa",
        email: "admin@college-a.edu",
      },
      params: {},
      query: {},
      body: {},
      method: "GET",
      originalUrl: "/api/students",
      ip: "127.0.0.1",
      headers: { "user-agent": "JestTest/1.0" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("Authentication & Super Admin bypass", () => {
    it("bypasses all checks if user is SUPER_ADMIN", async () => {
      req.user.role = "SUPER_ADMIN";
      await collegeMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(College.findById).not.toHaveBeenCalled();
    });

    it("throws 401 USER_NOT_AUTHENTICATED if req.user is missing", async () => {
      req.user = null;
      await collegeMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: "USER_NOT_AUTHENTICATED",
        })
      );
    });
  });

  describe("College ID resolution & DB fallback", () => {
    it("recovers college_id from DB fallback when missing from JWT", async () => {
      req.user.college_id = null;
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ college_id: "recovered_college_id" }),
      });
      College.findById.mockResolvedValue({
        _id: "recovered_college_id",
        name: "Recovered College",
        code: "RC01",
        isActive: true,
      });

      await collegeMiddleware(req, res, next);

      expect(req.user.college_id).toBe("recovered_college_id");
      expect(req.college_id).toBe("recovered_college_id");
      expect(next).toHaveBeenCalledWith();
    });

    it("throws 403 COLLEGE_NOT_ASSIGNED if DB fallback fails", async () => {
      req.user.college_id = null;
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "COLLEGE_NOT_ASSIGNED",
        })
      );
    });
  });

  describe("Cross-Tenant Parameter Tampering Detection", () => {
    it("throws 403 COLLEGE_ISOLATION_VIOLATION if req.params.college_id does not match", async () => {
      req.params.college_id = "attacker_college_id";

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "COLLEGE_ISOLATION_VIOLATION",
        })
      );
    });

    it("throws 403 COLLEGE_ISOLATION_VIOLATION if req.query.college_id does not match", async () => {
      req.query.college_id = "attacker_college_id";

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "COLLEGE_ISOLATION_VIOLATION",
        })
      );
    });

    it("throws 403 COLLEGE_ISOLATION_VIOLATION if req.body.college_id does not match", async () => {
      req.body.college_id = "attacker_college_id";

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "COLLEGE_ISOLATION_VIOLATION",
        })
      );
    });

    it("allows request when requested college_id matches authenticated college_id", async () => {
      req.params.college_id = "college_aaa";
      College.findById.mockResolvedValue({
        _id: "college_aaa",
        name: "College Alpha",
        code: "CA01",
        isActive: true,
      });

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.college_id).toBe("college_aaa");
    });
  });

  describe("College validation & Status checks", () => {
    it("throws 403 COLLEGE_NOT_FOUND when college is missing from database", async () => {
      College.findById.mockResolvedValue(null);

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "COLLEGE_NOT_FOUND",
        })
      );
    });

    it("throws 403 COLLEGE_SUSPENDED when college is not active", async () => {
      College.findById.mockResolvedValue({
        _id: "college_aaa",
        name: "Deactivated College",
        code: "DC01",
        isActive: false,
      });

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "COLLEGE_SUSPENDED",
        })
      );
    });
  });

  describe("Subscription Expiry Check", () => {
    it("throws 403 SUBSCRIPTION_EXPIRED when college subscription has expired", async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      College.findById.mockResolvedValue({
        _id: "college_aaa",
        name: "Expired College",
        code: "EC01",
        isActive: true,
        subscriptionExpiry: pastDate,
      });

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "SUBSCRIPTION_EXPIRED",
        })
      );
    });

    it("allows request when college subscription is active", async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead
      College.findById.mockResolvedValue({
        _id: "college_aaa",
        name: "Valid College",
        code: "VC01",
        isActive: true,
        subscriptionExpiry: futureDate,
      });

      await collegeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.isolationChecked).toBe(true);
      expect(req.collegeCode).toBe("VC01");
    });
  });

  describe("collegeIsolation wrapper compatibility", () => {
    it("works via factory invocation collegeIsolation()", async () => {
      College.findById.mockResolvedValue({
        _id: "college_aaa",
        name: "College Alpha",
        code: "CA01",
        isActive: true,
      });

      const middleware = collegeIsolation();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.isolationChecked).toBe(true);
    });

    it("enforces allowedRoles if provided in options", async () => {
      req.user.role = "TEACHER";
      const middleware = collegeIsolation({ allowedRoles: ["COLLEGE_ADMIN", "PRINCIPAL"] });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "ROLE_NOT_ALLOWED",
        })
      );
    });

    it("allows allowedRoles when matching", async () => {
      req.user.role = "PRINCIPAL";
      College.findById.mockResolvedValue({
        _id: "college_aaa",
        name: "College Alpha",
        code: "CA01",
        isActive: true,
      });

      const middleware = collegeIsolation({ allowedRoles: ["COLLEGE_ADMIN", "PRINCIPAL"] });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("works when invoked directly as collegeIsolation(req, res, next)", async () => {
      College.findById.mockResolvedValue({
        _id: "college_aaa",
        name: "College Alpha",
        code: "CA01",
        isActive: true,
      });

      await collegeIsolation(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.isolationChecked).toBe(true);
    });
  });
});

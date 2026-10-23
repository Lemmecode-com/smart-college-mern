import { describe, it, expect } from "vitest";
import {
  validateFeeStructure,
  splitEqually,
  mapBackendError,
} from "../../utils/validateFeeStructure";

describe("validateFeeStructure - Shared Validation Helper", () => {
  const getFutureDate = (daysAhead = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  };

  const getPastDate = (daysBehind = 1) => {
    const d = new Date();
    d.setDate(d.getDate() - daysBehind);
    return d.toISOString().split("T")[0];
  };

  it("1. empty form: flags missing department, course, category, totalFee, and installments", () => {
    const res = validateFeeStructure({}, { requireDepartment: true });
    expect(res.isValid).toBe(false);
    expect(res.errors.department_id).toBe("Please select a department");
    expect(res.errors.course_id).toBe("Please select a course");
    expect(res.errors.category).toBe("Please select a fee category");
    expect(res.errors.totalFee).toBe("Total fee is required and must be greater than 0");
    expect(res.errors.installmentTotal).toBe("At least one payment installment is required");
    expect(res.errorCount).toBe(5);
    expect(res.summaryMessage).toBe("Please fix the 5 errors highlighted below.");
    expect(res.firstErrorField).toBe("department_id");
  });

  it("2. only due date missing: passes other checks and targets the specific installment dueDate", () => {
    const payload = {
      department_id: "dept123",
      course_id: "course123",
      category: "GEN",
      totalFee: 10000,
      installments: [
        { name: "Term 1", amount: 10000, dueDate: "" },
      ],
    };

    const res = validateFeeStructure(payload);
    expect(res.isValid).toBe(false);
    expect(res.errorCount).toBe(1);
    expect(res.errors.installments?.[0]?.dueDate).toBe("Due date is required");
    expect(res.firstErrorField).toBe("installments[0].dueDate");
    expect(res.summaryMessage).toBe("Please fix the 1 error highlighted below.");
  });

  it("3. multiple errors at once: accumulates errors across form fields and installment rows", () => {
    const payload = {
      department_id: "",
      course_id: "",
      category: "OBC",
      totalFee: 50000,
      installments: [
        { name: "", amount: -500, dueDate: "" },
        { name: "Term 2", amount: 0, dueDate: getFutureDate(10) },
      ],
    };

    const res = validateFeeStructure(payload);
    expect(res.isValid).toBe(false);
    expect(res.errors.department_id).toBe("Please select a department");
    expect(res.errors.course_id).toBe("Please select a course");
    expect(res.errors.installments?.[0]?.name).toBe("Installment name is required");
    expect(res.errors.installments?.[0]?.amount).toBe("Amount must be greater than 0");
    expect(res.errors.installments?.[0]?.dueDate).toBe("Due date is required");
    expect(res.errors.installments?.[1]?.amount).toBe("Amount must be greater than 0");
    expect(res.errors.installmentTotal).toContain("Installment total (₹-500) must equal Total Fee (₹50,000)");
    expect(res.errorCount).toBe(7);
  });

  it("4. total mismatch: detects mismatch when installment sum does not equal totalFee", () => {
    const payload = {
      department_id: "dept123",
      course_id: "course123",
      category: "GEN",
      totalFee: 50000,
      installments: [
        { name: "Term 1", amount: 20000, dueDate: getFutureDate(10) },
        { name: "Term 2", amount: 25000, dueDate: getFutureDate(20) },
      ],
    };

    const res = validateFeeStructure(payload);
    expect(res.isValid).toBe(false);
    expect(res.errors.installmentTotal).toBe(
      "Installment total (₹45,000) must equal Total Fee (₹50,000) (Remaining: ₹5,000)"
    );
    expect(res.errors.installments).toBeUndefined();
  });

  it("5. past date: rejects installment due dates in the past", () => {
    const payload = {
      department_id: "dept123",
      course_id: "course123",
      category: "GEN",
      totalFee: 20000,
      installments: [
        { name: "Term 1", amount: 20000, dueDate: getPastDate(2) },
      ],
    };

    const res = validateFeeStructure(payload);
    expect(res.isValid).toBe(false);
    expect(res.errors.installments?.[0]?.dueDate).toBe("Due date cannot be earlier than today");
  });

  it("6. non-sequential dates: installment 2 cannot be on or before installment 1 due date", () => {
    const day5 = getFutureDate(5);
    const day3 = getFutureDate(3);

    const payload = {
      department_id: "dept123",
      course_id: "course123",
      category: "GEN",
      totalFee: 20000,
      installments: [
        { name: "Term 1", amount: 10000, dueDate: day5 },
        { name: "Term 2", amount: 10000, dueDate: day3 },
      ],
    };

    const res = validateFeeStructure(payload);
    expect(res.isValid).toBe(false);
    expect(res.errors.installments?.[1]?.dueDate).toBe(
      "Due date must be later than the previous installment"
    );
  });

  it("7. valid form: passes when all fields are correct, sequential, and sum matches", () => {
    const payload = {
      department_id: "dept123",
      course_id: "course123",
      category: "GEN",
      totalFee: 30000,
      installments: [
        { name: "Installment 1", amount: 15000, dueDate: getFutureDate(10) },
        { name: "Installment 2", amount: 15000, dueDate: getFutureDate(30) },
      ],
    };

    const res = validateFeeStructure(payload);
    expect(res.isValid).toBe(true);
    expect(res.errorCount).toBe(0);
    expect(res.errors).toEqual({});
    expect(res.summaryMessage).toBeNull();
    expect(res.firstErrorField).toBeNull();
  });

  describe("splitEqually", () => {
    it("distributes remainder cent-by-cent ensuring sum matches totalFee exactly", () => {
      // 52700 / 3 -> 17566.67, 17566.67, 17566.66
      const parts = splitEqually(52700, 3);
      expect(parts).toEqual([17566.67, 17566.67, 17566.66]);
      const sum = parts.reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 100) / 100).toBe(52700);
    });

    it("handles even divisions cleanly", () => {
      const parts = splitEqually(30000, 3);
      expect(parts).toEqual([10000, 10000, 10000]);
    });

    it("returns empty array when invalid inputs provided", () => {
      expect(splitEqually(0, 3)).toEqual([]);
      expect(splitEqually(1000, 0)).toEqual([]);
    });
  });

  describe("mapBackendError", () => {
    it("maps backend details.field error for an installment subfield", () => {
      const err = {
        response: {
          data: {
            message: "Installment 1 due date is required",
            details: { field: "installments[0].dueDate" },
          },
        },
      };

      const mapped = mapBackendError(err);
      expect(mapped.field).toBe("installments[0].dueDate");
      expect(mapped.message).toBe("Installment 1 due date is required");
      expect(mapped.errors.installments?.[0]?.dueDate).toBe("Installment 1 due date is required");
    });

    it("maps top-level field error", () => {
      const err = {
        response: {
          data: {
            message: "Installment total must match total fee",
            details: { field: "installmentTotal" },
          },
        },
      };

      const mapped = mapBackendError(err);
      expect(mapped.field).toBe("installmentTotal");
      expect(mapped.errors.installmentTotal).toBe("Installment total must match total fee");
    });
  });
});

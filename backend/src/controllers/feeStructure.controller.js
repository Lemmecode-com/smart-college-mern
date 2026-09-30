const FeeStructure = require("../../src/models/feeStructure.model");
const Course = require("../../src/models/course.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const auditLogService = require("../services/auditLog.service");
const { validateExpiryDate, expiryDateValidatorMessage } = require("../utils/validators");

/**
 * CREATE Fee Structure
 */
exports.createFeeStructure = async (req, res, next) => {
  try {
    const { course_id, category, totalFee, installments } = req.body;

    // Validate course
    const course = await Course.findOne({
      _id: course_id,
      college_id: req.college_id,
    });

    if (!course) {
      throw new AppError(
        "Invalid course for this college",
        404,
        "COURSE_NOT_FOUND",
      );
    }

    // Prevent duplicate
    const exists = await FeeStructure.findOne({
      college_id: req.college_id,
      course_id,
      category,
    });

    if (exists) {
      throw new AppError(
        "Fee structure already exists for this course & category",
        409,
        "DUPLICATE_FEE_STRUCTURE",
      );
    }

    // Validate installments
    const totalInstallmentAmount = installments.reduce(
      (sum, i) => sum + i.amount,
      0,
    );

    if (totalInstallmentAmount !== totalFee) {
      throw new AppError(
        "Installment total must match total fee",
        400,
        "INVALID_INSTALLMENTS",
      );
    }

    for (const inst of installments) {
      if (!validateExpiryDate(inst.dueDate)) {
        throw new AppError(
          "Installment due date cannot be earlier than today",
          400,
          "PAST_DUE_DATE",
        );
      }
    }

    // Auto-assign order based on index if not provided
    const installmentsWithOrder = installments.map((i, idx) => ({
      ...i,
      order: i.order || idx + 1,
    }));

    const feeStructure = await FeeStructure.create({
      college_id: req.college_id,
      course_id,
      category,
      totalFee,
      installments: installmentsWithOrder,
    });

    // 📝 Audit log - Fee structure creation
    auditLogService
      .logFeeStructureCreate(feeStructure, req.user, req)
      .catch((err) => console.error("Audit log failed:", err));

    ApiResponse.created(
      res,
      { feeStructure },
      "Fee structure created successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET ALL Fee Structures (college-wise)
 */
exports.getFeeStructures = async (req, res, next) => {
  try {
    const fees = await FeeStructure.find({
      college_id: req.college_id,
    }).populate("course_id", "name");

    ApiResponse.success(res, { fees }, "Fee structures fetched successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE Fee Structure
 */
exports.updateFeeStructure = async (req, res, next) => {
  try {
    const { feeStructureId } = req.params;
    const { totalFee, installments } = req.body;

    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      college_id: req.college_id,
    });

    if (!feeStructure) {
      throw new AppError(
        "Fee structure not found",
        404,
        "FEE_STRUCTURE_NOT_FOUND",
      );
    }

    // Store old values before update
    const oldFeeStructure = feeStructure.toObject();

    const installmentTotal = installments.reduce((sum, i) => sum + i.amount, 0);

    if (installmentTotal !== totalFee) {
      throw new AppError(
        "Installment total must match total fee",
        400,
        "INVALID_INSTALLMENTS",
      );
    }

    const existingInstallmentsMap = new Map();
    for (const inst of feeStructure.installments) {
      existingInstallmentsMap.set(inst._id.toString(), inst);
    }

    for (const inst of installments) {
      const existingInst = inst._id
        ? existingInstallmentsMap.get(inst._id.toString())
        : null;

      if (existingInst) {
        const oldDueDate = new Date(existingInst.dueDate);
        if (oldDueDate < new Date()) {
          continue;
        }
      }

      if (!validateExpiryDate(inst.dueDate)) {
        throw new AppError(
          "Installment due date cannot be earlier than today",
          400,
          "PAST_DUE_DATE",
        );
      }
    }

    feeStructure.totalFee = totalFee;

    const installmentsWithOrder = installments.map((i, idx) => ({
      ...i,
      order: i.order || idx + 1,
    }));

    feeStructure.installments = installmentsWithOrder;

    await feeStructure.save();

    // ── Synchronize current applicable StudentFee records ──────────────
    // After the FeeStructure is successfully updated, propagate the new
    // totalFee and installment structure to the CURRENT applicable
    // StudentFee of affected students. Historical semester fees are
    // intentionally left untouched.
    try {
      await syncCurrentStudentFeeWithFeeStructure(
        feeStructure,
        oldFeeStructure,
      );
    } catch (syncErr) {
      // Log but do not break the primary update response.
      console.error(
        "[FeeStructure] StudentFee sync failed:",
        syncErr.message,
      );
    }

    // 📝 Audit log - Fee structure update
    auditLogService
      .logFeeStructureUpdate(oldFeeStructure, feeStructure, req.user, req)
      .catch((err) => console.error("Audit log failed:", err));

    ApiResponse.success(
      res,
      { feeStructure },
      "Fee structure updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE Fee Structure
 */
exports.deleteFeeStructure = async (req, res, next) => {
  try {
    const { feeStructureId } = req.params;

    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      college_id: req.college_id,
    });

    if (!feeStructure) {
      throw new AppError(
        "Fee structure not found",
        404,
        "FEE_STRUCTURE_NOT_FOUND",
      );
    }

    // Safety check: prevent deletion of a fee structure still assigned to students.
    // Fee structures are matched to students by course + category (students with
    // category OTHER use the GEN structure during approval), so we only block
    // deletion when a student of the matching category actually holds fees in this
    // course. This replaces the previous course-only check that wrongly blocked
    // deletion of unused category-specific structures.
    const studentIds = await StudentFee.distinct("student_id", {
      college_id: req.college_id,
      course_id: feeStructure.course_id,
    });

    if (studentIds.length > 0) {
      const matchingCategories =
        feeStructure.category === "GEN"
          ? ["GEN", "OTHER"]
          : [feeStructure.category];

      const inUse = await Student.exists({
        _id: { $in: studentIds },
        category: { $in: matchingCategories },
      });

      if (inUse) {
        throw new AppError(
          "Cannot delete fee structure that is currently assigned to students. Please reassign or remove students first.",
          400,
          "FEE_STRUCTURE_IN_USE",
        );
      }
    }

    // 📝 Audit log - Fee structure deletion
    auditLogService
      .logFeeStructureDelete(feeStructure, req.user, req)
      .catch((err) => console.error("Audit log failed:", err));

    await feeStructure.deleteOne();

    ApiResponse.success(res, null, "Fee structure deleted successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Synchronize the CURRENT applicable StudentFee for affected students
 * after a FeeStructure update.
 *
 * Only the current-semester StudentFee is updated. Historical semester
 * fees are intentionally left untouched.
 *
 * @param {Object} feeStructure - The updated FeeStructure document
 * @param {Object} oldFeeStructure - The FeeStructure before update
 */
async function syncCurrentStudentFeeWithFeeStructure(
  feeStructure,
  oldFeeStructure,
) {
  const collegeId = feeStructure.college_id;
  const courseId = feeStructure.course_id;
  const category = feeStructure.category;

  // ── Step 1: Find affected students ─────────────────────────────────
  // A student is "affected" when their category matches the FeeStructure
  // category (with the SAME OTHER→GEN fallback used during approval).
  const matchingCategories =
    category === "GEN" ? ["GEN", "OTHER"] : [category];

  const affectedStudents = await Student.find({
    college_id: collegeId,
    course_id: courseId,
    category: { $in: matchingCategories },
    status: { $in: ["APPROVED", "ENROLLED"] },
  })
    .select("_id currentSemester currentYear category")
    .lean();

  if (affectedStudents.length === 0) {
    return;
  }

  // ── Step 2: For each student, identify the CURRENT applicable StudentFee
  // and synchronize totalFee + installments.
  for (const student of affectedStudents) {
    try {
      // Find the StudentFee linked to the student's CURRENT semester via
      // the most recent ACTIVE PromotionHistory record.
      const currentPromotion = await PromotionHistory.findOne({
        student_id: student._id,
        status: "ACTIVE",
        toSemester: student.currentSemester,
        toAcademicYear: student.currentYear,
        newStudentFeeId: { $ne: null },
      })
        .sort({ promotionDate: -1 })
        .select("newStudentFeeId toSemester toAcademicYear")
        .lean();

      let studentFeeId = null;

      if (currentPromotion && currentPromotion.newStudentFeeId) {
        // Student has been promoted — use the fee linked to the current semester.
        studentFeeId = currentPromotion.newStudentFeeId;
      } else {
        // Student has NOT been promoted — find the initial enrollment fee.
        // This is the StudentFee created during approveStudent() with no
        // matching PromotionHistory.newStudentFeeId.
        const initialFee = await StudentFee.findOne({
          student_id: student._id,
          college_id: collegeId,
          course_id: courseId,
        })
          .sort({ createdAt: 1 })
          .select("_id")
          .lean();

        if (initialFee) {
          // Verify this fee is NOT already linked to a promotion (i.e., it is
          // the initial enrollment fee, not a historical semester fee).
          const linkedPromotion = await PromotionHistory.findOne({
            newStudentFeeId: initialFee._id,
            status: "ACTIVE",
          }).select("_id").lean();

          if (!linkedPromotion) {
            studentFeeId = initialFee._id;
          }
        }
      }

      if (!studentFeeId) {
        continue;
      }

      // ── Step 3: Fetch the StudentFee with its installments ──────────
      const studentFee = await StudentFee.findById(studentFeeId).lean();
      if (!studentFee) {
        continue;
      }

      // ── Step 4: Synchronize totalFee ────────────────────────────────
      // Preserve paidAmount — it is derived from PAID installments.
      const newTotalFee = feeStructure.totalFee;
      if (studentFee.totalFee === newTotalFee) {
        // Even if totalFee is unchanged, installments may have changed.
        // Continue to installment sync below.
      }

      // ── Step 5: Synchronize installments ────────────────────────────
      const existingInstallments = studentFee.installments || [];
      const updatedInstallments = feeStructure.installments || [];

      // Build a map of existing installments by name for safe matching.
      const existingByName = new Map();
      for (const inst of existingInstallments) {
        const key = (inst.name || "").trim().toLowerCase();
        if (!existingByName.has(key)) {
          existingByName.set(key, inst);
        }
      }

      const newInstallmentDocs = [];
      const seenNames = new Set();

      for (const newInst of updatedInstallments) {
        const key = (newInst.name || "").trim().toLowerCase();
        seenNames.add(key);

        const existing = existingByName.get(key);

        if (existing) {
          if (existing.status === "PAID") {
            // Preserve the paid installment completely — do not modify
            // any payment metadata (paidAt, transactionId, etc.).
            newInstallmentDocs.push({
              ...existing,
              amount: existing.amount,
              dueDate: existing.dueDate,
              order: newInst.order || existing.order,
            });
          } else {
            // PENDING installment — update amount/dueDate from FeeStructure.
            newInstallmentDocs.push({
              ...existing,
              name: newInst.name,
              amount: newInst.amount,
              dueDate: newInst.dueDate,
              order: newInst.order || existing.order,
            });
          }
        } else {
          // New installment — add as PENDING.
          newInstallmentDocs.push({
            name: newInst.name,
            amount: newInst.amount,
            dueDate: newInst.dueDate,
            order: newInst.order || seenNames.size,
            status: "PENDING",
          });
        }
      }

      // ── Step 6: Recalculate paidAmount from PAID installments ───────
      const newPaidAmount = newInstallmentDocs
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      // ── Step 7: Update the StudentFee ───────────────────────────────
      await StudentFee.updateOne(
        { _id: studentFeeId },
        {
          $set: {
            totalFee: newTotalFee,
            paidAmount: newPaidAmount,
            installments: newInstallmentDocs,
          },
        },
      );
    } catch (studentErr) {
      // Log per-student failure but continue with other students.
      console.error(
        `[FeeStructure] Sync failed for student ${student._id}:`,
        studentErr.message,
      );
    }
  }
}

/**
 * GET Fee Structure BY ID
 * COLLEGE_ADMIN only
 */
exports.getFeeStructureById = async (req, res) => {
  try {
    const { feeStructureId } = req.params;

    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      college_id: req.college_id,
    }).populate("course_id", "name");

    if (!feeStructure) {
      throw new AppError(
        "Fee structure not found",
        404,
        "FEE_STRUCTURE_NOT_FOUND",
      );
    }

    ApiResponse.success(
      res,
      { feeStructure },
      "Fee structure fetched successfully",
    );
  } catch (error) {
    throw error;
  }
};

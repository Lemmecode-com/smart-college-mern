const FeeStructure = require("../../src/models/feeStructure.model");
const Course = require("../../src/models/course.model");
const StudentFee = require("../../src/models/studentFee.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const auditLogService = require("../services/auditLog.service");

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

    const feeStructure = await FeeStructure.create({
      college_id: req.college_id,
      course_id,
      category,
      totalFee,
      installments,
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

    feeStructure.totalFee = totalFee;
    feeStructure.installments = installments;

    await feeStructure.save();

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

    // Safety check: prevent deletion of fee structure assigned to students
    const inUse = await StudentFee.exists({
      college_id: req.college_id,
      course_id: feeStructure.course_id,
    });

    if (inUse) {
      throw new AppError(
        "Cannot delete fee structure that is currently assigned to students. Please reassign or remove students first.",
        400,
        "FEE_STRUCTURE_IN_USE",
      );
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
 * GET Fee Structure BY ID
 * COLLEGE ADMIN only
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

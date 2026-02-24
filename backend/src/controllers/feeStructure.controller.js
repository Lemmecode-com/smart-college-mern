const FeeStructure = require("../../src/models/feeStructure.model");
const Course = require("../../src/models/course.model");
const AppError = require("../utils/AppError");
// const StudentFee = require("../models/studentFee.model"); // uncomment if exists

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
      throw new AppError("Invalid course for this college", 404, "COURSE_NOT_FOUND");
    }

    // Prevent duplicate
    const exists = await FeeStructure.findOne({
      college_id: req.college_id,
      course_id,
      category,
    });

    if (exists) {
      throw new AppError("Fee structure already exists for this course & category", 409, "DUPLICATE_FEE_STRUCTURE");
    }

    // Validate installments
    const totalInstallmentAmount = installments.reduce(
      (sum, i) => sum + i.amount,
      0
    );

    if (totalInstallmentAmount !== totalFee) {
      throw new AppError("Installment total must match total fee", 400, "INVALID_INSTALLMENTS");
    }

    const feeStructure = await FeeStructure.create({
      college_id: req.college_id,
      course_id,
      category,
      totalFee,
      installments,
    });

    res.status(201).json({
      message: "Fee structure created successfully",
      feeStructure,
    });
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

    res.json(fees);
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
      throw new AppError("Fee structure not found", 404, "FEE_STRUCTURE_NOT_FOUND");
    }

    const installmentTotal = installments.reduce(
      (sum, i) => sum + i.amount,
      0
    );

    if (installmentTotal !== totalFee) {
      throw new AppError("Installment total must match total fee", 400, "INVALID_INSTALLMENTS");
    }

    feeStructure.totalFee = totalFee;
    feeStructure.installments = installments;

    await feeStructure.save();

    res.json({
      message: "Fee structure updated successfully",
      feeStructure,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE Fee Structure
 */
exports.deleteFeeStructure = async (req, res) => {
  try {
    const { feeStructureId } = req.params;

    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      college_id: req.college_id,
    });

    if (!feeStructure) {
      return res.status(404).json({
        message: "Fee structure not found",
      });
    }

    // Optional safety check
    // const inUse = await StudentFee.exists({
    //   college_id: req.college_id,
    //   course_id: feeStructure.course_id,
    // });
    // if (inUse) {
    //   return res.status(400).json({
    //     message: "Fee structure already in use",
    //   });
    // }

    await feeStructure.deleteOne();

    res.json({
      message: "Fee structure deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({
        message: "Fee structure not found",
      });
    }

    res.json(feeStructure);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
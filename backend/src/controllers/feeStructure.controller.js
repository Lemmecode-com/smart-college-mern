const FeeStructure = require("../models/feeStructure.model");
const Course = require("../models/course.model");
// const StudentFee = require("../models/studentFee.model"); // uncomment if exists

/**
 * CREATE Fee Structure
 */
exports.createFeeStructure = async (req, res) => {
  try {
    const { course_id, category, totalFee, installments } = req.body;

    // Validate course
    const course = await Course.findOne({
      _id: course_id,
      college_id: req.college_id,
    });

    if (!course) {
      return res.status(400).json({
        message: "Invalid course for this college",
      });
    }

    // Prevent duplicate
    const exists = await FeeStructure.findOne({
      college_id: req.college_id,
      course_id,
      category,
    });

    if (exists) {
      return res.status(400).json({
        message: "Fee structure already exists for this course & category",
      });
    }

    // Validate installments
    const totalInstallmentAmount = installments.reduce(
      (sum, i) => sum + i.amount,
      0
    );

    if (totalInstallmentAmount !== totalFee) {
      return res.status(400).json({
        message: "Installment total must match total fee",
      });
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
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ALL Fee Structures (college-wise)
 */
exports.getFeeStructures = async (req, res) => {
  try {
    const fees = await FeeStructure.find({
      college_id: req.college_id,
    }).populate("course_id", "name");

    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET Fee Structure BY ID ✅ FIXED
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

/**
 * UPDATE Fee Structure
 */
exports.updateFeeStructure = async (req, res) => {
  try {
    const { feeStructureId } = req.params;
    const { totalFee, installments } = req.body;

    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      college_id: req.college_id,
    });

    if (!feeStructure) {
      return res.status(404).json({
        message: "Fee structure not found",
      });
    }

    const installmentTotal = installments.reduce(
      (sum, i) => sum + i.amount,
      0
    );

    if (installmentTotal !== totalFee) {
      return res.status(400).json({
        message: "Installment total must match total fee",
      });
    }

    feeStructure.totalFee = totalFee;
    feeStructure.installments = installments;

    await feeStructure.save();

    res.json({
      message: "Fee structure updated successfully",
      feeStructure,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

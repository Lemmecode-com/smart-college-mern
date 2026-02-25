const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const PromotionHistory = require("../models/promotionHistory.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");

/**
 * GET all students with their fee status and promotion eligibility
 * Only accessible by COLLEGE_ADMIN
 */
exports.getPromotionEligibleStudents = async (req, res, next) => {
  try {
    const { course_id, currentSemester } = req.query;

    // Build filter
    const filter = {
      college_id: req.college_id,
      status: "APPROVED",
      isPromotionEligible: true,
    };

    if (course_id) {
      filter.course_id = course_id;
    }

    if (currentSemester) {
      filter.currentSemester = parseInt(currentSemester);
    }

    // Get all eligible students
    const students = await Student.find(filter)
      .populate("course_id", "name code")
      .populate("department_id", "name code")
      .sort({ currentSemester: 1, fullName: 1 });

    // Attach fee information for each student
    const studentsWithFee = await Promise.all(
      students.map(async (student) => {
        const fee = await StudentFee.findOne({
          student_id: student._id,
        }).select("totalFee paidAmount installments");

        // Calculate fee status
        let feeStatus = "PENDING";
        let pendingAmount = 0;
        let allInstallmentsPaid = false;

        if (fee) {
          pendingAmount = fee.totalFee - fee.paidAmount;
          
          if (fee.paidAmount >= fee.totalFee) {
            feeStatus = "FULLY_PAID";
            allInstallmentsPaid = true;
          } else if (fee.paidAmount > 0) {
            feeStatus = "PARTIALLY_PAID";
          }

          // Check if all installments are paid
          if (fee.installments && fee.installments.length > 0) {
            allInstallmentsPaid = fee.installments.every(
              (inst) => inst.status === "PAID"
            );
          }
        }

        return {
          ...student.toObject(),
          fee: fee || {
            totalFee: 0,
            paidAmount: 0,
            pendingAmount: 0,
            installments: [],
          },
          feeStatus,
          pendingAmount,
          allInstallmentsPaid,
        };
      })
    );

    // Group by semester for better UI presentation
    const groupedBySemester = studentsWithFee.reduce((acc, student) => {
      const sem = student.currentSemester;
      if (!acc[sem]) {
        acc[sem] = [];
      }
      acc[sem].push(student);
      return acc;
    }, {});

    res.json({
      success: true,
      count: studentsWithFee.length,
      students: studentsWithFee,
      groupedBySemester,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET individual student's promotion details
 */
exports.getStudentPromotionDetails = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "APPROVED",
    })
      .populate("course_id", "name code")
      .populate("department_id", "name code");

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Get fee details
    const fee = await StudentFee.findOne({
      student_id: studentId,
    }).select("totalFee paidAmount installments");

    // Get promotion history
    const promotionHistory = await PromotionHistory.find({
      student_id: studentId,
      status: "ACTIVE",
    }).sort({ promotionDate: -1 });

    // Calculate fee status
    let feeStatus = "PENDING";
    let pendingAmount = 0;
    let allInstallmentsPaid = false;

    if (fee) {
      pendingAmount = fee.totalFee - fee.paidAmount;

      if (fee.paidAmount >= fee.totalFee) {
        feeStatus = "FULLY_PAID";
        allInstallmentsPaid = true;
      } else if (fee.paidAmount > 0) {
        feeStatus = "PARTIALLY_PAID";
      }

      if (fee.installments && fee.installments.length > 0) {
        allInstallmentsPaid = fee.installments.every(
          (inst) => inst.status === "PAID"
        );
      }
    }

    // Calculate next semester
    const nextSemester = student.currentSemester + 1;
    const maxSemester = 8; // Assuming 4-year program with 2 semesters per year
    const canPromote = nextSemester <= maxSemester;

    res.json({
      success: true,
      student: {
        ...student.toObject(),
        fee: fee || {
          totalFee: 0,
          paidAmount: 0,
          installments: [],
        },
        feeStatus,
        pendingAmount,
        allInstallmentsPaid,
        nextSemester,
        canPromote,
        maxSemester,
      },
      promotionHistory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PROMOTE STUDENT to next semester
 * Only accessible by COLLEGE_ADMIN
 * 
 * Logic:
 * 1. Check if student exists and is approved
 * 2. Check fee payment status
 * 3. If all installments are paid OR admin overrides, allow promotion
 * 4. Update student's semester and academic year
 * 5. Create promotion history record
 */
exports.promoteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { remarks, overrideFeeCheck } = req.body;

    // 1. Find student
    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "APPROVED",
    })
      .populate("course_id", "name code")
      .populate("department_id", "name code");

    if (!student) {
      throw new AppError("Student not found or not approved", 404, "STUDENT_NOT_FOUND");
    }

    // 2. Check if already at max semester
    const maxSemester = 8; // Adjust based on your program structure
    if (student.currentSemester >= maxSemester) {
      throw new AppError(
        "Student is already in the final semester",
        400,
        "ALREADY_FINAL_SEMESTER"
      );
    }

    // 3. Get fee details
    const fee = await StudentFee.findOne({
      student_id: studentId,
    });

    let feeStatus = "PENDING";
    let allInstallmentsPaid = false;
    let pendingAmount = 0;

    if (fee) {
      pendingAmount = fee.totalFee - fee.paidAmount;

      if (fee.paidAmount >= fee.totalFee) {
        feeStatus = "FULLY_PAID";
        allInstallmentsPaid = true;
      } else if (fee.paidAmount > 0) {
        feeStatus = "PARTIALLY_PAID";
      }

      if (fee.installments && fee.installments.length > 0) {
        allInstallmentsPaid = fee.installments.every(
          (inst) => inst.status === "PAID"
        );
      }
    }

    // 4. Check fee payment (can be overridden by admin)
    if (!allInstallmentsPaid && !overrideFeeCheck) {
      throw new AppError(
        `Student has pending fees of ₹${pendingAmount}. Please clear all dues or use override option.`,
        400,
        "FEE_PENDING"
      );
    }

    // 5. Calculate new semester and academic year
    const fromSemester = student.currentSemester;
    const toSemester = fromSemester + 1;
    
    // Calculate academic year based on semester
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11
    const academicYearStart = currentMonth >= 6 ? currentYear : currentYear - 1;
    
    // Parse current academic year
    const [currentAcademicYearStart] = student.currentAcademicYear.split('-').map(Number);
    
    // Calculate new academic year (increment if moving to odd semester after even)
    let newAcademicYearStart = currentAcademicYearStart;
    if (fromSemester % 2 === 0) {
      // Moving from even to odd semester (e.g., 2 -> 3, 4 -> 5)
      newAcademicYearStart = currentAcademicYearStart + 1;
    }
    const newAcademicYear = `${newAcademicYearStart}-${newAcademicYearStart + 1}`;

    // 6. Update student record
    student.currentSemester = toSemester;
    student.currentAcademicYear = newAcademicYear;
    student.lastPromotionDate = new Date();
    student.isPromotionEligible = toSemester < maxSemester;

    await student.save();

    // 7. Create promotion history record
    const promotionRecord = await PromotionHistory.create({
      student_id: student._id,
      college_id: req.college_id,
      course_id: student.course_id,
      fromSemester,
      toSemester,
      fromAcademicYear: student.currentAcademicYear,
      toAcademicYear: newAcademicYear,
      feeStatus,
      totalFee: fee ? fee.totalFee : 0,
      paidAmount: fee ? fee.paidAmount : 0,
      pendingAmount,
      promotedBy: req.user.id,
      promotedByName: req.user.name,
      promotionDate: new Date(),
      remarks: remarks || null,
      status: "ACTIVE",
    });

    // 8. Add to student's promotion history array
    student.promotionHistory.push(promotionRecord._id);
    await student.save();

    res.json({
      success: true,
      message: `Student promoted successfully from Semester ${fromSemester} to Semester ${toSemester}`,
      promotion: {
        fromSemester,
        toSemester,
        fromAcademicYear: student.currentAcademicYear,
        toAcademicYear: newAcademicYear,
        feeStatus,
        pendingAmount,
        promotedBy: req.user.name,
        promotionDate: promotionRecord.promotionDate,
        remarks,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * BULK PROMOTE multiple students at once
 * Only accessible by COLLEGE_ADMIN
 */
exports.bulkPromoteStudents = async (req, res, next) => {
  try {
    const { studentIds, remarks, overrideFeeCheck } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError("Please provide valid student IDs", 400, "INVALID_STUDENT_IDS");
    }

    const results = {
      success: [],
      failed: [],
    };

    // Process each student
    for (const studentId of studentIds) {
      try {
        const student = await Student.findOne({
          _id: studentId,
          college_id: req.college_id,
          status: "APPROVED",
        });

        if (!student) {
          results.failed.push({
            studentId,
            reason: "Student not found or not approved",
          });
          continue;
        }

        const maxSemester = 8;
        if (student.currentSemester >= maxSemester) {
          results.failed.push({
            studentId,
            reason: "Already in final semester",
          });
          continue;
        }

        // Check fee
        const fee = await StudentFee.findOne({ student_id: studentId });
        let allInstallmentsPaid = false;
        let feeStatus = "PENDING";
        let pendingAmount = 0;

        if (fee) {
          pendingAmount = fee.totalFee - fee.paidAmount;
          
          if (fee.paidAmount >= fee.totalFee) {
            feeStatus = "FULLY_PAID";
            allInstallmentsPaid = true;
          } else if (fee.paidAmount > 0) {
            feeStatus = "PARTIALLY_PAID";
          }

          if (fee.installments && fee.installments.length > 0) {
            allInstallmentsPaid = fee.installments.every(
              (inst) => inst.status === "PAID"
            );
          }
        }

        if (!allInstallmentsPaid && !overrideFeeCheck) {
          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: `Pending fees: ₹${pendingAmount}`,
          });
          continue;
        }

        // Promote
        const fromSemester = student.currentSemester;
        const toSemester = fromSemester + 1;

        const [currentAcademicYearStart] = student.currentAcademicYear.split('-').map(Number);
        let newAcademicYearStart = currentAcademicYearStart;
        if (fromSemester % 2 === 0) {
          newAcademicYearStart = currentAcademicYearStart + 1;
        }
        const newAcademicYear = `${newAcademicYearStart}-${newAcademicYearStart + 1}`;

        student.currentSemester = toSemester;
        student.currentAcademicYear = newAcademicYear;
        student.lastPromotionDate = new Date();
        student.isPromotionEligible = toSemester < maxSemester;
        await student.save();

        const promotionRecord = await PromotionHistory.create({
          student_id: student._id,
          college_id: req.college_id,
          course_id: student.course_id,
          fromSemester,
          toSemester,
          fromAcademicYear: student.currentAcademicYear,
          toAcademicYear: newAcademicYear,
          feeStatus,
          totalFee: fee ? fee.totalFee : 0,
          paidAmount: fee ? fee.paidAmount : 0,
          pendingAmount,
          promotedBy: req.user.id,
          promotedByName: req.user.name,
          promotionDate: new Date(),
          remarks: remarks || `Bulk promotion - ${new Date().toLocaleDateString()}`,
          status: "ACTIVE",
        });

        student.promotionHistory.push(promotionRecord._id);
        await student.save();

        results.success.push({
          studentId,
          studentName: student.fullName,
          fromSemester,
          toSemester,
        });
      } catch (error) {
        results.failed.push({
          studentId,
          reason: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk promotion completed: ${results.success.length} promoted, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET promotion history for all students in the college
 */
exports.getCollegePromotionHistory = async (req, res, next) => {
  try {
    const { semester, course_id, limit = 50 } = req.query;

    const filter = {
      college_id: req.college_id,
      status: "ACTIVE",
    };

    const promotions = await PromotionHistory.find(filter)
      .populate("student_id", "fullName email currentSemester")
      .populate("course_id", "name code")
      .populate("promotedBy", "name email")
      .sort({ promotionDate: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: promotions.length,
      promotions,
    });
  } catch (error) {
    next(error);
  }
};

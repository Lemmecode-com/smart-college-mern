const StudentFee = require("../models/studentFee.model");

/**
 * COLLEGE ADMIN: Payment report
 */
exports.getCollegePaymentReport = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const fees = await StudentFee.find({
      college_id: collegeId
    })
      .populate("student_id", "fullName email")
      .populate("course_id", "name");

    let totalCollected = 0;

    const report = fees.map(fee => {
      totalCollected += fee.paidAmount;

      return {
        student: fee.student_id,
        course: fee.course_id,
        totalFee: fee.totalFee,
        paidAmount: fee.paidAmount,
        pendingAmount: fee.totalFee - fee.paidAmount,
        installments: fee.installments
      };
    });

    res.json({
      totalCollected,
      totalStudents: report.length,
      report
    });

  } catch (error) {
    console.error("Admin payment report error:", error);
    res.status(500).json({
      message: "Failed to fetch payment report"
    });
  }
};

const StudentFee = require("../models/studentFee.model");

exports.getStudentFeeDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1️⃣ Fetch student fee record
    const studentFee = await StudentFee.findOne({
      student_id: studentId
    })
      .populate("college_id", "name code")
      .populate("course_id", "name code");

    if (!studentFee) {
      return res.status(404).json({
        message: "Fee details not found"
      });
    }

    // 2️⃣ Calculate totals
    let totalPaid = 0;

    studentFee.installments.forEach((inst) => {
      if (inst.status === "PAID") {
        totalPaid += inst.amount;
      }
    });

    const totalFee = studentFee.totalFee;
    const totalDue = totalFee - totalPaid;

    // 3️⃣ Prepare dashboard response
    res.json({
      studentId,
      college: studentFee.college_id,
      course: studentFee.course_id,
      totalFee,
      totalPaid,
      totalDue,
      installments: studentFee.installments
    });

  } catch (error) {
    console.error("Student fee dashboard error:", error);
    res.status(500).json({
      message: "Failed to fetch fee dashboard"
    });
  }
};

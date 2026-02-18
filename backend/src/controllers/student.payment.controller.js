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

exports.getStudentReceipt = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { installmentId } = req.params;

    const studentFee = await StudentFee.findOne({
      student_id: studentId,
      "installments._id": installmentId,
    })
      .populate("student_id")
      .populate({
        path: "course_id",
        populate: {
          path: "department_id", // 🔥 IMPORTANT
          model: "Department",
        },
      })
      .populate("college_id");

    if (!studentFee) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    const installment = studentFee.installments.id(installmentId);

    if (!installment || installment.status !== "PAID") {
      return res.status(400).json({
        message: "Installment not paid or invalid receipt",
      });
    }

    const receiptNumber = `RCPT-${installment._id
      .toString()
      .slice(-6)
      .toUpperCase()}-${new Date().getFullYear()}`;

    return res.json({
      receiptNumber,
      transactionId: installment.transactionId,
      installmentName: installment.name,
      amount: installment.amount,
      paidAt: installment.paidAt,
      status: "SUCCESS",

      student: {
        name: studentFee.student_id.fullName,
        email: studentFee.student_id.email,
        enrollment: studentFee.student_id.enrollmentNumber,
        department:
          studentFee.course_id?.department_id?.name || "N/A", // ✅ FIXED
        course: studentFee.course_id.name,
        academicYear: "2025-2026",
      },

      college: {
        name: studentFee.college_id.name,
        address: studentFee.college_id.address,
        email: studentFee.college_id.email,
        contact: studentFee.college_id.contactNumber,
      },

      summary: {
        totalFee: studentFee.totalFee,
        totalPaid: studentFee.paidAmount,
        remaining:
          studentFee.totalFee - studentFee.paidAmount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

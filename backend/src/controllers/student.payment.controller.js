const StudentFee = require("../models/studentFee.model");
const { createPhonePePayload } = require("../services/phonepe.service");

exports.createPhonePeOrder = async (req, res) => {
  try {
    const { installmentName } = req.body;
    const studentId = req.user.id;

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) {
      return res.status(404).json({ message: "Student fee record not found" });
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName && i.status !== "PAID"
    );

    if (!installment) {
      return res.status(400).json({ message: "Invalid installment" });
    }

    const transactionId = `TXN_${Date.now()}`;

    const { base64Payload, checksum } = createPhonePePayload({
      transactionId,
      amount: installment.amount,
      redirectUrl: "http://localhost:3000/payment-success",
    });

    res.json({
      paymentUrl: `${process.env.PHONEPE_BASE_URL}/pg/v1/pay`,
      payload: base64Payload,
      checksum,
    });
  } catch (err) {
    console.error("PhonePe order error:", err);
    res.status(500).json({ message: "Failed to create PhonePe order" });
  }
};


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

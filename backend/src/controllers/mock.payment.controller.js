const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const AppError = require("../utils/AppError");

exports.mockPaymentSuccess = async (req, res, next) => {
  try {
    const userId = req.user.id;  // This is User._id
    const collegeId = req.college_id;
    const { installmentName } = req.body;

    // ✅ First find the student by user_id
    const student = await Student.findOne({
      user_id: userId,
      college_id: collegeId
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Find student fee record using student._id
    const studentFee = await StudentFee.findOne({ 
      student_id: student._id  // ✅ Use student._id
    });
    
    if (!studentFee) {
      throw new AppError("Student fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment) {
      throw new AppError("Invalid installment", 404, "INSTALLMENT_NOT_FOUND");
    }

    if (installment.status === "PAID") {
      return res.json({
        message: "Installment already paid",
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount
      });
    }

    // ✅ Mark installment paid
    installment.status = "PAID";
    installment.paidAt = new Date();
    installment.paymentGateway = "MOCK";
    installment.transactionId = `MOCK_TXN_${Date.now()}`;

    // ✅ Recalculate paid amount
    studentFee.paidAmount = studentFee.installments
      .filter(i => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    await studentFee.save();

    const remainingAmount = studentFee.totalFee - studentFee.paidAmount;

    res.json({
      message: "Mock payment successful",
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount,
      installment
    });
  } catch (err) {
    next(err);
  }
};


// const StudentFee = require("../models/studentFee.model");

// exports.mockPaymentSuccess = async (req, res) => {
//   try {
//     const studentId = req.user.id;
//     const { installmentName } = req.body;

//     const studentFee = await StudentFee.findOne({ student_id: studentId });
//     if (!studentFee) {
//       return res.status(404).json({ message: "Student fee record not found" });
//     }

//     const installment = studentFee.installments.find(
//       (i) => i.name === installmentName
//     );

//     if (!installment) {
//       return res.status(400).json({ message: "Invalid installment" });
//     }

//     if (installment.status === "PAID") {
//       return res.json({ message: "Installment already paid" });
//     }

//     installment.status = "PAID";
//     installment.paidAt = new Date();
//     installment.paymentGateway = "MOCK";
//     installment.transactionId = `MOCK_TXN_${Date.now()}`;

//     await studentFee.save();

//     res.json({
//       message: "Mock payment successful",
//       installment,
//     });
//   } catch (err) {
//     console.error("Mock payment error:", err);
//     res.status(500).json({ message: "Mock payment failed" });
//   }
// };

const StudentFee = require("../models/studentFee.model");

exports.mockPaymentSuccess = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { installmentName } = req.body;

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) {
      return res.status(404).json({ message: "Student fee record not found" });
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment) {
      return res.status(400).json({ message: "Invalid installment" });
    }

    if (installment.status === "PAID") {
      return res.json({
        message: "Installment already paid",
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
      });
    }

    // ✅ Mark installment paid
    installment.status = "PAID";
    installment.paidAt = new Date();
    installment.paymentGateway = "MOCK";
    installment.transactionId = `MOCK_TXN_${Date.now()}`;

    // ✅ Recalculate paid amount
    studentFee.paidAmount = studentFee.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    await studentFee.save();

    const remainingAmount = studentFee.totalFee - studentFee.paidAmount;

    res.json({
      message: "Mock payment successful",
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount,
      installment,
    });
  } catch (err) {
    console.error("Mock payment error:", err);
    res.status(500).json({ message: "Mock payment failed" });
  }
};

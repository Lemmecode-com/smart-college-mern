const StudentFee = require("../models/studentFee.model");
const razorpay = require("../services/razorpay.service");
const crypto = require("crypto");

/**
 * STUDENT: Create Razorpay order for an installment
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const student = req.student;
    const { installmentName } = req.body;

    if (!installmentName) {
      return res.status(400).json({
        message: "Installment name is required"
      });
    }

    // 1️⃣ Fetch student fee record
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
      college_id: student.college_id
    });

    if (!studentFee) {
      return res.status(404).json({
        message: "Student fee record not found"
      });
    }

    // 2️⃣ Find pending installment
    const installment = studentFee.installments.find(
      i => i.name === installmentName
    );

    if (!installment) {
      return res.status(404).json({
        message: "Installment not found"
      });
    }

    if (installment.status === "PAID") {
      return res.status(400).json({
        message: "This installment is already paid"
      });
    }

    // 3️⃣ Create Razorpay order
    const order = await razorpay.orders.create({
      amount: installment.amount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `stu_${student._id}_${installment.name}`,
      notes: {
        studentId: student._id.toString(),
        installment: installment.name
      }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      installmentName: installment.name,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error("Create Razorpay order error:", error);
    res.status(500).json({
      message: "Failed to create payment order"
    });
  }
};



/**
 * STUDENT: Verify Razorpay payment
 */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const student = req.student;

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      installmentName
    } = req.body;

    if (
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature ||
      !installmentName
    ) {
      return res.status(400).json({
        message: "Incomplete payment verification data"
      });
    }

    // 1️⃣ Generate expected signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification failed"
      });
    }

    // 2️⃣ Fetch student fee record
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
      college_id: student.college_id
    });

    if (!studentFee) {
      return res.status(404).json({
        message: "Student fee record not found"
      });
    }

    // 3️⃣ Find installment
    const installment = studentFee.installments.find(
      i => i.name === installmentName
    );

    if (!installment) {
      return res.status(404).json({
        message: "Installment not found"
      });
    }

    if (installment.status === "PAID") {
      return res.status(400).json({
        message: "Installment already marked as paid"
      });
    }

    // 4️⃣ Mark installment as PAID
    installment.status = "PAID";
    installment.razorpayPaymentId = razorpay_payment_id;
    installment.paidAt = new Date();

    studentFee.paidAmount += installment.amount;

    await studentFee.save();

    res.json({
      message: "Payment verified successfully",
      installment: {
        name: installment.name,
        amount: installment.amount,
        status: installment.status
      },
      paidAmount: studentFee.paidAmount,
      pendingAmount: studentFee.totalFee - studentFee.paidAmount
    });

  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      message: "Internal server error during payment verification"
    });
  }
};



/**
 * STUDENT: Fee dashboard
 */
exports.getStudentFeeDashboard = async (req, res) => {
  try {
    const student = req.student;

    const studentFee = await StudentFee.findOne({
      student_id: student._id,
      college_id: student.college_id
    });

    if (!studentFee) {
      return res.status(404).json({
        message: "Fee record not found"
      });
    }

    res.json({
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      pendingAmount: studentFee.totalFee - studentFee.paidAmount,
      installments: studentFee.installments
    });

  } catch (error) {
    console.error("Student fee dashboard error:", error);
    res.status(500).json({
      message: "Failed to fetch fee dashboard"
    });
  }
};

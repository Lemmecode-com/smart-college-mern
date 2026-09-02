const Student = require("../models/student.model");
const User = require("../models/user.model");
const StudentFee = require("../models/studentFee.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const {
  getStripeInstance,
  getCollegeStripeConfig,
} = require("../services/collegeStripe.service");
const {
  sendPaymentReceiptEmail,
} = require("../services/email.service");
const logger = require("../utils/logger");

function normalizeStatus(status) {
  return String(status || "").toUpperCase();
}

function isEnrolledStatus(status) {
  return ["APPROVED", "ENROLLED", "OFFER_MADE", "SEAT_CONFIRMED"].includes(normalizeStatus(status));
}

function getStatusLabel(status) {
  switch (normalizeStatus(status)) {
    case "APPROVED":
      return "Active";
    case "ENROLLED":
      return "Enrolled";
    case "OFFER_MADE":
      return "Offer Made";
    case "SEAT_CONFIRMED":
      return "Seat Confirmed";
    default:
      return normalizeStatus(status) || "Unknown";
  }
}

/**
 * GET /api/parent/children
 * List all students linked to the parent
 */
exports.getChildren = async (req, res, next) => {
  try {
    const studentIds = req.linkedStudentIds;
    if (!studentIds || studentIds.length === 0) {
      return res.json({
        success: true,
        children: [], // Changed from data to children to match frontend expectation
        message: "No students linked to this parent",
      });
    }

    const students = await Student.find({ _id: { $in: studentIds } })
      .select("fullName email mobileNumber enrollmentNumber status department_id course_id currentSemester")
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .sort({ fullName: 1 });

    res.json({
      success: true,
      children: students,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parent/students/search
 * Search students in the same college for parent linking
 * Query: ?q=searchTerm
 */
exports.searchStudentsForLinking = async (req, res, next) => {
  try {
    const { q } = req.query;
    const collegeId = req.college_id;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.json({
        success: true,
        students: [],
        message: "Enter at least 2 characters to search",
      });
    }

    const searchTerm = q.trim();
    const linkedIds = req.linkedStudentIds || [];

    const students = await Student.find({
      college_id: collegeId,
      $or: [
        { fullName: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { enrollmentNumber: { $regex: searchTerm, $options: "i" } },
        { mobileNumber: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("fullName email mobileNumber enrollmentNumber status course_id currentSemester")
      .populate("course_id", "name code")
      .limit(20)
      .sort({ fullName: 1 });

    const results = students.map((s) => ({
      _id: s._id,
      fullName: s.fullName,
      email: s.email,
      mobileNumber: s.mobileNumber,
      enrollmentNumber: s.enrollmentNumber,
      status: s.status,
      courseName: s.course_id?.name,
      courseCode: s.course_id?.code,
      currentSemester: s.currentSemester,
      alreadyLinked: linkedIds.includes(s._id.toString()),
    }));

    res.json({
      success: true,
      students: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parent/student/:studentId/profile
 * Get a specific student's profile (must be linked)
 */
exports.getChildProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const linkedIds = req.linkedStudentIds;

    // Verify student is linked
    if (!linkedIds.includes(studentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    const student = await Student.findById(studentId)
      .populate("department_id", "name code")
      .populate("course_id", "name");

    if (!student) {
      return next(new AppError("Student not found", 404, "STUDENT_NOT_FOUND"));
    }

    res.json({
      success: true,
      data: {
        ...student.toObject(),
        fullName: student.fullName,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parent/student/:studentId/attendance
 * Get attendance records for a linked student
 */
exports.getChildAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const linkedIds = req.linkedStudentIds;

    if (!linkedIds.includes(studentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return next(new AppError("Student not found", 404, "STUDENT_NOT_FOUND"));
    }

    const records = await AttendanceRecord.aggregate([
      {
        $match: {
          student_id: new mongoose.Types.ObjectId(studentId),
          college_id: req.college_id,
        },
      },
      {
        $lookup: {
          from: "attendancesessions",
          localField: "session_id",
          foreignField: "_id",
          as: "session",
        },
      },
      { $unwind: { path: "$session", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subjects",
          localField: "session.subject_id",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },
      {
        $sort: { "session.lectureDate": -1 },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          date: "$session.lectureDate",
          subject: "$subject.name",
          subjectCode: "$subject.code",
          sessionType: { $ifNull: ["$session.slotSnapshot.slotType", "Regular"] },
          slotDay: { $ifNull: ["$session.slotSnapshot.day", ""] },
          slotStartTime: { $ifNull: ["$session.slotSnapshot.startTime", ""] },
          slotEndTime: { $ifNull: ["$session.slotSnapshot.endTime", ""] },
          room: { $ifNull: ["$session.slotSnapshot.room", ""] },
          lectureNumber: "$session.lectureNumber",
        },
      },
    ]);

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parent/student/:studentId/fees
 * Get fee details and payment history for a linked student
 */
exports.getChildFees = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const linkedIds = req.linkedStudentIds;

    if (!linkedIds.includes(studentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return next(new AppError("Student not found", 404, "STUDENT_NOT_FOUND"));
    }

    const feeRecord = await StudentFee.findOne({ student_id: studentId })
      .populate("course_id", "name");

    if (!feeRecord) {
      return res.json({
        success: true,
        data: null,
        message: "No fee record found for this student",
      });
    }
    const basic = feeRecord.toObject ? feeRecord.toObject() : feeRecord;
    const data = {
      ...basic,
      outstandingAmount: (feeRecord.totalFee || 0) - (feeRecord.paidAmount || 0),
      totalFee: basic.totalFee,
      paidAmount: basic.paidAmount,
    };

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/parent/student/:studentId/payments/create-order
 * Create a payment order for a linked student's installment
 */
exports.createParentPaymentOrder = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { installmentName } = req.body;
    const userId = req.user.id;
    const collegeId = req.college_id;

    if (!req.linkedStudentIds.includes(studentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    const student = await Student.findOne({
      _id: studentId,
      college_id: collegeId,
    });

    if (!student) {
      return next(new AppError("Student not found", 404, "STUDENT_NOT_FOUND"));
    }

    const studentFee = await StudentFee.findOne({
      student_id: student._id,
    });

    if (!studentFee) {
      return next(new AppError("Student fee record not found", 404, "FEE_RECORD_NOT_FOUND"));
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName && i.status === "PENDING",
    );

    if (!installment) {
      return next(new AppError("Invalid or already paid installment", 404, "INSTALLMENT_NOT_FOUND"));
    }

    const stripe = await getStripeInstance(collegeId);
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is required for Stripe payment redirects.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `College Fee - ${installment.name}`,
            },
            unit_amount: installment.amount * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/parent/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/parent/payment-cancel`,
      metadata: {
        studentId: student._id.toString(),
        collegeId: collegeId.toString(),
        installmentName,
        studentFeeId: studentFee._id.toString(),
        installmentId: installment._id.toString(),
        paidByParent: userId.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    installment.stripeSessionId = session.id;
    installment.paymentAttemptAt = new Date();
    await studentFee.save();

    logger.logInfo("Parent payment order created", {
      parentId: userId,
      studentId: student._id,
      installmentName,
      sessionId: session.id,
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000),
    });
  } catch (error) {
    logger.logError("Parent payment order creation failed", {
      error: error.message,
    });
    next(error);
  }
};

/**
 * POST /api/parent/payments/confirm
 * Confirm Stripe payment for a parent payment
 */
exports.confirmParentPayment = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;
    const collegeId = req.college_id;

    const stripe = await getStripeInstance(collegeId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return next(new AppError("Payment not completed", 400, "PAYMENT_NOT_COMPLETED"));
    }

    const { installmentName, studentId: metadataStudentId } = session.metadata;

    if (!metadataStudentId) {
      return next(new AppError("Invalid session metadata", 400, "INVALID_SESSION"));
    }

    if (!req.linkedStudentIds.includes(metadataStudentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    const studentFee = await StudentFee.findOne({ student_id: metadataStudentId });

    if (!studentFee) {
      return next(new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND"));
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment) {
      return next(new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND"));
    }

    if (installment.status === "PAID") {
      studentFee.paidAmount = studentFee.installments
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + i.amount, 0);

      return res.json({
        success: true,
        alreadyProcessed: true,
        installment: {
          _id: installment._id,
          installmentName: installment.name,
          amount: installment.amount,
          paidAt: installment.paidAt,
          transactionId: installment.transactionId,
          paymentGateway: installment.paymentGateway,
          status: installment.status,
        },
        totalFee: studentFee.totalFee,
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
      });
    }

    const updateResult = await StudentFee.updateOne(
      { _id: studentFee._id, "installments._id": installment._id, "installments.status": "PENDING" },
      {
        $set: {
          "installments.$.status": "PAID",
          "installments.$.paidAt": new Date(),
          "installments.$.transactionId": session.payment_intent,
          "installments.$.paymentGateway": "STRIPE",
          "installments.$.stripeSessionId": sessionId,
          "installments.$.paidByParent": userId,
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      const latestFee = await StudentFee.findById(studentFee._id);
      const latestInstallment = latestFee.installments.id(installment._id);
      latestFee.paidAmount = latestFee.installments
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + i.amount, 0);

      return res.json({
        success: true,
        alreadyProcessed: true,
        processedBy: "webhook",
        installment: {
          _id: latestInstallment._id,
          installmentName: latestInstallment.name,
          amount: latestInstallment.amount,
          paidAt: latestInstallment.paidAt,
          transactionId: latestInstallment.transactionId,
          paymentGateway: latestInstallment.paymentGateway,
          status: latestInstallment.status,
        },
        totalFee: latestFee.totalFee,
        paidAmount: latestFee.paidAmount,
        remainingAmount: latestFee.totalFee - latestFee.paidAmount,
      });
    }

    const updatedFee = await StudentFee.findById(studentFee._id);
    const updatedInstallment = updatedFee.installments.id(installment._id);
    updatedFee.paidAmount = updatedFee.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);
    await updatedFee.save();

    res.json({
      success: true,
      processedBy: "confirm-endpoint",
      installment: {
        _id: updatedInstallment._id,
        installmentName: updatedInstallment.name,
        amount: updatedInstallment.amount,
        paidAt: updatedInstallment.paidAt,
        transactionId: updatedInstallment.transactionId,
        paymentGateway: updatedInstallment.paymentGateway,
        status: updatedInstallment.status,
      },
      totalFee: updatedFee.totalFee,
      paidAmount: updatedFee.paidAmount,
      remainingAmount: updatedFee.totalFee - updatedFee.paidAmount,
    });
  } catch (error) {
    logger.logError("Parent payment confirmation failed", {
      error: error.message,
    });
    next(error);
  }
};

/**
 * GET /api/parent/payments/status
 * Check payment status for a parent payment session
 */
exports.getParentPaymentStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const studentFee = await StudentFee.findOne({
      "installments.stripeSessionId": sessionId,
    });

    if (!studentFee) {
      return res.json({ status: "PENDING" });
    }

    const installment = studentFee.installments.find((i) => i.stripeSessionId === sessionId);

    if (!installment) {
      return res.json({ status: "PENDING" });
    }

    res.json({
      status: installment.status,
      installmentId: installment._id,
      installmentName: installment.name,
      amount: installment.amount,
      paidAt: installment.paidAt,
      transactionId: installment.transactionId,
      paymentGateway: installment.paymentGateway || "STRIPE",
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount: studentFee.totalFee - studentFee.paidAmount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/parent/student/:studentId/link
 * Manually link a student to the logged-in parent
 */
exports.linkStudentToParent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    const collegeId = req.college_id;

    const student = await Student.findOne({
      _id: studentId,
      college_id: collegeId,
    });

    if (!student) {
      return next(new AppError("Student not found in your college", 404, "STUDENT_NOT_FOUND"));
    }

    const ParentGuardian = require("../models/parentGuardian.model");
    let link = await ParentGuardian.findOne({ user_id: userId });

    if (!link) {
      link = await ParentGuardian.create({
        user_id: userId,
        college_id: collegeId,
        student_ids: [studentId],
        relation: "parent",
      });
    } else {
      if (!link.student_ids.includes(studentId)) {
        link.student_ids = [...link.student_ids, studentId];
        await link.save();
      }
    }

    res.json({
      success: true,
      message: "Student linked to parent account successfully",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        linkedStudentIds: link.student_ids,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET MY PROFILE (Logged-in Parent Guardian)
   GET /api/parent/my-profile
   Returns the Parent's own User + ParentGuardian context.
   Identity is derived from req.user.id (JWT), never from body.
========================================================= */
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email mobileNumber role isActive college_id createdAt",
    );

    if (!user) {
      throw new AppError("User account not found", 404, "USER_NOT_FOUND");
    }

    const studentIds = (req.linkedStudentIds || []).map((id) => id.toString());

    let students = [];
    if (studentIds.length > 0) {
      students = await Student.find({ _id: { $in: studentIds } })
        .select("fullName email enrollmentNumber status course_id department_id")
        .populate("course_id", "name code")
        .populate("department_id", "name code")
        .sort({ fullName: 1 });
    }

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          mobileNumber: user.mobileNumber,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        parent: {
          relation: req.parentRelation,
          linkedStudentIds: studentIds,
          students,
        },
      },
      message: "Parent profile fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE MY PROFILE (Logged-in Parent Guardian)
   PUT /api/parent/update-my-profile
   Parents may ONLY edit: User.name, User.mobileNumber
   email is rejected → 400 EMAIL_CHANGE_NOT_ALLOWED
   (email must go through the centralized OTP email-change flow)
========================================================= */
exports.updateMyProfile = async (req, res, next) => {
  try {
    const { name, mobileNumber, email } = req.body;

    if (email !== undefined && email !== null) {
      throw new AppError(
        "Email cannot be updated here. Please use the email change flow.",
        400,
        "EMAIL_CHANGE_NOT_ALLOWED",
      );
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (mobileNumber !== undefined) updateFields.mobileNumber = mobileNumber;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true },
    ).select("name email mobileNumber role isActive college_id createdAt");

    if (!updatedUser) {
      throw new AppError("User account not found", 404, "USER_NOT_FOUND");
    }

    const studentIds = (req.linkedStudentIds || []).map((id) => id.toString());

    res.json({
      success: true,
      data: {
        user: {
          name: updatedUser.name,
          email: updatedUser.email,
          mobileNumber: updatedUser.mobileNumber,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
        },
        parent: {
          relation: req.parentRelation,
          linkedStudentIds: studentIds,
        },
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

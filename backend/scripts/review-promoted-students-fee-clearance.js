/**
 * 🔍 SCRIPT: Review Fee Clearance for Promoted Students (Read-Only)
 *
 * Checks all promoted students and re-evaluates their fee clearance
 * status for the academic year during which promotion occurred.
 *
 * Usage:
 *   node backend/scripts/review-promoted-students-fee-clearance.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const Student = require("../src/models/student.model");
const StudentFee = require("../src/models/studentFee.model");
const PromotionHistory = require("../src/models/promotionHistory.model");
const { normalizeAcademicYear } = require("../src/services/studentFee.service");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/smart-college";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB [Read-Only Audit]");

  const promotions = await PromotionHistory.find({
    status: { $in: ["PROMOTED", "ACTIVE"] },
  })
    .populate("student_id", "fullName email admissionYear currentSemester currentAcademicYear")
    .sort({ promotionDate: -1 })
    .lean();

  console.log(`Auditing ${promotions.length} promotion records...\n`);

  const promotedWithUnpaidFees = [];
  const compliantPromotions = [];

  for (const promo of promotions) {
    const student = promo.student_id;
    if (!student) continue;

    const fromYear = normalizeAcademicYear(promo.fromAcademicYear);
    const toYear = normalizeAcademicYear(promo.toAcademicYear);

    // Look up fee record for the academic year that was evaluated during promotion
    // 1. Direct match on academicYear
    let fee = await StudentFee.findOne({
      college_id: promo.college_id,
      student_id: student._id,
      academicYear: fromYear,
    }).lean();

    // 2. If not found (legacy fee without academicYear)
    if (!fee) {
      // If promoting from Sem 1 or 2, use initial enrollment fee (earliest fee)
      if (promo.fromSemester <= 2) {
        const fees = await StudentFee.find({
          college_id: promo.college_id,
          student_id: student._id,
        })
          .sort({ _id: 1 })
          .lean();
        fee = fees[0];
      }
    }

    const totalFee = Number(fee?.totalFee) || 0;
    const paidAmount = Number(fee?.paidAmount) || 0;
    const pendingAmount = Math.max(0, totalFee - paidAmount);
    const isUnpaid = totalFee > 0 && paidAmount < totalFee;

    const auditEntry = {
      promotionId: String(promo._id),
      studentId: String(student._id),
      studentName: student.fullName,
      fromSemester: promo.fromSemester,
      toSemester: promo.toSemester,
      fromAcademicYear: fromYear,
      toAcademicYear: toYear,
      recordedFeeStatus: promo.feeStatus,
      recordedPaidAmount: promo.paidAmount,
      recordedTotalFee: promo.totalFee,
      actualFeeDocId: fee ? String(fee._id) : null,
      actualTotalFee: totalFee,
      actualPaidAmount: paidAmount,
      actualPendingAmount: pendingAmount,
      isUnpaid,
    };

    if (isUnpaid) {
      promotedWithUnpaidFees.push(auditEntry);
    } else {
      compliantPromotions.push(auditEntry);
    }
  }

  console.log("=======================================================");
  console.log("        PROMOTION FEE CLEARANCE AUDIT REPORT");
  console.log("=======================================================");
  console.log(`Total promotions audited:                      ${promotions.length}`);
  console.log(`Promotions with FULLY PAID fees (compliant):   ${compliantPromotions.length}`);
  console.log(`Promotions with UNPAID fees (flagged):         ${promotedWithUnpaidFees.length}`);
  console.log("=======================================================\n");

  if (promotedWithUnpaidFees.length > 0) {
    console.log("--- FLAGGED PROMOTIONS (UNPAID FEES AT PROMOTION) ---");
    promotedWithUnpaidFees.forEach((entry, idx) => {
      console.log(
        `${idx + 1}. [${entry.studentName}] Promoted Sem ${entry.fromSemester} -> ${entry.toSemester} (${entry.fromAcademicYear})`,
      );
      console.log(
        `   Recorded at promotion: Status=${entry.recordedFeeStatus}, Total=Rs ${entry.recordedTotalFee}, Paid=Rs ${entry.recordedPaidAmount}`,
      );
      console.log(
        `   Actual Fee Doc ${entry.actualFeeDocId}: Total=Rs ${entry.actualTotalFee}, Paid=Rs ${entry.actualPaidAmount}, Pending=Rs ${entry.actualPendingAmount}\n`,
      );
    });
  } else {
    console.log("✅ Zero promoted students have unpaid fees for their promotion academic year.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});


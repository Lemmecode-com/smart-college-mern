/**
 * 🧹 SCRIPT: Cleanup Duplicate StudentFee Records & Backfill AcademicYear
 *
 * AUTHORITATIVE BUSINESS RULE:
 * A fee structure applies for the ENTIRE duration of the course.
 * Promotion (semester change, academic year change, any) must NEVER create
 * a new StudentFee. One StudentFee per student per course.
 *
 * Every StudentFee created by promotion (or any second+ doc for the same course)
 * is a duplicate.
 *
 * Usage:
 *   node backend/scripts/cleanup-duplicate-studentfees.js --dry-run   # Report only, no changes
 *   node backend/scripts/cleanup-duplicate-studentfees.js --apply     # Execute archive & backfill
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const StudentFee = require("../src/models/studentFee.model");
const Student = require("../src/models/student.model");
const PromotionHistory = require("../src/models/promotionHistory.model");
const {
  normalizeAcademicYear,
  selectAuthoritativeFee,
} = require("../src/services/studentFee.service");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/smart-college";

const isDryRun = !process.argv.includes("--apply");

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(
    `Connected to MongoDB [Mode: ${isDryRun ? "DRY-RUN (read-only)" : "APPLY (writes enabled)"}]`,
  );

  const db = mongoose.connection.db;

  // 1. Load all PromotionHistory records that created a StudentFee
  const promotionsWithFee = await PromotionHistory.find({
    newStudentFeeId: { $ne: null },
  })
    .populate("student_id", "fullName email admissionYear currentSemester currentAcademicYear course_id")
    .lean();

  console.log(
    `Analyzing ${promotionsWithFee.length} PromotionHistory records with newStudentFeeId...`,
  );

  const promoByFeeId = new Map();
  promotionsWithFee.forEach((p) => {
    promoByFeeId.set(String(p.newStudentFeeId), p);
  });

  // 2. Load all StudentFees and group by student_id and course_id
  const allFees = await StudentFee.find({}).lean();
  const allStudents = await Student.find({}).lean();
  const studentMap = new Map();
  allStudents.forEach((s) => studentMap.set(String(s._id), s));

  // Group fees by `${college_id}_${student_id}_${course_id}`
  const feesByStudentCourse = new Map();
  for (const fee of allFees) {
    const key = `${fee.college_id}_${fee.student_id}_${fee.course_id || ""}`;
    if (!feesByStudentCourse.has(key)) {
      feesByStudentCourse.set(key, []);
    }
    feesByStudentCourse.get(key).push(fee);
  }

  // Set of duplicate fee doc IDs identified
  const duplicateFeeMap = new Map(); // feeDocId -> info

  // Step A: Find duplicates from multi-fee groups per course
  for (const [key, fees] of feesByStudentCourse.entries()) {
    if (fees.length > 1) {
      const authFee = selectAuthoritativeFee(fees);
      const authId = String(authFee._id);

      for (const fee of fees) {
        const feeId = String(fee._id);
        if (feeId !== authId) {
          const student = studentMap.get(String(fee.student_id));
          const promo = promoByFeeId.get(feeId);

          duplicateFeeMap.set(feeId, {
            feeDoc: fee,
            authoritativeFeeId: authId,
            student,
            promotion: promo || null,
            reason: promo
              ? `Created by promotion (${promo.fromSemester} -> ${promo.toSemester})`
              : "Secondary duplicate fee document for same student and course",
          });
        }
      }
    }
  }

  // Step B: Also include any fee created by PromotionHistory even if group had 1 doc
  for (const promo of promotionsWithFee) {
    const feeId = String(promo.newStudentFeeId);
    if (!duplicateFeeMap.has(feeId)) {
      const feeDoc = allFees.find((f) => String(f._id) === feeId);
      if (feeDoc) {
        const student = studentMap.get(String(feeDoc.student_id));
        duplicateFeeMap.set(feeId, {
          feeDoc,
          authoritativeFeeId: null,
          student,
          promotion: promo,
          reason: `Created by promotion (${promo.fromSemester} -> ${promo.toSemester})`,
        });
      }
    }
  }

  const toArchive = [];
  const manualReview = [];

  for (const [feeId, item] of duplicateFeeMap.entries()) {
    const feeDoc = item.feeDoc;
    const student = item.student;
    const promo = item.promotion;

    const paidAmount = Number(feeDoc.paidAmount) || 0;
    const hasPaidInstallments = (feeDoc.installments || []).some(
      (i) => i.status === "PAID" || (Number(i.paidAmount) || 0) > 0 || i.transactionId,
    );

    const record = {
      feeDocId: feeId,
      studentId: String(feeDoc.student_id),
      studentName: student?.fullName || "Unknown",
      courseId: String(feeDoc.course_id || ""),
      authoritativeFeeId: item.authoritativeFeeId,
      promotionId: promo ? String(promo._id) : null,
      fromSemester: promo ? promo.fromSemester : null,
      toSemester: promo ? promo.toSemester : null,
      academicYear: feeDoc.academicYear || (promo ? promo.toAcademicYear : null),
      totalFee: feeDoc.totalFee,
      paidAmount,
      hasPaidInstallments,
      installmentsCount: feeDoc.installments?.length || 0,
      reason: item.reason,
      installments: (feeDoc.installments || []).map((i) => ({
        name: i.name,
        amount: i.amount,
        status: i.status,
        dueDate: i.dueDate,
        paidAmount: i.paidAmount || 0,
      })),
    };

    if (paidAmount === 0 && !hasPaidInstallments) {
      toArchive.push(record);
    } else {
      manualReview.push(record);
    }
  }

  // 3. Identify backfill candidates (informational academicYear for active non-archived fees)
  const backfillPlan = [];
  for (const fee of allFees) {
    const feeId = String(fee._id);
    const isDuplicate = duplicateFeeMap.has(feeId);

    if (!fee.academicYear && !isDuplicate) {
      const student = studentMap.get(String(fee.student_id));
      let resolvedYear = null;
      let reason = "";

      if (student?.admissionYear) {
        resolvedYear = `${student.admissionYear}-${Number(student.admissionYear) + 1}`;
        reason = `From student admissionYear (${student.admissionYear})`;
      } else if (student?.currentAcademicYear) {
        resolvedYear = normalizeAcademicYear(student.currentAcademicYear);
        reason = "From student currentAcademicYear";
      }

      if (resolvedYear) {
        backfillPlan.push({
          feeId,
          studentId: String(fee.student_id),
          studentName: student?.fullName || "Unknown",
          resolvedYear,
          reason,
        });
      }
    }
  }

  console.log("\n=======================================================");
  console.log("            STUDENT FEE CLEANUP REPORT");
  console.log("=======================================================");
  console.log(`Total StudentFee records analyzed:                            ${allFees.length}`);
  console.log(`Total duplicate documents identified:                        ${duplicateFeeMap.size}`);
  console.log(`Documents proposed for ARCHIVE (paidAmount = 0, no payments): ${toArchive.length}`);
  console.log(`Documents flagged for MANUAL REVIEW (payments present):        ${manualReview.length}`);
  console.log(`Active documents to BACKFILL academicYear (informational):    ${backfillPlan.length}`);
  console.log("=======================================================\n");

  if (toArchive.length > 0) {
    console.log("--- DOCUMENTS PROPOSED FOR ARCHIVE ---");
    toArchive.forEach((doc, idx) => {
      console.log(
        `${idx + 1}. [${doc.studentName}] FeeDoc: ${doc.feeDocId} | Total: Rs ${doc.totalFee} | Paid: Rs ${doc.paidAmount} | Installments: ${doc.installmentsCount} | Reason: ${doc.reason}`,
      );
    });
  }

  if (manualReview.length > 0) {
    console.log("\n--- DOCUMENTS FOR MANUAL REVIEW (Payments Found) ---");
    manualReview.forEach((doc, idx) => {
      console.log(
        `${idx + 1}. [${doc.studentName}] FeeDoc: ${doc.feeDocId} | Total: Rs ${doc.totalFee} | Paid: Rs ${doc.paidAmount} | Reason: ${doc.reason}`,
      );
    });
  }

  if (isDryRun) {
    console.log("\n>>> DRY RUN COMPLETE. No data was modified or archived.");
    console.log(">>> To execute the cleanup and backfill, run with: --apply");
    await mongoose.disconnect();
    return;
  }

  // --- APPLY MODE ---
  console.log("\nExecuting archive & backfill...");

  const archiveCol = db.collection("studentfees_archive");

  // 1. Archive proposed documents
  for (const item of toArchive) {
    const doc = await StudentFee.findById(item.feeDocId).lean();
    if (doc) {
      await archiveCol.insertOne({
        ...doc,
        archivedAt: new Date(),
        archiveReason: `Erronous duplicate fee created by promotion (course fee covers entire duration): ${item.reason}`,
        promotionHistoryId: item.promotionId,
        authoritativeFeeId: item.authoritativeFeeId,
      });

      await StudentFee.deleteOne({ _id: doc._id });

      // Update PromotionHistory if linked
      if (item.promotionId) {
        await PromotionHistory.updateOne(
          { _id: item.promotionId },
          {
            $set: {
              newStudentFeeId: null,
              newFeeAssigned: false,
              feeAssignmentWarning:
                "Archived duplicate fee created by promotion. Course fee applies for entire duration.",
            },
          },
        );
      }
    }
  }
  console.log(`Archived ${toArchive.length} documents into 'studentfees_archive'.`);

  // 2. Backfill academicYear on remaining active fees
  let backfilledCount = 0;
  for (const plan of backfillPlan) {
    const res = await StudentFee.updateOne(
      { _id: plan.feeId, academicYear: null },
      { $set: { academicYear: plan.resolvedYear } },
    );
    if (res.modifiedCount > 0) backfilledCount++;
  }
  console.log(`Backfilled academicYear on ${backfilledCount} active StudentFee documents.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const fs = require("fs");

const StudentFee = require("../src/models/studentFee.model");
const Student = require("../src/models/student.model");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/smart-college";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // 1. Fetch all student fees
  const allFees = await StudentFee.find({}).lean();
  console.log(`Found ${allFees.length} StudentFee documents.`);

  // 2. Save JSON backup
  const backupDir = path.join(__dirname, "../backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupJsonPath = path.join(backupDir, `studentfees-backup-${timestamp}.json`);
  fs.writeFileSync(backupJsonPath, JSON.stringify(allFees, null, 2));
  console.log(`Saved JSON backup to: ${backupJsonPath}`);

  // 3. Backup to MongoDB collection
  const backupCollectionName = `studentfees_backup_${timestamp.replace(/-/g, "_")}`;
  const backupCol = db.collection(backupCollectionName);
  if (allFees.length > 0) {
    await backupCol.insertMany(allFees);
    console.log(`Backed up ${allFees.length} documents into MongoDB collection: ${backupCollectionName}`);
  }

  // 4. Capture baseline per student
  const students = await Student.find({}).lean();
  const studentMap = new Map();
  students.forEach((s) => studentMap.set(String(s._id), s));

  // Group fees by student
  const feesByStudent = new Map();
  for (const fee of allFees) {
    const sId = String(fee.student_id);
    if (!feesByStudent.has(sId)) {
      feesByStudent.set(sId, []);
    }
    feesByStudent.get(sId).push(fee);
  }

  const baseline = [];
  for (const [studentId, fees] of feesByStudent.entries()) {
    const student = studentMap.get(studentId);
    const totalExpectedSum = fees.reduce((acc, f) => acc + (f.totalFee || 0), 0);
    const totalPaidSum = fees.reduce((acc, f) => acc + (f.paidAmount || 0), 0);
    const pendingSum = Math.max(0, totalExpectedSum - totalPaidSum);

    baseline.push({
      studentId,
      studentName: student?.fullName || "Unknown",
      admissionYear: student?.admissionYear,
      currentSemester: student?.currentSemester,
      currentYear: student?.currentYear,
      currentAcademicYear: student?.currentAcademicYear,
      feeDocCount: fees.length,
      feeDocIds: fees.map((f) => String(f._id)),
      totalExpectedSum,
      totalPaidSum,
      pendingSum,
      docs: fees.map((f) => ({
        _id: String(f._id),
        totalFee: f.totalFee,
        paidAmount: f.paidAmount,
        pendingAmount: Math.max(0, (f.totalFee || 0) - (f.paidAmount || 0)),
        paymentStatus: f.paymentStatus,
        installmentCount: f.installments?.length || 0,
        paidInstallmentsCount: f.installments?.filter((i) => i.status === "PAID").length || 0,
      })),
    });
  }

  // Sort baseline by name
  baseline.sort((a, b) => a.studentName.localeCompare(b.studentName));

  const baselinePath = path.join(backupDir, `studentfees-baseline-${timestamp}.json`);
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  console.log(`Saved baseline to: ${baselinePath}`);

  console.log(`Baseline captured for ${baseline.length} students.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


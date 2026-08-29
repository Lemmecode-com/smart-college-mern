const mongoose = require("mongoose");

async function run() {
  try {
    await mongoose.connect("mongodb://localhost:27017/smart_college_db");
    console.log("DB connected");

    const Leave = require("./backend/src/models/leave.model");
    const { getQuotaSummary } = require("./backend/src/services/leave.service");

    const collegeId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();

    await Leave.deleteMany({ college_id: collegeId });

    const docs = [
      // INSIDE 2025-2026 (Jun 1 2025 - Jun 30 2026)
      { leaveType: "SICK",   status: "APPROVED", startDate: "2025-07-15", endDate: "2025-07-17", daysCount: 3, durationType: "FULL_DAY", academicYear: "2025-2026" },
      { leaveType: "SICK",   status: "APPROVED", startDate: "2026-01-10", endDate: "2026-01-10", daysCount: 1, durationType: "FULL_DAY", academicYear: "2025-2026" },
      { leaveType: "CASUAL", status: "APPROVED", startDate: "2025-08-01", endDate: "2025-08-02", daysCount: 2, durationType: "FULL_DAY", academicYear: "2025-2026" },
      { leaveType: "CASUAL", status: "PENDING",  startDate: "2025-09-01", endDate: "2025-09-01", daysCount: 1, durationType: "FULL_DAY", academicYear: "2025-2026" },
      // ON BOUNDARY EDGE — June 30 2026 (last day of AY 2025-2026) — MUST be included
      { leaveType: "SICK",   status: "APPROVED", startDate: "2026-06-30", endDate: "2026-06-30", daysCount: 1, durationType: "FULL_DAY", academicYear: "2025-2026" },
      // OUTSIDE 2025-2026 — Jul 1 2026 (AY 2026-2027) — MUST NOT be in 2025-2026
      { leaveType: "SICK",   status: "APPROVED", startDate: "2026-07-01", endDate: "2026-07-01", daysCount: 1, durationType: "FULL_DAY", academicYear: "2026-2027" },
      { leaveType: "CASUAL", status: "PENDING",  startDate: "2026-07-01", endDate: "2026-07-01", daysCount: 1, durationType: "FULL_DAY", academicYear: "2026-2027" },
    ];

    const records = docs.map((d) => ({
      college_id: collegeId,
      teacher_id: teacherId,
      department_id: new mongoose.Types.ObjectId(),
      leaveType: d.leaveType,
      academicYear: d.academicYear,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      durationType: d.durationType,
      daysCount: d.daysCount,
      reason: "test",
      status: d.status,
      createdBy: teacherId,
      isActive: true,
    }));

    await Leave.insertMany(records);
    const result = await getQuotaSummary(collegeId, teacherId, "2025-2026");

    console.log("\n=== AY 2025-2026 Quota Summary ===");
    console.log(JSON.stringify(result, null, 2));

    const sick = result.types.find((t) => t.leaveType === "SICK");
    const casual = result.types.find((t) => t.leaveType === "CASUAL");

    const results = {
      sickApprovedTaken: sick.approvedTaken === 4 ? "PASS" : "FAIL",
      sickNetRemaining: sick.netRemaining === 8 ? "PASS" : "FAIL",
      casualApprovedTaken: casual.approvedTaken === 2 ? "PASS" : "FAIL",
      casualPendingProjected: casual.pendingProjected === 1 ? "PASS" : "FAIL",
      casualNetRemaining: casual.netRemaining === 8 ? "PASS" : "FAIL",
      july1Excluded: sick.approvedTaken === 4 ? "PASS (Jul 1 2026 not leaked into AY 2025-2026)" : "FAIL (Jul 1 leak detected)",
    };

    console.log("\n--- Assertions ---");
    Object.entries(results).forEach(([k, v]) => console.log(`${k}: ${v}`));

    await mongoose.disconnect();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

run();

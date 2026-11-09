/**
 * Read-Only Diagnostic Script: Find Orphan Attendance Sessions
 *
 * Lists all AttendanceSession records referencing a slot_id that does not exist
 * in the timetableslots collection, grouped per college.
 *
 * SAFETY: Read-only. Does not modify or delete any database records.
 *
 * RUN:
 *   node scripts/find-orphan-attendance-sessions.js
 */

const path = require("path");

function requireModule(name) {
  try {
    return require(name);
  } catch (err) {
    try {
      return require(path.resolve(__dirname, "../backend/node_modules", name));
    } catch {
      throw err;
    }
  }
}

const dotenv = requireModule("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoose = requireModule("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/smart-college";

async function findOrphanSessions() {
  console.log("🔍 [Diagnostic] Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to:", mongoose.connection.name);

  const db = mongoose.connection.db;
  const sessionsCol = db.collection("attendancesessions");

  console.log("🔍 Scanning for orphan attendance sessions with missing timetable slots...\n");

  const orphans = await sessionsCol
    .aggregate([
      {
        $match: {
          slot_id: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "timetableslots",
          localField: "slot_id",
          foreignField: "_id",
          as: "slot",
        },
      },
      {
        $match: {
          "slot.0": { $exists: false },
        },
      },
      {
        $lookup: {
          from: "colleges",
          localField: "college_id",
          foreignField: "_id",
          as: "college",
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "course_id",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $project: {
          _id: 1,
          college_id: 1,
          collegeName: { $arrayElemAt: ["$college.name", 0] },
          course_id: 1,
          courseName: { $arrayElemAt: ["$course.name", 0] },
          subject_id: 1,
          slot_id: 1,
          status: 1,
          session_date: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { college_id: 1, createdAt: -1 },
      },
    ])
    .toArray();

  if (orphans.length === 0) {
    console.log("✨ No orphan attendance sessions found across any college. All slots exist.");
    await mongoose.disconnect();
    return;
  }

  // Group by college
  const byCollege = new Map();
  for (const session of orphans) {
    const colKey = session.college_id ? session.college_id.toString() : "UNKNOWN_COLLEGE";
    if (!byCollege.has(colKey)) {
      byCollege.set(colKey, {
        collegeId: colKey,
        collegeName: session.collegeName || "Unknown College",
        sessions: [],
      });
    }
    byCollege.get(colKey).sessions.push(session);
  }

  console.log(`⚠️  Found ${orphans.length} orphan attendance session(s) across ${byCollege.size} college(s):\n`);

  for (const [colId, group] of byCollege.entries()) {
    console.log(`================================================================================`);
    console.log(`College: ${group.collegeName} (ID: ${colId})`);
    console.log(`Orphan Session Count: ${group.sessions.length}`);
    console.log(`--------------------------------------------------------------------------------`);

    const tableData = group.sessions.map((s) => ({
      "Session ID": s._id.toString(),
      "Missing Slot ID": s.slot_id ? s.slot_id.toString() : "N/A",
      "Course": s.courseName || (s.course_id ? s.course_id.toString() : "N/A"),
      "Status": s.status,
      "Date": s.session_date ? new Date(s.session_date).toISOString().slice(0, 10) : "N/A",
    }));

    console.table(tableData);
    console.log("\n");
  }

  console.log("ℹ️  Note: These sessions are safely ignored by attendance queries but can be reviewed by college admin.");
  await mongoose.disconnect();
  console.log("🔒 Disconnected from database.");
}

findOrphanSessions().catch((err) => {
  console.error("❌ Error running diagnostic:", err);
  process.exit(1);
});

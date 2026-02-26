// const mongoose = require("mongoose");

// const AttendanceSession = require("../models/attendanceSession.model");
// const AttendanceRecord = require("../models/attendanceRecord.model");
// const TimetableSlot = require("../models/timetableSlot.model");
// const Student = require("../models/student.model");
// const Teacher = require("../models/teacher.model");
// const Course = require("../models/course.model");
// const Subject = require("../models/subject.model");
// const Department = require("../models/department.model");
// const College = require("../models/college.model");
// const AppError = require("../utils/AppError");
// const { getDayName, isDateMatchesDay, isPastDate, isFutureDate, isToday } = require("../utils/date.utils");

// /* =========================================================
//    CREATE ATTENDANCE SESSION (Teacher)
//    MUST: Only for TODAY, and date must match slot's day
// ========================================================= */
// exports.createAttendanceSession = async (req, res, next) => {
//   try {
//     const { slot_id, lectureDate, lectureNumber } = req.body;

//     console.log("🟢 [CREATE SESSION] Request received:", {
//       slot_id,
//       lectureDate,
//       lectureNumber,
//       collegeId: req.college_id,
//       userId: req.user.id
//     });

//     if (!lectureNumber) {
//       throw new AppError("lectureNumber is required", 400, "MISSING_FIELD");
//     }

//     const collegeId = req.college_id;
//     const userId = req.user.id;
//     const userEmail = req.user.email;

//     // Resolve teacher
//     let teacher = await Teacher.findOne({ user_id: userId });
//     if (!teacher && userEmail) {
//       teacher = await Teacher.findOne({ email: userEmail });
//     }

//     console.log("🔵 [CREATE SESSION] Teacher found:", teacher?._id, teacher?.name);

//     if (!teacher) {
//       throw new AppError("Teacher profile not linked with user", 403, "TEACHER_NOT_FOUND");
//     }

//     // ✅ Validate slot AND teacher ownership
//     const slot = await TimetableSlot.findOne({
//       _id: slot_id,
//       college_id: collegeId,
//     }).populate('subject_id', 'teacher_id name code');

//     console.log("🔵 [CREATE SESSION] Slot found:", slot?._id, "Subject:", slot?.subject_id?.name);

//     if (!slot) {
//       throw new AppError("Invalid timetable slot for this teacher", 404, "SLOT_NOT_FOUND");
//     }

//     if (!slot.department_id || !slot.course_id) {
//       throw new AppError("Slot data incomplete. Please recreate slot.", 500, "INVALID_SLOT_DATA");
//     }

//     // ✅ STRICT VALIDATION: Teacher MUST be the subject's assigned teacher
//     if (slot.subject_id.teacher_id.toString() !== teacher._id.toString()) {
//       console.log("🔴 [CREATE SESSION] Teacher mismatch:", {
//         slotTeacherId: slot.subject_id.teacher_id.toString(),
//         currentTeacherId: teacher._id.toString()
//       });
//       throw new AppError(
//         `Access denied: You are not the assigned teacher for "${slot.subject_id.name}". Only the subject's assigned teacher can start attendance sessions.`,
//         403,
//         "NOT_SUBJECT_TEACHER"
//       );
//     }

//     console.log(`✅ [CREATE SESSION] Teacher validation passed: ${teacher.name} is assigned to ${slot.subject_id.name}`);

//     // ✅ DATE VALIDATION 1: Check if date is provided
//     if (!lectureDate) {
//       throw new AppError("Lecture date is required", 400, "MISSING_DATE");
//     }

//     // ✅ DATE VALIDATION 2: Check if date matches slot's day
//     const slotDay = slot.day; // e.g., "MON"
//     const lectureDay = getDayName(lectureDate); // e.g., "MON"

//     if (!isDateMatchesDay(lectureDate, slotDay)) {
//       throw new AppError(
//         `Invalid date: Slot is for ${slotDay} but provided date is ${lectureDay} (${lectureDate})`,
//         400,
//         "DATE_DAY_MISMATCH"
//       );
//     }

//     // ✅ DATE VALIDATION 3: Cannot create session for past dates
//     if (isPastDate(lectureDate)) {
//       throw new AppError(
//         "Cannot create attendance session for past dates",
//         400,
//         "PAST_DATE_NOT_ALLOWED"
//       );
//     }

//     // ✅ DATE VALIDATION 4: Cannot create session for future dates (more than 7 days)
//     if (isFutureDate(lectureDate, 7)) {
//       throw new AppError(
//         "Cannot create attendance session for future dates (max 7 days ahead)",
//         400,
//         "FUTURE_DATE_NOT_ALLOWED"
//       );
//     }

//     // ✅ DATE VALIDATION 5: ENFORCED - Only allow today's sessions
//     if (!isToday(lectureDate)) {
//       throw new AppError(
//         "Attendance sessions can only be created for today",
//         400,
//         "ONLY_TODAY_ALLOWED"
//       );
//     }

//     // Prevent duplicate
//     const existing = await AttendanceSession.findOne({
//       slot_id,
//       lectureDate: new Date(lectureDate),
//       lectureNumber,
//     });

//     if (existing) {
//       throw new AppError("Attendance already created for this lecture", 409, "DUPLICATE_SESSION");
//     }

//     // ✅ CAPTURE SLOT SNAPSHOT (Preserve history)
//     const slotWithDetails = await TimetableSlot.findById(slot_id)
//       .populate('subject_id', 'name code')
//       .populate('teacher_id', 'name');

//     const slotSnapshot = {
//       subject_id: slotWithDetails.subject_id._id,
//       subject_name: slotWithDetails.subject_id.name,
//       subject_code: slotWithDetails.subject_id.code,
//       teacher_id: slotWithDetails.teacher_id._id,
//       teacher_name: slotWithDetails.teacher_id.name,
//       day: slotWithDetails.day,
//       startTime: slotWithDetails.startTime,
//       endTime: slotWithDetails.endTime,
//       room: slotWithDetails.room || '',
//       slotType: slotWithDetails.slotType || 'LECTURE'
//     };

//     // Count students
//     const totalStudents = await Student.countDocuments({
//       college_id: collegeId,
//       course_id: slot.course_id,
//       status: "APPROVED",
//     });

//     // Create session with snapshot
//     const session = await AttendanceSession.create({
//       college_id: collegeId,
//       department_id: slot.department_id,
//       course_id: slot.course_id,
//       subject_id: slot.subject_id,
//       teacher_id: slot.teacher_id,
//       slot_id: slot._id,
//       lectureDate: new Date(lectureDate),
//       lectureNumber,
//       totalStudents,
//       status: "OPEN",
//       slotSnapshot: slotSnapshot  // ✅ Preserve slot data
//     });

//     res.status(201).json({
//       message: "Attendance session created successfully",
//       session,
//     });

//   } catch (error) {
//     // Handle duplicate key error gracefully
//     if (error.code === 11000) {
//       return next(new AppError("Attendance session already exists for this slot and lecture number", 409, "DUPLICATE_SESSION"));
//     }
//     next(error);
//   }
// };

// /* =========================================================
//    GET ALL ATTENDANCE SESSIONS (Logged-in Teacher)
//    GET /attendance/sessions
//    Returns: Sessions with snapshot data

//    Access Control:
//    - TEACHER: Only their own sessions
//    - HOD: All sessions in their department
// ========================================================= */
// exports.getAttendanceSessions = async (req, res, next) => {
//   try {
//     // 1️⃣ Resolve teacher from logged-in user
//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: req.college_id,
//     });

//     if (!teacher) {
//       throw new AppError("Teacher profile not found for this user", 404, "TEACHER_NOT_FOUND");
//     }

//     // 2️⃣ Check if teacher is HOD of their department
//     const isHod = await Department.findOne({
//       _id: teacher.department_id,
//       hod_id: teacher._id
//     });

//     // 3️⃣ Fetch sessions based on role
//     let sessions;
//     if (isHod) {
//       // HOD can see all sessions in their department
//       sessions = await AttendanceSession.find({
//         college_id: req.college_id,
//         department_id: teacher.department_id,
//       })
//         .populate("subject_id", "name code")
//         .populate("course_id", "name")
//         .sort({ lectureDate: -1, lectureNumber: -1 });
//     } else {
//       // Regular teacher sees only their own sessions
//       sessions = await AttendanceSession.find({
//         college_id: req.college_id,
//         teacher_id: teacher._id,
//       })
//         .populate("subject_id", "name code")
//         .populate("course_id", "name")
//         .sort({ lectureDate: -1, lectureNumber: -1 });
//     }

//     // 4️⃣ Return sessions with snapshot info
//     const sessionsWithSnapshot = sessions.map(session => {
//       const sessionObj = session.toObject();

//       // Use snapshot data if available (for historical accuracy)
//       if (sessionObj.slotSnapshot) {
//         return {
//           ...sessionObj,
//           // Snapshot takes precedence for historical data
//           subject: {
//             _id: sessionObj.slotSnapshot.subject_id,
//             name: sessionObj.slotSnapshot.subject_name,
//             code: sessionObj.slotSnapshot.subject_code
//           },
//           slotDetails: {
//             day: sessionObj.slotSnapshot.day,
//             startTime: sessionObj.slotSnapshot.startTime,
//             endTime: sessionObj.slotSnapshot.endTime,
//             room: sessionObj.slotSnapshot.room,
//             slotType: sessionObj.slotSnapshot.slotType,
//             teacher: {
//               _id: sessionObj.slotSnapshot.teacher_id,
//               name: sessionObj.slotSnapshot.teacher_name
//             }
//           },
//           hasSnapshot: true
//         };
//       }

//       return sessionObj;
//     });

//     res.status(200).json(sessionsWithSnapshot);
//   } catch (error) {
//     next(error);
//   }
// };

// /* =========================================================
//    GET SINGLE ATTENDANCE SESSION
//    GET /attendance/sessions/:sessionId
// ========================================================= */
// exports.getAttendanceSessionById = async (req, res) => {
//   try {
//     const session = await AttendanceSession.findOne({
//       _id: req.params.sessionId,
//       college_id: req.college_id
//     })
//       .populate("subject_id", "name code")
//       .populate("course_id", "name");

//     if (!session) {
//       return res.status(404).json({
//         message: "Attendance session not found"
//       });
//     }

//     res.json(session);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /* =========================================================
//    UPDATE ATTENDANCE SESSION (Only OPEN, Owner Teacher)
//    PUT /attendance/sessions/:sessionId
// ========================================================= */
// exports.updateAttendanceSession = async (req, res, next) => {
//   try {
//     const { lectureDate, lectureNumber } = req.body;
//     const collegeId = req.college_id;

//     /* ================= Resolve Teacher ================= */
//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
//     }

//     /* ================= Find Session ================= */
//     const session = await AttendanceSession.findOne({
//       _id: req.params.sessionId,
//       college_id: collegeId,
//       teacher_id: teacher._id,
//       status: "OPEN",
//     });

//     if (!session) {
//       throw new AppError("Session not found or already closed", 404, "SESSION_NOT_FOUND");
//     }

//     /* ================= Update ================= */
//     if (lectureDate) {
//       session.lectureDate = new Date(lectureDate);
//     }

//     if (lectureNumber) {
//       session.lectureNumber = lectureNumber;
//     }

//     await session.save();

//     res.status(200).json({
//       message: "Attendance session updated successfully",
//       session,
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /* =========================================================
//    GET STUDENTS FOR ATTENDANCE (AUTO – Course Wise)
//    GET /attendance/sessions/:sessionId/students
// ========================================================= */
// exports.getStudentsForAttendance = async (req, res) => {
//   try {
//     const collegeId = req.college_id;

//     // Resolve teacher
//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       return res.status(403).json({
//         message: "Teacher profile not found",
//       });
//     }

//     // Validate session ownership
//     const session = await AttendanceSession.findOne({
//       _id: req.params.sessionId,
//       college_id: collegeId,
//       teacher_id: teacher._id,
//       status: "OPEN",
//     });

//     if (!session) {
//       return res.status(404).json({
//         message: "Attendance session not found or access denied",
//       });
//     }

//     // Fetch students
//     const students = await Student.find({
//       college_id: collegeId,
//       course_id: session.course_id,
//       status: "APPROVED",
//     }).select("_id fullName email");

//     res.status(200).json(students);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /* =========================================================
//    MARK ATTENDANCE (Initial)
//    POST /attendance/sessions/:sessionId/mark
// ========================================================= */
// exports.markAttendance = async (req, res, next) => {
//   try {
//     const { attendance } = req.body;
//     const collegeId = req.college_id;

//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
//     }

//     const session = await AttendanceSession.findOne({
//       _id: req.params.sessionId,
//       college_id: collegeId,
//       teacher_id: teacher._id,
//       status: "OPEN",
//     });

//     if (!session) {
//       throw new AppError("Session not found or closed", 404, "SESSION_NOT_FOUND");
//     }

//     for (let item of attendance) {
//       await AttendanceRecord.findOneAndUpdate(
//         {
//           session_id: session._id,
//           student_id: item.student_id,
//         },
//         {
//           college_id: collegeId,
//           session_id: session._id,
//           student_id: item.student_id,
//           status: item.status,
//           markedBy: teacher._id,
//         },
//         { upsert: true, new: true }
//       );
//     }

//     res.status(200).json({
//       message: "Attendance saved successfully",
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /* =========================================================
//    EDIT ATTENDANCE (While OPEN)
//    PUT /attendance/sessions/:sessionId/edit
// ========================================================= */
// exports.editAttendance = async (req, res, next) => {
//   try {
//     const { attendance } = req.body;
//     const collegeId = req.college_id;

//     // Resolve teacher
//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
//     }

//     // Validate session
//     const session = await AttendanceSession.findOne({
//       _id: req.params.sessionId,
//       college_id: collegeId,
//       teacher_id: teacher._id,
//       status: "OPEN",
//     });

//     if (!session) {
//       throw new AppError("Session not found or already closed", 404, "SESSION_NOT_FOUND");
//     }

//     const updated = [];

//     for (const item of attendance) {
//       const record = await AttendanceRecord.findOneAndUpdate(
//         {
//           session_id: session._id,
//           student_id: item.student_id,
//           college_id: collegeId,
//         },
//         {
//           status: item.status,
//           markedBy: teacher._id,
//         },
//         { upsert: true, new: true }
//       );

//       updated.push(record);
//     }

//     res.status(200).json({
//       message: "Attendance updated successfully",
//       updatedCount: updated.length,
//       attendance: updated,
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /* =========================================================
//    DELETE ATTENDANCE SESSION (Teacher only, OPEN only)
//    DELETE /attendance/sessions/:sessionId
// ========================================================= */
// exports.deleteAttendanceSession = async (req, res, next) => {
//   try {
//     const collegeId = req.college_id;

//     // Resolve teacher
//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
//     }

//     // Delete only own OPEN session
//     const session = await AttendanceSession.findOneAndDelete({
//       _id: req.params.sessionId,
//       college_id: collegeId,
//       teacher_id: teacher._id,
//       status: "OPEN",
//     });

//     if (!session) {
//       throw new AppError("Cannot delete closed or invalid session", 404, "SESSION_NOT_FOUND");
//     }

//     // Remove related attendance records
//     await AttendanceRecord.deleteMany({
//       session_id: session._id,
//     });

//     res.status(200).json({
//       message: "Attendance session deleted successfully",
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// /* =========================================================
//    CLOSE ATTENDANCE SESSION (Teacher only, OPEN only)
//    PUT /attendance/sessions/:sessionId/close
// ========================================================= */
// exports.closeAttendanceSession = async (req, res) => {
//   try {
//     const collegeId = req.college_id;

//     // Resolve teacher
//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       return res.status(403).json({
//         message: "Teacher profile not found",
//       });
//     }

//     // Find OPEN session owned by teacher
//     const session = await AttendanceSession.findOne({
//       _id: req.params.sessionId,
//       college_id: collegeId,
//       teacher_id: teacher._id,   // ✅ FIX
//       status: "OPEN",
//     });

//     if (!session) {
//       return res.status(404).json({
//         message: "Session not found or already closed",
//       });
//     }

//     // Fetch all students for the course
//     const students = await Student.find({
//       college_id: collegeId,
//       course_id: session.course_id,
//       status: "APPROVED",
//     }).select("_id");

//     // Find present students
//     const presentRecords = await AttendanceRecord.find({
//       session_id: session._id,
//     });

//     const presentIds = presentRecords.map(r => r.student_id.toString());

//     // Auto-mark ABSENT
//     const absentees = students
//       .filter(s => !presentIds.includes(s._id.toString()))
//       .map(s => ({
//         college_id: collegeId,
//         session_id: session._id,
//         student_id: s._id,
//         status: "ABSENT",
//         markedBy: teacher._id,
//       }));

//     if (absentees.length > 0) {
//       await AttendanceRecord.insertMany(absentees);
//     }

//     session.totalStudents = students.length;
//     session.status = "CLOSED";
//     await session.save();

//     res.status(200).json({
//       message: "Attendance session closed successfully",
//       totalStudents: students.length,
//       present: presentIds.length,
//       absent: absentees.length,
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /* =========================================================
//    GET ATTENDANCE RECORDS OF A SESSION
//    GET /attendance/sessions/:sessionId/records
// ========================================================= */
// exports.getAttendanceRecordsBySession = async (req, res) => {
//   try {
//     const collegeId = req.college_id;

//     const records = await AttendanceRecord.find({
//       session_id: req.params.sessionId,
//       college_id: collegeId,
//     })
//       .populate("student_id", "fullName email")
//       .populate({
//         path: "markedBy",
//         select: "name"
//       })
//       .sort({ createdAt: -1 });

//     res.status(200).json(records);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /* =========================================================
//    GET TEACHER ATTENDANCE REPORT (PRODUCTION GRADE)
//    GET /attendance/report
// ========================================================= */
// exports.getAttendanceReport = async (req, res) => {
//   try {
//     const collegeId = req.college_id;
//     const teacherId = req.teacher_id;

//     const { courseId, subjectId, startDate, endDate } = req.query;

//     /* ================= FETCH COLLEGE INFO ================= */
//     const college = await College.findById(collegeId).select("name code");

//     /* ================= MATCH CONDITIONS ================= */
//     const match = {
//       college_id: new mongoose.Types.ObjectId(collegeId),
//       teacher_id: new mongoose.Types.ObjectId(teacherId),
//     };

//     if (courseId) {
//       match.course_id = new mongoose.Types.ObjectId(courseId);
//     }

//     if (subjectId) {
//       match.subject_id = new mongoose.Types.ObjectId(subjectId);
//     }

//     if (startDate && endDate) {
//       match.lectureDate = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       };
//     }

//     /* ================= FETCH SESSIONS ================= */
//     const sessions = await AttendanceSession.find(match)
//       .populate("subject_id", "name")
//       .populate("course_id", "name code")
//       .sort({ lectureDate: -1 });

//     const sessionIds = sessions.map(s => s._id);

//     /* ================= FETCH RECORDS ================= */
//     const records = await AttendanceRecord.find({
//       session_id: { $in: sessionIds },
//     });

//     /* ================= BUILD SESSION-WISE DATA ================= */
//     const sessionReport = sessions.map(session => {
//       const sessionRecords = records.filter(r =>
//         r.session_id.toString() === session._id.toString()
//       );

//       const total = sessionRecords.length;
//       const present = sessionRecords.filter(r => r.status === "PRESENT").length;
//       const absent = sessionRecords.filter(r => r.status === "ABSENT").length;

//       const percentage =
//         total > 0 ? (present / total) * 100 : 0;

//       return {
//         _id: session._id,
//         date: session.lectureDate,
//         subject: session.subject_id?.name || "N/A",
//         course: session.course_id?.name || "N/A",
//         lectureNumber: session.lectureNumber,
//         totalStudents: total,
//         present,
//         absent,
//         percentage,
//       };
//     });

//     /* ================= SUMMARY ================= */
//     const totalLectures = sessions.length;
//     const totalStudents = records.length;
//     const totalPresent = records.filter(r => r.status === "PRESENT").length;
//     const totalAbsent = records.filter(r => r.status === "ABSENT").length;

//     res.json({
//       college: {
//         name: college?.name || "N/A",
//         code: college?.code || "N/A",
//       },
//       summary: {
//         totalLectures,
//         totalStudents,
//         totalPresent,
//         totalAbsent,
//       },
//       sessions: sessionReport,
//     });

//   } catch (error) {
//     console.error("Attendance report error:", error);
//     res.status(500).json({
//       message: "Failed to load attendance report",
//     });
//   }
// };

// /* =========================================================
//    GET STUDENT ATTENDANCE REPORT (PRODUCTION GRADE)
//    GET /attendance/student
// ========================================================= */
// exports.getStudentAttendanceReport = async (req, res) => {
//   try {
//     const student = req.student;

//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     const sessions = await AttendanceSession.find({
//       college_id: req.college_id,
//       department_id: student.department_id,
//       course_id: student.course_id,
//     }).populate("subject_id", "name code");

//     let total = 0;
//     let present = 0;
//     let absent = 0;

//     const sessionReport = [];
//     const subjectMap = {}; // 🔥 For subject-wise breakdown

//     for (const session of sessions) {
//       const record = await AttendanceRecord.findOne({
//         session_id: session._id,
//         student_id: student._id,
//       });

//       if (!record) continue;

//       total++;

//       if (record.status === "PRESENT") present++;
//       if (record.status === "ABSENT") absent++;

//       // Session-wise
//       sessionReport.push({
//         date: session.lectureDate,
//         subject: session.subject_id.name,
//         subjectCode: session.subject_id.code,
//         lectureNumber: session.lectureNumber,
//         startTime: session.slotSnapshot?.startTime || "N/A",
//         endTime: session.slotSnapshot?.endTime || "N/A",
//         room: session.slotSnapshot?.room || "N/A",
//         teacher: session.slotSnapshot?.teacher_name || "N/A",
//         status: record.status,
//       });

//       // 🔥 Subject-wise aggregation
//       const subjectId = session.subject_id._id.toString();

//       if (!subjectMap[subjectId]) {
//         subjectMap[subjectId] = {
//           subject: session.subject_id.name,
//           code: session.subject_id.code,
//           total: 0,
//           present: 0,
//           absent: 0, // ✅ Initialize absent count
//         };
//       }

//       subjectMap[subjectId].total++;

//       if (record.status === "PRESENT") {
//         subjectMap[subjectId].present++;
//       } else if (record.status === "ABSENT") {
//         subjectMap[subjectId].absent++; // ✅ Increment absent count
//       }
//     }

//     // 🔥 Convert subjectMap to array
//     const subjectBreakdown = Object.values(subjectMap).map((sub) => {
//       const percentage =
//         sub.total > 0
//           ? ((sub.present / sub.total) * 100).toFixed(2)
//           : 0;

//       return {
//         ...sub,
//         percentage,
//         warning: percentage < 75, // ⚠ below 75%
//       };
//     });

//     // 🔥 Get today's sessions
//     const todayDate = new Date();
//     todayDate.setHours(0, 0, 0, 0);
//     const tomorrowDate = new Date(todayDate);
//     tomorrowDate.setDate(tomorrowDate.getDate() + 1);

//     const todaySessions = await AttendanceSession.find({
//       college_id: req.college_id,
//       department_id: student.department_id,
//       course_id: student.course_id,
//       lectureDate: {
//         $gte: todayDate,
//         $lt: tomorrowDate,
//       },
//     }).populate("subject_id", "name code");

//     const todayReport = [];
//     for (const session of todaySessions) {
//       const record = await AttendanceRecord.findOne({
//         session_id: session._id,
//         student_id: student._id,
//       });

//       if (record) {
//         todayReport.push({
//           date: session.lectureDate,
//           subject: session.subject_id.name,
//           subjectCode: session.subject_id.code,
//           lectureNumber: session.lectureNumber,
//           startTime: session.slotSnapshot?.startTime || "N/A",
//           endTime: session.slotSnapshot?.endTime || "N/A",
//           room: session.slotSnapshot?.room || "Room not assigned",
//           teacher: session.slotSnapshot?.teacher_name || "N/A",
//           status: record.status,
//         });
//       }
//     }

//     res.json({
//       summary: {
//         totalLectures: total,
//         present,
//         absent,
//         percentage:
//           total > 0 ? ((present / total) * 100).toFixed(2) : 0,
//       },
//       sessions: sessionReport,
//       subjectWise: subjectBreakdown,
//       today: todayReport,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Failed to load attendance report",
//     });
//   }
// };

// /* =========================================================
//   GET TEACHER'S COURSES FOR ATTENDANCE REPORT (PRODUCTION GRADE)
// ========================================================= */
// exports.getTeacherCourses = async (req, res) => {
//   try {
//     const collegeId = req.college_id;

//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,   // ✅ FIXED
//       college_id: collegeId,  // ✅ VERY IMPORTANT
//     });

//     if (!teacher) {
//       return res.status(404).json({
//         message: "Teacher not found",
//       });
//     }

//     if (!teacher.courses || teacher.courses.length === 0) {
//       return res.json([]);
//     }

//     const courses = await Course.find({
//       _id: { $in: teacher.courses },
//       college_id: collegeId,
//     }).select("name");

//     res.status(200).json(courses);

//   } catch (error) {
//     console.error("Fetch courses error:", error);
//     res.status(500).json({
//       message: "Failed to fetch courses",
//     });
//   }
// };

// /* =========================================================
//   GET TEACHER'S SUBJECTS FOR ATTENDANCE REPORT (PRODUCTION GRADE)
// ========================================================= */
// exports.getTeacherSubjectsByCourse = async (req, res) => {
//   try {
//     const { courseId } = req.params;
//     const collegeId = req.college_id;

//     const teacher = await Teacher.findOne({
//       user_id: req.user.id,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       return res.status(403).json({ message: "Teacher not found" });
//     }

//     // Fetch subjects directly from Subject collection
//     const subjects = await Subject.find({
//       college_id: collegeId,
//       course_id: courseId,
//       teacher_id: teacher._id,  // important
//       status: "ACTIVE"
//     }).select("_id name code");

//     res.json(subjects);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /* =========================================================
//    GET TODAY'S SLOTS FOR TEACHER (FOR ATTENDANCE)
//    GET /attendance/today-slots
//    Purpose: Show slots for today where teacher can start attendance
// ========================================================= */
// exports.getTodaySlotsForTeacher = async (req, res, next) => {
//   try {
//     const collegeId = req.college_id;
//     const userId = req.user.id;

//     // Resolve teacher
//     const teacher = await Teacher.findOne({
//       user_id: userId,
//       college_id: collegeId,
//     });

//     if (!teacher) {
//       throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
//     }

//     // Get today's day name
//     const today = new Date();
//     const todayDayName = getDayName(today);
//     const todayStr = today.toISOString().split('T')[0];

//     console.log(`📅 Today: ${todayStr} (${todayDayName})`);

//     // Find all PUBLISHED timetables for teacher's department
//     const slots = await TimetableSlot.find({
//       college_id: collegeId,
//       teacher_id: teacher._id,
//       day: todayDayName,
//     })
//       .populate('subject_id', 'name code')
//       .populate('timetable_id', 'name status semester academicYear')
//       .populate('course_id', 'name')
//       .sort({ startTime: 1 });

//     // Filter only slots from PUBLISHED timetables
//     const publishedSlots = slots.filter(slot =>
//       slot.timetable_id?.status === 'PUBLISHED'
//     );

//     // Check if attendance session already exists for each slot
//     const slotsWithSessionStatus = await Promise.all(
//       publishedSlots.map(async (slot) => {
//         // Check for existing sessions today for this slot
//         const existingSessions = await AttendanceSession.find({
//           slot_id: slot._id,
//           lectureDate: {
//             $gte: new Date(todayStr),
//             $lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000)
//           }
//         });

//         const hasOpenSession = existingSessions.some(s => s.status === 'OPEN');
//         const hasClosedSession = existingSessions.some(s => s.status === 'CLOSED');
//         const sessionCount = existingSessions.length;

//         return {
//           ...slot.toObject(),
//           canStartAttendance: !hasOpenSession && !hasClosedSession,
//           hasOpenSession,
//           hasClosedSession,
//           sessionCount,
//           message: hasOpenSession
//             ? 'Attendance session already open'
//             : hasClosedSession
//               ? `Attendance already closed (${sessionCount} sessions)`
//               : 'Can start attendance'
//         };
//       })
//     );

//     res.json({
//       today: todayStr,
//       dayName: todayDayName,
//       totalSlots: slotsWithSessionStatus.length,
//       availableForAttendance: slotsWithSessionStatus.filter(s => s.canStartAttendance).length,
//       slots: slotsWithSessionStatus
//     });

//   } catch (error) {
//     next(error);
//   }
// };

const mongoose = require("mongoose");

const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const Course = require("../models/course.model");
const Subject = require("../models/subject.model");
const Department = require("../models/department.model");
const College = require("../models/college.model");
const AppError = require("../utils/AppError");
const {
  getDayName,
  isDateMatchesDay,
  isPastDate,
  isFutureDate,
  isToday,
} = require("../utils/date.utils");

/* =========================================================
   CREATE ATTENDANCE SESSION (Teacher)
   MUST: Only for TODAY, and date must match slot's day
========================================================= */
exports.createAttendanceSession = async (req, res, next) => {
  try {
    const { slot_id, lectureDate, lectureNumber } = req.body;

    console.log("🟢 [CREATE SESSION] Request received:", {
      slot_id,
      lectureDate,
      lectureNumber,
      collegeId: req.college_id,
      userId: req.user.id,
    });

    if (!lectureNumber) {
      throw new AppError("lectureNumber is required", 400, "MISSING_FIELD");
    }

    const collegeId = req.college_id;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Resolve teacher
    let teacher = await Teacher.findOne({ user_id: userId });
    if (!teacher && userEmail) {
      teacher = await Teacher.findOne({ email: userEmail });
    }

    console.log(
      "🔵 [CREATE SESSION] Teacher found:",
      teacher?._id,
      teacher?.name,
    );

    if (!teacher) {
      throw new AppError(
        "Teacher profile not linked with user",
        403,
        "TEACHER_NOT_FOUND",
      );
    }

    // ✅ Validate slot AND teacher ownership
    const slot = await TimetableSlot.findOne({
      _id: slot_id,
      college_id: collegeId,
    }).populate("subject_id", "teacher_id name code");

    console.log(
      "🔵 [CREATE SESSION] Slot found:",
      slot?._id,
      "Subject:",
      slot?.subject_id?.name,
    );

    if (!slot) {
      throw new AppError(
        "Invalid timetable slot for this teacher",
        404,
        "SLOT_NOT_FOUND",
      );
    }

    if (!slot.department_id || !slot.course_id) {
      throw new AppError(
        "Slot data incomplete. Please recreate slot.",
        500,
        "INVALID_SLOT_DATA",
      );
    }

    // ✅ STRICT VALIDATION: Teacher MUST be the subject's assigned teacher
    if (slot.subject_id.teacher_id.toString() !== teacher._id.toString()) {
      console.log("🔴 [CREATE SESSION] Teacher mismatch:", {
        slotTeacherId: slot.subject_id.teacher_id.toString(),
        currentTeacherId: teacher._id.toString(),
      });
      throw new AppError(
        `Access denied: You are not the assigned teacher for "${slot.subject_id.name}". Only the subject's assigned teacher can start attendance sessions.`,
        403,
        "NOT_SUBJECT_TEACHER",
      );
    }

    console.log(
      `✅ [CREATE SESSION] Teacher validation passed: ${teacher.name} is assigned to ${slot.subject_id.name}`,
    );

    // ✅ DATE VALIDATION 1: Check if date is provided
    if (!lectureDate) {
      throw new AppError("Lecture date is required", 400, "MISSING_DATE");
    }

    // ✅ DATE VALIDATION 2: Check if date matches slot's day
    const slotDay = slot.day; // e.g., "MON"
    const lectureDay = getDayName(lectureDate); // e.g., "MON"

    if (!isDateMatchesDay(lectureDate, slotDay)) {
      throw new AppError(
        `Invalid date: Slot is for ${slotDay} but provided date is ${lectureDay} (${lectureDate})`,
        400,
        "DATE_DAY_MISMATCH",
      );
    }

    // ✅ DATE VALIDATION 3: Cannot create session for past dates
    if (isPastDate(lectureDate)) {
      throw new AppError(
        "Cannot create attendance session for past dates",
        400,
        "PAST_DATE_NOT_ALLOWED",
      );
    }

    // ✅ DATE VALIDATION 4: Cannot create session for future dates (more than 7 days)
    if (isFutureDate(lectureDate, 7)) {
      throw new AppError(
        "Cannot create attendance session for future dates (max 7 days ahead)",
        400,
        "FUTURE_DATE_NOT_ALLOWED",
      );
    }

    // ✅ DATE VALIDATION 5: ENFORCED - Only allow today's sessions
    if (!isToday(lectureDate)) {
      throw new AppError(
        "Attendance sessions can only be created for today",
        400,
        "ONLY_TODAY_ALLOWED",
      );
    }

    // Prevent duplicate
    const existing = await AttendanceSession.findOne({
      slot_id,
      lectureDate: new Date(lectureDate),
      lectureNumber,
    });

    if (existing) {
      throw new AppError(
        "Attendance already created for this lecture",
        409,
        "DUPLICATE_SESSION",
      );
    }

    // ✅ CAPTURE SLOT SNAPSHOT (Preserve history)
    const slotWithDetails = await TimetableSlot.findById(slot_id)
      .populate("subject_id", "name code")
      .populate("teacher_id", "name");

    const slotSnapshot = {
      subject_id: slotWithDetails.subject_id._id,
      subject_name: slotWithDetails.subject_id.name,
      subject_code: slotWithDetails.subject_id.code,
      teacher_id: slotWithDetails.teacher_id._id,
      teacher_name: slotWithDetails.teacher_id.name,
      day: slotWithDetails.day,
      startTime: slotWithDetails.startTime,
      endTime: slotWithDetails.endTime,
      room: slotWithDetails.room || "",
      slotType: slotWithDetails.slotType || "LECTURE",
    };

    // Count students
    const totalStudents = await Student.countDocuments({
      college_id: collegeId,
      course_id: slot.course_id,
      status: "APPROVED",
    });

    // Create session with snapshot
    const session = await AttendanceSession.create({
      college_id: collegeId,
      department_id: slot.department_id,
      course_id: slot.course_id,
      subject_id: slot.subject_id,
      teacher_id: slot.teacher_id,
      slot_id: slot._id,
      lectureDate: new Date(lectureDate),
      lectureNumber,
      totalStudents,
      status: "OPEN",
      slotSnapshot: slotSnapshot, // ✅ Preserve slot data
    });

    res.status(201).json({
      message: "Attendance session created successfully",
      session,
    });
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      return next(
        new AppError(
          "Attendance session already exists for this slot and lecture number",
          409,
          "DUPLICATE_SESSION",
        ),
      );
    }
    next(error);
  }
};

/* =========================================================
   GET ALL ATTENDANCE SESSIONS (Logged-in Teacher)
   GET /attendance/sessions
   Returns: Sessions with snapshot data

   Access Control:
   - TEACHER: Only their own sessions
   - HOD: All sessions in their department
========================================================= */
exports.getAttendanceSessions = async (req, res, next) => {
  try {
    // 1️⃣ Resolve teacher from logged-in user
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
    });

    if (!teacher) {
      throw new AppError(
        "Teacher profile not found for this user",
        404,
        "TEACHER_NOT_FOUND",
      );
    }

    // 2️⃣ Check if teacher is HOD of their department
    const isHod = await Department.findOne({
      _id: teacher.department_id,
      hod_id: teacher._id,
    });

    // 3️⃣ Fetch sessions based on role
    let sessions;
    if (isHod) {
      // HOD can see all sessions in their department
      sessions = await AttendanceSession.find({
        college_id: req.college_id,
        department_id: teacher.department_id,
      })
        .populate("subject_id", "name code")
        .populate("course_id", "name")
        .sort({ lectureDate: -1, lectureNumber: -1 });
    } else {
      // Regular teacher sees only their own sessions
      sessions = await AttendanceSession.find({
        college_id: req.college_id,
        teacher_id: teacher._id,
      })
        .populate("subject_id", "name code")
        .populate("course_id", "name")
        .sort({ lectureDate: -1, lectureNumber: -1 });
    }

    // 4️⃣ Return sessions with snapshot info
    const sessionsWithSnapshot = sessions.map((session) => {
      const sessionObj = session.toObject();

      // Use snapshot data if available (for historical accuracy)
      if (sessionObj.slotSnapshot) {
        return {
          ...sessionObj,
          // Snapshot takes precedence for historical data
          subject: {
            _id: sessionObj.slotSnapshot.subject_id,
            name: sessionObj.slotSnapshot.subject_name,
            code: sessionObj.slotSnapshot.subject_code,
          },
          slotDetails: {
            day: sessionObj.slotSnapshot.day,
            startTime: sessionObj.slotSnapshot.startTime,
            endTime: sessionObj.slotSnapshot.endTime,
            room: sessionObj.slotSnapshot.room,
            slotType: sessionObj.slotSnapshot.slotType,
            teacher: {
              _id: sessionObj.slotSnapshot.teacher_id,
              name: sessionObj.slotSnapshot.teacher_name,
            },
          },
          hasSnapshot: true,
        };
      }

      return sessionObj;
    });

    res.status(200).json(sessionsWithSnapshot);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET SINGLE ATTENDANCE SESSION
   GET /attendance/sessions/:sessionId
========================================================= */
exports.getAttendanceSessionById = async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: req.college_id,
    })
      .populate("subject_id", "name code")
      .populate("course_id", "name");

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found",
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   UPDATE ATTENDANCE SESSION (Only OPEN, Owner Teacher)
   PUT /attendance/sessions/:sessionId
========================================================= */
exports.updateAttendanceSession = async (req, res, next) => {
  try {
    const { lectureDate, lectureNumber } = req.body;
    const collegeId = req.college_id;

    /* ================= Resolve Teacher ================= */
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
    }

    /* ================= Find Session ================= */
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      throw new AppError(
        "Session not found or already closed",
        404,
        "SESSION_NOT_FOUND",
      );
    }

    /* ================= Update ================= */
    if (lectureDate) {
      session.lectureDate = new Date(lectureDate);
    }

    if (lectureNumber) {
      session.lectureNumber = lectureNumber;
    }

    await session.save();

    res.status(200).json({
      message: "Attendance session updated successfully",
      session,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET STUDENTS FOR ATTENDANCE (AUTO – Course Wise)
   GET /attendance/sessions/:sessionId/students
========================================================= */
exports.getStudentsForAttendance = async (req, res) => {
  try {
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    // Validate session ownership
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found or access denied",
      });
    }

    // Fetch students
    const students = await Student.find({
      college_id: collegeId,
      course_id: session.course_id,
      status: "APPROVED",
    }).select("_id fullName email");

    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   MARK ATTENDANCE (Initial)
   POST /attendance/sessions/:sessionId/mark
========================================================= */
exports.markAttendance = async (req, res, next) => {
  try {
    const { attendance } = req.body;
    const collegeId = req.college_id;

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
    }

    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      throw new AppError(
        "Session not found or closed",
        404,
        "SESSION_NOT_FOUND",
      );
    }

    for (let item of attendance) {
      await AttendanceRecord.findOneAndUpdate(
        {
          session_id: session._id,
          student_id: item.student_id,
        },
        {
          college_id: collegeId,
          session_id: session._id,
          student_id: item.student_id,
          status: item.status,
          markedBy: teacher._id,
        },
        { upsert: true, new: true },
      );
    }

    res.status(200).json({
      message: "Attendance saved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   EDIT ATTENDANCE (While OPEN)
   PUT /attendance/sessions/:sessionId/edit
========================================================= */
exports.editAttendance = async (req, res, next) => {
  try {
    const { attendance } = req.body;
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
    }

    // Validate session
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      throw new AppError(
        "Session not found or already closed",
        404,
        "SESSION_NOT_FOUND",
      );
    }

    const updated = [];

    for (const item of attendance) {
      const record = await AttendanceRecord.findOneAndUpdate(
        {
          session_id: session._id,
          student_id: item.student_id,
          college_id: collegeId,
        },
        {
          status: item.status,
          markedBy: teacher._id,
        },
        { upsert: true, new: true },
      );

      updated.push(record);
    }

    res.status(200).json({
      message: "Attendance updated successfully",
      updatedCount: updated.length,
      attendance: updated,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE ATTENDANCE SESSION (Teacher only, OPEN only)
   DELETE /attendance/sessions/:sessionId
========================================================= */
exports.deleteAttendanceSession = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
    }

    // Delete only own OPEN session
    const session = await AttendanceSession.findOneAndDelete({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      throw new AppError(
        "Cannot delete closed or invalid session",
        404,
        "SESSION_NOT_FOUND",
      );
    }

    // Remove related attendance records
    await AttendanceRecord.deleteMany({
      session_id: session._id,
    });

    res.status(200).json({
      message: "Attendance session deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CLOSE ATTENDANCE SESSION (Teacher only, OPEN only)
   PUT /attendance/sessions/:sessionId/close
========================================================= */
exports.closeAttendanceSession = async (req, res) => {
  try {
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    // Find OPEN session owned by teacher
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id, // ✅ FIX
      status: "OPEN",
    });

    if (!session) {
      return res.status(404).json({
        message: "Session not found or already closed",
      });
    }

    // Fetch all students for the course
    const students = await Student.find({
      college_id: collegeId,
      course_id: session.course_id,
      status: "APPROVED",
    }).select("_id");

    // Find present students
    const presentRecords = await AttendanceRecord.find({
      session_id: session._id,
    });

    const presentIds = presentRecords.map((r) => r.student_id.toString());

    // Auto-mark ABSENT
    const absentees = students
      .filter((s) => !presentIds.includes(s._id.toString()))
      .map((s) => ({
        college_id: collegeId,
        session_id: session._id,
        student_id: s._id,
        status: "ABSENT",
        markedBy: teacher._id,
      }));

    if (absentees.length > 0) {
      await AttendanceRecord.insertMany(absentees);
    }

    session.totalStudents = students.length;
    session.status = "CLOSED";
    await session.save();

    res.status(200).json({
      message: "Attendance session closed successfully",
      totalStudents: students.length,
      present: presentIds.length,
      absent: absentees.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET ATTENDANCE RECORDS OF A SESSION
   GET /attendance/sessions/:sessionId/records
========================================================= */
exports.getAttendanceRecordsBySession = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const records = await AttendanceRecord.find({
      session_id: req.params.sessionId,
      college_id: collegeId,
    })
      .populate("student_id", "fullName email")
      .populate({
        path: "markedBy",
        select: "name",
      })
      .sort({ createdAt: -1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET TEACHER ATTENDANCE REPORT (PRODUCTION GRADE)
   GET /attendance/report
========================================================= */
exports.getAttendanceReport = async (req, res) => {
  try {
    const collegeId = req.college_id;
    const teacherId = req.teacher_id;

    const { courseId, subjectId, startDate, endDate } = req.query;

    /* ================= FETCH COLLEGE INFO ================= */
    const college = await College.findById(collegeId).select("name code");

    /* ================= MATCH CONDITIONS ================= */
    const match = {
      college_id: new mongoose.Types.ObjectId(collegeId),
      teacher_id: new mongoose.Types.ObjectId(teacherId),
    };

    if (courseId) {
      match.course_id = new mongoose.Types.ObjectId(courseId);
    }

    if (subjectId) {
      match.subject_id = new mongoose.Types.ObjectId(subjectId);
    }

    if (startDate && endDate) {
      match.lectureDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    /* ================= FETCH SESSIONS ================= */
    const sessions = await AttendanceSession.find(match)
      .populate("subject_id", "name")
      .populate("course_id", "name code")
      .sort({ lectureDate: -1 });

    const sessionIds = sessions.map((s) => s._id);

    /* ================= FETCH RECORDS ================= */
    const records = await AttendanceRecord.find({
      session_id: { $in: sessionIds },
    });

    /* ================= BUILD SESSION-WISE DATA ================= */
    const sessionReport = sessions.map((session) => {
      const sessionRecords = records.filter(
        (r) => r.session_id.toString() === session._id.toString(),
      );

      const total = sessionRecords.length;
      const present = sessionRecords.filter(
        (r) => r.status === "PRESENT",
      ).length;
      const absent = sessionRecords.filter((r) => r.status === "ABSENT").length;

      const percentage = total > 0 ? (present / total) * 100 : 0;

      return {
        _id: session._id,
        date: session.lectureDate,
        subject: session.subject_id?.name || "N/A",
        course: session.course_id?.name || "N/A",
        lectureNumber: session.lectureNumber,
        totalStudents: total,
        present,
        absent,
        percentage,
      };
    });

    /* ================= SUMMARY ================= */
    const totalLectures = sessions.length;
    const totalStudents = records.length;
    const totalPresent = records.filter((r) => r.status === "PRESENT").length;
    const totalAbsent = records.filter((r) => r.status === "ABSENT").length;

    res.json({
      college: {
        name: college?.name || "N/A",
        code: college?.code || "N/A",
      },
      summary: {
        totalLectures,
        totalStudents,
        totalPresent,
        totalAbsent,
      },
      sessions: sessionReport,
    });
  } catch (error) {
    console.error("Attendance report error:", error);
    res.status(500).json({
      message: "Failed to load attendance report",
    });
  }
};

/* =========================================================
   GET STUDENT ATTENDANCE REPORT (PRODUCTION GRADE)
   GET /attendance/student
========================================================= */
exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const student = req.student;

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const sessions = await AttendanceSession.find({
      college_id: req.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
    }).populate("subject_id", "name code");

    let total = 0;
    let present = 0;
    let absent = 0;

    const sessionReport = [];
    const subjectMap = {}; // 🔥 For subject-wise breakdown

    for (const session of sessions) {
      const record = await AttendanceRecord.findOne({
        session_id: session._id,
        student_id: student._id,
      });

      if (!record) continue;

      total++;

      if (record.status === "PRESENT") present++;
      if (record.status === "ABSENT") absent++;

      // Session-wise
      sessionReport.push({
        date: session.lectureDate,
        subject: session.subject_id.name,
        subjectCode: session.subject_id.code,
        lectureNumber: session.lectureNumber,
        startTime: session.slotSnapshot?.startTime || "N/A",
        endTime: session.slotSnapshot?.endTime || "N/A",
        room: session.slotSnapshot?.room || "N/A",
        teacher: session.slotSnapshot?.teacher_name || "N/A",
        status: record.status,
      });

      // 🔥 Subject-wise aggregation
      const subjectId = session.subject_id._id.toString();

      if (!subjectMap[subjectId]) {
        subjectMap[subjectId] = {
          subject: session.subject_id.name,
          code: session.subject_id.code,
          total: 0,
          present: 0,
        };
      }

      subjectMap[subjectId].total++;

      if (record.status === "PRESENT") {
        subjectMap[subjectId].present++;
      }
    }

    // 🔥 Convert subjectMap to array
    const subjectBreakdown = Object.values(subjectMap).map((sub) => {
      const percentage =
        sub.total > 0 ? ((sub.present / sub.total) * 100).toFixed(2) : 0;

      return {
        ...sub,
        percentage,
        warning: percentage < 75, // ⚠ below 75%
      };
    });

    res.json({
      summary: {
        totalLectures: total,
        present,
        absent,
        percentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
      },
      sessions: sessionReport,
      subjectWise: subjectBreakdown,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load attendance report",
    });
  }
};

/* =========================================================
  GET TEACHER'S COURSES FOR ATTENDANCE REPORT (PRODUCTION GRADE)
========================================================= */
exports.getTeacherCourses = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const teacher = await Teacher.findOne({
      user_id: req.user.id, // ✅ FIXED
      college_id: collegeId, // ✅ VERY IMPORTANT
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    if (!teacher.courses || teacher.courses.length === 0) {
      return res.json([]);
    }

    const courses = await Course.find({
      _id: { $in: teacher.courses },
      college_id: collegeId,
    }).select("name");

    res.status(200).json(courses);
  } catch (error) {
    console.error("Fetch courses error:", error);
    res.status(500).json({
      message: "Failed to fetch courses",
    });
  }
};

/* =========================================================
  GET TEACHER'S SUBJECTS FOR ATTENDANCE REPORT (PRODUCTION GRADE)
========================================================= */
exports.getTeacherSubjectsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const collegeId = req.college_id;

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({ message: "Teacher not found" });
    }

    // Fetch subjects directly from Subject collection
    const subjects = await Subject.find({
      college_id: collegeId,
      course_id: courseId,
      teacher_id: teacher._id, // important
      status: "ACTIVE",
    }).select("_id name code");

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET TODAY'S SLOTS FOR TEACHER (FOR ATTENDANCE)
   GET /attendance/today-slots
   Purpose: Show slots for today where teacher can start attendance
========================================================= */
exports.getTodaySlotsForTeacher = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const userId = req.user.id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: userId,
      college_id: collegeId,
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
    }

    // Get today's day name
    const today = new Date();
    const todayDayName = getDayName(today);
    const todayStr = today.toISOString().split("T")[0];

    console.log(`📅 Today: ${todayStr} (${todayDayName})`);

    // Find all PUBLISHED timetables for teacher's department
    const slots = await TimetableSlot.find({
      college_id: collegeId,
      teacher_id: teacher._id,
      day: todayDayName,
    })
      .populate("subject_id", "name code")
      .populate("timetable_id", "name status semester academicYear")
      .populate("course_id", "name")
      .sort({ startTime: 1 });

    // Filter only slots from PUBLISHED timetables
    const publishedSlots = slots.filter(
      (slot) => slot.timetable_id?.status === "PUBLISHED",
    );

    // Check if attendance session already exists for each slot
    const slotsWithSessionStatus = await Promise.all(
      publishedSlots.map(async (slot) => {
        // Check for existing sessions today for this slot
        const existingSessions = await AttendanceSession.find({
          slot_id: slot._id,
          lectureDate: {
            $gte: new Date(todayStr),
            $lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000),
          },
        });

        const hasOpenSession = existingSessions.some(
          (s) => s.status === "OPEN",
        );
        const hasClosedSession = existingSessions.some(
          (s) => s.status === "CLOSED",
        );
        const sessionCount = existingSessions.length;

        return {
          ...slot.toObject(),
          canStartAttendance: !hasOpenSession && !hasClosedSession,
          hasOpenSession,
          hasClosedSession,
          sessionCount,
          message: hasOpenSession
            ? "Attendance session already open"
            : hasClosedSession
              ? `Attendance already closed (${sessionCount} sessions)`
              : "Can start attendance",
        };
      }),
    );

    res.json({
      today: todayStr,
      dayName: todayDayName,
      totalSlots: slotsWithSessionStatus.length,
      availableForAttendance: slotsWithSessionStatus.filter(
        (s) => s.canStartAttendance,
      ).length,
      slots: slotsWithSessionStatus,
    });
  } catch (error) {
    next(error);
  }
};

const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Student = require("../models/student.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Teacher = require("../models/teacher.model");
const Notification = require("../models/notification.model");

/**
 * AUTO-CLOSE ATTENDANCE SESSIONS
 *
 * Purpose:
 * - Automatically close sessions after slot end time + 5 minutes
 * - Mark all unmarked students as PRESENT
 * - Preserve session history
 * - Notify teacher about auto-closed session (FIX: Flow 3)
 *
 * Run: Every 5 minutes
 */
exports.autoCloseAttendanceSessions = async () => {
  try {
    // console.log('🕐 [Auto-Close] Starting auto-close job...');

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const today = now.toISOString().split('T')[0];

    // console.log(`📍 Current time: ${currentTime} (${today})`);

    // ✅ Step 1: Find all OPEN sessions for today
    const openSessions = await AttendanceSession.find({
      status: 'OPEN',
      lectureDate: {
        $gte: new Date(today),
        $lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('slot_id');

    // console.log(`📊 Found ${openSessions.length} open sessions`);

    if (openSessions.length === 0) {
      // console.log('✅ No sessions to close');
      return;
    }

    let closedCount = 0;
    let errorCount = 0;
    const notifiedTeachers = new Set();

    // ✅ Step 2: Process each session
    for (const session of openSessions) {
      try {
        const slot = session.slot_id;

        if (!slot) {
          // console.log(`⚠️  Session ${session._id} has no slot, skipping...`);
          continue;
        }

        const slotEndTime = slot.endTime; // e.g., "10:00"
        const sessionDate = session.lectureDate.toISOString().split('T')[0];

        // console.log(`⏳ Checking session ${session._id}: Slot ends at ${slotEndTime}`);

        // ✅ Step 3: Check if slot end time has passed + 5 minutes buffer
        const [endHour, endMinute] = slotEndTime.split(':').map(Number);
        const slotEndDateTime = new Date(sessionDate);
        slotEndDateTime.setHours(endHour, endMinute, 0, 0);

        // Add 5 minutes buffer
        const autoCloseTime = new Date(slotEndDateTime.getTime() + 5 * 60 * 1000);

        // console.log(`   Slot end: ${slotEndDateTime.toLocaleTimeString()}`);
        // console.log(`   Auto-close at: ${autoCloseTime.toLocaleTimeString()}`);
        // console.log(`   Current time: ${now.toLocaleTimeString()}`);

        // Check if current time is past auto-close time
        if (now < autoCloseTime) {
          // console.log(`   ⏭️  Not yet time to close (waiting until ${autoCloseTime.toLocaleTimeString()})`);
          continue;
        }

        // ✅ Step 4: Get all students for this course
        const students = await Student.find({
          college_id: session.college_id,
          course_id: session.course_id,
          status: 'APPROVED'
        });

        // console.log(`   📚 Total students: ${students.length}`);

        // ✅ Step 5: Get already marked attendance records
        const markedRecords = await AttendanceRecord.find({
          session_id: session._id
        });

        const markedStudentIds = markedRecords.map(r => r.student_id.toString());
        const unmarkedCount = students.length - markedStudentIds.length;

        // console.log(`   ✅ Already marked: ${markedStudentIds.length}`);
        // console.log(`   ⚠️  Unmarked: ${unmarkedCount}`);

        // ✅ Step 6: Mark all unmarked students as PRESENT
        if (unmarkedCount > 0) {
          const unmarkedStudents = students.filter(
            s => !markedStudentIds.includes(s._id.toString())
          );

          const autoMarkedRecords = unmarkedStudents.map(student => ({
            college_id: session.college_id,
            session_id: session._id,
            student_id: student._id,
            status: 'PRESENT',
            markedBy: session.teacher_id, // Attribute to session owner
            createdAt: autoCloseTime,
            updatedAt: autoCloseTime
          }));

          // Insert all auto-marked records
          await AttendanceRecord.insertMany(autoMarkedRecords);
          // console.log(`   ✅ Auto-marked ${unmarkedCount} students as PRESENT`);
        }

        // ✅ Step 7: Close the session
        session.status = 'CLOSED';
        session.autoClosedAt = autoCloseTime;
        session.autoClosed = true;
        await session.save();

        // 🔔 Step 8: Notify teacher about auto-close (FIX: Flow 3)
        if (!notifiedTeachers.has(session.teacher_id.toString())) {
          try {
            const teacher = await Teacher.findById(session.teacher_id);
            
            if (teacher && teacher.user_id) {
              await Notification.create({
                college_id: session.college_id,
                createdBy: session.teacher_id, // System notification
                createdByRole: "COLLEGE_ADMIN",
                target: "INDIVIDUAL",
                target_users: [teacher.user_id],
                title: "Attendance Session Auto-Closed",
                message: `Your attendance session for ${session.slotSnapshot?.subject_name || 'the subject'} has been automatically closed. ${unmarkedCount > 0 ? `${unmarkedCount} unmarked students were marked as PRESENT.` : 'All students were marked.'}`,
                type: "ATTENDANCE",
                actionUrl: `/attendance/my-sessions-list`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
              });
              // console.log(`   🔔 Teacher ${teacher.name} notified about auto-close`);
            }
          } catch (notifError) {
            console.error(`   ❌ Failed to notify teacher for session ${session._id}:`, notifError.message);
          }
          
          notifiedTeachers.add(session.teacher_id.toString());
        }

        closedCount++;
        // console.log(`   ✅ Session ${session._id} closed successfully`);
        // console.log(`   📝 Snapshot preserved: ${session.slotSnapshot.subject_name} (${session.slotSnapshot.teacher_name})\n`);

      } catch (err) {
        errorCount++;
        console.error(`   ❌ Error processing session ${session._id}:`, err.message);
      }
    }

    // console.log('\n' + '='.repeat(50));
    // console.log('📊 AUTO-CLOSE SUMMARY');
    // console.log('='.repeat(50));
    // console.log(`✅ Sessions closed: ${closedCount}`);
    // console.log(`❌ Errors: ${errorCount}`);
    // console.log(`🔔 Teachers notified: ${notifiedTeachers.size}`);
    // console.log('='.repeat(50));
    // console.log('🕐 [Auto-Close] Job completed\n');

  } catch (error) {
    console.error('❌ [Auto-Close] Job failed:', error.message);
    console.error(error.stack);
  }
};

/**
 * CLEANUP OLD SESSIONS (Optional Maintenance)
 * 
 * Purpose:
 * - Delete very old sessions (e.g., > 1 year)
 * - Keep database clean
 * 
 * Run: Once a week
 */
exports.cleanupOldSessions = async () => {
  try {
    // console.log('🧹 [Cleanup] Starting old session cleanup...');

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await AttendanceSession.deleteMany({
      status: 'CLOSED',
      lectureDate: { $lt: oneYearAgo }
    });

    // console.log(`✅ Deleted ${result.deletedCount} old sessions`);
    // console.log('🧹 [Cleanup] Job completed\n');

  } catch (error) {
    console.error('❌ [Cleanup] Job failed:', error.message);
  }
};

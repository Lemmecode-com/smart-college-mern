const AttendanceSession = require("../models/attendanceSession.model");
const TimetableSlot = require("../models/timetableSlot.model");

/**
 * SLOT SNAPSHOT SYNC SERVICE
 * 
 * Purpose:
 * - Sync attendance session snapshots with updated timetable slots
 * - Track snapshot versions for audit trail
 * - Allow manual correction of snapshot data
 * 
 * FIX: DATA-003 - Data Redundancy in slotSnapshot
 */

/**
 * Sync a single attendance session snapshot with its source timetable slot
 * @param {string} sessionId - Attendance session ID
 * @param {object} options - Sync options
 * @returns {Promise<object>} Sync result
 */
exports.syncSessionSnapshot = async (sessionId, options = {}) => {
  try {
    const session = await AttendanceSession.findById(sessionId)
      .populate('slot_id');
    
    if (!session || !session.slot_id) {
      throw new Error('Session or slot not found');
    }

    const slot = session.slot_id;
    
    // Update snapshot with current slot data
    session.slotSnapshot = {
      subject_id: slot.subject_id,
      subject_name: slot.subject_id?.name || 'Unknown',
      subject_code: slot.subject_id?.code || 'N/A',
      teacher_id: slot.teacher_id,
      teacher_name: slot.teacher_id?.name || 'Unknown',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room || '',
      slotType: slot.slotType || 'LECTURE'
    };

    // Increment version
    session.snapshotVersion = (session.snapshotVersion || 1) + 1;
    session.syncedAt = new Date();
    session.snapshotVerified = options.verified !== false;

    await session.save();

    return {
      success: true,
      sessionId: session._id,
      version: session.snapshotVersion,
      syncedAt: session.syncedAt
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Sync all attendance sessions for a timetable slot
 * @param {string} slotId - Timetable slot ID
 * @param {object} options - Sync options
 * @returns {Promise<object>} Sync summary
 */
exports.syncSessionsForSlot = async (slotId, options = {}) => {
  try {
    const sessions = await AttendanceSession.find({ slot_id: slotId });
    
    const results = {
      total: sessions.length,
      synced: 0,
      failed: 0,
      errors: []
    };

    for (const session of sessions) {
      try {
        await exports.syncSessionSnapshot(session._id, options);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          sessionId: session._id,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};

/**
 * Sync all attendance sessions for a course
 * @param {string} courseId - Course ID
 * @param {object} options - Sync options
 * @returns {Promise<object>} Sync summary
 */
exports.syncSessionsForCourse = async (courseId, options = {}) => {
  try {
    const slots = await TimetableSlot.find({ course_id: courseId });
    
    const results = {
      totalSlots: slots.length,
      totalSessions: 0,
      synced: 0,
      failed: 0,
      errors: []
    };

    for (const slot of slots) {
      const slotResult = await exports.syncSessionsForSlot(slot._id, options);
      results.totalSessions += slotResult.total;
      results.synced += slotResult.synced;
      results.failed += slotResult.failed;
      if (slotResult.errors.length > 0) {
        results.errors.push({
          slotId: slot._id,
          errors: slotResult.errors
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};

/**
 * Get sessions with outdated snapshots
 * @param {string} collegeId - College ID
 * @returns {Promise<Array>} Sessions that may need sync
 */
exports.getOutdatedSnapshots = async (collegeId) => {
  try {
    const sessions = await AttendanceSession.find({
      college_id: collegeId,
      $or: [
        { snapshotVerified: false },
        { syncedAt: { $exists: false } }
      ]
    })
      .populate('slot_id', 'updatedAt')
      .select('_id slot_id snapshotVersion syncedAt snapshotVerified lectureDate');

    return sessions.filter(session => {
      const slot = session.slot_id;
      if (!slot) return true; // No slot, needs review
      
      const slotUpdatedAt = slot.updatedAt;
      const sessionSyncedAt = session.syncedAt;
      
      // Slot was updated after session was synced
      if (slotUpdatedAt && (!sessionSyncedAt || slotUpdatedAt > sessionSyncedAt)) {
        return true;
      }
      
      return false;
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Bulk sync all sessions for a college (admin operation)
 * @param {string} collegeId - College ID
 * @param {object} options - Sync options
 * @returns {Promise<object>} Full sync summary
 */
exports.bulkSyncAllSessions = async (collegeId, options = {}) => {
  try {
    const slots = await TimetableSlot.find({ college_id: collegeId });
    
    const results = {
      collegeId,
      totalSlots: slots.length,
      totalSessions: 0,
      synced: 0,
      failed: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: null
    };

    for (const slot of slots) {
      try {
        const slotResult = await exports.syncSessionsForSlot(slot._id, options);
        results.totalSessions += slotResult.total;
        results.synced += slotResult.synced;
        results.failed += slotResult.failed;
      } catch (error) {
        results.errors.push({
          slotId: slot._id,
          error: error.message
        });
        results.failed++;
      }
    }

    results.completedAt = new Date();
    return results;
  } catch (error) {
    throw error;
  }
};

const Backlog = require("../models/backlog.model");

/**
 * Filter published Exam and ExamSchedule subjects for student visibility.
 *
 * Architecture:
 *   ONE published Exam Timetable -> Student-specific visibility filtering.
 *
 * Rules:
 *   - REGULAR subjects are visible to all enrolled students for the course & semester.
 *   - BACKLOG subjects are visible ONLY if the logged-in student has an active backlog
 *     record (status: 'OPEN' or 'ATTEMPTED') matching (college_id, student_id, subject_id).
 *   - Backlog records with status 'CLEARED', 'CANCELLED', or no backlog record do NOT qualify.
 *   - Strict tenant isolation: Backlog query is always scoped to college_id.
 */
async function filterPublishedExamAndScheduleForStudent({
  exam,
  schedule,
  student,
  collegeId,
}) {
  if (!exam) return { exam: null, schedule: null };

  const examSubjects = exam.subjects || [];

  // 1. Identify all BACKLOG subjects configured on this exam
  const backlogSubjectIds = [];
  for (const entry of examSubjects) {
    if (entry.category === "BACKLOG") {
      const subjectId = String(entry.subject?._id || entry.subject);
      backlogSubjectIds.push(subjectId);
    }
  }

  // 2. Query active backlogs for this exact student in this exact college
  let activeBacklogSubjectIdSet = new Set();
  if (backlogSubjectIds.length > 0 && student?._id) {
    const activeBacklogs = await Backlog.find({
      college_id: collegeId,
      student_id: student._id,
      subject_id: { $in: backlogSubjectIds },
      status: { $in: ["OPEN", "ATTEMPTED"] },
    }).select("subject_id status");

    activeBacklogSubjectIdSet = new Set(
      activeBacklogs.map((b) => String(b.subject_id)),
    );
  }

  // 3. Determine allowed subject IDs
  // REGULAR: visible to all students enrolled in the course & semester.
  // BACKLOG: visible ONLY if student has an active backlog record for that exact subject.
  const allowedSubjectIdSet = new Set();
  for (const entry of examSubjects) {
    const subjectId = String(entry.subject?._id || entry.subject);
    if (entry.category !== "BACKLOG") {
      allowedSubjectIdSet.add(subjectId);
    } else if (activeBacklogSubjectIdSet.has(subjectId)) {
      allowedSubjectIdSet.add(subjectId);
    }
  }

  // 4. Filter and decorate exam object
  const examObj = exam.toObject ? exam.toObject() : { ...exam };
  if (Array.isArray(examObj.subjects)) {
    examObj.subjects = examObj.subjects.filter((s) =>
      allowedSubjectIdSet.has(String(s.subject?._id || s.subject)),
    );
  }

  // 5. Filter and decorate schedule object (if present)
  let scheduleObj = null;
  if (schedule) {
    scheduleObj = schedule.toObject ? schedule.toObject() : { ...schedule };

    // Build lookup map from original exam subjects to ensure category and originalSemester
    const examSubMap = new Map(
      examSubjects.map((s) => [String(s.subject?._id || s.subject), s]),
    );

    if (Array.isArray(scheduleObj.subjects)) {
      scheduleObj.subjects = scheduleObj.subjects
        .filter((entry) =>
          allowedSubjectIdSet.has(String(entry.subject?._id || entry.subject)),
        )
        .map((entry) => {
          const subjectId = String(entry.subject?._id || entry.subject);
          const examSub = examSubMap.get(subjectId);
          return {
            ...entry,
            category: entry.category || examSub?.category || "REGULAR",
            originalSemester:
              entry.originalSemester !== undefined
                ? entry.originalSemester
                : examSub?.originalSemester,
          };
        });
    }
  }

  return { exam: examObj, schedule: scheduleObj };
}

/**
 * Filter an array of published exams for student list view.
 */
async function filterPublishedExamsListForStudent({
  exams,
  student,
  collegeId,
}) {
  if (!Array.isArray(exams) || exams.length === 0) return [];

  const allBacklogSubjectIds = new Set();
  for (const exam of exams) {
    for (const s of exam.subjects || []) {
      if (s.category === "BACKLOG") {
        allBacklogSubjectIds.add(String(s.subject?._id || s.subject));
      }
    }
  }

  let activeBacklogSubjectIdSet = new Set();
  if (allBacklogSubjectIds.size > 0 && student?._id) {
    const activeBacklogs = await Backlog.find({
      college_id: collegeId,
      student_id: student._id,
      subject_id: { $in: Array.from(allBacklogSubjectIds) },
      status: { $in: ["OPEN", "ATTEMPTED"] },
    }).select("subject_id");

    activeBacklogSubjectIdSet = new Set(
      activeBacklogs.map((b) => String(b.subject_id)),
    );
  }

  return exams.map((exam) => {
    const examObj = exam.toObject ? exam.toObject() : { ...exam };
    if (Array.isArray(examObj.subjects)) {
      examObj.subjects = examObj.subjects.filter((s) => {
        if (s.category !== "BACKLOG") return true;
        const subjectId = String(s.subject?._id || s.subject);
        return activeBacklogSubjectIdSet.has(subjectId);
      });
    }
    return examObj;
  });
}

module.exports = {
  filterPublishedExamAndScheduleForStudent,
  filterPublishedExamsListForStudent,
};

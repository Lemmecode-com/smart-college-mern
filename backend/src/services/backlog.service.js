const mongoose = require("mongoose");
const Backlog = require("../models/backlog.model");
const PromotionDecision = require("../models/promotionDecision.model");
const SemesterResult = require("../models/semesterResult.model");
const { resolveMaxAllowedKTs } = require("../utils/promotionPolicy.util");

const getDecision = async (decisionOrId, session) => {
  if (decisionOrId && typeof decisionOrId === "object" && decisionOrId._id) {
    return decisionOrId;
  }

  return PromotionDecision.findById(decisionOrId)
    .session(session || null)
    .exec();
};

const buildBacklog = (decision, result, subject) => ({
  student_id: decision.student_id,
  college_id: decision.college_id,
  course_id: decision.course_id,
  semester: decision.semester,
  academicYear: decision.academicYear,
  original_exam_id: decision.source_exam_id || result.exam_id,
  original_result_id: decision.source_result_id || result._id,
  subject_id: subject.subject,
  subject_code: subject.subjectCode,
  subject_name: subject.subjectName,
  subject_type: subject.subjectType,
  original_marks_snapshot: subject.toObject
    ? subject.toObject()
    : { ...subject },
  status: "OPEN",
});

const createBacklogs = async (
  decisionOrId,
  { session: providedSession } = {},
) => {
  let session = providedSession;
  let ownsSession = false;

  if (!session) {
    session = await mongoose.startSession();
    ownsSession = true;
  }

  let result;
  const execute = async (transactionSession) => {
    const decision = await getDecision(decisionOrId, transactionSession);
    if (!decision || decision.promotion_outcome !== "ATKT") return [];

    const maxAllowedKTs = resolveMaxAllowedKTs(decision.policy_snapshot);
    if (decision.kt_count > maxAllowedKTs) return [];
    if (!decision.source_result_id || decision.failed_subject_ids.length === 0)
      return [];

    const authoritativeResult = await SemesterResult.findOne({
      _id: decision.source_result_id,
      status: "PUBLISHED",
    }).session(transactionSession);
    if (!authoritativeResult) return [];

    const failedIds = new Set(decision.failed_subject_ids.map(String));
    const failedSubjects = authoritativeResult.subjects.filter(
      (subject) =>
        failedIds.has(String(subject.subject)) && subject.status === "FAIL",
    );
    if (failedSubjects.length !== decision.kt_count) {
      throw new Error(
        "Promotion decision failed subjects do not match the published result",
      );
    }

    const backlogs = [];
    for (const subject of failedSubjects) {
      const identity = {
        student_id: decision.student_id,
        course_id: decision.course_id,
        semester: decision.semester,
        academicYear: decision.academicYear,
        subject_id: subject.subject,
        original_result_id: decision.source_result_id,
      };
      let backlog = await Backlog.findOne({
        ...identity,
        status: "OPEN",
      }).session(transactionSession);
      if (!backlog) {
        try {
          backlog = await Backlog.create(
            [{ ...buildBacklog(decision, authoritativeResult, subject) }],
            {
              session: transactionSession,
            },
          ).then(([created]) => created);
        } catch (error) {
          if (error?.code !== 11000) throw error;
          backlog = await Backlog.findOne({
            ...identity,
            status: "OPEN",
          }).session(transactionSession);
        }
      }
      backlogs.push(backlog);
    }
    return backlogs;
  };

  try {
    if (ownsSession) {
      await session.withTransaction(async () => {
        result = await execute(session);
      });
    } else {
      result = await execute(session);
    }
    return result || [];
  } finally {
    if (ownsSession) await session.endSession();
  }
};

const getBacklogsForStudent = ({ studentId, collegeId, status } = {}) => {
  const query = { student_id: studentId, college_id: collegeId };
  if (status) query.status = status;
  return Backlog.find(query).sort({ created_at: 1 }).exec();
};

module.exports = {
  createBacklogsForPromotionDecision: createBacklogs,
  getBacklogsForStudent,
};

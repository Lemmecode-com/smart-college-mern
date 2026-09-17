import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../../../auth/AuthContext";
import Breadcrumb from "../../../components/Breadcrumb";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import {
  getSupplementaryExams,
  getSupplementaryExamById,
  getSupplementaryRoster,
  getSupplementaryMarks,
  saveSupplementaryMarks,
} from "../../../api/backlog";
import { evaluateBacklogAttempt } from "../../../api/promotion";

import {
  FaGraduationCap,
  FaBookOpen,
  FaLayerGroup,
  FaClipboardList,
  FaSearch,
  FaTimes,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEye,
  FaBook,
  FaSave,
  FaEdit,
  FaUndo,
} from "react-icons/fa";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
]);

function isAuthError(statusCode, errorCode) {
  return (
    statusCode === 401 ||
    (errorCode && AUTH_ERROR_CODES.has(errorCode))
  );
}

function getExamTypeLabel(examType) {
  if (!examType) return "Regular";
  const labels = {
    SUPPLEMENTARY: "Supplementary",
    RE_EXAM: "Re-Exam",
    REGULAR: "Regular",
  };
  return labels[examType] || examType;
}

function getExamTypeBadge(examType) {
  const type = (examType || "").toUpperCase();
  if (type === "SUPPLEMENTARY") return "badge badge-info";
  if (type === "RE_EXAM") return "badge badge-warning";
  if (type === "REGULAR") return "badge badge-secondary";
  return "badge badge-secondary";
}

function getStatusBadge(status) {
  switch (String(status || "").toUpperCase()) {
    case "PUBLISHED":
      return "badge badge-success";
    case "DRAFT":
      return "badge badge-warning";
    case "CANCELLED":
      return "badge badge-secondary";
    default:
      return "badge badge-secondary";
  }
}

const EVALUATED_RESULT_STATUSES = new Set(["PASS", "FAIL", "CLEARED"]);

function getEvaluationStatusBadge(status) {
  switch (String(status || "").toUpperCase()) {
    case "PASS":
    case "CLEARED":
      return "badge badge-success";
    case "FAIL":
      return "badge badge-danger";
    case "INCOMPLETE":
      return "badge badge-warning";
    case "ATTEMPTED":
      return "badge badge-info";
    default:
      return "badge badge-secondary";
  }
}

function normalizeEvaluationResponse(res) {
  const payload = res?.data ?? res;
  const nested = payload?.data;
  const attempt = payload?.attempt || nested?.attempt || null;
  const backlog = payload?.backlog || nested?.backlog || null;

  return {
    attempt,
    backlog,
    idempotent: Boolean(payload?.idempotent ?? nested?.idempotent),
    resultStatus:
      payload?.resultStatus || attempt?.result_status || attempt?.resultStatus || null,
    passed: payload?.passed ?? attempt?.passed,
    backlogCleared: payload?.backlogCleared ?? attempt?.cleared,
    message: payload?.message || res?.message,
  };
}

function isEvaluatedAttempt(student) {
  const status = String(student?.attemptResultStatus || "").toUpperCase();
  return EVALUATED_RESULT_STATUSES.has(status);
}

function getEvaluationKey(student) {
  return String(student?.studentId || student?.backlogId || student?.attemptId || "");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

const normalizeExamList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const candidate = res.data ?? res.exams ?? res.results;
  return Array.isArray(candidate) ? candidate : [];
};

const normalizeExamDetail = (res) => {
  if (!res) return null;
  if (res._id || res.name) return res;
  return res.data ?? res.exam ?? null;
};

const normalizeSubjects = (exam) => {
  const list = exam?.subjects;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (item) => item && (item.subject || item._id),
  );
};

const getSubjectId = (subject) => {
  if (!subject) return null;
  if (typeof subject.subject === "object" && subject.subject?._id) {
    return String(subject.subject._id);
  }
  if (subject.subject) return String(subject.subject);
  return subject._id ? String(subject._id) : null;
};

const getSubjectLabel = (subject) => {
  const s = subject.subject || {};
  const code = s.code || subject.code;
  const name = s.name || subject.name;
  if (code && name) return `${code} — ${name}`;
  if (code) return code;
  if (name) return name;
  return "Subject";
};

const getSubjectType = (subject) => {
  return subject.subjectType || subject.subject?.subjectType || subject.type || "-";
};

export default function SupplementaryEvaluation() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Step 1: Supplementary exams
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState(null);
  const [search, setSearch] = useState("");

  // Step 2: Exam detail (subjects)
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDetailLoading, setExamDetailLoading] = useState(false);
  const [examDetailError, setExamDetailError] = useState(null);

  // Step 3: Subject selection
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [validationError, setValidationError] = useState("");

  // Step 4: Roster
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterMeta, setRosterMeta] = useState(null);

  // Step 4.5: Supplementary Marks (loaded separately)
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksError, setMarksError] = useState(null);

  // Step 5: Marks Entry
  const [marksEntryMode, setMarksEntryMode] = useState(false);
  const [marksMap, setMarksMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const submissionGuard = useRef(false);

  // Step 6: Per-attempt evaluation
  const [evaluationMode, setEvaluationMode] = useState(false);
  const [evaluatingStudents, setEvaluatingStudents] = useState({});
  const [evaluationErrors, setEvaluationErrors] = useState({});
  const evaluationGuard = useRef(new Set());

  const fetchMarks = async (examId, subjectId) => {
    try {
      setMarksLoading(true);
      setMarksError(null);
      const res = await getSupplementaryMarks({ examId, subjectId });
      const data = res?.data ?? res;
      // Merge marks with roster
      const marksMap = new Map();
      (data.marks || []).forEach((mark) => {
        marksMap.set(String(mark.student_id), mark);
      });
      setRoster((prevRoster) =>
        prevRoster.map((student) => {
          const mark = marksMap.get(String(student.studentId));
          if (!mark) return student;
          return {
            ...student,
            marks: {
              _id: mark._id,
              internalMarks: mark.internalMarks,
              externalMarks: mark.externalMarks,
              createdAt: mark.createdAt,
              updatedAt: mark.updatedAt,
            },
            calculation: mark.calculation || student.calculation,
          };
        }),
      );
      return data;
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load supplementary marks.";

      logger.error("Error fetching supplementary marks:", statusCode, errorCode);

      setMarksError({ message: errorMessage, statusCode, errorCode });
      if (!isAuthError(statusCode, errorCode)) {
        toast.error(errorMessage);
      }
    } finally {
      setMarksLoading(false);
    }
  };

  const initializeMarksMap = (rosterData, meta, marksData = null) => {
    const marksByStudent = marksData
      ? new Map(
          (marksData || []).map((mark) => [
            String(mark.student_id ?? mark.studentId),
            mark,
          ]),
        )
      : new Map(
          (rosterData || []).map((entry) => [
            String(entry.studentId),
            entry.marks || null,
          ]),
        );
    const initialMarks = {};
    for (const entry of rosterData || []) {
      const mark = marksByStudent.get(String(entry.studentId));
      if (mark) {
        initialMarks[String(entry.studentId)] = {
          internalMarks: mark.internalMarks ?? "",
          externalMarks: mark.externalMarks ?? "",
        };
      } else {
        initialMarks[String(entry.studentId)] = {
          internalMarks: "",
          externalMarks: "",
        };
      }
    }
    setMarksMap(initialMarks);
    // Store max marks for validation
    if (meta) {
      setRosterMeta((prev) => ({
        ...prev,
        internalMaxMarks: meta.internalMaxMarks,
        externalMaxMarks: meta.externalMaxMarks,
        subjectType: meta.subjectType,
      }));
    }
  };

  const resetEvaluationState = () => {
    setEvaluationMode(false);
    setEvaluatingStudents({});
    setEvaluationErrors({});
    evaluationGuard.current = new Set();
  };

  const fetchRoster = async (examId, subjectId) => {
    resetEvaluationState();
    try {
      setRosterLoading(true);
      setRosterError(null);
      const res = await getSupplementaryRoster({ examId, subjectId });
      const data = res?.data ?? res;
      setRoster(data.roster || []);
      setRosterMeta({
        totalStudents: data.totalStudents,
        markedCount: data.markedCount,
        subjectType: data.subjectType,
        internalMaxMarks: data.internalMaxMarks,
        externalMaxMarks: data.externalMaxMarks,
      });
      // Load marks after roster is loaded
      fetchMarks(examId, subjectId);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load student roster.";

      logger.error("Error fetching supplementary roster:", statusCode, errorCode);

      setRosterError({ message: errorMessage, statusCode, errorCode });
      setRoster([]);
      setRosterMeta(null);
      if (!isAuthError(statusCode, errorCode)) {
        toast.error(errorMessage);
      }
    } finally {
      setRosterLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      setExamsLoading(true);
      setExamsError(null);
      const res = await getSupplementaryExams();
      const list = normalizeExamList(res);
      setExams(list);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load supplementary exams.";

      logger.error("Error fetching supplementary exams:", statusCode, errorCode);

      setExamsError({ message: errorMessage, statusCode, errorCode });
      if (!isAuthError(statusCode, errorCode)) {
        toast.error(errorMessage);
      }
    } finally {
      setExamsLoading(false);
    }
  };

  const fetchExamDetail = async (examId) => {
    try {
      setExamDetailLoading(true);
      setExamDetailError(null);
      const res = await getSupplementaryExamById(examId);
      const exam = normalizeExamDetail(res);
      setSelectedExam(exam);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load exam details.";

      logger.error("Error fetching supplementary exam details:", statusCode, errorCode);

      setExamDetailError({ message: errorMessage, statusCode, errorCode });
      if (!isAuthError(statusCode, errorCode)) {
        toast.error(errorMessage);
      }
    } finally {
      setExamDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchExams();
  }, [user]);

  useEffect(() => {
    if (!selectedExamId || !user) {
      setSelectedExam(null);
      setSelectedSubjectId(null);
      setValidationError("");
      return;
    }

    fetchExamDetail(selectedExamId);
  }, [selectedExamId, user]);

  useEffect(() => {
    if (!selectedExamId || !selectedSubjectId || !user) {
      setRoster([]);
      setRosterMeta(null);
      setRosterError(null);
      setRosterSearch("");
      return;
    }

    fetchRoster(selectedExamId, selectedSubjectId);
  }, [selectedExamId, selectedSubjectId, user]);

  const handleRetryExams = () => {
    setExamsError(null);
    fetchExams();
  };

  const handleSelectExam = (examId) => {
    setSelectedExamId(examId);
    setSelectedSubjectId(null);
    setRoster([]);
    setRosterMeta(null);
    setRosterError(null);
    setRosterSearch("");
    setValidationError("");
    setMarksError(null);
    resetEvaluationState();
  };

  const handleSelectSubject = (subjectId) => {
    setSelectedSubjectId(subjectId);
    setRoster([]);
    setRosterMeta(null);
    setRosterError(null);
    setRosterSearch("");
    setValidationError("");
    setMarksError(null);
    setMarksEntryMode(false);
    setMarksMap({});
    setSaveError(null);
    resetEvaluationState();
  };

  const handleEnterMarksEntry = () => {
    setValidationError("");
    if (!selectedExamId) {
      setValidationError("Please select a supplementary exam.");
      toast.warn("Please select a supplementary exam.");
      return;
    }
    if (!selectedSubjectId) {
      setValidationError("Please select a subject to proceed.");
      toast.warn("Please select a subject to proceed.");
      return;
    }
    if (roster.length === 0) {
      setValidationError("No eligible students found for this exam/subject combination.");
      toast.warn("No eligible students found for this exam/subject combination.");
      return;
    }

    initializeMarksMap(roster, rosterMeta);
    setEvaluationMode(false);
    setMarksEntryMode(true);
    setSaveError(null);
    logger.info("Entered marks entry mode", { examId: selectedExamId, subjectId: selectedSubjectId });
    toast.success("Marks entry mode activated. Edit marks and click Save.", { autoClose: 5000 });
  };

  const handleCancelMarksEntry = () => {
    setMarksEntryMode(false);
    setEvaluationMode(false);
    setMarksMap({});
    setSaveError(null);
    toast.info("Marks entry cancelled. No changes were saved.");
  };

  const handleEnterEvaluation = () => {
    if (!selectedExamId || !selectedSubjectId || roster.length === 0) {
      toast.warning("Select an exam and subject with eligible students first.");
      return;
    }
    setMarksEntryMode(false);
    setEvaluationMode(true);
    setEvaluationErrors({});
    toast.info("Evaluation mode activated. Evaluate each saved attempt independently.", {
      autoClose: 5000,
    });
  };

  const handleExitEvaluation = () => {
    setEvaluationMode(false);
    setEvaluationErrors({});
    toast.info("Returned to the supplementary student roster.");
  };

  const handleMarksChange = (studentId, field, value) => {
    // Allow empty string for clearing, otherwise validate numeric
    const numericValue = value === "" ? "" : Number(value);
    setMarksMap((prev) => ({
      ...prev,
      [String(studentId)]: {
        ...prev[String(studentId)],
        [field]: numericValue,
      },
    }));
  };

  const validateMarks = (studentId, marks, meta) => {
    const { internalMaxMarks, externalMaxMarks, subjectType } = meta || {};
    const errors = [];

    const internal = marks.internalMarks;
    const external = marks.externalMarks;

    if (internal !== "" && internal !== null && internal !== undefined) {
      if (isNaN(internal)) {
        errors.push("Internal marks must be a number");
      } else if (internal < 0) {
        errors.push("Internal marks cannot be negative");
      } else if (internalMaxMarks !== undefined && internalMaxMarks !== null && internal > internalMaxMarks) {
        errors.push(`Internal marks cannot exceed ${internalMaxMarks}`);
      }
    }

    if (external !== "" && external !== null && external !== undefined) {
      if (isNaN(external)) {
        errors.push("External marks must be a number");
      } else if (external < 0) {
        errors.push("External marks cannot be negative");
      } else if (subjectType === "PRACTICAL") {
        errors.push("External marks are not applicable for PRACTICAL subjects");
      } else if (externalMaxMarks !== undefined && externalMaxMarks !== null && external > externalMaxMarks) {
        errors.push(`External marks cannot exceed ${externalMaxMarks}`);
      }
    }

    if (subjectType === "PRACTICAL" && external !== "" && external !== null && external !== undefined) {
      errors.push("External marks are not applicable for PRACTICAL subjects");
    }

    return errors;
  };

  const handleSave = async () => {
    if (!selectedExamId || !selectedSubjectId) {
      toast.warning("Please select an exam and subject first.");
      return;
    }

    // Submission guard - prevent duplicate submissions
    if (submissionGuard.current) {
      logger.warn("Duplicate save attempt blocked");
      return;
    }
    submissionGuard.current = true;

    const marksPayload = [];
    const allErrors = [];

    for (const entry of roster) {
      const studentMarks = marksMap[String(entry.studentId)] || {};
      const errors = validateMarks(entry.studentId, studentMarks, rosterMeta);
      if (errors.length > 0) {
        allErrors.push({ studentId: entry.studentId, studentName: entry.fullName, errors });
      }

      marksPayload.push({
        studentId: entry.studentId,
        internalMarks: studentMarks.internalMarks !== "" && studentMarks.internalMarks !== null ? Number(studentMarks.internalMarks) : null,
        externalMarks: studentMarks.externalMarks !== "" && studentMarks.externalMarks !== null ? Number(studentMarks.externalMarks) : null,
      });
    }

    if (allErrors.length > 0) {
      const errorMsg = allErrors.map((e) => `${e.studentName}: ${e.errors.join(", ")}`).join("; ");
      setSaveError(`Validation failed: ${errorMsg}`);
      toast.error(`Validation failed: ${errorMsg}`);
      submissionGuard.current = false;
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      await saveSupplementaryMarks({
        examId: selectedExamId,
        subjectId: selectedSubjectId,
        marks: marksPayload,
      });
      toast.success("Supplementary marks saved successfully");

      // Refresh marks from server and rebuild the entry map from the response.
      const refreshedMarks = await fetchMarks(selectedExamId, selectedSubjectId);
      if (refreshedMarks?.marks) {
        initializeMarksMap(roster, rosterMeta, refreshedMarks.marks);
      }
      setMarksEntryMode(false);
      setEvaluationMode(true);
      toast.success("Marks saved successfully. Evaluation is ready.");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to save marks.";
      setSaveError(message);
      toast.error(message);
      logger.error("Error saving supplementary marks:", err);
    } finally {
      setSaving(false);
      submissionGuard.current = false;
    }
  };

  const handleEvaluateStudent = async (student) => {
    const studentKey = getEvaluationKey(student);
    const backlogId = student.backlogId;
    const attemptId = student.attemptId;

    if (!backlogId || !attemptId) {
      const message = "Evaluation is unavailable because the student has no supplementary attempt.";
      setEvaluationErrors((prev) => ({ ...prev, [studentKey]: message }));
      toast.error(message);
      return;
    }

    if (isEvaluatedAttempt(student)) {
      const message = "This attempt already has an evaluation result.";
      setEvaluationErrors((prev) => ({ ...prev, [studentKey]: null }));
      toast.info(message);
      return;
    }

    if (evaluationGuard.current.has(studentKey) || evaluatingStudents[studentKey]) {
      logger.warn("Duplicate supplementary evaluation blocked", { studentKey });
      return;
    }

    evaluationGuard.current.add(studentKey);
    setEvaluatingStudents((prev) => ({ ...prev, [studentKey]: true }));
    setEvaluationErrors((prev) => ({ ...prev, [studentKey]: null }));

    try {
      const res = await evaluateBacklogAttempt(backlogId, attemptId, {});
      const result = normalizeEvaluationResponse(res);
      const resultStatus =
        result.resultStatus || student.attemptResultStatus || "INCOMPLETE";
      const passed = result.passed ?? student.attemptPassed ?? false;
      const cleared = result.backlogCleared ?? student.attemptCleared ?? false;
      const attempt = result.attempt || {};
      const backlog = result.backlog || {};

      setRoster((prevRoster) =>
        prevRoster.map((entry) => {
          if (String(entry.studentId) !== String(student.studentId)) {
            return entry;
          }

          const existingMarks = entry.marks || {};
          const existingCalculation = entry.calculation || {};
          return {
            ...entry,
            attemptId: attempt._id || entry.attemptId,
            attemptNumber: attempt.attempt_number ?? entry.attemptNumber,
            attemptResultStatus: resultStatus,
            attemptPassed: passed,
            attemptCleared: cleared,
            latestResultStatus: resultStatus,
            latestAttemptId: attempt._id || entry.attemptId,
            backlogId: backlog._id || entry.backlogId,
            backlogStatus: backlog.status || entry.backlogStatus,
            marks: {
              ...existingMarks,
              internalMarks:
                attempt.internal_marks ?? existingMarks.internalMarks,
              externalMarks:
                attempt.external_marks ?? existingMarks.externalMarks,
            },
            calculation: {
              ...existingCalculation,
              internalMarks:
                attempt.internal_marks ?? existingCalculation.internalMarks,
              externalMarks:
                attempt.external_marks ?? existingCalculation.externalMarks,
              totalMarks: attempt.total_marks ?? existingCalculation.totalMarks,
              status: existingCalculation.status || "INCOMPLETE",
              passed: existingCalculation.passed ?? false,
            },
          };
        }),
      );

      setEvaluationErrors((prev) => ({ ...prev, [studentKey]: null }));

      const successMessage =
        result.message ||
        (result.idempotent
          ? "Existing evaluation result loaded."
          : "Supplementary attempt evaluated successfully.");
      toast.success(successMessage);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const message =
        err.response?.data?.message || "Failed to evaluate supplementary attempt.";

      setEvaluationErrors((prev) => ({ ...prev, [studentKey]: message }));
      logger.error("Error evaluating supplementary attempt:", statusCode, errorCode, {
        backlogId,
        attemptId,
      });
      if (!isAuthError(statusCode, errorCode)) {
        toast.error(message);
      }
    } finally {
      evaluationGuard.current.delete(studentKey);
      setEvaluatingStudents((prev) => ({ ...prev, [studentKey]: false }));
    }
  };

  const canContinue = Boolean(selectedExamId && selectedSubjectId);

  const subjects = selectedExam ? normalizeSubjects(selectedExam) : [];

  const hasSavedMarks = roster.some((student) => Boolean(student.marks));

  const filteredExams = useMemo(() => {
    if (!search.trim()) return exams;
    const term = search.toLowerCase();
    return exams.filter((exam) => {
      const course = exam.course_id || {};
      const courseName = typeof course === "object" ? (course.name || course.code || "") : "";
      return (
        (exam.name || "").toLowerCase().includes(term) ||
        (exam.exam_type || "").toLowerCase().includes(term) ||
        courseName.toLowerCase().includes(term) ||
        String(exam.semester || "").toLowerCase().includes(term) ||
        (exam.academicYear || "").toLowerCase().includes(term)
      );
    });
  }, [exams, search]);

  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return roster;
    const term = rosterSearch.toLowerCase();
    return roster.filter((student) => {
      return (
        (student.fullName || "").toLowerCase().includes(term) ||
        (student.enrollmentNumber || "").toLowerCase().includes(term) ||
        (student.rollNumber || "").toLowerCase().includes(term) ||
        (student.studentId || "").toLowerCase().includes(term)
      );
    });
  }, [roster, rosterSearch]);

  const selectedExamItem = exams.find((e) => String(e._id) === String(selectedExamId));

  // Auth guard — placed after all hooks so React's rules-of-hooks are respected.
  // ProtectedRoute already enforces authentication; this is a defensive fallback.
  if (!user) return <Navigate to="/login" replace />;

  // Render states
  if (examsError && !examsLoading && exams.length === 0) {
    if (examsError.statusCode === 401 || isAuthError(examsError.statusCode, examsError.errorCode)) {
      return (
        <ApiError
          statusCode={examsError.statusCode}
          errorCode={examsError.errorCode}
          message={examsError.message}
          onRetry={() => {}}
        />
      );
    }
    return (
      <div className="page-container">
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Supplementary Evaluation" },
          ]}
        />
        <ApiError
          statusCode={examsError.statusCode}
          errorCode={examsError.errorCode}
          message={examsError.message}
          onRetry={handleRetryExams}
          onGoBack={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="page-container supplementary-evaluation">
      <style>{pageStyles}</style>

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Supplementary Evaluation" },
        ]}
      />

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <FaGraduationCap className="header-icon" />
            Supplementary Evaluation
          </h1>
          <p className="page-subtitle">
            Select a supplementary exam and subject to begin backlog marks entry and evaluation.
          </p>
        </div>
      </div>

      {/* Exam Summary */}
      {selectedExamId && selectedExamItem && (
        <div className="alert alert-info">
          <FaCheckCircle />
          <strong>Step 1 Complete:</strong> Exam selected —{" "}
          {selectedExamItem.name || "Supplementary Exam"}{" "}
          <span className="text-muted">
            (Sem {selectedExamItem.semester}, {selectedExamItem.academicYear})
          </span>
        </div>
      )}
      {selectedSubjectId && selectedExam && (
        <div className="alert alert-info">
          <FaCheckCircle />
          <strong>Step 2 Complete:</strong> Subject selected —{" "}
          {subjects.find((s) => String(getSubjectId(s)) === String(selectedSubjectId))
            ? getSubjectLabel(subjects.find((s) => String(getSubjectId(s)) === String(selectedSubjectId)))
            : "Subject"}
        </div>
      )}
      {roster.length > 0 && !marksEntryMode && (
        <div className="alert alert-success">
          <FaCheckCircle />
          <strong>Step 3 Complete:</strong> Roster loaded —{" "}
          {roster.length} eligible backlog student{roster.length !== 1 ? "s" : ""} found
        </div>
      )}
      {marksEntryMode && roster.length > 0 && (
        <div className="alert alert-success">
          <FaCheckCircle />
          <strong>Step 4 Active:</strong> Marks Entry —{" "}
          {roster.length} eligible backlog student{roster.length !== 1 ? "s" : ""} ready for marks entry
        </div>
      )}
      {validationError && (
        <div className="alert alert-warning">
          <FaExclamationTriangle /> {validationError}
        </div>
      )}

      {selectedExamId && selectedSubjectId && roster.length > 0 && (
        <div className="summary-stats" role="region" aria-label="Student summary statistics">
          <div className="summary-stat-card">
            <span className="summary-stat-label">Total Students</span>
            <span className="summary-stat-value">{roster.length}</span>
          </div>
          <div className="summary-stat-card">
            <span className="summary-stat-label">Marks Entered</span>
            <span className="summary-stat-value text-info">{rosterMeta?.markedCount ?? 0}</span>
          </div>
          <div className="summary-stat-card">
            <span className="summary-stat-label">Pending Evaluation</span>
            <span className="summary-stat-value text-warning">
              {roster.filter((s) => !isEvaluatedAttempt(s)).length}
            </span>
          </div>
          <div className="summary-stat-card">
            <span className="summary-stat-label">Passed / Cleared</span>
            <span className="summary-stat-value text-success">
              {roster.filter((s) => {
                const st = String(s.attemptResultStatus || "").toUpperCase();
                return st === "PASS" || st === "CLEARED";
              }).length}
            </span>
          </div>
          <div className="summary-stat-card">
            <span className="summary-stat-label">Failed</span>
            <span className="summary-stat-value text-danger">
              {roster.filter((s) => String(s.attemptResultStatus || "").toUpperCase() === "FAIL").length}
            </span>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* ===== Stage 1: Supplementary Exam Selection ===== */}
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">
                <FaClipboardList className="mr-2" />
                1. Select Supplementary Exam
              </h3>
              <span className="badge badge-info">
                {exams.length} {exams.length === 1 ? "Exam" : "Exams"}
              </span>
              <span className="badge badge-secondary ms-2">Step 1 of 3</span>
            </div>
            <div className="card-body">
              {/* Search */}
              <div className="search-box mb-3">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search exams by name, subject, course..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="clear-search-btn"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {examsLoading ? (
                <Loading text="Loading supplementary exams..." />
              ) : filteredExams.length === 0 ? (
                <div className="empty-state">
                  <FaBookOpen className="empty-icon" />
                  <p className="empty-title">No supplementary exams found</p>
                  <p className="empty-text">
                    {search
                      ? "No exams match your search. Try clearing the search term."
                      : "No supplementary exams are available at this time."}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10"></th>
                        <th>Exam</th>
                        <th>Type</th>
                        <th>Course</th>
                        <th>Semester</th>
                        <th>Academic Year</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExams.map((exam) => {
                        const course = exam.course_id || {};
                        const courseName =
                          typeof course === "object"
                            ? course.name || course.code || "-"
                            : "-";
                        const isSelected =
                          String(exam._id) === String(selectedExamId);
                        return (
                          <tr key={exam._id || `${exam.name}-${exam.semester}`}>
                            <td className="text-center">
                              <input
                                type="radio"
                                name="exam"
                                checked={isSelected}
                                onChange={() => handleSelectExam(exam._id)}
                                className="form-check-input"
                                aria-label={`Select exam ${exam.name || exam._id}`}
                              />
                            </td>
                            <td>
                              <div className="fw-bold">{exam.name || "-"}</div>
                            </td>
                            <td>
                              <span className={getExamTypeBadge(exam.exam_type)}>
                                {getExamTypeLabel(exam.exam_type)}
                              </span>
                            </td>
                            <td>{courseName}</td>
                            <td>Sem {exam.semester ?? "-"}</td>
                            <td>{exam.academicYear || "-"}</td>
                            <td>
                              <span className={getStatusBadge(exam.status)}>
                                {exam.status || "-"}
                              </span>
                            </td>
                            <td>{formatDate(exam.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Stage 2: Subject Selection ===== */}
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">
                <FaBookOpen className="mr-2" />
                2. Select Subject
              </h3>
              {selectedExamId && (
                <span className="badge badge-secondary">Step 2 of 3</span>
              )}
            </div>
            <div className="card-body">
              {!selectedExamId ? (
                <div className="empty-state">
                  <FaLayerGroup className="empty-icon" />
                  <p className="empty-title">No exam selected</p>
                  <p className="empty-text">
                    Select a supplementary exam from the list on the left to view its subjects.
                  </p>
                </div>
              ) : examDetailLoading ? (
                <Loading text="Loading exam details..." />
              ) : examDetailError ? (
                <div className="alert alert-danger">
                  <FaExclamationTriangle />
                  <strong>Could not load exam details:</strong>{" "}
                  {examDetailError.message}
                </div>
              ) : subjects.length === 0 ? (
                <div className="empty-state">
                  <FaExclamationTriangle className="empty-icon text-warning" />
                  <p className="empty-title">No subjects available</p>
                  <p className="empty-text">
                    The selected supplementary exam does not contain any subjects.
                    Please choose a different exam.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10"></th>
                        <th>Subject</th>
                        <th>Subject Type</th>
                        <th>Max Marks (I/E)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject) => {
                        const subjectId = getSubjectId(subject);
                        const isSelected =
                          String(subjectId) === String(selectedSubjectId);
                        const internal = subject.internalMaxMarks;
                        const external = subject.externalMaxMarks;
                        return (
                          <tr key={subjectId}>
                            <td className="text-center">
                              <input
                                type="radio"
                                name="subject"
                                value={subjectId}
                                checked={isSelected}
                                onChange={() =>
                                  handleSelectSubject(subjectId)
                                }
                                className="form-check-input"
                                disabled={!subjectId}
                              />
                            </td>
                            <td>
                              <div className="fw-bold">
                                {getSubjectLabel(subject)}
                              </div>
                            </td>
                            <td>{getSubjectType(subject)}</td>
                            <td>
                              {internal || external
                                ? `${internal ?? "-"} / ${external ?? "-"}`
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Stage 3: Student Roster ===== */}
      {selectedExamId && selectedSubjectId && (
        <div className="mt-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FaClipboardList className="mr-2" />
                {evaluationMode
                  ? "5. Evaluation"
                  : marksEntryMode
                    ? "4. Marks Entry"
                    : "3. Eligible Backlog Students"}
              </h3>
              <span className="badge badge-info">
                {rosterMeta?.totalStudents ?? roster.length} {rosterMeta?.totalStudents === 1 ? "Student" : "Students"}
              </span>
              {rosterMeta && (
                <span className="badge badge-secondary ms-2">
                  {rosterMeta.markedCount} marks entered
                </span>
              )}
              {rosterMeta && !marksEntryMode && !evaluationMode && (
                <span className="badge badge-success ms-2">
                  {roster.filter((s) => {
                    const st = String(s.attemptResultStatus || "").toUpperCase();
                    return st === "PASS" || st === "CLEARED";
                  }).length} passed
                </span>
              )}
              {rosterMeta && !marksEntryMode && !evaluationMode && (
                <span className="badge badge-danger ms-2">
                  {roster.filter((s) => String(s.attemptResultStatus || "").toUpperCase() === "FAIL").length} failed
                </span>
              )}
              {marksEntryMode && (
                <span className="badge badge-warning ms-2">
                  Marks Entry Mode
                </span>
              )}
              {evaluationMode && (
                <span className="badge badge-warning ms-2">
                  Evaluation Mode
                </span>
              )}
            </div>
            <div className="card-body">
              {/* Search */}
              <div className="search-box mb-3">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search students by name, enrollment, roll number..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="search-input"
                />
                {rosterSearch && (
                  <button
                    onClick={() => setRosterSearch("")}
                    className="clear-search-btn"
                    title="Clear search"
                    aria-label="Clear student search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {rosterLoading ? (
                <Loading text="Loading eligible backlog students..." />
              ) : rosterError ? (
                <div className="alert alert-danger">
                  <FaExclamationTriangle />
                  <strong>Could not load roster:</strong>{" "}
                  {rosterError.message}
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="empty-state">
                  <FaExclamationTriangle className="empty-icon text-warning" />
                  <p className="empty-title">No eligible backlog students found</p>
                  <p className="empty-text">
                    No eligible backlog students found for the selected supplementary exam and subject.
                    You can change the exam or subject selection above.
                  </p>
                </div>
              ) : (
                <>
                  {marksLoading && (
                    <div className="alert alert-info d-flex align-items-center mb-3">
                      <FaSpinner className="spinner-icon me-2" />
                      <span>Loading existing marks...</span>
                    </div>
                  )}
                  {marksError && !marksLoading && (
                    <div className="alert alert-warning d-flex align-items-center mb-3">
                      <FaExclamationTriangle className="me-2" />
                      <span>
                        <strong>Could not load marks:</strong>{" "}
                        {marksError.message}
                      </span>
                    </div>
                  )}
                  {saveError && (
                    <div className="alert alert-danger d-flex align-items-center mb-3">
                      <FaExclamationTriangle className="me-2" />
                      <span><strong>Save failed:</strong> {saveError}</span>
                    </div>
                  )}
                  {evaluationMode && (
                    <div className="alert alert-info d-flex align-items-center mb-3">
                      <FaCheckCircle className="me-2" />
                      <span>
                        <strong>Evaluation Mode:</strong> Each saved attempt is evaluated independently using the backend result service.
                      </span>
                    </div>
                  )}
                  {Object.values(evaluationErrors).some(Boolean) && (
                    <div className="alert alert-danger d-flex align-items-center mb-3">
                      <FaExclamationTriangle className="me-2" />
                      <span>One or more evaluations failed. Review the affected student row and try again.</span>
                    </div>
                  )}
                  <div className="table-responsive">
                    <table className="data-table">
                    <thead>
                      <tr>
                        <th className="col-narrow">#</th>
                        <th className="col-student">Student</th>
                        <th className="col-enrollment">Enrollment / Roll</th>
                        <th className="col-course">Course</th>
                        <th className="col-sem">Current Sem / Year</th>
                        <th className="col-sem">Backlog Sem / Year</th>
                        <th className="col-status">Backlog Status</th>
                        <th className="col-attempt">Attempt</th>
                        <th className="col-status">Attempt Status</th>
                        {marksEntryMode ? (
                          <>
                            <th className="col-marks">Internal Marks</th>
                            {(rosterMeta?.subjectType === "THEORY" || rosterMeta?.subjectType === "COMPOSITE") && <th className="col-marks">External Marks</th>}
                            <th className="col-marks">Total</th>
                            <th className="col-status">Status</th>
                          </>
                        ) : evaluationMode ? (
                          <>
                            <th className="col-marks">Internal Marks</th>
                            {(rosterMeta?.subjectType === "THEORY" || rosterMeta?.subjectType === "COMPOSITE") && <th className="col-marks">External Marks</th>}
                            <th className="col-marks">Total Marks</th>
                            <th className="col-action">Evaluation</th>
                            <th className="col-status">Status</th>
                          </>
                        ) : (
                          <th>Marks Status</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.map((student, index) => {
                        const evaluationKey = getEvaluationKey(student);
                        const hasMarks = Boolean(student.marks);
                        const calc = student.calculation || {};
                        const calcStatus = calc.status || "INCOMPLETE";
                        const marksStatus = hasMarks
                          ? calcStatus === "PASS"
                            ? "Pass"
                            : calcStatus === "FAIL"
                              ? "Fail"
                              : "Incomplete"
                          : "Not Entered";
                        const marksBadge =
                          calcStatus === "PASS"
                            ? "badge badge-success"
                            : calcStatus === "FAIL"
                              ? "badge badge-danger"
                              : hasMarks
                                ? "badge badge-warning"
                                : "badge badge-secondary";

                        const attemptStatus = student.attemptResultStatus || "INCOMPLETE";
                        const attemptBadge = getEvaluationStatusBadge(attemptStatus);
                        const backlogStatus = student.backlogStatus || "N/A";
                        const backlogBadge =
                          backlogStatus === "OPEN"
                            ? "badge badge-warning"
                            : backlogStatus === "ATTEMPTED"
                              ? "badge badge-info"
                              : backlogStatus === "CLEARED"
                                ? "badge badge-success"
                                : "badge badge-secondary";

                        const studentMarks = marksMap[String(student.studentId)] || {};
                        const internalValue = studentMarks.internalMarks !== undefined ? studentMarks.internalMarks : (hasMarks ? student.marks.internalMarks : "");
                        const externalValue = studentMarks.externalMarks !== undefined ? studentMarks.externalMarks : (hasMarks ? student.marks.externalMarks : "");
                        const totalMarks = calc.totalMarks ?? "-";

                        const isEvaluating = Boolean(evaluatingStudents[evaluationKey]);
                        const alreadyEvaluated = isEvaluatedAttempt(student);
                        const hasAttempt = Boolean(student.backlogId && student.attemptId);
                        const canEvaluate = hasAttempt && !alreadyEvaluated && !isEvaluating;
                        const evaluationError = evaluationErrors[evaluationKey];
                        const evaluationStatus = student.attemptResultStatus || "INCOMPLETE";
                        const actionClass = isEvaluating
                          ? "btn-primary"
                          : alreadyEvaluated
                            ? "btn-outline-success"
                            : hasAttempt
                              ? "btn-primary"
                              : "btn-outline-secondary";

                        return (
                          <tr key={student.studentId || index}>
                            <td className="text-center">{index + 1}</td>
                            <td>
                              <div className="fw-bold" title={student.fullName || "-"}>{student.fullName || "-"}</div>
                              <small className="text-muted">ID: {student.studentId || "-"}</small>
                            </td>
                            <td>
                              <div title={student.enrollmentNumber || "-"}>{student.enrollmentNumber || "-"}</div>
                              <small className="text-muted">Roll: {student.rollNumber || "-"}</small>
                            </td>
                            <td>
                              <div>{student.course?.name || student.course?.code || "-"}</div>
                              <small className="text-muted">{student.course?.code || ""}</small>
                            </td>
                            <td>
                              Sem {student.currentSemester ?? "-"} / {student.currentAcademicYear || "-"}
                            </td>
                            <td>
                              Sem {student.backlogSemester ?? "-"} / {student.backlogAcademicYear || "-"}
                            </td>
                            <td>
                              <span className={backlogBadge}>{backlogStatus}</span>
                            </td>
                            <td>
                              {student.attemptNumber ? (
                                <>
                                  Attempt {student.attemptNumber}
                                  {student.attemptId && (
                                    <small className="text-muted d-block">
                                      ID: {String(student.attemptId).slice(-8)}
                                    </small>
                                  )}
                                </>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              <span className={attemptBadge}>{attemptStatus}</span>
                            </td>
                            {marksEntryMode ? (
                              <>
                                <td>
                                  <div className="marks-input-wrapper">
                                    <span className="marks-input-label">Internal</span>
                                    <input
                                      type="number"
                                      className="form-input marks-input"
                                      style={{ maxWidth: 100 }}
                                      min="0"
                                      max={rosterMeta?.internalMaxMarks ?? undefined}
                                      placeholder={rosterMeta?.internalMaxMarks !== undefined ? `Max ${rosterMeta.internalMaxMarks}` : "0"}
                                      value={internalValue === null ? "" : internalValue}
                                      onChange={(e) => handleMarksChange(student.studentId, "internalMarks", e.target.value)}
                                      disabled={saving}
                                      aria-label={`Internal marks for ${student.fullName || student.studentId}`}
                                    />
                                  </div>
                                </td>
                                {(rosterMeta?.subjectType === "THEORY" || rosterMeta?.subjectType === "COMPOSITE") && (
                                  <td>
                                    <div className="marks-input-wrapper">
                                      <span className="marks-input-label">External</span>
                                      <input
                                        type="number"
                                        className="form-input marks-input"
                                        style={{ maxWidth: 100 }}
                                        min="0"
                                        max={rosterMeta?.externalMaxMarks ?? undefined}
                                        placeholder={rosterMeta?.externalMaxMarks !== undefined ? `Max ${rosterMeta.externalMaxMarks}` : "0"}
                                        value={externalValue === null ? "" : externalValue}
                                        onChange={(e) => handleMarksChange(student.studentId, "externalMarks", e.target.value)}
                                        disabled={saving}
                                        aria-label={`External marks for ${student.fullName || student.studentId}`}
                                      />
                                    </div>
                                  </td>
                                )}
                                <td>{totalMarks}</td>
                                <td>
                                  {calcStatus ? (
                                    <span className={marksBadge}>{calcStatus}</span>
                                  ) : (
                                    <span className="badge badge-secondary">INCOMPLETE</span>
                                  )}
                                </td>
                              </>
                            ) : evaluationMode ? (
                              <>
                                <td>
                                  <strong>{internalValue === "" || internalValue === null || internalValue === undefined ? "-" : internalValue}</strong>
                                  <div className="small text-muted">Internal</div>
                                </td>
                                {(rosterMeta?.subjectType === "THEORY" || rosterMeta?.subjectType === "COMPOSITE") && (
                                  <td>
                                    <strong>{externalValue === "" || externalValue === null || externalValue === undefined ? "-" : externalValue}</strong>
                                    <div className="small text-muted">External</div>
                                  </td>
                                )}
                                <td>
                                  <strong>{totalMarks}</strong>
                                  <div className="small text-muted">Backend total</div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={`btn btn-sm eval-btn ${actionClass}`}
                                    disabled={!canEvaluate}
                                    onClick={() => handleEvaluateStudent(student)}
                                    title={
                                      alreadyEvaluated
                                        ? "This attempt already has a result"
                                        : hasAttempt
                                          ? "Evaluate this saved attempt"
                                          : "No supplementary attempt is available"
                                    }
                                    aria-label={
                                      alreadyEvaluated
                                        ? `Evaluated: ${student.fullName || student.studentId}`
                                        : hasAttempt
                                          ? `Evaluate ${student.fullName || student.studentId}`
                                          : `No attempt for ${student.fullName || student.studentId}`
                                    }
                                  >
                                    {isEvaluating && <FaSpinner className="evaluation-spinner" />}
                                    {!isEvaluating && alreadyEvaluated && <FaEye className="me-1" />}
                                    {isEvaluating
                                      ? "Evaluating..."
                                      : alreadyEvaluated
                                        ? "Evaluated"
                                        : hasAttempt
                                          ? "Evaluate"
                                          : "No Attempt"}
                                  </button>
                                  {evaluationError && (
                                    <div className="small text-danger mt-1">{evaluationError}</div>
                                  )}
                                </td>
                                <td>
                                  <span className={getEvaluationStatusBadge(evaluationStatus)}>
                                    {evaluationStatus}
                                  </span>
                                  {evaluationStatus === "PASS" && (
                                    <div className="small text-success mt-1">Backlog cleared</div>
                                  )}
                                  {evaluationStatus === "FAIL" && (
                                    <div className="small text-danger mt-1">Backlog remains {backlogStatus.toLowerCase()}</div>
                                  )}
                                  {evaluationStatus === "INCOMPLETE" && (
                                    <div className="small text-muted mt-1">Evaluation pending</div>
                                  )}
                                </td>
                              </>
                            ) : (
                              <td>
                                <span className={marksBadge}>{marksStatus}</span>
                                {hasMarks && student.marks && (
                                  <div className="small text-muted mt-1">
                                    I: {student.marks.internalMarks ?? "-"} / E:{" "}
                                    {student.marks.externalMarks ?? "-"}
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="d-flex justify-content-between align-items-center mt-4 p-3 bg-white border-top action-footer">
        <div>
          {marksEntryMode && (
            <span className="text-info fw-bold">
              <FaEdit className="mr-1" />
              Marks Entry Mode — Edit marks and click Save
            </span>
          )}
          {evaluationMode && (
            <span className="text-info fw-bold">
              <FaEye className="mr-1" />
              Evaluation Mode — backend calculates each attempt result
            </span>
          )}
          {!marksEntryMode && !evaluationMode && selectedSubjectId && selectedExam && roster.length > 0 && (
            <span className="text-success fw-bold">
              <FaCheckCircle className="mr-1" />
              Roster loaded: {roster.length} eligible student{roster.length !== 1 ? "s" : ""}
            </span>
          )}
          {!marksEntryMode && selectedSubjectId && selectedExam && roster.length === 0 && !rosterLoading && (
            <span className="text-warning fw-bold">
              <FaExclamationTriangle className="mr-1" />
              No eligible students for this exam/subject combination
            </span>
          )}
        </div>
        <div className="d-flex gap-2">
          {evaluationMode ? (
            <>
              <button
                onClick={handleExitEvaluation}
                className="btn btn-outline-secondary"
              >
                <FaUndo className="mr-1" /> Back to Roster
              </button>
              <button
                onClick={handleEnterMarksEntry}
                disabled={roster.length === 0}
                className="btn btn-outline-primary"
              >
                <FaEdit className="mr-1" /> Edit Marks
              </button>
            </>
          ) : marksEntryMode ? (
            <>
              <button
                onClick={handleCancelMarksEntry}
                disabled={saving}
                className="btn btn-outline-secondary"
              >
                <FaUndo className="mr-1" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || roster.length === 0}
                className="btn btn-primary"
              >
                <FaSave className="mr-1" />
                {saving ? "Saving..." : "Save Marks"}
              </button>
            </>
          ) : hasSavedMarks ? (
            <button
              onClick={handleEnterEvaluation}
              disabled={!canContinue || rosterLoading || roster.length === 0}
              className="btn btn-primary"
            >
              <FaEye className="mr-1" /> Proceed to Evaluation
            </button>
          ) : (
            <button
              onClick={handleEnterMarksEntry}
              disabled={!canContinue || rosterLoading || roster.length === 0}
              className="btn btn-primary"
            >
              <FaBook className="mr-1" /> Proceed to Marks Entry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyles = `
@keyframes supplementary-spin {
  to { transform: translateY(-50%) rotate(360deg); }
}
.supplementary-evaluation .header-icon {
  color: var(--primary-color, #1a4b6d);
  margin-right: 8px;
}
.supplementary-evaluation .spinner-icon {
  display: inline-block;
  width: 2.5rem;
  height: 2.5rem;
  color: var(--primary-color, #1a4b6d);
  animation: supplementary-spin 0.9s linear infinite;
}
.supplementary-evaluation .evaluation-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  animation: supplementary-spin 0.9s linear infinite;
}
.supplementary-evaluation .empty-icon {
  font-size: 2.25rem;
  color: var(--secondary-color, #6c757d);
}
.supplementary-evaluation .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}
.supplementary-evaluation .search-box {
  position: relative;
}
.supplementary-evaluation .search-input {
  width: 100%;
  padding-left: 38px;
}
.supplementary-evaluation .clear-search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}
.supplementary-evaluation .data-table th {
  background: var(--light, #f8f9fa);
  white-space: nowrap;
}
.supplementary-evaluation .data-table td {
  vertical-align: middle;
}
.supplementary-evaluation .data-table th.col-narrow {
  width: 1%;
  white-space: nowrap;
}
.supplementary-evaluation .data-table th.col-student {
  min-width: 180px;
}
.supplementary-evaluation .data-table th.col-enrollment {
  min-width: 140px;
}
.supplementary-evaluation .data-table th.col-course {
  min-width: 140px;
}
.supplementary-evaluation .data-table th.col-sem {
  min-width: 150px;
}
.supplementary-evaluation .data-table th.col-status {
  min-width: 100px;
}
.supplementary-evaluation .data-table th.col-attempt {
  min-width: 100px;
}
.supplementary-evaluation .data-table th.col-marks {
  min-width: 120px;
  text-align: center;
}
.supplementary-evaluation .data-table th.col-action {
  min-width: 140px;
  text-align: center;
}
.supplementary-evaluation .data-table td .fw-bold {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  display: inline-block;
}
.supplementary-evaluation .summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.supplementary-evaluation .summary-stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: box-shadow 0.2s ease;
}
.supplementary-evaluation .summary-stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.supplementary-evaluation .summary-stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.supplementary-evaluation .summary-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}
.supplementary-evaluation .summary-stat-value.text-success { color: #16a34a; }
.supplementary-evaluation .summary-stat-value.text-danger { color: #dc2626; }
.supplementary-evaluation .summary-stat-value.text-warning { color: #d97706; }
.supplementary-evaluation .summary-stat-value.text-info { color: #0891b2; }
.supplementary-evaluation .marks-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: flex-start;
}
.supplementary-evaluation .marks-input-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.supplementary-evaluation .marks-input {
  width: 100%;
  max-width: 100px;
}
.supplementary-evaluation .marks-input .form-input,
.supplementary-evaluation .marks-input input.form-input {
  max-width: 100px;
  text-align: center;
}
.supplementary-evaluation .eval-btn {
  min-width: 110px;
  justify-content: center;
}
.supplementary-evaluation .eval-btn .evaluation-spinner {
  margin-right: 6px;
}
.supplementary-evaluation .table-responsive {
  -webkit-overflow-scrolling: touch;
}
.supplementary-evaluation .table-responsive .data-table {
  min-width: 960px;
}
.supplementary-evaluation .search-input:focus,
.supplementary-evaluation .form-input:focus {
  outline: 2px solid rgba(23, 174, 203, 0.4);
  outline-offset: 0;
}
.supplementary-evaluation input[type="radio"].form-check-input:focus {
  outline: 2px solid rgba(23, 174, 203, 0.4);
  outline-offset: 2px;
}
@media (max-width: 991.98px) {
  .supplementary-evaluation .row.g-4 > [class*="col-"] {
    width: 100%;
  }
  .supplementary-evaluation .summary-stats {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
@media (max-width: 767.98px) {
  .supplementary-evaluation .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 575.98px) {
  .supplementary-evaluation .summary-stats {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .supplementary-evaluation .summary-stat-card {
    padding: 0.75rem;
  }
  .supplementary-evaluation .summary-stat-value {
    font-size: 1.2rem;
  }
  .supplementary-evaluation .data-table th,
  .supplementary-evaluation .data-table td {
    padding: 10px 12px;
    font-size: 0.82rem;
  }
  .supplementary-evaluation .data-table td .fw-bold {
    max-width: 120px;
  }
  .supplementary-evaluation .eval-btn {
    min-width: auto;
    padding: 0.25rem 0.5rem;
    font-size: 0.78rem;
  }
}
@media (max-width: 400px) {
  .supplementary-evaluation .summary-stats {
    grid-template-columns: 1fr;
  }
}
.supplementary-evaluation .action-footer {
  flex-wrap: wrap;
  gap: 0.75rem;
}
.supplementary-evaluation .action-footer .d-flex {
  flex-wrap: wrap;
}
@media (max-width: 575.98px) {
  .supplementary-evaluation .action-footer {
    flex-direction: column;
    align-items: flex-start !important;
  }
  .supplementary-evaluation .action-footer > div:last-child {
    width: 100%;
    justify-content: stretch;
  }
  .supplementary-evaluation .action-footer .btn {
    flex: 1;
  }
}
`;

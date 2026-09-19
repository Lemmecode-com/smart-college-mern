import api from "./axios";

const BASE = "/results";

export const generateResult = (data) =>
  api.post(`${BASE}/generate`, data).then((r) => r.data);

export const getResult = (resultId) =>
  api.get(`${BASE}/${resultId}`).then((r) => r.data);

export const lockResult = (resultId) =>
  api.post(`${BASE}/${resultId}/lock`).then((r) => r.data);

export const unlockResult = (resultId, reason) =>
  api.post(`${BASE}/${resultId}/unlock`, { reason }).then((r) => r.data);

export const publishResult = (resultId) =>
  api.post(`${BASE}/${resultId}/publish`).then((r) => r.data);

export const getMyResults = () =>
  api.get(`${BASE}/my-results`).then((r) => r.data);

// ── Exam-level Coordinator workflow ──────────────────────────────────────

export const getResultsByExam = (examId) =>
  api.get(`${BASE}/`, { params: { examId } }).then((r) => r.data);

/**
 * Single-call exam-level result summaries for the Coordinator dashboard.
 * Replaces N+1 per-exam getResultsByExam calls.
 * Returns an array of { examId, summary: { totalStudents, passed, failed,
 * incomplete, byStatus, lastUpdated } }.
 */
export const getExamResultSummaries = () =>
  api.get(`${BASE}/exam-summaries`).then((r) => r.data);

export const generateResultsForExam = (examId) =>
  api.post(`${BASE}/generate-exam`, { examId }).then((r) => r.data);

export const lockResultsForExam = (examId) =>
  api.post(`${BASE}/lock-exam`, { examId }).then((r) => r.data);

export const publishResultsForExam = (examId) =>
  api.post(`${BASE}/publish-exam`, { examId }).then((r) => r.data);

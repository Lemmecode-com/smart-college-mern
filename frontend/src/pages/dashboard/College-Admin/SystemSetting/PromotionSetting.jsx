import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaGraduationCap,
  FaSave,
  FaUndo,
  FaInfoCircle,
  FaCheck,
  FaClipboardCheck,
  FaChevronDown,
  FaTrash,
  FaExclamationCircle,
} from "react-icons/fa";
import {
  getPromotionPolicy,
  updatePromotionPolicy,
} from "../../../../api/promotion";
import api from "../../../../api/axios";
import ApiError from "../../../../components/ApiError";
import ConfirmModal from "../../../../components/ConfirmModal";
import { logger } from "../../../../utils/logger";
import Breadcrumb from "../../../../components/Breadcrumb";
import "./PromotionSetting.css";

const DEFAULT_MIN_ATTENDANCE_PERCENTAGE = 75;
const DEFAULT_MAX_ALLOWED_KTS = 3;
const DEFAULT_MIN_FEE_PAID_PERCENTAGE = 100;

const createEmptyForm = () => ({
  minAttendancePercentage: String(DEFAULT_MIN_ATTENDANCE_PERCENTAGE),
  maxAllowedKTs: String(DEFAULT_MAX_ALLOWED_KTS),
  minimumFeePaidPercentage: String(DEFAULT_MIN_FEE_PAID_PERCENTAGE),
  scopedSemesters: [],
  effectiveFrom: "",
  isActive: true,
  ktRules: [],
});

/**
 * Defaults applied ONLY when a transition rule is created for the first time.
 * Editing an existing rule must never re-apply these.
 */
const createDefaultKTRule = (fromSemester) => ({
  fromSemester,
  toSemester: fromSemester + 1,
  maxAllowedKTs: DEFAULT_MAX_ALLOWED_KTS,
  requirePreviousYearClearance: false,
  subjectTypeLimits: {
    THEORY: DEFAULT_MAX_ALLOWED_KTS,
    PRACTICAL: DEFAULT_MAX_ALLOWED_KTS,
    COMPOSITE: DEFAULT_MAX_ALLOWED_KTS,
  },
});

/**
 * Immutably applies `updates` onto `existingRule`.
 * Fields absent from `updates` are preserved, and `subjectTypeLimits` is merged
 * per subject type so editing THEORY never resets PRACTICAL/COMPOSITE.
 */
const mergeKTRule = (existingRule, updates = {}) => {
  const { subjectTypeLimits, ...rest } = updates;
  const merged = { ...existingRule, ...rest };

  if (subjectTypeLimits) {
    merged.subjectTypeLimits = {
      ...(existingRule.subjectTypeLimits || {}),
      ...subjectTypeLimits,
    };
  }

  return merged;
};

/** Maps a policy returned by the API onto the form shape. */
const policyToFormData = (policy) => ({
  minAttendancePercentage: String(
    policy.minAttendancePercentage ?? DEFAULT_MIN_ATTENDANCE_PERCENTAGE
  ),
  maxAllowedKTs: String(policy.maxAllowedKTs ?? DEFAULT_MAX_ALLOWED_KTS),
  minimumFeePaidPercentage: String(
    policy.minimumFeePaidPercentage ?? DEFAULT_MIN_FEE_PAID_PERCENTAGE
  ),
  scopedSemesters: policy.scopedSemesters || [],
  effectiveFrom: policy.effectiveFrom
    ? new Date(policy.effectiveFrom).toISOString().split("T")[0]
    : "",
  isActive: policy.isActive ?? true,
  ktRules: policy.ktRules || [],
});

/** A policy without a matching course_id is the college-level fallback. */
const isFallbackPolicy = (policy, courseId) =>
  !policy.course_id || String(policy.course_id) !== String(courseId);

/** Guards against applying a response body that is not a policy document. */
const isPolicyPayload = (payload) =>
  !!payload &&
  typeof payload === "object" &&
  (payload.minAttendancePercentage !== undefined ||
    payload.maxAllowedKTs !== undefined ||
    Array.isArray(payload.ktRules));

const PromotionSetting = () => {
  const navigate = useNavigate();

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

  // ----- Course list state -----
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // ----- Policy state -----
  const [formData, setFormData] = useState(createEmptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState(null);
  const [isUsingFallbackPolicy, setIsUsingFallbackPolicy] = useState(false);

  // ----- Unsaved-changes guard -----
  const [pendingCourseId, setPendingCourseId] = useState(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Guards against a slow response for a previous course overwriting the
  // currently selected course's form.
  const policyRequestRef = useRef(0);

  useEffect(() => {
    fetchCourses();
  }, []);

  // ----- Derived course data -----

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const durationSemesters = Number(selectedCourse?.durationSemesters) || 0;

  /**
   * Transitions are derived from the selected course duration.
   * durationSemesters = 6 -> 1->2 ... 5->6  (6->7 is never rendered)
   */
  const transitionOptions = useMemo(() => {
    const list = [];
    for (let semester = 1; semester < durationSemesters; semester++) {
      list.push({
        from: semester,
        to: semester + 1,
        label: `Sem ${semester} → Sem ${semester + 1}`,
      });
    }
    return list;
  }, [durationSemesters]);

  const semesterOptions = useMemo(() => {
    const list = [];
    for (let semester = 1; semester <= durationSemesters; semester++) {
      list.push({ value: semester, label: `Semester ${semester}` });
    }
    return list;
  }, [durationSemesters]);

  // ----- Data loading -----

  const fetchCourses = async (preferredCourseId) => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const res = await api.get("/courses");
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : payload?.courses || [];
      const scopedCourses = list.filter((course) => course && course._id);

      setCourses(scopedCourses);

      if (scopedCourses.length === 0) {
        setSelectedCourseId("");
        return;
      }

      let targetCourseId = preferredCourseId;
      if (!targetCourseId) {
        try {
          const activePolicyRes = await getPromotionPolicy();
          const activePolicy = activePolicyRes?.data ?? activePolicyRes;
          if (activePolicy?.course_id) {
            const matchingCourse = scopedCourses.find(
              (c) => String(c._id) === String(activePolicy.course_id)
            );
            if (matchingCourse) {
              targetCourseId = matchingCourse._id;
            }
          }
        } catch {
          // Ignore and fallback to first course
        }
      }

      const target =
        scopedCourses.find((course) => course._id === targetCourseId) ||
        scopedCourses[0];

      setSelectedCourseId(target._id);
      await fetchPolicy(target._id);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      logger.error("Error fetching courses:", statusCode, errorCode);
      setCourses([]);
      setSelectedCourseId("");
      setCoursesError({
        message: err.response?.data?.message || "Failed to load courses.",
        statusCode,
        errorCode,
      });
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchPolicy = async (courseId) => {
    if (!courseId) return;

    const requestId = policyRequestRef.current + 1;
    policyRequestRef.current = requestId;

    setPolicyLoading(true);
    setPolicyError(null);
    // Clear the previous course's values so nothing leaks across courses.
    setFormData(createEmptyForm());
    setIsUsingFallbackPolicy(false);
    setIsModified(false);

    try {
      const res = await getPromotionPolicy(courseId);
      if (policyRequestRef.current !== requestId) return;

      const policy = res;
      if (!policy) {
        setPolicyError({
          message: "No promotion policy was returned for this course.",
          statusCode: res?.statusCode,
          errorCode: res?.errorCode,
        });
        return;
      }

      setFormData(policyToFormData(policy));
      setIsUsingFallbackPolicy(isFallbackPolicy(policy, courseId));
    } catch (err) {
      if (policyRequestRef.current !== requestId) return;

      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      logger.error("Error fetching promotion policy:", statusCode, errorCode);

      setFormData(createEmptyForm());
      setIsModified(false);
      setPolicyError({
        message: err.response?.data?.message || "Failed to load promotion policy.",
        statusCode,
        errorCode,
      });
    } finally {
      if (policyRequestRef.current === requestId) {
        setPolicyLoading(false);
      }
    }
  };

  // ----- Form handlers -----

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setIsModified(true);
  };

  const handleSemesterToggle = (semester) => {
    setFormData((prev) => {
      const current = prev.scopedSemesters || [];
      const updated = current.includes(semester)
        ? current.filter((s) => s !== semester)
        : [...current, semester];
      return { ...prev, scopedSemesters: updated };
    });
    setIsModified(true);
  };

  const getRuleForTransition = (fromSemester) => {
    return (formData.ktRules || []).find((rule) => rule.fromSemester === fromSemester);
  };

  const updateKTRule = (fromSemester, updates) => {
    setFormData((prev) => {
      const rules = [...(prev.ktRules || [])];
      const existingIndex = rules.findIndex((rule) => rule.fromSemester === fromSemester);

      // Existing rule: preserve every field that is not part of `updates`.
      // New rule: seed with the documented defaults first.
      const base =
        existingIndex >= 0
          ? rules[existingIndex]
          : createDefaultKTRule(fromSemester);

      const updatedRule = mergeKTRule(base, updates);

      if (existingIndex >= 0) {
        rules[existingIndex] = updatedRule;
      } else {
        rules.push(updatedRule);
      }

      // Sort by fromSemester
      rules.sort((a, b) => a.fromSemester - b.fromSemester);
      return { ...prev, ktRules: rules };
    });
    setIsModified(true);
  };

  const removeKTRule = (fromSemester) => {
    setFormData((prev) => ({
      ...prev,
      ktRules: (prev.ktRules || []).filter((rule) => rule.fromSemester !== fromSemester),
    }));
    setIsModified(true);
  };

  const handleMaxKTsChange = (fromSemester, value) => {
    const num = parseInt(value, 10);
    if (!Number.isNaN(num) && num >= 0) {
      updateKTRule(fromSemester, { maxAllowedKTs: num });
    }
  };

  const handleSubjectTypeLimitChange = (fromSemester, type, value) => {
    const num = parseInt(value, 10);
    if (!Number.isNaN(num) && num >= 0) {
      // mergeKTRule merges subjectTypeLimits per type against the latest rule
      // state held in the functional update, so sibling types are preserved.
      updateKTRule(fromSemester, { subjectTypeLimits: { [type]: num } });
    }
  };

  const handlePreviousYearClearanceChange = (fromSemester, checked) => {
    updateKTRule(fromSemester, { requirePreviousYearClearance: checked });
  };

  // ----- Course selection -----

  const applyCourseSelection = (courseId) => {
    setSelectedCourseId(courseId);
    setIsModified(false);
    fetchPolicy(courseId);
  };

  const handleCourseChange = (e) => {
    const nextCourseId = e.target.value;
    if (!nextCourseId || nextCourseId === selectedCourseId) return;

    if (isModified) {
      setPendingCourseId(nextCourseId);
      setShowDiscardModal(true);
      return;
    }

    applyCourseSelection(nextCourseId);
  };

  const confirmDiscardAndSwitch = () => {
    const nextCourseId = pendingCourseId;
    setShowDiscardModal(false);
    setPendingCourseId(null);
    if (nextCourseId) {
      applyCourseSelection(nextCourseId);
    }
  };

  const cancelCourseSwitch = () => {
    setShowDiscardModal(false);
    setPendingCourseId(null);
  };

  // ----- Save -----

  const handleSave = async () => {
    if (isSaving) return;

    if (!selectedCourseId) {
      toast.error("Please select a course before saving");
      return;
    }

    const percentage = parseInt(formData.minAttendancePercentage, 10);
    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Attendance percentage must be between 0 and 100");
      return;
    }

    const maxAllowedKTs = parseInt(formData.maxAllowedKTs, 10);
    if (Number.isNaN(maxAllowedKTs) || maxAllowedKTs < 0) {
      toast.error("Overall max allowed KTs must be 0 or greater");
      return;
    }

    const minimumFeePaidPercentage = Number(formData.minimumFeePaidPercentage);
    if (
      formData.minimumFeePaidPercentage === "" ||
      !Number.isFinite(minimumFeePaidPercentage) ||
      minimumFeePaidPercentage < 0 ||
      minimumFeePaidPercentage > 100
    ) {
      toast.error("Minimum fee paid for promotion must be between 0 and 100");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        course_id: selectedCourseId,
        minAttendancePercentage: percentage,
        maxAllowedKTs,
        minimumFeePaidPercentage,
        scopedSemesters: formData.scopedSemesters,
        isActive: formData.isActive,
        ktRules: formData.ktRules,
      };

      if (formData.effectiveFrom) {
        payload.effectiveFrom = formData.effectiveFrom;
      }

      const savedPolicy = await updatePromotionPolicy(payload);

      // Synchronize the form with the server-confirmed state so it can never
      // display values the database did not accept. Fall back to a refetch only
      // if the response body is not the saved policy document.
      if (isPolicyPayload(savedPolicy)) {
        setFormData(policyToFormData(savedPolicy));
        setIsUsingFallbackPolicy(isFallbackPolicy(savedPolicy, selectedCourseId));
      } else {
        await fetchPolicy(selectedCourseId);
      }

      toast.success(
        `Promotion policy updated successfully for ${
          selectedCourse?.name || "the selected course"
        }`
      );
      setIsModified(false);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error updating promotion policy:", statusCode, errorCode);
        return;
      }
      logger.error("Error updating promotion policy:", statusCode, errorCode);
      toast.error(err.response?.data?.message || "Failed to update policy");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(createEmptyForm());
    setIsModified(false);
  };

  const isSaveDisabled =
    isSaving ||
    !isModified ||
    !selectedCourseId ||
    policyLoading ||
    coursesLoading;

  // ----- Render -----

  const renderCourseSelector = () => {
    if (coursesLoading) {
      return (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading courses...</p>
        </div>
      );
    }

    if (coursesError) {
      return (
        <ApiError
          title="Course Loading Error"
          message={coursesError.message}
          statusCode={coursesError.statusCode}
          errorCode={coursesError.errorCode}
          onRetry={() => fetchCourses(selectedCourseId)}
          onGoBack={() => navigate(-1)}
        />
      );
    }

    if (courses.length === 0) {
      return (
        <div className="empty-state">
          <FaGraduationCap className="empty-state-icon" />
          <p className="empty-state-text">
            No courses available for promotion configuration.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="course-selector-row">
          <div className="form-group course-select-group">
            <label className="form-label" htmlFor="promotionCourse">
              Course
            </label>
            <div className="course-select-wrapper">
              <select
                id="promotionCourse"
                className="form-input course-select"
                value={selectedCourseId}
                onChange={handleCourseChange}
                disabled={isSaving}
              >
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name}
                    {course.code ? ` (${course.code})` : ""} —{" "}
                    {course.durationSemesters || "?"} Semesters
                  </option>
                ))}
              </select>
              <FaChevronDown className="course-select-icon" />
            </div>
          </div>

          <div className="form-group course-duration-group">
            <span className="form-label">Duration</span>
            <span className="course-duration-badge">
              {durationSemesters} Semesters
            </span>
          </div>
        </div>

        {selectedCourse && (
          <div className="course-summary">
            <span className="course-summary-item">
              <strong>Course:</strong> {selectedCourse.name}
              {selectedCourse.code ? ` (${selectedCourse.code})` : ""}
            </span>
            <span className="course-summary-divider" />
            <span className="course-summary-item">
              <strong>Duration:</strong> {durationSemesters} Semesters
            </span>
          </div>
        )}

        {isUsingFallbackPolicy && (
          <div className="fallback-banner">
            <FaExclamationCircle />
            <span>
              No course-specific policy exists for this course. The college-level
              configuration is shown as a starting point. Saving will create a
              policy for this course.
            </span>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="promotion-setting-page">
        {/* ================= BREADCRUMB ================= */}
        <div
          style={{
            width: "100%",
            margin: "10px auto",
            paddingTop: "2px",
            height: "60px",
          }}
        >
          <div style={{ width: "100%" }}>
            <Breadcrumb
              items={[
                { label: "Dashboard", path: "/dashboard" },
                { label: "System Settings" },
                { label: "Promotion Settings" },
              ]}
            />
          </div>
        </div>


        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <FaGraduationCap className="header-icon" />
            </div>
            <div className="header-text">
              <h1 className="settings-title">Promotion Settings</h1>
              <p className="settings-subtitle">
                Configure attendance, fee, and ATKT rules for student promotion eligibility
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-reset"
              onClick={handleReset}
              disabled={isSaveDisabled}
            >
              <FaUndo /> Reset
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={isSaveDisabled}
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <FaSave /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon">
                <FaGraduationCap />
              </div>
              <h3 className="card-title">Course Configuration</h3>
            </div>

            {renderCourseSelector()}
          </div>
        </div>

        {policyError ? (
          <ApiError
            title="Promotion Policy Loading Error"
            message={policyError.message}
            statusCode={policyError.statusCode}
            errorCode={policyError.errorCode}
            onRetry={() => fetchPolicy(selectedCourseId)}
            onGoBack={() => navigate(-1)}
          />
        ) : policyLoading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading promotion policy...</p>
          </div>
        ) : selectedCourseId ? (
          <div className="settings-grid">
            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon">
                  <FaGraduationCap />
                </div>
                <h3 className="card-title">Attendance Threshold</h3>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Minimum Attendance Percentage (%)
                </label>
                <input
                  type="number"
                  name="minAttendancePercentage"
                  value={formData.minAttendancePercentage}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                  max="100"
                  placeholder="75"
                />
                <div className="info-box">
                  <FaInfoCircle style={{ marginTop: 2 }} />
                  <span>
                    Students must have at least <strong>{formData.minAttendancePercentage}%</strong> attendance
                    to be eligible for promotion. Those below this threshold cannot be promoted
                    (unless an override is applied).
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="policyEffectiveFrom">
                  Policy Effective From
                </label>
                <input
                  id="policyEffectiveFrom"
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maxAllowedKTs">
                  Overall Max Allowed KTs (fallback)
                </label>
                <input
                  id="maxAllowedKTs"
                  type="number"
                  name="maxAllowedKTs"
                  value={formData.maxAllowedKTs}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                  placeholder="3"
                />
                <div className="info-box">
                  <FaInfoCircle style={{ marginTop: 2 }} />
                  <span>
                    Used when a semester transition has no specific rule below. This
                    value applies to this course only.
                  </span>
                </div>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>
                    Policy is active
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon">
                  <FaClipboardCheck />
                </div>
                <h3 className="card-title">Fee Promotion Requirement</h3>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="minimumFeePaidPercentage">
                  Minimum Fee Paid for Promotion (%)
                </label>
                <input
                  id="minimumFeePaidPercentage"
                  type="number"
                  name="minimumFeePaidPercentage"
                  value={formData.minimumFeePaidPercentage}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                  max="100"
                  placeholder="100"
                />
                <div className="info-box">
                  <FaInfoCircle style={{ marginTop: 2 }} />
                  <span>
                    Minimum percentage of the student's total fee that must be paid
                    before promotion. Student must have paid at least{" "}
                    <strong>{formData.minimumFeePaidPercentage}%</strong> of the
                    applicable fee to be eligible for promotion (unless an override is
                    applied).
                  </span>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon">
                  <FaClipboardCheck />
                </div>
                <h3 className="card-title">Semester Scope (Optional)</h3>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Apply this policy only to selected semesters (leave empty for all)
                </label>
                <div className="semester-grid">
                  {semesterOptions.map((sem) => (
                    <div
                      key={sem.value}
                      className={`semester-chip ${
                        (formData.scopedSemesters || []).includes(sem.value)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSemesterToggle(sem.value)}
                    >
                      {sem.label}
                    </div>
                  ))}
                </div>
                <div className="info-box">
                  <FaInfoCircle style={{ marginTop: 2 }} />
                  <span>
                    If semesters are selected, this attendance threshold applies only
                    to promotions from those semesters. When empty, it applies to all
                    semesters of the selected course.
                  </span>
                </div>
              </div>
            </div>

            <div className="settings-card settings-card-wide">
              <div className="card-header">
                <div className="card-icon">
                  <FaClipboardCheck />
                </div>
                <h3 className="card-title">Semester-wise ATKT Rules</h3>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Configure maximum allowed KTs and subject-type limits for each promotion transition
                </label>
                <div style={{ overflowX: "auto" }}>
                  <table className="kt-rules-table">
                    <thead>
                      <tr>
                        <th style={{ width: "180px" }}>Transition</th>
                        <th style={{ width: "100px" }}>Max KTs</th>
                        <th style={{ width: "160px" }}>Previous Year Clearance</th>
                        <th style={{ width: "220px" }}>Subject Type Limits</th>
                        <th style={{ width: "60px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitionOptions.map((trans) => {
                        const rule = getRuleForTransition(trans.from);
                        const hasRule = !!rule;
                        return (
                          <tr key={trans.from} className={`kt-rule-row ${!hasRule ? "empty" : ""}`}>
                            <td><strong>{trans.label}</strong></td>
                            <td>
                              <input
                                type="number"
                                className="kt-rule-input"
                                value={hasRule ? rule.maxAllowedKTs : 3}
                                onChange={(e) => handleMaxKTsChange(trans.from, e.target.value)}
                                min="0"
                                max="20"
                                disabled={!hasRule}
                              />
                            </td>
                            <td>
                              <label className="kt-rule-toggle">
                                <input
                                  type="checkbox"
                                  className="kt-rule-checkbox"
                                  checked={hasRule && rule.requirePreviousYearClearance}
                                  onChange={(e) => handlePreviousYearClearanceChange(trans.from, e.target.checked)}
                                  disabled={!hasRule}
                                />
                                <span className="kt-rule-toggle-label">
                                  {hasRule && rule.requirePreviousYearClearance ? "Required" : "Not Required"}
                                </span>
                              </label>
                            </td>
                            <td>
                              <div className="subject-type-inputs">
                                <div className="subject-type-input-group">
                                  <span className="subject-type-input-label">Theory</span>
                                  <input
                                    type="number"
                                    className="kt-rule-input"
                                    value={hasRule ? (rule.subjectTypeLimits?.THEORY ?? 3) : 3}
                                    onChange={(e) => handleSubjectTypeLimitChange(trans.from, "THEORY", e.target.value)}
                                    min="0"
                                    max="20"
                                    disabled={!hasRule}
                                  />
                                </div>
                                <div className="subject-type-input-group">
                                  <span className="subject-type-input-label">Practical</span>
                                  <input
                                    type="number"
                                    className="kt-rule-input"
                                    value={hasRule ? (rule.subjectTypeLimits?.PRACTICAL ?? 3) : 3}
                                    onChange={(e) => handleSubjectTypeLimitChange(trans.from, "PRACTICAL", e.target.value)}
                                    min="0"
                                    max="20"
                                    disabled={!hasRule}
                                  />
                                </div>
                                <div className="subject-type-input-group">
                                  <span className="subject-type-input-label">Composite</span>
                                  <input
                                    type="number"
                                    className="kt-rule-input"
                                    value={hasRule ? (rule.subjectTypeLimits?.COMPOSITE ?? 3) : 3}
                                    onChange={(e) => handleSubjectTypeLimitChange(trans.from, "COMPOSITE", e.target.value)}
                                    min="0"
                                    max="20"
                                    disabled={!hasRule}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="kt-rule-actions">
                                {hasRule ? (
                                  <button
                                    type="button"
                                    className="btn-remove-rule"
                                    onClick={() => removeKTRule(trans.from)}
                                    title="Remove rule"
                                  >
                                    <FaTrash style={{ fontSize: "0.875rem" }} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-add-rule"
                                    onClick={() => updateKTRule(trans.from, {})}
                                  >
                                    <FaCheck style={{ fontSize: "0.875rem" }} /> Add
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="info-box">
                  <FaInfoCircle style={{ marginTop: 2 }} />
                  <span>
                    Configure semester-specific ATKT limits. Click "Add" to enable rules for a transition.
                    <br />
                    <strong>Previous Year Clearance:</strong> When enabled, students must clear all backlogs from the previous academic year before promotion.
                    <br />
                    <strong>Subject Type Limits:</strong> Optional per-type KT limits (THEORY/PRACTICAL/COMPOSITE). Leave at default to use overall Max KTs only.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        isOpen={showDiscardModal}
        onClose={cancelCourseSwitch}
        onConfirm={confirmDiscardAndSwitch}
        title="Discard unsaved changes?"
        message="You have unsaved promotion rule changes for the current course. Switching courses will discard them. Do you want to continue?"
        type="warning"
        confirmText="Discard & Switch"
        cancelText="Keep Editing"
      />
    </>
  );
};

export default PromotionSetting;

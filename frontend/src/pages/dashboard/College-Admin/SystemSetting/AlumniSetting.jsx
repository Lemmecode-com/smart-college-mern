import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FaGraduationCap,
  FaSave,
  FaUndo,
  FaCheck,
  FaBook,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaExclamationTriangle,
} from "react-icons/fa";
import api from "../../../../api/axios";
import {
  getAlumniSettings,
  updateAlumniSettings,
} from "../../../../api/alumni";
import Breadcrumb from "../../../../components/Breadcrumb";
import Loading from "../../../../components/Loading";
import ApiError from "../../../../components/ApiError";
import "./AlumniSetting.css";

const DEFAULT_ATTENDANCE = 75;
const DEFAULT_FEE_PAID = 100;

export default function AlumniSetting() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [enabled, setEnabled] = useState(true);
  const [requireFinalSemester, setRequireFinalSemester] = useState(true);
  const [requirePublished, setRequirePublished] = useState(true);
  const [requiredOutcome, setRequiredOutcome] = useState("PASS");

  const [attendanceEnabled, setAttendanceEnabled] = useState(true);
  const [minimumAttendance, setMinimumAttendance] = useState(DEFAULT_ATTENDANCE);

  const [feeEnabled, setFeeEnabled] = useState(true);
  const [minimumFeePaid, setMinimumFeePaid] = useState(DEFAULT_FEE_PAID);

  const [requirePreviousBacklog, setRequirePreviousBacklog] = useState(true);
  const [allowCurrentBacklog, setAllowCurrentBacklog] = useState(false);

  const [effectiveFromAcademicYear, setEffectiveFromAcademicYear] = useState("");
  const [policyVersion, setPolicyVersion] = useState(1);
  const [isDefaultPolicy, setIsDefaultPolicy] = useState(false);

  // Load available courses
  useEffect(() => {
    fetchCourses();
  }, []);

  // When selected course changes, fetch its policy
  useEffect(() => {
    fetchPolicy(selectedCourseId);
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await api.get("/courses");
      const list = res.data?.data?.courses || res.data?.courses || res.data?.data || [];
      const validCourses = Array.isArray(list) ? list.filter((c) => c && c._id) : [];
      setCourses(validCourses);
    } catch (err) {
      console.error("Failed to load courses:", err);
      toast.error("Failed to load courses list.");
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchPolicy = async (courseId) => {
    setLoadingPolicy(true);
    setError(null);
    try {
      const res = await getAlumniSettings(courseId);
      const data = res?.data || res;

      if (data) {
        setEnabled(data.enabled ?? true);
        setRequireFinalSemester(data.requireFinalSemester ?? true);
        setRequirePublished(data.resultRule?.requirePublished ?? true);
        setRequiredOutcome(data.resultRule?.requiredOutcome || "PASS");

        setAttendanceEnabled(data.attendanceRule?.enabled ?? true);
        setMinimumAttendance(data.attendanceRule?.minimumPercentage ?? DEFAULT_ATTENDANCE);

        setFeeEnabled(data.feeRule?.enabled ?? true);
        setMinimumFeePaid(data.feeRule?.minimumPaidPercentage ?? DEFAULT_FEE_PAID);

        setRequirePreviousBacklog(data.backlogRule?.requirePreviousYearClearance ?? true);
        setAllowCurrentBacklog(data.backlogRule?.allowCurrentBacklog ?? false);

        setEffectiveFromAcademicYear(data.effectiveFromAcademicYear || "");
        setPolicyVersion(data.version || 1);
        setIsDefaultPolicy(Boolean(data.isDefault));
      }
    } catch (err) {
      console.error("Failed to fetch alumni settings:", err);
      setError(err);
      toast.error(err.response?.data?.message || "Failed to load alumni settings.");
    } finally {
      setLoadingPolicy(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();

    // Validations
    const attNum = Number(minimumAttendance);
    if (attendanceEnabled && (isNaN(attNum) || attNum < 0 || attNum > 100)) {
      toast.error("Minimum attendance percentage must be between 0 and 100.");
      return;
    }

    const feeNum = Number(minimumFeePaid);
    if (feeEnabled && (isNaN(feeNum) || feeNum < 0 || feeNum > 100)) {
      toast.error("Minimum fee paid percentage must be between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        course_id: selectedCourseId || null,
        enabled,
        requireFinalSemester,
        resultRule: {
          requirePublished,
          requiredOutcome,
        },
        attendanceRule: {
          enabled: attendanceEnabled,
          minimumPercentage: attNum,
        },
        feeRule: {
          enabled: feeEnabled,
          minimumPaidPercentage: feeNum,
        },
        backlogRule: {
          requirePreviousYearClearance: requirePreviousBacklog,
          allowCurrentBacklog,
        },
        effectiveFromAcademicYear: effectiveFromAcademicYear || null,
      };

      const res = await updateAlumniSettings(payload);
      const updated = res?.data || res;
      setPolicyVersion(updated.version || policyVersion + 1);
      setIsDefaultPolicy(false);
      toast.success("Alumni settings saved successfully!");
    } catch (err) {
      console.error("Failed to save alumni settings:", err);
      toast.error(err.response?.data?.message || "Failed to save alumni settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchPolicy(selectedCourseId);
    toast.info("Reset to last saved settings.");
  };

  return (
    <div className="alumni-setting-page">
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/college-admin/dashboard" },
          { label: "System Settings", path: "/system-settings/general" },
          { label: "Alumni Settings" },
        ]}
      />

      <div className="alumni-header">
        <div className="alumni-header-content">
          <div className="alumni-header-icon-wrapper">
            <FaGraduationCap className="alumni-header-icon" />
          </div>
          <div className="alumni-header-text">
            <h1>Alumni Settings</h1>
            <p>
              Configure graduation and Alumni eligibility criteria independently from regular promotion rules
            </p>
          </div>
        </div>
        <div className="alumni-header-actions">
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary-alumni"
            disabled={saving || loadingPolicy}
          >
            <FaUndo /> Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary-alumni"
            disabled={saving || loadingPolicy}
          >
            <FaSave /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {error && <ApiError error={error} onDismiss={() => setError(null)} />}

      {/* Scope Selector Card */}
      <div className="alumni-card">
        <div className="alumni-card-title">
          <FaBook /> Scope Configuration
        </div>
        <div className="alumni-grid-2">
          <div className="alumni-form-group">
            <label htmlFor="course-select">Select Course Scope</label>
            <select
              id="course-select"
              className="alumni-form-control"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={loadingCourses || loadingPolicy}
            >
              <option value="">-- All Courses (College Default Policy) --</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name} ({course.code}) — {course.durationSemesters} Semesters
                </option>
              ))}
            </select>
            <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
              {selectedCourseId
                ? "Course-specific settings override the college-wide default policy."
                : "College-wide default policy applies to any course without its own policy."}
            </span>
          </div>

          <div className="alumni-form-group">
            <label htmlFor="academic-year-input">Effective Academic Year</label>
            <input
              id="academic-year-input"
              type="text"
              className="alumni-form-control"
              placeholder="e.g. 2027-2028 (Optional)"
              value={effectiveFromAcademicYear}
              onChange={(e) => setEffectiveFromAcademicYear(e.target.value)}
              disabled={loadingPolicy}
            />
            <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
              Leave blank to apply to all current and future graduating cohorts.
            </span>
          </div>
        </div>

        {isDefaultPolicy && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaExclamationTriangle />
            <span>
              Showing default graduation template (Version {policyVersion}). Click <strong>Save Settings</strong> to create an active policy.
            </span>
          </div>
        )}
      </div>

      {loadingPolicy ? (
        <Loading message="Loading Alumni Settings..." />
      ) : (
        <form onSubmit={handleSave}>
          {/* Master Enable Toggle */}
          <div className={`alumni-toggle-container ${!enabled ? "disabled" : ""}`}>
            <div className="alumni-toggle-label">
              <h3>Enable Alumni Transition</h3>
              <p>
                {enabled
                  ? "Final-semester students satisfying these requirements will be eligible to move to Alumni."
                  : "Alumni transitions are currently disabled. Students cannot be moved to Alumni."}
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="alumni-grid-2">
            {/* Academic & Result Requirements */}
            <div className="alumni-card">
              <div className="alumni-card-title">
                <FaGraduationCap /> Academic & Result Requirements
              </div>

              <div
                className="alumni-checkbox-group"
                onClick={() => setRequireFinalSemester(!requireFinalSemester)}
              >
                <input
                  type="checkbox"
                  checked={requireFinalSemester}
                  onChange={(e) => setRequireFinalSemester(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <div className="alumni-checkbox-label">Require Final Semester</div>
                  <div className="alumni-checkbox-desc">
                    Only students in the final semester of their course can graduate.
                  </div>
                </div>
              </div>

              <div
                className="alumni-checkbox-group"
                onClick={() => setRequirePublished(!requirePublished)}
              >
                <input
                  type="checkbox"
                  checked={requirePublished}
                  onChange={(e) => setRequirePublished(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <div className="alumni-checkbox-label">Require Published Result</div>
                  <div className="alumni-checkbox-desc">
                    Final semester exam result must be calculated and published.
                  </div>
                </div>
              </div>

              <div className="alumni-form-group" style={{ marginTop: "1rem" }}>
                <label htmlFor="outcome-select">Required Result Outcome</label>
                <select
                  id="outcome-select"
                  className="alumni-form-control"
                  value={requiredOutcome}
                  onChange={(e) => setRequiredOutcome(e.target.value)}
                >
                  <option value="PASS">PASS (All subjects passed with 0 failed subjects)</option>
                </select>
                <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Students with ATKT or FAIL results cannot be moved to Alumni status.
                </span>
              </div>
            </div>

            {/* Backlog Requirements */}
            <div className="alumni-card">
              <div className="alumni-card-title">
                <FaCheck /> Backlog Requirements
              </div>

              <div
                className="alumni-checkbox-group"
                onClick={() => setRequirePreviousBacklog(!requirePreviousBacklog)}
              >
                <input
                  type="checkbox"
                  checked={requirePreviousBacklog}
                  onChange={(e) => setRequirePreviousBacklog(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <div className="alumni-checkbox-label">Require Previous-Year Clearance</div>
                  <div className="alumni-checkbox-desc">
                    All prior academic year backlogs must be completely cleared.
                  </div>
                </div>
              </div>

              <div
                className="alumni-checkbox-group"
                onClick={() => setAllowCurrentBacklog(!allowCurrentBacklog)}
              >
                <input
                  type="checkbox"
                  checked={allowCurrentBacklog}
                  onChange={(e) => setAllowCurrentBacklog(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <div className="alumni-checkbox-label">Allow Current Backlog</div>
                  <div className="alumni-checkbox-desc">
                    Allow graduation even if uncleared backlogs exist (Default: False).
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Requirements */}
            <div className="alumni-card">
              <div className="alumni-card-title">
                <FaCalendarCheck /> Attendance Requirements
              </div>

              <div
                className="alumni-checkbox-group"
                onClick={() => setAttendanceEnabled(!attendanceEnabled)}
              >
                <input
                  type="checkbox"
                  checked={attendanceEnabled}
                  onChange={(e) => setAttendanceEnabled(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <div className="alumni-checkbox-label">Enable Attendance Requirement</div>
                  <div className="alumni-checkbox-desc">
                    Enforce minimum final-semester session attendance percentage.
                  </div>
                </div>
              </div>

              {attendanceEnabled && (
                <div className="alumni-form-group" style={{ marginTop: "1rem" }}>
                  <label htmlFor="attendance-input">Minimum Attendance (%)</label>
                  <input
                    id="attendance-input"
                    type="number"
                    min="0"
                    max="100"
                    className="alumni-form-control"
                    value={minimumAttendance}
                    onChange={(e) => setMinimumAttendance(e.target.value)}
                  />
                  <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Standard UGC/AICTE recommendation is 75%.
                  </span>
                </div>
              )}
            </div>

            {/* Fee Clearance Requirements */}
            <div className="alumni-card">
              <div className="alumni-card-title">
                <FaMoneyBillWave /> Fee Clearance Requirements
              </div>

              <div
                className="alumni-checkbox-group"
                onClick={() => setFeeEnabled(!feeEnabled)}
              >
                <input
                  type="checkbox"
                  checked={feeEnabled}
                  onChange={(e) => setFeeEnabled(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <div className="alumni-checkbox-label">Enable Fee Clearance Requirement</div>
                  <div className="alumni-checkbox-desc">
                    Enforce that student fees are paid before graduation.
                  </div>
                </div>
              </div>

              {feeEnabled && (
                <div className="alumni-form-group" style={{ marginTop: "1rem" }}>
                  <label htmlFor="fee-input">Minimum Fee Paid (%)</label>
                  <input
                    id="fee-input"
                    type="number"
                    min="0"
                    max="100"
                    className="alumni-form-control"
                    value={minimumFeePaid}
                    onChange={(e) => setMinimumFeePaid(e.target.value)}
                  />
                  <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    100% requires full fee clearance prior to graduation.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary-alumni"
              disabled={saving}
            >
              <FaUndo /> Reset
            </button>
            <button
              type="submit"
              className="btn-primary-alumni"
              disabled={saving}
            >
              <FaSave /> {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

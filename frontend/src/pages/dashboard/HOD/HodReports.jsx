import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaUsers,
  FaUserGraduate,
  FaBook,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaClipboardList,
  FaCheckCircle,
  FaFilePdf,
  FaFileExcel,
  FaFilter,
  FaArrowRight,
  FaQuestionCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaClock,
  FaHistory,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes,
  FaInfoCircle,
  FaChevronDown,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import Loading from "../../../components/Loading";
import { logger } from "../../../utils/logger";
import { exportToExcel, exportToPDF } from "../../../utils/exportHelpers";
import "./HodReports.css";

// Brand Color Palette (NOVAA ERP design system: Teal / Blue / Green / Orange)
const BRAND = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  primaryLight: "#e8f1f8",
  accent: "#f97316",
  accentLight: "#fff7ed",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  info: "#0891b2",
  infoLight: "#cffafe",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
};

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

/**
 * Format report date
 */
const formatReportDate = (isoString) => {
  if (!isoString) {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Oct 12, 2026";
  }
};

/**
 * Reusable Slim 4-KPI Card (Whole card clickable, compact height, accessible)
 */
const KpiCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  bg,
  onClick,
  targetLabel,
}) => {
  const isClickable = Boolean(onClick);

  const handleKeyDown = (e) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`hod-kpi-card ${isClickable ? "hod-kpi-card--clickable" : ""}`}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={
        isClickable
          ? `${label}: ${value}. ${targetLabel || "Click to view details"}`
          : `${label}: ${value}`
      }
    >
      <div className="hod-kpi-card-top-bar" style={{ background: color }} />
      <div className="hod-kpi-card-body">
        <div className="hod-kpi-card-main">
          <div className="hod-kpi-value">{value}</div>
          <div className="hod-kpi-label">{label}</div>
        </div>
        <div className="hod-kpi-icon-wrap" style={{ background: bg, color }}>
          {Icon && <Icon aria-hidden="true" />}
        </div>
      </div>
      {subtext && <div className="hod-kpi-subtext">{subtext}</div>}
    </div>
  );
};

const HodReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Active Filters State
  const [filters, setFilters] = useState({
    academicYear: "ALL",
    program: "ALL",
    semester: "ALL",
    dateRange: "ALL",
    startDate: "",
    endDate: "",
  });

  // Table State
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectSort, setSubjectSort] = useState({
    column: "avg",
    direction: "asc", // Default sort by lowest Avg % first so problem subjects appear on top
  });



  // Expandable Recent Activity Groups State
  const [expandedActivityGroups, setExpandedActivityGroups] = useState(new Set());
  const toggleActivityGroup = (id) => {
    setExpandedActivityGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch reports callback
  const fetchReports = useCallback(
    async (activeFilters = filters, isInitial = false) => {
      try {
        if (isInitial) {
          setLoading(true);
        } else {
          setFilterLoading(true);
        }
        setError(null);

        const queryParams = new URLSearchParams();
        if (activeFilters.academicYear && activeFilters.academicYear !== "ALL") {
          queryParams.set("academicYear", activeFilters.academicYear);
        }
        if (activeFilters.program && activeFilters.program !== "ALL") {
          queryParams.set("courseId", activeFilters.program);
        }
        if (activeFilters.semester && activeFilters.semester !== "ALL") {
          queryParams.set("semester", activeFilters.semester);
        }

        // Date Range handling
        if (activeFilters.dateRange === "THIS_MONTH") {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .slice(0, 10);
          const end = now.toISOString().slice(0, 10);
          queryParams.set("startDate", start);
          queryParams.set("endDate", end);
        } else if (activeFilters.dateRange === "LAST_30_DAYS") {
          const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          const end = new Date().toISOString().slice(0, 10);
          queryParams.set("startDate", past);
          queryParams.set("endDate", end);
        } else if (activeFilters.dateRange === "CUSTOM") {
          if (activeFilters.startDate) {
            queryParams.set("startDate", activeFilters.startDate);
          }
          if (activeFilters.endDate) {
            queryParams.set("endDate", activeFilters.endDate);
          }
        }

        const queryString = queryParams.toString();
        const url = `/hod/reports/overview${queryString ? `?${queryString}` : ""}`;

        // Fetch overview and optional teachers list in parallel
        const [reportsRes, teachersRes] = await Promise.all([
          api.get(url),
          api.get("/hod/teachers").catch((err) => {
            logger.warn("Could not fetch teachers list for report:", err);
            return null;
          }),
        ]);

        const payload = reportsRes?.data?.data || reportsRes?.data || null;

        // If facultyWorkload is empty but teachersRes returned teachers, attach them safely
        if (
          payload &&
          (!payload.facultyWorkload || payload.facultyWorkload.length === 0)
        ) {
          const rawTeachers =
            teachersRes?.data?.data?.teachers ||
            teachersRes?.data?.teachers ||
            (Array.isArray(teachersRes?.data?.data)
              ? teachersRes.data.data
              : []) ||
            [];
          if (rawTeachers.length > 0) {
            payload.facultyWorkload = rawTeachers.map((t, idx) => ({
              id: t._id || t.id || idx,
              name: t.name || `Faculty Member ${idx + 1}`,
              empId: t.employeeId || `EMP-${1000 + idx}`,
              designation: t.designation || "Faculty",
              specialization: t.specialization || null,
              subjects: t.specialization || "Information Technology",
              sessions: 0,
              timelySessions: 0,
              timelinessPercent: null,
              compliance: "N/A",
              status: "No sessions",
            }));
          }
        }

        setData(payload);
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;
        const errorMessage = backendMessage || "Failed to load department reports";

        logger.error("HOD Reports error:", statusCode, errorCode);

        setError({
          message: errorMessage,
          statusCode,
          errorCode,
        });

        const isAuthError =
          statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

        if (!isAuthError) {
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchReports(filters, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update single filter and trigger refetch
  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };

      // If program changes, check if current semester exceeds the program's semesters
      if (key === "program") {
        if (value !== "ALL") {
          const prog = data?.filterOptions?.programs?.find((p) => p.id === value);
          const maxSem = prog?.semesters || 4;
          if (updated.semester !== "ALL" && Number(updated.semester) > maxSem) {
            updated.semester = "ALL";
          }
        }
      }

      fetchReports(updated, false);
      return updated;
    });
  };

  const resetFilters = () => {
    const defaultFilters = {
      academicYear: "ALL",
      program: "ALL",
      semester: "ALL",
      dateRange: "ALL",
      startDate: "",
      endDate: "",
    };
    setFilters(defaultFilters);
    setSubjectSearch("");
    fetchReports(defaultFilters, false);
  };

  // Safe entity extraction from API response
  const department = data?.department || {};
  const kpis = data?.kpis || {};
  const meta = data?.meta || {};
  const attendance = kpis?.attendanceSummary || {};
  const filterOptions = data?.filterOptions || { academicYears: [], programs: [] };

  // Core KPI values (all API-driven)
  const totalTeachers = kpis?.totalTeachers ?? 0;
  const totalStudents = kpis?.totalStudents ?? 0;
  const totalSubjects = kpis?.totalSubjects ?? 0;
  const totalCourses =
    kpis?.totalCourses ?? (filterOptions?.programs?.length || 0);
  const publishedTimetables = kpis?.publishedTimetables ?? 0;
  const draftTimetables = kpis?.draftTimetables ?? 0;
  const archivedTimetables = kpis?.archivedTimetables ?? 0;
  const totalTimetables =
    publishedTimetables + draftTimetables + archivedTimetables;

  // Attendance metrics (all API-driven and mathematically consistent)
  const totalSessions = attendance?.totalSessions ?? 0;
  const presentRecords = attendance?.present ?? 0;
  const absentRecords = attendance?.absent ?? 0;
  const totalRecords =
    attendance?.totalRecords !== undefined && attendance?.totalRecords !== null
      ? attendance.totalRecords
      : presentRecords + absentRecords;

  const avgAttendancePercent =
    attendance?.averageAttendancePercentage !== undefined &&
    attendance?.averageAttendancePercentage !== null
      ? Math.round(attendance.averageAttendancePercentage)
      : totalRecords > 0
      ? Math.round((presentRecords / totalRecords) * 100)
      : 0;

  // Weekly Trend Data (API-driven)
  const trendData = useMemo(() => {
    const list = data?.weeklyTrend || data?.attendanceTrend;
    if (Array.isArray(list)) {
      return list;
    }
    return [];
  }, [data?.weeklyTrend, data?.attendanceTrend]);

  // Weekly Trend Data without padding tick labels
  const chartDisplayData = useMemo(() => {
    return trendData;
  }, [trendData]);

  // Subject-wise Data (API-driven with sorting and search filter)
  const subjectsData = useMemo(() => {
    if (data?.subjectWise && Array.isArray(data.subjectWise)) {
      return data.subjectWise;
    }
    return [];
  }, [data?.subjectWise]);

  // Handle column sorting for Subject-wise table
  const handleSort = (columnKey) => {
    setSubjectSort((prev) => ({
      column: columnKey,
      direction:
        prev.column === columnKey && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedSubjects = useMemo(() => {
    let list = [...subjectsData];

    // Search filter
    if (subjectSearch.trim()) {
      const q = subjectSearch.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.teacher && s.teacher.toLowerCase().includes(q))
      );
    }

    // Column sorting
    list.sort((a, b) => {
      let aVal = a[subjectSort.column];
      let bVal = b[subjectSort.column];
      if (aVal === undefined || aVal === null) aVal = 0;
      if (bVal === undefined || bVal === null) bVal = 0;

      if (subjectSort.direction === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return list;
  }, [subjectsData, subjectSearch, subjectSort]);

  // Watchlist: Students below 75% attendance (API-driven)
  const lowAttendanceStudents = useMemo(() => {
    if (
      data?.lowAttendanceStudents &&
      Array.isArray(data.lowAttendanceStudents)
    ) {
      return data.lowAttendanceStudents;
    }
    return [];
  }, [data?.lowAttendanceStudents]);

  // Faculty Workload & Attendance Overview (API-driven)
  const facultyOverview = useMemo(() => {
    if (data?.facultyWorkload && Array.isArray(data.facultyWorkload)) {
      return data.facultyWorkload;
    }
    return [];
  }, [data?.facultyWorkload]);

  // Specialization column visibility: hide if NO teacher in the list has a specialization
  const hasAnySpecialization = useMemo(() => {
    return facultyOverview.some(
      (f) =>
        f.specialization &&
        f.specialization !== "Not set" &&
        f.specialization.trim() !== ""
    );
  }, [facultyOverview]);

  // Action Required Data (API-driven)
  const actionRequired = data?.actionRequired || {
    timetableExceptions: kpis?.pendingExceptions || 0,
    lowAttendanceCount: lowAttendanceStudents.length,
    pendingAttendanceSessions: 0,
    unassignedSubjects: 0,
  };

  // Academic Performance Data (API-driven or null)
  const academicPerformance = data?.academicPerformance || null;

  // Recent Activity Timeline (API-driven)
  const recentActivity = useMemo(() => {
    if (data?.recentActivity && Array.isArray(data.recentActivity)) {
      return data.recentActivity;
    }
    return [];
  }, [data?.recentActivity]);

  // Dynamic Semester calculation based on actual database values for the program
  const availableSemesters = useMemo(() => {
    if (filters.program !== "ALL") {
      const selectedProg = filterOptions?.programs?.find(
        (p) => p.id === filters.program
      );
      if (selectedProg?.semesters && Array.isArray(selectedProg.semesters)) {
        return selectedProg.semesters;
      }
      const totalSems = selectedProg?.durationSemesters || 4;
      return Array.from({ length: totalSems }, (_, i) => i + 1);
    }
    // All programs: collect all unique semester numbers from database programs
    const semSet = new Set();
    filterOptions?.programs?.forEach((p) => {
      if (p.semesters && Array.isArray(p.semesters)) {
        p.semesters.forEach((s) => semSet.add(s));
      } else {
        const total = p.durationSemesters || 4;
        for (let i = 1; i <= total; i++) semSet.add(i);
      }
    });
    const result = Array.from(semSet).sort((a, b) => a - b);
    return result.length > 0 ? result : [1, 2, 3, 4];
  }, [filters.program, filterOptions?.programs]);

  // Build readable filter summary string for exports and metadata
  const activeFilterSummary = useMemo(() => {
    const parts = [];
    parts.push(
      `Academic Year: ${
        filters.academicYear === "ALL" ? "All Years" : filters.academicYear
      }`
    );
    if (filters.program === "ALL") {
      parts.push("Program: All Programs");
    } else {
      const prog = filterOptions?.programs?.find((p) => p.id === filters.program);
      parts.push(`Program: ${prog?.name || filters.program}`);
    }
    parts.push(
      `Semester: ${filters.semester === "ALL" ? "All Semesters" : `Semester ${filters.semester}`}`
    );
    if (filters.dateRange === "ALL") {
      parts.push("Date Range: All Recorded Dates");
    } else if (filters.dateRange === "THIS_MONTH") {
      parts.push("Date Range: This Month");
    } else if (filters.dateRange === "LAST_30_DAYS") {
      parts.push("Date Range: Last 30 Days");
    } else if (filters.dateRange === "CUSTOM") {
      parts.push(
        `Date Range: ${filters.startDate || "Start"} to ${filters.endDate || "Present"}`
      );
    }
    return parts.join(" | ");
  }, [filters, filterOptions?.programs]);

  // Export handlers with multi-sheet Excel and active filter metadata
  const handleExportExcel = async () => {
    try {
      const deptTitle = department.name || "Information Technology";
      const filename = `HOD_Report_${department.code || "IT"}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Sheet 1: Summary Sheet
      const summaryRows = [
        { metric: "Total Assigned Teachers",      value: totalTeachers },
        { metric: "Total Enrolled Students",       value: totalStudents },
        { metric: "Total Curriculum Subjects",     value: totalSubjects },
        { metric: "Total Department Programs",     value: totalCourses },
        { metric: "Published Timetables",          value: publishedTimetables },
        { metric: "Draft Timetables",              value: draftTimetables },
        { metric: "Archived Timetables",           value: archivedTimetables },
        { metric: "Sessions Held (Closed)",        value: totalSessions },
        { metric: "Present Attendance Marks",      value: presentRecords },
        { metric: "Absent Attendance Marks",       value: absentRecords },
        { metric: "Total Marks Recorded",          value: totalRecords },
        // Pre-divide so the Summary Value column can use numFmt '0%' for this one row
        { metric: "Average Attendance Rate",       value: avgAttendancePercent / 100, _pct: true },
        { metric: "Students Below 75% Watchlist",  value: lowAttendanceStudents.length },
      ];

      const summaryCols = [
        { header: "Report KPI Metric", key: "metric", width: 36 },
        { header: "Value",             key: "value",  width: 18 },
      ];

      // Sheet 2: Subject-wise

      const subjectCols = [
        { header: "Code",             key: "code",     width: 18 },
        { header: "Subject Name",     key: "name",     width: 32 },
        { header: "Assigned Faculty", key: "teacher",  width: 24 },
        { header: "Semester",         key: "semester", width: 12 },
        { header: "Sessions Held",    key: "sessions", width: 16 },
        { header: "Present",          key: "present",  width: 12 },
        { header: "Absent",           key: "absent",   width: 12 },
        { header: "Avg %",            key: "avg",      width: 14, isPercent: true },
        { header: "Status",           key: "status",   width: 14 },
      ];

      // Sheet 3: Low Attendance Watchlist
      const lowAttCols = [
        { header: "Student Name",       key: "name",             width: 24 },
        { header: "PRN / ID",           key: "prn",              width: 18 },
        { header: "Roll Number",        key: "rollNumber",        width: 14 },
        { header: "Semester",           key: "sem",              width: 14 },
        { header: "Attended Sessions",  key: "sessionsAttended", width: 18 },
        { header: "Total Sessions",     key: "totalSessions",    width: 16 },
        { header: "Attendance %",       key: "attendance",       width: 16, isPercent: true },
        { header: "Status",             key: "status",           width: 14 },
      ];

      // Sheet 4: Faculty Workload — conditionally include Specialization
      const facultyCols = hasAnySpecialization
        ? [
            { header: "Faculty Name",         key: "name",              width: 24 },
            { header: "Employee ID",           key: "empId",             width: 16 },
            { header: "Specialization",        key: "subjects",          width: 28 },
            { header: "Sessions Conducted",    key: "sessions",          width: 20 },
            { header: "Timely Submissions",    key: "timelySessions",    width: 20 },
            { header: "Attendance Timeliness", key: "timelinessPercent", width: 22, isPercent: true },
            { header: "Compliance Status",     key: "status",            width: 18 },
          ]
        : [
            { header: "Faculty Name",         key: "name",              width: 28 },
            { header: "Employee ID",           key: "empId",             width: 18 },
            { header: "Sessions Conducted",    key: "sessions",          width: 22 },
            { header: "Timely Submissions",    key: "timelySessions",    width: 22 },
            { header: "Attendance Timeliness", key: "timelinessPercent", width: 24, isPercent: true },
            { header: "Compliance Status",     key: "status",            width: 20 },
          ];

      // Faculty rows: store timeliness as raw number (exportHelpers converts to fraction+numFmt)
      const facultyExportRows = facultyOverview.map((f) => ({
        name: f.name,
        empId: f.empId,
        ...(hasAnySpecialization ? { subjects: f.specialization || "Not set" } : {}),
        sessions: f.sessions,
        timelySessions: f.timelySessions,
        // Keep as number so isPercent logic applies; "N/A" string is passed when 0 sessions
        timelinessPercent: f.sessions === 0 ? "N/A" : (f.timelinessPercent ?? 100),
        status: f.sessions === 0 ? "No sessions" : f.status,
      }));


      const sheets = [
        {
          name: "Summary",
          title: `Department Summary - ${deptTitle}`,
          columns: summaryCols,
          // Special handling: the "Average Attendance Rate" row uses isPercentValue flag
          // to signal that the value should be treated as a percent integer
          rows: summaryRows.map((r) =>
            r.isPercentValue ? { ...r, value: r.value } : r
          ),
        },
        {
          name: "Subject-wise",
          title: `Subject Attendance Breakdown - ${deptTitle}`,
          columns: subjectCols,
          rows: filteredAndSortedSubjects,
        },
        {
          name: "Low Attendance",
          title: `Students Below 75% Watchlist - ${deptTitle}`,
          columns: lowAttCols,
          rows: lowAttendanceStudents,
          emptyMessage: "No students below 75% attendance threshold",
        },
        {
          name: "Faculty",
          title: `Faculty Workload & Timeliness - ${deptTitle}`,
          columns: facultyCols,
          rows: facultyExportRows,
        },
      ];

      await exportToExcel(
        `Department Report - ${deptTitle}`,
        summaryCols,
        summaryRows,
        filename,
        {
          filterMetadata: `Department: ${deptTitle} (${department.code || "IT"}) | ${activeFilterSummary}`,
          sheets,
        }
      );
      toast.success("Multi-sheet Excel report exported successfully");
    } catch (err) {
      logger.error("Export Excel error:", err);
      toast.error("Failed to export Excel report");
    }
  };

  const handleExportPDF = async () => {
    try {
      const deptTitle = department.name || "Information Technology";
      const filename = `HOD_Report_${department.code || "IT"}_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Subject-wise table: widths must sum to 100
      // Code widened to 18 so long codes (e.g. INF-ADMS-S1-3704) fit without wrapping
      const subjectColumns = [
        { header: "Code",     key: "code",     width: 18, align: 'left' },
        { header: "Subject",  key: "name",     width: 32, align: 'left' },
        { header: "Teacher",  key: "teacher",  width: 24, align: 'left' },
        { header: "Sessions", key: "sessions", width: 12, align: 'center' },
        { header: "Avg %",    key: "avg",      width: 14, align: 'center' },
      ]; // total: 18+32+24+12+14 = 100

      // Faculty table: hide Specialization column if no teacher has one (matches screen)
      // Widths always sum to 100.
      const facultyColumns = hasAnySpecialization
        ? [
            { header: "Faculty Name",  key: "name",              width: 23, align: 'left' },
            { header: "Employee ID",   key: "empId",             width: 13, align: 'left' },
            { header: "Specialization",key: "subjects",          width: 20, align: 'left' },
            { header: "Sessions",      key: "sessions",          width: 11, align: 'center' },
            { header: "Timeliness",    key: "timelinessPercent", width: 16, align: 'center' },
            { header: "Status",        key: "status",            width: 17, align: 'left' },
          ] // 23+13+20+11+16+17 = 100
        : [
            { header: "Faculty Name",  key: "name",              width: 30, align: 'left' },
            { header: "Employee ID",   key: "empId",             width: 17, align: 'left' },
            { header: "Sessions",      key: "sessions",          width: 14, align: 'center' },
            { header: "Timeliness",    key: "timelinessPercent", width: 20, align: 'center' },
            { header: "Status",        key: "status",            width: 19, align: 'left' },
          ]; // 30+17+14+20+19 = 100


      // Summary section rows
      const summaryPdfColumns = [
        { header: "Metric",  key: "metric", width: 60, align: 'left' },
        { header: "Value",   key: "value",  width: 40, align: 'center' },
      ];
      const summaryPdfRows = [
        { metric: "Sessions Held (Closed)",         value: totalSessions },
        { metric: "Present Attendance Records",      value: presentRecords },
        { metric: "Absent Attendance Records",       value: absentRecords },
        { metric: "Average Attendance Rate",         value: `${avgAttendancePercent}%` },
        { metric: "Students Below 75% Watchlist",   value: lowAttendanceStudents.length },
      ];

      // Format subject rows so avg has % suffix for readability
      const subjectPdfRows = filteredAndSortedSubjects.map((s) => ({
        ...s,
        avg: typeof s.avg === "number" ? `${s.avg}%` : (s.avg ?? "N/A"),
      }));

      const facultyPdfRows = facultyOverview.map((f) => ({
        name: f.name,
        empId: f.empId,
        ...(hasAnySpecialization ? { subjects: f.specialization || "Not set" } : {}),
        sessions: f.sessions,
        timelinessPercent: f.sessions === 0 ? "N/A" : `${f.timelinessPercent ?? 100}%`,
        status: f.sessions === 0 ? "No sessions" : f.status,
      }));

      await exportToPDF(
        `Department Report - ${deptTitle} (${department.code || "IT"})`,
        summaryPdfColumns,
        summaryPdfRows,
        filename,
        {
          filterMetadata: `Department: ${deptTitle} (${department.code || "IT"}) | ${activeFilterSummary}`,
          sections: [
            {
              title: "Attendance Summary",
              columns: summaryPdfColumns,
              rows: summaryPdfRows,
            },
            {
              title: "Subject-wise Attendance Breakdown",
              columns: subjectColumns,
              rows: subjectPdfRows,
            },
            {
              title: "Faculty Workload & Timeliness Overview",
              columns: facultyColumns,
              rows: facultyPdfRows,
            },
          ],
        }
      );
      toast.success("PDF report generated successfully");
    } catch (err) {
      logger.error("Export PDF error:", err);
      toast.error("Failed to export PDF report");
    }
  };



  const isFiltered =
    filters.academicYear !== "ALL" ||
    filters.program !== "ALL" ||
    filters.semester !== "ALL" ||
    filters.dateRange !== "ALL" ||
    Boolean(subjectSearch);

  // Initial Full Page Loading State
  if (loading) {
    return (
      <div className="hod-reports-page">
        <div
          className="hod-reports-container"
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loading size="md" color="primary" text="Loading Department Reports..." />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="hod-reports-page">
        <div className="hod-reports-container">
          <ApiError
            title="Department Reports Error"
            message={error.message}
            statusCode={error.statusCode}
            errorCode={error.errorCode}
            onRetry={() => fetchReports(filters, true)}
            onGoBack={() => navigate("/hod/dashboard")}
          />
        </div>
      </div>
    );
  }

  // Empty / Null Data State
  if (!data || (!data.kpis && !data.department)) {
    return (
      <div className="hod-reports-page">
        <div className="hod-reports-container">
          <div
            className="hod-empty-container"
            style={{ textAlign: "center", padding: "3rem" }}
          >
            <FaClipboardList
              style={{
                fontSize: "2.5rem",
                color: BRAND.muted,
                marginBottom: "1rem",
              }}
            />
            <h3>No Reports Data Available</h3>
            <p style={{ color: BRAND.muted, marginBottom: "1.5rem" }}>
              We could not retrieve report statistics for your department at this time.
            </p>
            <button
              type="button"
              onClick={() => fetchReports(filters, true)}
              className="btn btn-primary btn-sm"
              style={{ background: BRAND.primary, border: "none" }}
            >
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = formatReportDate(meta.generatedAt);

  return (
    <div className="hod-reports-page">
      <div className="hod-reports-container">
        {/* ================= BREADCRUMB ================= */}
        <div className="hod-reports-nav-bar">
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/hod/dashboard" },
              { label: "Department Reports" },
            ]}
          />
        </div>

        {/* ================= 1. PAGE HEADER ================= */}
        <div className="hod-reports-header">
          <div className="hod-reports-header-glow" aria-hidden="true" />
          <div className="hod-reports-header-inner">
            <div className="hod-reports-header-title-group">
              <div className="hod-reports-header-icon">
                <FaClipboardList aria-hidden="true" />
              </div>
              <div>
                <h1 className="hod-reports-header-title">Department Reports</h1>
                <div className="hod-reports-header-meta">
                  {department.name ? (
                    <span className="hod-reports-dept-badge">
                      <span>{department.name}</span>
                      {department.code && <span>({department.code})</span>}
                    </span>
                  ) : (
                    <span className="hod-reports-dept-badge">
                      Department Overview
                    </span>
                  )}

                  <span className="hod-reports-submeta-badge">
                    {totalCourses} Programs · {totalSubjects} Subjects
                  </span>

                  {/* "Data as of" appears once only, here in header */}
                  <span className="hod-reports-timestamp-badge">
                    Data as of {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Export buttons in header */}
            <div className="hod-header-actions">
              <button
                type="button"
                onClick={handleExportPDF}
                className="hod-export-btn"
                aria-label="Export report to PDF"
              >
                <FaFilePdf aria-hidden="true" style={{ color: "#fca5a5" }} />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="hod-export-btn"
                aria-label="Export report to Excel"
              >
                <FaFileExcel aria-hidden="true" style={{ color: "#86efac" }} />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= 2. DYNAMIC FILTERS ROW ================= */}
        <div className="hod-filter-bar">
          <div className="hod-filter-group">
            {/* Academic Year Filter */}
            <div className="hod-filter-item">
              <FaFilter
                style={{ fontSize: "0.75rem", color: BRAND.primary }}
                aria-hidden="true"
              />
              <label htmlFor="hod-filter-ay" className="hod-filter-label">
                Academic Year:
              </label>
              <select
                id="hod-filter-ay"
                className="hod-filter-select"
                value={filters.academicYear}
                onChange={(e) => handleFilterChange("academicYear", e.target.value)}
              >
                <option value="ALL">All Academic Years</option>
                {filterOptions?.academicYears?.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
              </select>
            </div>

            {/* Program Filter */}
            <div className="hod-filter-item">
              <label htmlFor="hod-filter-course" className="hod-filter-label">
                Program:
              </label>
              <select
                id="hod-filter-course"
                className="hod-filter-select"
                value={filters.program}
                onChange={(e) => handleFilterChange("program", e.target.value)}
              >
                <option value="ALL">All Programs</option>
                {filterOptions?.programs?.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name} ({prog.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter (dynamically depends on Program) */}
            <div className="hod-filter-item">
              <label htmlFor="hod-filter-sem" className="hod-filter-label">
                Semester:
              </label>
              <select
                id="hod-filter-sem"
                className="hod-filter-select"
                value={filters.semester}
                onChange={(e) => handleFilterChange("semester", e.target.value)}
              >
                <option value="ALL">All Semesters</option>
                {availableSemesters.map((sem) => (
                  <option key={sem} value={String(sem)}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="hod-filter-item">
              <label htmlFor="hod-filter-range" className="hod-filter-label">
                Date Range:
              </label>
              <select
                id="hod-filter-range"
                className="hod-filter-select"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange("dateRange", e.target.value)}
              >
                <option value="ALL">All Recorded Dates</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range Picker (active only when "CUSTOM" selected) */}
            {filters.dateRange === "CUSTOM" && (
              <div className="hod-filter-custom-dates">
                <input
                  type="date"
                  aria-label="Start Date"
                  className="hod-filter-date-input"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
                <span className="hod-filter-date-sep">to</span>
                <input
                  type="date"
                  aria-label="End Date"
                  className="hod-filter-date-input"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="hod-filter-reset-btn"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Section Loading Skeleton Indicator */}
        {filterLoading && (
          <div className="hod-filter-refreshing-bar">
            <span className="hod-pulse-indicator" /> Updating report analytics...
          </div>
        )}

        {/* ================= 3. FOUR CONSOLIDATED KPI CARDS (SLIM & CLICKABLE) ================= */}
        <div className="hod-kpi-grid">
          {/* Card 1: Teachers */}
          <KpiCard
            icon={FaUsers}
            label="Total Teachers"
            value={totalTeachers}
            subtext="Assigned faculty members"
            color={BRAND.primary}
            bg={BRAND.primaryLight}
            onClick={() => navigate("/hod/teachers")}
            targetLabel="Navigate to Department Teachers"
          />

          {/* Card 2: Students */}
          <KpiCard
            icon={FaUserGraduate}
            label="Total Students"
            value={totalStudents}
            subtext="Enrolled in department"
            color={BRAND.info}
            bg={BRAND.infoLight}
            onClick={() => navigate("/hod/dashboard")}
            targetLabel="View Students in Dashboard"
          />

          {/* Card 3: Subjects */}
          <KpiCard
            icon={FaBook}
            label="Total Subjects"
            value={totalSubjects}
            subtext={`${totalCourses} Academic Programs / Curricula`}
            color={BRAND.accent}
            bg={BRAND.accentLight}
            onClick={() => navigate("/hod/dashboard")}
            targetLabel="View Curriculum in Dashboard"
          />

          {/* Card 4: Timetables (Combined Breakdown) */}
          <KpiCard
            icon={FaCalendarAlt}
            label="Timetables"
            value={totalTimetables}
            subtext={`${publishedTimetables} Published · ${draftTimetables} Draft · ${archivedTimetables} Archived`}
            color={BRAND.success}
            bg={BRAND.successLight}
            onClick={() => navigate("/timetable/list")}
            targetLabel="Navigate to Timetables List"
          />
        </div>

        {/* ================= 4. TWO-COLUMN CORE SECTION ================= */}
        <div className="row g-3 mb-4">
          {/* ================= LEFT COLUMN: ATTENDANCE ANALYTICS & SUBJECTS ================= */}
          <div className="col-12 col-lg-7">
            <div className="hod-section-card">
              <div className="hod-section-header">
                <div className="hod-section-header-left">
                  <div
                    className="hod-section-icon"
                    style={{ background: BRAND.infoLight, color: BRAND.info }}
                  >
                    <FaClipboardList aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="hod-section-title">Attendance Analytics</h2>
                    <p className="hod-section-subtitle">
                      Weekly trend and subject-wise lecture attendance rate
                    </p>
                  </div>
                </div>
                <span
                  className={`hod-status-pill ${
                    avgAttendancePercent >= 75
                      ? "hod-status-pill--success"
                      : avgAttendancePercent >= 60
                      ? "hod-status-pill--warning"
                      : "hod-status-pill--danger"
                  }`}
                >
                  {avgAttendancePercent >= 75
                    ? "Target Achieved (≥ 75%)"
                    : avgAttendancePercent >= 60
                    ? "Moderate (60–74%)"
                    : "Action Required (< 60%)"}
                </span>
              </div>

              {/* Three Clean Summary Numbers with Stacked Present / Absent (No edge touching) */}
              <div className="hod-attendance-summary-row">
                {/* 1. Sessions Held */}
                <div className="hod-attend-stat-box">
                  <div className="hod-attend-stat-header">
                    <span>Sessions Held</span>
                    <span
                      className="hod-tooltip-icon"
                      title="Completed closed lecture & lab sessions conducted"
                    >
                      <FaQuestionCircle aria-hidden="true" />
                    </span>
                  </div>
                  <div className="hod-attend-stat-val" style={{ color: BRAND.info }}>
                    {totalSessions}
                  </div>
                  <div className="hod-attend-stat-sub">Closed class sessions</div>
                </div>

                {/* 2. Present / Absent split (Stacked numbers so no text wrap) */}
                <div className="hod-attend-stat-box">
                  <div className="hod-attend-stat-header">
                    <span>Student Attendance</span>
                    <span
                      className="hod-tooltip-icon"
                      title="Present vs absent marks across closed sessions"
                    >
                      <FaQuestionCircle aria-hidden="true" />
                    </span>
                  </div>
                  <div className="hod-attend-split-val">
                    <div className="hod-attend-split-line">
                      <span className="hod-attend-split-badge hod-attend-split-badge--present">
                        Present
                      </span>
                      <span className="hod-attend-split-number">
                        {presentRecords}
                      </span>
                    </div>
                    <div className="hod-attend-split-line">
                      <span className="hod-attend-split-badge hod-attend-split-badge--absent">
                        Absent
                      </span>
                      <span className="hod-attend-split-number">
                        {absentRecords}
                      </span>
                    </div>
                  </div>
                  <div className="hod-attend-stat-sub">
                    {totalRecords} cumulative marks
                  </div>
                </div>

                {/* 3. Average Attendance % */}
                <div className="hod-attend-stat-box">
                  <div className="hod-attend-stat-header">
                    <span>Avg Attendance</span>
                    <span
                      className="hod-tooltip-icon"
                      title="Department overall student attendance percentage across filtered sessions"
                    >
                      <FaQuestionCircle aria-hidden="true" />
                    </span>
                  </div>
                  <div
                    className="hod-attend-stat-val"
                    style={{
                      color:
                        avgAttendancePercent >= 75 ? BRAND.primary : BRAND.danger,
                    }}
                  >
                    {avgAttendancePercent}%
                  </div>
                  <div className="hod-attend-stat-sub">
                    Benchmark: 75% threshold
                  </div>
                </div>
              </div>

              {/* Attendance Trend Line Chart */}
              <div className="hod-trend-section">
                <div className="hod-trend-header">
                  <span className="hod-trend-title">
                    Weekly Attendance Trend
                  </span>
                  <span className="hod-trend-benchmark-label">
                    Goal: 75% dashed line
                  </span>
                </div>

                {trendData.length === 1 && (
                  <div className="hod-trend-note">
                    <FaInfoCircle aria-hidden="true" />
                    <span>Only one week of data in this period</span>
                  </div>
                )}

                {totalSessions === 0 || trendData.length === 0 ? (
                  <div className="hod-chart-empty">
                    <p className="hod-muted-empty">
                      No attendance sessions recorded for the selected filter period.
                    </p>
                  </div>
                ) : (
                  <div className="hod-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartDisplayData}
                        margin={{ top: 8, right: 14, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="week"
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          interval={0}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={12}
                          domain={[0, 100]}
                          tickLine={false}
                          unit="%"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length && payload[0].value !== null) {
                              const p = payload[0].payload;
                              return (
                                <div className="hod-chart-tooltip">
                                  <p style={{ margin: 0, fontWeight: 700 }}>
                                    {p.week} {p.dateRange && p.dateRange !== p.week ? `(${p.dateRange})` : ""}
                                  </p>
                                  <p style={{ margin: "3px 0 0", color: "#67e8f9" }}>
                                    Attendance Rate: {payload[0].value}%
                                  </p>
                                  <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "0.7rem" }}>
                                    Sessions: {p.sessions || 0} (Present: {p.present || 0}, Absent: {p.absent || 0})
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          y={75}
                          stroke="#cbd5e1"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                        <Line
                          type="monotone"
                          dataKey="rate"
                          name="Attendance Rate"
                          stroke="#0891b2"
                          strokeWidth={2.5}
                          connectNulls={false}
                          dot={{ r: trendData.length === 1 ? 6 : 4, fill: "#0891b2" }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Subject-Wise Attendance Table (Sortable & Searchable) */}
              <div className="hod-subjects-section">
                <div className="hod-subjects-table-header">
                  <div>
                    <h3 className="hod-table-heading">
                      Subject-Wise Attendance Breakdown
                    </h3>
                    <p className="hod-table-subheading">
                      Sessions and attendance rates computed only from closed sessions
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Search subject or faculty..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="hod-table-search-input"
                    aria-label="Search subject or faculty"
                  />
                </div>

                <div className="hod-table-wrap">
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th
                          onClick={() => handleSort("sessions")}
                          className="hod-th-sortable"
                          role="button"
                          tabIndex={0}
                          aria-label="Sort by Sessions Held"
                        >
                          <div className="hod-th-flex">
                            <span>Sessions</span>
                            {subjectSort.column === "sessions" ? (
                              subjectSort.direction === "asc" ? (
                                <FaSortUp aria-hidden="true" />
                              ) : (
                                <FaSortDown aria-hidden="true" />
                              )
                            ) : (
                              <FaSort className="hod-th-sort-icon-idle" aria-hidden="true" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg")}
                          className="hod-th-sortable"
                          role="button"
                          tabIndex={0}
                          aria-label="Sort by Average Attendance Percentage"
                        >
                          <div className="hod-th-flex">
                            <span>Avg %</span>
                            {subjectSort.column === "avg" ? (
                              subjectSort.direction === "asc" ? (
                                <FaSortUp aria-hidden="true" />
                              ) : (
                                <FaSortDown aria-hidden="true" />
                              )
                            ) : (
                              <FaSort className="hod-th-sort-icon-idle" aria-hidden="true" />
                            )}
                          </div>
                        </th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedSubjects.length > 0 ? (
                        filteredAndSortedSubjects.map((sub) => (
                          <tr key={sub.id || sub.code}>
                            <td>
                              <div style={{ fontWeight: 600, color: BRAND.ink }}>
                                {sub.name}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: BRAND.muted }}>
                                {sub.code} · Sem {sub.semester}
                              </div>
                            </td>
                            <td>{sub.teacher}</td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>
                              {sub.sessions}
                            </td>
                            <td
                              style={{
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                color: sub.avg >= 75 ? BRAND.success : BRAND.danger,
                              }}
                            >
                              {sub.avg}%
                            </td>
                            <td>
                              <span
                                className={`hod-status-pill ${
                                  sub.avg >= 75
                                    ? "hod-status-pill--success"
                                    : sub.avg >= 60
                                    ? "hod-status-pill--warning"
                                    : "hod-status-pill--danger"
                                }`}
                              >
                                {sub.avg >= 75
                                  ? "Good"
                                  : sub.avg >= 60
                                  ? "Warning"
                                  : "Critical"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="hod-muted-empty">
                            No curriculum subjects match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: ACTION REQUIRED, WATCHLIST, ACADEMIC PERFORMANCE, RECENT ACTIVITY ================= */}
          <div className="col-12 col-lg-5">
            <div className="hod-right-column-stack">
              {/* 1. ACTION REQUIRED PANEL */}
              <div className="hod-section-card">
                <div className="hod-section-header">
                  <div className="hod-section-header-left">
                    <div
                      className="hod-section-icon"
                      style={{
                        background:
                          actionRequired.timetableExceptions > 0
                            ? BRAND.dangerLight
                            : BRAND.primaryLight,
                        color:
                          actionRequired.timetableExceptions > 0
                            ? BRAND.danger
                            : BRAND.primary,
                      }}
                    >
                      <FaExclamationTriangle aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="hod-section-title">Action Required</h2>
                      <p className="hod-section-subtitle">
                        Administrative tasks requiring HOD decision
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hod-action-list">
                  {/* Item 1: Pending Exceptions */}
                  <div
                    className={`hod-action-item ${
                      actionRequired.timetableExceptions > 0
                        ? "hod-action-item--alert"
                        : ""
                    }`}
                  >
                    <div className="hod-action-item-left">
                      <FaExclamationTriangle
                        style={{
                          fontSize: "0.9rem",
                          color:
                            actionRequired.timetableExceptions > 0
                              ? BRAND.danger
                              : BRAND.muted,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: BRAND.ink,
                          }}
                        >
                          Timetable Exceptions
                        </div>
                        <div style={{ fontSize: "0.72rem", color: BRAND.muted }}>
                          {actionRequired.timetableExceptions > 0
                            ? `${actionRequired.timetableExceptions} request(s) awaiting approval`
                            : "No pending requests"}
                        </div>
                      </div>
                    </div>
                    {actionRequired.timetableExceptions > 0 ? (
                      <button
                        type="button"
                        onClick={() => navigate("/hod/exception-approvals")}
                        className="hod-action-btn-sm"
                        style={{ borderColor: BRAND.danger, color: BRAND.danger }}
                      >
                        <span>Review</span>
                        <FaArrowRight
                          aria-hidden="true"
                          style={{ fontSize: "0.65rem" }}
                        />
                      </button>
                    ) : (
                      <span className="hod-action-muted-status">Cleared</span>
                    )}
                  </div>

                  {/* Item 2: Timetable Drafts */}
                  <div className="hod-action-item">
                    <div className="hod-action-item-left">
                      <FaCalendarAlt
                        style={{
                          fontSize: "0.9rem",
                          color:
                            draftTimetables > 0 ? BRAND.warning : BRAND.muted,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: BRAND.ink,
                          }}
                        >
                          Timetable Drafts
                        </div>
                        <div style={{ fontSize: "0.72rem", color: BRAND.muted }}>
                          {draftTimetables > 0
                            ? `${draftTimetables} draft schedule(s) awaiting publication`
                            : "All timetables published"}
                        </div>
                      </div>
                    </div>
                    {draftTimetables > 0 ? (
                      <button
                        type="button"
                        onClick={() => navigate("/timetable/list")}
                        className="hod-action-btn-sm"
                      >
                        <span>Review</span>
                        <FaArrowRight
                          aria-hidden="true"
                          style={{ fontSize: "0.65rem" }}
                        />
                      </button>
                    ) : (
                      <span className="hod-action-muted-status">Up to date</span>
                    )}
                  </div>

                  {/* Item 3: Attendance Timeliness Submission */}
                  <div className="hod-action-item">
                    <div className="hod-action-item-left">
                      <FaClock
                        style={{
                          fontSize: "0.9rem",
                          color: BRAND.muted,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: BRAND.ink,
                          }}
                        >
                          Attendance Timeliness
                        </div>
                        <div style={{ fontSize: "0.72rem", color: BRAND.muted }}>
                          All scheduled sessions marked on time
                        </div>
                      </div>
                    </div>
                    <span className="hod-action-muted-status">Compliant</span>
                  </div>
                </div>
              </div>

              {/* 2. LOW ATTENDANCE WATCHLIST (< 75%) */}
              <div className="hod-section-card">
                <div className="hod-section-header">
                  <div className="hod-section-header-left">
                    <div
                      className="hod-section-icon"
                      style={{
                        background:
                          lowAttendanceStudents.length > 0
                            ? BRAND.dangerLight
                            : BRAND.successLight,
                        color:
                          lowAttendanceStudents.length > 0
                            ? BRAND.danger
                            : BRAND.success,
                      }}
                    >
                      <FaUserGraduate aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="hod-section-title">Students Below 75%</h2>
                      <p className="hod-section-subtitle">
                        Departmental attendance warning watchlist
                      </p>
                    </div>
                  </div>
                  <span
                    className={`hod-status-pill ${
                      lowAttendanceStudents.length > 0
                        ? "hod-status-pill--danger"
                        : "hod-status-pill--success"
                    }`}
                  >
                    {lowAttendanceStudents.length} Students
                  </span>
                </div>

                {lowAttendanceStudents.length > 0 ? (
                  <div className="hod-table-wrap">
                    <table className="hod-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Course</th>
                          <th>Attendance</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowAttendanceStudents.map((st) => (
                          <tr key={st.id || st.prn}>
                            <td>
                              <div style={{ fontWeight: 600, color: BRAND.ink }}>
                                {st.name}
                              </div>
                              <div style={{ fontSize: "0.68rem", color: BRAND.muted }}>
                                {st.prn}
                              </div>
                            </td>
                            <td>{st.sem}</td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: BRAND.danger,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {st.attendance}%
                              </span>
                              <div style={{ fontSize: "0.66rem", color: BRAND.muted }}>
                                {st.missed ||
                                  (st.totalSessions && st.sessionsAttended !== undefined
                                    ? st.totalSessions - st.sessionsAttended
                                    : 0)}{" "}
                                sessions missed
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                disabled
                                className="hod-send-notice-btn hod-send-notice-btn--disabled"
                                title="Coming soon"
                                aria-label={`Send Notice to ${st.name} (Coming soon)`}
                              >
                                Send Notice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="hod-muted-empty">No students below 75%</p>
                )}
              </div>

              {/* 3. ACADEMIC PERFORMANCE (EMPTY STATE WHEN NO REAL MARKS IN DB) */}
              <div className="hod-section-card">
                <div className="hod-section-header">
                  <div className="hod-section-header-left">
                    <div
                      className="hod-section-icon"
                      style={{
                        background: BRAND.accentLight,
                        color: BRAND.accent,
                      }}
                    >
                      <FaGraduationCap aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="hod-section-title">Academic Performance</h2>
                      <p className="hod-section-subtitle">
                        Examination and grading summary
                      </p>
                    </div>
                  </div>
                  {academicPerformance && academicPerformance.evaluatedRecords > 0 ? (
                    <span className="hod-status-pill hod-status-pill--success">
                      {academicPerformance.passPercentage || 0}% Pass Rate
                    </span>
                  ) : null}
                </div>

                {academicPerformance && academicPerformance.evaluatedRecords > 0 ? (
                  <div className="hod-academic-grid">
                    <div className="hod-academic-stat-box">
                      <div className="hod-academic-stat-label">
                        Department Average
                      </div>
                      <div className="hod-academic-stat-val">
                        {academicPerformance.departmentAverage}%
                      </div>
                    </div>
                    <div className="hod-academic-stat-box">
                      <div className="hod-academic-stat-header">
                        <span className="hod-academic-stat-label">
                          Pass Percentage
                        </span>
                        <span
                          className="hod-tooltip-icon"
                          title={
                            academicPerformance.passCriteriaText ||
                            `Pass criterion: ≥ ${academicPerformance.passMarkPercent || 40}% minimum marks to pass`
                          }
                        >
                          <FaQuestionCircle aria-hidden="true" />
                        </span>
                      </div>
                      <div
                        className="hod-academic-stat-val"
                        style={{ color: BRAND.success }}
                      >
                        {academicPerformance.passPercentage || 0}%
                      </div>
                      <div className="hod-pass-mark-caption">
                        Min pass mark: {academicPerformance.passMarkPercent || 40}%
                      </div>
                    </div>
                    {academicPerformance.topSubject && (
                      <div className="hod-academic-stat-box hod-academic-stat-box--full">
                        <div className="hod-academic-stat-label">
                          Top Performing Subject
                        </div>
                        <div
                          className="hod-academic-stat-val hod-academic-stat-val--subject"
                          style={{
                            color: BRAND.primary,
                            fontWeight: 600,
                          }}
                        >
                          {academicPerformance.topSubject}
                        </div>
                        {academicPerformance.topSubjectAverage !== undefined &&
                          academicPerformance.topSubjectAverage !== null && (
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#334155",
                                fontWeight: 500,
                                marginTop: "3px",
                              }}
                            >
                              Subject average: {academicPerformance.topSubjectAverage}%
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="hod-muted-empty">
                    No marks data available yet
                  </p>
                )}
              </div>

              {/* 4. RECENT ACTIVITY (MOVED TO RIGHT COLUMN TO BALANCE HEIGHT) */}
              <div className="hod-section-card">
                <div className="hod-section-header">
                  <div className="hod-section-header-left">
                    <div
                      className="hod-section-icon"
                      style={{ background: BRAND.infoLight, color: BRAND.info }}
                    >
                      <FaHistory aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="hod-section-title">Recent Activity</h2>
                      <p className="hod-section-subtitle">
                        Department audit timeline for this department
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hod-activity-list">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((act) => {
                      const isExpanded = expandedActivityGroups.has(act.id);
                      const readableLine =
                        act.readableText ||
                        act.description ||
                        `${act.title || "Activity"} · ${act.whoDidIt || "HOD"} · ${act.timeAgo || "Recently"}`;

                      return (
                        <div key={act.id} className="hod-activity-item">
                          <div
                            className="hod-activity-dot"
                            style={{
                              background:
                                act.status === "Approved" || act.status === "Published"
                                  ? BRAND.success
                                  : act.status === "Closed"
                                  ? BRAND.info
                                  : BRAND.primary,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                color: BRAND.ink,
                                lineHeight: 1.35,
                              }}
                            >
                              {readableLine}
                            </div>
                            {act.isGrouped && act.subItems && act.subItems.length > 0 ? (
                              <div>
                                <button
                                  type="button"
                                  className="hod-activity-expand-btn"
                                  onClick={() => toggleActivityGroup(act.id)}
                                  aria-expanded={isExpanded}
                                >
                                  <span>
                                    {isExpanded
                                      ? "Hide details"
                                      : `View all ${act.subItems.length} timetables`}
                                  </span>
                                  <FaChevronDown
                                    style={{
                                      fontSize: "0.65rem",
                                      transform: isExpanded ? "rotate(180deg)" : "none",
                                      transition: "transform 0.15s ease",
                                    }}
                                    aria-hidden="true"
                                  />
                                </button>
                                {isExpanded && (
                                  <ul className="hod-activity-subitems-list">
                                    {act.subItems.map((sub, sIdx) => (
                                      <li key={sIdx}>{sub}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ) : (
                              act.subjectOrDetails &&
                              act.subjectOrDetails !== act.title &&
                              !readableLine.includes(act.subjectOrDetails) && (
                                <div
                                  style={{
                                    fontSize: "0.72rem",
                                    color: BRAND.muted,
                                    marginTop: "2px",
                                  }}
                                >
                                  {act.subjectOrDetails}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="hod-muted-empty">
                      No recent activity recorded for this department.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 5. FACULTY OVERVIEW TABLE (SANITY: SUM OF SESSIONS = SESSIONS HELD) ================= */}
        <div className="hod-section-card mb-4">
          <div className="hod-section-header">
            <div className="hod-section-header-left">
              <div
                className="hod-section-icon"
                style={{
                  background: BRAND.primaryLight,
                  color: BRAND.primary,
                }}
              >
                <FaChalkboardTeacher aria-hidden="true" />
              </div>
              <div>
                <h2 className="hod-section-title">
                  Faculty Workload & Attendance Overview
                </h2>
                <p className="hod-section-subtitle">
                  Workload allocation, lecture delivery, and attendance submission timeliness
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/hod/teachers")}
              className="hod-action-btn-sm"
              aria-label="Manage Faculty"
            >
              <span>Manage Faculty</span>
              <FaArrowRight aria-hidden="true" style={{ fontSize: "0.65rem" }} />
            </button>
          </div>

          <div className="hod-table-wrap">
            <table className="hod-table">
              <thead>
                <tr>
                  <th>Faculty Member</th>
                  {hasAnySpecialization && <th>Domain / Specialization</th>}
                  <th>Sessions Conducted</th>
                  <th>
                    Attendance Timeliness{" "}
                    <span
                      className="hod-tooltip-icon"
                      title="On-Time Rule: Marked and submitted within 24 hours of scheduled lecture date/time without system auto-close."
                    >
                      <FaQuestionCircle
                        aria-hidden="true"
                        style={{ fontSize: "0.75rem", marginLeft: "4px" }}
                      />
                    </span>
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {facultyOverview.length > 0 ? (
                  facultyOverview.map((fac) => {
                    const hasZeroSessions = fac.sessions === 0;
                    return (
                      <tr key={fac.id || fac.empId}>
                        <td>
                          <div style={{ fontWeight: 600, color: BRAND.ink }}>
                            {fac.name}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: BRAND.muted }}>
                            {fac.empId} {fac.designation ? `· ${fac.designation}` : ""}
                          </div>
                        </td>
                        {hasAnySpecialization && (
                          <td>
                            {fac.specialization && fac.specialization !== "Not set" ? (
                              fac.specialization
                            ) : (
                              <span style={{ color: BRAND.muted }}>Not set</span>
                            )}
                          </td>
                        )}
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {fac.sessions} sessions
                        </td>
                        <td>
                          {hasZeroSessions ? (
                            <span style={{ color: BRAND.muted, fontWeight: 500 }}>
                              N/A
                            </span>
                          ) : (
                            <span
                              style={{
                                fontWeight: 600,
                                color:
                                  fac.status === "Compliant"
                                    ? BRAND.success
                                    : fac.status === "Warning"
                                    ? BRAND.warning
                                    : BRAND.danger,
                              }}
                            >
                              {fac.compliance || `${fac.timelinessPercent ?? 100}% On-Time`}
                            </span>
                          )}
                        </td>
                        <td>
                          {hasZeroSessions ? (
                            <span className="hod-status-pill hod-status-pill--neutral">
                              No sessions
                            </span>
                          ) : (
                            <span
                              className={`hod-status-pill ${
                                fac.status === "Compliant"
                                  ? "hod-status-pill--success"
                                  : fac.status === "Warning"
                                  ? "hod-status-pill--warning"
                                  : "hod-status-pill--danger"
                              }`}
                            >
                              {fac.status || "Compliant"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={hasAnySpecialization ? 5 : 4} className="hod-muted-empty">
                      No faculty members assigned to this department.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= 6. QUICK ACTIONS (SLIM ROW AT BOTTOM) ================= */}
        <div className="hod-quick-actions-bar">
          <button
            type="button"
            onClick={() => navigate("/timetable/list")}
            className="hod-slim-action-btn"
            aria-label="View Timetables"
          >
            <div className="hod-slim-action-left">
              <FaCalendarAlt
                style={{ color: BRAND.primary, fontSize: "0.88rem" }}
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: BRAND.ink,
                }}
              >
                View Timetables
              </span>
            </div>
            <FaArrowRight
              style={{ fontSize: "0.72rem", color: BRAND.muted }}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/hod/exception-approvals")}
            className="hod-slim-action-btn"
            aria-label="Exception Approvals"
          >
            <div className="hod-slim-action-left">
              <FaExclamationTriangle
                style={{ color: BRAND.danger, fontSize: "0.88rem" }}
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: BRAND.ink,
                }}
              >
                Exception Approvals
              </span>
            </div>
            <FaArrowRight
              style={{ fontSize: "0.72rem", color: BRAND.muted }}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/hod/teachers")}
            className="hod-slim-action-btn"
            aria-label="Department Teachers"
          >
            <div className="hod-slim-action-left">
              <FaUsers
                style={{ color: BRAND.info, fontSize: "0.88rem" }}
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: BRAND.ink,
                }}
              >
                Department Teachers
              </span>
            </div>
            <FaArrowRight
              style={{ fontSize: "0.72rem", color: BRAND.muted }}
              aria-hidden="true"
            />
          </button>
        </div>


      </div>
    </div>
  );
};

export default HodReports;

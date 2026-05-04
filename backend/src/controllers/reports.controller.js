const reportsService = require("../services/reports.service");

/**
 * COMBINED DASHBOARD REPORTS (ALL IN ONE)
 */
exports.allDashboardReports = async (req, res) => {
  try {
    const { role, college_id } = req.user;

    if (role !== "COLLEGE_ADMIN" && role !== "PRINCIPAL") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fetch all reports in parallel
    const [
      admissionSummary,
      paymentSummary,
      studentPaymentStatus,
      attendanceSummary,
      lowAttendanceStudents
    ] = await Promise.all([
      reportsService.admissionSummary(college_id),
      reportsService.paymentSummary(college_id),
      reportsService.studentPaymentStatus(college_id),
      reportsService.attendanceSummary(college_id),
      reportsService.studentAttendanceReport(college_id, 75)
    ]);

    res.json({
      success: true,
      data: {
        admissionSummary,
        paymentSummary,
        studentPaymentStatus: studentPaymentStatus || [],
        attendanceSummary,
        lowAttendanceStudents: lowAttendanceStudents || []
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard reports:", error);
    res.status(500).json({ message: "Failed to fetch dashboard reports" });
  }
};

/**
 * ADMISSION SUMMARY
 */
exports.admissionSummary = async (req, res) => {
  try {
    const { role, college_id } = req.user;

    let data;

    if (role === "SUPER_ADMIN") {
      data = await reportsService.admissionSummaryAll();
    } 
    else if (role === "COLLEGE_ADMIN" || role === "PRINCIPAL" || role === "TEACHER") {
      data = await reportsService.admissionSummary(college_id);
    } 
    else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch admission summary" });
  }
};


/**
 * COURSE-WISE ADMISSIONS
 */
exports.courseWiseAdmissions = async (req, res) => {
  try {
    const { role, college_id } = req.user;

    if (role === "SUPER_ADMIN") {
      return res.json(await reportsService.courseWiseAdmissionsAll());
    }

    if (role === "COLLEGE_ADMIN" || role === "PRINCIPAL") {
      return res.json(await reportsService.courseWiseAdmissions(college_id));
    }

    res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch course-wise admissions" });
  }
};



/**
 * PAYMENT SUMMARY
 */
exports.paymentSummary = async (req, res) => {
  try {
    const { role, college_id } = req.user;

    if (role === "SUPER_ADMIN") {
      return res.json(await reportsService.paymentSummaryAll());
    }

    if (role === "COLLEGE_ADMIN" || role === "PRINCIPAL" || role === "ACCOUNTANT") {
      return res.json(await reportsService.paymentSummary(college_id));
    }

    res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch payment summary" });
  }
};


/**
 * STUDENT PAYMENT STATUS
 */
exports.studentPaymentStatus = async (req, res) => {
  try {
    const { role, college_id } = req.user;
    const status = req.query.status;

    if (role === "SUPER_ADMIN") {
      return res.json(await reportsService.studentPaymentStatusAll(status));
    }

    if (role === "COLLEGE_ADMIN" || role === "PRINCIPAL" || role === "ACCOUNTANT") {
      return res.json(await reportsService.studentPaymentStatus(college_id, status));
    }

    res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch student payment status" });
  }
};


/**
 * ATTENDANCE SUMMARY
 */
exports.attendanceSummary = async (req, res) => {
  try {
    const { role, college_id } = req.user;

    if (role === "SUPER_ADMIN") {
      return res.json(await reportsService.attendanceSummaryAll());
    }

    if (role === "COLLEGE_ADMIN" || role === "TEACHER" || role === "PRINCIPAL") {
      return res.json(await reportsService.attendanceSummary(college_id));
    }

    res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch attendance summary" });
  }
};


/**
 * STUDENT ATTENDANCE REPORT (LOW ATTENDANCE)
 */
exports.studentAttendanceReport = async (req, res) => {
  try {
    const { role, college_id } = req.user;
    const minPercentage = Number(req.query.minPercentage || 75);

    if (role === "SUPER_ADMIN") {
      return res.json(
        await reportsService.studentAttendanceReportAll(minPercentage)
      );
    }

    if (role === "COLLEGE_ADMIN" || role === "TEACHER" || role === "PRINCIPAL") {
      return res.json(
        await reportsService.studentAttendanceReport(college_id, minPercentage)
      );
    }

    res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch student attendance report" });
  }
};

/**
 * LOW ATTENDANCE STUDENTS (for export)
 */
exports.lowAttendanceStudents = async (req, res) => {
  try {
    const { role, college_id } = req.user;
    const minPercentage = Number(req.query.minPercentage || 75);

    if (role === "COLLEGE_ADMIN" || role === "TEACHER" || role === "PRINCIPAL") {
      return res.json(
        await reportsService.studentAttendanceReport(college_id, minPercentage)
      );
    }

    res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch low attendance students" });
  }
};

/* ===============================
   ADVANCED PAYMENT REPORTING (ACCOUNTANT FEATURES)
   ============================== */

/**
 * PAYMENT SUMMARY WITH DATE RANGE FILTERING
 */
exports.getPaymentSummaryWithFilters = async (req, res) => {
  try {
    const { role, college_id } = req.user;
    const { startDate, endDate } = req.query;

    if (!["COLLEGE_ADMIN", "ACCOUNTANT", "PRINCIPAL"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const data = await reportsService.paymentSummaryWithDateRange(college_id, startDate, endDate);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Payment summary with filters error:", error);
    res.status(500).json({ message: "Failed to fetch filtered payment summary" });
  }
};

/**
 * STUDENT SPECIFIC PAYMENT HISTORY
 */
exports.getStudentPaymentHistory = async (req, res) => {
  try {
    const { role, college_id } = req.user;
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!["COLLEGE_ADMIN", "ACCOUNTANT", "PRINCIPAL"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const data = await reportsService.studentSpecificPaymentHistory(college_id, studentId, startDate, endDate);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Student payment history error:", error);
    res.status(500).json({ message: "Failed to fetch student payment history" });
  }
};

/**
 * PAYMENT TRENDS ANALYSIS
 */
exports.getPaymentTrends = async (req, res) => {
  try {
    const { role, college_id } = req.user;
    const { year } = req.query;

    if (!["COLLEGE_ADMIN", "ACCOUNTANT", "PRINCIPAL"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const yearNum = year ? parseInt(year) : new Date().getFullYear();
    const data = await reportsService.paymentTrendsByMonth(college_id, yearNum);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Payment trends error:", error);
    res.status(500).json({ message: "Failed to fetch payment trends" });
  }
};

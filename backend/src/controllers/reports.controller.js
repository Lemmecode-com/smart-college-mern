const reportsService = require("../services/reports.service");

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
    else if (role === "COLLEGE_ADMIN" || role === "TEACHER") {
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

    if (role === "COLLEGE_ADMIN") {
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

    if (role === "COLLEGE_ADMIN") {
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

    if (role === "COLLEGE_ADMIN") {
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

    if (role === "COLLEGE_ADMIN" || role === "TEACHER") {
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

    if (role === "COLLEGE_ADMIN" || role === "TEACHER") {
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

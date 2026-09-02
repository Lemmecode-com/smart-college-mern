const hodReportService = require("../services/hodReport.service");
const ApiResponse = require("../utils/ApiResponse");
const teacherService = require("../services/teacher.service");

exports.getHodReportsOverview = async (req, res) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);

    if (!isHOD) {
      return res.status(403).json({
        message: "Access denied: Only HOD can access reports",
      });
    }

    const data = await hodReportService.getHodReportsOverview(
      req.user.id,
      req.college_id,
    );

    ApiResponse.success(res, data, "HOD reports overview fetched successfully");
  } catch (error) {
    console.error("HOD Reports Overview Error:", error);
    res.status(500).json({ message: "Failed to fetch HOD reports overview" });
  }
};

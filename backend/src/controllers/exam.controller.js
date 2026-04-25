const AppError = require("../utils/AppError");

/**
 * GET /api/exam/dashboard
 * Placeholder dashboard for Exam Coordinator
 * Full exam module is planned for V1.1
 */
exports.getDashboard = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: "Exam module coming in V1.1",
      data: {
        status: "placeholder",
        version: "V1.1",
      },
    });
  } catch (error) {
    next(error);
  }
};

const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const ApiResponse = require("../utils/ApiResponse");
const AppError = require("../utils/AppError");

/**
 * GET HOD Dashboard Statistics
 * GET /api/hod/dashboard
 */
const getHodDashboard = async (req, res) => {
  try {
    // req.department is attached by hodMiddleware (works whether or not a Teacher record exists)
    const department = req.department;

    if (!department) {
      throw new AppError("Department not found for this HOD", 404, "DEPARTMENT_NOT_FOUND");
    }

    // Get counts for dashboard
    const teachersCount = await Teacher.countDocuments({ department_id: department._id });
    const timetablesCount = await Timetable.countDocuments({ department_id: department._id });

    // Get recent timetables
    const recentTimetables = await Timetable.find({ department_id: department._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name startDate endDate status createdAt");

    ApiResponse.success(res, {
      department: {
        id: department._id,
        name: department.name,
        code: department.code
      },
      stats: {
        teachers: teachersCount,
        timetables: timetablesCount
      },
      recentTimetables
    }, "HOD dashboard data fetched successfully");
  } catch (error) {
    throw error;
  }
};

/**
 * GET HOD Profile
 * GET /api/hod/profile
 */
const getHodProfile = async (req, res) => {
  try {
    // Prefer Teacher record linked to this user (populated by middleware when available)
    const teacher = req.teacher || await Teacher.findOne({ user_id: req.user.id });
    const department = req.department || await Department.findOne({ hod_id: teacher?._id });

    if (!teacher || !department) {
      throw new AppError("HOD profile not found", 404, "HOD_PROFILE_NOT_FOUND");
    }

    ApiResponse.success(res, {
      teacher: {
        id: teacher._id,
        employeeId: teacher.employeeId,
        name: teacher.name,
        email: teacher.email,
        department: {
          id: department._id,
          name: department.name,
          code: department.code
        },
        dateOfJoining: teacher.dateOfJoining,
        specialization: teacher.specialization,
        phone: teacher.phone
      }
    }, "HOD profile fetched successfully");
  } catch (error) {
    throw error;
  }
};

/**
 * GET Department Details (for HOD's department)
 * GET /api/hod/department
 */
const getHodDepartment = async (req, res) => {
  try {
    // Department was already resolved by hodMiddleware (with or without a Teacher record)
    const department = req.department;
    const departmentDetail = await Department.findById(department._id)
      .populate("hod_id", "name employeeId")
      .populate("teachers", "name employeeId");

    if (!departmentDetail) {
      throw new AppError("Department not found for this HOD", 404, "DEPARTMENT_NOT_FOUND");
    }

    ApiResponse.success(res, { department: departmentDetail }, "HOD department details fetched successfully");
  } catch (error) {
    throw error;
  }
};

/**
 * GET Teachers in HOD's Department
 * GET /api/hod/teachers
 */
const getHodTeachers = async (req, res) => {
  try {
    // Department was already resolved by hodMiddleware
    const department = req.department;

    if (!department) {
      throw new AppError("Department not found for this HOD", 404, "DEPARTMENT_NOT_FOUND");
    }

    const teachers = await Teacher.find({ department_id: department._id })
      .populate("user_id", "name email")
      .select("employeeId name email phone specialization dateOfJoining status");

    ApiResponse.success(res, { teachers }, "Teachers in department fetched successfully");
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getHodDashboard,
  getHodProfile,
  getHodDepartment,
  getHodTeachers
};
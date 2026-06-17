const mongoose = require("mongoose");
const Teacher = require("../models/teacher.model");
const teacherService = require("../services/teacher.service");
const Department = require("../models/department.model");
const AppError = require("../utils/AppError");

module.exports = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);

    let department = null;

    if (isHOD) {
      department = await Department.findOne({
        _id: teacher.department_id,
        hod_id: teacher._id,
        college_id: req.college_id,
      });

      if (!department) {
        const isHODofOther = await Department.findOne({
          hod_id: teacher._id,
          college_id: req.college_id,
        });

        if (isHODofOther) {
          throw new AppError(
            `You are HOD of "${isHODofOther.name}" but not this department. You can only manage leaves for your own department.`,
            403,
            "HOD_WRONG_DEPARTMENT",
          );
        }

        throw new AppError(
          "Access denied: Only HOD can manage leave approvals",
          403,
          "HOD_ONLY",
        );
      }

      req.department = department;
    }

    req.teacher = teacher;
    req.isHOD = isHOD;

    next();
  } catch (error) {
    next(error);
  }
};

const { resolveHodDepartment } = require("../services/hodDepartment.service");

/**
 * HOD Department Middleware (lightweight)
 *
 * Resolves the authenticated HOD's authoritative department from:
 *   Authenticated HOD user -> Teacher profile -> Department.hod_id
 *
 * Unlike hod.middleware.js this version does NOT depend on timetable context and
 * is intended for notification routes that only need department scoping.
 *
 * Attaches:
 *   req.teacher         -> resolved Teacher document
 *   req.department      -> resolved Department document
 *   req.hodDepartment   -> department _id (the authoritative HOD department)
 */
module.exports = async (req, res, next) => {
  try {
    const collegeId = req.college_id || req.user.college_id;
    const { teacher, department } = await resolveHodDepartment({
      userId: req.user.id,
      collegeId,
    });

    req.teacher = teacher;
    req.department = department;
    req.hodDepartment = department._id;

    next();
  } catch (error) {
    next(error);
  }
};

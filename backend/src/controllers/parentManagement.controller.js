const ParentGuardian = require("../models/parentGuardian.model");
const User = require("../models/user.model");
const Student = require("../models/student.model");
const AppError = require("../utils/AppError");
const crypto = require("crypto");
const { sendParentAccountCreatedEmail } = require("../services/email.service");
const { buildFrontendUrl } = require("../utils/urlBuilder");
const logger = require("../utils/logger");

const generateTempPassword = (length = 10) => {
  const bytes = crypto.randomBytes(length);
  return "P@" + bytes.toString("hex").slice(0, length);
};

/**
 * GET /api/college/parents
 * List all parent/guardian accounts for this college
 */
exports.listParents = async (req, res, next) => {
  try {
    const parents = await User.find({
      college_id: req.user.college_id,
      role: "PARENT_GUARDIAN",
    })
      .select("name email isActive mustChangePassword createdAt")
      .sort({ createdAt: -1 });

    const parentIds = parents.map((p) => p._id);

    const links = await ParentGuardian.find({ user_id: { $in: parentIds } });

    const linkedStudentIds = [...new Set(links.flatMap((l) => l.student_ids || []).map((id) => id.toString()))];

    const students = linkedStudentIds.length > 0
      ? await Student.find({ _id: { $in: linkedStudentIds } })
          .select("fullName email enrollmentNumber department_id course_id currentSemester status")
          .populate("department_id", "name code")
          .populate("course_id", "name")
          .sort({ fullName: 1 })
      : [];

    const studentMap = {};
    students.forEach((s) => {
      studentMap[s._id.toString()] = s;
    });

    const linkMap = {};
    links.forEach((l) => {
      const uid = l.user_id.toString();
      if (!linkMap[uid]) linkMap[uid] = [];
      linkMap[uid].push(l);
    });

    const parentList = parents.map((parent) => {
      const parentLinks = linkMap[parent._id.toString()] || [];
      const linkedStudents = parentLinks
        .flatMap((l) => l.student_ids || [])
        .map((sid) => studentMap[sid.toString()])
        .filter(Boolean);

      return {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        isActive: parent.isActive,
        mustChangePassword: parent.mustChangePassword,
        createdAt: parent.createdAt,
        relation: parentLinks[0]?.relation || "guardian",
        linkedStudents,
      };
    });

    res.json({
      success: true,
      data: parentList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/college/parents/:id
 * Get individual parent details with linked students
 */
exports.getParent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: "PARENT_GUARDIAN",
    }).select("name email isActive mustChangePassword createdAt");

    if (!user) {
      return next(new AppError("Parent/Guardian not found", 404, "PARENT_NOT_FOUND"));
    }

    const links = await ParentGuardian.find({ user_id: id });

    if (links.length === 0) {
      return res.json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          createdAt: user.createdAt,
          relation: "guardian",
          linkedStudents: [],
        },
      });
    }

    const studentIds = links.flatMap((l) => l.student_ids || []).map((sid) => sid.toString());

    const students = studentIds.length > 0
      ? await Student.find({ _id: { $in: studentIds } })
          .select("fullName email mobileNumber enrollmentNumber status department_id course_id currentSemester admissionYear")
          .populate("department_id", "name code")
          .populate("course_id", "name")
          .sort({ fullName: 1 })
      : [];

    const studentIdsSet = new Set(studentIds);
    const linkedStudents = students.map((s) => ({
      id: s._id,
      fullName: s.fullName,
      email: s.email,
      mobileNumber: s.mobileNumber,
      enrollmentNumber: s.enrollmentNumber,
      status: s.status,
      department: s.department_id?.name || "-",
      departmentCode: s.department_id?.code || "-",
      course: s.course_id?.name || "-",
      currentSemester: s.currentSemester,
      admissionYear: s.admissionYear,
    }));

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        relation: links[0]?.relation || "guardian",
        linkedStudents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/college/parents/:id
 * Update parent profile fields
 */
exports.updateParent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: "PARENT_GUARDIAN",
    });

    if (!user) {
      return next(new AppError("Parent/Guardian not found", 404, "PARENT_NOT_FOUND"));
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim();

    await user.save();

    res.json({
      success: true,
      message: "Parent profile updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/college/parents/:id/status
 * Activate or deactivate parent account
 */
exports.updateParentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return next(new AppError("isActive must be a boolean", 400, "INVALID_STATUS"));
    }

    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: "PARENT_GUARDIAN",
    });

    if (!user) {
      return next(new AppError("Parent/Guardian not found", 404, "PARENT_NOT_FOUND"));
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: isActive ? "Parent account activated" : "Parent account deactivated",
      data: {
        id: user._id,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/college/parents/:id/reset-password
 * Reset parent password and send new credentials
 */
exports.resetParentPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: "PARENT_GUARDIAN",
    });

    if (!user) {
      return next(new AppError("Parent/Guardian not found", 404, "PARENT_NOT_FOUND"));
    }

    const tempPassword = generateTempPassword(10);
    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    const studentIds = (
      await ParentGuardian.find({ user_id: id }).select("student_ids")
    ).flatMap((l) => l.student_ids || []);

    const student = studentIds.length > 0 ? await Student.findById(studentIds[0]).select("fullName") : null;

    (async () => {
      try {
        await sendParentAccountCreatedEmail({
          to: user.email,
          parentName: user.name,
          studentName: student?.fullName || "your child",
          loginUrl: buildFrontendUrl("/login"),
          tempPassword,
          collegeId: req.user.college_id,
        });
      } catch (emailError) {
        logger.logError("Failed to send parent password reset email", {
          parentEmail: user.email,
          error: emailError.message,
        });
      }
    })();

    res.json({
      success: true,
      message: "Password reset successfully. Temporary password sent to parent email.",
      data: {
        userId: user._id,
        email: user.email,
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

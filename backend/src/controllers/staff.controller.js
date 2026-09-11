const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const User = require("../models/user.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const StaffProfile = require("../models/staffProfile.model");
const { ROLE } = require("../utils/constants");

const STAFF_ROLES = [
  ROLE.PRINCIPAL,
  ROLE.HOD,
  ROLE.ACCOUNTANT,
  ROLE.ADMISSION_OFFICER,
  ROLE.EXAM_COORDINATOR,
  ROLE.PLATFORM_SUPPORT,
  ROLE.TEACHER,
];
const AuditService = require("../services/auditLog.service");
const securityAuditService = require("../services/securityAudit.service");
const { sendStaffCredentialsEmail, sendEmailChangedNotification } = require("../services/email.service");
const { validateAge, ageValidatorMessage } = require("../utils/validators");
const teacherCreationService = require("../services/teacherCreation.service");
const teacherSubjectAssignmentService = require("../services/teacherSubjectAssignment.service");

/**
 * Generate a random temporary password
 */
const generateTempPassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

/**
 * POST /api/college/staff
 * Create a staff account (used by COLLEGE_ADMIN)
 */
   exports.createStaff = async (req, res, next) => {
    try {
      // Only COLLEGE_ADMIN can access this endpoint (enforced by middleware)
      const {
        name,
        email,
        role,
        departmentId,
        // Teaching assignment fields (optional, for HOD)
        courseId,
        subjectId,
        // Subject assignment fields (optional, for TEACHER — multiple subjects)
        subjectIds,
        // Extended profile fields (optional)
        mobileNumber,
        designation,
        employmentType,
        joiningDate,
        gender,
        dateOfBirth,
        bloodGroup,
        address,
        city,
        state,
        pincode,
        emergencyContactName,
        emergencyContactPhone,
        emergencyRelation,
        qualification,
        experienceYears,
      } = req.body;

     // Validate required fields
     if (!name || !email || !role) {
       return next(new AppError("Name, email, and role are required", 400, "MISSING_FIELDS"));
     }

      // If role is HOD, departmentId is required
      if (role === "HOD" && (!departmentId || departmentId === "")) {
        return next(new AppError("Department is required for HOD role", 400, "MISSING_DEPARTMENT_FOR_HOD"));
      }

      // ─── HOD Teaching Assignment Validation ───
      let validatedCourseId = null;
      let validatedSubjectId = null;

      if (role === "HOD") {
        // Subject requires Course
        if (subjectId && !courseId) {
          return next(new AppError(
            "Please select a course before assigning a subject.",
            400,
            "SUBJECT_WITHOUT_COURSE"
          ));
        }

        // Validate Course belongs to department and college
        if (courseId) {
          const Course = require("../models/course.model");
          const course = await Course.findOne({
            _id: courseId,
            department_id: departmentId,
            college_id: req.user.college_id,
          });

          if (!course) {
            return next(new AppError(
              "Selected course does not belong to this department",
              400,
              "COURSE_NOT_IN_DEPARTMENT"
            ));
          }

          validatedCourseId = courseId;
        }

        // Validate Subject belongs to selected Course
        if (subjectId) {
          const Subject = require("../models/subject.model");
          const subject = await Subject.findOne({
            _id: subjectId,
            course_id: courseId,
            college_id: req.user.college_id,
          });

          if (!subject) {
            return next(new AppError(
              "Selected subject does not belong to the selected course",
              400,
              "SUBJECT_NOT_IN_COURSE"
            ));
          }

          validatedSubjectId = subjectId;
        }
      }

      // ─── TEACHER Subject Assignment Validation ───
      // Subjects are optional for TEACHER role. When provided, each subject
      // is pre-validated (existence, college, ACTIVE status, department, course)
      // before the Teacher transaction begins, so we fail early and never
      // create a partially-configured Teacher.
      let validatedSubjectIds = [];

      if (role === "TEACHER" && subjectIds) {
        const Subject = require("../models/subject.model");

        // subjectIds may arrive as a string (single), an array, or comma-separated
        let subjectIdList;
        if (Array.isArray(subjectIds)) {
          subjectIdList = subjectIds;
        } else if (typeof subjectIds === "string") {
          subjectIdList = subjectIds.split(",").map((s) => s.trim()).filter(Boolean);
        } else {
          subjectIdList = [];
        }

        if (subjectIdList.length > 0) {
          for (const subjId of subjectIdList) {
            const subject = await Subject.findOne({
              _id: subjId,
              college_id: req.user.college_id,
              status: "ACTIVE",
              department_id: departmentId,
              course_id: courseId,
            });

            if (!subject) {
              return next(new AppError(
                "One or more selected subjects are invalid, inactive, or do not belong to the selected department/course",
                400,
                "INVALID_SUBJECT"
              ));
            }

            validatedSubjectIds.push(subjId);
          }
        }
      }

      // Validate role: must be a staff role that COLLEGE_ADMIN can create
    const allowedRoles = [
      ROLE.ACCOUNTANT,
      ROLE.ADMISSION_OFFICER,
      ROLE.PRINCIPAL,
      ROLE.HOD,
      ROLE.EXAM_COORDINATOR,
      ROLE.PLATFORM_SUPPORT,
      ROLE.TEACHER,
      // Note: ROLE.PARENT_GUARDIAN removed - parents are created automatically during student approval
    ];

    if (!allowedRoles.includes(role)) {
      return next(
        new AppError(
          `Role ${role} cannot be created by college admin. Allowed roles: ${allowedRoles.join(", ")}`,
          403,
          "INVALID_ROLE"
        )
      );
    }
     // ─── Joining date validation ───
     if (joiningDate && new Date(joiningDate) > new Date()) {
       return next(new AppError("Joining Date cannot be a future date", 400, "VALIDATION_ERROR"));
     }

     // ─── Date of birth validation ───
     if (dateOfBirth && !validateAge(dateOfBirth, 14, 100)) {
       return next(new AppError(ageValidatorMessage(14, 100), 400, "VALIDATION_ERROR"));
     }

     // ─── Conflict checks (User table + Teacher table) ───
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("A user with this email already exists", 409, "EMAIL_EXISTS"));
    }

    // For HOD or TEACHER role, check if a Teacher record with this email already exists
    if (role === "HOD" || role === "TEACHER") {
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        return next(new AppError(
          `A teacher with this email already exists in your college. ` +
          `To promote that teacher to HOD, use the "Assign HOD" feature on the teacher's profile instead.`,
          409,
          "EMAIL_EXISTS_IN_TEACHER"
        ));
      }
    }

    // For HOD role, check if department already has an HOD
    if (role === "HOD") {
      const departmentWithHod = await Department.findOne({
        _id: departmentId,
        college_id: req.user.college_id,
        hod_id: { $ne: null }
      });

      if (departmentWithHod) {
        return next(new AppError(
          "This department already has an HOD assigned. Please remove the current HOD first.",
          400,
          "DEPARTMENT_ALREADY_HAS_HOD"
        ));
      }
    }

    let tempPassword = generateTempPassword(12);

    // Start transaction — create User, StaffProfile, and (for HOD) Teacher together.
    // Use session.withTransaction() so MongoDB automatically retries the whole
    // transaction on transient errors such as WriteConflict (code 112), which the
    // manual startTransaction/commitTransaction pattern does not handle.
    const session = await User.startSession();
    let txResult;
    try {
      txResult = await session.withTransaction(async () => {
        // Create user - Mongoose pre-save hook will hash the password automatically
        const [user] = await User.create(
          [
            {
              name,
              email,
              password: tempPassword,
              role,
              college_id: req.user.college_id, // scoped to college admin's college
              isActive: true,
              mustChangePassword: true,
            },
          ],
          { session }
        );

        // Create staff profile with extended fields
        const staffProfile = await StaffProfile.create(
          [
            {
              user_id: user._id,
              college_id: req.user.college_id,
              mobileNumber: mobileNumber || "",
              designation: designation || "",
              employmentType: employmentType || "FULL_TIME",
              joiningDate: joiningDate || null,
              gender: gender || "",
              dateOfBirth: dateOfBirth || null,
              bloodGroup: bloodGroup || "",
              address: address || "",
              city: city || "",
              state: state || "",
              pincode: pincode || "",
              emergencyContactName: emergencyContactName || "",
              emergencyContactPhone: emergencyContactPhone || "",
              emergencyRelation: emergencyRelation || "",
              qualification: qualification || "",
              experienceYears: parseInt(experienceYears) || 0,
            },
          ],
          { session }
        );

        let teacher = null;

        // If role is HOD, create Teacher record required by hodMiddleware
        if (role === "HOD") {
          const employeeId = await teacherCreationService.generateUniqueEmployeeId(req.user.college_id);

          const hodTeacherPayload = {
            collegeId: req.user.college_id,
            userId: user._id,
            name,
            email,
            role: "HOD",
            departmentId: departmentId,
            courses: validatedCourseId ? [validatedCourseId] : [],
            designation: designation || "Head of Department",
            qualification: qualification || "Not Specified",
            experienceYears: parseInt(experienceYears) || 0,
            createdBy: req.user.id,
            dateOfBirth: dateOfBirth || null,
            address: address || "",
            city: city || "",
            state: state || "",
            pincode: pincode || "",
            employmentType: employmentType || "FULL_TIME",
            mobileNumber: mobileNumber || "",
            joiningDate: joiningDate || null,
            files: {},
            employeeId,
            sendCredentialsEmail: false,
            validateDuplicateTeacherEmail: true,
            session,
          };

          if (gender) {
            hodTeacherPayload.gender = gender;
          }
          if (bloodGroup) {
            hodTeacherPayload.bloodGroup = bloodGroup;
          }

          const result = await teacherCreationService.createTeacher(hodTeacherPayload);

          teacher = result.teacher;
          if (result.temporaryPassword) tempPassword = result.temporaryPassword;

          // Assign teacher's _id as HOD of the department (Teacher._id, NOT User._id)
          await Department.findByIdAndUpdate(
            departmentId,
             { hod_id: teacher._id },
            { session, new: true }
          );

          // Assign subject to the new HOD teacher if provided
          if (validatedSubjectId) {
            const Subject = require("../models/subject.model");
            await Subject.findOneAndUpdate(
              { _id: validatedSubjectId, college_id: req.user.college_id },
              { teacher_id: teacher._id },
              { session, new: true }
            );
          }
        }

        // If role is TEACHER, create Teacher record
        if (role === "TEACHER") {
          const employeeId = await teacherCreationService.generateUniqueEmployeeId(req.user.college_id);

          const result = await teacherCreationService.createTeacher({
            collegeId: req.user.college_id,
            userId: user._id,
            name,
            email,
            role: "TEACHER",
            departmentId: departmentId,
            courses: courseId ? [courseId] : [],
            designation: designation || "",
            qualification: qualification || "",
            experienceYears: parseInt(experienceYears) || 0,
            createdBy: req.user.id,
            dateOfBirth: dateOfBirth || null,
            address: address || "",
            city: city || "",
            state: state || "",
            pincode: pincode || "",
            employmentType: employmentType || "FULL_TIME",
            mobileNumber: mobileNumber || "",
            joiningDate: joiningDate || null,
            gender: gender || "",
            bloodGroup: bloodGroup || "",
files: req.files || {},
          employeeId,
          sendCredentialsEmail: false,
          validateDuplicateTeacherEmail: true,
          session,
          });

          teacher = result.teacher;
          if (result.temporaryPassword) tempPassword = result.temporaryPassword;
        }

        return { user, teacher };
      });
    } catch (err) {
      return next(err);
    } finally {
      session.endSession();
    }

    const { user, teacher } = txResult;

    // ─── TEACHER Subject Assignment ───
    // After the Teacher is successfully created (transaction committed),
    // assign the pre-validated subjects using the existing assignment service.
    // This reuses teacherSubjectAssignment.service.js — no duplicated logic.
    // Subject assignment is optional; if it fails the Teacher is still valid.
    let subjectAssignmentResult = null;
    if (role === "TEACHER" && teacher && validatedSubjectIds.length > 0) {
      try {
        subjectAssignmentResult = await teacherSubjectAssignmentService.bulkAssignSubjects(
          teacher._id,
          validatedSubjectIds,
          req.user.college_id,
        );
        if (subjectAssignmentResult.errors && subjectAssignmentResult.errors.length > 0) {
          console.error(
            "Subject assignment had errors for new teacher:",
            subjectAssignmentResult.errors.map((e) => e.message).join("; "),
          );
        }
      } catch (assignErr) {
        console.error("Subject assignment failed for new teacher:", assignErr.message);
      }
    }

    const staffName = name;
    let employeeIdForAudit = null;
    let departmentIdForAudit = null;

    if (role === "HOD" || role === "TEACHER") {
      departmentIdForAudit = departmentId;
      employeeIdForAudit = teacher.employeeId;
    }

    AuditService.logStaffCreated(
      req.user,
      user,
      role,
      departmentIdForAudit,
      employeeIdForAudit,
      req,
      staffName
    ).catch((err) => console.error("Audit log failed:", err.message));

    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_ACCESS",
        severity: "MEDIUM",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: req.user.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/college/create-staff",
        method: "POST",
        statusCode: 201,
        metadata: {
          action: "CREATE_STAFF",
          newUserId: user._id,
          newUserEmail: user.email,
          newUserRole: role,
          departmentId: departmentIdForAudit,
          employeeId: employeeIdForAudit,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    // Send credentials email and report delivery status (outside transaction)
    let emailResult = { success: false };
    try {
      emailResult = await sendStaffCredentialsEmail({
        to: email,
        name,
        temporaryPassword: tempPassword,
        collegeId: req.user.college_id,
      });
    } catch (err) {
      console.error("Failed to send staff credentials email:", err.message);
    }

    const message = emailResult.success
      ? "Staff account created. Credentials sent via email."
      : "Staff account created. Email delivery failed - please share the temporary password manually.";

     res.status(201).json({
       success: true,
       message,
       emailDelivered: emailResult.success,
       emailError: emailResult.success ? null : (emailResult.error || "SMTP not configured"),
       data: {
         user: {
           id: user._id,
           name: user.name,
           email: user.email,
           role: user.role,
           college_id: user.college_id,
         },
         teacher: teacher ? {
           id: teacher._id,
           employeeId: teacher.employeeId,
           subjectsAssigned: subjectAssignmentResult
             ? subjectAssignmentResult.assigned
             : 0,
           subjectAssignmentErrors: subjectAssignmentResult && subjectAssignmentResult.errors?.length > 0
             ? subjectAssignmentResult.errors
             : undefined,
         } : null,
         temporaryPassword: tempPassword, // shown only once
       },
     });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/college/staff
 * List staff accounts for this college
 */
exports.listStaff = async (req, res, next) => {
  try {
    const users = await User.find({
      college_id: req.user.college_id,
      role: { $in: STAFF_ROLES },
    })
      .select("name email role isActive mustChangePassword createdAt")
      .sort({ createdAt: -1 });

    // Get all staff profiles for these users in one query
    const userIds = users.map((u) => u._id);
    const profiles = await StaffProfile.find({ user_id: { $in: userIds } }).select(
      "user_id mobileNumber designation employmentType"
    );

    // Create lookup map
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user_id.toString()] = p;
    });

    // Merge data
    const staffList = users.map((user) => {
      const profile = profileMap[user._id.toString()] || {};
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        // Profile fields (may be empty)
        mobileNumber: profile.mobileNumber || "",
        designation: profile.designation || "",
        employmentType: profile.employmentType || "FULL_TIME",
      };
    });

    res.json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/college/staff/:id
 * Get individual staff profile details
 */
exports.getStaffProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the user
    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      $or: [
        { role: { $in: STAFF_ROLES } },
        { _id: req.user.id, role: ROLE.COLLEGE_ADMIN },
      ],
    });

    if (!user) {
      return next(new AppError("Staff member not found", 404, "STAFF_NOT_FOUND"));
    }

    // Find the staff profile
    const profile = await StaffProfile.findOne({
      user_id: id,
      college_id: req.user.college_id,
    });

    // Combine user and profile data
    const staffData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      // Profile fields (may be empty)
      mobileNumber: profile?.mobileNumber || "",
      designation: profile?.designation || "",
      employmentType: profile?.employmentType || "FULL_TIME",
      joiningDate: profile?.joiningDate || null,
      gender: profile?.gender || "",
      dateOfBirth: profile?.dateOfBirth || null,
      bloodGroup: profile?.bloodGroup || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
      emergencyContactName: profile?.emergencyContactName || "",
      emergencyContactPhone: profile?.emergencyContactPhone || "",
      emergencyRelation: profile?.emergencyRelation || "",
      qualification: profile?.qualification || "",
      experienceYears: profile?.experienceYears || 0,
    };

    // For HODs, also include teacher/teaching data
    let teacherData = null;
    if (user.role === "HOD") {
      const Teacher = require("../models/teacher.model");
      const Subject = require("../models/subject.model");
      const hodTeacher = await Teacher.findOne({
        user_id: id,
        college_id: req.user.college_id,
      })
        .populate("courses", "name code")
        .populate("department_id", "name code");

      if (hodTeacher) {
        const assignedSubjects = await Subject.find({
          teacher_id: hodTeacher._id,
          college_id: req.user.college_id,
          status: "ACTIVE",
        }).populate("course_id", "name code");

        teacherData = {
          id: hodTeacher._id,
          departmentId: hodTeacher.department_id?._id || hodTeacher.department_id || null,
          courses: hodTeacher.courses || [],
          subjects: assignedSubjects || [],
        };
      }
    }

    res.json({
      success: true,
      data: {
        ...staffData,
        teacher: teacherData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/college/staff/:id/reset-password
 * Admin reset for a staff member's password
 */
exports.resetStaffPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: { $in: STAFF_ROLES },
      isActive: { $ne: false },
    });

    if (!user) {
      return next(new AppError("Staff member not found", 404, "STAFF_NOT_FOUND"));
    }

    const tempPassword = generateTempPassword(12);

    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    AuditService.logStaffPasswordReset(req.user, user, req)
      .catch((err) => console.error("Audit log failed:", err.message));

    securityAuditService
      .logEvent({
        eventType: "PASSWORD_CHANGE",
        category: "AUTHENTICATION",
        severity: "HIGH",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: req.user.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: `/api/college/staff/${id}/reset-password`,
        method: "PUT",
        statusCode: 200,
        metadata: {
          action: "RESET_STAFF_PASSWORD",
          targetUserId: user._id,
          targetUserEmail: user.email,
          targetUserRole: user.role,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    // Send credentials email and report delivery status
    let emailResult = { success: false };
    try {
      emailResult = await sendStaffCredentialsEmail({
        to: user.email,
        name: user.name,
        temporaryPassword: tempPassword,
        collegeId: req.user.college_id,
      });
    } catch (err) {
      console.error("Failed to send staff credentials email:", err.message);
    }

    const message = emailResult.success
      ? "Password reset successfully. Temporary password sent to staff email."
      : "Password reset successfully. Email delivery failed - please share the temporary password manually.";

    res.json({
      success: true,
      message,
      emailDelivered: emailResult.success,
      emailError: emailResult.success ? null : (emailResult.error || "SMTP not configured"),
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

/**
 * PUT /api/college/staff/:id
 * Update staff profile details
 */
exports.updateStaffProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the user first to verify ownership
    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      $or: [
        { role: { $in: STAFF_ROLES } },
        { _id: req.user.id, role: ROLE.COLLEGE_ADMIN },
      ],
    });

    if (!user) {
      return next(new AppError("Staff member not found", 404, "STAFF_NOT_FOUND"));
    }

    // 🔐 Block direct email update through staff profile editing — use centralized secure email-change flow
    if (updateData.email) {
      return res.status(400).json({
        message: "Email cannot be updated through Staff profile editing. Use the secure email-change flow.",
        code: "EMAIL_CHANGE_NOT_ALLOWED",
      });
    }

    // Separate user fields from profile fields
    const userFields = {};
    const profileFields = {};

    // Define which fields belong to User vs StaffProfile
    const userFieldNames = ['name', 'email', 'role', 'isActive'];
    const profileFieldNames = [
      'mobileNumber', 'designation', 'employmentType', 'joiningDate',
      'gender', 'dateOfBirth', 'bloodGroup', 'address', 'city', 'state', 'pincode',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyRelation',
      'qualification', 'experienceYears'
    ];

    // Split the data
    Object.keys(updateData).forEach(key => {
      if (userFieldNames.includes(key)) {
        userFields[key] = updateData[key];
      } else if (profileFieldNames.includes(key)) {
        profileFields[key] = updateData[key];
      }
    });

    // Start transaction for atomic updates
    const session = await User.startSession();
    session.startTransaction();

    const previousRole = user.role;
    const previousUserFields = {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    try {
      // Update user fields if any
      const roleChanged = userFields.role && userFields.role !== previousRole;

      if (roleChanged) {
        if (id === req.user.id) {
          return next(new AppError("Cannot change your own role", 400, "SELF_ROLE_CHANGE"));
        }

        const forbiddenTargets = ["SUPER_ADMIN", "COLLEGE_ADMIN"];
        if (forbiddenTargets.includes(userFields.role)) {
          return next(new AppError(
            `You cannot assign role: ${userFields.role}`,
            403,
            "ROLE_ASSIGN_FORBIDDEN"
          ));
        }
      }

      // ─── Joining date validation ───
      if (profileFields.joiningDate && new Date(profileFields.joiningDate) > new Date()) {
        return next(new AppError("Joining Date cannot be a future date", 400, "VALIDATION_ERROR"));
      }

      if (Object.keys(userFields).length > 0) {
        await User.findByIdAndUpdate(id, userFields, { session, new: true });
      }

      // Update or create staff profile
      await StaffProfile.findOneAndUpdate(
        { user_id: id, college_id: req.user.college_id },
        { ...profileFields, user_id: id, college_id: req.user.college_id },
        { session, upsert: true, new: true, runValidators: true }
      );

      // ─── HOD Teaching Assignment Update (COLLEGE_ADMIN only) ───
      if (user.role === "HOD" && req.user.role === ROLE.COLLEGE_ADMIN) {
        const Teacher = require("../models/teacher.model");
        const Course = require("../models/course.model");
        const Subject = require("../models/subject.model");

        const hodTeacher = await Teacher.findOne({
          user_id: id,
          college_id: req.user.college_id,
        });

        if (!hodTeacher) {
          return next(new AppError("HOD teacher record not found", 404, "HOD_TEACHER_NOT_FOUND"));
        }

        const hodDepartmentId = hodTeacher.department_id;
        const incomingCourseId = updateData.courseId;
        const incomingSubjectId = updateData.subjectId;

        // Subject requires Course
        if (incomingSubjectId && !incomingCourseId) {
          return next(new AppError(
            "Please select a course before assigning a subject.",
            400,
            "SUBJECT_WITHOUT_COURSE"
          ));
        }

        // Validate Course belongs to HOD's department
        let finalCourseId = null;
        if (incomingCourseId) {
          const course = await Course.findOne({
            _id: incomingCourseId,
            department_id: hodDepartmentId,
            college_id: req.user.college_id,
          });

          if (!course) {
            return next(new AppError(
              "Selected course does not belong to this department",
              404,
              "COURSE_NOT_IN_DEPARTMENT"
            ));
          }

          finalCourseId = incomingCourseId;
        }

        // Validate Subject belongs to selected Course
        let finalSubjectId = null;
        if (incomingSubjectId) {
          const subject = await Subject.findOne({
            _id: incomingSubjectId,
            course_id: incomingCourseId,
            college_id: req.user.college_id,
          });

          if (!subject) {
            return next(new AppError(
              "Selected subject does not belong to the selected course",
              404,
              "SUBJECT_NOT_IN_COURSE"
            ));
          }

          finalSubjectId = incomingSubjectId;
        }

        // Update Teacher's courses array
        await Teacher.findByIdAndUpdate(
          hodTeacher._id,
          { courses: finalCourseId ? [finalCourseId] : [] },
          { session, new: true }
        );

        // Clear previous subject assignment if subject changed or removed
        const previousSubjectId = updateData.previousSubjectId;
        if (previousSubjectId && previousSubjectId !== finalSubjectId) {
          await Subject.findOneAndUpdate(
            { _id: previousSubjectId, teacher_id: hodTeacher._id },
            { $unset: { teacher_id: 1 } },
            { session, new: true }
          );
        }

        // Assign new subject if provided
        if (finalSubjectId) {
          await Subject.findOneAndUpdate(
            { _id: finalSubjectId, college_id: req.user.college_id },
            { teacher_id: hodTeacher._id },
            { session, new: true }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }

    const changedFields = [];
    ["name", "email", "role", "isActive"].forEach((field) => {
      if (userFields[field] !== undefined && previousUserFields[field] !== userFields[field]) {
        changedFields.push(field);
      }
    });

    try {
      if (roleChanged) {
        AuditService.logStaffRoleChange(
          req.user,
          id,
          user.name,
          previousRole,
          userFields.role,
          req
        ).catch((err) => console.error("Audit log failed:", err.message));

        securityAuditService
          .logEvent({
            eventType: "ROLE_CHANGE",
            category: "AUTHORIZATION",
            severity: "HIGH",
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            collegeId: req.user.college_id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            endpoint: `/api/college/staff/${id}`,
            method: "PUT",
            statusCode: 200,
            metadata: {
              action: "STAFF_ROLE_CHANGE",
              targetUserId: id,
              targetUserName: user.name,
              previousRole,
              newRole: userFields.role,
            },
          })
          .catch((err) => console.error("Security audit log failed:", err.message));
      }

      if (changedFields.length > 0) {
        AuditService.logStaffUpdated(req.user, id, user.name, {
          oldValues: { ...previousUserFields },
          newValues: { ...userFields },
          changedFields,
        }, req).catch((err) => console.error("Audit log failed:", err.message));

        securityAuditService
          .logEvent({
            eventType: "DATA_MODIFICATION",
            category: "DATA_ACCESS",
            severity: "MEDIUM",
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            collegeId: req.user.college_id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            endpoint: `/api/college/staff/${id}`,
            method: "PUT",
            statusCode: 200,
            metadata: {
              action: "STAFF_UPDATE",
              targetUserId: id,
              targetUserName: user.name,
              changedFields,
            },
          })
          .catch((err) => console.error("Security audit log failed:", err.message));
      }

      if (userFields.email && userFields.email !== previousUserFields.email) {
        sendEmailChangedNotification({
          to: previousUserFields.email,
          userName: user.name,
          oldEmail: previousUserFields.email,
          newEmail: userFields.email,
          collegeId: user.college_id,
        }).catch((err) => console.error("Email change notification failed:", err.message));

        securityAuditService
          .logEvent({
            eventType: "EMAIL_CHANGED",
            category: "DATA_MODIFICATION",
            severity: "HIGH",
            userId: id,
            userEmail: userFields.email,
            userRole: user.role,
            collegeId: user.college_id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            endpoint: `/api/college/staff/${id}`,
            method: "PUT",
            statusCode: 200,
            metadata: {
              action: "ADMIN_EMAIL_CHANGE",
              targetUserId: id,
              targetUserName: user.name,
              previousEmail: previousUserFields.email,
              newEmail: userFields.email,
              changedBy: req.user.id,
              changeMethod: "ADMIN_MANAGED",
            },
          })
          .catch((err) => console.error("Security audit log failed:", err.message));
      }
    } catch (err) {
      console.error("Post-commit audit/email error:", err.message);
    }

    res.json({
      success: true,
      message: "Staff profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

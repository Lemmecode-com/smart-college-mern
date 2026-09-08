/* =========================================================
 * PHASE 4B — Teacher Creation Behavior Alignment
 * (Phase 4D cleanup: legacy POST /teachers and AddTeacher.jsx
 *  have been removed. The normalizer remains useful for any
 *  future caller that needs to accept both snake_case and
 *  camelCase input.)
 * ---------------------------------------------------------
 * This service is the SINGLE source of truth for creating a
 * Teacher record. It is used by:
 *   1. POST /college/staff     (staff.controller.js, role=TEACHER)
 *
 * Documented decisions:
 *
 *   1. Employee ID
 *      - Staff → TEACHER uses EMP-{ts6}-{seq} via
 *        generateUniqueEmployeeId().
 *      - createTeacher() accepts an `employeeId` argument and
 *        does not generate one. The CALLER is responsible for
 *        choosing the appropriate generator.
 *
 *   2. Email / Credential
 *      - Credentials are generated ONLY after the
 *        User/Teacher transaction succeeds.
 *      - Email sending is OUTSIDE the transaction and
 *        non-blocking. The Staff → TEACHER controller
 *        (staff.controller) explicitly opts out of internal
 *        sending (sendCredentialsEmail: false) and handles
 *        the email itself so it can report `emailDelivered`
 *        to the client — matching the project's standard
 *        pattern used by resetStaffPassword.
 *
 *   3. API Response
 *      - The shared service returns a plain result
 *        { user, teacher, temporaryPassword }; the controller
 *        shapes the wire response.
 *
 *   4. Request Field Consistency
 *      - Staff → TEACHER sends camelCase:
 *        departmentId, courseId, courses
 *      - The shared service consumes the camelCase form only.
 *      - normalizeTeacherCreationInput() is exported for any
 *        future caller that wants to delegate the
 *        normalization to the service layer.
 *
 *   5. StaffProfile Consistency
 *      - StaffProfile is created only via Staff → TEACHER
 *        (staff.controller.createStaff) since it represents
 *        common staff fields shared across non-teaching roles.
 *
 *   6. HOD Behavior
 *      - HOD creation goes through staff.controller and
 *        calls createTeacher() with role: "HOD", setting
 *        validateDuplicateTeacherEmail: true and sending
 *        email outside the transaction.
 *      - HOD-specific department.hod_id assignment and
 *        optional subject assignment stay in the controller
 *        (transaction context). We do NOT move HOD logic
 *        into the shared service.
 *
 *   7. No Data Migration
 *      - No existing teacherIds are modified.
 *      - No historical audit/security audit data is touched.
 * ========================================================= */

const User = require("../models/user.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Document = require("../models/document.model");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { getStorageProvider } = require("../services/storage");
const DocumentService = require("../services/document.service");
const { sendStaffCredentialsEmail } = require("./email.service");
const { validateAge, ageValidatorMessage, validateJoiningDate, joiningDateValidatorMessage } = require("../utils/validators");

const DOCUMENT_TYPE_LABELS = {
  aadhaarCard: "Aadhaar Card",
  panCard: "PAN Card",
  degreeCertificate: "Degree Certificate",
  passportPhoto: "Passport Photo",
};

const generateTempPassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const processTeacherDocuments = async (files = {}, teacherId = null, uploadedBy = null) => {
  const storageService = getStorageProvider().getAdapter();
  const documents = [];
  const allowedTypes = Object.keys(DOCUMENT_TYPE_LABELS);

  for (const type of allowedTypes) {
    const fileList = files[type];
    if (fileList && fileList.length > 0 && fileList[0]) {
      const file = fileList[0];
      if (!file.buffer) continue;

      const uploadResult = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        "teacher",
        {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          documentType: type,
        }
      );

      let documentId = null;

      if (teacherId && uploadedBy) {
        try {
          const doc = await DocumentService.createDocument({
            ownerType: "Teacher",
            ownerId: teacherId,
            documentType: type,
            fileBuffer: file.buffer,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: uploadedBy,
            category: "teacher",
            storageKey: uploadResult.storagePath,
          });
          documentId = doc.documentId;
        } catch (error) {
          console.error(`Failed to create Document record for ${type}:`, error.message);
        }
      }

      documents.push({
        documentType: type,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        documentId,
      });
    }
  }

  return documents;
};

exports.generateDepartmentSequenceEmployeeId = async (collegeId, departmentId) => {
  const department = await Department.findOne({
    _id: departmentId,
    college_id: collegeId,
  });

  if (!department) {
    throw new AppError("Invalid department", 404, "DEPARTMENT_NOT_FOUND");
  }

  const departmentTeacherCount = await Teacher.countDocuments({
    college_id: collegeId,
    department_id: departmentId,
  });
  const sequenceNumber = String(departmentTeacherCount + 1).padStart(3, "0");
  return `${department.code}-T-${sequenceNumber}`;
};

exports.generateUniqueEmployeeId = async (collegeId) => {
  let empId;
  let exists = true;
  let counter = 1;
  while (exists) {
    empId = `EMP-${Date.now().toString().slice(-6)}-${String(counter).padStart(3, "0")}`;
    exists = await Teacher.exists({ college_id: collegeId, employeeId: empId });
    counter++;
  }
  return empId;
};

/**
 * Normalize Teacher creation input to the canonical camelCase shape used
 * by the shared service.
 *
 * Accepts BOTH:
 *   - snake_case (department_id, course_id)
 *   - camelCase   (departmentId, courseId)
 *
 * The normalizer remains exported for internal reuse. The legacy
 * POST /teachers endpoint and AddTeacher.jsx have been removed
 * in Phase 4D.
 *
 * Course list precedence:
 *   1. explicit courses array (if length > 0)
 *   2. single courseId / course_id
 *   3. empty
 */
exports.normalizeTeacherCreationInput = (body = {}) => {
  const departmentId = body.departmentId || body.department_id || null;
  const singleCourse = body.courseId || body.course_id || null;

  let courses = [];
  if (Array.isArray(body.courses) && body.courses.length > 0) {
    courses = body.courses;
  } else if (singleCourse) {
    courses = [singleCourse];
  }

  return {
    name: body.name,
    email: body.email,
    role: body.role,
    userId: body.userId,
    departmentId,
    courses,
    designation: body.designation,
    qualification: body.qualification,
    experienceYears: body.experienceYears,
    gender: body.gender,
    bloodGroup: body.bloodGroup,
    dateOfBirth: body.dateOfBirth,
    address: body.address,
    city: body.city,
    state: body.state,
    pincode: body.pincode,
    employmentType: body.employmentType,
    mobileNumber: body.mobileNumber,
    joiningDate: body.joiningDate,
    createdBy: body.createdBy,
    files: body.files,
    employeeId: body.employeeId,
    sendCredentialsEmail: body.sendCredentialsEmail,
    validateDuplicateTeacherEmail: body.validateDuplicateTeacherEmail,
    session: body.session,
  };
};

exports.createTeacher = async (options) => {
  const {
    collegeId,
    userId,
    name,
    email,
    role,
    departmentId,
    courses = [],
    designation,
    qualification,
    experienceYears,
    gender,
    bloodGroup,
    dateOfBirth,
    address,
    city,
    state,
    pincode,
    employmentType,
    mobileNumber,
    joiningDate,
    createdBy,
    files = {},
    employeeId,
    sendCredentialsEmail = true,
    validateDuplicateTeacherEmail = false,
    session,
  } = options;

  const finalCourses = courses.length > 0 ? courses : [];

  const department = await Department.findOne({
    _id: departmentId,
    college_id: collegeId,
  });

  if (!department) {
    throw new AppError("Invalid department", 404, "DEPARTMENT_NOT_FOUND");
  }

  if (finalCourses.length > 0) {
    const validCourses = await Course.countDocuments({
      _id: { $in: finalCourses },
      department_id: departmentId,
      college_id: collegeId,
    });

    if (validCourses !== finalCourses.length) {
      throw new AppError(
        "One or more courses do not belong to this department",
        404,
        "COURSE_NOT_FOUND",
      );
    }
  }

  if (joiningDate && new Date(joiningDate) > new Date()) {
    throw new AppError("Joining Date cannot be a future date", 400, "VALIDATION_ERROR");
  }

  if (dateOfBirth && !validateAge(dateOfBirth, 14, 100)) {
    throw new AppError(ageValidatorMessage(14, 100), 400, "VALIDATION_ERROR");
  }

  let user = null;
  let tempPassword;

  if (!userId) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already exists", 409, "DUPLICATE_EMAIL");
    }

    tempPassword = generateTempPassword(12);

    const createdUsers = await User.create(
      [
        {
          name,
          email,
          password: tempPassword,
          role,
          college_id: collegeId,
          isActive: true,
          mustChangePassword: true,
        },
      ],
      session ? { session } : undefined,
    );
    user = createdUsers[0];
  }

  if (validateDuplicateTeacherEmail) {
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      throw new AppError(
        `A teacher with this email already exists in your college. ` +
        `To promote that teacher to HOD, use the "Assign HOD" feature on the teacher's profile instead.`,
        409,
        "EMAIL_EXISTS_IN_TEACHER",
      );
    }
  }

  const userIdForTeacher = userId || user._id;

  const teacherPayload = {
    college_id: collegeId,
    user_id: userIdForTeacher,
    department_id: departmentId,
    courses: finalCourses,
    name,
    email,
    employeeId,
    designation: designation || "",
    qualification: qualification || "",
    experienceYears: Number(experienceYears) || 0,
    createdBy: createdBy || userIdForTeacher,
    gender: gender || "",
    bloodGroup: bloodGroup || "",
    dateOfBirth: dateOfBirth || null,
    address: address || "",
    city: city || "",
    state: state || "",
    pincode: pincode || "",
    employmentType: employmentType || "FULL_TIME",
    mobileNumber: mobileNumber || "",
    joiningDate: joiningDate || null,
  };

  const teacher = session
    ? await new Teacher(teacherPayload).save({ session })
    : await Teacher.create(teacherPayload);

  const uploadedDocuments = await processTeacherDocuments(
    files || {},
    teacher._id,
    createdBy || userIdForTeacher,
  );

  const documentRefs = uploadedDocuments
    .filter((doc) => doc.documentId)
    .map((doc) => ({
      documentId: doc.documentId,
      documentType: doc.documentType,
    }));

  if (documentRefs.length > 0) {
    await Teacher.findByIdAndUpdate(teacher._id, { documentRefs });
  }

  if (sendCredentialsEmail) {
    sendStaffCredentialsEmail({
      to: email,
      name,
      temporaryPassword: tempPassword,
      collegeId: collegeId,
    }).catch((err) => logger.logError("Failed to send teacher credentials email", { error: err.message }));
  }

  return {
    user,
    teacher,
    temporaryPassword: tempPassword,
  };
};

exports.processTeacherDocuments = processTeacherDocuments;

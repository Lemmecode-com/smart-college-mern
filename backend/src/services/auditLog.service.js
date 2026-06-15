const AuditLog = require("../models/auditLog.model");
const logger = require("../utils/logger");

/**
 * Audit Log Service
 * Handles all admin action audit logging for DPDPA 2026 compliance
 */

class AuditLogService {
  /**
   * Log any audit event
   * This is fire-and-forget - failures are logged but don't throw
   */
  async logAudit(auditData) {
    try {
      const log = new AuditLog(auditData);
      await log.save();

      logger.logInfo(
        `Audit Log: ${auditData.action} ${auditData.resourceType}`,
        {
          userId: auditData.userId,
          userEmail: auditData.userEmail,
          resourceId: auditData.resourceId,
          collegeId: auditData.collegeId,
        },
      );

      return log;
    } catch (error) {
      // Don't throw - audit logging failure shouldn't break the primary operation
      logger.logError("Failed to save audit log", {
        error: error.message,
        auditData,
      });
      console.error("❌ Failed to save audit log:", error.message);
      return null;
    }
  }

  /**
   * Log student approval
   */
  async logStudentApproval(student, user, req) {
    return await this.logAudit({
      collegeId: student.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "APPROVE",
      resourceType: "StudentApproval",
      resourceId: student._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        studentId: student._id,
        studentName: student.fullName,
        email: student.email,
        courseId: student.course_id,
        status: "APPROVED",
        approvedBy: user.id,
        approvedAt: student.approvedAt,
      },
    });
  }

  /**
   * Log bulk student approval
   */
  async logBulkStudentApproval(
    collegeId,
    user,
    req,
    approvedCount,
    failedCount,
  ) {
    return await this.logAudit({
      collegeId: collegeId,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "BULK_APPROVE",
      resourceType: "StudentApproval",
      resourceId: collegeId, // No single resource, use collegeId
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      metadata: {
        approvedCount,
        failedCount,
        studentIds: req.body.studentIds,
      },
    });
  }

  /**
   * Log student rejection
   */
  async logStudentRejection(student, user, req, reason) {
    return await this.logAudit({
      collegeId: student.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "REJECT",
      resourceType: "StudentApproval",
      resourceId: student._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        studentId: student._id,
        studentName: student.fullName,
        email: student.email,
        status: "REJECTED",
        rejectionReason: reason,
        rejectedBy: user.id,
        rejectedAt: student.rejectedAt,
      },
    });
  }

  /**
   * Log student offer made
   */
  async logStudentOfferMade(student, user, req) {
    return await this.logAudit({
      collegeId: student.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "OFFER_MADE",
      resourceType: "StudentApproval",
      resourceId: student._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        studentId: student._id,
        studentName: student.fullName,
        email: student.email,
        courseId: student.course_id,
        status: "OFFER_MADE",
        offerMadeBy: user.id,
        offerMadeAt: student.offerMadeAt,
        enrollmentNumber: student.enrollmentNumber,
      },
    });
  }

  /**
   * Log student enrollment
   */
  async logStudentEnrollment(student, user, req) {
    return await this.logAudit({
      collegeId: student.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "ENROLL_CONFIRMED",
      resourceType: "StudentApproval",
      resourceId: student._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        studentId: student._id,
        studentName: student.fullName,
        email: student.email,
        status: "APPROVED",
        enrollmentConfirmedAt: student.enrollmentConfirmedAt,
        enrollmentDate: student.enrollmentDate,
        approvedBy: student.approvedBy,
        approvedAt: student.approvedAt,
      },
    });
  }

  /**
   * Log fee structure creation
   */
  async logFeeStructureCreate(feeStructure, user, req) {
    return await this.logAudit({
      collegeId: feeStructure.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "CREATE",
      resourceType: "FeeStructure",
      resourceId: feeStructure._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 201,
      newValues: {
        courseId: feeStructure.course_id,
        category: feeStructure.category,
        totalFee: feeStructure.totalFee,
        installmentsCount: feeStructure.installments?.length,
      },
    });
  }

  /**
   * Log fee structure update
   */
  async logFeeStructureUpdate(oldFeeStructure, newFeeStructure, user, req) {
    return await this.logAudit({
      collegeId: newFeeStructure.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "UPDATE",
      resourceType: "FeeStructure",
      resourceId: newFeeStructure._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        courseId: oldFeeStructure.course_id,
        category: oldFeeStructure.category,
        totalFee: oldFeeStructure.totalFee,
        installmentsCount: oldFeeStructure.installments?.length,
      },
      newValues: {
        courseId: newFeeStructure.course_id,
        category: newFeeStructure.category,
        totalFee: newFeeStructure.totalFee,
        installmentsCount: newFeeStructure.installments?.length,
      },
    });
  }

  /**
   * Log fee structure deletion
   */
  async logFeeStructureDelete(feeStructure, user, req) {
    return await this.logAudit({
      collegeId: feeStructure.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "DELETE",
      resourceType: "FeeStructure",
      resourceId: feeStructure._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        courseId: feeStructure.course_id,
        category: feeStructure.category,
        totalFee: feeStructure.totalFee,
        installmentsCount: feeStructure.installments?.length,
      },
    });
  }

  /**
   * Log student update by admin
   */
  async logStudentUpdate(oldStudent, newStudent, user, req, updatedFields) {
    return await this.logAudit({
      collegeId: newStudent.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "UPDATE",
      resourceType: "Student",
      resourceId: newStudent._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: oldStudent ? this.extractStudentFields(oldStudent) : null,
      newValues: {
        ...this.extractStudentFields(newStudent),
        updatedFields,
      },
    });
  }

  /**
   * Log user deactivation
   */
  async logUserDeactivate(user, deactivatedUser, req, studentOrTeacherData) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "DEACTIVATE",
      resourceType: studentOrTeacherData?.resourceType || "User",
      resourceId: deactivatedUser._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        userId: deactivatedUser._id,
        userEmail: deactivatedUser.email,
        userRole: deactivatedUser.role,
        name: studentOrTeacherData?.name || deactivatedUser.email,
        status: "DEACTIVATED/INACTIVE",
        reason: studentOrTeacherData?.reason || "Manual deactivation by admin",
      },
    });
  }

  /**
   * Log user reactivation
   */
  async logUserReactivate(user, reactivatedUser, req, studentOrTeacherData) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "REACTIVATE",
      resourceType: studentOrTeacherData?.resourceType || "User",
      resourceId: reactivatedUser._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        userId: reactivatedUser._id,
        userEmail: reactivatedUser.email,
        userRole: reactivatedUser.role,
        name: studentOrTeacherData?.name || reactivatedUser.email,
        status: "ACTIVE/APPROVED",
        reason: "Manual reactivation by admin",
      },
    });
  }

  /**
   * Log teacher deactivation with reassignment
   */
  async logTeacherDeactivate(
    collegeId,
    user,
    req,
    teacher,
    reassignmentResult,
  ) {
    return await this.logAudit({
      collegeId: collegeId,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "DEACTIVATE",
      resourceType: "Teacher",
      resourceId: teacher._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        email: teacher.email,
        status: "INACTIVE",
        resourcesReassigned: reassignmentResult
          ? {
              subjects: reassignmentResult.subjects || 0,
              courses: reassignmentResult.courses || 0,
              departments: reassignmentResult.departments || 0,
            }
          : null,
      },
    });
  }

  /**
   * Extract relevant student fields for audit log
   */
  extractStudentFields(student) {
    if (!student) return null;
    return {
      studentId: student._id,
      fullName: student.fullName,
      email: student.email,
      mobileNumber: student.mobileNumber,
      courseId: student.course_id,
      departmentId: student.department_id,
      currentSemester: student.currentSemester,
      category: student.category,
      status: student.status,
    };
  }

  /**
   * Log staff account creation
   */
  async logStaffCreated(user, targetUser, role, departmentId, employeeId, req, staffName = "") {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "STAFF_CREATED",
      resourceType: "User",
      resourceId: targetUser._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 201,
      newValues: {
        userId: targetUser._id,
        name: staffName || targetUser.name,
        email: targetUser.email,
        role: role,
        departmentId: departmentId || null,
        employeeId: employeeId || null,
        collegeId: user.college_id,
      },
    });
  }

  /**
   * Log staff role change
   */
  async logStaffRoleChange(user, targetUserId, targetUserName, oldRole, newRole, req) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "STAFF_ROLE_CHANGED",
      resourceType: "User",
      resourceId: targetUserId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        userId: targetUserId,
        name: targetUserName,
        role: oldRole,
      },
      newValues: {
        userId: targetUserId,
        name: targetUserName,
        role: newRole,
      },
    });
  }

  /**
   * Log staff profile update
   */
  async logStaffUpdated(user, targetUserId, targetUserName, changes, req) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "STAFF_UPDATED",
      resourceType: "User",
      resourceId: targetUserId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: changes.oldValues || null,
      newValues: changes.newValues || null,
      metadata: {
        changedFields: changes.changedFields || [],
      },
    });
  }

  /**
   * Log staff password reset
   */
  async logStaffPasswordReset(user, targetUser, req) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "STAFF_PASSWORD_RESET",
      resourceType: "User",
      resourceId: targetUser._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        userId: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
        mustChangePassword: true,
      },
    });
  }

  /**
   * Log department creation
   */
  async logDepartmentCreated(user, department, req) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "DEPARTMENT_CREATED",
      resourceType: "Department",
      resourceId: department._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 201,
      newValues: {
        departmentId: department._id,
        name: department.name,
        code: department.code,
        type: department.type,
        hodId: department.hod_id || null,
      },
    });
  }

  /**
   * Log department update
   */
  async logDepartmentUpdated(user, departmentId, departmentName, oldValues, newValues, req) {
    const trackedFields = ["name", "code", "type", "status", "programsOffered", "sanctionedFacultyCount", "sanctionedStudentIntake"];
    const oldFiltered = {};
    const newFiltered = {};
    const changedFields = [];

    trackedFields.forEach((field) => {
      if (oldValues[field] !== newValues[field]) {
        changedFields.push(field);
        oldFiltered[field] = oldValues[field];
        newFiltered[field] = newValues[field];
      }
    });

    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "DEPARTMENT_UPDATED",
      resourceType: "Department",
      resourceId: departmentId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: Object.keys(oldFiltered).length > 0 ? oldFiltered : null,
      newValues: Object.keys(newFiltered).length > 0 ? newFiltered : null,
      metadata: {
        changedFields,
      },
    });
  }

  /**
   * Log department deletion
   */
  async logDepartmentDeleted(user, department, req) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "DEPARTMENT_DELETED",
      resourceType: "Department",
      resourceId: department._id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        departmentId: department._id,
        name: department.name,
        code: department.code,
        type: department.type,
        hodId: department.hod_id || null,
        createdAt: department.createdAt,
      },
    });
  }

  /**
   * Log HOD assignment
   */
  async logHODAssigned(user, departmentId, departmentName, teacherId, teacherName, previousHodId, previousUserRole, newHodId, req) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "HOD_ASSIGNED",
      resourceType: "Department",
      resourceId: departmentId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        hodId: previousHodId || null,
        teacherUserRole: previousUserRole || null,
      },
      newValues: {
        hodId: newHodId,
        teacherId: teacherId,
        teacherName: teacherName,
        teacherUserRole: "HOD",
      },
      metadata: {
        departmentName,
      },
    });
  }

  /**
   * Log HOD removal
   */
  async logHODRemoved(user, departmentId, departmentName, previousHodId, previousHodName, req) {
    return await this.logAudit({
      collegeId: user.college_id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "HOD_ASSIGNED",
      resourceType: "Department",
      resourceId: departmentId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        hodId: previousHodId,
        teacherName: previousHodName,
      },
      newValues: {
        hodId: null,
        teacherUserRole: this._inferRoleFromTeacher(previousHodId),
      },
      metadata: {
        departmentName,
        note: "HOD unassigned from department",
      },
    });
  }

  _inferRoleFromTeacher(teacherId) {
    // Best-effort: we don't have teacher role info here; return null
    return null;
  }

  /**
   * Get audit logs with filters (for COLLEGE_ADMIN)
   */
  async getAuditLogs(filters) {
    const {
      collegeId,
      action,
      resourceType,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const query = {};

    // College isolation is mandatory
    if (collegeId) query.collegeId = collegeId;

    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (userId) query.userId = userId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "email role")
        .populate("collegeId", "name code"),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get client IP (handles proxies)
   */
  getClientIP(req) {
    return (
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown"
    );
  }
}

module.exports = new AuditLogService();

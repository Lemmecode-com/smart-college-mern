const User = require("../models/user.model");
const ParentGuardian = require("../models/parentGuardian.model");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { sendParentAccountCreatedEmail } = require("./email.service");
const { buildFrontendUrl } = require("../utils/urlBuilder");

/**
 * Parent Creation Service
 * Automatically creates parent/guardian user accounts when students are approved
 */
class ParentCreationService {

  /**
   * Generate a temporary password for parent accounts
   * @returns {string} Temporary password
   */
  generateTempPassword() {
    return "Parent" + Math.random().toString(36).slice(-8);
  }

  /**
   * Create parent user accounts for an approved student
   * @param {Object} student - Approved student document
   * @returns {Promise<Object>} Object containing count and parent details with temp passwords
   */
  async createParentUsers(student) {
    try {
      const parentUsers = [];
      let createdCount = 0;

      // Validate student has required data
      if (!student.college_id) {
        throw new AppError("Student missing college_id", 400, "INVALID_STUDENT_DATA");
      }

      // Create father user if email and name provided
      if (student.fatherEmail && student.fatherName && student.fatherEmail.trim()) {
        try {
          // Check if user already exists
          const existingFather = await User.findOne({
            email: student.fatherEmail,
            college_id: student.college_id
          });

          if (!existingFather) {
            const tempPassword = this.generateTempPassword();

            const fatherUser = await User.create({
              name: student.fatherName,
              email: student.fatherEmail,
              password: tempPassword, // Will be hashed by User model pre-save hook
              role: "PARENT_GUARDIAN",
              college_id: student.college_id,
              mustChangePassword: true,
            });

            parentUsers.push({
              user: fatherUser,
              relation: "father",
              tempPassword: tempPassword
            });

            logger.logInfo("Father user account created", {
              studentId: student._id,
              parentEmail: student.fatherEmail,
              userId: fatherUser._id
            });

            // Send account creation email (non-blocking)
            (async () => {
              try {
                await sendParentAccountCreatedEmail({
                  to: fatherUser.email,
                  parentName: fatherUser.name,
                  studentName: student.fullName,
                  loginUrl: buildFrontendUrl("/login"),
                  tempPassword: tempPassword,
                  collegeId: student.college_id,
                });
                logger.logInfo("Parent account creation email sent", {
                  parentEmail: fatherUser.email,
                  studentId: student._id
                });
              } catch (emailError) {
                logger.logError("Failed to send parent account creation email", {
                  parentEmail: fatherUser.email,
                  error: emailError.message
                });
              }
            })();

            createdCount++;
          } else {
            logger.logInfo("Father user already exists, skipping creation", {
              studentId: student._id,
              parentEmail: student.fatherEmail,
              existingUserId: existingFather._id
            });
          }
        } catch (error) {
          logger.logError("Failed to create father user account", {
            studentId: student._id,
            parentEmail: student.fatherEmail,
            error: error.message
          });
          // Continue with mother creation even if father fails
        }
      }

      // Create mother user if email and name provided
      if (student.motherEmail && student.motherName && student.motherEmail.trim()) {
        try {
          // Check if user already exists
          const existingMother = await User.findOne({
            email: student.motherEmail,
            college_id: student.college_id
          });

          if (!existingMother) {
            const tempPassword = this.generateTempPassword();

            const motherUser = await User.create({
              name: student.motherName,
              email: student.motherEmail,
              password: tempPassword, // Will be hashed by User model pre-save hook
              role: "PARENT_GUARDIAN",
              college_id: student.college_id,
              mustChangePassword: true,
            });

            parentUsers.push({
              user: motherUser,
              relation: "mother",
              tempPassword: tempPassword
            });

            logger.logInfo("Mother user account created", {
              studentId: student._id,
              parentEmail: student.motherEmail,
              userId: motherUser._id
            });

            // Send account creation email (non-blocking)
            (async () => {
              try {
                await sendParentAccountCreatedEmail({
                  to: motherUser.email,
                  parentName: motherUser.name,
                  studentName: student.fullName,
                  loginUrl: buildFrontendUrl("/login"),
                  tempPassword: tempPassword,
                  collegeId: student.college_id,
                });
                logger.logInfo("Parent account creation email sent", {
                  parentEmail: motherUser.email,
                  studentId: student._id
                });
              } catch (emailError) {
                logger.logError("Failed to send parent account creation email", {
                  parentEmail: motherUser.email,
                  error: emailError.message
                });
              }
            })();

            createdCount++;
          } else {
            logger.logInfo("Mother user already exists, skipping creation", {
              studentId: student._id,
              parentEmail: student.motherEmail,
              existingUserId: existingMother._id
            });
          }
        } catch (error) {
          logger.logError("Failed to create mother user account", {
            studentId: student._id,
            parentEmail: student.motherEmail,
            error: error.message
          });
          // Continue processing even if one parent fails
        }
      }

      // Create ParentGuardian linking records
      for (const parent of parentUsers) {
        try {
          // Check if ParentGuardian record already exists
          const existingLink = await ParentGuardian.findOne({
            user_id: parent.user._id,
            student_ids: student._id
          });

          if (!existingLink) {
            await ParentGuardian.create({
              user_id: parent.user._id,
              student_ids: [student._id],
              relation: parent.relation,
            });

            logger.logInfo("ParentGuardian link created", {
              parentUserId: parent.user._id,
              studentId: student._id,
              relation: parent.relation
            });
          } else {
            logger.logInfo("ParentGuardian link already exists", {
              parentUserId: parent.user._id,
              studentId: student._id
            });
          }

          // TODO: Send email notification to parent
          // This will be implemented after email service setup

        } catch (error) {
          logger.logError("Failed to create ParentGuardian link", {
            parentUserId: parent.user._id,
            studentId: student._id,
            error: error.message
          });
        }
      }

      logger.logInfo(`Parent account creation completed for student ${student.fullName}`, {
        studentId: student._id,
        parentsCreated: createdCount,
        totalParentsProcessed: parentUsers.length
      });

      return {
        count: createdCount,
        parents: parentUsers.map(parent => ({
          name: parent.user.name,
          email: parent.user.email,
          relation: parent.relation,
          tempPassword: parent.tempPassword,
          userId: parent.user._id
        }))
      };

    } catch (error) {
      logger.logError("Parent creation service error", {
        studentId: student._id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get all parent users linked to a student (for cleanup or updates)
   * @param {string} studentId - Student ID
   * @returns {Promise<Array>} Array of parent user objects
   */
  async getStudentParents(studentId) {
    try {
      const parentLinks = await ParentGuardian.find({
        student_ids: studentId
      }).populate('user_id', 'name email role mustChangePassword');

      return parentLinks.map(link => ({
        user: link.user_id,
        relation: link.relation
      }));
    } catch (error) {
      logger.logError("Failed to get student parents", {
        studentId,
        error: error.message
      });
      return [];
    }
  }
}

module.exports = new ParentCreationService();
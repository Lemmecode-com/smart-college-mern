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
const crypto = require("crypto");

class ParentCreationService {

  generateTempPassword() {
    const bytes = crypto.randomBytes(12);
    return "P@" + bytes.toString("hex").slice(0, 12);
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
          // Check if user already exists (by email)
          const existingFather = await User.findOne({
            email: student.fatherEmail,
          });

          if (!existingFather) {
            // Create new user
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
            // User exists - verify they belong to the same college before adding to linkage
            const sameCollege = !existingFather.college_id || existingFather.college_id.toString() === student.college_id.toString();
            if (!sameCollege) {
              logger.logInfo("Father user exists but belongs to different college - skipping linkage", {
                studentId: student._id,
                parentEmail: student.fatherEmail,
                existingUserId: existingFather._id
              });
            } else {
              parentUsers.push({
                user: existingFather,
                relation: "father",
                tempPassword: null  // No new password since account already exists
              });
              logger.logInfo("Father user already exists, adding to linkage update", {
                studentId: student._id,
                parentEmail: student.fatherEmail,
                existingUserId: existingFather._id
              });
            }
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
          // Check if user already exists (by email)
          const existingMother = await User.findOne({
            email: student.motherEmail,
          });

          if (!existingMother) {
            // Create new user
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
            // User exists - add to linkage update list
            parentUsers.push({
              user: existingMother,
              relation: "mother",
              tempPassword: null  // No new password since account already exists
            });
            logger.logInfo("Mother user already exists, adding to linkage update", {
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
          const parentId = parent.user._id;
          const studentId = student._id;

          // Query by user_id first (handles both records with and without college_id)
          const existingLink = await ParentGuardian.findOne({
            user_id: parentId,
          });

          if (existingLink) {
            // Migrate: backfill college_id if missing (save after update)
            if (!existingLink.college_id && student.college_id) {
              existingLink.college_id = student.college_id;
              await existingLink.save();
              logger.logInfo("ParentGuardian college_id backfilled", {
                parentUserId: parentId,
              });
            }

            if (!existingLink.student_ids.includes(studentId)) {
              existingLink.student_ids = [...existingLink.student_ids, studentId];
              await existingLink.save();
              logger.logInfo("ParentGuardian link updated - student added", {
                parentUserId: parentId,
                studentId,
                relation: parent.relation,
              });
            } else {
              logger.logInfo("ParentGuardian link already exists", {
                parentUserId: parentId,
                studentId,
              });
            }
          } else {
            await ParentGuardian.create({
              user_id: parentId,
              college_id: student.college_id,
              student_ids: [studentId],
              relation: parent.relation,
            });

            logger.logInfo("ParentGuardian link created", {
              parentUserId: parentId,
              studentId,
              relation: parent.relation,
            });
          }
        } catch (error) {
          logger.logError("Failed to create/update ParentGuardian link", {
            parentUserId: parent.user._id,
            studentId: student._id,
            error: error.message,
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
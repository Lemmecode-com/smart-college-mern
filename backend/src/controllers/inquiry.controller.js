const Inquiry = require("../models/inquiry.model");
const ApiResponse = require("../utils/ApiResponse");
const { validateEmail } = require("../utils/validators");
const emailService = require("../services/email.service");
const logger = require("../utils/logger");

/**
 * 📩 Submit a new inquiry from the Landing Page Contact Form
 * Public endpoint (rate-limited via publicLimiter)
 */
exports.createInquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, institutionName, role, message } = req.body;

    // Field-level validations
    if (!firstName || typeof firstName !== "string" || firstName.trim().length < 2) {
      return ApiResponse.error(res, "First name must be at least 2 characters", "INVALID_FIRST_NAME", 400);
    }

    if (!lastName || typeof lastName !== "string" || lastName.trim().length < 2) {
      return ApiResponse.error(res, "Last name must be at least 2 characters", "INVALID_LAST_NAME", 400);
    }

    if (!email || typeof email !== "string" || !validateEmail(email.trim())) {
      return ApiResponse.error(res, "Please provide a valid email address", "INVALID_EMAIL", 400);
    }

    if (!institutionName || typeof institutionName !== "string" || institutionName.trim().length < 3) {
      return ApiResponse.error(res, "Institution name must be at least 3 characters", "INVALID_INSTITUTION", 400);
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return ApiResponse.error(res, "Message must be at least 10 characters", "INVALID_MESSAGE", 400);
    }

    const validRoles = ["principal", "admin", "hod", "teacher", "trustee", "other", "student", "parent"];
    const sanitizedRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : "other";

    // Create inquiry
    const inquiry = new Inquiry({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? String(phone).trim() : "",
      institutionName: institutionName.trim(),
      role: sanitizedRole,
      message: message.trim(),
    });

    // Save inquiry with retry on concurrent sequence collision
    let saved = false;
    let attempts = 0;
    while (!saved && attempts < 3) {
      try {
        await inquiry.save();
        saved = true;
      } catch (saveErr) {
        if (saveErr.code === 11000 && attempts < 2) {
          attempts += 1;
          inquiry.inquiryNumber = null; // force pre-save to recalculate next available sequence
        } else {
          throw saveErr;
        }
      }
    }

    // Trigger email alert to Super Admin (non-blocking for response)
    emailService.sendSuperAdminInquiryAlert({ inquiry }).catch((err) => {
      logger.logError("Async Super Admin inquiry notification failed", {
        inquiryNumber: inquiry.inquiryNumber,
        error: err.message,
      });
    });

    // Trigger automated acknowledgement email to applicant (non-blocking for response)
    emailService.sendInquiryAcknowledgementEmail({ inquiry }).catch((err) => {
      logger.logError("Async applicant inquiry acknowledgement email failed", {
        inquiryNumber: inquiry.inquiryNumber,
        email: inquiry.email,
        error: err.message,
      });
    });

    return ApiResponse.created(
      res,
      {
        inquiryNumber: inquiry.inquiryNumber,
        institutionName: inquiry.institutionName,
        createdAt: inquiry.createdAt,
      },
      "Thank you for contacting us! Your enquiry has been submitted successfully."
    );
  } catch (error) {
    logger.logError("Failed to create enquiry", { error: error.message });
    return ApiResponse.error(res, error.message || "Failed to submit enquiry", "INQUIRY_CREATE_ERROR", 500);
  }
};

/**
 * 📋 Get all enquiries (Super Admin only)
 * Supports pagination, status filtering, and text search
 */
exports.getInquiries = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;
    const filter = {};

    if (status && ["NEW", "CONTACTED", "CLOSED", "CONVERTED"].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    if (search && typeof search === "string" && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { inquiryNumber: regex },
        { institutionName: regex },
        { firstName: regex },
        { lastName: regex },
        { email: regex },
      ];
    }

    const [inquiries, total, newCount, contactedCount, closedCount, convertedCount] = await Promise.all([
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("convertedCollegeId", "name code email contactNumber")
        .lean(),
      Inquiry.countDocuments(filter),
      Inquiry.countDocuments({ status: "NEW" }),
      Inquiry.countDocuments({ status: "CONTACTED" }),
      Inquiry.countDocuments({ status: "CLOSED" }),
      Inquiry.countDocuments({ status: "CONVERTED" }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return ApiResponse.paginate(
      res,
      inquiries,
      {
        page,
        limit,
        total,
        totalPages,
        summary: {
          totalAll: newCount + contactedCount + closedCount + convertedCount,
          new: newCount,
          contacted: contactedCount,
          closed: closedCount,
          converted: convertedCount,
        },
      },
      "Enquiries retrieved successfully"
    );
  } catch (error) {
    logger.logError("Failed to fetch enquiries", { error: error.message });
    return ApiResponse.error(res, "Failed to retrieve enquiries", "INQUIRY_FETCH_ERROR", 500);
  }
};

/**
 * 🔍 Get single enquiry by ID (Super Admin only)
 */
exports.getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id)
      .populate("convertedCollegeId", "name code email contactNumber")
      .lean();

    if (!inquiry) {
      return ApiResponse.error(res, "Enquiry not found", "INQUIRY_NOT_FOUND", 404);
    }

    return ApiResponse.success(
      res,
      {
        ...inquiry,
        inquiryMessage: inquiry.message,
      },
      "Enquiry details fetched successfully"
    );
  } catch (error) {
    logger.logError("Failed to fetch enquiry details", { error: error.message });
    return ApiResponse.error(res, "Failed to retrieve enquiry details", "INQUIRY_FETCH_ERROR", 500);
  }
};

/**
 * 🔄 Update enquiry status (Super Admin only)
 */
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["NEW", "CONTACTED", "CLOSED", "CONVERTED"].includes(status.toUpperCase())) {
      return ApiResponse.error(res, "Invalid status. Must be NEW, CONTACTED, CLOSED, or CONVERTED", "INVALID_STATUS", 400);
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      { status: status.toUpperCase() },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return ApiResponse.error(res, "Enquiry not found", "INQUIRY_NOT_FOUND", 404);
    }

    return ApiResponse.success(res, inquiry, "Enquiry status updated successfully");
  } catch (error) {
    logger.logError("Failed to update enquiry status", { error: error.message });
    return ApiResponse.error(res, "Failed to update enquiry status", "INQUIRY_UPDATE_ERROR", 500);
  }
};

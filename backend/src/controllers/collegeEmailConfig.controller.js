const collegeEmailService = require('../services/collegeEmail.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { decrypt, getMasterKey } = require('../utils/encryption.util');
const CollegeEmailConfig = require('../models/collegeEmailConfig.model');

/**
 * Get email configuration for the current college
 * @route GET /api/admin/email/config
 * @access Private (College Admin)
 */
exports.getEmailConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const config = await collegeEmailService.getCollegeEmailConfig(collegeId);
    
    if (!config) {
      return res.status(200).json({
        success: true,
        configured: false,
        isActive: false,
        message: 'Email is not configured for this college',
      });
    }
    
    res.status(200).json({
      success: true,
      configured: true,
      isActive: config.isActive,
      config: {
        id: config._id,
        smtp: config.smtp,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        isActive: config.isActive,
        lastVerifiedAt: config.lastVerifiedAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        hasPassword: config.hasPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save email configuration for a college
 * @route POST /api/admin/email/config
 * @access Private (College Admin)
 */
exports.saveEmailConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const { smtp, credentials, fromName, fromEmail } = req.body;
    
    if (!smtp?.host || !smtp?.port || !credentials?.user || !credentials?.pass) {
      throw new AppError('SMTP host, port, username, and password are required', 400, 'VALIDATION_ERROR');
    }
    
    if (!fromName || !fromEmail) {
      throw new AppError('From name and email are required', 400, 'VALIDATION_ERROR');
    }
    
    const savedConfig = await collegeEmailService.saveCollegeEmailConfig(collegeId, {
      smtp,
      credentials,
      fromName,
      fromEmail,
    });
    
    logger.logInfo('Email configuration saved', { collegeId, fromEmail });
    
    res.status(201).json({
      success: true,
      message: 'Email configuration saved successfully',
      config: {
        id: savedConfig._id,
        smtp: savedConfig.smtp,
        fromName: savedConfig.fromName,
        fromEmail: savedConfig.fromEmail,
        isActive: savedConfig.isActive,
        hasPassword: savedConfig.hasPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email configuration
 * @route POST /api/admin/email/verify
 * @access Private (College Admin)
 */
exports.verifyEmailConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const { smtp, credentials, fromName, fromEmail, testEmail } = req.body;

    if (!smtp?.host || !smtp?.port || !credentials?.user) {
      throw new AppError('SMTP host, port, and username are required', 400, 'VALIDATION_ERROR');
    }

    if (!fromName || !fromEmail) {
      throw new AppError('From name and email are required', 400, 'VALIDATION_ERROR');
    }

    if (!testEmail) {
      throw new AppError('Test email address is required for verification', 400, 'VALIDATION_ERROR');
    }

    let verifyData = { smtp, credentials, fromName, fromEmail, testEmail };

    if (!credentials?.pass) {
      const existingConfig = await CollegeEmailConfig.findOne({ collegeId, isActive: true }).select('+credentials.pass');
      if (existingConfig?.credentials?.pass) {
        const masterKey = getMasterKey();
        const decryptedPass = decrypt(existingConfig.credentials.pass, masterKey);
        verifyData = {
          ...verifyData,
          credentials: { ...credentials, pass: decryptedPass },
        };
      } else {
        throw new AppError('Password is required. Please save the configuration first or enter the password.', 400, 'VALIDATION_ERROR');
      }
    }

    const result = await collegeEmailService.verifyCollegeEmailConfig(verifyData);

    if (result.success) {
      await collegeEmailService.markConfigVerified(collegeId, req.user._id);
      res.status(200).json({ success: true, message: result.message, verified: true });
    } else {
      res.status(200).json({ success: false, message: result.message, verified: false, error: result.error });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete email configuration
 * @route DELETE /api/admin/email/config
 * @access Private (College Admin)
 */
exports.deleteEmailConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    
    const config = await collegeEmailService.deleteCollegeEmailConfig(collegeId);
    
    if (!config) {
      throw new AppError('Email configuration not found', 404, 'CONFIG_NOT_FOUND');
    }
    
    logger.logInfo('Email configuration deleted', { collegeId });
    
    res.status(200).json({
      success: true,
      message: 'Email configuration deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
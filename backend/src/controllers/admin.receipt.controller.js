const StudentFee = require("../models/studentFee.model");
const FeeStructure = require("../models/feeStructure.model");
const AppError = require("../utils/AppError");
const { allocateLineItemsForInstallment } = require("../utils/gstCalculator");

function getPlaceOfSupply(college) {
  if (college?.state) {
    return college.stateCode ? `${college.state} (${college.stateCode})` : college.state;
  }
  if (college?.gstin && typeof college.gstin === "string" && college.gstin.length >= 2) {
    const code = college.gstin.slice(0, 2);
    const STATE_CODES = {
      "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
      "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar",
      "19": "West Bengal", "23": "Madhya Pradesh", "24": "Gujarat", "27": "Maharashtra",
      "29": "Karnataka", "32": "Kerala", "33": "Tamil Nadu", "36": "Telangana", "37": "Andhra Pradesh"
    };
    const stateName = STATE_CODES[code] || "State";
    return `${stateName} (${code})`;
  }
  return "Maharashtra (27)";
}

/**
 * Get receipt for admin (view any student's receipt)
 * Admin version - doesn't require the admin to be the student
 */
exports.getAdminReceipt = async (req, res, next) => {
  try {
    const { installmentId } = req.params;

    // Find the StudentFee containing this installment
    // Add college_id filter to ensure multi-tenant data isolation
    const studentFee = await StudentFee.findOne({
      "installments._id": installmentId,
      college_id: req.college_id,
    })
      .populate("student_id")
      .populate({
        path: "course_id",
        populate: {
          path: "department_id",
          model: "Department",
        },
      })
      .populate("college_id")
      .populate("installments.markedByAdmin", "fullName email");

    if (!studentFee) {
      throw new AppError("Receipt not found", 404, "RECEIPT_NOT_FOUND");
    }

    const installment = studentFee.installments.id(installmentId);

    if (!installment || installment.status !== "PAID") {
      throw new AppError(
        "Installment not paid or invalid receipt",
        404,
        "INSTALLMENT_NOT_PAID",
      );
    }

    const receiptNumber = `RCPT-${installment._id
      .toString()
      .slice(-6)
      .toUpperCase()}-${new Date().getFullYear()}`;

    const taxBreakdown = installment.taxBreakdown;
    const isTaxApplicable = Boolean(taxBreakdown && taxBreakdown.isTaxApplicable);

    let lineItems = [];
    if (installment.taxBreakdown?.lineItems && Array.isArray(installment.taxBreakdown.lineItems) && installment.taxBreakdown.lineItems.length > 0) {
      lineItems = installment.taxBreakdown.lineItems;
    } else if (isTaxApplicable) {
      try {
        const feeStructure = await FeeStructure.findOne({
          college_id: studentFee.college_id._id || studentFee.college_id,
          course_id: studentFee.course_id._id || studentFee.course_id,
          category: studentFee.student_id?.category || "GEN",
        }).select("components totalFee");

        if (feeStructure?.components && feeStructure.components.length > 0) {
          lineItems = allocateLineItemsForInstallment({
            components: feeStructure.components,
            installment,
          });
        }
      } catch (_) {}
    }

    let finalTaxSplit = taxBreakdown?.taxSplit || {
      type: "INTRA_STATE",
      cgstRate: null,
      cgstAmount: 0,
      sgstRate: null,
      sgstAmount: 0,
      igstRate: null,
      igstAmount: 0,
    };

    if (isTaxApplicable && Array.isArray(lineItems) && lineItems.length > 0) {
      const taxableItems = lineItems.filter((l) => Number(l.gstRate) > 0 || Number(l.gstAmount) > 0);
      const uniqueRates = [...new Set(taxableItems.map((l) => Number(l.gstRate)))];
      const isUniform = uniqueRates.length === 1;
      const uniformRate = isUniform ? uniqueRates[0] : null;

      finalTaxSplit = {
        ...finalTaxSplit,
        isUniformRate: isUniform,
        cgstRate: isUniform && uniformRate !== null ? (uniformRate / 2) : null,
        sgstRate: isUniform && uniformRate !== null ? (uniformRate / 2) : null,
        igstRate: isUniform && uniformRate !== null ? uniformRate : null,
      };
    }

    const taxDetails = isTaxApplicable
      ? {
          isTaxApplicable: true,
          sacCode: "999299",
          placeOfSupply: getPlaceOfSupply(studentFee.college_id),
          baseAmount: installment.baseAmount !== undefined ? installment.baseAmount : taxBreakdown.taxableBase,
          totalTax: installment.gstAmount !== undefined ? installment.gstAmount : taxBreakdown.totalTax,
          grossAmount: installment.amount,
          gstRate: finalTaxSplit.isUniformRate ? (finalTaxSplit.igstRate || (finalTaxSplit.cgstRate ? finalTaxSplit.cgstRate * 2 : 0)) : null,
          taxSplit: finalTaxSplit,
          lineItems,
        }
      : null;

    return res.json({
      receiptNumber,
      transactionId: installment.transactionId,
      installmentName: installment.name,
      amount: installment.amount,
      paidAt: installment.paidAt,
      status: "SUCCESS",
      paymentGateway: installment.paymentGateway || "STRIPE",
      paymentMode: installment.paymentMode || "ONLINE",
      referenceNumber: installment.referenceNumber || null,
      remarks: installment.remarks || null,
      markedByAdmin: installment.markedByAdmin || null,

      student: {
        name: studentFee.student_id?.fullName || "N/A",
        email: studentFee.student_id?.email || "N/A",
        enrollment: studentFee.student_id?.enrollmentNumber || "N/A",
        department: studentFee.course_id?.department_id?.name || "N/A",
        course: studentFee.course_id?.name || "N/A",
        academicYear: "2025-2026",
      },

      college: {
        name: studentFee.college_id?.name || "N/A",
        address: studentFee.college_id?.address || "N/A",
        email: studentFee.college_id?.email || "N/A",
        contact: studentFee.college_id?.contactNumber || "N/A",
        gstin: studentFee.college_id?.gstin || null,
      },

      taxDetails,

      summary: {
        totalFee: studentFee.totalFee,
        totalPaid: studentFee.paidAmount,
        remaining: studentFee.totalFee - studentFee.paidAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

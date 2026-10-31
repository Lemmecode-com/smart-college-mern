/**
 * NOVAA ERP — Fee Structure Validation Helper
 * Shared validation logic for CreateFeeStructure and EditFeeStructure pages.
 */

/**
 * Validates a fee structure form payload.
 *
 * @param {Object} data
 * @param {string} data.department_id
 * @param {string} data.course_id
 * @param {string} data.category
 * @param {number|string} data.totalFee
 * @param {Array<Object>} data.installments
 * @param {Object} [options]
 * @param {boolean} [options.requireDepartment=true]
 * @param {boolean} [options.isEdit=false]
 * @returns {Object} { isValid, errors, errorCount, summaryMessage, firstErrorField }
 */
export function validateFeeStructure(data = {}, options = {}) {
  const { requireDepartment = true, isEdit = false } = options;
  const errors = {};
  let firstErrorField = null;

  const setFieldError = (fieldKey, message) => {
    if (!errors[fieldKey]) {
      errors[fieldKey] = message;
      if (!firstErrorField) {
        firstErrorField = fieldKey;
      }
    }
  };

  // 1. Department
  if (requireDepartment && (!data.department_id || !String(data.department_id).trim())) {
    setFieldError("department_id", "Please select a department");
  }

  // 2. Course
  if (!data.course_id || !String(data.course_id).trim()) {
    setFieldError("course_id", "Please select a course");
  }

  // 3. Category
  if (!data.category || !String(data.category).trim()) {
    setFieldError("category", "Please select a fee category");
  }

  // 4. Total Fee
  const rawTotal = data.totalFee;
  const numTotalFee = Number(rawTotal);
  if (rawTotal === "" || rawTotal === null || rawTotal === undefined || isNaN(numTotalFee) || numTotalFee <= 0) {
    setFieldError("totalFee", "Total fee is required and must be greater than 0");
  }

  // 5. Installments
  const installments = data.installments;
  if (!Array.isArray(installments) || installments.length === 0) {
    setFieldError("installmentTotal", "At least one payment installment is required");
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const installmentErrors = {};

    installments.forEach((inst, idx) => {
      const rowErrors = {};
      const prefix = `installments[${idx}]`;

      // Name
      if (!inst || !inst.name || !String(inst.name).trim()) {
        rowErrors.name = "Installment name is required";
        if (!firstErrorField) firstErrorField = `${prefix}.name`;
      }

      // Amount
      const numAmount = Number(inst?.amount);
      if (
        !inst ||
        inst.amount === "" ||
        inst.amount === null ||
        inst.amount === undefined ||
        isNaN(numAmount) ||
        numAmount <= 0
      ) {
        rowErrors.amount = "Amount must be greater than 0";
        if (!firstErrorField) firstErrorField = `${prefix}.amount`;
      }

      // Due Date
      if (!inst || !inst.dueDate || !String(inst.dueDate).trim()) {
        rowErrors.dueDate = "Due date is required";
        if (!firstErrorField) firstErrorField = `${prefix}.dueDate`;
      } else {
        const dateStr = String(inst.dueDate).substring(0, 10);
        const parsed = new Date(dateStr + "T00:00:00");
        if (isNaN(parsed.getTime())) {
          rowErrors.dueDate = "Invalid date format";
          if (!firstErrorField) firstErrorField = `${prefix}.dueDate`;
        } else {
          // Check past date (allow existing past dates in edit mode if unchanged)
          const isAllowedPast = isEdit && inst.isExistingPast;
          if (!isAllowedPast && parsed < today) {
            rowErrors.dueDate = "Due date cannot be earlier than today";
            if (!firstErrorField) firstErrorField = `${prefix}.dueDate`;
          }

          // Check sequential order (must be strictly later than previous installment)
          if (idx > 0 && installments[idx - 1]?.dueDate) {
            const prevDateStr = String(installments[idx - 1].dueDate).substring(0, 10);
            const prevParsed = new Date(prevDateStr + "T00:00:00");
            if (!isNaN(prevParsed.getTime()) && parsed <= prevParsed) {
              rowErrors.dueDate = "Due date must be later than the previous installment";
              if (!firstErrorField) firstErrorField = `${prefix}.dueDate`;
            }
          }
        }
      }

      if (Object.keys(rowErrors).length > 0) {
        installmentErrors[idx] = rowErrors;
      }
    });

    if (Object.keys(installmentErrors).length > 0) {
      errors.installments = installmentErrors;
    }

    // Installment Sum vs Total Fee
    if (!isNaN(numTotalFee) && numTotalFee > 0) {
      const sum = installments.reduce((acc, i) => acc + (Number(i?.amount) || 0), 0);
      const roundedSum = Math.round(sum * 100) / 100;
      const roundedTotal = Math.round(numTotalFee * 100) / 100;
      const diff = Math.round((roundedTotal - roundedSum) * 100) / 100;

      if (Math.abs(roundedSum - roundedTotal) >= 0.01) {
        const diffText =
          diff > 0
            ? `(Remaining: ₹${diff.toLocaleString("en-IN")})`
            : `(Exceeds by: ₹${Math.abs(diff).toLocaleString("en-IN")})`;
        setFieldError(
          "installmentTotal",
          `Installment total (₹${roundedSum.toLocaleString("en-IN")}) must equal Total Fee (₹${roundedTotal.toLocaleString("en-IN")}) ${diffText}`
        );
      }
    }
  }

  // Count total errors
  let errorCount = 0;
  if (errors.department_id) errorCount++;
  if (errors.course_id) errorCount++;
  if (errors.category) errorCount++;
  if (errors.totalFee) errorCount++;
  if (errors.installmentTotal) errorCount++;
  if (errors.installments) {
    Object.values(errors.installments).forEach((row) => {
      errorCount += Object.keys(row).length;
    });
  }

  const isValid = errorCount === 0;
  let summaryMessage = null;
  if (!isValid) {
    summaryMessage =
      errorCount === 1
        ? "Please fix the 1 error highlighted below."
        : `Please fix the ${errorCount} errors highlighted below.`;
  }

  return {
    isValid,
    errors,
    errorCount,
    summaryMessage,
    firstErrorField,
  };
}

/**
 * Splits a total fee equally across `count` installments,
 * distributing fractional remainders cent-by-cent to guarantee exact sum.
 *
 * Example: 52700 / 3 -> [17566.67, 17566.67, 17566.66]
 *
 * @param {number|string} totalFee
 * @param {number} count
 * @returns {Array<number>}
 */
export function splitEqually(totalFee, count) {
  const total = Number(totalFee) || 0;
  const numCount = Number(count) || 0;
  if (total <= 0 || numCount <= 0) return [];

  const totalPaise = Math.round(total * 100);
  const basePaise = Math.floor(totalPaise / numCount);
  const remainderPaise = totalPaise - basePaise * numCount;

  const amounts = [];
  for (let i = 0; i < numCount; i++) {
    const paise = basePaise + (i < remainderPaise ? 1 : 0);
    amounts.push(Number((paise / 100).toFixed(2)));
  }
  return amounts;
}

/**
 * Maps a backend AppError response to the frontend inline errors structure.
 *
 * @param {Object} err Axios error object
 * @returns {{ errors: Object, message: string, field: string|null }}
 */
export function mapBackendError(err) {
  const errData = err?.response?.data?.error || err?.response?.data || {};
  const field = errData.details?.field || errData.data?.field || errData.field || null;
  const message = errData.message || "An unexpected error occurred while saving the fee structure.";

  const mappedErrors = {};
  if (field) {
    const installmentMatch = field.match(/^installments\[(\d+)\]\.(\w+)$/);
    if (installmentMatch) {
      const idx = parseInt(installmentMatch[1], 10);
      const subField = installmentMatch[2];
      mappedErrors.installments = {
        [idx]: { [subField]: message },
      };
    } else {
      mappedErrors[field] = message;
    }
  }

  return {
    errors: mappedErrors,
    message,
    field,
  };
}

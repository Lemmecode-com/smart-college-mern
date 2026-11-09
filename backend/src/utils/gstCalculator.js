const AppError = require("./AppError");

/**
 * NOVAA ERP — GST Calculation & Tax Engine Utility
 * 
 * Implements GST-exclusive tax computation, intra/inter-state tax splitting,
 * rounding reconciliation, and multi-installment tax allocation.
 * 
 * Safety & Compliance Rules:
 * 1. Pure, deterministic mathematical operations.
 * 2. Does NOT hardcode unapproved statutory tax rates.
 * 3. Enforces that components explicitly declare their rates (rejects missing rates to prevent accidental silent exemptions).
 * 4. Policy Guard blocks taxable fee component creation until official statutory policy is approved.
 */

// Approved fee component rate registry (per approved management policy docs/fees-policy.md)
const APPROVED_GST_COMPONENT_RATES = Object.freeze({
  "tuition fee": 0,
  "tuition": 0,
  "exempt tuition fee": 0,
  "laboratory fee": 18,
  "laboratory": 18,
  "lab fee": 18,
  "sports fee": 18,
  "sports": 18,
  "library fee": 0,
  "library": 0,
  "transport fee": 5,
  "transport": 5,
});

// Components pending formal policy and statutory determination
const PENDING_UNSPECIFIED_COMPONENTS = Object.freeze([
  "other fees",
  "other fee",
  "other",
]);

/**
 * Get approved statutory GST rate for a fee component name
 * @param {string} name
 * @returns {number|null}
 */
function getApprovedComponentRate(name) {
  if (!name || typeof name !== "string") return null;
  const normalized = name.trim().toLowerCase();
  if (normalized in APPROVED_GST_COMPONENT_RATES) {
    return APPROVED_GST_COMPONENT_RATES[normalized];
  }
  return null;
}

// Runtime override for testing or authorized internal programmatic activation.
// Defaults to null so that server environment configuration controls the state.
let runtimePolicyApprovalOverride = null;

/**
 * Set the runtime policy approval flag (used for testing or authorized activation)
 * Pass null or undefined to clear the override and revert to server environment configuration.
 * @param {boolean|null} approved 
 */
function setStatutoryPolicyApproval(approved) {
  if (approved === null || approved === undefined) {
    runtimePolicyApprovalOverride = null;
  } else {
    runtimePolicyApprovalOverride = Boolean(approved);
  }
}

/**
 * Get current policy approval state.
 * Evaluates in order:
 * 1. Runtime programmatic override (if set).
 * 2. Server-side environment configuration `process.env.ENABLE_STATUTORY_GST_POLICY === 'true'`.
 * Defaults to false if missing, undefined, or any other value.
 * @returns {boolean}
 */
function getStatutoryPolicyApproval() {
  if (runtimePolicyApprovalOverride !== null) {
    return runtimePolicyApprovalOverride;
  }
  return process.env.ENABLE_STATUTORY_GST_POLICY === "true";
}

/**
 * Validate GST Policy Server Configuration
 * Provides diagnostic reporting on the current policy activation status and rate tables.
 * @returns {Object}
 */
function validateGstPolicyConfig() {
  const isApproved = getStatutoryPolicyApproval();
  return {
    isEnabled: isApproved,
    activationSource: runtimePolicyApprovalOverride !== null ? "PROGRAMMATIC_OVERRIDE" : "SERVER_ENVIRONMENT",
    envKey: "ENABLE_STATUTORY_GST_POLICY",
    envValue: process.env.ENABLE_STATUTORY_GST_POLICY || null,
    pricingModel: "GST_EXCLUSIVE",
    approvedRates: APPROVED_GST_COMPONENT_RATES,
    unspecifiedComponents: PENDING_UNSPECIFIED_COMPONENTS,
    status: isApproved ? "ACTIVE" : "DISABLED_PENDING_APPROVAL",
  };
}

/**
 * Round a number to two decimal places (half-up)
 * @param {number} value 
 * @returns {number}
 */
function roundToTwoDecimals(value) {
  const num = Number(value) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Round a number to nearest integer (half-up to nearest Rupee per Sec 170 CGST Act)
 * @param {number} value 
 * @returns {number}
 */
function roundToNearestRupee(value) {
  const num = Number(value) || 0;
  return Math.round(num);
}

/**
 * Calculate GST for a single component under GST-Exclusive pricing
 * 
 * Gross = Base + Tax
 * 
 * @param {Object} params
 * @param {number} params.baseAmount - Pre-tax component amount
 * @param {number} params.gstRate - GST rate in percent (e.g., 0, 5, 18)
 * @param {string} [params.taxType="INTRA_STATE"] - "INTRA_STATE" (CGST+SGST) or "INTER_STATE" (IGST)
 * @param {boolean} [params.roundToRupee=false] - Whether to round final tax to nearest Rupee
 * @returns {Object} Tax calculation result
 */
function calculateComponentTax({
  baseAmount,
  gstRate,
  taxType = "INTRA_STATE",
  roundToRupee = false,
}) {
  const base = Number(baseAmount);
  if (isNaN(base) || base < 0) {
    throw new AppError("Base amount must be a non-negative number", 400, "INVALID_BASE_AMOUNT");
  }

  const rate = Number(gstRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    throw new AppError("GST rate must be a valid percentage between 0 and 100", 400, "INVALID_GST_RATE");
  }

  // Calculate GST amount (GST-Exclusive: Tax = Base * Rate / 100)
  let rawTax = base * (rate / 100);
  let totalTax = roundToRupee ? roundToNearestRupee(rawTax) : roundToTwoDecimals(rawTax);
  let grossAmount = roundToTwoDecimals(base + totalTax);

  let taxSplit = {
    type: taxType === "INTER_STATE" ? "INTER_STATE" : "INTRA_STATE",
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
  };

  if (totalTax > 0) {
    if (taxType === "INTER_STATE") {
      taxSplit.igstRate = rate;
      taxSplit.igstAmount = totalTax;
    } else {
      // Intra-state split: 50% CGST + 50% SGST
      const halfRate = rate / 2;
      taxSplit.cgstRate = halfRate;
      taxSplit.sgstRate = halfRate;

      // Prevent 1-paise split mismatch (e.g. odd paise divided by 2)
      const halfTax = roundToTwoDecimals(totalTax / 2);
      taxSplit.cgstAmount = halfTax;
      taxSplit.sgstAmount = roundToTwoDecimals(totalTax - halfTax);
    }
  }

  return {
    isTaxApplicable: totalTax > 0,
    baseAmount: roundToTwoDecimals(base),
    gstRate: rate,
    totalTax,
    grossAmount,
    taxSplit,
  };
}

/**
 * Validate fee components and enforce policy guard
 * 
 * Rules:
 * 1. Each component must explicitly specify name, baseAmount, and gstRate.
 * 2. Rejects missing gstRate to prevent accidental silent exemption.
 * 3. Policy Guard: Blocks component-level tax configuration while policy is unapproved.
 * 4. Approved Rate Guard: Enforces that only approved component rates (Tuition 0%, Lab 18%,
 *    Sports 18%, Transport 5%) can be configured; rejects unapproved/unspecified components.
 * 
 * @param {Array<Object>} components 
 * @throws {AppError} If validation fails or policy is not approved
 */
function validateFeeComponents(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new AppError("Components array must contain at least one fee component", 400, "COMPONENTS_REQUIRED");
  }

  // 1. Validate basic syntax and explicit rate presence
  for (let idx = 0; idx < components.length; idx++) {
    const comp = components[idx];
    if (!comp.name || typeof comp.name !== "string" || !comp.name.trim()) {
      throw new AppError(`Component at index ${idx} must have a valid name`, 400, "INVALID_COMPONENT_NAME");
    }

    if (comp.baseAmount === undefined || comp.baseAmount === null || isNaN(Number(comp.baseAmount)) || Number(comp.baseAmount) < 0) {
      throw new AppError(`Component '${comp.name}' must have a valid non-negative baseAmount`, 400, "INVALID_COMPONENT_AMOUNT");
    }

    // Critical: gstRate must be explicitly declared (no undefined, null, or out of range)
    if (comp.gstRate === undefined || comp.gstRate === null || isNaN(Number(comp.gstRate)) || Number(comp.gstRate) < 0 || Number(comp.gstRate) > 100) {
      throw new AppError(`Component '${comp.name}' must explicitly declare a valid approved gstRate (0-100)`, 400, "GST_RATE_REQUIRED");
    }
  }

  // 2. Policy Guard: Statutory GST policy approval is required before activating any component-level tax configuration
  if (!getStatutoryPolicyApproval()) {
    throw new AppError(
      "Fee component tax configurations (including 0% statutory exemptions) cannot be processed until statutory GST policy is approved by management and tax authorities.",
      400,
      "GST_POLICY_APPROVAL_PENDING"
    );
  }

  // 3. Approved Component & Rate Guard: Verify against approved policy schedule
  let totalBase = 0;
  let totalTax = 0;
  let hasTaxableComponent = false;
  const enrichedComponents = [];

  for (let idx = 0; idx < components.length; idx++) {
    const comp = components[idx];
    const normalizedName = comp.name.trim().toLowerCase();
    const rate = Number(comp.gstRate);

    // Check if component is in pending/unspecified category (Library Fee, Other Fees)
    if (PENDING_UNSPECIFIED_COMPONENTS.includes(normalizedName)) {
      throw new AppError(
        `Fee component '${comp.name.trim()}' rate is not yet specified in approved fees policy (status: Pending Review). It cannot be configured for GST calculation.`,
        400,
        "UNAPPROVED_FEE_COMPONENT_OR_RATE"
      );
    }

    // Check if component is recognized in approved rate table
    if (APPROVED_GST_COMPONENT_RATES[normalizedName] === undefined) {
      throw new AppError(
        `Fee component '${comp.name.trim()}' is not an approved fee component. Only management-approved components may be configured: Tuition Fee (0%), Laboratory Fee (18%), Sports Fee (18%), Library Fee (0%), Transport Fee (5%).`,
        400,
        "UNAPPROVED_FEE_COMPONENT_OR_RATE"
      );
    }

    // Check if declared rate matches approved rate
    const approvedRate = APPROVED_GST_COMPONENT_RATES[normalizedName];
    if (rate !== approvedRate) {
      throw new AppError(
        `Fee component '${comp.name.trim()}' was provided with rate ${rate}%, but the approved rate is ${approvedRate}%.`,
        400,
        "UNAPPROVED_FEE_COMPONENT_OR_RATE"
      );
    }

    if (rate > 0) {
      hasTaxableComponent = true;
    }

    const calc = calculateComponentTax({
      baseAmount: Number(comp.baseAmount),
      gstRate: rate,
    });

    totalBase += calc.baseAmount;
    totalTax += calc.totalTax;

    enrichedComponents.push({
      name: comp.name.trim(),
      baseAmount: calc.baseAmount,
      gstRate: rate,
      gstAmount: calc.totalTax,
      totalAmount: calc.grossAmount,
    });
  }

  return {
    isValid: true,
    totalBase: roundToTwoDecimals(totalBase),
    totalTax: roundToTwoDecimals(totalTax),
    totalGross: roundToTwoDecimals(totalBase + totalTax),
    hasTaxableComponent,
    components: enrichedComponents,
  };
}

/**
 * Allocate component-level tax across installments using Largest Remainder Method
 * 
 * Ensures that:
 * 1. Sum of installment base amounts equals totalBaseFee.
 * 2. Sum of installment tax amounts equals totalTax.
 * 3. Sum of installment gross amounts equals totalGrossFee.
 * 
 * @param {Object} params
 * @param {number} params.totalBaseFee
 * @param {number} params.totalTax
 * @param {Array<Object>} params.installments
 * @param {string} [params.taxType="INTRA_STATE"]
 * @returns {Array<Object>} Enriched installments with exact tax allocation
 */
function allocateTaxToInstallments({
  totalBaseFee,
  totalTax,
  installments,
  taxType = "INTRA_STATE",
  components = [],
}) {
  if (!Array.isArray(installments) || installments.length === 0) {
    throw new AppError("Installments must be a non-empty array", 400, "INVALID_INSTALLMENTS");
  }

  const numInstallments = installments.length;
  const grossTotal = roundToTwoDecimals(totalBaseFee + totalTax);

  // If tax is zero, all installments have 0 tax
  if (totalTax === 0) {
    return installments.map((inst, idx) => {
      const amount = roundToTwoDecimals(inst.amount);
      return {
        ...inst,
        baseAmount: amount,
        gstAmount: 0,
        amount: amount,
        taxBreakdown: {
          isTaxApplicable: false,
          taxableBase: amount,
          gstRate: 0,
          totalTax: 0,
          grossAmount: amount,
          taxSplit: {
            type: taxType,
            cgstRate: 0,
            cgstAmount: 0,
            sgstRate: 0,
            sgstAmount: 0,
            igstRate: 0,
            igstAmount: 0,
          },
        },
      };
    });
  }

  // Calculate proportional tax allocation
  // Each installment's proportional share of tax
  const rawTaxPerInstallment = totalTax / numInstallments;
  const baseTaxFloor = Math.floor(rawTaxPerInstallment * 100) / 100;
  
  // Distribute floor tax and compute remainder paise
  let distributedTax = 0;
  const allocatedTaxes = [];
  for (let i = 0; i < numInstallments; i++) {
    allocatedTaxes.push(baseTaxFloor);
    distributedTax += baseTaxFloor;
  }

  // Distribute remaining cents/paise (Largest Remainder Method)
  let remainderPaise = Math.round((totalTax - distributedTax) * 100);
  for (let i = 0; i < remainderPaise; i++) {
    allocatedTaxes[i % numInstallments] = roundToTwoDecimals(allocatedTaxes[i % numInstallments] + 0.01);
  }

  // Build allocated installments
  return installments.map((inst, idx) => {
    const instTax = allocatedTaxes[idx];
    const instGross = roundToTwoDecimals(inst.amount);
    const instBase = roundToTwoDecimals(instGross - instTax);

    // Determine whether all taxable components share a single uniform GST rate
    const taxableComponents = (components || []).filter(
      (c) => Number(c.gstAmount) > 0 || Number(c.gstRate) > 0
    );
    const uniqueRates = [...new Set(taxableComponents.map((c) => Number(c.gstRate)))];
    const isUniformRate = uniqueRates.length === 1;
    const uniformGstRate = isUniformRate ? uniqueRates[0] : null;

    let taxSplit = {
      type: taxType === "INTER_STATE" ? "INTER_STATE" : "INTRA_STATE",
      isUniformRate,
      cgstRate: isUniformRate && uniformGstRate !== null ? roundToTwoDecimals(uniformGstRate / 2) : null,
      cgstAmount: 0,
      sgstRate: isUniformRate && uniformGstRate !== null ? roundToTwoDecimals(uniformGstRate / 2) : null,
      sgstAmount: 0,
      igstRate: isUniformRate && uniformGstRate !== null ? uniformGstRate : null,
      igstAmount: 0,
    };

    if (instTax > 0) {
      if (taxType === "INTER_STATE") {
        taxSplit.igstAmount = instTax;
      } else {
        const halfTax = roundToTwoDecimals(instTax / 2);
        taxSplit.cgstAmount = halfTax;
        taxSplit.sgstAmount = roundToTwoDecimals(instTax - halfTax);
      }
    }

    let lineItems = [];
    if (Array.isArray(components) && components.length > 0) {
      lineItems = allocateLineItemsForInstallment({
        components,
        installment: {
          amount: instGross,
          baseAmount: instBase,
          gstAmount: instTax,
          taxBreakdown: { taxSplit },
        },
        taxType,
      });
    }

    return {
      ...inst,
      baseAmount: instBase,
      gstAmount: instTax,
      amount: instGross,
      taxBreakdown: {
        isTaxApplicable: instTax > 0,
        taxableBase: instBase,
        gstRate: isUniformRate ? uniformGstRate : null,
        totalTax: instTax,
        grossAmount: instGross,
        taxSplit,
        lineItems,
      },
    };
  });
}

/**
 * Allocate fee components proportionally to a specific installment
 * 
 * Guarantees zero-drift:
 * 1. Sum of lineItems baseAmount === installment.baseAmount
 * 2. Sum of lineItems gstAmount === installment.gstAmount
 * 3. Sum of lineItems totalAmount === installment.amount
 * 4. Sum of lineItems cgstAmount === installment.cgstAmount
 * 5. Sum of lineItems sgstAmount === installment.sgstAmount
 * 
 * Uses Largest Remainder Method (Hamilton Method) to distribute paise without drift.
 * 
 * @param {Object} params
 * @param {Array<Object>} params.components - Components from FeeStructure [{name, baseAmount, gstRate, gstAmount, totalAmount}]
 * @param {Object} params.installment - The installment being paid/receipted
 * @param {string} [params.taxType="INTRA_STATE"] - Tax type
 * @returns {Array<Object>} Line items allocated to this installment
 */
function allocateLineItemsForInstallment({
  components,
  installment,
  taxType = "INTRA_STATE",
}) {
  if (!Array.isArray(components) || components.length === 0) {
    return [];
  }

  const effectiveTaxType =
    taxType || installment?.taxBreakdown?.taxSplit?.type || "INTRA_STATE";
  const isInterState = effectiveTaxType === "INTER_STATE";

  const instAmount = roundToTwoDecimals(installment.amount || 0);
  const instTax = roundToTwoDecimals(
    installment.gstAmount !== undefined
      ? installment.gstAmount
      : (installment.taxBreakdown?.totalTax || 0)
  );
  const instBase = roundToTwoDecimals(
    installment.baseAmount !== undefined
      ? installment.baseAmount
      : (installment.taxBreakdown?.taxableBase !== undefined
          ? installment.taxBreakdown.taxableBase
          : instAmount - instTax)
  );

  const instCgst =
    installment?.taxBreakdown?.taxSplit?.cgstAmount !== undefined
      ? installment.taxBreakdown.taxSplit.cgstAmount
      : roundToTwoDecimals(instTax / 2);

  const totalBaseFromComponents = roundToTwoDecimals(
    components.reduce((sum, c) => sum + (Number(c.baseAmount) || 0), 0)
  );
  const totalTaxFromComponents = roundToTwoDecimals(
    components.reduce((sum, c) => sum + (Number(c.gstAmount) || 0), 0)
  );
  const structureGross = roundToTwoDecimals(totalBaseFromComponents + totalTaxFromComponents);

  // If this installment is the entire fee structure or components has only 1 item
  if (structureGross > 0 && Math.abs(instAmount - structureGross) < 0.01) {
    const rawItems = components.map((c) => {
      const bAmt = roundToTwoDecimals(c.baseAmount);
      const gRate = Number(c.gstRate);
      const gAmt = roundToTwoDecimals(c.gstAmount || 0);
      const tAmt = roundToTwoDecimals(c.totalAmount || (bAmt + gAmt));

      if (isInterState) {
        return {
          name: c.name,
          baseAmount: bAmt,
          gstRate: gRate,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: gRate,
          igstAmount: gAmt,
          gstAmount: gAmt,
          totalAmount: tAmt,
        };
      }

      const halfRate = roundToTwoDecimals(gRate / 2);
      const halfTax = roundToTwoDecimals(gAmt / 2);
      return {
        name: c.name,
        baseAmount: bAmt,
        gstRate: gRate,
        cgstRate: halfRate,
        cgstAmount: halfTax,
        sgstRate: halfRate,
        sgstAmount: roundToTwoDecimals(gAmt - halfTax),
        igstRate: 0,
        igstAmount: 0,
        gstAmount: gAmt,
        totalAmount: tAmt,
      };
    });

    if (!isInterState && instTax > 0) {
      const sumCgst = roundToTwoDecimals(rawItems.reduce((s, i) => s + i.cgstAmount, 0));
      let diffPaise = Math.round((instCgst - sumCgst) * 100);
      if (diffPaise !== 0) {
        for (let i = 0; i < rawItems.length && diffPaise !== 0; i++) {
          if (rawItems[i].gstAmount > 0) {
            const adj = diffPaise > 0 ? 0.01 : -0.01;
            rawItems[i].cgstAmount = roundToTwoDecimals(rawItems[i].cgstAmount + adj);
            rawItems[i].sgstAmount = roundToTwoDecimals(rawItems[i].gstAmount - rawItems[i].cgstAmount);
            diffPaise += diffPaise > 0 ? -1 : 1;
          }
        }
      }
    }

    return rawItems;
  }

  // Proportional tax allocation across components using Largest Remainder Method
  let allocatedTaxes = [];
  if (instTax > 0 && totalTaxFromComponents > 0) {
    const rawTaxes = components.map((c) => {
      const compTax = Number(c.gstAmount) || 0;
      return (instTax * compTax) / totalTaxFromComponents;
    });

    const floorTaxes = rawTaxes.map((rt) => Math.floor(rt * 100) / 100);
    const sumFloor = floorTaxes.reduce((sum, val) => sum + val, 0);
    let remainderPaise = Math.round((instTax - sumFloor) * 100);

    const indexedRemainders = rawTaxes.map((rt, idx) => ({
      index: idx,
      rem: rt - floorTaxes[idx],
    })).sort((a, b) => b.rem - a.rem);

    allocatedTaxes = [...floorTaxes];
    for (let i = 0; i < remainderPaise; i++) {
      const targetIdx = indexedRemainders[i % indexedRemainders.length].index;
      allocatedTaxes[targetIdx] = roundToTwoDecimals(allocatedTaxes[targetIdx] + 0.01);
    }
  } else {
    allocatedTaxes = components.map(() => 0);
  }

  // Proportional base allocation across components using Largest Remainder Method
  let allocatedBases = [];
  if (instBase > 0 && totalBaseFromComponents > 0) {
    const rawBases = components.map((c) => {
      const compBase = Number(c.baseAmount) || 0;
      return (instBase * compBase) / totalBaseFromComponents;
    });

    const floorBases = rawBases.map((rb) => Math.floor(rb * 100) / 100);
    const sumFloor = floorBases.reduce((sum, val) => sum + val, 0);
    let remainderPaise = Math.round((instBase - sumFloor) * 100);

    const indexedRemainders = rawBases.map((rb, idx) => ({
      index: idx,
      rem: rb - floorBases[idx],
    })).sort((a, b) => b.rem - a.rem);

    allocatedBases = [...floorBases];
    for (let i = 0; i < remainderPaise; i++) {
      const targetIdx = indexedRemainders[i % indexedRemainders.length].index;
      allocatedBases[targetIdx] = roundToTwoDecimals(allocatedBases[targetIdx] + 0.01);
    }
  } else {
    allocatedBases = components.map(() => 0);
  }

  const lineItems = components.map((c, idx) => {
    const bAmt = allocatedBases[idx];
    const gRate = Number(c.gstRate);
    const gAmt = allocatedTaxes[idx];
    const tAmt = roundToTwoDecimals(bAmt + gAmt);

    if (isInterState) {
      return {
        name: c.name,
        baseAmount: bAmt,
        gstRate: gRate,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: gRate,
        igstAmount: gAmt,
        gstAmount: gAmt,
        totalAmount: tAmt,
      };
    }

    const halfRate = roundToTwoDecimals(gRate / 2);
    const halfTax = roundToTwoDecimals(gAmt / 2);
    return {
      name: c.name,
      baseAmount: bAmt,
      gstRate: gRate,
      cgstRate: halfRate,
      cgstAmount: halfTax,
      sgstRate: halfRate,
      sgstAmount: roundToTwoDecimals(gAmt - halfTax),
      igstRate: 0,
      igstAmount: 0,
      gstAmount: gAmt,
      totalAmount: tAmt,
    };
  });

  if (!isInterState && instTax > 0) {
    const sumCgst = roundToTwoDecimals(lineItems.reduce((s, i) => s + i.cgstAmount, 0));
    let diffPaise = Math.round((instCgst - sumCgst) * 100);
    if (diffPaise !== 0) {
      for (let i = 0; i < lineItems.length && diffPaise !== 0; i++) {
        if (lineItems[i].gstAmount > 0) {
          const adj = diffPaise > 0 ? 0.01 : -0.01;
          lineItems[i].cgstAmount = roundToTwoDecimals(lineItems[i].cgstAmount + adj);
          lineItems[i].sgstAmount = roundToTwoDecimals(lineItems[i].gstAmount - lineItems[i].cgstAmount);
          diffPaise += diffPaise > 0 ? -1 : 1;
        }
      }
    }
  }

  return lineItems;
}

module.exports = {
  roundToTwoDecimals,
  roundToNearestRupee,
  calculateComponentTax,
  validateFeeComponents,
  allocateTaxToInstallments,
  allocateLineItemsForInstallment,
  setStatutoryPolicyApproval,
  getStatutoryPolicyApproval,
  validateGstPolicyConfig,
  getApprovedComponentRate,
  APPROVED_GST_COMPONENT_RATES,
  PENDING_UNSPECIFIED_COMPONENTS,
};


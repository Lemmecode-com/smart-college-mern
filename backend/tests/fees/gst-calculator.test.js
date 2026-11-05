const {
  roundToTwoDecimals,
  roundToNearestRupee,
  calculateComponentTax,
  validateFeeComponents,
  allocateTaxToInstallments,
  allocateLineItemsForInstallment,
  setStatutoryPolicyApproval,
  getStatutoryPolicyApproval,
  validateGstPolicyConfig,
  APPROVED_GST_COMPONENT_RATES,
  PENDING_UNSPECIFIED_COMPONENTS,
} = require("../../src/utils/gstCalculator");

describe("GST Calculator & Tax Engine Utility", () => {
  beforeEach(() => {
    // Ensure policy approval flag is reset to false before each test
    setStatutoryPolicyApproval(false);
  });

  describe("Rounding Utilities", () => {
    it("rounds numbers half-up to two decimal places", () => {
      expect(roundToTwoDecimals(10.555)).toBe(10.56);
      expect(roundToTwoDecimals(10.554)).toBe(10.55);
      expect(roundToTwoDecimals(10)).toBe(10);
      expect(roundToTwoDecimals(0)).toBe(0);
    });

    it("rounds numbers half-up to nearest rupee", () => {
      expect(roundToNearestRupee(10.49)).toBe(10);
      expect(roundToNearestRupee(10.50)).toBe(11);
      expect(roundToNearestRupee(10.51)).toBe(11);
    });
  });

  describe("Component Tax Calculation (GST-Exclusive)", () => {
    it("calculates 18% GST under Intra-State supply (50% CGST + 50% SGST)", () => {
      const result = calculateComponentTax({
        baseAmount: 10000,
        gstRate: 18,
        taxType: "INTRA_STATE",
      });

      expect(result.isTaxApplicable).toBe(true);
      expect(result.baseAmount).toBe(10000);
      expect(result.gstRate).toBe(18);
      expect(result.totalTax).toBe(1800);
      expect(result.grossAmount).toBe(11800);
      expect(result.taxSplit.type).toBe("INTRA_STATE");
      expect(result.taxSplit.cgstRate).toBe(9);
      expect(result.taxSplit.cgstAmount).toBe(900);
      expect(result.taxSplit.sgstRate).toBe(9);
      expect(result.taxSplit.sgstAmount).toBe(900);
      expect(result.taxSplit.igstRate).toBe(0);
      expect(result.taxSplit.igstAmount).toBe(0);
    });

    it("calculates 18% GST under Inter-State supply (100% IGST)", () => {
      const result = calculateComponentTax({
        baseAmount: 10000,
        gstRate: 18,
        taxType: "INTER_STATE",
      });

      expect(result.isTaxApplicable).toBe(true);
      expect(result.totalTax).toBe(1800);
      expect(result.grossAmount).toBe(11800);
      expect(result.taxSplit.type).toBe("INTER_STATE");
      expect(result.taxSplit.igstRate).toBe(18);
      expect(result.taxSplit.igstAmount).toBe(1800);
      expect(result.taxSplit.cgstAmount).toBe(0);
      expect(result.taxSplit.sgstAmount).toBe(0);
    });

    it("handles 0% exempt component (e.g. Tuition)", () => {
      const result = calculateComponentTax({
        baseAmount: 50000,
        gstRate: 0,
      });

      expect(result.isTaxApplicable).toBe(false);
      expect(result.baseAmount).toBe(50000);
      expect(result.gstRate).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.grossAmount).toBe(50000);
      expect(result.taxSplit.cgstAmount).toBe(0);
      expect(result.taxSplit.sgstAmount).toBe(0);
    });

    it("prevents 1-paise split mismatch for odd tax amounts", () => {
      // 100 * 5% = 5.00 -> 2.50 + 2.50
      // 33.33 * 5% = 1.6665 -> 1.67 tax -> 0.84 CGST + 0.83 SGST = 1.67
      const result = calculateComponentTax({
        baseAmount: 33.33,
        gstRate: 5,
        taxType: "INTRA_STATE",
      });

      expect(result.totalTax).toBe(1.67);
      expect(result.taxSplit.cgstAmount + result.taxSplit.sgstAmount).toBe(1.67);
    });

    it("rejects negative base amount", () => {
      expect(() => {
        calculateComponentTax({ baseAmount: -100, gstRate: 18 });
      }).toThrow("Base amount must be a non-negative number");
    });

    it("rejects invalid GST rate", () => {
      expect(() => {
        calculateComponentTax({ baseAmount: 100, gstRate: -5 });
      }).toThrow("GST rate must be a valid percentage between 0 and 100");
      expect(() => {
        calculateComponentTax({ baseAmount: 100, gstRate: 150 });
      }).toThrow("GST rate must be a valid percentage between 0 and 100");
    });
  });

  describe("Component Validation & Policy Guard", () => {
    it("rejects empty or missing components array", () => {
      expect(() => validateFeeComponents([])).toThrow("Components array must contain at least one fee component");
      expect(() => validateFeeComponents(null)).toThrow("Components array must contain at least one fee component");
    });

    it("rejects components missing name or baseAmount", () => {
      expect(() => {
        validateFeeComponents([{ name: "", baseAmount: 100, gstRate: 0 }]);
      }).toThrow("Component at index 0 must have a valid name");

      expect(() => {
        validateFeeComponents([{ name: "Tuition", baseAmount: -5, gstRate: 0 }]);
      }).toThrow("Component 'Tuition' must have a valid non-negative baseAmount");
    });

    it("rejects components with missing gstRate (prevents accidental silent exemption)", () => {
      expect(() => {
        validateFeeComponents([{ name: "Laboratory", baseAmount: 5000 }]);
      }).toThrow("Component 'Laboratory' must explicitly declare a valid approved gstRate (0-100)");
    });

    it("BLOCKS taxable components when statutory policy approval is false", () => {
      expect(getStatutoryPolicyApproval()).toBe(false);

      expect(() => {
        validateFeeComponents([
          { name: "Tuition", baseAmount: 40000, gstRate: 0 },
          { name: "Laboratory", baseAmount: 10000, gstRate: 18 },
        ]);
      }).toThrow("Fee component tax configurations (including 0% statutory exemptions) cannot be processed until statutory GST policy is approved by management and tax authorities.");
    });

    it("BLOCKS 0% exempt components when statutory policy approval is false (prevents unapproved exemption claims)", () => {
      expect(getStatutoryPolicyApproval()).toBe(false);

      expect(() => {
        validateFeeComponents([
          { name: "Tuition Fee", baseAmount: 40000, gstRate: 0 },
          { name: "Development Fee", baseAmount: 10000, gstRate: 0 },
        ]);
      }).toThrow("Fee component tax configurations (including 0% statutory exemptions) cannot be processed until statutory GST policy is approved by management and tax authorities.");
    });

    it("evaluates server-side configuration ENABLE_STATUTORY_GST_POLICY safely", () => {
      const originalEnv = process.env.ENABLE_STATUTORY_GST_POLICY;
      try {
        setStatutoryPolicyApproval(null); // Clear programmatic override

        // Default: missing or empty env
        delete process.env.ENABLE_STATUTORY_GST_POLICY;
        expect(getStatutoryPolicyApproval()).toBe(false);

        // Invalid non-boolean strings fail safely to disabled
        process.env.ENABLE_STATUTORY_GST_POLICY = "invalid";
        expect(getStatutoryPolicyApproval()).toBe(false);
        process.env.ENABLE_STATUTORY_GST_POLICY = "1";
        expect(getStatutoryPolicyApproval()).toBe(false);
        process.env.ENABLE_STATUTORY_GST_POLICY = "yes";
        expect(getStatutoryPolicyApproval()).toBe(false);
        process.env.ENABLE_STATUTORY_GST_POLICY = "false";
        expect(getStatutoryPolicyApproval()).toBe(false);

        // Valid activation
        process.env.ENABLE_STATUTORY_GST_POLICY = "true";
        expect(getStatutoryPolicyApproval()).toBe(true);

        const configDiagnostic = validateGstPolicyConfig();
        expect(configDiagnostic.isEnabled).toBe(true);
        expect(configDiagnostic.pricingModel).toBe("GST_EXCLUSIVE");
        expect(configDiagnostic.status).toBe("ACTIVE");
      } finally {
        process.env.ENABLE_STATUTORY_GST_POLICY = originalEnv;
        setStatutoryPolicyApproval(false);
      }
    });

    it("ALLOWS configured and approved component rates (Tuition 0%, Lab 18%, Sports 18%, Transport 5%)", () => {
      setStatutoryPolicyApproval(true);
      expect(getStatutoryPolicyApproval()).toBe(true);

      const result = validateFeeComponents([
        { name: "Tuition Fee", baseAmount: 40000, gstRate: 0 },
        { name: "Laboratory Fee", baseAmount: 10000, gstRate: 18 },
        { name: "Sports Fee", baseAmount: 5000, gstRate: 18 },
        { name: "Transport Fee", baseAmount: 8000, gstRate: 5 },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.totalBase).toBe(63000);
      // Tax: Lab (1800) + Sports (900) + Transport (400) = 3100
      expect(result.totalTax).toBe(3100);
      expect(result.totalGross).toBe(66100);
      expect(result.hasTaxableComponent).toBe(true);
      expect(result.components).toHaveLength(4);
    });

    it("REJECTS unspecified fee components (e.g. Other Fees)", () => {
      setStatutoryPolicyApproval(true);

      expect(() => {
        validateFeeComponents([
          { name: "Other Fees", baseAmount: 1000, gstRate: 18 },
        ]);
      }).toThrow(/Other Fees.*rate is not yet specified in approved fees policy/);
    });

    it("ALLOWS Library Fee at approved 0% statutory rate", () => {
      setStatutoryPolicyApproval(true);
      const res = validateFeeComponents([
        { name: "Library Fee", baseAmount: 3000, gstRate: 0 },
      ]);
      expect(res.isValid).toBe(true);
      expect(res.totalBase).toBe(3000);
      expect(res.totalTax).toBe(0);
      expect(res.totalGross).toBe(3000);
    });

    it("REJECTS unapproved components and rate mismatches against policy schedule", () => {
      setStatutoryPolicyApproval(true);

      // Unrecognized component
      expect(() => {
        validateFeeComponents([
          { name: "Hostel Fee", baseAmount: 20000, gstRate: 18 },
        ]);
      }).toThrow(/Hostel Fee.*is not an approved fee component/);

      // Rate mismatch: Tuition at 18% instead of approved 0%
      expect(() => {
        validateFeeComponents([
          { name: "Tuition Fee", baseAmount: 40000, gstRate: 18 },
        ]);
      }).toThrow(/Tuition Fee.*was provided with rate 18%, but the approved rate is 0%/);

      // Rate mismatch: Laboratory at 5% instead of approved 18%
      expect(() => {
        validateFeeComponents([
          { name: "Laboratory Fee", baseAmount: 10000, gstRate: 5 },
        ]);
      }).toThrow(/Laboratory Fee.*was provided with rate 5%, but the approved rate is 18%/);
    });
  });

  describe("Installment Tax Allocation (Largest Remainder Method)", () => {
    it("allocates 0 tax cleanly when totalTax is 0", () => {
      const installments = [
        { name: "Installment 1", amount: 25000, order: 1 },
        { name: "Installment 2", amount: 25000, order: 2 },
      ];

      const allocated = allocateTaxToInstallments({
        totalBaseFee: 50000,
        totalTax: 0,
        installments,
      });

      expect(allocated).toHaveLength(2);
      expect(allocated[0].gstAmount).toBe(0);
      expect(allocated[0].amount).toBe(25000);
      expect(allocated[0].taxBreakdown.isTaxApplicable).toBe(false);
      expect(allocated[1].gstAmount).toBe(0);
      expect(allocated[1].amount).toBe(25000);
    });

    it("distributes tax across multiple installments reconciling to exact totalTax", () => {
      const installments = [
        { name: "Installment 1", amount: 25900, order: 1 },
        { name: "Installment 2", amount: 25900, order: 2 },
      ];

      const allocated = allocateTaxToInstallments({
        totalBaseFee: 50000,
        totalTax: 1800,
        installments,
      });

      expect(allocated).toHaveLength(2);
      expect(allocated[0].gstAmount + allocated[1].gstAmount).toBe(1800);
      expect(allocated[0].baseAmount + allocated[1].baseAmount).toBe(50000);
      expect(allocated[0].amount + allocated[1].amount).toBe(51800);
      expect(allocated[0].taxBreakdown.isTaxApplicable).toBe(true);
    });

    it("handles odd fractional paise tax without remainder drift across 3 installments", () => {
      // e.g. total tax of 100.00 across 3 installments: 33.34, 33.33, 33.33 = 100.00 exactly
      const installments = [
        { name: "Installment 1", amount: 1000, order: 1 },
        { name: "Installment 2", amount: 1000, order: 2 },
        { name: "Installment 3", amount: 1000, order: 3 },
      ];

      const allocated = allocateTaxToInstallments({
        totalBaseFee: 2900,
        totalTax: 100,
        installments,
      });

      const totalAllocatedTax = allocated.reduce((sum, inst) => sum + inst.gstAmount, 0);
      expect(roundToTwoDecimals(totalAllocatedTax)).toBe(100);
      expect(allocated[0].gstAmount).toBe(33.34);
      expect(allocated[1].gstAmount).toBe(33.33);
      expect(allocated[2].gstAmount).toBe(33.33);
    });
  });

  describe("Proportional Line Items Allocation (allocateLineItemsForInstallment)", () => {
    const components = [
      { name: "Tuition Fee", baseAmount: 50000, gstRate: 0, gstAmount: 0, totalAmount: 50000 },
      { name: "Laboratory Fee", baseAmount: 10000, gstRate: 18, gstAmount: 1800, totalAmount: 11800 },
      { name: "Sports Fee", baseAmount: 5000, gstRate: 18, gstAmount: 900, totalAmount: 5900 },
      { name: "Library Fee", baseAmount: 2000, gstRate: 0, gstAmount: 0, totalAmount: 2000 },
      { name: "Transport Fee", baseAmount: 8000, gstRate: 5, gstAmount: 400, totalAmount: 8400 },
    ];
    // Total Base = 75,000, Total Tax = 3,100, Total Gross = 78,100

    it("allocates full components for single full payment with statutory CGST/SGST per item", () => {
      const lineItems = allocateLineItemsForInstallment({
        components,
        installment: {
          amount: 78100,
          baseAmount: 75000,
          gstAmount: 3100,
        },
      });

      expect(lineItems).toHaveLength(5);
      expect(lineItems[0].name).toBe("Tuition Fee");
      expect(lineItems[0].gstAmount).toBe(0);
      expect(lineItems[0].cgstRate).toBe(0);
      expect(lineItems[0].cgstAmount).toBe(0);
      expect(lineItems[0].sgstRate).toBe(0);
      expect(lineItems[0].sgstAmount).toBe(0);

      // Lab 9%+9% (900+900)
      expect(lineItems[1].name).toBe("Laboratory Fee");
      expect(lineItems[1].baseAmount).toBe(10000);
      expect(lineItems[1].gstRate).toBe(18);
      expect(lineItems[1].cgstRate).toBe(9);
      expect(lineItems[1].cgstAmount).toBe(900);
      expect(lineItems[1].sgstRate).toBe(9);
      expect(lineItems[1].sgstAmount).toBe(900);
      expect(lineItems[1].gstAmount).toBe(1800);
      expect(lineItems[1].totalAmount).toBe(11800);

      // Sports 9%+9% (450+450)
      expect(lineItems[2].name).toBe("Sports Fee");
      expect(lineItems[2].baseAmount).toBe(5000);
      expect(lineItems[2].gstRate).toBe(18);
      expect(lineItems[2].cgstRate).toBe(9);
      expect(lineItems[2].cgstAmount).toBe(450);
      expect(lineItems[2].sgstRate).toBe(9);
      expect(lineItems[2].sgstAmount).toBe(450);
      expect(lineItems[2].gstAmount).toBe(900);
      expect(lineItems[2].totalAmount).toBe(5900);

      // Library 0%+0% (0+0)
      expect(lineItems[3].name).toBe("Library Fee");
      expect(lineItems[3].baseAmount).toBe(2000);
      expect(lineItems[3].gstRate).toBe(0);
      expect(lineItems[3].cgstRate).toBe(0);
      expect(lineItems[3].cgstAmount).toBe(0);
      expect(lineItems[3].sgstRate).toBe(0);
      expect(lineItems[3].sgstAmount).toBe(0);
      expect(lineItems[3].gstAmount).toBe(0);
      expect(lineItems[3].totalAmount).toBe(2000);

      // Transport 2.5%+2.5% (200+200)
      expect(lineItems[4].name).toBe("Transport Fee");
      expect(lineItems[4].baseAmount).toBe(8000);
      expect(lineItems[4].gstRate).toBe(5);
      expect(lineItems[4].cgstRate).toBe(2.5);
      expect(lineItems[4].cgstAmount).toBe(200);
      expect(lineItems[4].sgstRate).toBe(2.5);
      expect(lineItems[4].sgstAmount).toBe(200);
      expect(lineItems[4].gstAmount).toBe(400);
      expect(lineItems[4].totalAmount).toBe(8400);

      const sumTax = lineItems.reduce((s, i) => s + i.gstAmount, 0);
      const sumBase = lineItems.reduce((s, i) => s + i.baseAmount, 0);
      const sumTotal = lineItems.reduce((s, i) => s + i.totalAmount, 0);
      const sumCgst = lineItems.reduce((s, i) => s + i.cgstAmount, 0);
      const sumSgst = lineItems.reduce((s, i) => s + i.sgstAmount, 0);

      expect(sumBase).toBe(75000);
      expect(sumTax).toBe(3100);
      expect(sumCgst).toBe(1550);
      expect(sumSgst).toBe(1550);
      expect(sumTotal).toBe(78100);
    });

    it("allocates line items proportionally across 2 installments without drift", () => {
      // 2 installments of 39,050: base 37,500, tax 1,550 (CGST 775, SGST 775)
      const lineItems1 = allocateLineItemsForInstallment({
        components,
        installment: {
          amount: 39050,
          baseAmount: 37500,
          gstAmount: 1550,
        },
      });

      expect(lineItems1).toHaveLength(5);
      expect(lineItems1[0].name).toBe("Tuition Fee");
      expect(lineItems1[0].baseAmount).toBe(25000);
      expect(lineItems1[0].gstAmount).toBe(0);

      expect(lineItems1[1].name).toBe("Laboratory Fee");
      expect(lineItems1[1].baseAmount).toBe(5000);
      expect(lineItems1[1].cgstRate).toBe(9);
      expect(lineItems1[1].cgstAmount).toBe(450);
      expect(lineItems1[1].sgstRate).toBe(9);
      expect(lineItems1[1].sgstAmount).toBe(450);
      expect(lineItems1[1].gstAmount).toBe(900);

      expect(lineItems1[2].name).toBe("Sports Fee");
      expect(lineItems1[2].baseAmount).toBe(2500);
      expect(lineItems1[2].cgstRate).toBe(9);
      expect(lineItems1[2].cgstAmount).toBe(225);
      expect(lineItems1[2].sgstRate).toBe(9);
      expect(lineItems1[2].sgstAmount).toBe(225);
      expect(lineItems1[2].gstAmount).toBe(450);

      expect(lineItems1[3].name).toBe("Library Fee");
      expect(lineItems1[3].baseAmount).toBe(1000);
      expect(lineItems1[3].gstAmount).toBe(0);

      expect(lineItems1[4].name).toBe("Transport Fee");
      expect(lineItems1[4].baseAmount).toBe(4000);
      expect(lineItems1[4].cgstRate).toBe(2.5);
      expect(lineItems1[4].cgstAmount).toBe(100);
      expect(lineItems1[4].sgstRate).toBe(2.5);
      expect(lineItems1[4].sgstAmount).toBe(100);
      expect(lineItems1[4].gstAmount).toBe(200);

      const sumTax = roundToTwoDecimals(lineItems1.reduce((s, i) => s + i.gstAmount, 0));
      const sumBase = roundToTwoDecimals(lineItems1.reduce((s, i) => s + i.baseAmount, 0));
      const sumTotal = roundToTwoDecimals(lineItems1.reduce((s, i) => s + i.totalAmount, 0));
      const sumCgst = roundToTwoDecimals(lineItems1.reduce((s, i) => s + i.cgstAmount, 0));
      const sumSgst = roundToTwoDecimals(lineItems1.reduce((s, i) => s + i.sgstAmount, 0));

      expect(sumTax).toBe(1550);
      expect(sumBase).toBe(37500);
      expect(sumTotal).toBe(39050);
      expect(sumCgst).toBe(775);
      expect(sumSgst).toBe(775);
    });

    it("handles odd installment amounts with zero rounding drift", () => {
      // 3 installments of 26,033.34, 26,033.33, 26,033.33
      const lineItems = allocateLineItemsForInstallment({
        components,
        installment: {
          amount: 26033.33,
          baseAmount: 25000.00,
          gstAmount: 1033.33,
        },
      });

      const sumTax = roundToTwoDecimals(lineItems.reduce((s, i) => s + i.gstAmount, 0));
      const sumBase = roundToTwoDecimals(lineItems.reduce((s, i) => s + i.baseAmount, 0));
      const sumTotal = roundToTwoDecimals(lineItems.reduce((s, i) => s + i.totalAmount, 0));
      const sumCgst = roundToTwoDecimals(lineItems.reduce((s, i) => s + i.cgstAmount, 0));
      const sumSgst = roundToTwoDecimals(lineItems.reduce((s, i) => s + i.sgstAmount, 0));

      expect(sumTax).toBe(1033.33);
      expect(sumBase).toBe(25000.00);
      expect(sumTotal).toBe(26033.33);
      expect(roundToTwoDecimals(sumCgst + sumSgst)).toBe(1033.33);
    });

    it("sets cgstRate/sgstRate to null on mixed-rate aggregate allocation, but retains them for uniform rates", () => {
      // Mixed-rate fee structure: Lab (18%) + Transport (5%)
      const mixedAllocated = allocateTaxToInstallments({
        totalBaseFee: 18000,
        totalTax: 2200,
        installments: [{ name: "Term 1", amount: 20200, order: 1 }],
        components: [
          { name: "Laboratory Fee", baseAmount: 10000, gstRate: 18, gstAmount: 1800 },
          { name: "Transport Fee", baseAmount: 8000, gstRate: 5, gstAmount: 400 },
        ],
      });

      expect(mixedAllocated[0].taxBreakdown.gstRate).toBeNull();
      expect(mixedAllocated[0].taxBreakdown.taxSplit.isUniformRate).toBe(false);
      expect(mixedAllocated[0].taxBreakdown.taxSplit.cgstRate).toBeNull();
      expect(mixedAllocated[0].taxBreakdown.taxSplit.sgstRate).toBeNull();
      expect(mixedAllocated[0].taxBreakdown.taxSplit.cgstAmount).toBe(1100);
      expect(mixedAllocated[0].taxBreakdown.taxSplit.sgstAmount).toBe(1100);

      // Uniform-rate fee structure: Lab (18%) + Sports (18%)
      const uniformAllocated = allocateTaxToInstallments({
        totalBaseFee: 15000,
        totalTax: 2700,
        installments: [{ name: "Term 1", amount: 17700, order: 1 }],
        components: [
          { name: "Laboratory Fee", baseAmount: 10000, gstRate: 18, gstAmount: 1800 },
          { name: "Sports Fee", baseAmount: 5000, gstRate: 18, gstAmount: 900 },
        ],
      });

      expect(uniformAllocated[0].taxBreakdown.gstRate).toBe(18);
      expect(uniformAllocated[0].taxBreakdown.taxSplit.isUniformRate).toBe(true);
      expect(uniformAllocated[0].taxBreakdown.taxSplit.cgstRate).toBe(9);
      expect(uniformAllocated[0].taxBreakdown.taxSplit.sgstRate).toBe(9);
      expect(uniformAllocated[0].taxBreakdown.taxSplit.cgstAmount).toBe(1350);
      expect(uniformAllocated[0].taxBreakdown.taxSplit.sgstAmount).toBe(1350);
    });
  });
});

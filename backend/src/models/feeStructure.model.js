const mongoose = require("mongoose");
const {
  getApprovedComponentRate,
  calculateComponentTax,
  roundToTwoDecimals,
} = require("../utils/gstCalculator");

<<<<<<< HEAD
const feeStructureSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
  },
=======
const FEE_FIELD_CONFIG = [
  { field: "tuitionFee", name: "Tuition Fee", rateKey: "tuition fee" },
  { field: "labFee", name: "Lab Fee", rateKey: "lab fee" },
  { field: "sportsFee", name: "Sports Fee", rateKey: "sports fee" },
  { field: "libraryFee", name: "Library Fee", rateKey: "library fee" },
  { field: "transportFee", name: "Transport Fee", rateKey: "transport fee" },
];

const feeStructureSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
>>>>>>> origin/feature/exam-module
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    category: {
      type: String,
      enum: ["GEN", "OBC", "SC", "ST", "EWS"],
      required: true,
    },
    // Optional: target academic year (e.g. "2025-2026") for year-specific fee structures
    academicYear: {
      type: String,
      default: null,
    },
<<<<<<< HEAD
=======
    tuitionFee: {
      type: Number,
      default: 0,
      min: [0, "Tuition fee cannot be negative"],
    },
    labFee: {
      type: Number,
      default: 0,
      min: [0, "Lab fee cannot be negative"],
    },
    sportsFee: {
      type: Number,
      default: 0,
      min: [0, "Sports fee cannot be negative"],
    },
    libraryFee: {
      type: Number,
      default: 0,
      min: [0, "Library fee cannot be negative"],
    },
    transportFee: {
      type: Number,
      default: 0,
      min: [0, "Transport fee cannot be negative"],
    },
>>>>>>> origin/feature/exam-module
    totalFee: {
      type: Number,
      required: true,
    },
<<<<<<< HEAD
installments: [
        {
          name: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          dueDate: {
            type: Date,
            required: true,
          },
          // Installment order for sequential payment enforcement
          order: {
            type: Number,
            required: true,
          },
        },
      ],
=======
    baseFee: {
      type: Number,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    components: [
      {
        name: {
          type: String,
          required: true,
        },
        baseAmount: {
          type: Number,
          required: true,
        },
        gstRate: {
          type: Number,
          required: true,
        },
        gstAmount: {
          type: Number,
          default: 0,
        },
        totalAmount: {
          type: Number,
          default: function () {
            return (this.baseAmount || 0) + (this.gstAmount || 0);
          },
        },
      },
    ],
    installments: [
      {
        name: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        baseAmount: {
          type: Number,
        },
        gstAmount: {
          type: Number,
          default: 0,
        },
        taxBreakdown: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        dueDate: {
          type: Date,
          required: true,
        },
        // Installment order for sequential payment enforcement
        order: {
          type: Number,
          required: true,
        },
      },
    ],
>>>>>>> origin/feature/exam-module
  },
  { timestamps: true }
);

<<<<<<< HEAD
=======
/**
 * Pre-validate hook:
 * Keeps totalFee, baseFee, totalTax, and components consistent with
 * the five statutory fee fields (tuitionFee, labFee, sportsFee, libraryFee, transportFee).
 * Uses gstCalculator for rates (does not hardcode).
 * Preserves full backward compatibility for legacy documents.
 */
feeStructureSchema.pre("validate", function () {
  const hasExplicitFieldValues = FEE_FIELD_CONFIG.some(
    (f) => typeof this[f.field] === "number" && this[f.field] > 0
  );

  if (hasExplicitFieldValues) {
    const generatedComponents = [];
    let calculatedBase = 0;
    let calculatedTax = 0;

    for (const item of FEE_FIELD_CONFIG) {
      const amount = Number(this[item.field]) || 0;
      if (amount > 0) {
        const rate = getApprovedComponentRate(item.rateKey) ?? 0;
        const taxResult = calculateComponentTax({
          baseAmount: amount,
          gstRate: rate,
        });

        generatedComponents.push({
          name: item.name,
          baseAmount: amount,
          gstRate: rate,
          gstAmount: taxResult.totalTax,
          totalAmount: taxResult.grossAmount,
        });

        calculatedBase = roundToTwoDecimals(calculatedBase + amount);
        calculatedTax = roundToTwoDecimals(calculatedTax + taxResult.totalTax);
      }
    }

    this.components = generatedComponents;
    this.baseFee = calculatedBase;
    this.totalTax = calculatedTax;
    this.totalFee = roundToTwoDecimals(calculatedBase + calculatedTax);
  } else if (Array.isArray(this.components) && this.components.length > 0) {
    let calculatedBase = 0;
    let calculatedTax = 0;

    for (const comp of this.components) {
      calculatedBase = roundToTwoDecimals(calculatedBase + (Number(comp.baseAmount) || 0));
      calculatedTax = roundToTwoDecimals(calculatedTax + (Number(comp.gstAmount) || 0));

      const norm = (comp.name || "").trim().toLowerCase();
      for (const item of FEE_FIELD_CONFIG) {
        if ((norm === item.name.toLowerCase() || norm.includes(item.rateKey)) && !this[item.field]) {
          this[item.field] = Number(comp.baseAmount) || 0;
        }
      }
    }

    if (this.baseFee === undefined || this.baseFee === null) {
      this.baseFee = calculatedBase;
    }
    if (this.totalTax === undefined || this.totalTax === null) {
      this.totalTax = calculatedTax;
    }
    if (this.totalFee === undefined || this.totalFee === null || this.totalFee === 0) {
      this.totalFee = roundToTwoDecimals(calculatedBase + calculatedTax);
    }
  } else {
    // Legacy document without fee fields and without components
    if (this.baseFee === undefined || this.baseFee === null) {
      this.baseFee = this.totalFee || 0;
    }
    if (this.totalTax === undefined || this.totalTax === null) {
      this.totalTax = 0;
    }
  }
});

>>>>>>> origin/feature/exam-module
module.exports = mongoose.model("FeeStructure", feeStructureSchema);
const mongoose = require("mongoose");

/**
 * SupportTicket Model
 * Tracks support tickets raised by Platform Support for college issues
 *
 * Flow: OPEN → IN_PROGRESS → RESOLVED → CLOSED
 * Priority: LOW, MEDIUM, HIGH, CRITICAL
 */
const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: false, // can be null if general system issue
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ["BUG", "FEATURE", "ACCESS", "BILLING", "OTHER"],
      default: "OTHER",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        type: String, // file URLs or paths
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolvedAt: {
      type: Date,
    },
    resolution: {
      type: String,
      trim: true,
    },
    feedback: {
      rating: {
        type: Number, // 1-5 stars
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    collection: "support_tickets",
  }
);

// Indexes for query performance
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ college_id: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1 });

// Generate unique ticket ID before saving
supportTicketSchema.pre("save", async function (next) {
  if (!this.ticketId) {
    const year = new Date().getFullYear();
    const prefix = "SPT";
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    this.ticketId = `${prefix}-${year}-${random}`;
  }
  next();
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);

import mongoose from "mongoose";

const aiinvestmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIAgentPlan",
      required: true,
      index: true,
    },

    investedAmount: {
      type: Number, // ⚠️ Ideally Decimal128
      required: true,
      min: 0,
    },

    investedAt: {
      type: Date,
      default: Date.now,
    },

    maturityDate: {
      type: Date,
      required: true,
      index: true,
    },

    expectedReturn: {
      type: Number,
      required: true,
    },

    // 🔹 ROI Tracking
    dailyProfit: {
      type: Number,
      default: 0,
    },

    totalProfit: {
      type: Number,
      default: 0,
    },

    creditedDays: {
      type: Number,
      default: 0,
    },

    lastRoiDate: {
      type: String, // "YYYY-MM-DD"
      default: null,
      index: true,
    },

    // 🔹 Status flags
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isMatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    isRedeemed: {
      type: Boolean,
      default: false,
      index: true,
    },

    walletType: {
      type: String,
      enum: ["mainWallet", "additionalWallet"],
      required: true,
    },
  },
  { timestamps: true }
);

/**
 * 🔥 Important Compound Indexes
 */

// Active investments for cron
aiinvestmentSchema.index({ isActive: 1, isMatured: 1 });

// Prevent duplicate active investment per plan (optional rule)
aiinvestmentSchema.index(
  { userId: 1, plan: 1, isActive: 1 },
  { unique: false }
);

const AiAgentInvestment = mongoose.model(
  "AiAgentInvestment",
  aiinvestmentSchema
);

export default AiAgentInvestment;

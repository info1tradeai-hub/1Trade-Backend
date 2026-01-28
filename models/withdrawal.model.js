import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    userWalletAddress: {
      type: String,
      required: true,
      trim: true,
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    netAmountSent: {
      type: Number,
      required: true,
    },
    feeAmount: {
      type: Number,
      required: true,
    },
    transactionHash: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "processing", "cancelled"],
      default: "pending",
    },
    networkType: {
      type: String,
      enum: ["BEP20", "TRC20"],
      required: true,
    },
    error: {
      type: String,
      default: "",
    },
    cutoffHours: {
      type: Number,
      required: true, // snapshot of hours at request time
    },

    processableAfter: {
      type: Date,
      required: true, // exact time when withdrawal can be processed
    },

    type: {
      type: String,
      default: "withdrawal",
    },
    walletType: {
      type: String,
      enum: ["mainWallet", "additionalWallet"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;

import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    walletAddress: {
      type: String,
    },
    walletType: {
      type: String,
      enum: ["mainWallet", "additionalWallet", "Trial Amount"],
    },
    depositBy: {
      type: String,
      enum: ["user", "admin", "Trial Amount"],
    },

    type: {
      type: String,
      required: true,
    },
    investmentAmount: {
      type: Number,
      required: true,
    },
    investmentDate: {
      type: Date,
      default: Date.now,
    },
    txResponse: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

investmentSchema.index({ userId: 1 });
const Investment = mongoose.model("Investment", investmentSchema);

export default Investment;

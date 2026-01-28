import mongoose from "mongoose";

const teamCommisionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    commissionAmount: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    commissionPercentage: Number,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);
const Commission = mongoose.model("Commission", teamCommisionSchema);
teamCommisionSchema.index({ userId: 1, createdAt: -1 });
teamCommisionSchema.index({ fromUserId: 1 });
teamCommisionSchema.index({ userId: 1, level: 1 });
teamCommisionSchema.index({ createdAt: -1 });

export default Commission;

import mongoose from "mongoose";

const aroiSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    investment: {
      type: Number,
      default: 0,
    },
    compoundInvestmentAmount: {
      type: Number,
      default: 0,
    },
    roiAmount: {
      type: Number,
      required: true,
    },
    creditedOn: {
      type: Date,
      default: Date.now,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    trackingKey: { type: String, default: "", index: true },

    coinResults: [
      {
        symbol: String,
        fullName: String,
        image: String,
        invested: Number,
        profit: Number,
        returned: Number,
      },
    ],
    claimedOn: {
      type: Date,
      default: null,
    },
    mainWalletUsed: Number,
    bonusWalletUsed: Number,

    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
  },
  {
    timestamps: true,
  },
);
// aroiSchema.index({ userId: 1, isClaimed: 1 });
aroiSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isClaimed: false },
  },
);

aroiSchema.index({ creditedOn: -1 });
aroiSchema.index({ status: 1 });
const Roi = mongoose.model("Roi", aroiSchema);
export default Roi;

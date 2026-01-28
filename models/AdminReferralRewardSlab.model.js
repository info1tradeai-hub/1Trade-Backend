import mongoose from "mongoose";

const referralRewardSlabSchema = new mongoose.Schema(
  {
    referralsRequired: {
      type: Number,
      required: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
    },
    investmentAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const AdminReferralRewardSlab = mongoose.model(
  "AdminReferralRewardSlab",
  referralRewardSlabSchema
);
export default AdminReferralRewardSlab;

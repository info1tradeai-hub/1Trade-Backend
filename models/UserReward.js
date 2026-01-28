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
    level: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const UserReward = mongoose.model("UserReward", referralRewardSlabSchema);
export default UserReward;

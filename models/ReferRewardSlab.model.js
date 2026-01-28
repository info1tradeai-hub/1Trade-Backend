import mongoose from "mongoose";

const referRewardSlabSchema = new mongoose.Schema(
  {
    depositAmount: {
      type: Number,
      required: true,
    },
    rewardAmount: {
      type: Number,
    },
    scheduleAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const ReferRewardSlab = mongoose.model(
  "ReferRewardSlab",
  referRewardSlabSchema
);
export default ReferRewardSlab;

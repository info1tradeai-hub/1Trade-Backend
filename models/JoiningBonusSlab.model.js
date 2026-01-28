import mongoose from "mongoose";

const joiningBonusSlabSchema = new mongoose.Schema(
  {
    depositAmount: {
      type: Number,
      required: true,
    },
    bonusAmount: {
      type: Number,
      required: true,
    },
    scheduleAt: {
      type: Date, 
      required: true,
    },
  },
  { timestamps: true }
);

const JoiningBonusSlab = mongoose.model(
  "JoiningBonusSlab",
  joiningBonusSlabSchema
);
export default JoiningBonusSlab;

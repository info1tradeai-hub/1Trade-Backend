import mongoose from "mongoose";

const withdrawalSlabSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    unique: true,
  },
  perMonthWithdrawalCount: {
    type: Number,
    default: null,
  },
  singleWithdrawalLimit: {
    type: Number,
    default: 0,
  },
  min: {
    type: Number,
    default: 30,
  },
});

const WithdrawalLimit = mongoose.model("WithdrawalLimit", withdrawalSlabSchema);
export default WithdrawalLimit;

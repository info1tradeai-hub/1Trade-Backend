import mongoose, { Schema } from "mongoose";

const withdrawalCounterSchema = new Schema({
  today: {
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
    },
  },
  tomorrow: {
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
    },
  },
});

const WithdrawalCounter = mongoose.model(
  "WithdrawalCounter",
  withdrawalCounterSchema
);

export default WithdrawalCounter;

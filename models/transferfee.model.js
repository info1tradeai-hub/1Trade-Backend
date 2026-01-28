import mongoose from "mongoose";

const transferFeeSchema = new mongoose.Schema(
  {
    fee: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const TransferFee = mongoose.model("TransferFee", transferFeeSchema);

export default TransferFee;

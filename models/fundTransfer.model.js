import mongoose from "mongoose";

const fundTransferSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
    },
    amountSent: {
      type: Number,
      required: true,
    },
    walletType: {
      type: String,
      enum: ["Main Wallet", "Additional Wallet"],
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const FundTransfer = mongoose.model("FundTransfer", fundTransferSchema);

export default FundTransfer;

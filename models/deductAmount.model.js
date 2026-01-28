import mongoose from "mongoose";

const deductSchame = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    type: {
      type: String,
      enum: ["penalty", "reactivation penalty"],
      default: "deposit",
    },
    amount: {
      type: Number,
      default: 0,
    },
    uuid: {
      type: String,
      default: " ",
    },
    walletType: {
      type: String,
      enum: ["mainWallet", "additionalWallet"],
      required: true,
    },
  },
  { timestamps: true }
);

const DeductModel = mongoose.model("DeductModel", deductSchame);

export default DeductModel;

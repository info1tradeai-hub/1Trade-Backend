import mongoose from "mongoose";

const topupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "system gift", "airdrop", "reward"],
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

const TopupModel = mongoose.model("Topup", topupSchema);

export default TopupModel;

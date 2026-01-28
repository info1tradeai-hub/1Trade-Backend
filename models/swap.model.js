import mongoose from "mongoose";

const swapHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  fromWallet: {
    type: String,
    enum: ["mainWallet", "additionalWallet"],
    required: true,
  },
  toWallet: {
    type: String,
    enum: ["mainWallet", "additionalWallet"],
    required: true,
  },
  swapType: {
    type: String,
    enum: ["main_to_additional", "additional_to_main"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SwapModel = mongoose.model("SwapHistory", swapHistorySchema);
export default SwapModel;

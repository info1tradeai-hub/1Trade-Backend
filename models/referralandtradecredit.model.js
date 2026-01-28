import mongoose from "mongoose";

const referralTradeCreditSchema = mongoose.Schema({
  referralCredit: {
    type: Number,
    default: 0,
  },
  tradeCredit: {
    type: Number,
    default: 0,
  },
});

const ReferralTradeCredit = mongoose.model(
  "ReferralTradeCredit",
  referralTradeCreditSchema
);
export default ReferralTradeCredit;

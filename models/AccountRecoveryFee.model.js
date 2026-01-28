import mongoose from "mongoose";

const AccountRecoverySchema = new mongoose.Schema({
    fee: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

const AccountRecoveryFee = mongoose.model("AccountRecoveryFee", AccountRecoverySchema);

export default AccountRecoveryFee;

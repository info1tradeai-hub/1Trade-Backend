import mongoose from "mongoose";

const withdarawalFeeSchema = new mongoose.Schema({
    Trcfee: {
        type: Number,
        default: 0
    },
    Bepfee: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

const WithdrawalFee = mongoose.model("WithdrawalFee", withdarawalFeeSchema)

export default WithdrawalFee;

import mongoose from "mongoose";

const aiAgentFee = new mongoose.Schema({
    fee: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

const AiAgentFee = mongoose.model("aiAgentFee", aiAgentFee)

export default AiAgentFee;

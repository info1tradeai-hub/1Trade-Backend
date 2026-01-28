import mongoose from "mongoose";

const AiTradeCountSchema = new mongoose.Schema({
    count: {
        type: Number,
        default: 30
    }
}, { timestamps: true });

const AiTradeCounter = mongoose.model("AiTradeCounter", AiTradeCountSchema);

export default AiTradeCounter;

import mongoose from "mongoose";
const tokenAvailableSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);
const TokenAvailable = mongoose.model("TokenAvailable", tokenAvailableSchema);
export default TokenAvailable;

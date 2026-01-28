import mongoose from "mongoose";

const withdrawalTimingSchema = new mongoose.Schema(
    {
        withdrawalHour: {
            type: Number,
            default: 96,
        },
    },
    {
        timestamps: true,
    }
);

const WithdrawalHourConfig = mongoose.model("WithdrawalHourConfig", withdrawalTimingSchema)

export default WithdrawalHourConfig;

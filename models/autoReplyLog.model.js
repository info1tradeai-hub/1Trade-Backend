// models/autoReplyLog.model.js
import mongoose from "mongoose";

const autoReplyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    lastSentAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const AutoReplyLog = mongoose.model("AutoReplyLog", autoReplyLogSchema);
export default AutoReplyLog;

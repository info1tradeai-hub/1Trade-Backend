// models/resetConfig.model.js
import mongoose from "mongoose";

const resetConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  lastResetDate: { type: String },
  isRunning: { type: Boolean, default: false },
});

const ResetConfig = mongoose.model("ResetConfig", resetConfigSchema);
export default ResetConfig;

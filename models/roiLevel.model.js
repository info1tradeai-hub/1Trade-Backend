import mongoose from "mongoose";

const roiLevelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    unique: true,
  },
  minInvestment: {
    type: Number,
    required: true,
  },
  maxInvestment: {
    type: Number,
    required: true,
  },
  roi: {
    type: Number,
    required: true,
  },
  minPercent: {
    type: Number,
    default: 0,
  },
  maxPercent: {
    type: Number,
    default: 0,
  },
  teamA: {
    type: Number,
    required: true,
  },
  teamBAndC: {
    type: Number,
    required: true,
  },
});
roiLevelSchema.index({ level: 1 }, { unique: true });

const RoiLevel = mongoose.model("RoiLevel", roiLevelSchema);

export default RoiLevel;

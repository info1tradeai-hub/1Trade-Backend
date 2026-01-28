import mongoose from "mongoose";

const blockConfigSchema = new mongoose.Schema({
  inactiveDays: {
    type: Number,
    default: 4,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

const BlockConfigModel = mongoose.model("BlockConfigModel", blockConfigSchema);
export default BlockConfigModel;

import mongoose from "mongoose";
const dashboardBannerSchema = new mongoose.Schema(
  {
    fileUrl: { type: String, default: null },
    scheduledTime: { type: Date, required: true },
    isActive: {
      type: Boolean,
      default: false,
    },
  },

  { timestamps: true }
);
const DashboardBanner = mongoose.model(
  "DashboardBanner",
  dashboardBannerSchema
);
export default DashboardBanner;

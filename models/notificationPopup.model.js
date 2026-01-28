import mongoose from "mongoose";
const notificationPopupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: null,
    },
    isActive: { type: Boolean, default: false },
    isPopupActive: { type: Boolean, default: false },
    description: { type: String, required: true },
    fileUrl: { type: String, default: null },
    scheduledTime: { type: Date, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const NotificationPopup = mongoose.model(
  "NotificationPopup",
  notificationPopupSchema
);
export default NotificationPopup;

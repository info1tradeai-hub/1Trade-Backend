import DashboardBanner from "../models/dashboardBanner.model.js";
import NotificationPopup from "../models/notificationPopup.model.js";

export const checkAndActivateSchedules = async () => {
  try {
    const now = new Date();
    const notificationToActivate = await NotificationPopup.findOne({
      scheduledTime: { $lte: now },
      isActive: false,
    }).sort({ scheduledTime: -1 });
    if (notificationToActivate) {
      notificationToActivate.isActive = true;
      await notificationToActivate.save();
      //   console.log("🔔 Activated Notification:", notificationToActivate.title);
    }
    const bannerToActivate = await DashboardBanner.findOne({
      scheduledTime: { $lte: now },
      isActive: false,
    }).sort({ scheduledTime: -1 });
    if (bannerToActivate) {
      bannerToActivate.isActive = true;
      await bannerToActivate.save();
      //   console.log("🖼️ Activated Dashboard Banner:", bannerToActivate._id);
    }
  } catch (error) {
    console.error("❌ Schedule check error:", error.message);
  }
};

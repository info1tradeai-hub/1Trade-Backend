import ActivityLog from "../models/activityLog.model.js";

export const createActivityLog = async (adminId, action, details, ip) => {
  try {
    await ActivityLog.create({
      adminId,
      action,
      details,
      ipAddress: ip || null,
    });
  } catch (error) {
    console.error("Activity Log Error:", error.message);
  }
};

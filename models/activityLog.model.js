import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
  action: {
    type: String,
    required: true, // ex: "Login", "Password Reset", "Deposit Address Updated"
  },
  details: {
    type: String, // ex: "Admin Panel Password was reset"
  },
  ipAddress: {
    type: String, // optional: request se capture karna
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;

import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "admin",
      enum: ["admin"],
    },
    qrCode: {
      type: String,
      default: null,
    },
    otp: {
      type: String,
      default: "",
    },
    otpExpired: {
      type: Date,
      default: null,
    },
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    twoFactorAuthSecret: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);
const Admin = new mongoose.model("Admin", adminSchema);
export default Admin;

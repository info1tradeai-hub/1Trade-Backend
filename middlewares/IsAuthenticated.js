import jwt from "jsonwebtoken";
import crypto from "crypto";
import UserModel from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import blacklistTokenModel from "../models/blacklistToken.model.js";

export const IsAuthenticated = async (req, res, next) => {
  try {
    const token =
      req?.headers?.authorization?.split(" ")[1] || req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "🚫 No token provided." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Optional: Check if token is blacklisted
    const isBlacklisted = await blacklistTokenModel.findOne({
      token: hashedToken,
    });
    if (isBlacklisted) {
      return res
        .status(401)
        .json({ message: "🚫 Token blacklisted. Please login again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: "❌ Invalid token." });
    }

    const user =
      (await UserModel.findById(decoded.id)) ||
      (await Admin.findById(decoded.id));

    if (!user) {
      return res.status(401).json({ message: "❌ User not found." });
    }

    if (user.isAdminLoginBlock) {
      return res.status(401).json({
        message:
          "🚫 Your account has been blocked by admin. Please contact support.",
      });
    }

    // Check if token matches currentToken (single device login)
    if (user.currentToken && user.currentToken !== hashedToken) {
      return res.status(401).json({
        message:
          "🚫 Session expired. You have been logged out from another device.",
      });
    }

    req.user = user;
    if (user.role === "admin") {
      const admin = await Admin.findById(user._id);
      req.admin = admin;
    }

    next();
  } catch (error) {
    console.log("IsAuthenticated error:", error);
    return res
      .status(401)
      .json({ message: "❌ Unauthorized", error: error.message });
  }
};

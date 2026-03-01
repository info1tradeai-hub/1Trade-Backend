import UserModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import moment from "moment";
import {
  generate9DigitUUID,
  generateReferralCode,
  randomUsername,
} from "../utils/Random.js";
import Investment from "../models/investment.model.js";
import ReferalBonus from "../models/referalBonus.js";
import DirectreferalPercentage from "../models/incomePercentage.model.js";
import { generateOTP, sendOTP } from "../utils/otp.js";
import Withdrawal from "../models/withdrawal.model.js";
import Commission from "../models/teamIncome.model.js";
import AnnoucementModel from "../models/Annoucement.model.js";
import DepositModel from "../models/deposit.model.js";
import FundTransfer from "../models/fundTransfer.model.js";
import {
  calculateTeams,
  calculateTeamsForDashboardUsers,
} from "../utils/calculateTeam.js";
import { generate2FA, verify2FA } from "../utils/2fa.js";
import nodemailer from "nodemailer";
import cloudinary, { uploadToCloudinary } from "../utils/cloudinary.js";
import AiAgentInvestment from "../models/AIAGENTINVESTMENT.model.js";
import AIAgentPlan from "../models/AIAgentPlan.model.js";
import Support from "../models/support.model.js";
import BonusTrade from "../models/bonusTrade.model.js";
import blacklistTokenModel from "../models/blacklistToken.model.js";
import UnblockUserFeeModel from "../models/unblockUserfee.model.js";
import LevelRequirementSchema from "../models/LevelrequirementSchema.model.js";
import crypto from "crypto";
import Otp from "../models/otp.model.js";
import mongoose from "mongoose";
import Roi from "../models/roi.model.js";
import { v4 as uuidv4 } from "uuid";
import { calculateTeamsforDashboard } from "../utils/calculateTeamforDashboardActiveMember.js";
// import { generateWllet } from "../utils/walletUtils.js";
import SwapModel from "../models/swap.model.js";
import ReferRewardSlab from "../models/ReferRewardSlab.model.js";
import { distributeCommissions } from "../utils/distributeLevelIncomeUpto6LevelBasedOnRoiORAnyIncome.js";
import addAmount from "../utils/RoundValue.js";
import WithdrawalFee from "../models/withdrawalfee.model.js";
import AiAgentFee from "../models/aiagentfee.model.js";
import TransferFee from "../models/transferfee.model.js";
import TopupModel from "../models/adminMainWalletTopup.js";
import JoiningBonusSlab from "../models/JoiningBonusSlab.model.js";
import UserRewardModel from "../models/userReward.model.js";
import DeductModel from "../models/deductAmount.model.js";
import DashboardBanner from "../models/dashboardBanner.model.js";
import AdminInfo from "../models/adminInfo.model.js";
import NotificationPopup from "../models/notificationPopup.model.js";
import BlockConfigModel from "../models/BlockConfigsetting.model.js";
import UserHistory from "../models/userHistory.model.js";
import UserMessage from "../models/userMessage.model.js";

// const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4CAF50&color=fff&size=256`;

const findAvailablePosition = async (parentId) => {
  const queue = [parentId];

  while (queue.length > 0) {
    const currentUserId = queue.shift();
    const currentUser = await UserModel.findById(currentUserId);

    if (!currentUser) continue;

    if (!currentUser.left) {
      return { parent: currentUser._id, position: "left" };
    }
    queue.push(currentUser.left);

    if (!currentUser.right) {
      return { parent: currentUser._id, position: "right" };
    }
    queue.push(currentUser.right);
  }

  return null;
};
export const userRegisterWithEmail = async (req, res) => {
  try {
    const { username, countryCode, email, password, phone, referredBy, otp } =
      req.body;
    console.log(req.body);

    const emails = email.toLowerCase();
    const { name, value } = countryCode;

    // ✅ OTP check
    const otpRecord = await Otp.findOne({ email: emails });
    if (
      !otpRecord ||
      otpRecord.otp !== otp ||
      otpRecord.otpExpire < Date.now()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    const existingUserByEmail = await UserModel.findOne({ email: emails });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // ✅ Check username already taken
    const existingUserByUsername = await UserModel.findOne({
      username: username,
    });
    if (existingUserByUsername) {
      return res
        .status(400)
        .json({ success: false, message: "Username already taken" });
    }

    // ✅ Count total users
    const userCount = await UserModel.countDocuments();
    const hashedPassword = await bcrypt.hash(password, 10);

    const referralCode = generateReferralCode();

    let sponsorUser = null;
    let placement = null;
    const deposit = await DirectreferalPercentage.findOne();
    const bonus = deposit?.Bonus || 0;

    // ✅ Referral logic
    if (userCount > 0) {
      if (!referredBy) {
        return res
          .status(400)
          .json({ success: false, message: "Referral ID is required" });
      }

      sponsorUser = await UserModel.findOne({ referralCode: referredBy });
      if (!sponsorUser) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid referral ID" });
      }

      placement = await findAvailablePosition(sponsorUser._id);
      if (!placement) {
        return res
          .status(400)
          .json({ success: false, message: "No available position found" });
      }
    }

    // ✅ Generate avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      username,
    )}&background=4CAF50&color=fff&size=256`;

    const bonusExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const newUser = await UserModel.create({
      email: emails,
      password: hashedPassword,
      BonusCredit: bonus,
      bonusAddedAt: Date.now(),
      bonusExpiresAt: bonusExpiry,
      username: username,
      phone,
      countryName: name,
      countryCode: value,
      uuid: (await generate9DigitUUID()).toUpperCase(),
      referralCode,
      otpVerified: true,
      bonusResetAt: null,
      role: "user",
      profilePicture: avatarUrl,
      ...(userCount > 0 && {
        sponsorId: sponsorUser._id,
        parentId: placement.parent,
        position: placement.position,
        parentReferedCode: referredBy,
      }),
    });

    // ✅ Create bonus investment
    await Investment.create({
      userId: newUser._id,
      walletAddress: "default-bonus-wallet",
      type: "Trial Amount",
      investmentAmount: 200,
      txResponse: `BONUS-${uuidv4()}`,
      walletType: "mainWallet",
      depositBy: "Trial Amount",
    });

    // ✅ Update sponsor and placement if not first user
    if (userCount > 0) {
      await UserModel.findByIdAndUpdate(sponsorUser._id, {
        $addToSet: { referedUsers: newUser._id },
      });

      await UserModel.findByIdAndUpdate(placement.parent, {
        [placement.position]: newUser._id,
      });
    }

    // ✅ Delete OTP after successful register
    await Otp.deleteOne({ email: emails });

    // ✅ JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "3h",
    });

    return res
      .cookie("token", token, {
        expires: new Date(Date.now() + 3 * 60 * 60 * 1000),
        httpOnly: true,
        secure: false,
      })
      .status(201)
      .json({
        success: true,
        message: "User registered successfully",
        user: newUser,
        token,
      });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const userLogin = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email or username and password are required",
      });
    }

    return res.status(200).json({
      message: `We are currently undergoing a system upgrade to improve our services.The platform is temporarily under maintenance. We will notify you as soon as it is back online.`,
    });
    // 🔥 normalize input
    const loginValue = email.trim().toLowerCase();

    // 🔥 case-insensitive search
    const user = await UserModel.findOne({
      $or: [
        { email: { $regex: `^${loginValue}$`, $options: "i" } },
        { username: { $regex: `^${loginValue}$`, $options: "i" } },
      ],
    }).populate("referedUsers");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isAdminLoginBlock) {
      return res.status(403).json({
        success: false,
        message:
          "Due to invalid activity account is blocked, contact support for help.",
      });
    }

    if (user.isLoginBlocked) {
      const days = await BlockConfigModel.findOne();
      return res.status(403).json({
        success: false,
        message: `Your account is temporarily blocked because there was no activity for ${days?.inactiveDays} days.`,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is blocked due to too many failed login attempts. Please reset your password.",
      });
    }

    // 🔐 password check
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.isBlocked = true;
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: user.isBlocked
          ? "Account blocked after 5 failed attempts."
          : `Invalid credentials. Remaining attempts: ${
              5 - user.failedLoginAttempts
            }`,
      });
    }

    // ✅ success login
    user.failedLoginAttempts = 0;
    user.lastLoginDate = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "3h",
    });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    user.currentToken = hashedToken;
    await user.save();

    res
      .cookie("token", token, {
        expires: new Date(Date.now() + 3 * 60 * 60 * 1000),
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      })
      .status(200)
      .json({
        success: true,
        token,
        data: user,
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const userLogout = async (req, res) => {
  try {
    const userId = req.user._id;
    const token = req.headers.authorization?.split(" ")[1] || req.cookies.token;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "No token found" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Clear currentToken in DB
    user.currentToken = null;
    await user.save();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Blacklist the token
    await blacklistTokenModel.create({
      token: crypto.createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(decoded.exp * 1000),
    });

    res.clearCookie("token").status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};
export const sendOtpToEmailRegistartion = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required for Send Otp" });
    }
    const otp = generateOTP();
    const otpExpire = Date.now() + 5 * 60 * 1000;
    await sendOTP(email, otp);
    await Otp.findOneAndUpdate(
      { email },
      { otp, otpExpire },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};
export const sendOtpToChangeEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required for Send Otp" });
    }
    const otp = generateOTP();
    const otpExpire = Date.now() + 5 * 60 * 1000;
    await sendOTP(email, otp);
    await Otp.findOneAndUpdate(
      { email },
      { otp, otpExpire },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const otpExpiryTime = user.otpExpire;
    if (new Date() > new Date(otpExpiryTime)) {
      return res.status(400).json({ message: "OTP expired" });
    }
    user.otpVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res
      .cookie("token", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: false,
        sameSite: "none",
      })
      .status(200)
      .json({ message: "OTP verified successfully", token });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const getAllDownlines = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) return [];

  let downlines = [];

  if (user.left) {
    downlines.push(user.left);
    downlines = downlines.concat(await getAllDownlines(user.left));
  }

  if (user.right) {
    downlines.push(user.right);
    downlines = downlines.concat(await getAllDownlines(user.right));
  }

  return downlines;
};

export const getDownLines = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authorized",
      });
    }

    const downlineIds = await getAllDownlines(userId);

    const downlineUsers = await UserModel.find({
      _id: { $in: downlineIds },
    }).select("username");

    res.status(200).json({
      success: true,
      total: downlineUsers.length,
      data: downlineUsers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getUsersCountByLevel = async (req, res) => {
  try {
    const userId = req.user._id;

    let levelCounts = [];
    let currentLevelUsers = [userId];
    const visited = new Set();

    for (let level = 1; level <= 10; level++) {
      const users = await UserModel.find(
        { _id: { $in: currentLevelUsers } },
        { referedUsers: 1 },
      );

      let nextLevelUserIds = [];

      users.forEach((user) => {
        if (user.referedUsers && user.referedUsers.length > 0) {
          user.referedUsers.forEach((refId) => {
            const idStr = refId.toString();
            if (!visited.has(idStr)) {
              visited.add(idStr);
              nextLevelUserIds.push(refId);
            }
          });
        }
      });

      const nextLevelUsers = await UserModel.find(
        { _id: { $in: nextLevelUserIds } },
        {
          username: 1,
          referralCode: 1,
          walletAddress: 1,
          totalInvestment: 1,
        },
      );

      levelCounts.push({
        level,
        count: nextLevelUsers.length,
        users: nextLevelUsers,
      });

      currentLevelUsers = nextLevelUserIds;
    }

    res.status(200).json({
      success: true,
      data: levelCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const userProfile =
      await UserModel.findById(userId).populate("referedUsers");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      message: "profile fetched successfully",
      data: userProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getAllWithdrawalsRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const withdrawals = await Withdrawal.find({ userId }).populate("userId");
    res.status(200).json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const withdrawalRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { amount, userWalletAddress } = req.body;
    if (!amount || !userWalletAddress) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }
    if (user.currentEarnings < amount) {
      return res.status(400).json({
        message: "Insufficient balance",
        success: false,
      });
    }

    const withdrawal = await Withdrawal.create({
      userId,
      amount,
      userWalletAddress,
      status: "pending",
    });
    await withdrawal.save();
    user.currentEarnings -= Number(amount);
    user.totalWithdrawals += Number(amount);
    user.save();
    res.status(200).json({
      success: true,
      message: "Withdrawal request sent successfully",
      data: withdrawal,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const withdrawal = await Withdrawal.findById(id).populate("userId");
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found",
      });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Withdrawal already processed",
      });
    }

    withdrawal.status = "success";
    withdrawal.adminNote = message || "Approved by admin";
    await withdrawal.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal approved successfully",
      data: withdrawal,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};
export const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const withdrawal = await Withdrawal.findById(id).populate("userId");
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found",
      });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Withdrawal already processed",
      });
    }

    withdrawal.status = "rejected";
    withdrawal.adminNote = message || "Rejected by admin";
    await withdrawal.save();

    // Return user's money back
    const user = await UserModel.findById(withdrawal.userId._id);
    user.currentEarnings += withdrawal.amount;
    user.totalWithdrawals -= withdrawal.amount;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal rejected successfully",
      data: withdrawal,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};
export const changeWalletAddress = async (req, res) => {
  try {
    const { walletAddress, password, otp } = req.body;
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "User not Found",
        success: true,
      });
    }

    if (!walletAddress || !password || !otp) {
      return res.status(400).json({
        error: "All fields (walletAddress, password, otp) are required",
      });
    }
    const user = await UserModel.findOne({ userId });
    if (!user) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const isOtpValid = verifyOTP(user, otp);
    if (!isOtpValid) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.walletAddress = walletAddress;
    user.otp = null;
    user.otpExpire = null;
    user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await user.save();

    res.status(200).json({ message: "Wallet address changed successfully" });
  } catch (error) {
    // console.error(error);

    res
      .status(500)
      .json({ error: "An error occurred while changing the wallet address" });
  }
};
export const sendOTPForChangeAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const email = user.email;
    if (!email) {
      return res.status(400).json({
        message: "Email not found for the user",
        success: false,
      });
    }

    const otp = generateOTP();
    const otpExpire = new Date();
    otpExpire.setMinutes(otpExpire.getMinutes() + 5);

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    const emailSent = await sendOTP(email, otp, user.name);
    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP to email",
        success: false,
      });
    }

    res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({
      message: error.message || "Sending OTP Error",
      success: false,
    });
  }
};
export const getAllReferralHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "User is Unauthorized",
        success: false,
      });
    }
    const allHistory = await ReferalBonus.find({ userId });
    if (!allHistory || allHistory.length === 0) {
      return res.status(200).json({
        message: "No Referral History Found",
        success: true,
      });
    }
    return res.status(200).json({
      message: "Referral History Fetched Successfully",
      success: true,
      data: allHistory,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Referral History Getting Errors",
    });
  }
};
export const getAllLevelIncomeHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "User is Unauthorized",
        success: false,
      });
    }

    const allLevelHistory = await Commission.find({ userId });

    if (!allLevelHistory || allLevelHistory.length === 0) {
      return res.status(404).json({
        message: "No income history found",
        success: false,
      });
    }

    res.status(200).json({
      message: "Income history fetched successfully",
      success: true,
      data: allLevelHistory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};
export const getAllHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "User Unautorized",
        success: false,
      });
    }
    const referralHistory = await ReferalBonus.find({ userId });
    const LevelIncomeHistory = await Commission.find({ userId });
    if (!LevelIncomeHistory || LevelIncomeHistory.length === 0) {
      return res.status(200).json({
        message: "No Level History Found",
        success: true,
      });
    }
    if (!referralHistory || referralHistory.length === 0) {
      return res.status(200).json({
        message: "Referral History Not Found",
        success: true,
      });
    }
    const data = [...referralHistory, ...LevelIncomeHistory];
    return res.status(200).json({
      message: "All History Fetched SuccessFully",
      success: true,
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in Getting All History",
      success: false,
    });
  }
};
export const getAllAnoucement = async (req, res) => {
  try {
    const allAnnoucement = await AnnoucementModel.find({});
    if (!allAnnoucement || !allAnnoucement.length === 0) {
      return res.status(200).json({
        message: "No Announced exists",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Annoucement Fetched Successfully",
      success: false,
      data: allAnnoucement,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in Getting Announcement Fetching",
      success: false,
    });
  }
};
export const generate2FAHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const user = await UserModel.findOne({ email });

    if (user.twoFASecret) {
      return res.status(400).json({
        message: "2FA is already enabled for this user",
        success: false,
      });
    }

    const { secret, qrCode } = await generate2FA(email);

    return res.status(200).json({ secret, qrCode, success: true });
  } catch (error) {
    // console.error("2FA Generation Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
export const verify2FAHandler = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res
        .status(400)
        .json({ error: "OTP and Email are required", success: false });
    }

    const verified = await verify2FA(email, otp);

    if (verified) {
      return res.status(200).json({ verified: true, success: true });
    } else {
      return res
        .status(401)
        .json({ verified: false, success: false, error: "Invalid OTP" });
    }
  } catch (error) {
    // console.error("2FA Verification Error:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", success: false });
  }
};
// export const initialInvestment = async (req, res) => {
//   try {
//     const { investmentAmount, txResponse, walletAddress } = req.body;
//     const userId = req.user?._id;

//     if (!userId || investmentAmount == null || !txResponse || !walletAddress) {
//       console.log("❌ Missing required fields");
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     const user = await UserModel.findById(userId);
//     if (!user) {
//       console.log("❌ User not found");
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const existingInvestment = await Investment.findOne({ txResponse });
//     if (existingInvestment) {
//       return res.status(409).json({
//         success: false,
//         message: "This transaction has already been processed",
//         investment: existingInvestment,
//       });
//     }

//     const currentDate = new Date();
//     const amount = Number(investmentAmount);

//     const investment = await Investment.create({
//       userId,
//       investmentAmount: amount,
//       walletAddress,
//       txResponse,
//       investmentDate: currentDate,
//       type: "Deposit",
//       walletType: "mainWallet",
//       depositBy: "user",
//     });

//     console.log("✅ Investment created:", investment._id);

//     const depositConfig = await DepositModel.findOne({});
//     if (!depositConfig || depositConfig.amount == null) {
//       console.log("❌ Deposit config not found");
//       return res.status(500).json({
//         success: false,
//         message: "Deposit configuration not found",
//       });
//     }

//     const configAmount = Number(depositConfig.amount);

//     // ==============================
//     // JOINING BONUS LOGIC (before wallet update)
//     // ==============================
//     // ==============================
//     // ✅ CHECK FIRST DEPOSIT
//     // ==============================
//     const isFirstDeposit = user.mainWallet === 0;
//     let joiningBonusGiven = false;

//     // ==============================
//     // JOINING BONUS (only first deposit)
//     // ==============================
//     if (
//       isFirstDeposit &&
//       !user.isjoiningBonusGiven &&
//       !user.isJoiningBonusGetFirstTime
//     ) {
//       const joiningBonusSlab = await JoiningBonusSlab.findOne({
//         depositAmount: { $lte: amount },
//       }).sort({ depositAmount: -1 });

//       if (joiningBonusSlab && joiningBonusSlab.bonusAmount > 0) {
//         const bonus = joiningBonusSlab.bonusAmount;
//         user.mainWallet += bonus;
//         user.mainRewards = (user.mainRewards || 0) + bonus;
//         user.todayMainWalletRewards =
//           (user.todayMainWalletRewards || 0) + bonus;
//         user.isjoiningBonusGiven = true;
//         user.isJoiningBonusGetFirstTime = true;
//         joiningBonusGiven = true;

//         await user.save();

//         await UserRewardModel.create({
//           userId: user._id,
//           amount: bonus,
//           message: `Joining bonus of $${bonus} for deposit of $${amount}`,
//           type: "joining",
//         });
//       }
//     }

//     // ==============================
//     // REFERRAL BONUS (only first deposit)
//     // ==============================
//     if (
//       isFirstDeposit &&
//       joiningBonusGiven &&
//       user.sponsorId &&
//       !user.isReferralGet
//     ) {
//       const parentUser = await UserModel.findById(user.sponsorId);

//       if (parentUser) {
//         const rewardSlab = await ReferRewardSlab.findOne({
//           depositAmount: { $lte: amount },
//         }).sort({ depositAmount: -1 });

//         if (rewardSlab) {
//           const referralBonus = rewardSlab.rewardAmount;

//           parentUser.directReferalAmount = addAmount(
//             parentUser.directReferalAmount,
//             referralBonus
//           );
//           parentUser.totalEarnings = addAmount(
//             parentUser.totalEarnings,
//             referralBonus
//           );
//           parentUser.currentEarnings = addAmount(
//             parentUser.currentEarnings,
//             referralBonus
//           );
//           parentUser.totalEarningsInCycle = addAmount(
//             parentUser.totalEarningsInCycle,
//             referralBonus
//           );
//           parentUser.mainWallet = addAmount(
//             parentUser.mainWallet,
//             referralBonus
//           );
//           parentUser.mainRewards = addAmount(
//             parentUser.mainRewards,
//             referralBonus
//           );
//           parentUser.todayMainWalletRewards = addAmount(
//             parentUser.todayMainWalletRewards,
//             referralBonus
//           );

//           await parentUser.save();

//           user.isReferralGet = true;
//           await user.save();

//           await ReferalBonus.create({
//             userId: parentUser._id,
//             fromUser: user._id,
//             amount: referralBonus,
//             investmentId: investment._id,
//             date: currentDate,
//           });
//         }
//       }
//     }
//     // ==============================
//     // CHECK LEVEL 2 REQUIREMENTS
//     // ==============================
//     let meetsLevel2Partial = false;
//     if (user.level === 1) {
//       const level2Req = await LevelRequirementSchema.findOne({ level: 2 });

//       if (level2Req) {
//         const { teamA, teamB, teamC } = await calculateTeams(user._id);
//         console.log("Teams:", {
//           teamA: teamA.length,
//           teamB: teamB.length,
//           teamC: teamC.length,
//         });

//         const validA = teamA.filter(
//           (m) => m.isVerified && m.mainWallet >= 30
//         ).length;
//         const validBC = [...teamB, ...teamC].filter(
//           (m) => m.isVerified && m.mainWallet >= 30
//         ).length;

//         console.log("Valid A:", validA, "Valid BC:", validBC);

//         if (
//           (user.aiCredits || 0) >= level2Req.aiCredits &&
//           validA >= level2Req.activeA &&
//           validBC >= level2Req.activeBC
//         ) {
//           meetsLevel2Partial = true;
//         }
//       }
//     }

//     // ==============================
//     // WALLET LOGIC
//     // ==============================
//     console.log("Wallet logic start, current level:", user.level);
//     if (user.level === 0 || user.level === 1) {
//       if (meetsLevel2Partial) {
//         user.mainWallet += amount;
//         user.roiInvestedLevel2 += amount;
//       } else {
//         const maxLimit = configAmount;
//         const totalUsed =
//           user.depositMainWallet + (user.withdrawalPendingAmount || 0);
//         const mainWalletRoom = Math.max(0, maxLimit - totalUsed);

//         const toMainWallet = amount > mainWalletRoom ? mainWalletRoom : amount;
//         const toAdditionalWallet = amount - toMainWallet;

//         user.mainWallet += toMainWallet;
//         user.depositMainWallet += toMainWallet;
//         user.additionalWallet += toAdditionalWallet;
//         user.mainWalletPrinciple =
//           (user.mainWalletPrinciple || 0) + toMainWallet;
//         user.additionalWalletPrinciple =
//           (user.additionalWalletPrinciple || 0) + toAdditionalWallet;
//         user.principleAmount = (user.principleAmount || 0) + amount;

//         // ROI calculation
//         const roiEligibleRoom = Math.max(
//           0,
//           maxLimit - user.roiMaxEligibleInvestment
//         );
//         const toRoiEligible =
//           toMainWallet > roiEligibleRoom ? roiEligibleRoom : toMainWallet;
//         user.roiMaxEligibleInvestment += toRoiEligible;
//       }
//     } else {
//       user.mainWallet += amount;
//       user.currentEarnings += amount;
//       user.roiInvestedLevel2 += amount;
//     }

//     user.totalInvestment += amount;
//     user.investments.push(investment._id);
//     user.isVerified = true;
//     user.status = true;
//     user.activeDate = currentDate;
//     user.walletAddress = walletAddress;

//     // ==============================
//     // ROI COMPOUNDING CYCLE INIT
//     // ==============================
//     if (!user.currentCycleBase || user.currentCycleBase === 0) {
//       user.currentCycleBase = amount;
//       user.totalEarningsInCycle = 0;
//       user.cycleCount = 0;
//       user.cycleStartDate = currentDate;
//     } else {
//       user.currentCycleBase += amount;
//     }

//     await user.save();

//     return res.status(201).json({
//       success: true,
//       message: "Investment successful",
//       investment,
//     });
//   } catch (error) {
//     console.error("initialInvestment error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

export const initialInvestment = async (req, res) => {
  try {
    const { investmentAmount, txResponse, walletAddress } = req.body;
    const userId = req.user?._id;

    if (!userId || investmentAmount == null || !txResponse || !walletAddress) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingInvestment = await Investment.findOne({ txResponse });
    if (existingInvestment) {
      return res.status(409).json({
        success: false,
        message: "This transaction has already been processed",
        investment: existingInvestment,
      });
    }

    const currentDate = new Date();
    const amount = Number(investmentAmount);

    const investment = await Investment.create({
      userId,
      investmentAmount: amount,
      walletAddress,
      txResponse,
      investmentDate: currentDate,
      type: "Deposit",
      walletType: "mainWallet",
      depositBy: "user",
    });

    console.log("✅ Investment created:", investment._id);

    const depositConfig = await DepositModel.findOne({});
    if (!depositConfig || depositConfig.amount == null) {
      console.log("❌ Deposit config not found");
      return res.status(500).json({
        success: false,
        message: "Deposit configuration not found",
      });
    }

    const configAmount = Number(depositConfig.amount);

    // ==============================
    // JOINING BONUS LOGIC (before wallet update)
    // ==============================
    // ==============================
    // ✅ CHECK FIRST DEPOSIT
    // ==============================
    const isFirstDeposit = user.mainWallet === 0;
    let joiningBonusGiven = false;

    // ==============================
    // JOINING BONUS (only first deposit)
    // ==============================
    if (
      isFirstDeposit &&
      !user.isjoiningBonusGiven &&
      !user.isJoiningBonusGetFirstTime
    ) {
      const joiningBonusSlab = await JoiningBonusSlab.findOne({
        depositAmount: { $lte: amount },
      }).sort({ depositAmount: -1 });

      if (joiningBonusSlab && joiningBonusSlab.bonusAmount > 0) {
        const bonus = joiningBonusSlab.bonusAmount;
        user.mainWallet += bonus;
        user.mainRewards = (user.mainRewards || 0) + bonus;
        user.todayMainWalletRewards =
          (user.todayMainWalletRewards || 0) + bonus;
        user.isjoiningBonusGiven = true;
        user.isJoiningBonusGetFirstTime = true;
        joiningBonusGiven = true;

        await user.save();

        await UserRewardModel.create({
          userId: user._id,
          amount: bonus,
          message: `Joining bonus of $${bonus} for deposit of $${amount}`,
          type: "joining",
        });
      }
    }

    // ==============================
    // 🔁 REFERRAL BONUS (FIRST DEPOSIT)
    // ==============================
    console.log("🧪 Referral Check:", {
      isFirstDeposit,
      sponsorId: user.sponsorId,
      isReferralGet: user.isReferralGet,
      amount,
    });

    if (isFirstDeposit && user.sponsorId && !user.isReferralGet) {
      const parentUser = await UserModel.findById(user.sponsorId);

      if (!parentUser) {
        console.log("❌ Sponsor user not found");
      } else {
        console.log("✅ Sponsor found:", parentUser._id);

        const rewardSlab = await ReferRewardSlab.findOne({
          depositAmount: { $lte: amount },
        }).sort({ depositAmount: -1 });

        console.log("🧪 Referral Slab:", rewardSlab);

        if (!rewardSlab) {
          console.log("❌ No referral slab matched for amount:", amount);
        } else {
          const referralBonus = rewardSlab.rewardAmount;

          console.log("💰 Referral Bonus:", referralBonus);

          parentUser.mainWallet = addAmount(
            parentUser.mainWallet,
            referralBonus,
          );
          parentUser.directReferalAmount = addAmount(
            parentUser.directReferalAmount,
            referralBonus,
          );
          parentUser.totalEarnings = addAmount(
            parentUser.totalEarnings,
            referralBonus,
          );
          parentUser.mainRewards = addAmount(
            parentUser.mainRewards,
            referralBonus,
          );
          parentUser.currentEarnings = addAmount(
            parentUser.currentEarnings,
            referralBonus,
          );
          parentUser.todayMainWalletRewards = addAmount(
            parentUser.todayMainWalletRewards,
            referralBonus,
          );

          await parentUser.save();

          user.isReferralGet = true;
          await user.save();

          await ReferalBonus.create({
            userId: parentUser._id,
            fromUser: user._id,
            amount: referralBonus,
            investmentId: investment._id,
            date: currentDate,
          });

          console.log("✅ Referral bonus credited successfully");
        }
      }
    }

    // ==============================
    // CHECK LEVEL 2 REQUIREMENTS
    // ==============================
    let meetsLevel2Partial = false;
    if (user.level === 1) {
      const level2Req = await LevelRequirementSchema.findOne({ level: 2 });

      if (level2Req) {
        const { teamA, teamB, teamC } = await calculateTeams(user._id);
        console.log("Teams:", {
          teamA: teamA.length,
          teamB: teamB.length,
          teamC: teamC.length,
        });

        const validA = teamA.filter(
          (m) => m.isVerified && m.mainWallet >= 30,
        ).length;
        const validBC = [...teamB, ...teamC].filter(
          (m) => m.isVerified && m.mainWallet >= 30,
        ).length;

        console.log("Valid A:", validA, "Valid BC:", validBC);

        if (
          (user.aiCredits || 0) >= level2Req.aiCredits &&
          validA >= level2Req.activeA &&
          validBC >= level2Req.activeBC
        ) {
          meetsLevel2Partial = true;
        }
      }
    }

    // ==============================
    // WALLET LOGIC
    // ==============================
    console.log("Wallet logic start, current level:", user.level);
    if (user.level === 0 || user.level === 1) {
      if (meetsLevel2Partial) {
        user.mainWallet += amount;
        user.roiInvestedLevel2 += amount;
      } else {
        const maxLimit = configAmount;
        const totalUsed =
          user.depositMainWallet + (user.withdrawalPendingAmount || 0);
        const mainWalletRoom = Math.max(0, maxLimit - totalUsed);

        const toMainWallet = amount > mainWalletRoom ? mainWalletRoom : amount;
        const toAdditionalWallet = amount - toMainWallet;

        user.mainWallet += toMainWallet;
        user.depositMainWallet += toMainWallet;
        user.additionalWallet += toAdditionalWallet;
        user.mainWalletPrinciple =
          (user.mainWalletPrinciple || 0) + toMainWallet;
        user.additionalWalletPrinciple =
          (user.additionalWalletPrinciple || 0) + toAdditionalWallet;
        user.principleAmount = (user.principleAmount || 0) + amount;

        // ROI calculation
        const roiEligibleRoom = Math.max(
          0,
          maxLimit - user.roiMaxEligibleInvestment,
        );
        const toRoiEligible =
          toMainWallet > roiEligibleRoom ? roiEligibleRoom : toMainWallet;
        user.roiMaxEligibleInvestment += toRoiEligible;
      }
    } else {
      user.mainWallet += amount;
      user.currentEarnings += amount;
      user.roiInvestedLevel2 += amount;
    }

    user.totalInvestment += amount;
    user.investments.push(investment._id);
    user.isVerified = true;
    user.status = true;
    user.walletAddress = walletAddress;

    // ==============================
    // ROI COMPOUNDING CYCLE INIT
    // ==============================
    if (!user.currentCycleBase || user.currentCycleBase === 0) {
      user.currentCycleBase = amount;
      user.totalEarningsInCycle = 0;
      user.cycleCount = 0;
      user.cycleStartDate = currentDate;
    } else {
      user.currentCycleBase += amount;
    }

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Investment successful",
      investment,
    });
  } catch (error) {
    console.error("initialInvestment error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { emailOtp, newPassword, email } = req.body;
    if (!emailOtp || !newPassword || !email) {
      return res
        .status(400)
        .json({ message: "All fields are required", success: false });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (!user.otp || user.otp !== emailOtp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (user.otpExpire && new Date() > new Date(user.otpExpire)) {
      return res
        .status(400)
        .json({ message: "OTP has expired", success: false });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const oldPassword = user.password;

    // Update user password
    user.password = hashedPassword;
    user.failedLoginAttempts = 0;
    user.isBlocked = false;
    user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    // Log password change in history
    await UserHistory.create({
      userId: user._id,
      changedBy: null, // null = self
      oldData: { password: oldPassword },
      newData: { password: hashedPassword },
      changes: [
        { field: "password", oldValue: "********", newValue: "********" },
      ],
      changedAt: new Date(),
    });

    return res.status(200).json({
      message:
        "Password changed successfully. Withdrawal blocked for 72 hours.",
      success: true,
      data: {
        withdrawalBlockedUntil: user.withdrawalBlockedUntil,
      },
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "Server Error", success: false });
  }
};

export const swapAmount = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    let { amount, walletType, emailOtp } = req.body;

    if (!amount || !walletType || !emailOtp) {
      return res.status(400).json({
        message: "Amount, walletType and OTP are required",
        success: false,
      });
    }

    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
        success: false,
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // OTP check
    if (user.otp !== emailOtp || user.otpExpire < Date.now()) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        success: false,
      });
    }

    const { teamA, teamB, teamC } = await calculateTeams(user._id);

    const validA = teamA.filter(
      (m) => m.level >= 1 && m.mainWallet >= 30,
    ).length;
    const validBC = [...teamB, ...teamC].filter(
      (m) => m.level >= 1 && m.mainWallet >= 30,
    ).length;

    if ((user.aiCredits || 0) < 100 || validA < 2 || validBC < 5) {
      return res.status(400).json({
        message: "Meet 2nd level requirements to use swap feature",
        success: false,
      });
    }

    let fromWallet, toWallet, fromLabel, toLabel;

    if (walletType === "additional_to_main") {
      fromWallet = "additionalWallet";
      toWallet = "mainWallet";
      fromLabel = "Additional Wallet";
      toLabel = "Main Wallet";
    } else if (walletType === "main_to_additional") {
      fromWallet = "mainWallet";
      toWallet = "additionalWallet";
      fromLabel = "Main Wallet";
      toLabel = "Additional Wallet";
    } else {
      return res.status(400).json({
        message: "Invalid walletType",
        success: false,
      });
    }

    // ---- Balance Check ----
    const fromBalance = Number(user[fromWallet]);
    const toBalance = Number(user[toWallet]);

    if (fromBalance < amount) {
      return res.status(400).json({
        message: `Insufficient balance in ${fromLabel}`,
        success: false,
      });
    }

    // ---- Perform Swap ----
    user[fromWallet] = fromBalance - amount;
    user[toWallet] = toBalance + amount;

    await user.save();

    await SwapModel.create({
      userId: user._id,
      amount,
      fromWallet,
      toWallet,
      swapType: walletType,
    });

    return res.status(200).json({
      success: true,
      message: `$${amount} swapped successfully from ${fromLabel} to ${toLabel}`,
      mainWallet: Number(user.mainWallet),
      additionalWallet: Number(user.additionalWallet),
    });
  } catch (error) {
    console.error("Swap Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const getAllTradeHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "User not Authorized",
        success: false,
      });
    }

    let { page = 1, limit = 10 } = req.query;
    // console.log("Pagination params:", { page, limit });
    // console.log("Pagination :", req.query);
    page = Number(page);
    limit = Math.min(Number(limit), 50);

    const skip = (page - 1) * limit;

    const [tradeHistory, total] = await Promise.all([
      Roi.find({ userId, isClaimed: true })
        .sort({ creditedOn: -1 })
        .skip(skip)
        .limit(limit),
      Roi.countDocuments({ userId, isClaimed: true }),
    ]);
    console.log("Trade history fetched:", tradeHistory.length, "Total:", total);
    return res.status(200).json({
      success: true,
      message: "Trade history fetched",
      data: tradeHistory,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error fetching trade history",
      success: false,
    });
  }
};

export const allIncomes = async (req, res) => {
  const userId = req.user._id;

  if (!userId) {
    return res.status(401).json({
      message: "User not Authorized",
      success: false,
    });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const levelIncome = await Commission.find({ userId });
    const withdrawalIncome = await Withdrawal.find({ userId });
    const directReferralIncome = await ReferalBonus.find({ userId });

    const totalIncome =
      levelIncome.reduce((sum, income) => sum + income.amount, 0) +
      withdrawalIncome.reduce((sum, income) => sum + income.amount, 0) +
      directReferralIncome.reduce((sum, income) => sum + income.amount, 0);

    const todayLevelIncome = levelIncome
      .filter(
        (income) =>
          new Date(income.date).setHours(0, 0, 0, 0) === today.getTime(),
      )
      .reduce((sum, income) => sum + income.amount, 0);

    const todayWithdrawalIncome = withdrawalIncome
      .filter(
        (income) =>
          new Date(income.date).setHours(0, 0, 0, 0) === today.getTime(),
      )
      .reduce((sum, income) => sum + income.amount, 0);

    const todayDirectReferralIncome = directReferralIncome
      .filter(
        (income) =>
          new Date(income.date).setHours(0, 0, 0, 0) === today.getTime(),
      )
      .reduce((sum, income) => sum + income.amount, 0);

    const todayTotalIncome =
      todayLevelIncome + todayWithdrawalIncome + todayDirectReferralIncome;

    return res.status(200).json({
      success: true,
      data: {
        totalIncome,
        todayTotalIncome,
        todayLevelIncome,
        todayWithdrawalIncome,
        todayDirectReferralIncome,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching income data",
      success: false,
      error: error.message,
    });
  }
};
export const withdrawalHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User is unauthorized",
        success: false,
      });
    }

    const history = await Withdrawal.find({ userId });

    if (history.length === 0) {
      return res.status(200).json({
        message: "No history found",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Withdraw history fetched successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in fetching withdrawal history",
      success: false,
    });
  }
};
export const depositHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User is unauthorized",
        success: false,
      });
    }

    const history = await Investment.find({ userId }).populate(
      "userId",
      "username",
    );

    if (history.length === 0) {
      return res.status(200).json({
        message: "No history found",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Deposit history fetched successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in fetching withdrawal history",
      success: false,
    });
  }
};
export const LevelIncomeHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User is unauthorized",
        success: false,
      });
    }

    const history = await Commission.find({ userId })
      .populate("userId", "username")
      .populate("fromUserId", "username");

    if (history.length === 0) {
      return res.status(200).json({
        message: "No history found",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "LevelIncome history fetched successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in fetching LevelIncome history",
      success: false,
    });
  }
};
export const ReferralIncomeHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User is unauthorized",
        success: false,
      });
    }

    const history = await ReferalBonus.find({ userId })
      .populate("userId", "username")
      .populate("fromUser", "username")
      .populate("investmentId", "investmentAmount");
    if (history.length === 0) {
      return res.status(200).json({
        message: "No history found",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Referral history fetched successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in Referral history",
      success: false,
    });
  }
};
export const getAllFundTransferHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const history = await FundTransfer.find({ from: userId }).populate(
      "to",
      "username",
    );

    if (history.length === 0) {
      return res.status(200).json({
        message: "No fund transfer history found",
        success: true,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Fund history fetched successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in getting fund transfer history",
      success: false,
    });
  }
};
export const sendOtpForPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found for this email",
        success: false,
      });
    }

    const otp = generateOTP();
    const otpExpire = new Date();
    otpExpire.setMinutes(otpExpire.getMinutes() + 5);

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    await sendOTP(user.email, otp, user.username);
    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Sending OTP Error",
      success: false,
    });
  }
};
export const verifyOtpForPassword = async (req, res) => {
  try {
    const { otp, email, password } = req.body;

    if (!otp || !email || !password) {
      return res.status(400).json({
        message: "OTP & Email are required",
        success: false,
      });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found for this email",
        success: false,
      });
    }

    if (!user.otp || !user.otpExpire || new Date() > user.otpExpire) {
      return res.status(400).json({
        message: "OTP expired or not valid",
        success: false,
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
        success: false,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isBlocked = false;
    user.failedLoginAttempts = 0;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    return res.status(200).json({
      message: "OTP verified successfully and Password reset Successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error verifying OTP",
      success: false,
    });
  }
};
const sortByLatest = (arr = []) =>
  arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const sortByLatestValid = (arr = []) =>
  arr.sort((a, b) => new Date(b.activeDate) - new Date(a.activeDate));

export const getMemeberAndTeamData = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { startDate, endDate } = req.body.date || {};

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User not Authorized",
      });
    }

    const { teamA, teamB, teamC } = await calculateTeamsForDashboardUsers(
      userId,
      startDate,
      endDate,
    );

    return res.status(200).json({
      success: true,
      message: "Team Data fetched successfully",
      data: {
        totalRegister: sortByLatest([
          ...teamA.register,
          ...teamB.register,
          ...teamC.register,
        ]),
        totalValid: sortByLatestValid([
          ...teamA.valid,
          ...teamB.valid,
          ...teamC.valid,
        ]),

        teamARegister: teamA.register,
        teamAValid: teamA.valid,

        teamBRegister: teamB.register,
        teamBValid: teamB.valid,

        teamCRegister: teamC.register,
        teamCValid: teamC.valid,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMemeberAndTeamDataforDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const startDate = req.body.date?.startDate;
    const endDate = req.body.date?.endDate;

    if (!userId) {
      return res.status(400).json({
        message: "User not Authorized",
        success: false,
      });
    }

    const allUsers = await UserModel.find({ sponsorId: userId });
    if (!allUsers || !allUsers.length) {
      return res.status(200).json({
        message: "No Team Found for this user",
        success: false,
      });
    }

    const { teamA, teamB, teamC, totalTeamBC } =
      await calculateTeamsforDashboard(userId, startDate, endDate);

    return res.status(200).json({
      message: "Team Data fetched successfully",
      success: true,
      data: {
        teamA: teamA.length,
        teamB: teamB.length,
        teamC: teamC.length,
        totalTeamBC,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Getting Error in getMember Data",
      success: false,
    });
  }
};
export const sendOtpForMoneyTransfer = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(400).json({
        message: "User not Found",
        success: false,
      });
    }

    const username = user.username;
    const email = user.email;

    const otp = Math.floor(100000 + Math.random() * 900000);

    await sendOTP(email, otp, username);

    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (error) {
    // console.error("Error sending OTP:", error);
    return res.status(500).json({
      message: "Something went wrong while sending OTP",
      success: false,
      error: error.message,
    });
  }
};

export const transferAmountToAnotherUser = async (req, res) => {
  try {
    const transferUserId = req.user._id;
    if (!transferUserId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const { amount, fee, username, emailOtp, authOtp, walletType } = req.body;

    if (!amount || !username || !emailOtp || !authOtp || !walletType) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const sender = await UserModel.findById(transferUserId);
    if (!sender) {
      return res
        .status(404)
        .json({ message: "Sender not found", success: false });
    }

    if (sender.transferBlock) {
      return res.status(400).json({
        message:
          "Due to invalid activity your transfer is blocked, Contact support for help",
      });
    }

    if (
      sender.withdrawalBlockedUntil &&
      sender.withdrawalBlockedUntil > new Date()
    ) {
      const formattedDate = sender.withdrawalBlockedUntil.toLocaleString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        },
      );

      return res.status(403).json({
        success: false,
        message: `Transfer is blocked for 72 hours due to your last change. You can initiate transfer after ${formattedDate}.`,
      });
    }

    // const { teamA, teamB, teamC } = await calculateTeams(sender._id);
    // const validDirectMembers = teamA.filter(
    //   (m) => m.isVerified && m.mainWallet >= 30,
    // ).length;
    // const validBCMembers = [...teamB, ...teamC].filter(
    //   (m) => m.isVerified && m.mainWallet >= 30,
    // ).length;

    // if (sender.totalTradeCount < 5 || validDirectMembers < 2) {
    //   return res.status(400).json({
    //     message:
    //       "You need at least 5 trades and 2 valid direct members (active with fund) to start transfers.",
    //     success: false,
    //   });
    // }

    // const meetsUnlimitedCriteria =
    //   sender.aiCredits >= 100 &&
    //   validDirectMembers >= 2 &&
    //   validBCMembers >= 5 &&
    //   sender.mainWallet >= 30;

    // if (!meetsUnlimitedCriteria) {
    //   if ((sender.transferCount || 0) >= 2) {
    //     return res.status(400).json({
    //       message:
    //         "You have reached your 2 transfer limit. To unlock unlimited transfers, meet 2nd level requirements.",
    //       success: false,
    //     });
    //   }

    //   // Yaha basic mode me amount limit check
    //   if (Number(amount) > 100) {
    //     return res.status(400).json({
    //       message:
    //         "maximum $100 transfer is allowed per transaction. To unlock unlimited transfers, meet 2nd level requirements.",
    //       success: false,
    //     });
    //   }
    // }

    const isValidOtp = await verify2FA(sender.email, authOtp);
    if (!isValidOtp) {
      return res
        .status(400)
        .json({ message: "Invalid Google Authenticator OTP", success: false });
    }

    if (
      sender.otp !== emailOtp ||
      !sender.otpExpire ||
      sender.otpExpire < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired email OTP", success: false });
    }

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const monthlyTransferCount = await FundTransfer.countDocuments({
      from: sender._id,
      createdAt: { $gte: startOfMonth },
    });

    if (monthlyTransferCount >= 1) {
      return res.status(400).json({
        message: "You can only transfer once per month.",
        success: false,
      });
    }
    // -------- Receiver Validation --------
    const receiver = await UserModel.findOne({ uuid: username });
    if (!receiver) {
      return res
        .status(404)
        .json({ message: "Receiver not found", success: false });
    }

    if (receiver._id.toString() === sender._id.toString()) {
      return res.status(400).json({
        message: "You cannot transfer funds to your own account.",
        success: false,
      });
    }

    // -------- Amount Calculations --------
    const transferAmount = Number(amount);
    const transferFee = Number(fee);
    const sendableAmount = transferAmount - transferFee;

    if (transferAmount !== 50) {
      return res.status(400).json({
        message: "Transfer amount must be exactly $50.",
        success: false,
      });
    }

    if (sendableAmount <= 0) {
      return res.status(400).json({
        message: "Transfer amount must be greater than the fee",
        success: false,
      });
    }
    if (sendableAmount <= 0) {
      return res.status(400).json({
        message: "Transfer amount must be greater than the fee",
        success: false,
      });
    }

    // -------- Wallet Type Handling --------
    if (walletType === "main-to-additional") {
      if (sender.mainWallet < transferAmount) {
        return res.status(400).json({
          message: "Insufficient main wallet balance",
          success: false,
        });
      }
      sender.mainWallet -= transferAmount;
      sender.mainFund += transferAmount;
    } else if (walletType === "additional-to-main") {
      if (sender.additionalWallet < transferAmount) {
        return res.status(400).json({
          message: "Insufficient additional wallet balance",
          success: false,
        });
      }
      sender.additionalWallet -= transferAmount;
      sender.additionalFund += transferAmount;
    } else {
      return res
        .status(400)
        .json({ message: "Invalid wallet type", success: false });
    }

    // -------- Receiver Level Check --------
    const level = receiver.level || 0;
    if (level !== 0) {
      return res.status(400).json({
        message: "Amount can only be transferred to new users",
        success: false,
      });
    }
    const depositConfig = await DepositModel.findOne({});
    const maxEligible = Number(depositConfig?.amount) || 0;
    // const mainRoom = Math.max(0, maxEligible - receiver.mainWallet);
    // const toMain = sendableAmount > mainRoom ? mainRoom : sendableAmount;
    // const toAdd = sendableAmount - toMain;

    // receiver.mainWallet += toMain;
    // receiver.additionalWallet += toAdd;
    // receiver.principleAmount = (receiver.principleAmount || 0) + sendableAmount;
    // receiver.depositMainWallet =
    //   (receiver.depositMainWallet || 0) + sendableAmount;
    // receiver.isVerified = true;
    // receiver.isTransferActive = true;
    // receiver.status = true;
    // receiver.roiMaxEligibleInvestment =
    //   (receiver.roiMaxEligibleInvestment || 0) + toMain;

    const maxLimit = maxEligible;
    const mainWalletRoom = Math.max(0, maxLimit - receiver.depositMainWallet);

    const toMainWallet =
      sendableAmount > mainWalletRoom ? mainWalletRoom : sendableAmount;
    const toAdditionalWallet = sendableAmount - toMainWallet;

    receiver.mainWallet += toMainWallet;
    receiver.depositMainWallet += toMainWallet;

    receiver.mainWalletPrinciple =
      (receiver.mainWalletPrinciple || 0) + toMainWallet;
    receiver.additionalWallet += toAdditionalWallet;

    receiver.principleAmount = (receiver.principleAmount || 0) + sendableAmount;
    const roiEligibleRoom = Math.max(
      0,
      maxLimit - receiver.roiMaxEligibleInvestment,
    );
    const toRoiEligible =
      toMainWallet > roiEligibleRoom ? roiEligibleRoom : toMainWallet;
    receiver.roiMaxEligibleInvestment += toRoiEligible;

    sender.otp = null;
    sender.otpExpire = null;

    // if (!meetsUnlimitedCriteria) {
    //   sender.transferCount = (sender.transferCount || 0) + 1;
    // }

    sender.isJoiningBonusGetFirstTime = true;
    sender.isjoiningBonusGiven = true;
    await sender.save();
    receiver.isJoiningBonusGetFirstTime = true;
    receiver.isjoiningBonusGiven = true;
    await receiver.save();

    // -------- Log Transfer --------
    await FundTransfer.create({
      amount: transferAmount,
      from: sender._id,
      to: receiver._id,
      walletType:
        walletType === "main-to-additional"
          ? "Main Wallet"
          : "Additional Wallet",
      fee: transferFee,
      amountSent: sendableAmount,
    });

    return res.status(200).json({
      message: "Amount transferred successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error during transfer",
      success: false,
    });
  }
};

export const sendInvitation = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res
        .status(400)
        .json({ success: false, message: "Email and name are required." });
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    7;
    const mailOptions = {
      from: `"1Trade" <${process.env.EMAIL}>`,
      to: email,
      subject: "🎉 You're Invited to Join Our Platform!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: auto; background-color: white; padding: 30px; border-radius: 8px;">
            <h2 style="color: #333;">Hey ${name},</h2>
            <p style="font-size: 16px;">You've been invited to join our platform! Click the button below to get started:</p>
            <a href="https://www.youtube.com" style="display: inline-block; padding: 12px 24px; margin-top: 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
            <p style="margin-top: 20px; font-size: 14px; color: #777;">If you did not expect this email, you can safely ignore it.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: `Invitation sent successfully to ${email}`,
    });
  } catch (error) {
    // console.error("Error sending invitation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send invitation.",
      error: error.message,
    });
  }
};
export const reset2FAHandler = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const { secret, qrCode } = await generate2FA(user.email, true);

    return res.status(200).json({
      success: true,
      message: "2FA reset successfully. Scan QR code again.",
      qrCode,
      secret,
    });
  } catch (error) {
    // console.error("Reset 2FA Error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};
// export const supportMessage = async (req, res) => {
//   try {
//     const { uuid, username, subject, description } = req.body;

//     if (!uuid || !username || !subject || !description) {
//       return res.status(400).json({
//         success: false,
//         message: "User, subject and message are required.",
//       });
//     }

//     let images = [];
//     console.log("Images:", req.files);

//     if (req.files && req.files.length > 0) {
//       const uploadPromises = req.files.map((file) => uploadToCloudinary(file));
//       images = await Promise.all(uploadPromises);
//     }
//     const newSupport = await Support.create({
//       uuid,
//       username,
//       subject,
//       description,
//       file: images,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Support message submitted successfully.",
//       data: newSupport,
//     });
//   } catch (error) {
//     console.error("Error in supportMessage:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error. Please try again later.",
//     });
//   }
// };

export const supportMessage = async (req, res) => {
  try {
    const { uuid, username, subject, description } = req.body;

    if (!uuid || !username || !subject || !description) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (uuid, username, subject, description) are required.",
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingTicket = await Support.findOne({
      uuid,
      username,
      status: "Pending",
    });

    if (existingTicket) {
      return res.status(409).json({
        success: false,
        message:
          "Your previous support ticket is still pending. Please wait for resolution before creating a new one.",
        ticketId: existingTicket._id,
      });
    }

    console.log("📥 Files received from frontend:", req.files);

    let fileUploads = [];
    if (req.files && req.files.length > 0) {
      console.log("📤 Uploading to Cloudinary...");
      fileUploads = await Promise.all(
        req.files.map(async (file) => {
          console.log("➡️ File local path:", file.path);
          const uploaded = await uploadToCloudinary(file);
          console.log("✔️ Cloudinary upload result:", uploaded);
          return uploaded;
        }),
      );
    }

    console.log("🗂 Final File Data to Insert in DB:", fileUploads);

    const newSupport = await Support.create({
      uuid,
      username,
      subject,
      description,
      status: "Pending",
      file: fileUploads,
    });

    console.log("📌 New Support Ticket Created:", newSupport._id);

    return res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully.",
      data: newSupport,
    });
  } catch (error) {
    console.error("❌ Error in supportMessage:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Try again later.",
    });
  }
};

export const getAllSuppoertMessages = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(401).json({
        message: "User Id is required",
      });
    }
    const history = await Support.find({ uuid: userId });
    if (!history || history.length === 0) {
      return res.status(200).json({
        message: "History not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "History fetched successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in getting Support Messages",
      success: false,
    });
  }
};

// export const AiAgentInvestInPlan = async (req, res) => {
//   try {
//     const { planId, investmentAmount, walletType } = req.body;
//     const userId = req.user._id;

//     if (!planId || !investmentAmount || !walletType) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "All fields (userId, planId, investedAmount, walletType) are required",
//       });
//     }

//     const validWallets = ["mainWallet", "additionalWallet"];
//     if (!validWallets.includes(walletType)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid wallet type" });
//     }

//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     const plan = await AIAgentPlan.findById(planId);
//     if (!plan) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Plan not found" });
//     }

//     if (
//       investmentAmount < plan.minInvestment ||
//       investmentAmount > plan.maxInvestment
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: `Investment must be between ${plan.minInvestment} and ${plan.maxInvestment}`,
//       });
//     }

//     // Deduct amount from the respective wallet
//     if (walletType === "mainWallet") {
//       if (parseFloat(user.mainWallet.toFixed(2)) < investmentAmount) {
//         return res.status(400).json({
//           success: false,
//           message: "Insufficient balance in Main Wallet",
//         });
//       }
//       user.mainWallet -= investmentAmount;
//     } else if (walletType === "additionalWallet") {
//       if (parseFloat(user.additionalWallet.toFixed(2)) < investmentAmount) {
//         return res.status(400).json({
//           success: false,
//           message: "Insufficient balance in Additional Wallet",
//         });
//       }

//       user.additionalWallet -= investmentAmount;
//     }

//     await user.save();

//     const expectedReturn =
//       investmentAmount +
//       ((investmentAmount * plan.incomePercent) / 100) *
//         (plan.durationInDays / 30);

//     // Set maturity date
//     const maturityDate = new Date();
//     maturityDate.setDate(maturityDate.getDate() + plan.durationInDays);

//     const newInvestment = await AiAgentInvestment.create({
//       userId,
//       plan: planId,
//       investedAmount: investmentAmount,
//       expectedReturn,
//       maturityDate,
//       walletType,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Investment successful",
//       data: newInvestment,
//     });
//   } catch (error) {
//     console.error("Investment error:", error.message);
//     res
//       .status(500)
//       .json({ success: false, message: "Server error: " + error.message });
//   }
// };

export const AiAgentInvestInPlan = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { planId, investmentAmount, walletType } = req.body;
    const userId = req.user._id;

    if (!planId || !investmentAmount || !walletType) {
      throw new Error("planId, investmentAmount and walletType are required");
    }

    if (!["mainWallet", "additionalWallet"].includes(walletType)) {
      throw new Error("Invalid wallet type");
    }

    if (investmentAmount <= 0) {
      throw new Error("Invalid investment amount");
    }

    // 1️⃣ Load user with wallet only
    const user = await UserModel.findById(
      userId,
      "mainWallet additionalWallet",
    ).session(session);

    if (!user) throw new Error("User not found");

    // 2️⃣ Load plan
    const plan = await AIAgentPlan.findById(planId).session(session);
    if (!plan) throw new Error("Plan not found");

    if (!plan.isActive) {
      throw new Error("This plan is currently inactive");
    }

    if (
      investmentAmount < plan.minInvestment ||
      investmentAmount > plan.maxInvestment
    ) {
      throw new Error(
        `Investment must be between ${plan.minInvestment} and ${plan.maxInvestment}`,
      );
    }

    // 3️⃣ Wallet balance check
    if (user[walletType] < investmentAmount) {
      throw new Error(`Insufficient balance in ${walletType}`);
    }

    // 4️⃣ Deduct wallet (atomic)
    await UserModel.updateOne(
      { _id: userId },
      { $inc: { [walletType]: -investmentAmount } },
      { session },
    );

    // 5️⃣ Correct expected return (daily ROI based)
    const dailyROI = (investmentAmount * plan.incomePercent) / 100;
    const expectedReturn = investmentAmount + dailyROI * plan.durationInDays;

    // 6️⃣ Maturity date
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + plan.durationInDays);

    // 7️⃣ Create investment
    const investment = await AiAgentInvestment.create(
      [
        {
          userId,
          plan: planId,
          investedAmount: investmentAmount,
          expectedReturn,
          maturityDate,
          walletType,
          isActive: true,
          isMatured: false,
          totalProfit: 0,
          dailyProfit: 0,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "AI Agent investment successful",
      data: investment[0],
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("AI Agent Invest Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Investment failed",
    });
  } finally {
    session.endSession();
  }
};

export const setWalletAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }
    const { walletAddress } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    if (user.walletAddress) {
      return res.status(200).json({
        message: "You have already connected your wallet",
        success: false,
      });
    }

    user.walletAddress = walletAddress;
    user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await user.save();

    return res.status(200).json({
      message: "Wallet address connected successfully",
      success: true,
    });
  } catch (error) {
    // console.error("Error updating wallet address:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
export const sendOTPForBep20Address = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const email = user.email;
    if (!email) {
      return res.status(400).json({
        message: "Email not found for the user",
        success: false,
      });
    }

    const otp = generateOTP();
    const otpExpire = new Date();
    otpExpire.setMinutes(otpExpire.getMinutes() + 5);

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    await sendOTP(email, otp, user.username);

    res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({
      message: error.message || "Sending OTP Error",
      success: false,
    });
  }
};
export const verifyOTPForWallet = async (email, otp) => {
  try {
    if (!email || !otp) {
      return { success: false, message: "Email and OTP are required" };
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (user.otp !== otp) {
      return { success: false, message: "Invalid OTP" };
    }

    const otpExpiryTime = user.otpExpire;
    if (new Date() > new Date(otpExpiryTime)) {
      return { success: false, message: "OTP has expired" };
    }

    // OTP is valid — mark as verified and clear
    user.otpVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    // console.error("verifyOTPForWallet error:", error);
    return { success: false, message: "Internal Server Error" };
  }
};
export const setBep20 = async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailCode, loginPassword, authOtp, walletAddress } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    // ✅ Validate wallet address format
    const bep20Regex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletAddress || !bep20Regex.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BEP-20 wallet address format",
      });
    }
    const existingUser = await UserModel.findOne({
      bep20Address: walletAddress,
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This BEP-20 wallet address is already exits",
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isOtpValid = await verifyOTPForWallet(user.email, emailCode);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid email verification code",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      loginPassword,
      user.password,
    );
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Incorrect login password",
      });
    }

    const is2FAValid = await verify2FA(user.email, authOtp);
    if (!is2FAValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid 2FA code",
      });
    }
    const blockTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
    user.withdrawalBlockedUntil = blockTime;
    user.bep20Address = walletAddress;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "✅ BEP-20 wallet address updated successfully",
      bep20Address: user.bep20Address,
    });
  } catch (error) {
    console.error("❌ Error setting BEP-20 address:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const setTrc20 = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { emailCode, loginPassword, authOtp, walletAddress } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    // TRC-20 address validation
    const trc20Regex = /^T[a-zA-Z0-9]{33}$/;
    if (!walletAddress || !trc20Regex.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid TRC-20 wallet address format",
      });
    }

    // 🛑 Check if walletAddress is already used by another user
    const existingUser = await UserModel.findOne({
      trc20Address: walletAddress,
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This TRC-20 wallet address is already exits",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "User email not available",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      loginPassword,
      user.password,
    );
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Incorrect login password",
      });
    }

    if (
      !user.otp ||
      user.otp !== emailCode ||
      !user.otpExpire ||
      user.otpExpire < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired email verification code",
      });
    }

    const is2FAValid = await verify2FA(user.email, authOtp);
    if (!is2FAValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid 2FA code",
      });
    }

    user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
    user.otp = null;
    user.otpExpire = null;
    user.trc20Address = walletAddress;
    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "✅ TRC-20 wallet address updated successfully, withdrawal blocked for 72 hours",
    });
  } catch (error) {
    console.error("Error in setTrc20:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const getAllAiPlans = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const allPlans = await AIAgentPlan.find({}).sort({ createdAt: 1 });

    return res.status(200).json({
      message: "All AI Plans fetched successfully",
      success: true,
      plans: allPlans,
    });
  } catch (error) {
    // console.error("Error in getAllAiPlans:", error.message);
    return res.status(500).json({
      message: "Error in getting AI trade plans",
      success: false,
    });
  }
};
export const getAllAiPlansById = async (req, res) => {
  try {
    const userId = req.user._id;
    const planId = req.params.id;
    if (!planId) {
      return res.status(400).json({
        message: "Plan ID is required",
        success: false,
      });
    }

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const allPlans = await AIAgentPlan.findById(planId);
    const data =
      (await AiAgentInvestment.findOne({
        userId: userId,
        plan: planId,
        isActive: true,
      })) || {};

    return res.status(200).json({
      message: "AI Plan fetched successfully",
      success: true,
      plans: allPlans,
      data,
    });
  } catch (error) {
    // console.error("Error in getAllAiPlans:", error.message);
    return res.status(500).json({
      message: "Error in getting AI trade plans",
      success: false,
    });
  }
};
export const aiAgentInvestment = async (req, res) => {
  try {
    const userId = req.user._id;
    let { planId, investmentAmount, walletType } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!planId || !investmentAmount || !walletType) {
      return res.status(400).json({
        message: "Plan ID, investment amount, and wallet type are required",
        success: false,
      });
    }

    const validWallets = ["mainWallet", "additionalWallet"];
    if (!validWallets.includes(walletType)) {
      return res.status(400).json({
        message: "Invalid wallet type",
        success: false,
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const investedAmount = parseFloat(investmentAmount);
    if (isNaN(investedAmount) || investedAmount <= 0) {
      return res.status(400).json({
        message: "Invalid investment amount",
        success: false,
      });
    }

    if (walletType === "mainWallet" && user.mainWallet < investedAmount) {
      return res.status(400).json({
        message: "Insufficient balance in main wallet",
        success: false,
      });
    }

    if (
      walletType === "additionalWallet" &&
      user.additionalWallet < investedAmount
    ) {
      return res.status(400).json({
        message: "Insufficient balance in additional wallet",
        success: false,
      });
    }

    const plan = await AIAgentPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        message: "Plan not found",
        success: false,
      });
    }

    if (
      investedAmount < plan.minInvestment ||
      investedAmount > plan.maxInvestment
    ) {
      return res.status(400).json({
        message: `Investment amount must be between ${plan.minInvestment} and ${plan.maxInvestment}`,
        success: false,
      });
    }

    if (!plan.durationInDays || plan.durationInDays <= 0) {
      return res.status(400).json({
        message: "Invalid plan duration",
        success: false,
      });
    }

    if (walletType === "mainWallet") {
      user.mainWallet -= investedAmount;
    } else if (walletType === "additionalWallet") {
      user.additionalWallet -= investedAmount;
    }

    await user.save();

    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + plan.durationInDays);

    const expectedReturn =
      investedAmount +
      ((investedAmount * plan.incomePercent) / 100) * plan.durationInDays;

    const newInvestment = await AiAgentInvestment.create({
      userId,
      plan: planId,
      investedAmount,
      maturityDate,
      expectedReturn,
      walletType,
    });

    return res.status(201).json({
      message: "Investment successful",
      success: true,
      investment: newInvestment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while making investment",
      success: false,
      error: error.message,
    });
  }
};

export const getAiAgentInvestmentsForActive = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }
    const plans = await AiAgentInvestment.find({ userId, isActive: true });
    if (plans.length === 0) {
      return res.status(404).json({
        message: "No AI agent investments found for this user",
        success: false,
      });
    }
    return res.status(200).json({
      message: "AI agent investments fetched successfully",
      success: true,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching AI agent investments",
      success: false,
      error: error.message,
    });
  }
};
export const getTeamCount = async (req, res) => {
  const userId = req.user._id;
  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
    });
  }

  try {
    const { teamA, teamB, teamC, totalTeamBC } =
      await calculateTeamsforDashboard(userId);

    return res.status(200).json({
      message: "Team count fetched successfully",
      success: true,
      data: {
        // Total counts
        teamA: teamA.length,
        teamB: teamB.length,
        teamC: teamC.length,
        totalTeamBC,
        totalTeam: teamA.length + teamB.length + teamC.length,
        validTeamA: teamA.length,
        validTeamBC: totalTeamBC,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error fetching team count",
      success: false,
    });
  }
};

// export const transferAiAgentToMainWallet = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { planId } = req.body;

//     if (!planId) {
//       return res.status(400).json({
//         message: "Plan ID is required",
//         success: false,
//       });
//     }

//     const plan = await AiAgentInvestment.findOne({ userId, isActive: true });
//     if (!plan) {
//       return res.status(404).json({
//         message: "Investment not found or unauthorized access",
//         success: false,
//       });
//     }
//     if (!plan.isMatured) {
//       return res.status(400).json({
//         message: "Investment not matured yet. Please wait until maturity date.",
//         success: false,
//       });
//     }

//     if (plan.isRedeemed) {
//       return res.status(400).json({
//         message: "This investment has already been redeemed.",
//         success: false,
//       });
//     }

//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         message: "User not found",
//         success: false,
//       });
//     }

//     const investedAmount = plan.investedAmount;
//     const profit = plan.totalProfit || 0;
//     const walletType = plan.walletType;

//     const fees = await AiAgentFee.findOne();
//     // console.log(fees, "aiagentfeepercentage");
//     // console.log(fees?.fee, "actual fee");
//     // // const deduction = profit * fees?.fee || 0.05;
//     const deduction = profit * ((fees?.fee ?? 5) / 100);
//     const amountToTransfer = profit - deduction;
//     if (!["mainWallet", "additionalWallet"].includes(walletType)) {
//       return res.status(400).json({
//         message: `Invalid wallet type: ${walletType}`,
//         success: false,
//       });
//     }
//     user[walletType] = addAmount(
//       user[walletType] || 0,
//       investedAmount + amountToTransfer
//     );

//     if (walletType === "mainWallet") {
//       user.aiAgentTotal = addAmount(user.aiAgentTotal, amountToTransfer);
//       user.aiAgentDaily = addAmount(user.aiAgentDaily, amountToTransfer);
//     } else {
//       user.additionalAiAgentTotalIncome = addAmount(
//         user.additionalAiAgentTotalIncome,
//         amountToTransfer
//       );
//       user.additionalAiAgentDailyIncome = addAmount(
//         user.additionalAiAgentDailyIncome,
//         amountToTransfer
//       );
//     }

//     await user.save();

//     plan.isRedeemed = true;
//     plan.isActive = false;
//     plan.expectedReturn = 0;
//     plan.investedAmount = 0;
//     plan.totalProfit = 0;
//     plan.dailyProfit = 0;
//     await plan.save();

//     return res.status(200).json({
//       message: `Profit $${amountToTransfer} after ${fees?.fee}% deduction and invested amount $${investedAmount} returned to ${walletType}.`,
//       success: true,
//       transferredProfit: amountToTransfer,
//       returnedInvestment: investedAmount,
//       deducted: deduction,
//     });
//   } catch (error) {
//     console.error("Transfer Error:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       success: false,
//     });
//   }
// };

export const transferAiAgentToMainWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { planId } = req.body;

    if (!planId) {
      throw new Error("Plan ID is required");
    }

    // ===============================
    // 1️⃣ FETCH ACTIVE + NON-REDEEMED PLAN (TX LOCK)
    // ===============================
    const plan = await AiAgentInvestment.findOne({
      plan: planId,
      userId,
      isActive: true,
      isRedeemed: false,
    }).session(session);

    if (!plan) {
      throw new Error("Active investment not found or already redeemed");
    }

    if (!plan.isMatured) {
      throw new Error("Investment not matured yet");
    }

    const { investedAmount, totalProfit = 0, walletType } = plan;

    if (!["mainWallet", "additionalWallet"].includes(walletType)) {
      throw new Error(`Invalid wallet type: ${walletType}`);
    }

    // ===============================
    // 2️⃣ FEE CALCULATION
    // ===============================
    const feeDoc = await AiAgentFee.findOne({}, { fee: 1 }).lean();
    const feePercent = feeDoc?.fee ?? 5;

    const deduction = Number(((totalProfit * feePercent) / 100).toFixed(2));
    const profitAfterFee = Number((totalProfit - deduction).toFixed(2));
    const totalCredit = Number((investedAmount + profitAfterFee).toFixed(2));

    // ===============================
    // 3️⃣ WALLET ATOMIC UPDATE
    // ===============================
    const walletInc = {
      [walletType]: totalCredit,
    };

    if (walletType === "mainWallet") {
      walletInc.aiAgentTotal = profitAfterFee;
      walletInc.aiAgentDaily = profitAfterFee;
    } else {
      walletInc.additionalAiAgentTotalIncome = profitAfterFee;
      walletInc.additionalAiAgentDailyIncome = profitAfterFee;
    }

    const walletUpdate = await UserModel.updateOne(
      { _id: userId },
      { $inc: walletInc },
      { session },
    );

    if (walletUpdate.modifiedCount !== 1) {
      throw new Error("Wallet update failed");
    }

    // ===============================
    // 4️⃣ MARK PLAN AS REDEEMED (NO DELETE)
    // ===============================
    const planUpdate = await AiAgentInvestment.updateOne(
      { _id: plan._id, isRedeemed: false },
      {
        $set: {
          isActive: false,
          isRedeemed: true,
          redeemedAt: new Date(),
        },
      },
      { session },
    );

    if (planUpdate.modifiedCount !== 1) {
      throw new Error("Failed to mark plan as redeemed");
    }

    // ===============================
    // 5️⃣ COMMIT TRANSACTION
    // ===============================
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "AI Agent investment redeemed successfully",
      data: {
        investedAmount,
        totalProfit,
        feePercent,
        deducted: deduction,
        profitAfterFee,
        creditedAmount: totalCredit,
        walletType,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("AI Agent Redeem Error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  } finally {
    session.endSession();
  }
};

export const getAiAgentInvestHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const investments = await AiAgentInvestment.find({
      userId,
      isActive: true,
    }).populate(
      "plan",
      "planName incomePercent durationInDays minInvestment maxInvestment",
    );
    if (!investments || investments.length === 0) {
      return res.status(404).json({
        message: "No AI agent investment history found for this user",
        success: false,
        data: [],
      });
    }
    if (investments.length === 0) {
      return res.status(200).json({
        message: "No AI agent investment history found",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "AI agent investment history fetched successfully",
      success: true,
      data: investments,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error fetching AI agent investment history",
      success: false,
    });
  }
};
export const getDeductionHistory = async (req, res) => {
  try {
    const userId = req.admin._id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const history = await UnblockUserFeeModel.find({})
      .populate("userId", "username")
      .populate("investmentId", "investmentAmount");
    if (history.length === 0) {
      return res.status(200).json({
        message: "No deduction history found",
        success: false,
        data: [],
      });
    }
    return res.status(200).json({
      message: "Deduction history fetched successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error fetching deduction history",
      success: false,
    });
  }
};
export const connectGoogleAuthenticator = async (req, res) => {
  const userId = req.user._id;
  console.log(userId, "scs");
  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
    });
  }
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    const { secret, qrCode } = await generate2FA(user.email, true);
    user.twoFactorAuth = true;
    user.twoFactorAuthSecret = secret;
    user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await user.save();
    return res.status(200).json({
      message: "Google Authenticator connected successfully",
      success: true,
      qrCode,
      secret,
    });
  } catch (error) {
    console.error("Error connecting Google Authenticator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const sendOtpForGoogleAuthenticator = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const email = user.email;
    if (!email) {
      return res.status(400).json({
        message: "Email not found for the user",
        success: false,
      });
    }

    const otp = generateOTP();
    const otpExpire = new Date();
    otpExpire.setMinutes(otpExpire.getMinutes() + 5);

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    const emailSent = await sendOTP(email, otp, user.username);
    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP to email",
        success: false,
      });
    }

    res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Sending OTP Error",
      success: false,
    });
  }
};
export const verifyGoogleAuthenticator = async (req, res) => {
  const userId = req.user._id;
  const { authCode, emailCode } = req.body;
  if (!authCode || !emailCode) {
    return res.status(400).json({
      message: "Both Google Authenticator OTP and email OTP are required",
      success: false,
    });
  }

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
    });
  }
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const isValidOtp = await verify2FA(user.email, authCode);
    if (!isValidOtp) {
      return res.status(400).json({
        message: "Invalid Google Authenticator OTP. Please try again",
        success: false,
      });
    }
    const isEmailOtpValid = await verifyOTPForWallet(user.email, emailCode);
    if (!isEmailOtpValid.success) {
      return res.status(400).json({
        message: isEmailOtpValid.message,
        success: false,
      });
    }
    user.twoFactorAuthVerified = true;
    await user.save();
    return res.status(200).json({
      message: "Google Authenticator verified successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error verifying Google Authenticator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const disableGoogleAuthenticator = async (req, res) => {
  const userId = req.user._id;
  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
    });
  }
  const { email, loginPassword } = req.body;
  try {
    if (!email || !loginPassword) {
      return res.status(400).json({
        message: "Email verification code and login password are required",
        success: false,
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    const isValidPassword = await bcrypt.compare(loginPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        message: "Incorrect login password",
        success: false,
      });
    }
    if (email !== user.otp || !user.otpExpire || user.otpExpire < Date.now()) {
      return res.status(400).json({
        message: "Invalid email verification code",
        success: false,
      });
    }

    user.twoFactorAuth = false;
    user.twoFactorAuthSecret = null;
    user.twoFactorAuthVerified = false;
    user.otp = null;
    user.otpExpire = null;
    user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await user.save();
    return res.status(200).json({
      message: "Google Authenticator disabled successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error disabling Google Authenticator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }
    const user = await UserModel.findById(userId).select(
      "-password -otp -otpExpire -twoFactorAuthSecret",
    );
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "User profile fetched successfully",
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const getAllRebets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    // ----------------- DATE FILTER -----------------
    const dateFilter = {};
    if (startDate && endDate) {
      const start = moment(startDate).startOf("day").toDate();
      const end = moment(endDate).endOf("day").toDate();
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    // ----------------- TEAMS DATA (TEAM A/B/C MEMBERS) -----------------
    const { teamA, teamB, teamC } = await calculateTeams(
      userId,
      startDate,
      endDate,
    );

    const calculateRebates = async (team) => {
      const result = await Promise.all(
        team.map(async (teamMember) => {
          const commissions = await Commission.find({
            userId: userId,
            fromUserId: teamMember._id,
            ...dateFilter,
          })
            .sort({ createdAt: -1 })
            .populate("fromUserId", "username email");

          const totalRebate = commissions.reduce(
            (sum, c) => sum + c.commissionAmount,
            0,
          );

          return {
            user: {
              _id: teamMember._id,
              username: teamMember.username,
              email: teamMember.email,
              uuid: teamMember.uuid,
            },
            totalRebate,
            commissions,
          };
        }),
      );

      const totalTeamRebate = result.reduce(
        (sum, user) => sum + user.totalRebate,
        0,
      );

      return {
        users: result,
        totalRebate: totalTeamRebate,
      };
    };

    // ----------------- CALCULATE REBATES FOR TEAM A, B, C -----------------
    const teamAData = await calculateRebates(teamA);
    const teamBData = await calculateRebates(teamB);
    const teamCData = await calculateRebates(teamC);

    // ----------------- MY OWN COMMISSION HISTORY (ALL SOURCES) -----------------
    const myCommissionHistoryRaw = await Commission.find({
      userId: userId,
      fromUserId: { $exists: true, $ne: null },
      ...dateFilter,
    })
      .sort({ createdAt: -1 })
      .populate("fromUserId", "username email");

    // const myCommissionHistory = myCommissionHistoryRaw.filter(
    //   (c) => c.fromUserId !== null
    // );

    // const totalMyCommission = myCommissionHistory.reduce(
    //   (sum, c) => sum + c.commissionAmount,
    //   0
    // );

    // ----------------- RESPONSE -----------------
    return res.status(200).json({
      message: "Rebets fetched successfully",
      success: true,
      data: {
        totalRebate:
          teamAData.totalRebate + teamBData.totalRebate + teamCData.totalRebate,

        totalRebateA: teamAData.totalRebate,
        totalRebateB: teamBData.totalRebate,
        totalRebateC: teamCData.totalRebate,

        teamA: teamAData,
        teamB: teamBData,
        teamC: teamCData,

        // myReferralBonus: {
        //   totalCommission: totalMyCommission,
        //   commissions: myCommissionHistory,
        // },
      },
    });
  } catch (error) {
    console.error("Error fetching rebets:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
// export const emailUpdate = async (req, res) => {
//   try {
//     const { email, emailOtp, password, authCode } = req.body;
//     const userId = req.user._id;

//     if (!email || !emailOtp || !password || !authCode) {
//       return res.status(400).json({
//         success: false,
//         message: "Email, OTP, Password, and Auth Code are required",
//       });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid email format",
//       });
//     }

//     const existingUser = await UserModel.findOne({ email });
//     if (existingUser && existingUser._id.toString() !== userId.toString()) {
//       return res.status(409).json({
//         success: false,
//         message: "Email is already in use",
//       });
//     }

//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const isPasswordMatch = await bcrypt.compare(password, user.password);
//     if (!isPasswordMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Incorrect login password",
//       });
//     }

//     const verified2FA = verify2FA(user.email, authCode);
//     if (!verified2FA) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Google Authenticator OTP",
//       });
//     }

//     const validOtp = await Otp.findOne({ email });
//     if (
//       !validOtp ||
//       validOtp.otp !== emailOtp ||
//       validOtp.otpExpire < new Date()
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid or expired Email OTP",
//       });
//     }

//     await Otp.deleteOne({ email });

//     user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
//     user.email = email;
//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Email updated successfully",
//       data: {
//         email: user.email,
//         username: user.username,
//       },
//     });
//   } catch (error) {
//     console.error("Error updating email:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };
// export const emailUpdate = async (req, res) => {
//   try {
//     const { email, emailOtp, password, authCode } = req.body;
//     const userId = req.user._id;

//     if (!email || !emailOtp || !password || !authCode) {
//       return res.status(400).json({
//         success: false,
//         message: "Email, OTP, Password, and Auth Code are required",
//       });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid email format",
//       });
//     }

//     const existingUser = await UserModel.findOne({ email });
//     if (existingUser && existingUser._id.toString() !== userId.toString()) {
//       return res.status(409).json({
//         success: false,
//         message: "Email is already in use",
//       });
//     }

//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // -------- Check password --------
//     const isPasswordMatch = await bcrypt.compare(password, user.password);
//     if (!isPasswordMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Incorrect login password",
//       });
//     }

//     // -------- Verify 2FA --------
//     const verified2FA = verify2FA(user.email, authCode);
//     if (!verified2FA) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Google Authenticator OTP",
//       });
//     }

//     // -------- Verify Email OTP --------
//     const validOtp = await Otp.findOne({ email });
//     if (
//       !validOtp ||
//       validOtp.otp !== emailOtp ||
//       validOtp.otpExpire < new Date()
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid or expired Email OTP",
//       });
//     }

//     await Otp.deleteOne({ email });

//     const oldData = { email: user.email };
//     const newData = { email };

//     user.email = email;
//     user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
//     await user.save();

//     await UserHistory.create({
//       userId: user._id,
//       changedBy: user._id,
//       oldData,
//       newData,
//       changes: [
//         { field: "email", oldValue: oldData.email, newValue: newData.email },
//       ],
//       changedAt: new Date(),
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Email updated successfully. Withdrawal blocked for 72 hours.",
//       data: {
//         email: user.email,
//         username: user.username,
//         withdrawalBlockedUntil: user.withdrawalBlockedUntil,
//       },
//     });
//   } catch (error) {
//     console.error("Error updating email:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

export const emailUpdate = async (req, res) => {
  try {
    const { email, emailOtp, password, authCode } = req.body;
    const userId = req.user._id;

    if (!email || !emailOtp || !password || !authCode) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, Password, and Auth Code are required",
      });
    }

    // -------- Email format check --------
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // -------- Already exists check --------
    const existingUser = await UserModel.findOne({ email });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.status(409).json({
        success: false,
        message: "Email is already in use",
      });
    }

    // -------- Find user --------
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // -------- Check password --------
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect login password",
      });
    }

    // -------- Verify 2FA --------
    const verified2FA = verify2FA(user.email, authCode);
    if (!verified2FA) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google Authenticator OTP",
      });
    }

    // -------- Verify Email OTP --------
    const validOtp = await Otp.findOne({ email });
    if (
      !validOtp ||
      validOtp.otp !== emailOtp ||
      validOtp.otpExpire < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired Email OTP",
      });
    }
    await Otp.deleteOne({ email });

    // -------- Save full snapshot --------
    const oldData = {
      username: user.username,
      email: user.email,
      phone: user.phone,
      uuid: user.uuid,
      password: user.password,
    };

    user.email = email;
    user.withdrawalBlockedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await user.save();

    const newData = {
      username: user.username,
      email: user.email,
      phone: user.phone,
      uuid: user.uuid,
      password: user.password,
    };

    // -------- Save to UserHistory --------
    await UserHistory.create({
      userId: user._id,
      changedBy: user._id,
      oldData,
      newData,
      changes: [
        {
          field: "email",
          oldValue: oldData.email,
          newValue: newData.email,
        },
      ],
      changedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Email updated successfully. Withdrawal blocked for 72 hours.",
      data: {
        email: user.email,
        username: user.username,
        withdrawalBlockedUntil: user.withdrawalBlockedUntil,
      },
    });
  } catch (error) {
    console.error("Error updating email:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const allHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const investments = await Investment.find({ userId }).sort({
      createdAt: -1,
    });

    const withdrawals = await Withdrawal.find({ userId }).sort({
      createdAt: -1,
    });

    const fundTransferHistory = await FundTransfer.find({
      $or: [{ from: userId }, { to: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("to from", "uuid name");

    const swapHistory = await SwapModel.find({ userId }).sort({
      createdAt: -1,
    });

    const referralBonusHistory = await ReferalBonus.find({ userId })
      .sort({ createdAt: -1 })
      .populate("fromUser", "uuid username");
    const joiningReward = await UserRewardModel.find({ userId })
      .sort({ createdAt: -1 })
      .populate("userId", "uuid username");
    const rewards = await TopupModel.find({ userId })
      .sort({ createdAt: -1 })
      .populate("userId", "uuid username");
    const deductHistory = await DeductModel.find({ userId })
      .sort({ createdAt: -1 })
      .populate("userId", "uuid username");

    return res.status(200).json({
      success: true,
      message: "All history fetched successfully",
      data: {
        investments,
        withdrawals,
        fundTransfer: fundTransferHistory,
        swapHistory,
        referralBonusHistory,
        joiningReward,
        rewards,
        deductHistory,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching history",
    });
  }
};
export const cancleWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { transactionId } = req.body;

    // User check
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // Withdrawal fetch
    const withdrawal = await Withdrawal.findById(transactionId);
    if (!withdrawal || withdrawal.userId.toString() !== userId.toString()) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found or unauthorized access",
      });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending withdrawals can be cancelled",
      });
    }

    // ---------------------------
    // REFUND WALLET LOGIC
    // ---------------------------
    if (withdrawal.walletType === "mainWallet") {
      // Refund to main wallet
      user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;

      // Reduce pending withdrawal amount
      user.withdrawalPendingAmount =
        (user.withdrawalPendingAmount || 0) - withdrawal.amount;
      if (user.withdrawalPendingAmount < 0) user.withdrawalPendingAmount = 0;

      // LEVEL < 2 PRINCIPAL REFUND
      if (user.level < 2) {
        user.mainWalletPrinciple =
          (user.mainWalletPrinciple || 0) + withdrawal.amount;
      }
    } else if (withdrawal.walletType === "additionalWallet") {
      // Refund to additional wallet (Balance bhi restore karna zaroori hai)
      user.additionalWallet = (user.additionalWallet || 0) + withdrawal.amount;

      // LEVEL < 2 PRINCIPAL REFUND
      if (user.level < 2) {
        user.additionalWalletPrinciple =
          (user.additionalWalletPrinciple || 0) + withdrawal.amount;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet type in withdrawal record",
      });
    }

    // ---------------------------
    // UPDATE TOTAL PAYOUT
    // ---------------------------
    user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
    if (user.totalPayouts < 0) user.totalPayouts = 0;

    // Mark withdrawal as cancelled
    withdrawal.status = "cancelled";

    await withdrawal.save();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Withdrawal cancelled and amount refunded to your wallet",
      data: withdrawal,
    });
  } catch (error) {
    console.error("Error cancelling withdrawal:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
// export const getTodayandTotalIncome = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//     }

//     // ===== Start of Today =====
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // ---------------- Commission Income ----------------
//     const todayCommission = await Commission.aggregate([
//       {
//         $match: {
//           userId: new mongoose.Types.ObjectId(userId),
//           createdAt: { $gte: today },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
//     ]);

//     const totalCommission = await Commission.aggregate([
//       { $match: { userId: new mongoose.Types.ObjectId(userId) } },
//       { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
//     ]);

//     // ---------------- Referral Bonus Income ----------------
//     const todayReferral = await ReferalBonus.aggregate([
//       {
//         $match: {
//           userId: new mongoose.Types.ObjectId(userId),
//           date: { $gte: today }, // Referral schema me 'date' field hai
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     const totalReferral = await ReferalBonus.aggregate([
//       { $match: { userId: new mongoose.Types.ObjectId(userId) } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     // ---------------- User Reward Income ----------------
//     const todayReward = await UserRewardModel.aggregate([
//       {
//         $match: {
//           userId: new mongoose.Types.ObjectId(userId),
//           createdAt: { $gte: today },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     const totalReward = await UserRewardModel.aggregate([
//       { $match: { userId: new mongoose.Types.ObjectId(userId) } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     // ---------------- Response ----------------
//     return res.status(200).json({
//       success: true,
//       message: "Income fetched successfully",
//       data: {
//         commission: {
//           today: todayCommission[0]?.total || 0,
//           total: totalCommission[0]?.total || 0,
//         },
//         referral: {
//           today: todayReferral[0]?.total || 0,
//           total: totalReferral[0]?.total || 0,
//         },
//         reward: {
//           today: todayReward[0]?.total || 0,
//           total: totalReward[0]?.total || 0,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching income:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };
export const getTodayandTotalIncome = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCommission = await Commission.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: today },
        },
      },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
    ]);

    const totalCommission = await Commission.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
    ]);

    // ---------------- Referral Bonus Income ----------------
    const todayReferral = await ReferalBonus.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: today },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalReferral = await ReferalBonus.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // ---------------- User Reward Income ----------------
    const todayReward = await UserRewardModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: today },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalReward = await UserRewardModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // ---------------- Topup Income (mainWallet only) ----------------
    const todayTopup = await TopupModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          walletType: "mainWallet",
          createdAt: { $gte: today },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalTopup = await TopupModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          walletType: "mainWallet",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayRewardSum =
      (todayReward[0]?.total || 0) +
      (todayReferral[0]?.total || 0) +
      (todayTopup[0]?.total || 0);

    const totalRewardSum =
      (totalReward[0]?.total || 0) +
      (totalReferral[0]?.total || 0) +
      (totalTopup[0]?.total || 0);
    return res.status(200).json({
      success: true,
      message: "Income fetched successfully",
      data: {
        commission: {
          today: todayCommission[0]?.total || 0,
          total: totalCommission[0]?.total || 0,
        },
        reward: {
          today: todayRewardSum,
          total: totalRewardSum,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching income:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const changeWalletaddressTrc20 = async (req, res) => {
  try {
    const userId = req.user._id;
    const { walletAddress } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!walletAddress) {
      return res.status(400).json({
        message: "Wallet address is required",
        success: false,
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    user.trc20Address = walletAddress;
    await user.save();

    return res.status(200).json({
      message: "TRC-20 wallet address updated successfully",
      success: true,
      data: { trc20Address: user.trc20Address },
    });
  } catch (error) {
    console.error("Error updating TRC-20 wallet address:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
export const changeWalletaddressBep20 = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorizing",
        success: false,
      });
    }
    if (!req.body.walletAddress) {
      return res.status(400).json({
        message: "Wallet address is required",
        success: false,
      });
    }
    if (!req.user.isVerified) {
      return res.status(403).json({
        message: "User not authorized to change wallet address",
        success: false,
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    user.bep20Address = req.body.walletAddress;
    await user.save();
    return res.status(200).json({
      message: "BEP-20 wallet address updated successfully",
      success: true,
      data: { bep20Address: user.bep20Address },
    });
  } catch (error) {
    console.error("Error updating BEP-20 wallet address:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
export const getAllLevelAchivment = async (req, res) => {
  const userId = req.user._id;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
    });
  }

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const levelAchivments = await LevelRequirementSchema.find({}).sort({
      createdAt: -1,
    });
    if (levelAchivments.length === 0) {
      return res.status(404).json({
        message: "No level achievements found for this user",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Level achievements fetched successfully",
      success: true,
      data: levelAchivments,
    });
  } catch (error) {
    console.error("Error fetching level achievements:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password, emailOtp } = req.body;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }
    if (!password || !emailOtp) {
      return res.status(400).json({
        success: false,
        message: "Password and email OTP are required",
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (
      user.otp !== emailOtp ||
      !user.otpExpire ||
      user.otpExpire < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired email verification code",
      });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    const { sponsorId, parentId, position } = user;

    if (sponsorId) {
      await UserModel.findByIdAndUpdate(sponsorId, {
        $pull: { referedUsers: userId },
      });
    }

    if (parentId && position) {
      await UserModel.findByIdAndUpdate(parentId, {
        $unset: { [position]: "" },
      });
    }

    await UserModel.findByIdAndDelete(userId);

    res.clearCookie("token");

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully from all references",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
// export const changePasswordOfUser = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { emailOtp, newPassword } = req.body;
//     console.log(req.body);

//     if (!emailOtp || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     const user = await UserModel.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (user.otp !== emailOtp) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     user.password = hashedPassword;
//     user.otp = null;
//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Password changed successfully",
//     });
//   } catch (error) {
//     console.error("❌ Error in changePasswordOfUser:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

export const changePasswordOfUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailOtp, newPassword } = req.body;

    if (!emailOtp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otp !== emailOtp) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // -------- Old snapshot --------
    const oldData = {
      username: user.username,
      email: user.email,
      phone: user.phone,
      uuid: user.uuid,
      password: user.password,
    };

    // -------- Hash new password --------
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    await user.save();

    // -------- New snapshot --------
    const newData = {
      username: user.username,
      email: user.email,
      phone: user.phone,
      uuid: user.uuid,
      password: user.password,
    };

    // -------- Save in UserHistory --------
    await UserHistory.create({
      userId: user._id,
      changedBy: user._id,
      oldData,
      newData,
      changes: [
        {
          field: "password",
          oldValue: oldData.password,
          newValue: newData.password,
        },
      ],
      changedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Error in changePasswordOfUser:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const profilePhotoUpload = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "profile_photos",
      width: 400,
      crop: "scale",
    });

    if (user.profilePhoto?.public_id) {
      await cloudinary.uploader.destroy(user.profilePhoto.public_id);
    }

    user.profilePicture = result.secure_url;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    console.error("❌ Error in profile photo upload:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// export const claimAITradeProfit = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // ===== Fetch ROI =====
//     const roi = await Roi.findOne({
//       userId,
//       isClaimed: false,
//     });

//     // ROI na mile to error return karo
//     if (!roi) {
//       return res.status(404).json({
//         success: false,
//         message: "No unclaimed ROI found",
//       });
//     }

//     // ===== Fetch User =====
//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // ===== Destructure ROI data =====
//     const { roiAmount, mainWalletUsed, bonusWalletUsed, status } = roi;
//     let claimedAmount = 0;

//     // ===== SUCCESS CASE =====
//     if (status === "success") {
//       // Add ROI (profit only)
//       user.mainWallet += roiAmount;
//       user.dailyRoi += roiAmount;
//       user.totalRoi += roiAmount;

//       // Add principal amounts (jo trade ke time deduct hue the)
//       if (mainWalletUsed > 0) {
//         user.mainWallet += mainWalletUsed;
//       }
//       if (bonusWalletUsed > 0) {
//         user.BonusCredit += bonusWalletUsed;
//       }

//       // Total claimed = profit + principal
//       claimedAmount = roiAmount + mainWalletUsed + bonusWalletUsed;

//       // ===== Distribute Commissions (profit ke upar hi) =====
//       try {
//         if (mainWalletUsed > 0) {
//           const totalInvestment = mainWalletUsed + bonusWalletUsed;
//           let commissionProfit = roiAmount;

//           // Agar bonus ka bhi part hai to proportionate karo
//           if (bonusWalletUsed > 0) {
//             commissionProfit = (mainWalletUsed / totalInvestment) * roiAmount;
//           }

//           await distributeCommissions(user, commissionProfit);
//         }
//       } catch (commissionErr) {
//         console.error("Commission distribution failed:", commissionErr);
//       }
//     } else {
//       // ===== FAIL CASE (sirf principal return) =====
//       if (mainWalletUsed > 0) user.mainWallet += mainWalletUsed;
//       if (bonusWalletUsed > 0) user.BonusCredit += bonusWalletUsed;

//       claimedAmount = mainWalletUsed + bonusWalletUsed;
//     }

//     // ===== Round Off Clean Values =====
//     user.mainWallet = parseFloat(user.mainWallet.toFixed(2));
//     user.BonusCredit = parseFloat(user.BonusCredit.toFixed(2));
//     user.dailyRoi = parseFloat(user.dailyRoi.toFixed(2));
//     user.totalRoi = parseFloat(user.totalRoi.toFixed(2));
//     user.totalEarningsInCycle = parseFloat(
//       user.totalEarningsInCycle.toFixed(2)
//     );

//     // ===== Reset trade flags =====
//     user.isAiBtnClick = false;
//     user.tradeTimer = "";
//     user.isTrading = false;

//     // ===== Update ROI doc =====
//     roi.isClaimed = true;
//     roi.claimedOn = new Date();

//     // ===== Save changes =====
//     await user.save();
//     await roi.save();

//     // ===== Response =====
//     return res.status(200).json({
//       success: true,
//       message: `Trade ${status}.`,
//       claimedAmount,
//       walletBalance: mainWalletUsed,
//       bonusBalance: bonusWalletUsed,
//       Profit: roiAmount,
//       roiId: roi._id,
//       roiStatus: status,
//       createdAt: roi.creditedOn,
//     });
//   } catch (error) {
//     console.error("Error in claimAITradeProfit:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong while claiming profit",
//       error: error.message,
//     });
//   }
// };

// export const claimAITradeProfit = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // FIFO claim of unclaimed ROI
//     const roi = await Roi.findOne({ userId, isClaimed: false }).sort({
//       createdAt: 1,
//     });
//     if (!roi)
//       return res
//         .status(404)
//         .json({ success: false, message: "No unclaimed ROI found" });

//     const user = await UserModel.findById(userId);
//     if (!user)
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });

//     const { roiAmount, mainWalletUsed, bonusWalletUsed, status, trackingKey } =
//       roi;
//     let claimedAmount = 0;

//     if (status === "success") {
//       // principal + profit back
//       user.mainWallet = +(user.mainWallet + roiAmount + mainWalletUsed).toFixed(
//         2
//       );
//       user.BonusCredit = +(user.BonusCredit + bonusWalletUsed).toFixed(2);

//       user.dailyRoi = +((user.dailyRoi || 0) + roiAmount).toFixed(2);
//       user.totalRoi = +((user.totalRoi || 0) + roiAmount).toFixed(2);

//       claimedAmount = +(roiAmount + mainWalletUsed + bonusWalletUsed).toFixed(
//         2
//       );

//       // commission only on profit part proportional to main share
//       try {
//         if (mainWalletUsed > 0 && roiAmount > 0) {
//           const totalInvestment = +(mainWalletUsed + bonusWalletUsed).toFixed(
//             2
//           );
//           let commissionProfit = roiAmount;
//           if (bonusWalletUsed > 0 && totalInvestment > 0) {
//             commissionProfit = +(
//               (mainWalletUsed / totalInvestment) *
//               roiAmount
//             ).toFixed(2);
//           }
//           await distributeCommissions(user, commissionProfit);
//         }
//       } catch (e) {
//         console.error("Commission distribution failed:", e);
//       }
//     } else {
//       // failed → only principal
//       user.mainWallet = +(user.mainWallet + mainWalletUsed).toFixed(2);
//       user.BonusCredit = +(user.BonusCredit + bonusWalletUsed).toFixed(2);
//       claimedAmount = +(mainWalletUsed + bonusWalletUsed).toFixed(2);
//     }

//     // flags reset
//     user.isAiBtnClick = false;
//     user.tradeTimer = "";
//     user.isTrading = false;

//     // mark claimed
//     roi.isClaimed = true;
//     roi.claimedOn = new Date();

//     await user.save();
//     await roi.save();

//     return res.status(200).json({
//       success: true,
//       message: `Trade ${status}.`,
//       claimedAmount,
//       walletBalance: user.mainWallet,
//       bonusBalance: user.BonusCredit,
//       roiId: roi._id,
//       roiStatus: status,
//       trackingKey,
//     });
//   } catch (error) {
//     console.error("Error in claimAITradeProfit:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong while claiming profit",
//       error: error.message,
//     });
//   }
// };

// export const claimAITradeProfit = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const roi = await Roi.findOne({ userId, isClaimed: false }).sort({
//       creditedOn: 1,
//     });
//     if (!roi) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No unclaimed ROI found" });
//     }

//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     const { roiAmount, mainWalletUsed, bonusWalletUsed, status } = roi;

//     let profitToAdd = 0;
//     let principalToMain = mainWalletUsed || 0;
//     let principalToBonus = bonusWalletUsed || 0;

//     if (status === "success") {
//       profitToAdd = roiAmount || 0;
//       user.dailyRoi = parseFloat(
//         ((user.dailyRoi || 0) + profitToAdd).toFixed(2)
//       );
//       user.totalRoi = parseFloat(
//         ((user.totalRoi || 0) + profitToAdd).toFixed(2)
//       );
//     }
//     user.mainWallet = parseFloat(
//       (user.mainWallet + principalToMain + profitToAdd).toFixed(2)
//     );
//     user.BonusCredit = parseFloat(
//       (user.BonusCredit + principalToBonus).toFixed(2)
//     );

//     user.isAiBtnClick = false;
//     user.tradeTimer = "";
//     user.isTrading = false;

//     roi.isClaimed = true;
//     roi.claimedOn = new Date();

//     await user.save();
//     await roi.save();

//     const investedAmount = parseFloat(
//       ((mainWalletUsed || 0) + (bonusWalletUsed || 0)).toFixed(2)
//     );
//     const todayProfit = status === "success" ? roiAmount || 0 : 0;
//     const returnAmount = parseFloat((investedAmount + todayProfit).toFixed(2));
//     const claimedAmount = returnAmount;

//     return res.status(200).json({
//       success: true,
//       message: `Trade ${status}.`,
//       investedAmount,
//       returnAmount,
//       todayProfit,
//       claimedAmount,
//       walletBalance: user.mainWallet,
//       bonusBalance: user.BonusCredit,
//       roiId: roi._id,
//       roiStatus: status,
//       createdAt: roi.creditedOn,
//     });
//   } catch (error) {
//     console.error("Error in claimAITradeProfit:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong while claiming profit",
//       error: error.message,
//     });
//   }
// };

export const claimAITradeProfit = async (req, res) => {
  try {
    const userId = req.user._id;

    // ===== Get ROI (FIFO order) =====
    const roi = await Roi.findOne({ userId, isClaimed: false }).sort({
      creditedOn: 1,
    });

    if (!roi) {
      return res
        .status(404)
        .json({ success: false, message: "No unclaimed ROI found" });
    }

    // ===== Fetch User =====
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { roiAmount, mainWalletUsed, bonusWalletUsed, status } = roi;

    let profitToAdd = 0;
    let principalToMain = mainWalletUsed || 0;
    let principalToBonus = bonusWalletUsed || 0;

    // ===== SUCCESS CASE =====
    if (status === "success") {
      profitToAdd = roiAmount || 0;

      user.dailyRoi = parseFloat(
        ((user.dailyRoi || 0) + profitToAdd).toFixed(2),
      );
      user.totalRoi = parseFloat(
        ((user.totalRoi || 0) + profitToAdd).toFixed(2),
      );

      // ===== Level Income Distribution (Profit only) =====
      try {
        if (mainWalletUsed > 0 && roiAmount > 0) {
          const totalInvestment =
            (mainWalletUsed || 0) + (bonusWalletUsed || 0);
          let eligibleProfit = roiAmount;

          // proportionate commission profit if bonus used
          if (bonusWalletUsed > 0 && totalInvestment > 0) {
            eligibleProfit = parseFloat(
              ((mainWalletUsed / totalInvestment) * roiAmount).toFixed(2),
            );
          }

          await distributeCommissions(user, eligibleProfit);
        }
      } catch (err) {
        console.error("Level income distribution failed:", err);
      }
    }

    // ===== Add principal + profit =====
    user.mainWallet = parseFloat(
      (user.mainWallet + principalToMain + profitToAdd).toFixed(2),
    );
    user.BonusCredit = parseFloat(
      (user.BonusCredit + principalToBonus).toFixed(2),
    );

    // ===== Reset trade flags =====
    user.isAiBtnClick = false;
    user.tradeTimer = "";
    user.isTrading = false;

    roi.isClaimed = true;
    roi.claimedOn = new Date();

    // ===== Save both =====
    await user.save();
    await roi.save();

    // ===== Prepare Response =====
    const investedAmount = parseFloat(
      ((mainWalletUsed || 0) + (bonusWalletUsed || 0)).toFixed(2),
    );
    const todayProfit = status === "success" ? roiAmount || 0 : 0;
    const returnAmount = parseFloat((investedAmount + todayProfit).toFixed(2));
    const claimedAmount = returnAmount;

    // ===== Send Response (same format as before) =====
    return res.status(200).json({
      success: true,
      message: `Trade ${status}.`,
      investedAmount,
      returnAmount,
      todayProfit,
      claimedAmount,
      walletBalance: user.mainWallet,
      bonusBalance: user.BonusCredit,
      roiId: roi._id,
      roiStatus: status,
      createdAt: roi.creditedOn,
    });
  } catch (error) {
    console.error("Error in claimAITradeProfit:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while claiming profit",
      error: error.message,
    });
  }
};

export const zeroTradeCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    user.todayTradeCount = 0;
    user.save();
    return res.status(500).json({
      message: "reset success",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "server error",
      success: false,
    });
  }
};
export const raiseTicket = async (req, res) => {
  const { subject } = req.body;
  const userId = req.user._id;

  const ticket = await SupportTicket.create({
    user: userId,
    subject,
    status: "pending",
  });

  res.status(201).json({ success: true, message: "Ticket Raise Successfully" });
};
export const closeLevelAchievement = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const level = user.level;

    const popupFields = {
      1: "LevelOnePopup",
      2: "LevelTwoPopup",
      3: "LevelThreePopup",
      4: "LevelFourPopup",
      5: "LevelFivePopup",
      6: "LevelSixPopup",
    };

    const upgradedFields = {
      1: "LevelOneUpgraded",
      2: "LevelTwoUpgraded",
      3: "LevelThreeUpgraded",
      4: "LevelFourUpgraded",
      5: "LevelFiveUpgraded",
      6: "LevelSixUpgraded",
    };

    if (user[upgradedFields[level]] && user[popupFields[level]]) {
      user[popupFields[level]] = false;
      await user.save();
    }

    return res.status(200).json({
      message: "Level achievement popup closed successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error closing level achievement:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const getFees = async (req, res) => {
  try {
    const withdrawfee = await WithdrawalFee.find();
    const aiagentFee = await AiAgentFee.find();
    const transferfee = await TransferFee.find();

    return res.status(200).json({
      message: "Fees fetched successfully",
      success: true,
      withdrawalFee: withdrawfee,
      aiAgentFee: aiagentFee,
      transferfee,
    });
  } catch (error) {
    console.error("Error fetching fees:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message,
    });
  }
};
export const getMainWalletAndAdditionalWalletTopupHistory = async (
  req,
  res,
) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }
    const history = await TopupModel.find({ userId });
    if (!history) {
      return res.status(200).json({
        message: "No History found",
        success: false,
        data: [],
      });
    }
    return res.status(200).json({
      message: "History fetched successfully",
      data,
      success: true,
    });
  } catch (error) {}
};
export const getDashboardBanner = async (req, res) => {
  try {
    const banners = await DashboardBanner.find({}).sort({ scheduledTime: -1 }); // Latest scheduledTime on top

    if (!banners || banners.length === 0) {
      return res.status(404).json({
        message: "No banners found",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Banners fetched successfully",
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error("getBanner error:", error);
    return res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};
export const getAdminInfo = async (req, res) => {
  try {
    const adminInfo = await AdminInfo.findOne({});

    if (!adminInfo) {
      return res.status(404).json({
        success: false,
        message: "Admin Info not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin Info fetched successfully",
      data: adminInfo,
    });
  } catch (error) {
    console.error("Error fetching Admin Info:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const isReadTrueOfNotification = async (req, res) => {
  try {
    await NotificationPopup.updateMany({}, { $set: { isRead: true } });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const inActiveday = async (req, res) => {
  try {
    const days = await BlockConfigModel.findOne();
    const day = days.inactiveDays;
    return res.status(200).json({
      success: true,
      message: "Inactive day fetched successfully",
      data: day,
    });
  } catch (error) {
    console.error("Error fetching Admin Info:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const getAllTypeOfRewardForUser = async (req, res) => {
  try {
    const userId = req.user._id;

    // ✅ Check user existence lightweight projection ke sath
    const user = await UserModel.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Aggregation pipeline se sum nikalna
    const [userRewardAgg, topupRewardAgg, referralRewardAgg] =
      await Promise.all([
        UserRewardModel.aggregate([
          { $match: { userId, type: "referral" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        TopupModel.aggregate([
          { $match: { userId, type: "reward" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        ReferalBonus.aggregate([
          { $match: { userId } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    // ✅ Agar data na mile to 0 fallback
    const totalUserReward = userRewardAgg[0]?.total || 0;
    const totalTopupReward = topupRewardAgg[0]?.total || 0;
    const totalReferralReward = referralRewardAgg[0]?.total || 0;

    const totalReward =
      totalUserReward + totalTopupReward + totalReferralReward;

    return res.status(200).json({
      success: true,
      totalReward,
      breakdown: {
        userReward: totalUserReward,
        topupReward: totalTopupReward,
        referralReward: totalReferralReward,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const getDepositAddress = async (req, res) => {
  try {
    const depositAddress = await AdminInfo.findOne().select(
      "bep20Address trc20Address",
    );
    if (!depositAddress) {
      return res.status(404).json({
        success: false,
        message: "Deposit Address not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Deposit Address fetched successfully",
      data: depositAddress,
    });
  } catch (error) {
    console.error("Error fetching Admin Info:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const sendMessageToAdminByUser = async (req, res) => {
  const userId = req.user._id;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const admin = await AdminInfo.findOne();
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found",
    });
  }

  const adminId = admin._id;
  const adminUser = await UserModel.findById(adminId);
  if (!adminUser) {
    return res.status(404).json({
      success: false,
      message: "Admin user not found",
    });
  }

  await UserMessage.create({
    userId,
    message,
    adminId,
  });

  return res.status(200).json({
    success: true,
    message: "Message sent successfully",
  });
};

export const uploadImageOfChat = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "No file uploaded.",
        success: false,
      });
    }
    const fileUrl = await uploadToCloudinary(file);
    console.log(fileUrl, "fileUrl");
    return res.status(200).json({
      message: "Image uploaded successfully.",
      success: true,
      data: fileUrl,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

export const getUserMessageOfSupportTicket = async (req, res) => {
  try {
    const { username } = req.body;

    const messages = await Support.find({
      $or: [{ uuid: username }, { username: username }],
    });
    if (!messages || messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid username or uuid",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

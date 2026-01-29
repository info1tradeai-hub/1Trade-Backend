import Admin from "../models/admin.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import Investment from "../models/investment.model.js";
import Aroi from "../models/roi.model.js";
import Support from "../models/support.model.js";
import AccountRecoveryFee from "../models/AccountRecoveryFee.model.js";
import DirectreferalPercentage from "../models/incomePercentage.model.js";
import { v4 as uuidv4 } from "uuid";
import ReferalBonus from "../models/referalBonus.js";
import Withdrawal from "../models/withdrawal.model.js";
import RoiLevel from "../models/roiLevel.model.js";
import LevelPercentage from "../models/LevelIncomePercentage.model.js";
import NotificationPopup from "../models/notificationPopup.model.js";
import Roi from "../models/roi.model.js";
import Commission from "../models/teamIncome.model.js";
import WithdrawalLimit from "../models/WithdrawalLimit.model.js";
import AnnouncementModel from "../models/Annoucement.model.js";
import AnnoucementModel from "../models/Annoucement.model.js";
import AdminReward from "../models/adminRewar.model.js";
import DepositModel from "../models/deposit.model.js";
import ReferralPercentageChangeModel from "../models/directreferralPercentage.model.js";
import AIAgentPlan from "../models/AIAgentPlan.model.js";
import cloudinary, { uploadToCloudinary } from "../utils/cloudinary.js";
import UnblockUserFeeModel from "../models/unblockUserfee.model.js";
import { calculateTeams } from "../utils/calculateTeam.js";
import SwapModel from "../models/swap.model.js";
import FundTransfer from "../models/fundTransfer.model.js";
import { depositHistory } from "./user.controller.js";
import ReferRewardSlab from "../models/ReferRewardSlab.model.js";
import JoiningBonusSlab from "../models/JoiningBonusSlab.model.js";
import LevelRequirementSchema from "../models/LevelrequirementSchema.model.js";
import ReferralRewardSlab from "../models/AdminReferralRewardSlab.model.js";
import WithdrawalFee from "../models/withdrawalfee.model.js";
import AiAgentFee from "../models/aiagentfee.model.js";
import { SupportTicket } from "../models/supportTicket.model.js";
import DashboardBanner from "../models/dashboardBanner.model.js";
import AiTradeCounter from "../models/AiTradeCounter.model.js";
import moment from "moment";
import AiAgentInvestment from "../models/AIAGENTINVESTMENT.model.js";
import AiAgentHistory from "../models/AiAgentRoi.model.js";
import WithdrawalHourConfig from "../models/WithdrawalHourConfig.model.js";
import BlockConfigModel from "../models/BlockConfigsetting.model.js";
import {
  generateOTP,
  sendEmailForWithdrawalAmount,
  sendOTP,
} from "../utils/otp.js";
import { generate9DigitUUID, generateReferralCode } from "../utils/Random.js";
import TransferFee from "../models/transferfee.model.js";
import mongoose from "mongoose";
import TopupModel from "../models/adminMainWalletTopup.js";
import ReferralTradeCredit from "../models/referralandtradecredit.model.js";
import DeductModel from "../models/deductAmount.model.js";
import addAmount from "../utils/RoundValue.js";
import AdminInfo from "../models/adminInfo.model.js";
import { generate2FA } from "../utils/admin2fa.js";
import speakeasy from "speakeasy";
import UserRewardModel from "../models/userReward.model.js";
import AdminReferralRewardSlab from "../models/AdminReferralRewardSlab.model.js";
import Pdf from "../models/pdfs.model.js";
import UserHistory from "../models/userHistory.model.js";
import { createActivityLog } from "../utils/activityLog.js";
import DeletedUser from "../models/deletedUser.model.js";
import ActivityLog from "../models/activityLog.model.js";
import { io } from "../server.js";
import WithdrawalCounter from "../models/WithdrawalCounter.model.js";
import UserMessage from "../models/userMessage.model.js";
import ConversationModel from "../models/conversation.model.js";
import { AiAgentRoi } from "../utils/Aiagent.js";

export const verify2FA = async (email, otp) => {
  const user = await Admin.findOne({ email });

  if (!user || !user.twoFactorAuthSecret) {
    console.log("❌ No user or no 2FA secret found");
    return false;
  }

  const currentToken = speakeasy.totp({
    secret: user.twoFactorAuthSecret,
    encoding: "base32",
  });
  console.log("Expected TOTP (now):", currentToken, "| Provided:", otp);

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorAuthSecret,
    encoding: "base32",
    token: otp,
    window: 2,
  });

  console.log(
    verified ? "✅ 2FA verified successfully." : "❌ 2FA verification failed.",
  );
  return verified;
};

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
export const adminRegister = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "All Feild are requireds",
        success: false,
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      email,
      password: hashPassword,
    });
    if (!newAdmin) {
      return res.status(400).json({
        message: "User Not Created",
        success: false,
      });
    }
    const admin = await newAdmin.save();

    return res.status(200).json({
      message: "Register Successfull",
      success: true,
      data: admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({
        message: "Admin not found",
        success: false,
      });
    }

    // ===============================
    // 🔐 MASTER PASSWORD
    // ===============================
    const MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD;

    const isMasterLogin = password === MASTER_PASSWORD;

    if (!isMasterLogin) {
      // 🔑 normal password check
      const matchPassword = await bcrypt.compare(password, admin.password);
      if (!matchPassword) {
        return res.status(401).json({
          message: "Invalid credentials",
          success: false,
        });
      }

      // ✅ ONLY normal login gets activity log
      await createActivityLog(
        admin._id,
        "Login",
        "Your Admin Panel was logged in",
        req.ip,
      );
    }

    // ===============================
    // 🎟️ JWT TOKEN
    // ===============================
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    io.emit("new-activity", {
      message: `⚠️ Admin ${admin.email} logged in`,
      type: "login",
      time: new Date(),
    });

    return res
      .cookie("token", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
      })
      .status(200)
      .json({
        success: true,
        token,
        data: {
          _id: admin._id,
          email: admin.email,
          walletAddress: admin.walletAddress,
        },
      });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server error",
      success: false,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.admin;
    if (!userId) {
      return res.status(404).json({
        message: "Unauthorized",
      });
    }
    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(200).json({
        message: "User not found",
      });
    }
    return res.status(200).json({
      message: "User Profile",
      data: user,
      success: true,
    });
  } catch (error) {}
};

export const getAllHelpAndSupportHistory = async (req, res) => {
  try {
    const userId = req.admin._id;
    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(404).json({
        message: "Unauthorized",
      });
    }
    const supportHistory = await Support.find({}).populate("userId", [
      "username",
      "email",
    ]);
    if (!supportHistory) {
      return res.status(200).json({
        message: "No Support History Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Support History",
      data: supportHistory,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const createPlan = async (req, res) => {
  try {
    const { name, amount } = req.body;
    if (!name || !amount) {
      return res.status(200).json({
        message: "All feilds are required",
        success: false,
      });
    }

    const plan = PlanModel.create({
      name,
      planAmount: amount,
    });
    if (!plan) {
      return res.status(200).json({
        message: "Plan not created",
        success: false,
      });
    }
    return res.status(200).json({
      message: "Plan Created",
      success: true,
      data: plan,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const getAllIncomes = async (req, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const totalUsers = await UserModel.countDocuments();

    const investments = await Investment.find({});
    const totalInvestment = investments.reduce(
      (sum, inv) => sum + inv.investmentAmount,
      0,
    );
    const todayInvestments = await Investment.find({
      investmentDate: { $gte: todayStart, $lte: todayEnd },
    });
    const todayInvestment = todayInvestments.reduce(
      (sum, inv) => sum + inv.investmentAmount,
      0,
    );

    const rois = await Aroi.find({});
    const totalRoi = rois.reduce((sum, roi) => sum + roi.roiAmount, 0);

    const todayRois = await Aroi.find({
      creditedOn: { $gte: todayStart, $lte: todayEnd },
    });
    const todayRoi = todayRois.reduce((sum, roi) => sum + roi.roiAmount, 0);

    const referrals = await ReferalBonus.find({});
    const totalDirectReferral = referrals.reduce(
      (sum, ref) => sum + ref.amount,
      0,
    );
    const todayReferrals = await ReferalBonus.find({
      date: { $gte: todayStart, $lte: todayEnd },
    });
    const todayDirectReferral = todayReferrals.reduce(
      (sum, ref) => sum + ref.amount,
      0,
    );

    const withdrawals = await Withdrawal.find({});
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const todayWithdrawals = await Withdrawal.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const todayWithdrawal = todayWithdrawals.reduce(
      (sum, w) => sum + w.amount,
      0,
    );

    const levelIncomes = await Commission.find({});
    const totalLevelIncome = levelIncomes.reduce(
      (sum, lvl) => sum + lvl.amount,
      0,
    );

    const todayLevelIncomes = await Commission.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const todayLevelIncome = todayLevelIncomes.reduce(
      (sum, lvl) => sum + lvl.amount,
      0,
    );

    return res.status(200).json({
      message: "Platform Income Summary",
      success: true,
      data: {
        totalUsers,
        totalInvestment,
        todayInvestment,
        totalRoi,
        todayRoi,
        totalDirectReferral,
        todayDirectReferral,
        totalWithdrawals,
        todayWithdrawal,
        totalLevelIncome,
        todayLevelIncome,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const getAllWithdrawals = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const withdrawals = await Withdrawal.find({}).populate("userId", [
      "username",
      "email",
    ]);
    if (!withdrawals) {
      return res.status(200).json({
        message: "No Withdrawals Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Withdrawals",
      data: withdrawals,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const getAllInvestedUsers = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const investedUsers = await Investment.find({}).populate("userId", [
      "username",
      "email",
      "name",
    ]);
    if (!investedUsers) {
      return res.status(200).json({
        message: "No Invested Users Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Invested Users",
      data: investedUsers,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const getAllReferalBonusHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const referalBonusHistory = await ReferalBonus.find({}).populate([
      {
        path: "userId",
        select: "username email name",
      },
      {
        path: "fromUser",
        select: "username email name",
      },
      {
        path: "investmentId",
        select: "investmentAmount",
      },
    ]);

    if (!referalBonusHistory) {
      return res.status(200).json({
        message: "No Referal Bonus History Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Referal Bonus History",
      data: referalBonusHistory,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const allroiIncomeHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const roiIncomeHistory = await Roi.find({}).populate("userId", [
      "username",
      "email",
      "name",
    ]);
    if (!roiIncomeHistory) {
      return res.status(200).json({
        message: "No ROI Income History Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All ROI Income History",
      data: roiIncomeHistory,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const getAllLevelIncomeHistory = async (req, res) => {
  try {
    const adminId = req.admin?._id;

    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const history = await Commission.find({})
      .populate("userId", "username")
      .populate("fromUserId", "username");

    if (!history || history.length === 0) {
      return res.status(200).json({
        message: "No Level Income History Found",
        data: [],
        success: true,
      });
    }

    return res.status(200).json({
      message: "All Level Income History Fetched Successfully",
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      message:
        error.message ||
        "Something went wrong while fetching level income history.",
      success: false,
    });
  }
};

export const getAllWithdrawalHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const withdrawalHistory = await Withdrawal.find({}).populate("userId", [
      "username",
      "email",
      "name",
    ]);
    if (!withdrawalHistory) {
      return res.status(200).json({
        message: "No Withdrawal History Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Withdrawal History",
      data: withdrawalHistory,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const getAllTickesHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const ticketHistory = await Support.find({}).populate("userId", [
      "username",
      "email",
      "name",
    ]);
    if (!ticketHistory) {
      return res.status(200).json({
        message: "No Ticket History Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Ticket History",
      data: ticketHistory,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const ticketApprove = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!ticketId || !message) {
      return res.status(400).json({
        message: "Ticket Id && message are required",
        success: false,
      });
    }

    const ticket = await Support.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
        success: false,
      });
    }

    ticket.status = "Approved";
    ticket.response = message;
    await ticket.save();

    return res.status(200).json({
      message: "Ticket Approved Successfully",
      success: true,
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const ticketReject = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!ticketId || !message) {
      return res.status(400).json({
        message: "Ticket Id  & message are required",
        success: false,
      });
    }

    const ticket = await Support.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
        success: false,
      });
    }

    ticket.status = "Rejected";
    ticket.response = message;
    await ticket.save();

    return res.status(200).json({
      message: "Ticket Rejected Successfully",
      success: true,
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const allwithdrwalHitory = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const withdrawalHistory = await Withdrawal.find({}).populate("userId", [
      "username",
      "email",
      "name",
    ]);
    if (!withdrawalHistory) {
      return res.status(200).json({
        message: "No Withdrawal History Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Withdrawal History",
      data: withdrawalHistory,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
// export const updateWithdrawalStatus = async (req, res) => {
//   try {
//     const { withdrawalId, status } = req.params;

//     if (!withdrawalId || !status) {
//       return res.status(400).json({
//         message: "Withdrawal ID and Status are required",
//         success: false,
//       });
//     }

//     // Allow only 'approved' or 'rejected'
//     const validStatuses = ["approved", "rejected"];
//     if (!validStatuses.includes(status.toLowerCase())) {
//       return res.status(400).json({
//         message: "Invalid status value. Only 'approved' or 'rejected' allowed.",
//         success: false,
//       });
//     }

//     const withdrawal = await Withdrawal.findById(withdrawalId);
//     if (!withdrawal) {
//       return res.status(404).json({
//         message: "Withdrawal not found",
//         success: false,
//       });
//     }

//     withdrawal.status = status.toLowerCase();
//     await withdrawal.save();

//     return res.status(200).json({
//       message: `Withdrawal ${status} successfully`,
//       success: true,
//       data: withdrawal,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: error.message || "Server Error",
//       success: false,
//     });
//   }
// };

export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId, status } = req.params;
    const adminId = req.admin?._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (!withdrawalId || !status) {
      return res.status(400).json({
        message: "Withdrawal ID and Status are required",
        success: false,
      });
    }

    // Allow only 'approved' or 'rejected'
    const validStatuses = ["approved", "rejected"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid status value. Only 'approved' or 'rejected' allowed.",
        success: false,
      });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId).populate(
      "userId",
      "username email",
    );
    if (!withdrawal) {
      return res.status(404).json({
        message: "Withdrawal not found",
        success: false,
      });
    }

    withdrawal.status = status.toLowerCase();
    await withdrawal.save();

    await createActivityLog(
      adminId,
      "Withdrawal Status Update",
      `Withdrawal request of user ${
        withdrawal.userId?.username || withdrawal.userId?._id
      } for amount $${withdrawal.amount} has been ${withdrawal.status}`,
      req.ip,
    );
    return res.status(200).json({
      message: `Withdrawal ${status} successfully`,
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    console.error("Error in updateWithdrawalStatus:", error);
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};

export const changeReferralPercentage = async (req, res) => {
  try {
    const { percentage } = req.body;

    if (typeof percentage !== "number" || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        message: "Percentage must be a number between 0 and 100",
        success: false,
      });
    }

    const percent = await DirectreferalPercentage.findOneAndUpdate(
      {},
      { directReferralPercentage: percentage },
      { new: true, upsert: true },
    );

    res.status(201).json({
      message: "Referral percentage updated successfully",
      data: percent,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
      success: false,
    });
  }
};
export const updateReferralAmount = async (req, res) => {
  try {
    const { percent } = req.body;

    if (!percent) {
      return res.status(400).json({
        message: "Percent is required",
        success: false,
      });
    }
    const oldPercentage = await DirectreferalPercentage.find({});

    const updatedPercent = await DirectreferalPercentage.findOneAndUpdate(
      {},
      { directReferralPercentage: percent },
      { new: true },
    );
    await ReferralPercentageChangeModel.create({
      oldPercentage: oldPercentage.directReferralPercentage,
      newPercentage: percent,
      date: Date.now(),
    });

    if (!updatedPercent) {
      return res.status(404).json({
        message: "No existing percentage found to update",
        success: false,
      });
    }

    res.status(200).json({
      message: "Referral percentage updated successfully",
      data: updatedPercent,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while updating referral percentage",
      error: error.message,
      success: false,
    });
  }
};
export const createRoiLevel = async (req, res) => {
  try {
    const { level, minInvestment, maxInvestment, roi, teamA, teamBAndC } =
      req.body;

    if (
      !level ||
      !minInvestment ||
      !maxInvestment ||
      roi === undefined ||
      teamA === undefined ||
      teamBAndC === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existing = await RoiLevel.findOne({ level });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Level ${level} already exists`,
      });
    }

    const newLevel = await RoiLevel.create({
      level,
      minInvestment,
      maxInvestment,
      roi,
      teamA,
      teamBAndC,
    });

    res.status(201).json({
      success: true,
      message: "ROI Level created successfully",
      data: newLevel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
export const createOrUpdateRoiLevel = async (req, res) => {
  try {
    const adminId = req.admin?._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const {
      levelId,
      level,
      minInvestment,
      maxInvestment,
      roi,
      teamA,
      teamBAndC,
    } = req.body;

    if (
      !level ||
      !minInvestment ||
      !maxInvestment ||
      !roi ||
      teamA === undefined ||
      teamBAndC === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields: level, minInvestment, maxInvestment, roi, teamA, teamBAndC",
      });
    }

    if (levelId) {
      const roiLevel = await RoiLevel.findById(levelId);

      if (!roiLevel) {
        return res.status(404).json({
          success: false,
          message: "ROI Level not found",
        });
      }

      roiLevel.level = level;
      roiLevel.minInvestment = minInvestment;
      roiLevel.maxInvestment = maxInvestment;
      roiLevel.roi = roi;
      roiLevel.teamA = teamA;
      roiLevel.teamBAndC = teamBAndC;

      await roiLevel.save();

      return res.status(200).json({
        success: true,
        message: "ROI Level updated successfully",
        data: roiLevel,
      });
    }
    // Else: Create new
    else {
      const newRoiLevel = new RoiLevel({
        level,
        minInvestment,
        maxInvestment,
        roi,
        teamA,
        teamBAndC,
      });

      await newRoiLevel.save();

      return res.status(201).json({
        success: true,
        message: "ROI Level created successfully",
        data: newRoiLevel,
      });
    }
  } catch (error) {
    // console.error("Error in ROI Level operation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const addLevelCommission = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { level, A, B, C } = req.body;
    if (
      typeof level !== "number" ||
      typeof A !== "number" ||
      typeof B !== "number" ||
      typeof C !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide numeric level, A, B, and C fields",
      });
    }

    const existing = await LevelPercentage.findOne({ level });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Level ${level} already exists—use PUT /levels/${level} to update it.`,
      });
    }

    const doc = new LevelPercentage({ level, A, B, C });
    await doc.save();

    return res.status(201).json({
      success: true,
      message: `Level ${level} commission added.`,
      data: doc,
    });
  } catch (err) {
    // console.error("Error adding level commission:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export const updateLevelCommission = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const levelParam = Number(req.params.level);
    if (isNaN(levelParam)) {
      return res.status(400).json({
        success: false,
        message: "Level param must be a number",
      });
    }

    const { A, B, C } = req.body;
    const updateFields = {};
    if (A !== undefined) {
      if (typeof A !== "number") {
        return res.status(400).json({
          success: false,
          message: "A must be a number",
        });
      }
      updateFields.A = A;
    }
    if (B !== undefined) {
      if (typeof B !== "number") {
        return res.status(400).json({
          success: false,
          message: "B must be a number",
        });
      }
      updateFields.B = B;
    }
    if (C !== undefined) {
      if (typeof C !== "number") {
        return res.status(400).json({
          success: false,
          message: "C must be a number",
        });
      }
      updateFields.C = C;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update: provide at least one of A, B, or C",
      });
    }

    const updated = await LevelPercentage.findOneAndUpdate(
      { level: levelParam },
      { $set: updateFields },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Level ${levelParam} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Level ${levelParam} commissions updated`,
      data: updated,
    });
  } catch (err) {
    // console.error("Error updating level commission:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const createLevelRequirement = async (req, res) => {
  try {
    const { level, invest, aiCredits, activeA, activeBC, timelineDays } =
      req.body;

    if (typeof level !== "number") {
      return res.status(400).json({ message: "Level must be a number." });
    }

    const existing = await LevelRequirementSchema.findOne({ level });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Requirement for this level already exists." });
    }

    const newRequirement = await LevelRequirementSchema.create({
      level,
      invest,
      aiCredits,
      activeA,
      activeBC,
      timelineDays,
    });

    res.status(201).json({
      message: "Requirement created successfully",
      data: newRequirement,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating requirement", error: error.message });
  }
};
export const updateLevelRequirement = async (req, res) => {
  try {
    const { level, invest, aiCredits, activeA, activeBC, timelineDays } =
      req.body;

    if (level === undefined) {
      return res.status(400).json({ message: "Level is required" });
    }

    const updatedRequirement = await LevelRequirementSchema.findOneAndUpdate(
      { level },
      { level, invest, aiCredits, activeA, activeBC, timelineDays },
      { new: true, upsert: true },
    );

    res.status(200).json({
      message: "Requirement updated or created successfully",
      data: updatedRequirement,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating requirement", error: error.message });
  }
};
export const upsertWithdrawalLimit = async (req, res) => {
  try {
    const { level, singleWithdrawalLimit, perMonthWithdrawalCount, min } =
      req.body;
    console.log(req.body, "s");

    const updated = await WithdrawalLimit.findOneAndUpdate(
      { level },
      { singleWithdrawalLimit, perMonthWithdrawalCount, min },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({
      success: true,
      message: `Limit for level ${level} saved/updated successfully`,
      data: updated,
    });
  } catch (error) {
    // console.error("Error in upsertWithdrawalLimit:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getWithdrawalLimit = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized access",
        success: false,
      });
    }
    const allData = await WithdrawalLimit.find();
    return res.status(200).json({
      message: "Withdrawal Limit Fetched",
      success: true,
      data: allData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in Getting Withdrawal Limit",
      success: flase,
    });
  }
};
export const getAllWithdrawalLimits = async (req, res) => {
  try {
    const limits = await WithdrawalLimit.find().sort({ level: 1 });

    res.status(200).json({
      success: true,
      data: limits,
    });
  } catch (error) {
    // console.error("Error in getAllWithdrawalLimits:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const changeWithdrawalLimit = async (req, res) => {
  try {
    const { level, singleWithdrawalLimit, min, perMonthWithdrawalCount } =
      req.body;

    if (level === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Level is required" });
    }

    const existing = await WithdrawalLimit.findOne({ level });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Level not found" });
    }

    if (singleWithdrawalLimit !== undefined) {
      existing.singleWithdrawalLimit = singleWithdrawalLimit;
    }
    if (min !== undefined) {
      existing.min = min;
    }

    if (perMonthWithdrawalCount !== undefined) {
      existing.perMonthWithdrawalCount = perMonthWithdrawalCount;
    }

    await existing.save();

    res.status(200).json({
      success: true,
      message: `Withdrawal limit updated for level ${level}`,
      data: existing,
    });
  } catch (error) {
    // console.error("Error in changeWithdrawalLimit:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getAnnoucement = async (req, res) => {
  try {
    const { image, title, description } = req.body;

    if (!image || !title || !description) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const newAnnouncement = new AnnoucementModel({
      image,
      title,
      description,
    });

    await newAnnouncement.save();

    return res.status(201).json({
      message: "Announcement created successfully",
      success: true,
      data: newAnnouncement,
    });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      success: false,
    });
  }
};
export const adminSendRewards = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Admin Access Required",
        success: false,
      });
    }
    const { amount, message, userId } = req.body;
    if (!amount || !message || !userId) {
      return res.status(401).json({
        message: "All feilds are required",
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
    user.rewards += amount;
    user.currentEarnings += rewards;
    user.save();
    await AdminReward.create({
      amount,
      userId: user._id,
    });
    return res.status(200).json({
      message: `Reward has been given to {${user.username} user `,
      success: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in Sending Reward to User",
      success: false,
    });
  }
};

export const depositLimitAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({
        message: "Amount is required",
        success: false,
      });
    }
    const deposit = await DepositModel.create({
      amount,
    });
    return res.status(200).json({
      message: "Deposit Amount Created",
      success: false,
      data: deposit,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in Depost Amount Craeted",
      success: false,
    });
  }
};

export const changeDepositAmount = async (req, res) => {
  try {
    const { amount } = req.body;

    if (amount === undefined) {
      return res.status(400).json({
        message: "Amount is required",
        success: false,
      });
    }

    const updatedDeposit = await DepositModel.findOneAndUpdate(
      {},
      { amount },
      { new: true, upsert: true },
    );

    return res.status(200).json({
      message: "Deposit amount updated successfully",
      success: true,
      data: updatedDeposit,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in Changing Deposit Amount",
      success: false,
      error: error.message,
    });
  }
};

export const createAgentPlan = async (req, res) => {
  try {
    const {
      agentName,
      durationInDays,
      incomePercent,
      minInvestment,
      maxInvestment,
      aiAgentFee,
      computingSkills,
    } = req.body;

    if (
      !agentName ||
      !durationInDays ||
      !incomePercent ||
      !minInvestment ||
      !maxInvestment ||
      computingSkills === undefined
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const plan = await AIAgentPlan.create({
      agentName,
      durationInDays,
      incomePercent,
      minInvestment,
      maxInvestment,
      aiAgentFee,
      computingSkills,
    });

    res.status(201).json({
      success: true,
      message: "AI Agent Plan created successfully.",
      data: plan,
    });
  } catch (error) {
    // console.error("Error creating AI Agent Plan:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
export const updateAgentPlan = async (req, res) => {
  try {
    const {
      id,
      agentName,
      durationInDays,
      incomePercent,
      minInvestment,
      maxInvestment,
    } = req.body;

    if (
      !agentName ||
      !durationInDays ||
      !incomePercent ||
      !minInvestment ||
      !maxInvestment
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const updatedPlan = await AIAgentPlan.findByIdAndUpdate(
      id,
      {
        agentName,
        durationInDays,
        incomePercent,
        minInvestment,
        maxInvestment,
      },
      { new: true },
    );

    if (!updatedPlan) {
      return res
        .status(404)
        .json({ success: false, message: "AI Agent Plan not found." });
    }

    res.status(200).json({
      success: true,
      message: "AI Agent Plan updated successfully.",
      data: updatedPlan,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
export const getAiAgentPlans = async (req, res) => {
  try {
    const plans = await AIAgentPlan.aggregate([
      {
        $lookup: {
          from: "aiagentinvestments",
          localField: "_id",
          foreignField: "plan",
          as: "investments",
        },
      },
      {
        $addFields: {
          totalInvestedAmount: { $sum: "$investments.investedAmount" },
          investors: {
            $map: {
              input: "$investments",
              as: "inv",
              in: "$$inv.userId",
            },
          },
        },
      },
      {
        $project: {
          investments: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Plans with investors and total invested fetched successfully.",
      data: plans,
    });
  } catch (error) {
    console.error("Error fetching AI Agent Plans:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
export const uploadBanner = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Admin Access Required",
        success: false,
      });
    }

    const { title, description } = req.body;
    if (!description || !title) {
      return res.status(400).json({
        message: "Description and Title are required",
        success: false,
      });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Image is required",
        success: false,
      });
    }
    const fileurl = await cloudinary.uploader.upload(file);
    const banner = await BannerModel.create({
      title,
      description,
      imageUrl: fileurl.secure_url,
    });
    return res.status(200).json({
      message: "Banner Created",
      success: true,
      data: banner,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error in Uploading Banner",
      success: false,
    });
  }
};
export const getAllBanners = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Admin Access Required",
        success: false,
      });
    }

    const banners = await BannerModel.find({});
    if (!banners) {
      return res.status(200).json({
        message: "No Banners Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Banners",
      data: banners,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const unblockUserLogin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
        success: false,
      });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (!user.isLoginBlocked) {
      return res.status(400).json({
        message: "User is not blocked",
        success: false,
      });
    }

    const feeDoc = await AccountRecoveryFee.findOne();
    const fee = feeDoc?.fee || 0;
    if (user.mainWallet <= 39) {
      user.isLoginBlocked = false;
      user.lastLoginDate = new Date();
      await user.save();

      return res.status(200).json({
        message:
          "User unblocked without deduction due to low balance (≤ 39 USDT).",
        mainWallet: user.mainWallet,
        success: true,
      });
    }

    if (user.mainWallet < fee) {
      return res.status(400).json({
        message: `Insufficient wallet balance. Minimum ${fee} USDT required.`,
        mainWallet: user.mainWallet,
        success: false,
      });
    }

    // Deduct and unblock
    user.mainWallet -= fee;
    user.isLoginBlocked = false;
    user.lastLoginDate = new Date();
    await user.save();

    await UnblockUserFeeModel.create({
      userId: user._id,
      amount: fee,
      unblockDate: new Date(),
      message: `User unblocked and ${fee} USDT deducted successfully.`,
    });

    return res.status(200).json({
      message: `✅ User unblocked and ${fee} USDT deducted successfully.`,
      mainWallet: user.mainWallet,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "❌ Server error while unblocking user",
      error: error.message,
      success: false,
    });
  }
};
export const getAllDepositChangeHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Admin Access Required",
        success: false,
      });
    }

    const depositChanges = await DepositModel.find({});
    if (!depositChanges) {
      return res.status(200).json({
        message: "No Deposit Change History Found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "All Deposit Change History",
      data: depositChanges,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
      success: false,
    });
  }
};
export const allIncomesforAdmin = async (req, res) => {
  try {
    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();

    // 1. All commissions
    const totalIncome = await Commission.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayIncome = await Commission.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // 2. Trade Income
    const tradeIncome = await Commission.aggregate([
      { $match: { type: "trade" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayTradeIncome = await Commission.aggregate([
      {
        $match: {
          type: "trade",
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // 3. Level Income
    const levelIncome = await Commission.aggregate([
      { $match: { type: "level" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayLevelIncome = await Commission.aggregate([
      {
        $match: {
          type: "level",
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // 4. AI Agent Investment
    const aiAgentInvestment = await AiAgentInvestment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayAiAgentInvestment = await AiAgentInvestment.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // 5. AI Agent Referral Bonus
    const aiAgentReferralBonus = await AiAgentHistory.aggregate([
      { $group: { _id: null, total: { $sum: "$referralBonus" } } },
    ]);

    const todayAiAgentReferralBonus = await AiAgentHistory.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$referralBonus" } } },
    ]);

    const referralBonus = await ReferalBonus.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayReferralBonus = await ReferalBonus.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return res.status(200).json({
      success: true,
      message: "All incomes fetched successfully",
      data: {
        totalIncome: totalIncome[0]?.total || 0,
        todayIncome: todayIncome[0]?.total || 0,

        tradeIncome: tradeIncome[0]?.total || 0,
        todayTradeIncome: todayTradeIncome[0]?.total || 0,

        levelIncome: levelIncome[0]?.total || 0,
        todayLevelIncome: todayLevelIncome[0]?.total || 0,

        aiAgentInvestment: aiAgentInvestment[0]?.total || 0,
        todayAiAgentInvestment: todayAiAgentInvestment[0]?.total || 0,

        aiAgentReferralBonus: aiAgentReferralBonus[0]?.total || 0,
        todayAiAgentReferralBonus: todayAiAgentReferralBonus[0]?.total || 0,

        referralBonus: referralBonus[0]?.total || 0,
        todayReferralBonus: todayReferralBonus[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Error in allIncomesforAdmin:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
// export const getDashboardStats = async (req, res) => {
//   try {
//     const today = moment().startOf("day");

//     // 🧑‍🤝‍🧑 Users
//     const totalUsers = await UserModel.countDocuments();
//     const todayUsers = await UserModel.countDocuments({
//       createdAt: { $gte: today.toDate() },
//     });
//     const validUsers = await UserModel.countDocuments({ isVerified: true });
//     const todayValidUsers = await UserModel.countDocuments({
//       isVerified: true,
//       createdAt: { $gte: today.toDate() },
//     });

//     // 💸 Deposit (Trial Amount ko exclude kiya)
//     const todayDeposit = await Investment.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: today.toDate() },
//           type: { $ne: "Trial Amount" }, // Exclude Trial Amount
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$investmentAmount" } } },
//     ]);
//     const totalDeposit = await Investment.aggregate([
//       {
//         $match: { type: { $ne: "Trial Amount" } },
//       },
//       { $group: { _id: null, total: { $sum: "$investmentAmount" } } },
//     ]);

//     const todayWithdrawal = await Withdrawal.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: today.toDate() },
//           status: "success",
//         },
//       },
//       {
//         $group: { _id: null, total: { $sum: "$amount" } },
//       },
//     ]);

//     const totalWithdrawal = await Withdrawal.aggregate([
//       {
//         $match: {
//           status: "success",
//         },
//       },
//       {
//         $group: { _id: null, total: { $sum: "$amount" } },
//       },
//     ]);

//     // 🤝 Referral Bonus
//     const todayReferral = await ReferalBonus.aggregate([
//       { $match: { date: { $gte: today.toDate() } } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);
//     const totalReferral = await ReferalBonus.aggregate([
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     // 🧬 Level Income
//     const todayLevelIncome = await Commission.aggregate([
//       { $match: { createdAt: { $gte: today.toDate() } } },
//       { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
//     ]);
//     const totalLevelIncome = await Commission.aggregate([
//       { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
//     ]);

//     // ⚙️ ROI (Trade Income)
//     const todayROI = await Roi.aggregate([
//       { $match: { creditedOn: { $gte: today.toDate() } } },
//       { $group: { _id: null, total: { $sum: "$roiAmount" } } },
//     ]);
//     const totalROI = await Roi.aggregate([
//       { $group: { _id: null, total: { $sum: "$roiAmount" } } },
//     ]);

//     // 🤖 AI Agent Income
//     const todayAIAgent = await AiAgentRoi.aggregate([
//       { $match: { createdAt: { $gte: today.toDate() } } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);
//     const totalAIAgent = await AiAgentRoi.aggregate([
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     // 🔄 Fund Transfer
//     const todayTransfer = await FundTransfer.aggregate([
//       { $match: { createdAt: { $gte: today.toDate() } } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);
//     const totalTransfer = await FundTransfer.aggregate([
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     return res.status(200).json({
//       success: true,
//       stats: {
//         users: {
//           total: totalUsers,
//           today: todayUsers,
//           verified: validUsers,
//           todayVerified: todayValidUsers,
//         },
//         deposit: {
//           total: totalDeposit[0]?.total || 0,
//           today: todayDeposit[0]?.total || 0,
//         },
//         withdrawal: {
//           total: totalWithdrawal[0]?.total || 0,
//           today: todayWithdrawal[0]?.total || 0,
//         },
//         referral: {
//           total: totalReferral[0]?.total || 0,
//           today: todayReferral[0]?.total || 0,
//         },
//         levelIncome: {
//           total: totalLevelIncome[0]?.total || 0,
//           today: todayLevelIncome[0]?.total || 0,
//         },
//         roi: {
//           total: totalROI[0]?.total || 0,
//           today: todayROI[0]?.total || 0,
//         },
//         aiAgentIncome: {
//           total: totalAIAgent[0]?.total || 0,
//           today: todayAIAgent[0]?.total || 0,
//         },
//         fundTransfer: {
//           total: totalTransfer[0]?.total || 0,
//           today: todayTransfer[0]?.total || 0,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Dashboard Stats Error:", error.message);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

const getISTDayRangeUTC = () => {
  const now = new Date();

  // IST offset = +5:30
  const istOffset = 5.5 * 60 * 60 * 1000;

  // Current IST time
  const istNow = new Date(now.getTime() + istOffset);

  // IST start of day
  const istStart = new Date(istNow);
  istStart.setHours(0, 0, 0, 0);

  // IST end of day
  const istEnd = new Date(istNow);
  istEnd.setHours(23, 59, 59, 999);

  // Convert back to UTC
  return {
    startOfToday: new Date(istStart.getTime() - istOffset),
    endOfToday: new Date(istEnd.getTime() - istOffset),
  };
};

// export const getDashboardStats = async (req, res) => {
//   try {
//     const startOfToday = new Date(
//       new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
//     );
//     startOfToday.setHours(0, 0, 0, 0);

//     const endOfToday = new Date(
//       new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
//     );
//     endOfToday.setHours(23, 59, 59, 999);

//     // ================= USERS =================
//     const totalUsers = await UserModel.countDocuments();

//     const todayUsers = await UserModel.countDocuments({
//       createdAt: { $gte: startOfToday, $lte: endOfToday },
//     });

//     const validUsers = await UserModel.countDocuments({ isVerified: true });

//     const todayValidUsers = await UserModel.countDocuments({
//       isVerified: true,
//       createdAt: { $gte: startOfToday, $lte: endOfToday },
//     });

//     // ================= DEPOSIT =================
//     const totalDeposit = await Investment.aggregate([
//       { $match: { type: { $ne: "Trial Amount" } } },
//       { $group: { _id: null, total: { $sum: "$investmentAmount" } } },
//     ]);

//     const todayDeposit = await Investment.aggregate([
//       {
//         $match: {
//           type: { $ne: "Trial Amount" },
//           createdAt: { $gte: startOfToday, $lte: endOfToday },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$investmentAmount" } } },
//     ]);

//     // ================= WITHDRAWAL =================
//     const totalWithdrawal = await Withdrawal.aggregate([
//       { $match: { status: "success" } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     const todayWithdrawal = await Withdrawal.aggregate([
//       {
//         $match: {
//           status: "success",
//           createdAt: { $gte: startOfToday, $lte: endOfToday },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     // ================= REFERRAL (FIXED) =================
//     const totalReferral = await ReferalBonus.aggregate([
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     const todayReferral = await ReferalBonus.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: startOfToday, $lte: endOfToday },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     // ================= LEVEL INCOME =================
//     const totalLevelIncome = await Commission.aggregate([
//       { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
//     ]);

//     const todayLevelIncome = await Commission.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: startOfToday, $lte: endOfToday },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
//     ]);

//     // ================= ROI =================
//     const totalROI = await Roi.aggregate([
//       { $group: { _id: null, total: { $sum: "$roiAmount" } } },
//     ]);

//     const todayROI = await Roi.aggregate([
//       {
//         $match: {
//           creditedOn: { $gte: startOfToday, $lte: endOfToday },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$roiAmount" } } },
//     ]);

//     // ================= AI AGENT =================
//     // ================= AI AGENT (✅ ONLY ROI_CREDITED) =================

//     // ✅ Total AI Agent Income (only ROI)
//     const totalAIAgent = await AiAgentHistory.aggregate([
//       {
//         $match: {
//           actionType: "ROI_CREDITED",
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           total: { $sum: "$amount" },
//         },
//       },
//     ]);

//     // ✅ Today AI Agent Income (only ROI, only today)
//     const todayAIAgent = await AiAgentHistory.aggregate([
//       {
//         $match: {
//           actionType: "ROI_CREDITED",
//           timestamp: { $gte: startOfToday, $lte: endOfToday },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           total: { $sum: "$amount" },
//         },
//       },
//     ]);

//     // ================= FUND TRANSFER =================
//     const totalTransfer = await FundTransfer.aggregate([
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     const todayTransfer = await FundTransfer.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: startOfToday, $lte: endOfToday },
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     return res.status(200).json({
//       success: true,
//       stats: {
//         users: {
//           total: totalUsers,
//           today: todayUsers,
//           verified: validUsers,
//           todayVerified: todayValidUsers,
//         },
//         deposit: {
//           total: totalDeposit[0]?.total || 0,
//           today: todayDeposit[0]?.total || 0,
//         },
//         withdrawal: {
//           total: totalWithdrawal[0]?.total || 0,
//           today: todayWithdrawal[0]?.total || 0,
//         },
//         referral: {
//           total: totalReferral[0]?.total || 0,
//           today: todayReferral[0]?.total || 0,
//         },
//         levelIncome: {
//           total: totalLevelIncome[0]?.total || 0,
//           today: todayLevelIncome[0]?.total || 0,
//         },
//         roi: {
//           total: totalROI[0]?.total || 0,
//           today: todayROI[0]?.total || 0,
//         },
//         aiAgentIncome: {
//           total: totalAIAgent[0]?.total || 0,
//           today: todayAIAgent[0]?.total || 0,
//         },
//         fundTransfer: {
//           total: totalTransfer[0]?.total || 0,
//           today: todayTransfer[0]?.total || 0,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Dashboard Stats Error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

export const getDashboardStats = async (req, res) => {
  try {
    // ✅ CORRECT IST → UTC RANGE
    const { startOfToday, endOfToday } = getISTDayRangeUTC();

    // ================= USERS =================
    const totalUsers = await UserModel.countDocuments();

    const todayUsers = await UserModel.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const validUsers = await UserModel.countDocuments({ isVerified: true });

    const todayValidUsers = await UserModel.countDocuments({
      isVerified: true,
      activeDate: { $gte: startOfToday, $lte: endOfToday },
    });

    // ================= DEPOSIT =================
    const totalDeposit = await Investment.aggregate([
      { $match: { type: { $ne: "Trial Amount" } } },
      { $group: { _id: null, total: { $sum: "$investmentAmount" } } },
    ]);

    const todayDeposit = await Investment.aggregate([
      {
        $match: {
          type: { $ne: "Trial Amount" },
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$investmentAmount" } } },
    ]);

    // ================= WITHDRAWAL =================
    const totalWithdrawal = await Withdrawal.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayWithdrawal = await Withdrawal.aggregate([
      {
        $match: {
          status: "success",
          updatedAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // ================= REFERRAL =================
    const totalReferral = await ReferalBonus.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayReferral = await ReferalBonus.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // ================= LEVEL INCOME =================
    const totalLevelIncome = await Commission.aggregate([
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
    ]);

    const todayLevelIncome = await Commission.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
    ]);

    // ================= ROI =================
    const totalROI = await Roi.aggregate([
      { $group: { _id: null, total: { $sum: "$roiAmount" } } },
    ]);

    const todayROI = await Roi.aggregate([
      {
        $match: {
          creditedOn: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$roiAmount" } } },
    ]);

    // ================= AI AGENT (ONLY ROI_CREDITED) =================
    const totalAIAgent = await AiAgentHistory.aggregate([
      { $match: { actionType: "ROI_CREDITED" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayAIAgent = await AiAgentHistory.aggregate([
      {
        $match: {
          actionType: "ROI_CREDITED",
          timestamp: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // ================= FUND TRANSFER =================
    const totalTransfer = await FundTransfer.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const todayTransfer = await FundTransfer.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          today: todayUsers,
          verified: validUsers,
          todayVerified: todayValidUsers,
        },
        deposit: {
          total: totalDeposit[0]?.total || 0,
          today: todayDeposit[0]?.total || 0,
        },
        withdrawal: {
          total: totalWithdrawal[0]?.total || 0,
          today: todayWithdrawal[0]?.total || 0,
        },
        referral: {
          total: totalReferral[0]?.total || 0,
          today: todayReferral[0]?.total || 0,
        },
        levelIncome: {
          total: totalLevelIncome[0]?.total || 0,
          today: todayLevelIncome[0]?.total || 0,
        },
        roi: {
          total: totalROI[0]?.total || 0,
          today: todayROI[0]?.total || 0,
        },
        aiAgentIncome: {
          total: totalAIAgent[0]?.total || 0,
          today: todayAIAgent[0]?.total || 0,
        },
        fundTransfer: {
          total: totalTransfer[0]?.total || 0,
          today: todayTransfer[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const investmentAndDepositHistory = async (req, res) => {
  try {
    // Query params se date nikalna
    const { startDate, endDate } = req.query;

    let dateFilter = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };
    }

    // Deposit History (Trial Amount exclude)
    const allDepositHistory = await Investment.find({
      type: { $ne: "Trial Amount" },
      ...dateFilter,
    })
      .populate(
        "userId",
        "username uuid profilePicture isLoginBlocked additionalWallet mainWallet",
      )
      .sort({ createdAt: -1 });
    const allWithdrawalHistory = await Withdrawal.find({
      ...dateFilter,
    })
      .populate(
        "userId",
        "username uuid profilePicture mainWallet additionalWallet",
      )
      .sort({ createdAt: -1 });

    let totalDeposit = 0;
    let totalWithdrawal = 0;
    let totalPending = 0;
    let totalCancelled = 0;
    let totalFund = 0;
    let totalRewardAmount = 0;

    // Deposit Summary
    allDepositHistory.forEach((item) => {
      totalDeposit += item.investmentAmount;
    });

    // Withdrawal Summary
    allWithdrawalHistory.forEach((item) => {
      if (item.status === "success") totalWithdrawal += item.amount;
      else if (item.status === "pending") totalPending += item.amount;
      else if (item.status === "cancelled" || item.status === "failed")
        totalCancelled += item.amount;
    });
    const allrewardHistory = await UserRewardModel.find({})
      .populate(
        "userId",
        "username uuid profilePicture _id additionalWallet mainWallet",
      )
      .sort({ createdAt: -1 });

    allWithdrawalHistory.forEach((w) => {
      totalRewardAmount += w.amount;
    });
    const transferHistory = await FundTransfer.find({})
      .populate(
        "from",
        "username _id uuid profilePicture mainWallet additionalWallet",
      )
      .populate(
        "to",
        "username _id uuid profilePicture mainWallet additionalWallet",
      )
      .sort({ createdAt: -1 });

    transferHistory.forEach((f) => {
      totalFund += f.amount;
    });

    return res.status(200).json({
      message: "Deposit and Withdrawal history fetched successfully",
      success: true,
      deposits: allDepositHistory,
      withdrawals: allWithdrawalHistory,
      rewards: allrewardHistory,
      transferHistory,
      summary: {
        totalDeposit,
        totalWithdrawal,
        totalPending,
        totalCancelled,
        totalFund,
        totalRewardAmount,
      },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({
      message: "Server Error while fetching history",
      success: false,
      error: error.message,
    });
  }
};

// export const getLiveTransactionHistory = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     let dateFilter = {};

//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       start.setHours(0, 0, 0, 0);
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);

//       dateFilter = {
//         createdAt: {
//           $gte: start,
//           $lte: end,
//         },
//       };
//     }

//     const allDepositHistory = await Investment.find({
//       type: { $ne: "Trial Amount" },
//       ...dateFilter,
//     })
//       .populate(
//         "userId",
//         "username uuid profilePicture isLoginBlocked additionalWallet mainWallet"
//       )
//       .sort({ investmentDate: -1 });

//     const allWithdrawalHistory = await Withdrawal.find({
//       ...dateFilter,
//     })
//       .populate(
//         "userId",
//         "username uuid profilePicture mainWallet additionalWallet"
//       )
//       .sort({ createdAt: -1 });

//     let totalDeposit = 0;
//     let totalWithdrawal = 0;
//     let totalPending = 0;
//     let totalCancelled = 0;
//     let totalTransferFund = 0;
//     let totalRewardAmount = 0;
//     let totalDeduct = 0;
//     let totalAddFund = 0;

//     // Deposit Summary
//     allDepositHistory.forEach((item) => {
//       totalDeposit += item.investmentAmount;
//     });

//     // Withdrawal Summary
//     allWithdrawalHistory.forEach((item) => {
//       if (item.status === "success") totalWithdrawal += item.amount;
//       else if (item.status === "pending") totalPending += item.amount;
//       else if (item.status === "cancelled" || item.status === "failed")
//         totalCancelled += item.amount;
//     });

//     const transferHistory = await FundTransfer.find({})
//       .populate(
//         "from",
//         "username _id uuid profilePicture mainWallet additionalWallet"
//       )
//       .populate(
//         "to",
//         "username _id uuid profilePicture mainWallet additionalWallet"
//       )
//       .sort({ createdAt: -1 });

//     transferHistory.forEach((f) => {
//       totalTransferFund += f.amount;
//     });

//     const rewardsHistory = await TopupModel.find().populate(
//       "userId",
//       "username _id uuid profilePicture mainWallet additionalWallet"
//     );
//     rewardsHistory.forEach((r) => {
//       totalAddFund += r.amount;
//     });

//     const deductHistory = await DeductModel.find().populate(
//       "userId",
//       "uuid username mainWallet additionalWallet profilePicture"
//     );
//     deductHistory.forEach((d) => {
//       totalDeduct += d.amount;
//     });
//     return res.status(200).json({
//       message: "Deposit and Withdrawal history fetched successfully",
//       success: true,
//       deposits: allDepositHistory,
//       withdrawals: allWithdrawalHistory,
//       transferHistory,
//       rewardsHistory,
//       deductHistory,
//       summary: {
//         totalDeposit,
//         totalWithdrawal,
//         totalPending,
//         totalCancelled,
//         totalTransferFund,
//         totalAddFund,
//         totalDeduct,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching history:", error);
//     return res.status(500).json({
//       message: "Server Error while fetching history",
//       success: false,
//       error: error.message,
//     });
//   }
// };
// export const getAllUsers = async (req, res) => {
//   try {
//     let allUsers = await UserModel.find(
//       {},
//       "username uuid profilePicture _id sponsorId isVerified isAdminLoginBlock isLoginBlocked password phone email createdAt isActive level mainWallet additionalWallet"
//     )
//       .sort({ createdAt: -1 })
//       .populate("sponsorId", "uuid")
//       .lean();

//     const totalUsers = allUsers.length;
//     const totalValidUsers = allUsers.filter((user) => user.isVerified).length;
//     const totalDeactivatedUsers = allUsers.filter(
//       (user) => user.isLoginBlocked
//     ).length;

//     const usersWithDeposit = await Promise.all(
//       allUsers.map(async (user) => {
//         const userDeposits = await Investment.find(
//           { userId: user._id, type: "Deposit" },
//           "investmentAmount createdAt"
//         ).sort({ createdAt: -1 });

//         const totalDeposit = userDeposits.reduce(
//           (sum, dep) => sum + dep.investmentAmount,
//           0
//         );

//         return {
//           username: user.username,
//           _id: user._id,
//           uuid: user.uuid,
//           profilePicture: user.profilePicture || null,
//           sponsorUUID: user.sponsorId?.uuid || null,
//           totalDeposit,
//           createdAt: user.createdAt,
//           isVerified: user.isVerified,
//           mainWallet: user.mainWallet,
//           additionalWallet: user.additionalWallet,
//           password: user.password,
//           isLoginBlocked: user.isLoginBlocked,
//           email: user.email,
//           level: user.level,
//           phone: user.phone,
//           isAdminLoginBlock: user.isAdminLoginBlock,
//           isActive: user.isActive,
//           deposits: userDeposits.map((dep) => ({
//             amount: dep.investmentAmount,
//             date: dep.createdAt,
//           })),
//         };
//       })
//     );
//     return res.status(200).json({
//       message: "All users fetched successfully",
//       success: true,
//       usersHistory: usersWithDeposit,
//       summary: {
//         totalUsers,
//         totalValidUsers,
//         totalDeactivatedUsers,
//       },
//     });
//   } catch (error) {
//     console.error("Get All Users Error:", error);
//     return res.status(500).json({
//       message: "Server Error while fetching users",
//       success: false,
//       error: error.message,
//     });
//   }
// };

export const getLiveTransactionHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };
    }

    // -------- INVESTMENT / DEPOSIT --------
    const allDepositHistory = await Investment.find({
      type: { $ne: "Trial Amount" },
      ...dateFilter,
    })
      .populate(
        "userId",
        "username uuid profilePicture isLoginBlocked additionalWallet mainWallet",
      )
      .sort({ investmentDate: -1 });

    // -------- WITHDRAWAL --------
    const allWithdrawalHistory = await Withdrawal.find({
      ...dateFilter,
    })
      .populate(
        "userId",
        "username uuid profilePicture mainWallet additionalWallet",
      )
      .sort({ createdAt: -1 });

    // -------- FUND TRANSFER --------
    const transferHistory = await FundTransfer.find({ ...dateFilter })
      .populate(
        "from",
        "username _id uuid profilePicture mainWallet additionalWallet",
      )
      .populate(
        "to",
        "username _id uuid profilePicture mainWallet additionalWallet",
      )
      .sort({ createdAt: -1 });

    // -------- REWARDS / TOPUP --------
    const rewardsHistory = await TopupModel.find({ ...dateFilter })
      .populate(
        "userId",
        "username _id uuid profilePicture mainWallet additionalWallet",
      )
      .sort({ createdAt: -1 });

    // -------- DEDUCT --------
    const deductHistory = await DeductModel.find({ ...dateFilter })
      .populate(
        "userId",
        "uuid username mainWallet additionalWallet profilePicture",
      )
      .sort({ createdAt: -1 });

    // -------- SUMMARY CALCULATION --------
    let totalDeposit = 0,
      totalWithdrawal = 0,
      totalPending = 0,
      totalCancelled = 0,
      totalTransferFund = 0,
      totalAddFund = 0,
      totalDeduct = 0;

    allDepositHistory.forEach((item) => {
      totalDeposit += item.investmentAmount;
    });

    allWithdrawalHistory.forEach((item) => {
      if (item.status === "success") totalWithdrawal += item.amount;
      else if (item.status === "pending") totalPending += item.amount;
      else if (item.status === "cancelled" || item.status === "failed")
        totalCancelled += item.amount;
    });

    transferHistory.forEach((f) => {
      totalTransferFund += f.amount;
    });

    rewardsHistory.forEach((r) => {
      totalAddFund += r.amount;
    });

    deductHistory.forEach((d) => {
      totalDeduct += d.amount;
    });

    return res.status(200).json({
      message: "Deposit and Withdrawal history fetched successfully",
      success: true,
      deposits: allDepositHistory,
      withdrawals: allWithdrawalHistory,
      transferHistory,
      rewardsHistory,
      deductHistory,
      summary: {
        totalDeposit,
        totalWithdrawal,
        totalPending,
        totalCancelled,
        totalTransferFund,
        totalAddFund,
        totalDeduct,
      },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({
      message: "Server Error while fetching history",
      success: false,
      error: error.message,
    });
  }
};

// export const getAllUsers = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     console.log(startDate, endDate);

//     let dateFilter = {};
//     if (startDate && endDate) {
//       dateFilter.createdAt = {
//         $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
//         $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
//       };
//     }

//     let allUsers = await UserModel.find(
//       dateFilter,
//       "username uuid profilePicture _id sponsorId isVerified isAdminLoginBlock isLoginBlocked password phone email createdAt isActive level mainWallet additionalWallet"
//     )
//       .sort({ createdAt: -1 })
//       .populate("sponsorId", "uuid")
//       .lean();

//     if (!allUsers) {
//       return res.status(404).json({
//         message: "Users not found",
//         success: false,
//       });
//     }
//     const totalUsers = allUsers.length;
//     const totalValidUsers = allUsers.filter((user) => user.isVerified).length;
//     const totalDeactivatedUsers = allUsers.filter(
//       (user) => user.isLoginBlocked
//     ).length;
//     const usersWithDeposit = await Promise.all(
//       allUsers.map(async (user) => {
//         const depositFilter = {
//           userId: user._id,
//           type: "Deposit",
//         };

//         // Agar date range diya hai toh deposits pe bhi filter lagao
//         if (startDate && endDate) {
//           depositFilter.createdAt = {
//             $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
//             $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
//           };
//         }

//         const userDeposits = await Investment.find(
//           depositFilter,
//           "investmentAmount createdAt"
//         ).sort({ createdAt: -1 });

//         const totalDeposit = userDeposits.reduce(
//           (sum, dep) => sum + dep.investmentAmount,
//           0
//         );

//         return {
//           username: user.username,
//           _id: user._id,
//           uuid: user.uuid,
//           profilePicture: user.profilePicture || null,
//           sponsorUUID: user.sponsorId?.uuid || null,
//           totalDeposit,
//           createdAt: user.createdAt,
//           isVerified: user.isVerified,
//           mainWallet: user.mainWallet,
//           additionalWallet: user.additionalWallet,
//           password: user.password,
//           isLoginBlocked: user.isLoginBlocked,
//           email: user.email,
//           level: user.level,
//           phone: user.phone,
//           isAdminLoginBlock: user.isAdminLoginBlock,
//           isActive: user.isActive,
//           deposits: userDeposits.map((dep) => ({
//             amount: dep.investmentAmount,
//             date: dep.createdAt,
//           })),
//         };
//       })
//     );

//     return res.status(200).json({
//       message: "All users fetched successfully",
//       success: true,
//       usersHistory: usersWithDeposit,
//       summary: {
//         totalUsers,
//         totalValidUsers,
//         totalDeactivatedUsers,
//       },
//     });
//   } catch (error) {
//     console.error("Get All Users Error:", error);
//     return res.status(500).json({
//       message: "Server Error while fetching users",
//       success: false,
//       error: error.message,
//     });
//   }
// };

// export const getAllUsers = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     console.log(startDate, endDate);

//     let dateFilter = {};
//     if (startDate && endDate) {
//       dateFilter.createdAt = {
//         $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
//         $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
//       };
//     }

//     let allUsers = await UserModel.find(
//       dateFilter,
//       "username uuid profilePicture _id sponsorId isVerified isAdminLoginBlock isLoginBlocked password phone email createdAt isActive level mainWallet additionalWallet"
//     )
//       .sort({ createdAt: -1 })
//       .populate("sponsorId", "uuid")
//       .lean();
//     if (!allUsers || allUsers.length === 0) {
//       return res.status(404).json({
//         message: "Users not found",
//         success: false,
//       });
//     }

//     const totalUsers = allUsers.length;
//     const totalValidUsers = allUsers.filter((user) => user.isVerified).length;
//     const totalDeactivatedUsers = allUsers.filter(
//       (user) => user.isLoginBlocked
//     ).length;

//     const usersWithDeposit = await Promise.all(
//       allUsers.map(async (user) => {
//         const depositFilter = {
//           userId: user._id,
//           type: "Deposit",
//         };

//         if (startDate && endDate) {
//           depositFilter.createdAt = {
//             $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
//             $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
//           };
//         }

//         const userDeposits = await Investment.find(
//           depositFilter,
//           "investmentAmount createdAt"
//         ).sort({ createdAt: -1 });

//         const totalDeposit = userDeposits.reduce(
//           (sum, dep) => sum + dep.investmentAmount,
//           0
//         );

//         return {
//           username: user.username,
//           _id: user._id,
//           uuid: user.uuid,
//           profilePicture: user.profilePicture || null,
//           sponsorUUID: user.sponsorId?.uuid || null,
//           totalDeposit,
//           createdAt: user.createdAt,
//           isVerified: user.isVerified,
//           mainWallet: user.mainWallet,
//           additionalWallet: user.additionalWallet,
//           password: user.password,
//           isLoginBlocked: user.isLoginBlocked,
//           email: user.email,
//           level: user.level,
//           phone: user.phone,
//           isAdminLoginBlock: user.isAdminLoginBlock,
//           isActive: user.isActive,
//           deposits: userDeposits.map((dep) => ({
//             amount: dep.investmentAmount,
//             date: dep.createdAt,
//           })),
//         };
//       })
//     );

//     // 🔹 Ab deposit summary bhi filter ke base par nikal lo
//     const totalDeposits = usersWithDeposit.reduce(
//       (sum, user) => sum + user.totalDeposit,
//       0
//     );
//     const usersWithDepositCount = usersWithDeposit.filter(
//       (u) => u.totalDeposit > 0
//     ).length;

//     console.log(totalUsers.length, " total users");
//     return res.status(200).json({
//       message: "All users fetched successfully",
//       success: true,
//       usersHistory: usersWithDeposit,
//       summary: {
//         totalUsers,
//         totalValidUsers,
//         totalDeactivatedUsers,
//       },
//     });
//   } catch (error) {
//     console.error("Get All Users Error:", error);
//     return res.status(500).json({
//       message: "Server Error while fetching users",
//       success: false,
//       error: error.message,
//     });
//   }
// };
export const getAllUsers = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    let allUsers = await UserModel.find(
      dateFilter,
      "username uuid profilePicture _id sponsorId isVerified isAdminLoginBlock isLoginBlocked password phone email createdAt isActive level mainWallet additionalWallet",
    )
      .sort({ createdAt: -1 })
      .populate("sponsorId", "uuid")
      .lean();

    if (!allUsers || allUsers.length === 0) {
      return res.status(404).json({
        message: "Users not found",
        success: false,
      });
    }

    // ✅ summary based on filter
    const totalUsers = allUsers.length;
    const totalValidUsers = allUsers.filter(
      (user) => user.mainWallet >= 30,
    ).length;
    const totalDeactivatedUsers = allUsers.filter(
      (user) => user.isLoginBlocked,
    ).length;
    const PendingUsers = allUsers.filter((user) => user.mainWallet < 30);

    // ✅ deposits calculation
    const usersWithDeposit = await Promise.all(
      allUsers.map(async (user) => {
        const depositFilter = {
          userId: user._id,
          type: "Deposit",
        };

        if (startDate && endDate) {
          depositFilter.createdAt = {
            $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
          };
        }

        const userDeposits = await Investment.find(
          depositFilter,
          "investmentAmount createdAt",
        ).sort({ createdAt: -1 });

        const totalDeposit = userDeposits.reduce(
          (sum, dep) => sum + dep.investmentAmount,
          0,
        );

        return {
          username: user.username,
          _id: user._id,
          uuid: user.uuid,
          profilePicture: user.profilePicture || null,
          sponsorUUID: user.sponsorId?.uuid || null,
          totalDeposit,
          createdAt: user.createdAt,
          isVerified: user.isVerified,
          mainWallet: user.mainWallet,
          additionalWallet: user.additionalWallet,
          password: user.password,
          isLoginBlocked: user.isLoginBlocked,
          email: user.email,
          level: user.level,
          phone: user.phone,
          isAdminLoginBlock: user.isAdminLoginBlock,
          isActive: user.isActive,
          deposits: userDeposits.map((dep) => ({
            amount: dep.investmentAmount,
            date: dep.createdAt,
          })),
        };
      }),
    );

    // ✅ deposit summary based on filter
    const totalDeposits = usersWithDeposit.reduce(
      (sum, user) => sum + user.totalDeposit,
      0,
    );
    const usersWithDepositCount = usersWithDeposit.filter(
      (u) => u.totalDeposit > 0,
    ).length;

    console.log(
      `Users fetched: ${totalUsers}, Deposits: ${totalDeposits}, Users with deposits: ${usersWithDepositCount}`,
    );

    return res.status(200).json({
      message: "All users fetched successfully",
      success: true,
      usersHistory: usersWithDeposit,
      summary: {
        totalUsers,
        totalValidUsers,
        totalDeactivatedUsers,
        pendingUsers: allUsers.filter((user) => user.mainWallet < 30).length,
        totalDeposits,
        usersWithDepositCount,
        filterApplied: !!(startDate && endDate),
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({
      message: "Server Error while fetching users",
      success: false,
      error: error.message,
    });
  }
};

export const getUsersByCountry = async (req, res) => {
  try {
    const countryStats = await UserModel.aggregate([
      {
        $group: {
          _id: {
            countryName: "$countryName",
            countryCode: "$countryCode",
          },
          userCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          countryName: "$_id.countryName",
          countryCode: "$_id.countryCode",
          userCount: 1,
        },
      },
      {
        $sort: { userCount: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: countryStats,
    });
  } catch (error) {
    console.error("Error in getUsersByCountry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const softDeleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.status(200).json({
      success: true,
      message: "User moved to Recycle Bin",
      user,
    });
  } catch (err) {
    console.error("Soft Delete Error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const restoreUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        isDeleted: false,
        deletedAt: null,
      },
      { new: true },
    );

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.status(200).json({
      success: true,
      message: "User restored from Recycle Bin",
      user,
    });
  } catch (err) {
    console.error("Restore Error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const allLevelMembersOfEachUsers = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Admin Access Required",
        success: false,
      });
    }
    const { userId } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(400).json({
        message: "User Not Found",
        success: false,
      });
    }

    const { teamA, teamB, teamC } = await calculateTeams(user._id);

    return res.status(200).json({
      message: "All Level Users Found",
      success: true,
      teams: {
        teamA,
        teamB,
        teamC,
      },
    });
  } catch (error) {
    console.error("Error in allLevelMembersOfEachUsers:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
export const registerUserByAdmin = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      phone,
      profileImage,
      countryCode,
      referredBy,
    } = req.body;

    const emails = email.toLowerCase();
    const { name, value } = countryCode;

    const existingUser = await UserModel.findOne({ email: emails });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const userCount = await UserModel.countDocuments();
    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = generateReferralCode();
    const uuid = await generate9DigitUUID().toUpperCase();
    const deposit = await DirectreferalPercentage.findOne();
    const bonus = deposit?.Bonus || 0;

    let sponsorUser = null;
    let placement = null;

    if (userCount > 0) {
      if (!referredBy) {
        console.log("Referral ID missing in request");
        return res
          .status(400)
          .json({ success: false, message: "Referral ID is required" });
      }

      sponsorUser = await UserModel.findOne({ referralCode: referredBy });
      if (!sponsorUser) {
        console.log("Invalid Referral ID:", referredBy);
        return res
          .status(400)
          .json({ success: false, message: "Invalid referral ID" });
      }

      placement = await findAvailablePosition(sponsorUser._id);
      if (!placement) {
        // console.log("No available placement found for:", sponsorUser._id);
        return res
          .status(400)
          .json({ success: false, message: "No available position found" });
      }
    }

    let avatarUrl = "";
    if (profileImage) {
      try {
        // console.log("Profile Image provided. Uploading to Cloudinary...");
        const uploadResponse = await cloudinary.uploader.upload(profileImage, {
          folder: "user_profiles",
        });
        // console.log("Cloudinary Upload Success:", uploadResponse);
        avatarUrl = uploadResponse.secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile picture",
          error: cloudinaryError.message,
        });
      }
    } else {
      console.log("No profileImage provided, using default avatar URL");
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        username,
      )}&background=4CAF50&color=fff&size=256`;
    }

    console.log("Creating new user in DB..."); // DEBUG

    const newUser = await UserModel.create({
      email: emails,
      password: hashedPassword,
      BonusCredit: bonus,
      bonusAddedAt: Date.now(),
      username: username.toLowerCase(),
      phone,
      countryName: name,
      countryCode: value,
      uuid,
      referralCode,
      otpVerified: true,
      role: "user",
      profilePicture: avatarUrl,
      createdByAdmin: true,
      ...(userCount > 0 && {
        sponsorId: sponsorUser._id,
        parentId: placement.parent,
        position: placement.position,
        parentReferedCode: referredBy,
      }),
    });

    await Investment.create({
      userId: newUser._id,
      walletAddress: "default-bonus-wallet",
      type: "Trial Amount",
      investmentAmount: 200,
      txResponse: `BONUS-${uuidv4()}`,
      walletType: "mainWallet",
      depositBy: "admin",
    });

    if (userCount > 0) {
      await UserModel.findByIdAndUpdate(sponsorUser._id, {
        $addToSet: { referedUsers: newUser._id },
      });

      await UserModel.findByIdAndUpdate(placement.parent, {
        [placement.position]: newUser._id,
      });
    }

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "3h",
    });

    // console.log("Token generated for new user:", token);

    return res
      .cookie("token", token, {
        expires: new Date(Date.now() + 3 * 60 * 60 * 1000),
        httpOnly: true,
        secure: false,
      })
      .status(201)
      .json({
        success: true,
        message: "User registered successfully by Admin",
        user: newUser,
        token,
      });
  } catch (error) {
    console.error("Admin Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const updateUserProfile = async (req, res) => {
  try {
    const admin = req.admin?._id;
    if (!admin) {
      return res.status(401).json({
        message: "Unauthorized Admin Access",
        success: false,
      });
    }

    const { userId, username, email, phoneNumber, newPassword } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email && email !== user.email) {
      const emailExists = await UserModel.findOne({
        email: email.toLowerCase(),
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
      user.email = email.toLowerCase();
    }

    if (username) user.username = username.toLowerCase();
    if (phoneNumber) user.phone = phoneNumber;

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// export const getUserTransactionHistory = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const deposits = await Investment.find({ userId }).populate;
//     const totalDepositAmount = deposits.reduce((acc, tx) => acc + tx.amount, 0);

//     const withdrawals = await Withdrawal.find({ userId });
//     const totalWithdrawalAmount = withdrawals
//       .filter((w) => w.status === "approved")
//       .reduce((acc, w) => acc + w.amount, 0);

//     const totalPendingWithdrawal = withdrawals
//       .filter((w) => w.status === "pending")
//       .reduce((acc, w) => acc + w.amount, 0);

//     const totalCancelledWithdrawal = withdrawals
//       .filter((w) => w.status === "cancelled")
//       .reduce((acc, w) => acc + w.amount, 0);

//     const fundTransfers = await FundTransfer.find({ sender: userId });
//     const totalFundTransfer = fundTransfers.reduce(
//       (acc, tx) => acc + tx.amount,
//       0
//     );

//     const swaps = await SwapModel.find({ userId });
//     const totalSwaps = swaps.reduce((acc, tx) => acc + tx.amount, 0);

//     const rewards = await Commission.find({ userId });
//     const totalTeamReward = rewards.reduce((acc, tx) => acc + tx.amount, 0);

//     return res.status(200).json({
//       success: true,
//       message: "User transaction history fetched successfully",
//       data: {
//         deposits,
//         withdrawals,
//         fundTransfers,
//         swaps,
//         teamRewards: rewards,
//       },
//       totals: {
//         totalDepositAmount,
//         totalWithdrawalAmount,
//         totalPendingWithdrawal,
//         totalCancelledWithdrawal,
//         totalFundTransfer,
//         totalSwaps,
//         totalTeamReward,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getUserTransactionHistory:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

export const getUserTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      deposits,
      depositTotals,
      withdrawals,
      withdrawalTotals,
      fundTransfers,
      fundTransferTotals,
      swaps,
      swapTotals,
      rewards,
      rewardTotals,
    ] = await Promise.all([
      // Deposits data
      Investment.find({ userId }).sort({ createdAt: -1 }),

      // Deposit total
      Investment.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Withdrawal data
      Withdrawal.find({ userId }).sort({ createdAt: -1 }),

      // Withdrawal totals: pending + approved + cancelled
      Withdrawal.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$amount" },
          },
        },
      ]),

      // Fund Transfers data
      FundTransfer.find({ sender: userId }).sort({ createdAt: -1 }),

      // Fund Transfer total
      FundTransfer.aggregate([
        { $match: { sender: userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Swap data
      SwapModel.find({ userId }).sort({ createdAt: -1 }),

      // Swap total
      SwapModel.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Rewards data
      Commission.find({ userId }).sort({ createdAt: -1 }),

      // Reward total
      Commission.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    // Extract structured withdrawal totals
    const withdrawalTotalsObj = {
      approved: 0,
      pending: 0,
      cancelled: 0,
    };

    withdrawalTotals.forEach((w) => {
      withdrawalTotalsObj[w._id] = w.total;
    });

    return res.status(200).json({
      success: true,
      message: "User transaction history fetched successfully",
      data: { deposits, withdrawals, fundTransfers, swaps, rewards },
      totals: {
        totalDepositAmount: depositTotals[0]?.total || 0,
        totalWithdrawalAmount: withdrawalTotalsObj.approved,
        totalPendingWithdrawal: withdrawalTotalsObj.pending,
        totalCancelledWithdrawal: withdrawalTotalsObj.cancelled,
        totalFundTransfer: fundTransferTotals[0]?.total || 0,
        totalSwaps: swapTotals[0]?.total || 0,
        totalTeamReward: rewardTotals[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Error in getUserTransactionHistory:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const createReferRewardSlab = async (req, res) => {
  try {
    const { depositAmount, rewardAmount, scheduleAt, time, ampm } = req.body;

    if (!depositAmount || !scheduleAt || !time || !ampm) {
      return res.status(400).json({
        success: false,
        message: "Deposit amount, date, time and AM/PM are required",
      });
    }

    // Time ko 24-hour format me convert karo
    let [hours, minutes] = time.split(":").map(Number);
    if (ampm.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;

    // Final Date object
    const finalDateTime = new Date(scheduleAt);
    finalDateTime.setHours(hours);
    finalDateTime.setMinutes(minutes);
    finalDateTime.setSeconds(0);
    finalDateTime.setMilliseconds(0);

    // Check existing slab
    const existing = await ReferRewardSlab.findOne({ depositAmount });
    console.log(existing, "ex");
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Slab already exists for this amount",
      });
    }

    // Create slab
    await ReferRewardSlab.create({
      depositAmount,
      rewardAmount,
      scheduleAt: finalDateTime,
    });

    res.status(201).json({
      success: true,
      message: "Slab created successfully",
    });
  } catch (error) {
    console.error("createReferRewardSlab Error:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
export const deleteReferRewardSlab = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Slab ID is required",
      });
    }

    const deletedSlab = await ReferRewardSlab.findByIdAndDelete(id);
    if (!deletedSlab) {
      return res.status(404).json({
        success: false,
        message: "Slab not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Slab deleted successfully",
      deletedSlab,
    });
  } catch (error) {
    console.error("deleteReferRewardSlab Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const createJoiningBonusSlab = async (req, res) => {
  try {
    const { depositAmount, rewardAmount, scheduleAt, time, ampm } = req.body;
    console.log(req.body);

    if (!depositAmount || !rewardAmount || !scheduleAt || !time || !ampm) {
      return res.status(400).json({
        success: false,
        message:
          "depositAmount, rewardAmount, scheduleAt, time, and ampm are required",
      });
    }

    // Check if slab already exists for depositAmount
    const existing = await JoiningBonusSlab.findOne({ depositAmount });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Slab already exists for this deposit amount",
      });
    }

    // Convert scheduleAt + time + ampm to Date object
    let [hours, minutes] = time.split(":").map(Number);
    if (ampm.toLowerCase() === "pm" && hours !== 12) hours += 12;
    if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;

    const finalScheduleDate = new Date(scheduleAt);
    finalScheduleDate.setHours(hours, minutes, 0, 0);

    // Save slab
    await JoiningBonusSlab.create({
      depositAmount,
      bonusAmount: rewardAmount,
      scheduleAt: finalScheduleDate,
    });

    return res.status(201).json({
      success: true,
      message: "Joining Bonus Slab created successfully",
    });
  } catch (error) {
    console.error("createJoiningBonusSlab Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const deleteJoiningBonusSlab = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Please provide a slab ID to delete",
      });
    }

    const result = await JoiningBonusSlab.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No slab found with the given ID",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Joining Bonus Slab deleted successfully",
    });
  } catch (error) {
    console.error("deleteJoiningBonusSlab Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getJoiningBonusSlabs = async (req, res) => {
  try {
    const slabs = await JoiningBonusSlab.find();

    return res.status(200).json({
      success: true,
      message: "Joining Bonus Slabs fetched successfully",
      data: slabs,
    });
  } catch (error) {
    console.error("getJoiningBonusSlabs Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const getLevelPercentage = async (req, res) => {
  try {
    const admin = req.admin?._id;

    if (!admin) {
      return res.status(401).json({
        message: "Access Denied",
        success: false,
      });
    }

    const allLevelPercentage = await LevelPercentage.find();

    if (!allLevelPercentage || allLevelPercentage.length === 0) {
      return res.status(404).json({
        message: "No Level Percentage Found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Level Percentage Fetched",
      success: true,
      data: allLevelPercentage,
    });
  } catch (error) {
    console.error("❌ Error in getLevelPercentage:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const updateMultipleLevels = async (req, res) => {
  try {
    const admin = req.admin?._id;
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Access Denied",
      });
    }

    const { levels } = req.body;

    if (!Array.isArray(levels) || levels.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Levels array is required",
      });
    }

    // Process all updates in parallel
    const updatePromises = levels.map((lvl) =>
      LevelPercentage.findOneAndUpdate(
        { level: lvl.level },
        { $set: { A: lvl.A, B: lvl.B, C: lvl.C } },
        { new: true, upsert: true }, // upsert will create if doesn't exist
      ),
    );

    const updatedLevels = await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: "Levels updated successfully",
      data: updatedLevels,
    });
  } catch (error) {
    console.error("❌ Error in updateMultipleLevels:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getAllLevelPercentage = async (req, res) => {
  try {
    const allLevel = await LevelPercentage.find();
    return res.status(200).json({
      message: "Level fetched",
      success: true,
      data: allLevel,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in fetching Level",
      success: false,
    });
  }
};

export const setOrUpdateReferralSlab = async (req, res) => {
  try {
    const admin = req.admin?._id;
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { investmentAmount, referralsRequired, rewardAmount } = req.body;
    console.log(req.body, "req.body");

    if (!referralsRequired || !rewardAmount || !investmentAmount) {
      return res.status(400).json({
        success: false,
        message:
          "investmentAmount, referralsRequired and rewardAmount are required",
      });
    }

    await AdminReferralRewardSlab.deleteMany({});

    // 2️⃣ Create new slab
    const slab = await AdminReferralRewardSlab.create({
      investmentAmount,
      referralsRequired,
      rewardAmount,
    });

    return res.status(200).json({
      success: true,
      message: "Old slab deleted & new slab created successfully",
      data: slab,
    });
  } catch (error) {
    console.error("Error in setOrUpdateReferralSlab:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const deleteReferralSlab = async (req, res) => {
  try {
    const admin = req.admin?._id;
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { referralsRequired } = req.body;

    if (!referralsRequired) {
      return res.status(400).json({
        success: false,
        message: "referralsRequired is required to delete the slab",
      });
    }

    const deleted = await ReferralRewardSlab.findOneAndDelete({
      referralsRequired,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Slab not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Slab deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Error in deleteReferralSlab:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// export const blockUserWithdrawal = async (req, res) => {
//   try {
//     const { uuid, date } = req.body;

//     const user = await UserModel.findOne({ uuid });
//     if (!user) {
//       return res.status(404).json({
//         message: "User not found",
//         success: false,
//       });
//     }

//     user.withdrawalBlockedUntil = date;
//     user.transferBlock = true;
//     user.isWithdrawalBlocked = true;

//     await user.save();

//     return res.status(200).json({
//       message: "User withdrawal blocked successfully",
//       success: true,
//     });
//   } catch (error) {
//     console.error("Error blocking user withdrawal:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       success: false,
//     });
//   }
// };

export const blockUserWithdrawal = async (req, res) => {
  try {
    const { uuid, date } = req.body;
    const adminId = req.admin?._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    user.withdrawalBlockedUntil = date;
    user.transferBlock = true;
    user.isWithdrawalBlocked = true;

    await user.save();

    // 📝 Activity Log
    await createActivityLog(
      adminId,
      "User Withdrawal Blocked",
      `Withdrawal blocked for user ${
        user.username || user.email || user.uuid
      } until ${date}`,
      req.ip,
    );
    io.emit("new-activity", {
      type: "User Withdrawal Blocked",
      message: `Withdrawal blocked for user ${
        user.username || user.email || user.uuid
      } until ${date}`,
      date: new Date(),
    });
    return res.status(200).json({
      message: "User withdrawal blocked successfully",
      success: true,
      data: {
        userId: user._id,
        username: user.username,
        blockedUntil: date,
      },
    });
  } catch (error) {
    console.error("Error blocking user withdrawal:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

export const editWithdrawalFee = async (req, res) => {
  try {
    const { Trcfee, Bepfee } = req.body;

    if (
      (Trcfee !== undefined && typeof Trcfee !== "number") ||
      (Bepfee !== undefined && typeof Bepfee !== "number")
    ) {
      return res.status(400).json({
        success: false,
        message: "Trcfee and Bepfee must be numbers",
      });
    }

    let existing = await WithdrawalFee.findOne();

    if (!existing) {
      existing = await WithdrawalFee.create({
        Trcfee: Trcfee ?? 0,
        Bepfee: Bepfee ?? 0,
      });
    } else {
      if (Trcfee !== undefined) existing.Trcfee = Trcfee;
      if (Bepfee !== undefined) existing.Bepfee = Bepfee;
      await existing.save();
    }

    res.status(200).json({
      success: true,
      message: "Withdrawal fees updated successfully",
      data: {
        Trcfee: existing.Trcfee,
        Bepfee: existing.Bepfee,
      },
    });
  } catch (error) {
    console.error("Fee Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const editAiAgentFee = async (req, res) => {
  try {
    const { fee } = req.body;

    if (typeof fee !== "number") {
      return res.status(400).json({
        success: false,
        message: "Fee must be a number",
      });
    }

    let existing = await AiAgentFee.findOne();

    if (!existing) {
      existing = await AiAgentFee.create({ fee });
    } else {
      existing.fee = fee;
      await existing.save();
    }

    res.status(200).json({
      success: true,
      message: "Withdrawal fee updated successfully",
      fee: existing.fee,
    });
  } catch (error) {
    console.error("Fee Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const editTransferFee = async (req, res) => {
  try {
    const { fee } = req.body;

    if (typeof fee !== "number") {
      return res.status(400).json({
        success: false,
        message: "Fee must be a number",
      });
    }

    let existing = await TransferFee.findOne();

    if (!existing) {
      existing = await TransferFee.create({ fee });
    } else {
      existing.fee = fee;
      await existing.save();
    }

    res.status(200).json({
      success: true,
      message: "Transfer fee updated successfully",
      fee: existing.fee,
    });
  } catch (error) {
    console.error("Fee Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const editAccountRecoveryFee = async (req, res) => {
  try {
    const { fee } = req.body;
    if (typeof fee !== "number") {
      return res.status(400).json({
        success: false,
        message: "Fee must be a number",
      });
    }
    let existing = await AccountRecoveryFee.findOne();
    if (!existing) {
      existing = await AccountRecoveryFee.create({ fee });
    } else {
      existing.fee = fee;
      await existing.save();
    }

    res.status(200).json({
      success: true,
      message: "Transfer fee updated successfully",
      fee: existing.fee,
    });
  } catch (error) {
    console.error("Fee Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const userTopupMainWallet = async (req, res) => {
  try {
    const admin = req.admin?._id;
    const { username, uuid, amount, type, walletType } = req.body;

    if (!admin) {
      return res.status(401).json({ success: false, message: "Access Denied" });
    }
    if (!walletType || !type || !uuid) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const amt = Number(amount);

    const isFirstDeposit = user.mainWallet === 0;

    if (type.toLowerCase() === "deposit") {
      const depositConfig = await DepositModel.findOne({});
      if (!depositConfig || depositConfig.amount == null) {
        return res
          .status(500)
          .json({ success: false, message: "Deposit configuration not found" });
      }
      const configAmount = Number(depositConfig.amount);

      // =========================
      // 🎁 Joining Bonus (pehla deposit hi)
      // =========================
      let joiningBonusGiven = false;
      if (
        isFirstDeposit &&
        !user.isjoiningBonusGiven &&
        !user.isJoiningBonusGetFirstTime
      ) {
        const joiningBonusSlab = await JoiningBonusSlab.findOne({
          depositAmount: { $lte: amt },
        }).sort({ depositAmount: -1 });

        if (joiningBonusSlab && joiningBonusSlab.bonusAmount > 0) {
          user.mainWallet += joiningBonusSlab.bonusAmount;
          user.mainRewards =
            (user.mainRewards || 0) + joiningBonusSlab.bonusAmount;
          user.todayMainWalletRewards =
            (user.todayMainWalletRewards || 0) + joiningBonusSlab.bonusAmount;
          user.isjoiningBonusGiven = true;
          user.isJoiningBonusGetFirstTime = true;
          joiningBonusGiven = true;
          await user.save();

          await UserRewardModel.create({
            userId: user._id,
            amount: joiningBonusSlab.bonusAmount,
            message: `Joining bonus of $${joiningBonusSlab.bonusAmount} for deposit of $${amt}`,
            type: "joining",
          });

          console.log(
            `✅ Joining bonus $${joiningBonusSlab.bonusAmount} credited to ${user._id}`,
          );
        } else {
          console.log(`ℹ️ No joining bonus applicable for deposit $${amt}`);
        }
      }

      if (
        isFirstDeposit &&
        joiningBonusGiven &&
        user.sponsorId &&
        !user.isReferralGet
      ) {
        const parentUser = await UserModel.findById(user.sponsorId);
        if (parentUser) {
          const rewardSlab = await ReferRewardSlab.findOne({
            depositAmount: { $lte: amt },
          }).sort({ depositAmount: -1 });
          if (rewardSlab) {
            const referralBonus = rewardSlab.rewardAmount;
            parentUser.directReferalAmount = addAmount(
              parentUser.directReferalAmount,
              referralBonus,
            );
            parentUser.totalEarnings = addAmount(
              parentUser.totalEarnings,
              referralBonus,
            );
            parentUser.currentEarnings = addAmount(
              parentUser.currentEarnings,
              referralBonus,
            );
            parentUser.totalEarningsInCycle = addAmount(
              parentUser.totalEarningsInCycle,
              referralBonus,
            );
            parentUser.mainWallet = addAmount(
              parentUser.mainWallet,
              referralBonus,
            );
            parentUser.mainRewards = addAmount(
              parentUser.mainRewards,
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
              investmentId: null,
              date: new Date(),
            });

            console.log(
              `✅ Referral bonus $${referralBonus} credited to sponsor ${parentUser._id} from user ${user._id}`,
            );
          }
        }
      }

      // =========================
      // 🔑 Baaki deposit logic
      // =========================
      let meetsLevel2Partial = false;
      if (user.level === 1) {
        const level2Req = await LevelRequirementSchema.findOne({ level: 2 });
        if (level2Req) {
          const { teamA, teamB, teamC } = await calculateTeams(user._id);
          const validA = teamA.filter(
            (m) => m.isVerified && m.mainWallet >= 30,
          ).length;
          const validBC = [...teamB, ...teamC].filter(
            (m) => m.isVerified && m.mainWallet >= 30,
          ).length;

          if (
            (user.aiCredits || 0) >= level2Req.aiCredits &&
            validA >= level2Req.activeA &&
            validBC >= level2Req.activeBC
          ) {
            meetsLevel2Partial = true;
          }
        }
      }

      if (user.level === 0 || user.level === 1) {
        if (meetsLevel2Partial) {
          user.mainWallet += amt;
          user.roiInvestedLevel2 += amt;
        } else {
          const maxLimit = configAmount;
          const totalUsed =
            (user.depositMainWallet || 0) + (user.withdrawalPendingAmount || 0);
          const mainWalletRoom = Math.max(0, maxLimit - totalUsed);

          const toMainWallet = amt > mainWalletRoom ? mainWalletRoom : amt;
          const toAdditionalWallet = amt - toMainWallet;

          user.mainWallet += toMainWallet;
          user.depositMainWallet += toMainWallet;
          user.additionalWallet += toAdditionalWallet;
          user.mainWalletPrinciple =
            (user.mainWalletPrinciple || 0) + toMainWallet;
          user.additionalWalletPrinciple =
            (user.additionalWalletPrinciple || 0) + toAdditionalWallet;
          user.principleAmount = (user.principleAmount || 0) + amt;

          const roiEligibleRoom = Math.max(
            0,
            maxLimit - user.roiMaxEligibleInvestment,
          );
          const toRoiEligible =
            toMainWallet > roiEligibleRoom ? roiEligibleRoom : toMainWallet;
          user.roiMaxEligibleInvestment += toRoiEligible;
        }
      } else {
        user.mainWallet += amt;
        user.currentEarnings += amt;
        user.roiInvestedLevel2 += amt;
      }

      // ✅ USER FLAGS
      user.totalInvestment += amt;
      user.isVerified = true;
      user.status = true;

      if (!user.currentCycleBase || user.currentCycleBase === 0) {
        user.currentCycleBase = amt;
        user.totalEarningsInCycle = 0;
        user.cycleCount = 0;
        user.cycleStartDate = new Date();
      } else {
        user.currentCycleBase += amt;
      }

      await user.save();

      await Investment.create({
        userId: user._id,
        walletAddress: "N/A",
        type: "Deposit",
        walletType: "mainWallet",
        investmentAmount: amt,
        txResponse: `TX-${Date.now()}-${uuid}`,
        depositBy: "admin",
      });
    } else {
      user.mainWallet += amt;

      if (type.toLowerCase() === "reward") {
        user.mainRewards = (user.mainRewards || 0) + amt;
        user.todayMainWalletRewards = (user.todayMainWalletRewards || 0) + amt;
        user.reward = (user.reward || 0) + amt;
      } else if (type.toLowerCase() === "systemgift") {
        user.mainRewards = (user.mainRewards || 0) + amt;
        user.todayMainWalletRewards = (user.todayMainWalletRewards || 0) + amt;

        user.systemGift = (user.systemGift || 0) + amt;
      } else if (type.toLowerCase() === "airdrop") {
        user.mainRewards = (user.mainRewards || 0) + amt;
        user.todayMainWalletRewards = (user.todayMainWalletRewards || 0) + amt;
        user.airdrop = (user.airdrop || 0) + amt;
      }

      await user.save();

      await TopupModel.create({
        userId: user._id,
        type,
        amount: amt,
        uuid,
        walletType,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully topped up $${amt} to ${username}'s main wallet.`,
    });
  } catch (error) {
    console.error("Topup error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const userTopupAdditionalWallet = async (req, res) => {
  try {
    const admin = req.admin?._id;
    const { name, uuid, amount, type, walletType } = req.body;

    if (!admin) {
      return res.status(401).json({
        message: "Access Denied",
        success: false,
      });
    }

    if (!walletType || !type || !uuid) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
        success: false,
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const amt = parseFloat(amount);

    if (type === "airdrop") {
      user.additionalAirdrop += Number(amt);
      user.additionalWalletReward += addAmount(
        user.additionalWalletReward,
        amt,
      );
      user.todayAdditionalWalletReward += addAmount(
        user.todayAdditionalWalletReward,
      );
      user.additionalWallet = addAmount(user.additionalWallet, amt);

      await TopupModel.create({
        userId: user._id,
        type,
        amount: amt,
        walletType,
        uuid,
      });
    } else if (type === "reward") {
      user.additionalReward += amt;
      user.additionalWalletReward += addAmount(
        user.additionalWalletReward,
        amt,
      );
      user.todayAdditionalWalletReward += addAmount(
        user.todayAdditionalWalletReward,
      );
      user.additionalWallet = addAmount(user.additionalWallet, amt);

      // TopupModel me entry
      await TopupModel.create({
        userId: user._id,
        type,
        amount: amt,
        walletType,
        uuid,
      });
    } else if (type === "system gift") {
      user.additionalSystemGift += amt;
      user.additionalWalletReward += addAmount(
        user.additionalWalletReward,
        amt,
      );
      user.todayAdditionalWalletReward += addAmount(
        user.todayAdditionalWalletReward,
      );
      user.additionalWallet = addAmount(user.additionalWallet, amt);

      // TopupModel me entry
      await TopupModel.create({
        userId: user._id,
        type,
        amount: amt,
        walletType,
        uuid,
      });
    } else if (type === "deposit") {
      // ✅ Deposit-type wallet update
      user.additionalWallet = addAmount(user.additionalWallet, amt);

      // Sirf Investment me entry (TopupModel me nahi)
      await Investment.create({
        userId: user._id,
        investmentAmount: amt,
        type: "Deposit",
        walletType,
        walletAddress: "N/A",
        depositBy: "admin",
        txResponse: `TX-${Date.now()}-${uuid}`,
      });
    }

    await user.save();

    return res.status(200).json({
      message: `Successfully topped up $${amt} (${type}) `,
      success: true,
    });
  } catch (error) {
    console.error("Topup error:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const notificationPopupCreate = async (req, res) => {
  try {
    const { description, scheduledTime } = req.body;

    if (!description || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "description, and scheduled time are required",
      });
    }

    const file = req.file;
    let fileUrl = null;

    if (file) {
      const response = await cloudinary.uploader.upload(file.path, {
        folder: "notifications",
        resource_type: "image",
        transformation: [{ width: 800, height: 600, crop: "limit" }],
      });
      fileUrl = response.secure_url;
    }

    // 👉 Bold (<b> or <strong>) text extract karna
    const boldRegex = /<b>(.*?)<\/b>|<strong>(.*?)<\/strong>/i;
    const match = description.match(boldRegex);
    const title = match ? match[1] || match[2] : null;

    const newNotification = await NotificationPopup.create({
      title,
      description,
      fileUrl,
      scheduledTime,
    });
    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification: newNotification,
    });
  } catch (error) {
    console.error("Error creating notification:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const getAllNotificationbanner = async (req, res) => {
  try {
    const data = await NotificationPopup.find().sort({
      scheduledTime: -1,
      createdAt: -1,
    });

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No notification banners found",
      });
    }

    return res.status(200).json({
      success: true,
      count: data.length,
      banners: data,
    });
  } catch (error) {
    console.error("Error in getAllNotificationbanner:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching notification banners",
      error: error.message,
    });
  }
};

export const uploadDashboardBanner = async (req, res) => {
  try {
    const { scheduledTime } = req.body;
    console.log(req.body);

    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required",
      });
    }

    const response = await cloudinary.uploader.upload(req.file.path, {
      folder: "dashboard_banners",
      resource_type: "image",
      transformation: [{ width: 800, height: 600, crop: "limit" }],
    });

    const imageUrl = response.secure_url;
    console.log(imageUrl);

    const newBanner = await DashboardBanner.create({
      fileUrl: imageUrl,
      scheduledTime,
    });

    return res.status(201).json({
      success: true,
      message: "Dashboard banner uploaded successfully",
      banner: newBanner,
    });
  } catch (error) {
    console.error("Error uploading dashboard banner:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const editDashboardBanner = async (req, res) => {
  try {
    console.log(req.body);
    const { scheduledTime, id } = req.body;

    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time is required",
      });
    }

    const existingBanner = await DashboardBanner.findById(id);
    if (!existingBanner) {
      return res.status(404).json({
        success: false,
        message: "Dashboard banner not found",
      });
    }

    let imageUrl = existingBanner.image; // Default purani image hi rehne do

    // Agar nayi image aayi to Cloudinary pe upload karke update karo
    if (req.file) {
      const response = await cloudinary.uploader.upload(req.file.path, {
        folder: "dashboard_banners",
        resource_type: "image",
        transformation: [{ width: 800, height: 600, crop: "limit" }],
      });
      imageUrl = response.secure_url;
    }

    // 👉 Check karo agar naya scheduledTime purane se bada hai
    if (
      scheduledTime &&
      new Date(scheduledTime) > new Date(existingBanner.scheduledTime)
    ) {
      existingBanner.isActive = false; // deactivate kar do
    }

    // Update data
    existingBanner.image = imageUrl;
    existingBanner.scheduledTime = scheduledTime;

    await existingBanner.save();

    return res.status(200).json({
      success: true,
      message: "Dashboard banner updated successfully",
      banner: existingBanner,
    });
  } catch (error) {
    console.error("Error updating dashboard banner:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const dashboardBannerActive = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Banner ID is required",
      });
    }

    const updatedBanner = await DashboardBanner.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true },
    );

    if (!updatedBanner) {
      return res.status(404).json({
        success: false,
        message: "Dashboard banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner activated successfully",
      banner: updatedBanner,
    });
  } catch (error) {
    console.error("Error activating dashboard banner:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const deleteDashboardBanner = async (req, res) => {
  try {
    console.log(req.body);

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "Id is required for deletion",
        success: false,
      });
    }

    const deletedBanner = await DashboardBanner.findByIdAndDelete(id);

    if (!deletedBanner) {
      return res.status(404).json({
        message: "Banner not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Banner deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("deleteDashboardBanner error:", error);
    return res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    console.log(req.body);

    const { id } = req.body;

    const notification = await NotificationPopup.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await NotificationPopup.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const updateAiTradeCounter = async (req, res) => {
  try {
    const { counter } = req.body;

    if (counter === undefined || counter === null) {
      return res.status(400).json({
        message: "Counter is required",
        success: false,
      });
    }

    const updatedCounter = await AiTradeCounter.findOneAndUpdate(
      {},
      { count: counter },
      { new: true, upsert: true },
    );

    return res.status(200).json({
      message: "Counter updated successfully",
      data: updatedCounter,
      success: true,
    });
  } catch (error) {
    console.error("Error updating counter:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
export const getAiTradeCounter = async (req, res) => {
  try {
    const counter = await AiTradeCounter.findOne();

    return res.status(200).json({
      message: "Counter fetched successfully",
      data: counter,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching counter:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
export const PlanvalueUpdateOfAgent = async (req, res) => {
  try {
    const { id } = req.body;
    console.log(req.body);
    const {
      agentName,
      durationInDays,
      incomePercent,
      minInvestment,
      maxInvestment,
      aiAgentFee,
      computingSkills,
    } = req.body;

    const updatedPlan = await AIAgentPlan.findByIdAndUpdate(
      id,
      {
        agentName,
        durationInDays,
        incomePercent,
        minInvestment,
        maxInvestment,
        aiAgentFee,
        computingSkills,
      },
      { new: true, runValidators: true },
    );

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: "AI Agent Plan not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "AI Agent Plan updated successfully.",
      data: updatedPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
export const adminLogout = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized Admin Access",
      });
    }

    // Clear token cookie
    res.clearCookie("token");

    // Find admin (optional but useful for showing email in logs)
    const admin = await Admin.findById(adminId);

    // 🔹 1. Create Activity Log in DB
    await createActivityLog(
      adminId,
      "Logout",
      "Your Admin Panel was logged out",
      req.ip,
    );

    // 🔹 2. Emit event via Socket.io
    io.emit("new-activity", {
      message: `⚠️ Admin ${admin?.email || "Unknown"} logged out`,
      type: "logout",
      time: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully",
    });
  } catch (error) {
    console.error("Admin Logout Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getMonthlyStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const start = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : new Date(new Date().getFullYear(), 0, 1);

    const end = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

    // --- Deposit ---
    const depositStats = await Investment.aggregate([
      {
        $match: {
          type: { $ne: "Trial Amount" },
          investmentDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$investmentDate" },
            month: { $month: "$investmentDate" },
          },
          totalDeposit: { $sum: "$investmentAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // --- Withdrawal Success ---
    const withdrawalStats = await Withdrawal.aggregate([
      {
        $match: {
          status: "success",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalWithdrawal: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // --- Withdrawal Pending ---
    const pendingStats = await Withdrawal.aggregate([
      {
        $match: {
          status: "pending",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalPending: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // --- Withdrawal Cancelled ---
    const cancelledStats = await Withdrawal.aggregate([
      {
        $match: {
          status: "cancelled",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalCancelled: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // --- Months Array (Range ke hisaab se) ---
    const months = [];
    let temp = new Date(start);
    while (temp <= end) {
      months.push({
        month: temp.getMonth() + 1,
        year: temp.getFullYear(),
        totalDeposit: 0,
        totalWithdrawal: 0,
        totalPending: 0,
        totalCancelled: 0,
      });
      temp.setMonth(temp.getMonth() + 1);
    }

    // Helper function to fill data
    const fillStats = (stats, key) => {
      stats.forEach((item) => {
        const idx = months.findIndex(
          (m) => m.month === item._id.month && m.year === item._id.year,
        );
        if (idx !== -1) months[idx][key] = parseFloat(item[key].toFixed(2));
      });
    };

    fillStats(depositStats, "totalDeposit");
    fillStats(withdrawalStats, "totalWithdrawal");
    fillStats(pendingStats, "totalPending");
    fillStats(cancelledStats, "totalCancelled");

    // --- Summary sirf months array se nikalna ---
    const summary = months.reduce(
      (acc, m) => {
        acc.totalDeposit += m.totalDeposit;
        acc.totalWithdrawal += m.totalWithdrawal;
        acc.totalPending += m.totalPending;
        acc.totalCancelled += m.totalCancelled;
        return acc;
      },
      {
        totalDeposit: 0,
        totalWithdrawal: 0,
        totalPending: 0,
        totalCancelled: 0,
      },
    );

    return res.status(200).json({
      success: true,
      data: months,
      summary: {
        totalDeposit: parseFloat(summary.totalDeposit.toFixed(2)),
        totalWithdrawal: parseFloat(summary.totalWithdrawal.toFixed(2)),
        totalPending: parseFloat(summary.totalPending.toFixed(2)),
        totalCancelled: parseFloat(summary.totalCancelled.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Monthly Stats Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// export const getMonthlyStats = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.body;
//     console.log(startDate, endDate);

//     const start = startDate
//       ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
//       : new Date(new Date().getFullYear(), 0, 1);

//     const end = endDate
//       ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
//       : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

//     const depositStats = await Investment.aggregate([
//       {
//         $match: {
//           type: { $ne: "Trial Amount" },
//           investmentDate: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$investmentDate" },
//             month: { $month: "$investmentDate" },
//           },
//           totalDeposit: { $sum: "$investmentAmount" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     // --- Aggregate withdrawal stats ---
//     const withdrawalStats = await Withdrawal.aggregate([
//       {
//         $match: {
//           status: "success",
//           createdAt: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" },
//           },
//           totalWithdrawal: { $sum: "$amount" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     const pendingStats = await Withdrawal.aggregate([
//       {
//         $match: {
//           status: "pending",
//           createdAt: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" },
//           },
//           totalPending: { $sum: "$amount" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     const cancelledStats = await Withdrawal.aggregate([
//       {
//         $match: {
//           status: "cancelled",
//           createdAt: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" },
//           },
//           totalCancelled: { $sum: "$amount" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     const months = [];
//     let temp = new Date(start);
//     while (temp <= end) {
//       months.push({
//         month: temp.getMonth() + 1,
//         year: temp.getFullYear(),
//         totalDeposit: 0,
//         totalWithdrawal: 0,
//         totalPending: 0,
//         totalCancelled: 0,
//       });
//       temp.setMonth(temp.getMonth() + 1);
//     }

//     // --- Fill stats into months array ---
//     const fillStats = (stats, key) => {
//       stats.forEach((item) => {
//         const idx = months.findIndex(
//           (m) => m.month === item._id.month && m.year === item._id.year
//         );
//         if (idx !== -1) months[idx][key] = parseFloat(item[key].toFixed(2));
//       });
//     };

//     fillStats(depositStats, "totalDeposit");
//     fillStats(withdrawalStats, "totalWithdrawal");
//     fillStats(pendingStats, "totalPending");
//     fillStats(cancelledStats, "totalCancelled");

//     // --- Summary ---
//     const summary = months.reduce(
//       (acc, m) => {
//         acc.totalDeposit += m.totalDeposit;
//         acc.totalWithdrawal += m.totalWithdrawal;
//         acc.totalPending += m.totalPending;
//         acc.totalCancelled += m.totalCancelled;
//         return acc;
//       },
//       {
//         totalDeposit: 0,
//         totalWithdrawal: 0,
//         totalPending: 0,
//         totalCancelled: 0,
//       }
//     );

//     return res.status(200).json({
//       success: true,
//       data: months,
//       summary: {
//         totalDeposit: parseFloat(summary.totalDeposit.toFixed(2)),
//         totalWithdrawal: parseFloat(summary.totalWithdrawal.toFixed(2)),
//         totalPending: parseFloat(summary.totalPending.toFixed(2)),
//         totalCancelled: parseFloat(summary.totalCancelled.toFixed(2)),
//       },
//     });
//   } catch (error) {
//     console.error("Monthly Stats Error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal Server Error" });
//   }
// };

// export const getMonthlyStats = async (req, res) => {
//   try {
//     const currentYear = new Date().getFullYear();

//     // --- Deposit Aggregation (Trial Amount exclude kiya) ---
//     const depositStats = await Investment.aggregate([
//       {
//         $match: {
//           type: { $ne: "Trial Amount" },
//           createdAt: {
//             $gte: new Date(`${currentYear}-01-01`),
//             $lte: new Date(`${currentYear}-12-31`),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: { month: { $month: "$createdAt" } },
//           totalDeposit: { $sum: "$investmentAmount" },
//         },
//       },
//       { $sort: { "_id.month": 1 } },
//     ]);

//     // --- Withdrawal Aggregation (status wise) ---
//     const withdrawalStats = await Withdrawal.aggregate([
//       {
//         $match: {
//           createdAt: {
//             $gte: new Date(`${currentYear}-01-01`),
//             $lte: new Date(`${currentYear}-12-31`),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             month: { $month: "$createdAt" },
//             status: "$status",
//           },
//           totalAmount: { $sum: "$amount" },
//         },
//       },
//       { $sort: { "_id.month": 1 } },
//     ]);

//     // --- Initialize 12 months ---
//     const months = Array.from({ length: 12 }, (_, i) => ({
//       month: i + 1,
//       totalDeposit: 0,
//       withdrawalSuccess: 0,
//       withdrawalPending: 0,
//       withdrawalCancelled: 0,
//       withdrawalFailed: 0,
//     }));
//     // --- Map deposit data ---
//     depositStats.forEach((item) => {
//       months[item._id.month - 1].totalDeposit = parseFloat(
//         item.totalDeposit.toFixed(2)
//       );
//     });

//     // --- Map withdrawal data (status wise) ---
//     withdrawalStats.forEach((item) => {
//       const { month, status } = item._id;
//       const amount = parseFloat(item.totalAmount.toFixed(2));

//       if (status === "success") {
//         months[month - 1].withdrawalSuccess = amount;
//       } else if (status === "pending") {
//         months[month - 1].withdrawalPending = amount;
//       } else if (status === "cancelled") {
//         months[month - 1].withdrawalCancelled = amount;
//       } else if (status === "failed") {
//         months[month - 1].withdrawalFailed = amount;
//       }
//     });

//     return res.status(200).json({
//       success: true,
//       data: months,
//     });
//   } catch (error) {
//     console.error("Monthly Stats Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// export const getMonthlyStats = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.body;

//     // --- Agar date di hai to use karo, warna current year ka full range le lo ---
//     let start = startDate
//       ? new Date(startDate)
//       : new Date(`${new Date().getFullYear()}-01-01`);
//     let end = endDate
//       ? new Date(endDate)
//       : new Date(`${new Date().getFullYear()}-12-31`);

//     // --- Deposit Aggregation (Trial Amount exclude) ---
//     const depositStats = await Investment.aggregate([
//       {
//         $match: {
//           type: { $ne: "Trial Amount" },
//           createdAt: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             month: { $month: "$createdAt" },
//             year: { $year: "$createdAt" },
//           },
//           totalDeposit: { $sum: "$investmentAmount" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     // --- Withdrawal Aggregation (status wise) ---
//     const withdrawalStats = await Withdrawal.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             month: { $month: "$createdAt" },
//             year: { $year: "$createdAt" },
//             status: "$status",
//           },
//           totalAmount: { $sum: "$amount" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     // --- Months init ---
//     const months = Array.from({ length: 12 }, (_, i) => ({
//       month: i + 1,
//       totalDeposit: 0,
//       withdrawalSuccess: 0,
//       withdrawalPending: 0,
//       withdrawalCancelled: 0,
//       withdrawalFailed: 0,
//     }));

//     // --- Deposit Data map ---
//     depositStats.forEach((item) => {
//       const monthIndex = item._id.month - 1;
//       months[monthIndex].totalDeposit = parseFloat(
//         item.totalDeposit.toFixed(2)
//       );
//     });

//     // --- Withdrawal Data map ---
//     withdrawalStats.forEach((item) => {
//       const { month, status } = item._id;
//       const amount = parseFloat(item.totalAmount.toFixed(2));
//       const monthIndex = month - 1;

//       if (status === "success") months[monthIndex].withdrawalSuccess = amount;
//       else if (status === "pending")
//         months[monthIndex].withdrawalPending = amount;
//       else if (status === "cancelled")
//         months[monthIndex].withdrawalCancelled = amount;
//       else if (status === "failed")
//         months[monthIndex].withdrawalFailed = amount;
//     });

//     return res.status(200).json({
//       success: true,
//       startDate: start,
//       endDate: end,
//       data: months,
//     });
//   } catch (error) {
//     console.error("Monthly Stats Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

export const changeWithdrawalStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;

    // 1. Validation
    if (!ids || !status) {
      return res.status(400).json({
        success: false,
        message: "IDs and status are required",
      });
    }

    // 2. Single ya multiple dono handle karo
    const idsArray = Array.isArray(ids) ? ids : [ids];

    // 3. Update karo withdrawal ka status
    const result = await Withdrawal.updateMany(
      { _id: { $in: idsArray } },
      { $set: { status: status } },
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No withdrawal records updated. Check IDs or current status.",
      });
    }

    // 4. Success response
    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} withdrawal record(s) updated to "${status}" successfully.`,
      result,
    });
  } catch (error) {
    console.error("Change Withdrawal Status Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const setInactiveBlockDays = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid days value" });
    }

    const config = await BlockConfigModel.findOneAndUpdate(
      {},
      { inactiveDays: days, updatedAt: new Date() },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: `Inactive block days updated to ${days}`,
      config,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getInactiveBlockDays = async (req, res) => {
  try {
    const config = await BlockConfigModel.find();
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const setWithdrawalHourForWithdrawal = async (req, res) => {
  try {
    const { hour } = req.body;

    const config = await WithdrawalHourConfig.findOneAndUpdate(
      {},
      { withdrawalHour: hour, updatedAt: new Date() },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: `Withdrawal hour set to ${hour}`,
      config,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendOtpForAdminPaswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to send OTP.",
      });
    }

    // Check if admin exists
    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "This email is not registered. Please create an account first.",
      });
    }

    // Generate OTP and expiry
    const otp = generateOTP();
    const otpExpire = new Date();
    otpExpire.setMinutes(otpExpire.getMinutes() + 5);

    // Save OTP in DB
    user.otp = otp;
    user.otpExpired = otpExpire;
    await user.save();

    // Send OTP via email
    await sendOTP(email, otp, user.username);

    return res.status(200).json({
      success: true,
      message: "OTP has been sent to your email (valid for 5 minutes).",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error occurred while sending OTP. Please try again later.",
      error: error.message,
    });
  }
};

export const adminforgotPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and password are required.",
      });
    }

    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP provided.",
      });
    }

    if (user.otpExpired < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpired = null;
    await user.save();
    await createActivityLog(
      admin._id,
      "Password Reset",
      "Admin Panel Password was reset",
      req.ip,
    );
    io.emit("new-activity", {
      message: `⚠️ Admin ${admin?.email || "Unknown"} reset password`,
      type: "reset-password",
      time: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Password has been successfully reset. You can now log in.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error in forgot password.",
      error: error.message,
    });
  }
};

export const adminPasswordLogin = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      data: {
        id: admin._id,
        name: admin.name,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// export const getAllUsersLevelCount = async (req, res) => {
//   try {
//     let allUsers = await UserModel.find(
//       {},
//       "username uuid profilePicture sponsorId isVerified lastUpgradeAt isLoginBlocked createdAt isActive level airdrop systemGift reward mainWallet additionalWallet additionalAirdrop"
//     )
//       .populate("sponsorId", "uuid")
//       .lean()
//       .sort({ createdAt: -1 });

//     const totalUsers = allUsers.length;

//     const levelCounts = {
//       totalLevel0: 0,
//       totalLevel1: 0,
//       totalLevel2: 0,
//       totalLevel3: 0,
//       totalLevel4: 0,
//       totalLevel5: 0,
//       totalLevel6: 0,
//     };

//     allUsers.forEach((user) => {
//       const lvl = user.level;
//       if (lvl >= 0 && lvl <= 6) {
//         levelCounts[`totalLevel${lvl}`]++;
//       }
//     });
//     const totalAirdrop = allUsers.reduce(
//       (sum, user) =>
//         sum + Number(user.airdrop || 0) + Number(user.additionalAirdrop || 0),
//       0
//     );

//     const usersWithDeposit = await Promise.all(
//       allUsers.map(async (user) => {
//         const userDeposits = await Investment.find(
//           { userId: user._id },
//           "investmentAmount createdAt"
//         ).sort({ createdAt: -1 });

//         const totalDeposit = userDeposits.reduce(
//           (sum, dep) => sum + dep.investmentAmount,
//           0
//         );

//         return {
//           username: user.username,
//           uuid: user.uuid,
//           profilePicture: user.profilePicture || null,
//           sponsorUUID: user.sponsorId?.uuid || null,
//           totalDeposit,
//           lastUpgradeAt: user.lastUpgradeAt || null,
//           createdAt: user.createdAt,
//           isVerified: user.isVerified,
//           isLoginBlocked: user.isLoginBlocked,
//           mainWallet: user.mainWallet || 0,
//           additionalWallet: user.additionalWallet || 0,
//           reward: user.reward || 0,
//           systemGift: user.systemGift || 0,
//           airdrop: user.airdrop || 0,
//           level: user.level,
//           additionalAirdrop: user.additionalAirdrop || 0,
//           isActive: user.isActive,
//           deposits: userDeposits.map((dep) => ({
//             amount: dep.investmentAmount,
//             date: dep.createdAt,
//           })),
//         };
//       })
//     );

//     return res.status(200).json({
//       message: "All users fetched successfully",
//       success: true,
//       usersHistory: usersWithDeposit,
//       summary: {
//         totalAirdrop,
//         totalUsers,
//         ...levelCounts,
//       },
//     });
//   } catch (error) {
//     console.error("Get All Users Error:", error);
//     return res.status(500).json({
//       message: "Server Error while fetching users",
//       success: false,
//       error: error.message,
//     });
//   }
// };

// export const getAllUsersLevelCount = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     // Filter object
//     let filter = {};
//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       start.setHours(0, 0, 0, 0);
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//       filter.lastUpgradeAt = { $gte: start, $lte: end };
//     }

//     // Fetch all users with optional date filter
//     const allUsers = await UserModel.find(
//       filter,
//       "username uuid profilePicture sponsorId isVerified lastUpgradeAt isLoginBlocked createdAt isActive level airdrop systemGift reward mainWallet additionalWallet additionalAirdrop"
//     )
//       .populate("sponsorId", "uuid")
//       .lean()
//       .sort({ createdAt: -1 });

//     const totalUsers = allUsers.length;

//     // Initialize level counts
//     const levelCounts = Array.from({ length: 7 }, (_, i) => 0);
//     allUsers.forEach((user) => {
//       if (user.level >= 0 && user.level <= 6) {
//         levelCounts[user.level]++;
//       }
//     });

//     // Total airdrop
//     const totalAirdrop = allUsers.reduce(
//       (sum, user) =>
//         sum + Number(user.airdrop || 0) + Number(user.additionalAirdrop || 0),
//       0
//     );

//     // Add deposits per user
//     const usersWithDeposit = await Promise.all(
//       allUsers.map(async (user) => {
//         const userDeposits = await Investment.find(
//           { userId: user._id },
//           "investmentAmount createdAt"
//         ).sort({ createdAt: -1 });

//         const totalDeposit = userDeposits.reduce(
//           (sum, dep) => sum + Number(dep.investmentAmount || 0),
//           0
//         );

//         return {
//           username: user.username,
//           uuid: user.uuid,
//           profilePicture: user.profilePicture || null,
//           sponsorUUID: user.sponsorId?.uuid || null,
//           totalDeposit,
//           lastUpgradeAt: user.lastUpgradeAt || null,
//           createdAt: user.createdAt,
//           isVerified: user.isVerified,
//           isLoginBlocked: user.isLoginBlocked,
//           mainWallet: Number(user.mainWallet || 0),
//           additionalWallet: Number(user.additionalWallet || 0),
//           reward: Number(user.reward || 0),
//           systemGift: Number(user.systemGift || 0),
//           airdrop: Number(user.airdrop || 0),
//           additionalAirdrop: Number(user.additionalAirdrop || 0),
//           level: user.level,
//           isActive: user.isActive,
//           deposits: userDeposits.map((dep) => ({
//             amount: Number(dep.investmentAmount || 0),
//             date: dep.createdAt,
//           })),
//         };
//       })
//     );

//     return res.status(200).json({
//       message: "All users fetched successfully",
//       success: true,
//       usersHistory: usersWithDeposit,
//       summary: {
//         totalAirdrop,
//         totalUsers,
//         totalLevel0: levelCounts[0],
//         totalLevel1: levelCounts[1],
//         totalLevel2: levelCounts[2],
//         totalLevel3: levelCounts[3],
//         totalLevel4: levelCounts[4],
//         totalLevel5: levelCounts[5],
//         totalLevel6: levelCounts[6],
//       },
//     });
//   } catch (error) {
//     console.error("Get All Users Error:", error);
//     return res.status(500).json({
//       message: "Server Error while fetching users",
//       success: false,
//       error: error.message,
//     });
//   }
// };

// export const getUserTeamById = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const user = await UserModel.findById(userId)
//       .select(
//         "uuid username phone email level isLoginBlocked isAdminLoginBlock profilePicture createdAt mainWallet additionalWallet"
//       )
//       .populate("sponsorId", "username uuid");

//     if (!userId) {
//       console.log(userId);
//       return res.status(400).json({
//         message: "UserId is required",
//         success: false,
//       });
//     }

//     const { teamA, teamB, teamC } = await calculateTeams(userId);

//     return res.status(200).json({
//       message: "All teams fetched successfully",
//       success: true,
//       user,
//       data: { teamA, teamB, teamC },
//     });
//   } catch (error) {
//     console.error("Error in getUserTeamById:", error);
//     return res.status(500).json({
//       message: "Server Error",
//       success: false,
//     });
//   }
// };

// export const getUserTeamById = async (req, res) => {
//   try {
//     const { userId, startDate, endDate } = req.body;

//     if (!userId) {
//       return res.status(400).json({
//         message: "UserId is required",
//         success: false,
//       });
//     }

//     const user = await UserModel.findById(userId)
//       .select(
//         "uuid username phone email level isLoginBlocked isAdminLoginBlock profilePicture createdAt mainWallet additionalWallet"
//       )
//       .populate("sponsorId", "username uuid");

//     const { teamA, teamB, teamC, totalTeamBC } = await calculateTeams(
//       userId,
//       startDate,
//       endDate
//     );

//     return res.status(200).json({
//       message: "All teams fetched successfully",
//       success: true,
//       user,
//       data: { teamA, teamB, teamC, totalTeamBC },
//     });
//   } catch (error) {
//     console.error("Error in getUserTeamById:", error);
//     return res.status(500).json({
//       message: "Server Error",
//       success: false,
//       error: error.message,
//     });
//   }
// };

// export const getUserTeamById = async (req, res) => {
//   try {
//     let { userId, startDate, endDate } = req.body;
//     console.log(req.body);

//     if (!userId) {
//       return res.status(400).json({
//         message: "UserId is required",
//         success: false,
//       });
//     }

//     if (typeof userId === "object") {
//       startDate = userId.startDate || startDate;
//       endDate = userId.endDate || endDate;
//       userId = userId.userId;
//     }

//     const user = await UserModel.findById(userId)
//       .select(
//         "uuid username phone email level isLoginBlocked isAdminLoginBlock profilePicture createdAt mainWallet additionalWallet"
//       )
//       .populate("sponsorId", "username uuid");

//     let teamData;
//     if (startDate && endDate) {
//       teamData = await calculateTeams(userId, startDate, endDate);
//     } else {
//       teamData = await calculateTeams(userId);
//     }

//     const { teamA, teamB, teamC, totalTeamBC } = teamData;

//     return res.status(200).json({
//       message: "All teams fetched successfully",
//       success: true,
//       user,
//       data: { teamA, teamB, teamC, totalTeamBC },
//     });
//   } catch (error) {
//     console.error("Error in getUserTeamById:", error);
//     return res.status(500).json({
//       message: "Server Error",
//       success: false,
//       error: error.message,
//     });
//   }
// };

export const getAllUsersLevelCount = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    // ---- Date filter with IST safe conversion ----
    if (startDate || endDate) {
      // Agar dono diye gaye hain
      if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00+05:30`); // IST start
        const end = new Date(`${endDate}T23:59:59.999+05:30`); // IST end
        filter.levelUpgradeDate = { $gte: start, $lte: end };
      } else if (startDate) {
        // Sirf startDate diya hai
        const start = new Date(`${startDate}T00:00:00+05:30`);
        const end = new Date(`${startDate}T23:59:59.999+05:30`);
        filter.levelUpgradeDate = { $gte: start, $lte: end };
      } else if (endDate) {
        // Sirf endDate diya hai
        const start = new Date(`${endDate}T00:00:00+05:30`);
        const end = new Date(`${endDate}T23:59:59.999+05:30`);
        filter.levelUpgradeDate = { $gte: start, $lte: end };
      }
    }

    // ---- Fetch all users ----
    const allUsers = await UserModel.find(
      filter,
      "username uuid profilePicture sponsorId isVerified levelUpgradeDate isLoginBlocked createdAt isActive level airdrop systemGift reward mainWallet additionalWallet additionalAirdrop",
    )
      .populate("sponsorId", "uuid")
      .lean()
      .sort({ levelUpgradeDate: -1 });

    console.log("Users Fetched:", allUsers.length);

    const totalUsers = allUsers.length;

    // ---- Level counts ----
    const levelCounts = Array.from({ length: 7 }, () => 0);
    allUsers.forEach((user) => {
      if (user.level >= 0 && user.level <= 6) {
        levelCounts[user.level]++;
      }
    });

    // ---- Total airdrop ----
    const totalAirdrop = allUsers.reduce(
      (sum, user) =>
        sum + Number(user.airdrop || 0) + Number(user.additionalAirdrop || 0),
      0,
    );

    // ---- Add deposits per user ----
    const usersWithDeposit = await Promise.all(
      allUsers.map(async (user) => {
        const userDeposits = await Investment.find(
          { userId: user._id },
          "investmentAmount createdAt",
        ).sort({ createdAt: -1 });

        const totalDeposit = userDeposits.reduce(
          (sum, dep) => sum + Number(dep.investmentAmount || 0),
          0,
        );

        return {
          username: user.username,
          uuid: user.uuid,
          profilePicture: user.profilePicture || null,
          sponsorUUID: user.sponsorId?.uuid || null,
          totalDeposit,
          levelUpgradeDate: user.levelUpgradeDate || null,
          createdAt: user.createdAt,
          isVerified: user.isVerified,
          isLoginBlocked: user.isLoginBlocked,
          mainWallet: Number(user.mainWallet || 0),
          additionalWallet: Number(user.additionalWallet || 0),
          reward: Number(user.reward || 0),
          systemGift: Number(user.systemGift || 0),
          airdrop: Number(user.airdrop || 0),
          additionalAirdrop: Number(user.additionalAirdrop || 0),
          level: user.level,
          isActive: user.isActive,
          deposits: userDeposits.map((dep) => ({
            amount: Number(dep.investmentAmount || 0),
            date: dep.createdAt,
          })),
        };
      }),
    );

    return res.status(200).json({
      message: "All users fetched successfully",
      success: true,
      usersHistory: usersWithDeposit,
      summary: {
        totalAirdrop,
        totalUsers,
        totalLevel0: levelCounts[0],
        totalLevel1: levelCounts[1],
        totalLevel2: levelCounts[2],
        totalLevel3: levelCounts[3],
        totalLevel4: levelCounts[4],
        totalLevel5: levelCounts[5],
        totalLevel6: levelCounts[6],
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({
      message: "Server Error while fetching users",
      success: false,
      error: error.message,
    });
  }
};

export const getUserTeamById = async (req, res) => {
  try {
    let { userId, startDate, endDate } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId is required",
      });
    }

    // agar object form me aaya hai
    if (typeof userId === "object") {
      startDate = userId.startDate || startDate;
      endDate = userId.endDate || endDate;
      userId = userId.userId;
    }

    const user = await UserModel.findById(userId)
      .select(
        "uuid username phone email level isLoginBlocked isAdminLoginBlock profilePicture createdAt mainWallet additionalWallet",
      )
      .populate("sponsorId", "username uuid");

    const { teamA, teamB, teamC, totalTeamBC } = await calculateTeams(
      userId,
      startDate,
      endDate,
    );

    // sort only arrays
    const sortedTeamA = teamA.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    const sortedTeamB = teamB.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    const sortedTeamC = teamC.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    return res.status(200).json({
      success: true,
      message: "All teams fetched successfully",
      user,
      data: {
        teamA: sortedTeamA,
        teamB: sortedTeamB,
        teamC: sortedTeamC,
        totalTeamBC,
      },
    });
  } catch (error) {
    console.error("Error in getUserTeamById:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getAllUserCreatedByAdmin = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized Access",
        success: false,
      });
    }

    const allUsers = await UserModel.find({ createdByAdmin: true })
      .populate("sponsorId", "uuid")
      .sort({ createdAt: -1 });

    if (!allUsers || allUsers.length === 0) {
      return res.status(200).json({
        message: "No users found created by admin",
        success: true,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      data: allUsers,
    });
  } catch (error) {
    console.error("Error in getAllUserCreatedByAdmin:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
      error: error.message,
    });
  }
};

export const deleteUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    await DeletedUser.create({
      userId: user._id,
      username: user.username,
      email: user.email,
      password: user.password,
    });
    await ActivityLog.create({
      adminId,
      userId: user._id,
      username: user.username,
      action: "DELETE_USER",
      details: `User "${user.username}" (UUID: ${user.uuid}) deleted by admin`,
      createdAt: new Date(),
    });
    await UserModel.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting user",
      error: error.message,
    });
  }
};

export const editProfileById = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized Access",
        success: false,
      });
    }

    const { username, phone, email, password, uuid } = req.body;

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const oldData = {
      username: user.username,
      email: user.email,
      phone: user.phone,
      uuid: user.uuid,
      password: user.password,
    };

    const changes = [];

    // -------- Apply Changes and Track --------
    if (username && username !== user.username) {
      changes.push({
        field: "username",
        oldValue: user.username,
        newValue: username,
      });
      user.username = username;
    }

    if (phone && phone !== user.phone) {
      changes.push({
        field: "phone",
        oldValue: user.phone,
        newValue: phone,
      });
      user.phone = phone;
    }

    if (email && email.toLowerCase() !== user.email) {
      changes.push({
        field: "email",
        oldValue: user.email,
        newValue: email.toLowerCase(),
      });
      user.email = email.toLowerCase();
    }

    if (uuid && uuid !== user.uuid) {
      changes.push({
        field: "uuid",
        oldValue: user.uuid,
        newValue: uuid,
      });
      user.uuid = uuid;
    }

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      changes.push({
        field: "password",
        oldValue: "********",
        newValue: "********",
      });
      user.password = hashed;
    }

    if (changes.length === 0) {
      return res.status(400).json({
        message: "No changes detected",
        success: false,
      });
    }

    // -------- Save User History --------
    await UserHistory.create({
      userId: user._id,
      changedBy: adminId,
      oldData,
      newData: {
        username: user.username,
        email: user.email,
        phone: user.phone,
        uuid: user.uuid,
        password: user.password,
      },
      changes,
      changedAt: new Date(),
    });

    // -------- Save Activity Log --------
    await ActivityLog.create({
      adminId,
      userId: user._id,
      username: user.username,
      action: "EDIT_PROFILE",
      details: changes
        .map(
          (c) => `${c.field} changed from "${c.oldValue}" to "${c.newValue}"`,
        )
        .join(", "),
      createdAt: new Date(),
    });
    io.emit("new-activity", {
      message: "EDIT_PROFILE",
      type: "EDIT_PROFILE",
      time: new Date(),
    });

    user.isEdited = true;
    user.lastEditDate = new Date();
    await user.save();

    return res.status(200).json({
      message: "User profile updated successfully",
      success: true,
      changes,
      user,
    });
  } catch (error) {
    console.error("Edit profile error:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const addAiCredit = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized Access",
        success: false,
      });
    }

    const { uuid, aiCredit } = req.body;

    if (!uuid || !aiCredit || isNaN(aiCredit) || parseFloat(aiCredit) <= 0) {
      return res.status(400).json({
        message: "Invalid uuid or AI credit amount",
        success: false,
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    user.aiCredits = (user.aiCredits || 0) + parseFloat(aiCredit);
    await user.save();

    return res.status(200).json({
      message: `Successfully added ${aiCredit} AI credits to ${uuid}.`,
      success: true,
      aiCredits: user.aiCredits,
    });
  } catch (error) {
    console.error("Add AI credit error:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};
export const deductAiCredit = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized Access",
        success: false,
      });
    }

    const { uuid, aiCredit } = req.body;

    if (!uuid || !aiCredit || isNaN(aiCredit) || parseFloat(aiCredit) <= 0) {
      return res.status(400).json({
        message: "Invalid uuid or AI credit amount",
        success: false,
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    user.aiCredits = (user.aiCredits || 0) - parseFloat(aiCredit);
    await user.save();

    return res.status(200).json({
      message: `Successfully added ${aiCredit} AI credits to ${uuid}.`,
      success: true,
      aiCredits: user.aiCredits,
    });
  } catch (error) {
    console.error("Add AI credit error:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const deductMainWallet = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized Access",
        success: false,
      });
    }

    const { uuid, amount, walletType, type } = req.body;

    if (!uuid || !amount || !walletType || !type || parseFloat(amount) <= 0) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const deductAmount = parseFloat(amount);
    const currentBalance = user.mainWallet || 0;

    if (currentBalance < deductAmount) {
      return res.status(400).json({
        message: `Insufficient mainWallet balance. Available: $${currentBalance}`,
        success: false,
      });
    }

    // ✅ Sirf mainWallet se cut karo
    user.mainWallet = currentBalance - deductAmount;

    // ✅ DepositMainWallet bhi adjust karo (negative avoid karna)
    user.depositMainWallet = (user.depositMainWallet || 0) - deductAmount;
    if (user.depositMainWallet < 0) user.depositMainWallet = 0;
    user.isJoiningBonusGetFirstTime = true;
    user.isjoiningBonusGiven = true;
    await user.save();

    await DeductModel.create({
      userId: user._id,
      type,
      uuid,
      walletType,
      amount: deductAmount,
    });

    return res.status(200).json({
      message: `Successfully deducted $${deductAmount} from mainWallet.`,
      success: true,
      mainWallet: user.mainWallet,
      depositMainWallet: user.depositMainWallet,
    });
  } catch (error) {
    console.error("deductMainWallet error:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};

export const deductAdditionalWallet = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized Access",
        success: false,
      });
    }

    const { uuid, amount, type, walletType } = req.body;

    if (!uuid || !type || !walletType || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        message: "All Feilds are required",
        success: false,
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const deductAmount = parseFloat(amount);
    const currentBalance = user.additionalWallet || 0;
    console.log(user.additionalWallet);

    if (currentBalance < deductAmount) {
      return res.status(400).json({
        message: `Insufficient additionalWallet balance. Available: $${currentBalance}`,
        success: false,
      });
    }

    user.additionalWallet = currentBalance - deductAmount;
    await user.save();
    await DeductModel.create({
      userId: user._id,
      type,
      uuid,
      walletType,
      amount,
    });

    return res.status(200).json({
      message: `Successfully deducted $${amount} from additionalWallet.`,
      success: true,
      additionalWallet: user.additionalWallet,
    });
  } catch (error) {
    console.error("deductAdditionalWallet error:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};
export const deleteManyUserById = async (req, res) => {
  try {
    const { ids } = req.body;

    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of user IDs",
      });
    }

    const result = await UserModel.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} user(s) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting users",
      error: error.message,
    });
  }
};
export const withdrawalBlockByUUID = async (req, res) => {
  try {
    const { uuid, date } = req.body;

    if (!uuid) {
      return res.status(400).json({
        success: false,
        message: "UUID is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Block until date is required",
      });
    }

    const blockDate = new Date(date);
    if (isNaN(blockDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.withdrawalBlockedUntil = blockDate;
    user.transferBlock = true;
    await user.save();
    res.status(200).json({
      success: true,
      message: `User with UUID ${uuid} has been blocked for withdrawals until ${blockDate.toDateString()}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const getAllWithdrawalBlockUsers = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allUsers = await UserModel.find(
      { withdrawalBlockedUntil: { $gte: today } },
      { uuid: 1, name: 1, username: 1, withdrawalBlockedUntil: 1, _id: 0 },
    );

    res.status(200).json({
      success: true,
      totalBlocked: allUsers.length,
      data: allUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const withdrawalUnBlockByUUID = async (req, res) => {
  try {
    const { uuid } = req.body;

    if (!uuid) {
      return res.status(400).json({
        success: false,
        message: "UUID is required",
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.withdrawalBlockedUntil = null;
    user.transferBlock = false;

    await user.save();
    res.status(200).json({
      success: true,
      message: `User with UUID ${uuid} has been unblocked`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const getWithdrawalFee = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const withdarawalfees = await WithdrawalFee.find();
    const aiagentfee = await AiAgentFee.find();
    const recoveryfee = await AccountRecoveryFee.find();
    const transferFee = await TransferFee.find();

    res.status(200).json({
      success: true,
      data: {
        withdarawalfees,
        aiagentfee,
        recoveryfee,
        transferFee,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const getReferalRewardSlab = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const slabs = await ReferRewardSlab.find().sort({ depositAmount: 1 });

    res.status(200).json({
      success: true,
      total: slabs.length,
      data: slabs,
    });
  } catch (error) {
    console.error("getReferalRewardSlab Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const editedUserByAdmin = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    const allUsers = await UserModel.find({ isEdited: true }).select(
      "username uuid email phone lastEditDate password",
    );

    return res.status(200).json({
      message: "Edited users fetched successfully",
      success: true,
      data: allUsers,
    });
  } catch (error) {
    console.error("Error fetching edited users:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message,
    });
  }
};
// export const blockUsers = async (req, res) => {
//   try {
//     let { ids } = req.body;
//     const adminId = req.admin?._id;

//     if (!ids || (Array.isArray(ids) && ids.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: "User id(s) required",
//       });
//     }

//     if (!Array.isArray(ids)) {
//       ids = [ids];
//     }

//     const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

//     if (validIds.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid user ids provided",
//       });
//     }

//     // 🔍 Check which users are already blocked
//     const alreadyBlocked = await UserModel.find({
//       _id: { $in: validIds },
//       isAdminLoginBlock: true,
//     });

//     const alreadyBlockedCount = alreadyBlocked.length;
//     const alreadyBlockedIds = alreadyBlocked.map((u) => u._id.toString());

//     // ✅ Filter out users who are not yet blocked
//     const toBeBlockedIds = validIds.filter(
//       (id) => !alreadyBlockedIds.includes(id)
//     );

//     // 🔄 Block only those who are not already blocked
//     if (toBeBlockedIds.length > 0) {
//       await UserModel.updateMany(
//         { _id: { $in: toBeBlockedIds } },
//         { $set: { isAdminLoginBlock: true } }
//       );
//     }

//     // 📢 Prepare message
//     let message = "";
//     if (alreadyBlockedCount > 0 && toBeBlockedIds.length === 0) {
//       message = "User already blocked";
//     } else if (alreadyBlockedCount > 0 && toBeBlockedIds.length > 0) {
//       message = `${toBeBlockedIds.length} user(s) blocked, ${alreadyBlockedCount} already blocked`;
//     } else {
//       message = "User blocked successfully";
//     }
//     await createActivityLog(
//       adminId,
//       "User Status Update",
//       `User ${user.username || user._id} has been ${
//         user.isLoginBlocked ? "blocked" : "unblocked"
//       }`,
//       req.ip
//     );

//     return res.status(200).json({
//       success: true,
//       message,
//     });
//   } catch (error) {
//     console.error("Error blocking users:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

export const blockUsers = async (req, res) => {
  try {
    let { ids } = req.body;
    const adminId = req.admin?._id;

    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "User id(s) required",
      });
    }

    if (!Array.isArray(ids)) {
      ids = [ids];
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid user ids provided",
      });
    }

    // 🔍 Already blocked users
    const alreadyBlocked = await UserModel.find({
      _id: { $in: validIds },
      isAdminLoginBlock: true,
    });

    const alreadyBlockedCount = alreadyBlocked.length;

    // ⚠️ Agar sabhi already blocked hain -> return kar do
    if (alreadyBlockedCount === validIds.length) {
      return res.status(400).json({
        success: false,
        message: "All selected users are already blocked",
      });
    }

    const alreadyBlockedIds = alreadyBlocked.map((u) => u._id.toString());

    // ✅ Filter unblocked users
    const toBeBlockedIds = validIds.filter(
      (id) => !alreadyBlockedIds.includes(id),
    );

    // 🔄 Block them
    if (toBeBlockedIds.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: toBeBlockedIds } },
        { $set: { isAdminLoginBlock: true } },
      );
    }

    // 📝 Per-user history log
    for (const id of toBeBlockedIds) {
      const user = await UserModel.findById(id);
      if (user) {
        await createActivityLog(
          adminId,
          "User Status Update",
          `User ${user.username || user.email || user._id} has been blocked`,
          req.ip,
        );
      }
    }

    // 📢 Message
    let message = "";
    if (alreadyBlockedCount > 0 && toBeBlockedIds.length > 0) {
      message = `${toBeBlockedIds.length} user(s) blocked, ${alreadyBlockedCount} already blocked`;
    } else {
      message = "User(s) blocked successfully";
    }

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error blocking users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const UnblockblockUsers = async (req, res) => {
  try {
    let { ids } = req.body;

    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "User id(s) required",
      });
    }

    if (!Array.isArray(ids)) {
      ids = [ids];
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid user ids provided",
      });
    }

    const result = await UserModel.updateMany(
      { _id: { $in: validIds } },
      // { $set: { isLoginBlocked: false } }
      { $set: { isAdminLoginBlock: false } },
    );

    return res.status(200).json({
      success: true,
      message: "Users Unblocked successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error blocking users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const deleteUsers = async (req, res) => {
  try {
    let { ids } = req.body;

    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "User id(s) required",
      });
    }

    // Single id ko array me convert karna
    if (!Array.isArray(ids)) {
      ids = [ids];
    }

    // Valid ObjectIds filter karna
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid user ids provided",
      });
    }

    // Delete users
    const result = await UserModel.deleteMany({ _id: { $in: validIds } });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found for the given IDs",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Users deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const updateMultipleAiCredits = async (req, res) => {
  try {
    const { levels } = req.body;

    if (!Array.isArray(levels) || levels.length === 0) {
      return res.status(400).json({
        message: "Levels array is required",
        success: false,
      });
    }

    let results = [];

    for (let item of levels) {
      const { level, aiCredit } = item;

      if (level === undefined || aiCredit === undefined) {
        results.push({
          level,
          message: "Level and aiCredit are required",
          success: false,
        });
        continue;
      }

      let data = await LevelRequirementSchema.findOne({ level });

      if (!data) {
        // Agar document nahi hai to create kar do
        data = await LevelRequirementSchema.create({ level, aiCredit });
        results.push({
          level,
          message: `Level ${level} did not exist, created with AI Credit ${aiCredit}`,
          success: true,
          updatedData: data,
        });
        continue;
      }

      data.aiCredits = aiCredit;
      await data.save();

      results.push({
        level,
        message: `AI Credit for level ${level} updated successfully`,
        success: true,
        updatedData: data,
      });
    }

    return res.status(200).json({
      message: "`AI Credit  updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating multiple AI Credits:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const getAllLevelAchivment = async (req, res) => {
  try {
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
export const changeReferralTradeCredit = async (req, res) => {
  try {
    const { referralCredit, tradeCredit } = req.body;

    if (referralCredit === undefined || tradeCredit === undefined) {
      return res.status(400).json({
        message: "Both referralCredit and tradeCredit are required",
        success: false,
      });
    }

    // Agar koi document hai to update, nahi to create
    const updatedData = await ReferralTradeCredit.findOneAndUpdate(
      {}, // first document (empty condition means any one)
      { referralCredit, tradeCredit },
      { new: true, upsert: true }, // new: updated document return kare, upsert: create if not exists
    );

    return res.status(200).json({
      message: "Referral and Trade Credit updated successfully",
      success: true,
      data: updatedData,
    });
  } catch (error) {
    console.error("Error updating Referral/Trade Credit:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const getReferralTradeCredit = async (req, res) => {
  try {
    let data = await ReferralTradeCredit.findOne({});

    if (!data) {
      data = {
        referralCredit: 0,
        tradeCredit: 0,
      };
    }

    return res.status(200).json({
      message: "Referral and Trade Credit fetched successfully",
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching Referral/Trade Credit:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};
export const getDepositAmount = async (req, res) => {
  try {
    const deposit = await DepositModel.findOne();
    const value = deposit ? deposit.amount : 100;
    return res.status(200).json({
      message: "fetched successfully",
      success: false,
      value,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in deposit model",
      success: false,
    });
  }
};
export const getReferralAndTradeCredit = async (req, res) => {
  try {
    const data = await ReferralTradeCredit.findOne();
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "No referral or trade credit data found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "❌ Error fetching referral and trade credit:",
      error.message,
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const saveAdminInfo = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    const {
      telegram,
      instagram,
      twitter,
      youtube,
      documentation,
      inviteFriends,
      aiTrade,
      tutorials,
      ourBlog,
      termsService,
      privacyPolicy,
      discover,
      faq,
    } = req.body;

    let adminInfo = await AdminInfo.findOne({});
    let changedFields = [];

    if (!adminInfo) {
      // Create new record if not exists
      adminInfo = new AdminInfo({
        telegramLink: telegram,
        instagramLink: instagram,
        twitterLink: twitter,
        youtubeLink: youtube,
        documentation,
        inviteFriends,
        aiTrade,
        tutorials,
        ourBlog,
        termsService,
        privacyPolicy,
        discover,
        faq,
      });

      await createActivityLog(
        adminId,
        "Social Media Update",
        "Initial admin info created",
        req.ip,
      );

      // 👇 Emit also for creation
      io.emit("new-activity", {
        message: "Initial admin info created",
        type: "Social Media Update",
        time: new Date().toISOString(),
      });
    } else {
      if (adminInfo.telegramLink !== telegram) {
        changedFields.push("Telegram link changed");
        adminInfo.telegramLink = telegram;
      }
      if (adminInfo.instagramLink !== instagram) {
        changedFields.push("Instagram link changed");
        adminInfo.instagramLink = instagram;
      }
      if (adminInfo.twitterLink !== twitter) {
        changedFields.push("Twitter link changed");
        adminInfo.twitterLink = twitter;
      }
      if (adminInfo.youtubeLink !== youtube) {
        changedFields.push("YouTube link changed");
        adminInfo.youtubeLink = youtube;
      }
      if (adminInfo.documentation !== documentation) {
        changedFields.push("Documentation link changed");
        adminInfo.documentation = documentation;
      }
      if (adminInfo.inviteFriends !== inviteFriends) {
        changedFields.push("Invite Friends link changed");
        adminInfo.inviteFriends = inviteFriends;
      }
      if (adminInfo.aiTrade !== aiTrade) {
        changedFields.push("AI Trade link changed");
        adminInfo.aiTrade = aiTrade;
      }
      if (adminInfo.tutorials !== tutorials) {
        changedFields.push("Tutorials link changed");
        adminInfo.tutorials = tutorials;
      }
      if (adminInfo.ourBlog !== ourBlog) {
        changedFields.push("Our Blog link changed");
        adminInfo.ourBlog = ourBlog;
      }
      if (adminInfo.termsService !== termsService) {
        changedFields.push("Terms of Service updated");
        adminInfo.termsService = termsService;
      }
      if (adminInfo.privacyPolicy !== privacyPolicy) {
        changedFields.push("Privacy Policy updated");
        adminInfo.privacyPolicy = privacyPolicy;
      }
      if (adminInfo.discover !== discover) {
        changedFields.push("Discover link changed");
        adminInfo.discover = discover;
      }
      if (adminInfo.faq !== faq) {
        changedFields.push("FAQ link changed");
        adminInfo.faq = faq;
      }
    }

    await adminInfo.save();

    if (changedFields.length > 0) {
      for (let msg of changedFields) {
        // Save activity in DB
        await createActivityLog(adminId, "Social Media Update", msg, req.ip);

        // Emit realtime socket event
        io.emit("new-activity", {
          message: msg,
          type: "Social Media Update",
          time: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Admin Info saved successfully",
      data: adminInfo,
    });
  } catch (error) {
    console.error("Error saving Admin Info:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const connectGoogleAuthenticator = async (req, res) => {
  const userId = req.admin._id;
  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
    });
  }
  try {
    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    if (user.twoFactorAuth) {
      return res.status(400).json({
        message: "Google Authenticator already connected",
        success: false,
        qrCode: user.qrCode,
        secret: user.twoFactorAuthSecret,
      });
    }
    const { secret, qrCode } = await generate2FA(user.email, true);
    user.twoFactorAuth = true;
    user.qrCode = qrCode;
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
export const sendOTPForEmailAdmin = async (req, res) => {
  try {
    const userId = req.admin._id;
    const user = await Admin.findById(userId);
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

    const emailSent = await sendOTP(user.email, otp);
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
export const setAuth = async (req, res) => {
  try {
    const { emailOtp, authOtp, password } = req.body;
    const userId = req.admin?._id;

    if (!emailOtp || !authOtp || !password) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
        success: false,
      });
    }

    if (String(user.otp) !== String(emailOtp)) {
      return res.status(401).json({
        message: "Invalid Email OTP",
        success: false,
      });
    }
    const isAuthValid = await verify2FA(user.email, authOtp);
    if (!isAuthValid) {
      return res.status(401).json({
        message: "Invalid Authenticator OTP",
        success: false,
      });
    }

    user.twoFactorAuth = true;

    await user.save();

    return res.status(200).json({
      message: "Account setup  successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error in Account setup:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};
export const setWalletAddress = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    const { bep20Address, trc20Address, emailOtp, authOtp } = req.body;

    // --- Validate fields ---
    if (!bep20Address || !trc20Address) {
      return res.status(400).json({
        message: "Both BEP20 and TRC20 addresses are required",
        success: false,
      });
    }
    if (!emailOtp || !authOtp) {
      return res.status(400).json({
        message: "Both Email OTP and Authenticator OTP are required",
        success: false,
      });
    }

    // --- OTP Verification ---
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
        success: false,
      });
    }

    // Verify Email OTP
    if (admin.otp !== emailOtp) {
      return res.status(400).json({
        message: "Invalid Email OTP",
        success: false,
      });
    }

    const isAuthValid = await verify2FA(admin.email, authOtp);
    console.log(isAuthValid, "isAuthValid");
    if (!isAuthValid) {
      return res.status(400).json({
        message: "Invalid Authenticator OTP",
        success: false,
      });
    }

    let info = await AdminInfo.findOne();
    if (!info) {
      info = new AdminInfo({
        bep20Address,
        trc20Address,
        updatedBy: adminId,
      });
      await info.save();

      await createActivityLog(
        admin._id,
        "Deposit Address Update",
        "Initial deposit addresses set",
        req.ip,
      );
      io.emit("new-activity", {
        type: "deposit",
        message: "Initial deposit addresses set",
      });
    } else {
      let changedFields = [];

      if (info.bep20Address !== bep20Address) {
        changedFields.push("BEP20 address updated");
        info.bep20Address = bep20Address;
      }

      if (info.trc20Address !== trc20Address) {
        changedFields.push("TRC20 address updated");
        info.trc20Address = trc20Address;
      }

      await info.save();

      if (changedFields.length > 0) {
        for (let msg of changedFields) {
          await createActivityLog(
            admin._id,
            "Deposit Address Update",
            msg,
            req.ip,
          );
        }
      }
    }

    return res.status(200).json({
      message: "Wallet addresses updated successfully",
      success: true,
      data: info,
    });
  } catch (error) {
    console.error("setWalletAddress error:", error);
    return res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
};
export const getAdminInfo = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }
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
export const freezeAiTrade = async (req, res) => {
  try {
    const userId = req.admin?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.aiTradeFreez = !user.aiTradeFreez;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `AI Trade Freeze status updated to ${user.aiTradeFreez}`,
      aiTradeFreez: user.aiTradeFreez,
    });
  } catch (error) {
    console.error("Error toggling AI Trade Freeze:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const getDashboardBanner = async (req, res) => {
  try {
    const banners = await DashboardBanner.find({}).sort({
      scheduledTime: -1,
      createdAt: -1,
    }); // 🔹 dono pe sort

    if (!banners || banners.length === 0) {
      return res.status(404).json({
        message: "No banners found",
        success: false,
        data: [],
      });
    }

    const now = new Date();

    const currentMatched = [];
    const others = [];

    banners.forEach((banner) => {
      const bannerTime = new Date(banner.scheduledTime);

      if (
        bannerTime.getFullYear() === now.getFullYear() &&
        bannerTime.getMonth() === now.getMonth() &&
        bannerTime.getDate() === now.getDate() &&
        bannerTime.getHours() === now.getHours() &&
        bannerTime.getMinutes() === now.getMinutes() &&
        bannerTime.getSeconds() === now.getSeconds() // ✅ ab seconds bhi check
      ) {
        currentMatched.push(banner);
      } else {
        others.push(banner);
      }
    });

    // ✅ dono groups ko scheduledTime + createdAt ke hisaab se sort karna
    const sortedBanners = [
      ...currentMatched.sort(
        (a, b) =>
          new Date(b.scheduledTime) - new Date(a.scheduledTime) ||
          new Date(b.createdAt) - new Date(a.createdAt),
      ),
      ...others.sort(
        (a, b) =>
          new Date(b.scheduledTime) - new Date(a.scheduledTime) ||
          new Date(b.createdAt) - new Date(a.createdAt),
      ),
    ];

    return res.status(200).json({
      message: "Banners fetched successfully",
      success: true,
      data: sortedBanners,
    });
  } catch (error) {
    console.error("getBanner error:", error);
    return res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};
export const getAdminReferralRewardSlab = async (req, res) => {
  try {
    const data = await AdminReferralRewardSlab.findOne();

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "No referral reward slab found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error in getAdminReferralRewardSlab:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const activeOrDeactiveBannerStatus = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Id is required",
      });
    }

    const banner = await DashboardBanner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // ✅ Toggle status
    banner.isActive = !banner.isActive;
    await banner.save();

    return res.status(200).json({
      success: true,
      message: `Banner status updated to ${
        banner.isActive ? "Active" : "Deactive"
      }`,
      data: banner,
    });
  } catch (error) {
    console.error("Error in activeOrDeactiveBannerStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
// export const allHistory = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "userId is required",
//       });
//     }

//     const [
//       deposit,
//       fundTransfer,
//       reward,
//       withdrawal,
//       teamReward,
//       deduct,
//       swapHistory,
//       topuphistory,
//     ] = await Promise.all([
//       Investment.find({ userId }).sort({ createdAt: -1 }).lean(),

//       FundTransfer.find({
//         $or: [{ from: userId }, { to: userId }],
//       })
//         .sort({ createdAt: -1 })
//         .populate("from", "uuid username")
//         .populate("to", "uuid username")
//         .lean(),

//       // Rewards (System Fund)
//       TopupModel.find({ userId })
//         .sort({ createdAt: -1 })
//         .populate("userId", "uuid username email")
//         .lean(),

//       Withdrawal.find({ userId })
//         .sort({ createdAt: -1 })
//         .populate("userId", "uuid username email")
//         .lean(),

//       Commission.find({ userId }).sort({ createdAt: -1 }).lean(),
//       ReferalBonus.find({ userId }).sort({ createdAt: -1 }).lean(),

//       // User Reward
//       UserRewardModel.find({ userId }).sort({ createdAt: -1 }).lean(),

//       // Deduction
//       DeductModel.find({ userId }).sort({ createdAt: -1 }).lean(),
//       SwapModel.find({ userId }).sort({ createdAt: -1 }).lean(),
//       TopupModel.find({ userId }).sort({ createdAt: -1 }).lean(),
//     ]);
//     // Investment ka total (Trial Amount ko skip karte hue)
//     const totalDeposit = deposit.reduce((sum, d) => {
//       if (d.type === "Trial Amount") {
//         return sum;
//       }
//       return sum + (d.investmentAmount || 0);
//     }, 0);

//     // TopupModel ka total, lekin sirf additionalWallet + deposit type
//     const totalTopup = topuphistory
//       .filter(
//         (t) => t.walletType === "additionalWallet" && t.type === "deposit"
//       )
//       .reduce((sum, t) => sum + (t.amount || 0), 0);

//     // Final deposit (Investment + Topup)
//     const finalTotalDeposit = totalDeposit + totalTopup;

//     let totalWithdrawalSuccess = 0,
//       totalWithdrawalPending = 0,
//       totalWithdrawalCancelled = 0;

//     withdrawal.forEach((w) => {
//       if (w.status === "success") totalWithdrawalSuccess += w.amount;
//       else if (w.status === "pending") totalWithdrawalPending += w.amount;
//       else if (["cancelled", "failed"].includes(w.status))
//         totalWithdrawalCancelled += w.amount;
//     });

//     const totalTransfer = fundTransfer.reduce(
//       (sum, f) => sum + (f.amount || 0),
//       0
//     );

//     const totalSystemFund = reward.reduce((sum, r) => sum + (r.amount || 0), 0);
//     console.log(totalSystemFund, "totalSystemFund");

//     const totalCommissionReward = commissionReward.reduce(
//       (sum, r) => sum + (r.amount || 0),
//       0
//     );

//     const totalReferralBonus = referralBonus.reduce(
//       (sum, r) => sum + (r.amount || 0),
//       0
//     );

//     const totalUserReward = userReward.reduce(
//       (sum, r) => sum + (r.amount || 0),
//       0
//     );

//     const totalDeduct = deduct.reduce((sum, d) => sum + (d.amount || 0), 0);

//     res.status(200).json({
//       success: true,
//       history: {
//         deposit,
//         withdrawal,
//         fundTransfer,
//         reward,
//         teamReward,
//         deduct,
//         swapHistory,
//         topuphistory,
//       },
//       summary: {
//         totalDeposit: finalTotalDeposit,
//         totalWithdrawalSuccess,
//         totalWithdrawalPending,
//         totalWithdrawalCancelled,
//         totalTransfer,
//         totalSystemFund,
//         totalTeamReward,
//         totalDeduct,
//       },
//     });
//   } catch (error) {
//     console.error("allHistory error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

// export const allHistory = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "userId is required",
//       });
//     }

//     const [
//       deposit,
//       fundTransfer,
//       reward,
//       withdrawal,
//       commissionReward,
//       referralBonus,
//       userReward,
//       deduct,
//       swapHistory,
//       topuphistory,
//     ] = await Promise.all([
//       Investment.find({ userId }).sort({ createdAt: -1 }).lean(),

//       FundTransfer.find({
//         $or: [{ from: userId }, { to: userId }],
//       })
//         .sort({ createdAt: -1 })
//         .populate("from", "uuid username")
//         .populate("to", "uuid username")
//         .lean(),

//       // Rewards (System Fund)
//       TopupModel.find({ userId })
//         .sort({ createdAt: -1 })
//         .populate("userId", "uuid username email")
//         .lean(),

//       Withdrawal.find({ userId })
//         .sort({ createdAt: -1 })
//         .populate("userId", "uuid username email")
//         .lean(),

//       // Commission (Team Reward)
//       Commission.find({ userId }).sort({ createdAt: -1 }).lean(),

//       // Referral Bonus
//       ReferalBonus.find({ userId }).sort({ createdAt: -1 }).lean(),

//       // User Reward
//       UserRewardModel.find({ userId }).sort({ createdAt: -1 }).lean(),

//       // Deduction
//       DeductModel.find({ userId }).sort({ createdAt: -1 }).lean(),

//       // Swap
//       SwapModel.find({ userId }).sort({ createdAt: -1 }).lean(),

//       // Topup
//       TopupModel.find({ userId }).sort({ createdAt: -1 }).lean(),
//     ]);

//     // Investment ka total (Trial Amount ko skip karte hue)
//     const totalDeposit = deposit.reduce((sum, d) => {
//       if (d.type === "Trial Amount") {
//         return sum;
//       }
//       return sum + (d.investmentAmount || 0);
//     }, 0);

//     // TopupModel ka total, lekin sirf additionalWallet + deposit type
//     const totalTopup = topuphistory
//       .filter(
//         (t) => t.walletType === "additionalWallet" && t.type === "deposit"
//       )
//       .reduce((sum, t) => sum + (t.amount || 0), 0);

//     // Final deposit (Investment + Topup)
//     const finalTotalDeposit = totalDeposit + totalTopup;

//     let totalWithdrawalSuccess = 0,
//       totalWithdrawalPending = 0,
//       totalWithdrawalCancelled = 0;

//     withdrawal.forEach((w) => {
//       if (w.status === "success") totalWithdrawalSuccess += w.amount;
//       else if (w.status === "pending") totalWithdrawalPending += w.amount;
//       else if (["cancelled", "failed"].includes(w.status))
//         totalWithdrawalCancelled += w.amount;
//     });

//     const totalTransfer = fundTransfer.reduce(
//       (sum, f) => sum + (f.amount || 0),
//       0
//     );

//     const totalSystemFund = reward.reduce((sum, r) => sum + (r.amount || 0), 0);

//     // const totalCommissionReward = commissionReward.reduce(
//     //   (sum, r) => sum + (r.amount || 0),
//     //   0
//     // );

//     const totalReferralBonus = referralBonus.reduce(
//       (sum, r) => sum + (r.amount || 0),
//       0
//     );
//     console.log(totalReferralBonus, "totalReferralBonus");
//     const joiningReward = userReward
//       .filter((r) => r.type === "joining")
//       .reduce((sum, r) => sum + (r.amount || 0), 0);

//     console.log(joiningReward, "joiningReward");

//     const referralReward = userReward
//       .filter((r) => r.type === "referral")
//       .reduce((sum, r) => sum + (r.amount || 0), 0);

//     console.log(referralReward, "referralReward");

//     const teamReward = joiningReward + referralReward + totalReferralBonus;

//     const totalDeduct = deduct.reduce((sum, d) => sum + (d.amount || 0), 0);

//     res.status(200).json({
//       success: true,
//       history: {
//         deposit,
//         withdrawal,
//         fundTransfer,
//         reward,
//         commissionReward,
//         referralBonus,
//         userReward,
//         deduct,
//         swapHistory,
//       },
//       summary: {
//         totalDeposit: finalTotalDeposit,
//         totalWithdrawalSuccess,
//         totalWithdrawalPending,
//         totalWithdrawalCancelled,
//         totalTransfer,
//         totalSystemFund,
//         teamReward,
//         totalDeduct,
//       },
//     });
//   } catch (error) {
//     console.error("allHistory error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

export const allHistory = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // ---- Date filter ----
    let dateFilter = {};
    if (startDate && endDate) {
      // UTC safe conversion
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      console.log("Start:", start);
      console.log("End:", end);

      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }

    // ------------------ Parallel Queries ------------------
    const [
      deposit,
      fundTransfer,
      reward,
      withdrawal,
      commissionReward,
      referralBonus,
      userReward,
      deduct,
      swapHistory,
      topuphistory,
    ] = await Promise.all([
      Investment.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .lean(),

      FundTransfer.find({
        $or: [{ from: userId }, { to: userId }],
        ...dateFilter,
      })
        .sort({ createdAt: -1 })
        .populate("from", "uuid username")
        .populate("to", "uuid username")
        .lean(),

      // Rewards (System Fund)
      TopupModel.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .populate("userId", "uuid username email")
        .lean(),

      Withdrawal.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .populate("userId", "uuid username email")
        .lean(),

      // Commission (Team Reward)
      Commission.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .lean(),

      // Referral Bonus
      ReferalBonus.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .lean(),

      // User Reward
      UserRewardModel.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .lean(),

      // Deduction
      DeductModel.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .lean(),

      // Swap
      SwapModel.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .lean(),

      TopupModel.find({ userId, ...dateFilter })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const totalDeposit = deposit.reduce((sum, d) => {
      if (d.type === "Trial Amount") return sum;
      return sum + (d.investmentAmount || 0);
    }, 0);

    const totalTopup = topuphistory
      .filter(
        (t) => t.walletType === "additionalWallet" && t.type === "deposit",
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const finalTotalDeposit = totalDeposit + totalTopup;

    let totalWithdrawalSuccess = 0,
      totalWithdrawalPending = 0,
      totalWithdrawalCancelled = 0;

    withdrawal.forEach((w) => {
      if (w.status === "success") totalWithdrawalSuccess += w.amount;
      else if (w.status === "pending") totalWithdrawalPending += w.amount;
      else if (["cancelled", "failed"].includes(w.status))
        totalWithdrawalCancelled += w.amount;
    });

    const totalTransfer = fundTransfer.reduce(
      (sum, f) => sum + (f.amount || 0),
      0,
    );

    const totalSystemFund = reward.reduce((sum, r) => sum + (r.amount || 0), 0);

    const totalReferralBonus = referralBonus.reduce(
      (sum, r) => sum + (r.amount || 0),
      0,
    );

    const joiningReward = userReward
      .filter((r) => r.type === "joining")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const referralReward = userReward
      .filter((r) => r.type === "referral")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const teamReward = joiningReward + referralReward + totalReferralBonus;

    const totalDeduct = deduct.reduce((sum, d) => sum + (d.amount || 0), 0);
    console.log(
      deposit.length +
        withdrawal.length +
        fundTransfer.length +
        reward.length +
        commissionReward.length +
        referralBonus.length +
        userReward.length +
        deduct.length +
        swapHistory.length +
        topuphistory.length +
        "allHistory",
    );

    // -------- Final Response --------
    res.status(200).json({
      success: true,
      history: {
        deposit,
        withdrawal,
        fundTransfer,
        reward,
        commissionReward,
        referralBonus,
        userReward,
        deduct,
        swapHistory,
      },
      summary: {
        totalDeposit: finalTotalDeposit,
        totalWithdrawalSuccess,
        totalWithdrawalPending,
        totalWithdrawalCancelled,
        totalTransfer,
        totalSystemFund,
        teamReward,
        totalDeduct,
      },
    });
  } catch (error) {
    console.error("allHistory error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const toggleNotification = async (req, res) => {
  try {
    const { id } = req.body;

    const notification = await NotificationPopup.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isActive = !notification.isActive;

    if (!notification.isActive) {
      notification.isPopupActive = false;
    }

    await notification.save();

    return res.status(200).json({
      success: true,
      message: `Notification ${
        notification.isActive ? "activated" : "deactivated"
      } successfully`,
      data: notification,
    });
  } catch (error) {
    console.error("Error toggling notification:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updateNotificationPopup = async (req, res) => {
  try {
    const { id, description, scheduledTime } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
    }

    // Purana notification nikaalo
    const notification = await NotificationPopup.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    let fileUrl = notification.fileUrl;

    // Agar nayi file aayi hai to cloudinary pe upload kardo
    if (req.file) {
      const response = await cloudinary.uploader.upload(req.file.path, {
        folder: "notifications",
        resource_type: "image",
        transformation: [{ width: 800, height: 600, crop: "limit" }],
      });
      fileUrl = response.secure_url;
    }

    // 👉 Bold (<b> ya <strong>) se title nikaalna
    let title = notification.title;
    if (description) {
      const boldRegex = /<b>(.*?)<\/b>|<strong>(.*?)<\/strong>/i;
      const match = description.match(boldRegex);
      title = match ? match[1] || match[2] : null;
    }

    // 👉 Check karo agar naya scheduledTime future me hai aur purane se bada hai
    if (
      scheduledTime &&
      new Date(scheduledTime) > new Date(notification.scheduledTime)
    ) {
      notification.isActive = false;
      notification.isRead = false;
      notification.isPopupActive = false;
    }

    // Update fields
    notification.description = description || notification.description;
    notification.scheduledTime = scheduledTime || notification.scheduledTime;
    notification.fileUrl = fileUrl;
    notification.title = title;

    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      notification,
    });
  } catch (error) {
    console.error("Error updating notification:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getNotificationPopup = async (req, res) => {
  try {
    const notifications = await NotificationPopup.find().sort({
      scheduledTime: -1,
      createdAt: -1,
    });

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No notifications found",
        data: [],
      });
    }

    const now = new Date();

    const currentMatched = [];
    const others = [];

    notifications.forEach((notif) => {
      const notifTime = new Date(notif.scheduledTime);

      if (
        notifTime.getFullYear() === now.getFullYear() &&
        notifTime.getMonth() === now.getMonth() &&
        notifTime.getDate() === now.getDate() &&
        notifTime.getHours() === now.getHours() &&
        notifTime.getMinutes() === now.getMinutes()
      ) {
        currentMatched.push(notif);
      } else {
        others.push(notif);
      }
    });

    // ✅ dono groups ko bhi scheduledTime + createdAt ke hisaab se sort karenge
    const sortedNotifications = [
      ...currentMatched.sort(
        (a, b) =>
          new Date(b.scheduledTime) - new Date(a.scheduledTime) ||
          new Date(b.createdAt) - new Date(a.createdAt),
      ),
      ...others.sort(
        (a, b) =>
          new Date(b.scheduledTime) - new Date(a.scheduledTime) ||
          new Date(b.createdAt) - new Date(a.createdAt),
      ),
    ];

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: sortedNotifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const notificationToggle = async (req, res) => {
  try {
    const { id } = req.body;
    console.log(id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
    }
    const notification = await NotificationPopup.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    notification.isPopupActive = !notification.isPopupActive;
    await notification.save();

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// export const uploadPdfs = async (req, res) => {
//   try {
//     console.log("🔥 Incoming files:", req.files);

//     if (!req.files || Object.keys(req.files).length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Please upload at least one PDF file",
//       });
//     }

//     // ✅ Purana record check karo
//     let pdfDoc = await Pdf.findOne();

//     // Agar nahi mila to naya banao
//     if (!pdfDoc) {
//       pdfDoc = new Pdf({
//         uploadedBy: req.user ? req.user._id : null,
//       });
//     }

//     // ✅ Jo file upload hui hai usi ko update karo
//     if (req.files.learnMore) {
//       console.log("📄 learnMore file found");
//       pdfDoc.learnMore = await uploadToCloudinary(req.files.learnMore[0]);
//     }
//     if (req.files.presentation) {
//       console.log("📄 presentation file found");
//       pdfDoc.presentation = await uploadToCloudinary(req.files.presentation[0]);
//     }
//     if (req.files.whitepaper) {
//       console.log("📄 whitepaper file found");
//       pdfDoc.whitepaper = await uploadToCloudinary(req.files.whitepaper[0]);
//     }
//     if (req.files.lightpaper) {
//       console.log("📄 lightpaper file found");
//       pdfDoc.lightpaper = await uploadToCloudinary(req.files.lightpaper[0]);
//     }

//     await pdfDoc.save();

//     return res.status(200).json({
//       success: true,
//       message: "PDFs uploaded and saved successfully",
//       data: pdfDoc,
//     });
//   } catch (error) {
//     console.error("❌ Error in uploadPdfs:", error);
//     return res.status(500).json({
//       success: false,
//       message: "PDF upload failed",
//       error: error.message,
//     });
//   }
// };

export const uploadPdfs = async (req, res) => {
  try {
    console.log("🔥 Incoming files:", req.files);

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one PDF file",
      });
    }

    // 🔎 Purana record
    let pdfDoc = await Pdf.findOne();

    if (!pdfDoc) {
      pdfDoc = new Pdf({
        uploadedBy: req.user ? req.user._id : null,
      });
    }

    // 🔁 Common helper (delete → upload)
    const replacePdf = async (oldFile, newFile) => {
      // 🗑️ delete old if exists
      if (oldFile?.public_id) {
        await cloudinary.uploader.destroy(oldFile.public_id, {
          resource_type: "raw",
        });
        console.log("🗑️ Deleted old PDF:", oldFile.public_id);
      }

      // 📤 upload new
      return await uploadToCloudinary(newFile);
    };

    // ================= PDFs =================

    if (req.files.learnMore) {
      console.log("📄 learnMore file found");
      pdfDoc.learnMore = await replacePdf(
        pdfDoc.learnMore,
        req.files.learnMore[0],
      );
    }

    if (req.files.presentation) {
      console.log("📄 presentation file found");
      pdfDoc.presentation = await replacePdf(
        pdfDoc.presentation,
        req.files.presentation[0],
      );
    }

    if (req.files.whitepaper) {
      console.log("📄 whitepaper file found");
      pdfDoc.whitepaper = await replacePdf(
        pdfDoc.whitepaper,
        req.files.whitepaper[0],
      );
    }

    if (req.files.lightpaper) {
      console.log("📄 lightpaper file found");
      pdfDoc.lightpaper = await replacePdf(
        pdfDoc.lightpaper,
        req.files.lightpaper[0],
      );
    }

    await pdfDoc.save();

    return res.status(200).json({
      success: true,
      message: "PDFs replaced and saved successfully",
      data: pdfDoc,
    });
  } catch (error) {
    console.error("❌ Error in uploadPdfs:", error);
    return res.status(500).json({
      success: false,
      message: "PDF upload failed",
      error: error.message,
    });
  }
};

export const getPdfs = async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "PDFs fetched successfully",
      pdfs,
    });
  } catch (error) {
    console.error("❌ Error in getPdfs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch PDFs",
      error: error.message,
    });
  }
};

// export const activeUser = async (req, res) => {
//   try {
//     let { ids } = req.body;
//     console.log(ids);

//     if (!ids || (Array.isArray(ids) && ids.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: "User id(s) are required",
//       });
//     }

//     if (!Array.isArray(ids)) {
//       ids = [ids];
//     }

//     const users = await UserModel.find({ _id: { $in: ids } });

//     if (users.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No users found",
//       });
//     }

//     for (const user of users) {
//       user.isLoginBlocked = !user.isLoginBlocked;
//       user.isLoginBlockedDate = null;
//       await user.save();
//     }

//     return res.status(200).json({
//       success: true,
//       message: "User status updated successfully",
//       users,
//     });
//   } catch (error) {
//     console.error("Error in activeUser:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// export const activeUser = async (req, res) => {
//   try {
//     let { ids } = req.body;
//     const adminId = req.admin?._id;

//     if (!adminId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }
//     if (!ids || (Array.isArray(ids) && ids.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: "User id(s) are required",
//       });
//     }

//     if (!Array.isArray(ids)) {
//       ids = [ids];
//     }

//     const users = await UserModel.find({ _id: { $in: ids } });

//     if (users.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No users found",
//       });
//     }

//     for (const user of users) {
//       user.isLoginBlocked = false;
//       user.isAdminLoginBlock = false;
//       user.isLoginBlockedDate = null;
//       await user.save();

//       // Activity log save
//       await createActivityLog(
//         adminId,
//         "User Status Update",
//         `User ${user.username || user._id} has been ${
//           user.isLoginBlocked ? "blocked" : "unblocked"
//         }`,
//         req.ip
//       );
//     }

//     return res.status(200).json({
//       success: true,
//       message: "User status updated successfully",
//       users,
//     });
//   } catch (error) {
//     console.error("Error in activeUser:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// export const activeUser = async (req, res) => {
//   try {
//     let { ids } = req.body;
//     const adminId = req.admin?._id;

//     if (!adminId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }

//     if (!ids || (Array.isArray(ids) && ids.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: "User id(s) are required",
//       });
//     }

//     if (!Array.isArray(ids)) {
//       ids = [ids];
//     }

//     const users = await UserModel.find({ _id: { $in: ids } });

//     if (users.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No users found",
//       });
//     }

//     for (const user of users) {
//       const wasLoginBlocked = user.isLoginBlocked;
//       const wasAdminBlocked = user.isAdminLoginBlock;

//       user.isLoginBlocked = false;
//       user.isAdminLoginBlock = false;
//       user.isLoginBlockedDate = null;
//       await user.save();

//       let actionMsg = "";

//       if (wasAdminBlocked) {
//         actionMsg = `User ${user.username || user._id} has been Unblocked`;
//       } else if (wasLoginBlocked) {
//         actionMsg = `User ${user.username || user._id} has been Reactive`;
//       } else {
//         actionMsg = `User ${
//           user.username || user._id
//         } was already Active (Unblocked)`;
//       }

//       // Activity log save
//       await createActivityLog(adminId, "User Status Update", actionMsg, req.ip);
//       io.emit("new-activity", {
//         action: "User Status Update",
//         message: actionMsg,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "User status updated successfully",
//       users,
//     });
//   } catch (error) {
//     console.error("Error in activeUser:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// export const activeUser = async (req, res) => {
//   try {
//     let { ids } = req.body;
//     const adminId = req.admin?._id;

//     // ✅ Admin validation
//     if (!adminId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }

//     // ✅ IDS validation
//     if (!ids || (Array.isArray(ids) && ids.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: "User id(s) are required",
//       });
//     }

//     if (!Array.isArray(ids)) ids = [ids];

//     // ✅ Users fetch
//     const users = await UserModel.find({ _id: { $in: ids } });

//     if (!users.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No users found",
//       });
//     }

//     // ✅ Recovery fee fetch
//     const feeDoc = await AccountRecoveryFee.findOne();
//     const fee = feeDoc?.fee || 0;

//     const results = [];

//     // ✅ Bulk process
//     for (const user of users) {
//       // ✅ Already active
//       if (!user.isLoginBlocked && !user.isAdminLoginBlock) {
//         results.push({
//           userId: user._id,
//           status: "already_active",
//           message: "User already active",
//         });
//         continue;
//       }

//       // ✅ CASE 1: Wallet ≤ 39 → Free Unblock
//       if (user.mainWallet <= 39) {
//         user.isLoginBlocked = false;
//         user.isAdminLoginBlock = false;
//         user.lastLoginDate = new Date();
//         await user.save();

//         results.push({
//           userId: user._id,
//           status: "unblocked_free",
//           wallet: user.mainWallet,
//         });
//       }

//       // ✅ CASE 2: Wallet < Fee → Reject
//       else if (user.mainWallet < fee) {
//         results.push({
//           userId: user._id,
//           status: "failed",
//           message: `Insufficient wallet balance. Required ${fee} USDT`,
//           wallet: user.mainWallet,
//         });
//         continue;
//       }

//       // ✅ CASE 3: Wallet ≥ Fee → Paid Unblock + Accounting Entry
//       else {
//         user.mainWallet -= fee;
//         user.isLoginBlocked = false;
//         user.isAdminLoginBlock = false;
//         user.lastLoginDate = new Date();
//         await user.save();

//         // ✅ Unblock history
//         await UnblockUserFeeModel.create({
//           userId: user._id,
//           amount: fee,
//           unblockDate: new Date(),
//           message: `User unblocked and ${fee} USDT deducted`,
//         });

//         // ✅ ✅ ✅ MANDATORY DEDUCTION LEDGER ENTRY
//         await DeductModel.create({
//           userId: user._id,
//           type: "reactivation penalty",
//           amount: fee,
//           uuid: `UNBLOCK-${Date.now()}`,
//           walletType: "mainWallet",
//         });

//         results.push({
//           userId: user._id,
//           status: "unblocked_paid",
//           deducted: fee,
//           wallet: user.mainWallet,
//         });
//       }

//       // ✅ Activity + socket log
//       const actionMsg = `User ${user.username || user._id} unblocked by admin`;

//       await createActivityLog(adminId, "User Status Update", actionMsg, req.ip);

//       io.emit("new-activity", {
//         action: "User Status Update",
//         message: actionMsg,
//       });
//     }

//     // ✅ Final response
//     return res.status(200).json({
//       success: true,
//       message: "Bulk user activation completed",
//       results,
//     });
//   } catch (error) {
//     console.error("Error in activeUser:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };
// export const activeUser = async (req, res) => {
//   try {
//     let { ids } = req.body;
//     const adminId = req.admin?._id;

//     if (!adminId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }

//     if (!ids || (Array.isArray(ids) && ids.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: "User id(s) are required",
//       });
//     }

//     if (!Array.isArray(ids)) ids = [ids];

//     const users = await UserModel.find({ _id: { $in: ids } });
//     if (!users.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No users found",
//       });
//     }

//     const feeDoc = await AccountRecoveryFee.findOne();
//     const fee = Number(feeDoc?.fee || 0);

//     const results = [];

//     for (const user of users) {
//       const wallet = Number(user.mainWallet || 0);

//       // ✅ Already Active
//       if (!user.isLoginBlocked && !user.isAdminLoginBlock) {
//         results.push({
//           userId: user._id,
//           status: "already_active",
//           wallet,
//         });
//         continue;
//       }

//       // ✅ ✅ CASE 1: Wallet ≤ 39 → FREE UNBLOCK (NO CUT)
//       if (wallet <= 40) {
//         user.isLoginBlocked = false;
//         user.isAdminLoginBlock = false;
//         user.lastLoginDate = new Date();
//         await user.save();

//         // ✅ FREE UNBLOCK LEDGER ENTRY (IMPORTANT FOR AUDIT)
//         await DeductModel.create({
//           userId: user._id,
//           type: "reactivation_free",
//           amount: 0,
//           uuid: `FREE-UNBLOCK-${Date.now()}`,
//           walletType: "mainWallet",
//         });

//         results.push({
//           userId: user._id,
//           status: "unblocked_free",
//           wallet,
//         });
//       }

//       // ✅ ✅ CASE 2: Wallet < Fee → REJECT
//       else if (wallet < fee) {
//         results.push({
//           userId: user._id,
//           status: "failed",
//           message: `Insufficient wallet. Required ${fee} USDT`,
//           wallet,
//         });
//         continue;
//       }

//       // ✅ ✅ CASE 3: Wallet ≥ Fee → PAID UNBLOCK
//       else {
//         user.mainWallet = wallet - fee;
//         user.isLoginBlocked = false;
//         user.isAdminLoginBlock = false;
//         user.lastLoginDate = new Date();
//         await user.save();

//         // ✅ UNBLOCK HISTORY
//         await UnblockUserFeeModel.create({
//           userId: user._id,
//           amount: fee,
//           unblockDate: new Date(),
//           message: `User unblocked and ${fee} USDT deducted`,
//         });

//         // ✅ ✅ ✅ MANDATORY DEDUCTION LEDGER
//         await DeductModel.create({
//           userId: user._id,
//           type: "reactivation penalty",
//           amount: fee,
//           uuid: `UNBLOCK-${Date.now()}`,
//           walletType: "mainWallet",
//         });

//         results.push({
//           userId: user._id,
//           status: "unblocked_paid",
//           deducted: fee,
//           wallet: user.mainWallet,
//         });
//       }

//       // ✅ ACTIVITY LOG
//       const actionMsg = `User ${user.username || user._id} unblocked by admin`;
//       await createActivityLog(adminId, "User Status Update", actionMsg, req.ip);

//       io.emit("new-activity", {
//         action: "User Status Update",
//         message: actionMsg,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Bulk user activation completed",
//       results,
//     });
//   } catch (error) {
//     console.error("Error in activeUser:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

export const activeUser = async (req, res) => {
  try {
    let { ids } = req.body;
    const adminId = req.admin?._id;

    // ================== AUTH ==================
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // ================== IDS VALIDATION ==================
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "User id(s) are required",
      });
    }

    if (!Array.isArray(ids)) ids = [ids];

    // ================== FETCH USERS ==================
    const users = await UserModel.find({ _id: { $in: ids } });
    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    // ================== FETCH FEE ==================
    const feeDoc = await AccountRecoveryFee.findOne();
    if (!feeDoc) {
      return res.status(500).json({
        success: false,
        message: "Account recovery fee not configured",
      });
    }

    const fee = Number(feeDoc.fee);

    const results = [];
    const now = new Date();

    // ================== MAIN LOOP ==================
    for (const user of users) {
      const wallet = Number(user.mainWallet || 0);

      // -------- Already Active --------
      if (!user.isLoginBlocked && !user.isAdminLoginBlock) {
        results.push({
          userId: user._id,
          status: "already_active",
          wallet,
        });
        continue;
      }

      // ================== CASE 1: FREE UNBLOCK ==================
      if (wallet < 40) {
        user.isLoginBlocked = false;
        user.isAdminLoginBlock = false;
        user.lastLoginDate = now;
        await user.save();

        results.push({
          userId: user._id,
          status: "unblocked_free",
          wallet,
        });
      }

      // ================== CASE 2: PAID UNBLOCK (DIRECT CUT) ==================
      else {
        user.mainWallet = wallet - fee; // ⚠️ can go negative (as per rule)
        user.isLoginBlocked = false;
        user.isAdminLoginBlock = false;
        user.lastLoginDate = now;
        await user.save();

        await UnblockUserFeeModel.create({
          userId: user._id,
          amount: fee,
          unblockDate: now,
          message: `User unblocked and ${fee} USDT deducted`,
        });

        await DeductModel.create({
          userId: user._id,
          type: "reactivation penalty",
          amount: fee,
          uuid: `UNBLOCK-${Date.now()}`,
          walletType: "mainWallet",
        });

        results.push({
          userId: user._id,
          status: "unblocked_paid",
          deducted: fee,
          wallet: user.mainWallet,
        });
      }

      // ================== ACTIVITY LOG ==================
      const actionMsg = `User ${user.username || user._id} unblocked by admin`;
      await createActivityLog(adminId, "User Status Update", actionMsg, req.ip);
    }

    // ================== SOCKET (ONE TIME) ==================
    io.emit("new-activity", {
      action: "User Status Update",
      message: "Bulk user activation performed by admin",
    });

    return res.status(200).json({
      success: true,
      message: "Bulk user activation completed",
      results,
    });
  } catch (error) {
    console.error("Error in activeUser:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getEditedUserHistory = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const history = await UserHistory.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "User history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Error in getEditedUserHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getTodayRequiredAmount = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const config = await WithdrawalHourConfig.findOne();
    const hour = config?.withdrawalHour || 96;
    const start = new Date(today);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour, 59, 59, 999);
    const fourDaysAgo = new Date(start);
    fourDaysAgo.setDate(start.getDate() - 4);
    const result = await Withdrawal.aggregate([
      {
        $match: {
          type: "withdrawal",
          createdAt: { $gte: fourDaysAgo, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    const total = result.length > 0 ? result[0].totalAmount : 0;

    if (total > 0) {
      await sendEmailForWithdrawalAmount(
        "@example.com",
        "Withdrawal Alert - Today’s Required Amount",
        `<h3>Alert 🚨</h3>
         <p>Aaj ke liye required withdrawal amount (Hour: ${hour}:00) hai: <b>$${total}</b></p>
         <p>Please ensure you have enough balance in wallet.</p>`,
      );
    }
    return res.status(200).json({
      success: true,
      message: `Total required withdrawal amount for today (Hour: ${hour}:00)`,
      totalRequired: total,
    });
  } catch (error) {
    console.error("Error fetching today required amount:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const getAllActivity = async (req, res) => {
  try {
    const adminId = req.admin._id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }
    const activity = await ActivityLog.find().sort({ createdAt: -1 });
    if (activity) {
      return res.status(200).json({
        success: true,
        message: "Activity log fetched successfully",
        data: activity,
      });
    }
  } catch (error) {
    console.error("Error in getAllActivity:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    const deposits = await Investment.aggregate([
      {
        $match: {
          type: { $ne: "Trial Amount" },
        },
      },
      { $group: { _id: null, totalDeposit: { $sum: "$investmentAmount" } } },
    ]);
    const totalDeposit = deposits[0]?.totalDeposit || 0;
    const withdrawals = await Withdrawal.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, totalWithdrawal: { $sum: "$amount" } } },
    ]);
    const totalWithdrawal = withdrawals[0]?.totalWithdrawal || 0;
    if (totalDeposit === 0) {
      return res.status(200).json({
        message: "No valid deposits found in system",
        healthStatus: "No Data",
      });
    }
    const withdrawalPercent = (totalWithdrawal / totalDeposit) * 100;
    let healthStatus = "Healthy";
    if (withdrawalPercent >= 60) {
      healthStatus = "Unhealthy";
    } else if (withdrawalPercent >= 40) {
      healthStatus = "Average";
    }
    return res.status(200).json({
      totalDeposit,
      totalWithdrawal,
      withdrawalPercent: withdrawalPercent.toFixed(2) + "%",
      healthStatus,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const filterUserByMemberandLevel = async (req, res) => {
  try {
    const { level, status } = req.body;
    let filter = {};

    // Level filter
    if (level) {
      filter.level = level;
    }

    // Status logic handling
    if (status) {
      if (status === "Active") {
        filter.isLoginBlocked = false;
        filter.isAdminLoginBlocked = false;
      } else if (status === "Blocked") {
        filter.isLoginBlocked = true;
        filter.isAdminLoginBlocked = true;
      } else if (status === "Inactive") {
        filter.isLoginBlocked = true;
        filter.isAdminLoginBlocked = false;
      }
    }

    const users = await UserModel.find(filter);

    const updatedUsers = users.map((user) => {
      let userStatus = "Active";
      if (user.isLoginBlocked && user.isAdminLoginBlocked) {
        userStatus = "Blocked";
      } else if (user.isLoginBlocked && !user.isAdminLoginBlocked) {
        userStatus = "Inactive";
      }
      return {
        ...user._doc,
        status: userStatus,
      };
    });
    c;

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: updatedUsers,
    });
  } catch (error) {
    console.error("❌ Error in filterUserByMemberandLevel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
const getUserStatus = (user) => {
  if (user.isLoginBlocked && user.isAdminLoginBlock) return "Blocked";
  if (user.isLoginBlocked && !user.isAdminLoginBlock) return "Inactive";
  if (!user.isLoginBlocked && !user.isAdminLoginBlock) return "Active";
  return "Active";
};

export const getAllFilterUsers = async (req, res) => {
  try {
    const {
      userId,
      members = [],
      levels = [],
      status = [],
      startDate,
      endDate,
    } = req.body;

    // ---- calculateTeams ka use ----
    const { teamA, teamB, teamC } = await calculateTeams(
      userId,
      startDate,
      endDate,
    );

    let allUsers = [];

    // ✅ MemberA -> Direct Users
    if (members.includes("Member A")) {
      allUsers = [...allUsers, ...teamA];
    }

    // ✅ MemberB -> Direct ke Direct Users
    if (members.includes("Member B")) {
      allUsers = [...allUsers, ...teamB];
    }

    // ✅ MemberC -> Direct ke Direct ke Direct Users
    if (members.includes("Member C")) {
      allUsers = [...allUsers, ...teamC];
    }

    // Agar koi member filter nahi bheja → sabhi add kar do
    if (members.length === 0) {
      allUsers = [...teamA, ...teamB, ...teamC];
    }

    // ✅ Duplicate users hata do
    allUsers = allUsers.filter(
      (v, i, a) =>
        a.findIndex((t) => t._id.toString() === v._id.toString()) === i,
    );

    // ✅ Status calculate karo aur filter lagao
    allUsers = allUsers.map((user) => ({
      ...user.toObject(),
      status: getUserStatus(user),
    }));

    if (status.length > 0) {
      allUsers = allUsers.filter((u) => status.includes(u.status));
    }

    // ✅ Levels filter
    if (levels.length > 0) {
      const levelNums = levels.map((l) => parseInt(l.replace("Level ", "")));
      allUsers = allUsers.filter((u) => levelNums.includes(u.level));
    }

    return res.status(200).json({
      success: true,
      count: allUsers.length,
      users: allUsers,
    });
  } catch (error) {
    console.error("Error in getAllFilterUsers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to filter users",
      error: error.message,
    });
  }
};

export const getWithdrawalCounters = async (req, res) => {
  try {
    const counter = await WithdrawalCounter.findOne();

    if (!counter) {
      return res.json({
        success: true,
        today: { totalAmount: 0, totalCount: 0, uniqueUsers: 0 },
        tomorrow: { totalAmount: 0, totalCount: 0, uniqueUsers: 0 },
      });
    }

    return res.json({
      success: true,
      today: counter.today,
      tomorrow: counter.tomorrow,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAllUsersForChat = async (req, res) => {
  try {
    const adminId = req.admin._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const conversations = await ConversationModel.find({
      participants: adminId,
    })
      .populate("participants", "name email username profilePicture uuid")
      .lean();

    const users = [];

    conversations.forEach((conv) => {
      conv.participants.forEach((user) => {
        if (String(user._id) !== String(adminId)) {
          users.push({
            _id: user._id,
            username: user.username,
            email: user.email,
            name: user.name,
            uuid: user.uuid,
            profilePicture: user.profilePicture,
            lastMessage: conv.messages?.length
              ? conv.messages[conv.messages.length - 1]
              : null,
          });
        }
      });
    });

    const uniqueUsers = [...new Map(users.map((u) => [u._id, u])).values()];

    return res.status(200).json({
      success: true,
      count: uniqueUsers.length,
      users: uniqueUsers,
    });
  } catch (err) {
    console.error("❌ Error in getAllUsersForChat:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllTicketHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const history = await Support.find();

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    return res.status({
      message: "messages",
      success: false,
    });
  }
};

export const approveTicket = async (req, res) => {
  try {
    const { ticketId, response } = req.body; // Ticket ID
    const adminId = req.admin._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ticket = await Support.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    ticket.response = response;
    ticket.status = "Closed";
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket approved successfully",
    });
  } catch (err) {
    console.error("❌ Error in approveTicket:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const rejecteTicket = async (req, res) => {
  try {
    const { ticketId, response } = req.body;
    const adminId = req.admin._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ticket = await Support.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    ticket.response = response;
    ticket.status = "Rejected";
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket approved successfully",
    });
  } catch (err) {
    console.error("❌ Error in approveTicket:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// export const deleteSupportById = async (req, res) => {
//   try {
//     const { ticketId } = req.body;
//     const adminId = req.admin._id;

//     if (!adminId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     const ticket = await Support.findById(ticketId);

//     if (!ticket) {
//       return res.status(404).json({
//         success: false,
//         message: "Ticket not found",
//       });
//     }

//     await Support.findByIdAndDelete(ticketId);

//     return res.status(200).json({
//       success: true,
//       message: "Ticket deleted successfully",
//     });
//   } catch (err) {
//     console.error("❌ Error in deleteSupportById:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

export const deleteSupportById = async (req, res) => {
  try {
    const { ticketId } = req.body;
    const adminId = req.admin._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ticket = await Support.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    if (ticket.file && ticket.file.length > 0) {
      console.log(
        "🗑 Starting Cloudinary delete for",
        ticket.file.length,
        "files",
      );

      const deletePromises = ticket.file.map(async (img) => {
        if (!img.public_id) {
          console.warn("⚠️ Missing public_id in file, cannot delete:", img);
          return null;
        }

        console.log("➡️ Deleting:", img.public_id);

        const result = await cloudinary.uploader.destroy(img.public_id);

        console.log("✔️ Cloudinary delete result:", result);

        return result;
      });

      await Promise.all(deletePromises);

      console.log("🎯 All cloudinary files deleted for ticket:", ticketId);
    } else {
      console.log("ℹ️ No files found for this ticket. Only deleting DB entry.");
    }

    // Delete DB record
    await Support.findByIdAndDelete(ticketId);
    console.log("📌 Ticket deleted from DB:", ticketId);

    return res.status(200).json({
      success: true,
      message: "Ticket & files deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleteSupportById:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const addLevelIncomeInmainWalletAndPendingWallet = async (req, res) => {
  try {
    const { uuid, amount } = req.body;
    const adminId = req.admin._id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await UserModel.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    user.mainWallet = user.mainWallet + Number(amount);
    user.pendingLevelIncome = user.pendingLevelIncome + Number(amount);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Level Income added successfully mainWallet",
    });
  } catch (err) {
    console.error(
      "❌ Error in addLevelIncomeInmainWalletAndPendingWallet:",
      err,
    );
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

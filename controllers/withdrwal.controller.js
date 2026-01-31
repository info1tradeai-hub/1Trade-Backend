import { ethers } from "ethers";
import {
  JsonRpcProvider,
  Wallet,
  Contract,
  parseUnits,
  formatUnits,
  isAddress,
} from "ethers";

import dotenv from "dotenv";
import UserModel from "../models/user.model.js";

import Withdrawal from "../models/withdrawal.model.js";
import { verify2FA } from "../utils/2fa.js";
import WithdrawalFee from "../models/withdrawalfee.model.js";
import WithdrawalLimit from "../models/WithdrawalLimit.model.js";
import LevelRequirementSchema from "../models/LevelrequirementSchema.model.js";
import { calculateTeams } from "../utils/calculateTeam.js";
import { updateWithdrawalCounter } from "../utils/updateWithdrawalCounter.js";
import createActivityLog from "../models/activityLog.model.js";
import WithdrawalHourConfig from "../models/WithdrawalHourConfig.model.js";
import moment from "moment-timezone";

dotenv.config();

const provider = new JsonRpcProvider("https://bsc-dataseed.binance.org/");
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
const usdtABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];
const usdtContract = new Contract(usdtAddress, usdtABI, wallet);

export const processWithdrawal = async (req, res) => {
  try {
    const userId = req.user?._id;
    const {
      userWalletAddress,
      amount,
      walletType,
      emailOtp,
      authOtp,
      networkType,
    } = req.body;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });

    if (!amount || !walletType || !networkType || !emailOtp || !authOtp)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });

    if (!userWalletAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is not linked. Please link your wallet first",
      });
    }

    const pendingWithdrawal = await Withdrawal.findOne({
      userId,
      status: "pending",
    });
    if (pendingWithdrawal) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending withdrawal. Please wait until it is completed or cancelled.",
      });
    }

    if (!isAddress(userWalletAddress)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid wallet address." });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid withdrawal amount." });
    }

    const user = await UserModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const currentDate = new Date();
    const now = new Date();

    if (
      user.withdrawalBlockedUntil &&
      new Date(user.withdrawalBlockedUntil).getTime() > now.getTime()
    ) {
      return res.status(403).json({
        success: false,
        message: `Withdrawals are blocked until ${new Date(
          user.withdrawalBlockedUntil,
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`,
      });
    }

    if (!user.totalTradeCount || user.totalTradeCount < 5) {
      return res.status(400).json({
        success: false,
        message: "You need at least 5 trades to make a withdrawal.",
      });
    }
    const feeConfig = await WithdrawalFee.findOne().sort({ createdAt: -1 });
    if (!feeConfig)
      return res
        .status(500)
        .json({ success: false, message: "Fee configuration not found." });

    if (emailOtp !== user.otp || user.otpExpire < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired email OTP." });
    }

    const isVerified = await verify2FA(user.email, authOtp);
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired Google Authenticator code.",
      });
    }
    const withdrawalRule = await WithdrawalLimit.findOne({
      level: Number(user.level),
    });
    if (!withdrawalRule) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal rules not configured for your level.",
      });
    }
    if (numericAmount < withdrawalRule.min) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal for your level is $${withdrawalRule.min}`,
      });
    }

    // ---------------------------
    // EXTRA: CHECK IF USER MEETS LEVEL 2 REQUIREMENTS PARTIALLY
    // ---------------------------
    // let meetsLevel2Partial = false;
    // if (user.level === 1) {
    //   const level2Req = await LevelRequirementSchema.findOne({ level: 2 });

    //   if (level2Req) {
    //     const { teamA, teamB, teamC } = await calculateTeams(user._id);
    //     // console.log("Teams:", {
    //     //   teamA: teamA.length,
    //     //   teamB: teamB.length,
    //     //   teamC: teamC.length,
    //     // });
    //     const validA = teamA.filter(
    //       (m) => m.isVerified && m.mainWallet >= 30,
    //     ).length;
    //     const validBC = [...teamB, ...teamC].filter(
    //       (m) => m.isVerified && m.mainWallet >= 30,
    //     ).length;
    //     console.log("Valid A:", validA, "Valid BC:", validBC);
    //     if (
    //       (user.aiCredits || 0) >= level2Req.aiCredits &&
    //       validA >= level2Req.activeA &&
    //       validBC >= level2Req.activeBC
    //     ) {
    //       meetsLevel2Partial = true;
    //     }
    //   }
    // }

    // ---------------------------
    // LEVEL < 2 PRINCIPAL RULE
    // ---------------------------
    // if (user.level < 2 && !meetsLevel2Partial) {
    //   if (walletType === "mainWallet") {
    //     if (user.mainWalletPrinciple == 0) {
    //       return res.status(400).json({
    //         success: false,
    //         message: `you didn't have any deposit amount. you can transfer your profit to get a transfer feature valid 2 Direct members or you need to meet 2nd level requirements to get unlimited withdrawals and transfers.`,
    //       });
    //     }
    //     if (numericAmount > user.mainWalletPrinciple) {
    //       return res.status(400).json({
    //         success: false,
    //         message: `You can withdraw maximum your remaining principal from mainWallet: $${user.mainWalletPrinciple}. Meet 2nd level requirement for further withdrawals.`,
    //       });
    //     }
    //     user.mainWalletPrinciple -= numericAmount;
    //     if (user.mainWalletPrinciple < 0) user.mainWalletPrinciple = 0;
    //   }

    //   if (walletType === "additionalWallet") {
    //     if (
    //       !user.additionalWalletPrinciple ||
    //       user.additionalWalletPrinciple <= 0
    //     ) {
    //       return res.status(400).json({
    //         success: false,
    //         message:
    //           "You are 100% withdrawal of your principle amount. Refer 2 valid members or upgrade level.",
    //       });
    //     }
    //     if (numericAmount > user.additionalWalletPrinciple) {
    //       return res.status(400).json({
    //         success: false,
    //         message: `You can withdraw maximum your remaining principal from Additional Wallet: $${user.additionalWalletPrinciple}. Meet 2nd level requirement for further withdrawals.`,
    //       });
    //     }
    //     user.additionalWalletPrinciple -= numericAmount;
    //     if (user.additionalWalletPrinciple < 0)
    //       user.additionalWalletPrinciple = 0;
    //   }
    // } else {
    // ---------------------------
    // LEVEL >= 2 OR meetsLevel2Partial RULES
    // ---------------------------
    // ---------------------------
    // SINGLE & MONTHLY WITHDRAWAL LIMIT CHECK
    // ---------------------------

    // 1️⃣ Single withdrawal limit
    if (numericAmount > withdrawalRule.singleWithdrawalLimit) {
      return res.status(400).json({
        success: false,
        message: `Maximum single withdrawal for your level is $${withdrawalRule.singleWithdrawalLimit}`,
      });
    }

    // 2️⃣ Monthly withdrawal count
    const firstDayOfMonth = moment()
      .tz("Asia/Kolkata")
      .startOf("month")
      .toDate();

    const lastDayOfMonth = moment().tz("Asia/Kolkata").endOf("month").toDate();

    const monthlyWithdrawalsCount = await Withdrawal.countDocuments({
      userId,
      status: "success",
      createdAt: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth,
      },
    });

    // perMonthWithdrawalCount null ho to unlimited (level 0 jaisa)
    if (
      withdrawalRule.perMonthWithdrawalCount !== null &&
      monthlyWithdrawalsCount >= withdrawalRule.perMonthWithdrawalCount
    ) {
      return res.status(400).json({
        success: false,
        message: `Monthly withdrawal limit reached. You can withdraw only ${withdrawalRule.perMonthWithdrawalCount} times per month.`,
      });
    }

    // ---------------------------
    // FEE CALCULATION
    // ---------------------------
    let feePercentage = 0;
    if (networkType === "BEP20") {
      feePercentage = feeConfig.Bepfee;
    } else if (networkType === "TRC20") {
      feePercentage = feeConfig.Trcfee;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported network type." });
    }

    const fee = (numericAmount * feePercentage) / 100;
    const netAmount = numericAmount - fee;

    // ---------------------------
    // WALLET DEDUCTION
    // ---------------------------
    if (walletType === "mainWallet") {
      if (user.mainWallet < numericAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance in Main Wallet.",
        });
      }
      user.mainWallet -= numericAmount;
      user.withdrawalPendingAmount =
        (user.withdrawalPendingAmount || 0) + numericAmount;
    } else if (walletType === "additionalWallet") {
      if (user.additionalWallet < numericAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance in Additional Wallet.",
        });
      }
      user.additionalWallet -= numericAmount;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid wallet type." });
    }
    // user.totalPayouts += numericAmount;
    user.isJoiningBonusGetFirstTime = true;
    user.isjoiningBonusGiven = true;
    // ✅ READ CONFIG ONCE (SOURCE OF TRUTH)
    const hourConfig = await WithdrawalHourConfig.findOne();
    const cutoffHours = Number(hourConfig?.withdrawalHour) || 90;

    if (!cutoffHours || cutoffHours <= 0) {
      return res.status(500).json({
        success: false,
        message: "Withdrawal hours configuration is invalid. Contact support.",
      });
    }

    // ✅ EXACT TIME — NO RANGE, NO GUESS
    // const processableAfter = new Date(
    //   Date.now() + cutoffHours * 60 * 60 * 1000
    // );
    const processableAfter = moment()
      .tz("Asia/Kolkata")
      .add(cutoffHours, "hours")
      .toDate();

    await user.save();
    await Withdrawal.create({
      userId,
      userWalletAddress,
      amount: numericAmount,
      feeAmount: fee,
      netAmountSent: netAmount,
      walletType,
      networkType,
      status: "pending",
      transactionHash: "",
      cutoffHours,
      processableAfter,
    });

    return res.status(200).json({
      success: true,
      message: `Withdrawal request submitted successfully. Net amount: $${netAmount.toFixed(
        2,
      )} will be successful between 48 to 90 hours.`,
    });
  } catch (error) {
    console.error("Withdrawal Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during withdrawal.",
    });
  }
};

export const approveWithdrawalByAdmin = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    const { transactionIds } = req.body;

    console.log("🟢 Admin trying to approve withdrawals:", transactionIds);

    if (!adminId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admin can approve withdrawals",
      });
    }

    const ids = Array.isArray(transactionIds)
      ? transactionIds
      : [transactionIds];

    const withdrawals = await Withdrawal.find({
      _id: { $in: ids },
      status: "pending",
    });

    if (!withdrawals.length) {
      return res.status(404).json({
        success: false,
        message: "No valid pending withdrawals found",
      });
    }

    const results = [];
    const tokenDecimals = await usdtContract.decimals();
    console.log("🔢 Token Decimals:", tokenDecimals);

    for (let withdrawal of withdrawals) {
      try {
        console.log(`\n➡ Processing withdrawal ID: ${withdrawal._id}`);

        const user = await UserModel.findById(withdrawal.userId);
        if (!user) {
          results.push({
            withdrawalId: withdrawal._id,
            success: false,
            message: "User not found",
          });
          continue;
        }

        const amountWei = ethers.parseUnits(
          withdrawal.netAmountSent.toString(),
          tokenDecimals,
        );
        const serverBalance = await usdtContract.balanceOf(wallet.address);
        const readableBalance = ethers.formatUnits(
          serverBalance,
          tokenDecimals,
        );

        if (serverBalance < amountWei) {
          results.push({
            withdrawalId: withdrawal._id,
            success: false,
            message: `Insufficient funds in admin wallet. Available: ${Number(
              readableBalance,
            ).toFixed(2)} USDT`,
          });

          await createActivityLog(
            adminId,
            "Approve Withdrawal",
            `Withdrawal failed for user ${user.username}: Insufficient funds`,
            req.ip,
          );

          continue;
        }

        console.log(
          `🚀 Sending transaction for withdrawal ${withdrawal._id} to ${withdrawal.userWalletAddress}`,
        );

        const tx = await usdtContract.transfer(
          withdrawal.userWalletAddress,
          amountWei,
          { gasLimit: 210000 },
        );

        const receipt = await tx.wait();

        if (receipt.status) {
          withdrawal.status = "success";
          withdrawal.transactionHash = receipt.transactionHash;

          if (withdrawal.walletType === "mainWallet") {
            user.depositMainWallet =
              (user.depositMainWallet || 0) - withdrawal.amount;
            if (user.depositMainWallet < 0) user.depositMainWallet = 0;
            user.cycleWithdrawn =
              (user.cycleWithdrawn || 0) + withdrawal.amount;

            user.withdrawalPendingAmount =
              (user.withdrawalPendingAmount || 0) - withdrawal.amount;
            if (user.withdrawalPendingAmount < 0)
              user.withdrawalPendingAmount = 0;
          }

          results.push({
            withdrawalId: withdrawal._id,
            success: true,
            message: "Withdrawal approved and processed successfully",
            txHash: receipt.transactionHash,
          });

          // ✅ Activity log with username
          await createActivityLog(
            adminId,
            "Approve Withdrawal",
            `Withdrawal approved for user ${user.username} | Amount: ${withdrawal.netAmountSent} USDT`,
            req.ip,
          );
          await updateWithdrawalCounter(withdrawal, "subtract");
        } else {
          withdrawal.status = "failed";
          withdrawal.transactionHash = receipt.transactionHash;

          if (withdrawal.walletType === "mainWallet") {
            user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;
            user.withdrawalPendingAmount =
              (user.withdrawalPendingAmount || 0) - withdrawal.amount;
            if (user.withdrawalPendingAmount < 0)
              user.withdrawalPendingAmount = 0;
          } else if (withdrawal.walletType === "additionalWallet") {
            user.additionalWallet =
              (user.additionalWallet || 0) + withdrawal.amount;
          }

          user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
          if (user.totalPayouts < 0) user.totalPayouts = 0;

          if (user.level < 2) {
            if (withdrawal.walletType === "mainWallet") {
              user.mainWalletPrinciple =
                (user.mainWalletPrinciple || 0) + withdrawal.amount;
            } else if (withdrawal.walletType === "additionalWallet") {
              user.additionalWalletPrinciple =
                (user.additionalWalletPrinciple || 0) + withdrawal.amount;
            }
          }

          results.push({
            withdrawalId: withdrawal._id,
            success: false,
            message: "Withdrawal transaction failed on-chain",
            txHash: receipt.transactionHash,
          });

          // ✅ Activity log with username
          await createActivityLog(
            adminId,
            "Approve Withdrawal",
            `Withdrawal failed on-chain for user ${user.username} | Amount: ${withdrawal.netAmountSent} USDT`,
            req.ip,
          );
        }

        await withdrawal.save();
        await user.save();
      } catch (err) {
        results.push({
          withdrawalId: withdrawal._id,
          success: false,
          message: err.message,
        });

        await createActivityLog(
          adminId,
          "Approve Withdrawal",
          `Error processing withdrawal for userId ${withdrawal.userId}: ${err.message}`,
          req.ip,
        );
      }
    }

    const allFailed = results.every((r) => r.success === false);

    return res.status(200).json({
      success: !allFailed,
      results,
    });
  } catch (error) {
    console.error("🔥 Fatal error in approveWithdrawalByAdmin:", error.stack);

    await createActivityLog(
      req.admin?._id,
      "Approve Withdrawal",
      `Fatal error: ${error.message}`,
      req.ip,
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const rejectWithdrawalByAdmin = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    let { transactionIds } = req.body;

    if (!adminId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admin can reject withdrawals",
      });
    }

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "transactionIds must be a non-empty array",
      });
    }

    const withdrawals = await Withdrawal.find({
      _id: { $in: transactionIds },
      status: "pending",
    });

    if (withdrawals.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No pending withdrawals found for given IDs",
      });
    }

    const userIds = [...new Set(withdrawals.map((w) => w.userId.toString()))];
    const users = await UserModel.find({ _id: { $in: userIds } });

    const userMap = new Map();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    const results = [];
    const activityLogs = [];

    for (const withdrawal of withdrawals) {
      const user = userMap.get(withdrawal.userId.toString());
      if (!user) {
        results.push({
          transactionId: withdrawal._id,
          success: false,
          message: "User not found",
        });
        continue;
      }

      if (withdrawal.walletType === "mainWallet") {
        user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;

        user.withdrawalPendingAmount =
          (user.withdrawalPendingAmount || 0) - withdrawal.amount;
        if (user.withdrawalPendingAmount < 0) user.withdrawalPendingAmount = 0;

        if (user.level < 2) {
          user.mainWalletPrinciple =
            (user.mainWalletPrinciple || 0) + withdrawal.amount;
        }
      } else if (withdrawal.walletType === "additionalWallet") {
        user.additionalWallet =
          (user.additionalWallet || 0) + withdrawal.amount;

        if (user.level < 2) {
          user.additionalWalletPrinciple =
            (user.additionalWalletPrinciple || 0) + withdrawal.amount;
        }
      } else {
        results.push({
          transactionId: withdrawal._id,
          success: false,
          message: "Invalid wallet type",
        });
        continue;
      }

      user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
      if (user.totalPayouts < 0) user.totalPayouts = 0;

      withdrawal.status = "cancelled";

      results.push({
        transactionId: withdrawal._id,
        success: true,
        message: "Withdrawal rejected and amount refunded",
        username: user.username,
        amount: withdrawal.amount,
      });

      // ✅ Activity Log Entry
      activityLogs.push({
        adminId,
        userId: user._id,
        username: user.username,
        action: "REJECT_WITHDRAWAL",
        details: `Withdrawal of ${withdrawal.amount} USDT rejected by admin and refunded to ${withdrawal.walletType}`,
        createdAt: new Date(),
      });
    }

    const withdrawalSavePromise = Withdrawal.bulkSave(withdrawals);
    const userSavePromise = UserModel.bulkSave(users);
    const activityLogPromise = ActivityLog.insertMany(activityLogs);

    await Promise.all([
      withdrawalSavePromise,
      userSavePromise,
      activityLogPromise,
    ]);

    return res.status(200).json({
      success: true,
      message: "Withdrawals rejected and logged successfully",
      results,
    });
  } catch (error) {
    console.error("Error rejecting withdrawals:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// export const rejectWithdrawalByAdmin = async (req, res) => {
//   try {
//     const adminId = req.admin?._id;
//     let { transactionIds } = req.body;

//     if (!adminId) {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized: Only admin can reject withdrawals",
//       });
//     }

//     if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "transactionIds must be a non-empty array",
//       });
//     }

//     // Withdrawal fetch in batch
//     const withdrawals = await Withdrawal.find({
//       _id: { $in: transactionIds },
//       status: "pending", // sirf pending reject honge
//     });

//     if (withdrawals.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No pending withdrawals found for given IDs",
//       });
//     }

//     // User IDs nikal lo aur unko ek baar me fetch karo
//     const userIds = [...new Set(withdrawals.map((w) => w.userId.toString()))];
//     const users = await UserModel.find({ _id: { $in: userIds } });

//     const userMap = new Map();
//     users.forEach((u) => userMap.set(u._id.toString(), u));

//     const results = [];

//     for (const withdrawal of withdrawals) {
//       const user = userMap.get(withdrawal.userId.toString());
//       if (!user) {
//         results.push({
//           transactionId: withdrawal._id,
//           success: false,
//           message: "User not found",
//         });
//         continue;
//       }

//       // ---------------------------
//       // REFUND WALLET LOGIC
//       // ---------------------------
//       if (withdrawal.walletType === "mainWallet") {
//         user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;

//         user.withdrawalPendingAmount =
//           (user.withdrawalPendingAmount || 0) - withdrawal.amount;
//         if (user.withdrawalPendingAmount < 0) user.withdrawalPendingAmount = 0;

//         if (user.level < 2) {
//           user.mainWalletPrinciple =
//             (user.mainWalletPrinciple || 0) + withdrawal.amount;
//         }
//       } else if (withdrawal.walletType === "additionalWallet") {
//         user.additionalWallet =
//           (user.additionalWallet || 0) + withdrawal.amount;

//         if (user.level < 2) {
//           user.additionalWalletPrinciple =
//             (user.additionalWalletPrinciple || 0) + withdrawal.amount;
//         }
//       } else {
//         results.push({
//           transactionId: withdrawal._id,
//           success: false,
//           message: "Invalid wallet type",
//         });
//         continue;
//       }

//       // ---------------------------
//       // UPDATE TOTAL PAYOUT
//       // ---------------------------
//       user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
//       if (user.totalPayouts < 0) user.totalPayouts = 0;

//       // Mark withdrawal as rejected
//       withdrawal.status = "cancelled";

//       results.push({
//         transactionId: withdrawal._id,
//         success: true,
//         message: "Withdrawal rejected  and amount refunded",
//       });
//     }

//     // ✅ Batch save
//     const withdrawalSavePromise = Withdrawal.bulkSave(withdrawals);
//     const userSavePromise = UserModel.bulkSave(users);
//     await Promise.all([withdrawalSavePromise, userSavePromise]);

//     return res.status(200).json({
//       success: true,
//       message: "Withdrawals processed successfully",
//       results,
//     });
//   } catch (error) {
//     console.error("Error rejecting withdrawals:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

// export const approveWithdrawalByAdmin = async (req, res) => {
//   try {
//     const adminId = req.admin?._id;
//     const { transactionIds } = req.body;

//     console.log("🟢 Admin trying to approve withdrawals:", transactionIds);

//     if (!adminId) {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized: Only admin can approve withdrawals",
//       });
//     }

//     const ids = Array.isArray(transactionIds)
//       ? transactionIds
//       : [transactionIds];

//     const withdrawals = await Withdrawal.find({
//       _id: { $in: ids },
//       status: "pending",
//     });

//     if (!withdrawals.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No valid pending withdrawals found",
//       });
//     }

//     const results = [];

//     // ✅ Fetch token decimals once
//     const tokenDecimals = await usdtContract.decimals();
//     console.log("🔢 Token Decimals:", tokenDecimals);

//     for (let withdrawal of withdrawals) {
//       try {
//         console.log(`\n➡ Processing withdrawal ID: ${withdrawal._id}`);

//         const user = await UserModel.findById(withdrawal.userId);
//         if (!user) {
//           results.push({
//             withdrawalId: withdrawal._id,
//             success: false,
//             message: "User not found",
//           });
//           continue;
//         }

//         const amountWei = ethers.parseUnits(
//           withdrawal.netAmountSent.toString(),
//           tokenDecimals
//         );

//         const serverBalance = await usdtContract.balanceOf(wallet.address);
//         const readableBalance = ethers.formatUnits(
//           serverBalance,
//           tokenDecimals
//         );

//         if (serverBalance < amountWei) {
//           results.push({
//             withdrawalId: withdrawal._id,
//             success: false,
//             message: `Insufficient funds in admin wallet. Available: ${Number(
//               readableBalance
//             ).toFixed(2)} USDT`,
//           });
//           continue;
//         }

//         console.log(
//           `🚀 Sending transaction for withdrawal ${withdrawal._id} to ${withdrawal.userWalletAddress}`
//         );

//         const tx = await usdtContract.transfer(
//           withdrawal.userWalletAddress,
//           amountWei,
//           { gasLimit: 210000 }
//         );

//         const receipt = await tx.wait();

//         if (receipt.status) {
//           withdrawal.status = "success";
//           withdrawal.transactionHash = receipt.transactionHash;

//           // ✅ Same addition/subtraction logic
//           if (withdrawal.walletType === "mainWallet") {
//             user.depositMainWallet =
//               (user.depositMainWallet || 0) - withdrawal.amount;
//             if (user.depositMainWallet < 0) user.depositMainWallet = 0;

//             user.withdrawalPendingAmount =
//               (user.withdrawalPendingAmount || 0) - withdrawal.amount;
//             if (user.withdrawalPendingAmount < 0)
//               user.withdrawalPendingAmount = 0;
//           }

//           results.push({
//             withdrawalId: withdrawal._id,
//             success: true,
//             message: "Withdrawal approved and processed successfully",
//             txHash: receipt.transactionHash,
//           });
//         } else {
//           withdrawal.status = "failed";
//           withdrawal.transactionHash = receipt.transactionHash;

//           if (withdrawal.walletType === "mainWallet") {
//             user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;
//             user.withdrawalPendingAmount =
//               (user.withdrawalPendingAmount || 0) - withdrawal.amount;
//             if (user.withdrawalPendingAmount < 0)
//               user.withdrawalPendingAmount = 0;
//           } else if (withdrawal.walletType === "additionalWallet") {
//             user.additionalWallet =
//               (user.additionalWallet || 0) + withdrawal.amount;
//           }

//           user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
//           if (user.totalPayouts < 0) user.totalPayouts = 0;

//           if (user.level < 2) {
//             if (withdrawal.walletType === "mainWallet") {
//               user.mainWalletPrinciple =
//                 (user.mainWalletPrinciple || 0) + withdrawal.amount;
//             } else if (withdrawal.walletType === "additionalWallet") {
//               user.additionalWalletPrinciple =
//                 (user.additionalWalletPrinciple || 0) + withdrawal.amount;
//             }
//           }

//           results.push({
//             withdrawalId: withdrawal._id,
//             success: false,
//             message: "Withdrawal transaction failed on-chain",
//             txHash: receipt.transactionHash,
//           });
//         }

//         await withdrawal.save();
//         await user.save();
//       } catch (err) {
//         results.push({
//           withdrawalId: withdrawal._id,
//           success: false,
//           message: err.message,
//         });
//       }
//     }

//     const allFailed = results.every((r) => r.success === false);

//     return res.status(200).json({
//       success: !allFailed,
//       results,
//     });
//   } catch (error) {
//     console.error("🔥 Fatal error in approveWithdrawalByAdmin:", error.stack);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

// import cron from "node-cron";
// import { resetBonusAfter2Days } from "./resetAfterTwoDaysBonus.js";
// import { runLevelDowngrades, runLevelUpgrades } from "./LevelUpgrade.js";
// import { AiAgentRoi } from "./Aiagent.js";
// import { blockInactiveUsers } from "./userBlock.js";
// import { resetUsersDaily4AM } from "../utils/timezoneReset.js";
// import UserModel from "../models/user.model.js";
// import { processWithdrawals } from "./withdrawalProcessor.js";
// import { processReferralRewardsForAllUsers } from "./giveReferralRewardForSpecificCriteria.js";
// import { checkAndActivateSchedules } from "./notificationToActivate.js";
// import WithdrawalCounter from "../models/WithdrawalCounter.model.js";
// import Withdrawal from "../models/withdrawal.model.js";
// import WithdrawalHourConfig from "../models/WithdrawalHourConfig.model.js";
// import moment from "moment-timezone";
// import { resetTradeCount } from "./resetTradeCount.js";

// let isResettingBonus = false;
// let isUpgradingLevels = false;
// let isAiAgentRoiRunning = false;
// let isBlockingUsers = false;
// let isLevelChangeRunning = false;
// let isWithdrawRunning = false;
// let isResettingDaily4AM = false;

// let isResettingTradeCountSelf = false;

// cron.schedule(
//   "0 4 * * *",
//   async () => {
//     if (isResettingDaily4AM) {
//       console.log("⏳ Daily 4AM reset already running, skipping...");
//       return;
//     }

//     isResettingDaily4AM = true;

//     console.log(
//       "🕒 Cron fired at:",
//       new Date().toLocaleString("en-IN", {
//         timeZone: "Asia/Kolkata",
//       }),
//     );

//     try {
//       await resetUsersDaily4AM();
//     } catch (err) {
//       console.error("❌ Daily 4AM cron error:", err.message);
//     } finally {
//       isResettingDaily4AM = false;
//     }
//   },
//   {
//     timezone: "Asia/Kolkata",
//   },
// );

// cron.schedule(
//   "0 5 * * *",
//   async () => {
//     if (isResettingTradeCountSelf) return;
//     isResettingTradeCountSelf = true;

//     try {
//       await resetTradeCount();
//     } catch (error) {
//       console.error("Cron timezone reset error:", error.message);
//     } finally {
//       isResettingTradeCountSelf = false;
//     }
//   },
//   {
//     scheduled: true,
//     timezone: "Asia/Kolkata",
//   },
// );

// cron.schedule("*/10 * * * *", async () => {
//   if (isResettingBonus) return;

//   console.log("🔁 Running resetBonusAfter2Days...");

//   isResettingBonus = true;
//   try {
//     await resetBonusAfter2Days();
//   } catch (err) {
//     console.error("❌ Error in resetBonusAfter2Days:", err.message);
//   } finally {
//     isResettingBonus = false;
//   }
// });

// // // // 1. Level Upgrade Every 30 Seconds
// cron.schedule("*/30 * * * * *", async () => {
//   if (isUpgradingLevels) {
//     console.log("⏳ Level upgrade job already running. Skipping...");
//     return;
//   }
//   isUpgradingLevels = true;
//   try {
//     console.log("📈 Running runLevelUpgrades...");
//     await runLevelUpgrades();
//   } catch (err) {
//     // console.error("❌ Error in runLevelUpgrades:", err.message);
//   } finally {
//     isUpgradingLevels = false;
//   }
// });

// // 2. Level Downgrade Every 1 Minute
// cron.schedule("0 * * * * *", async () => {
//   if (isLevelChangeRunning) {
//     // console.log("⏳ Level Downgrade already running...");
//     return;
//   }
//   isLevelChangeRunning = true;
//   try {
//     // console.log("📉 Running runLevelDowngrades...");
//     await runLevelDowngrades();
//   } catch (err) {
//     console.error("❌ Error in runLevelDowngrades:", err.message);
//   } finally {
//     isLevelChangeRunning = false;
//   }
// });

// // Cron for daily AiAgent ROI processing at 4:00 AM

// cron.schedule(
//   "0 5 * * *", // ✅ Roz subah 5:00 AM
//   async () => {
//     if (isAiAgentRoiRunning) {
//       return; // ✅ Duplicate run se bachao
//     }

//     isAiAgentRoiRunning = true;

//     try {
//       console.log("🤖 Running AiAgentRoi at 5:00 AM IST...");
//       await AiAgentRoi();
//     } catch (err) {
//       console.error("❌ Error in AiAgentRoi:", err.message);
//     } finally {
//       isAiAgentRoiRunning = false;
//     }
//   },
//   {
//     timezone: "Asia/Kolkata", // ✅ Indian Time Fix
//   },
// );

// // // blockInactiveUsers if he did not login for 4 days and has no active AI agent

// cron.schedule("*/30 * * * *", async () => {
//   if (isBlockingUsers) {
//     // console.log("⏳ blockInactiveUsers already running...");
//     return;
//   }

//   isBlockingUsers = true;
//   // console.log("🚫 Running blockInactiveUsers...");

//   try {
//     await blockInactiveUsers();
//   } catch (err) {
//     // console.error("❌ Error in blockInactiveUsers:", err.message);
//   } finally {
//     isBlockingUsers = false;
//   }
// });

// cron.schedule("*/10 * * * *", async () => {
//   if (isWithdrawRunning) {
//     console.log("⏳ Withdrawal cron already running, skipping...");
//     return;
//   }

//   isWithdrawRunning = true;
//   console.log("▶️ Withdrawal cron started");

//   try {
//     await processWithdrawals();
//     console.log("✅ Withdrawal cron completed");
//   } catch (error) {
//     console.error("❌ Withdrawal cron error:", error);
//   } finally {
//     isWithdrawRunning = false;
//   }
// });

// // cron.schedule("* * * * * *", async () => {
// //   // console.log(
// //   //   "⏳ Cron running every 30 sec for notification and banner activation..."
// //   // );
// //   try {
// //     await checkAndActivateSchedules();
// //   } catch (err) {
// //     console.error("❌ Error in cron job:", err.message);
// //   }
// //   // console.log("✅ Cron job completed for notification and banner activation.");
// // });

// let isReferralJobRunning = false;

// cron.schedule("* * * * *", async () => {
//   if (isReferralJobRunning) {
//     // console.log("⏳ Referral job already running... skipping this run.");
//     return;
//   }

//   isReferralJobRunning = true;
//   try {
//     await processReferralRewardsForAllUsers();
//   } catch (err) {
//     console.error(err);
//   } finally {
//     isReferralJobRunning = false;
//   }
// });

// cron.schedule(
//   "*/5 * * * *", // every 5 minutes
//   async () => {
//     try {
//       console.log("⏰ Updating withdrawal counters (IST BASED)");

//       let counter = await WithdrawalCounter.findOne();
//       if (!counter) counter = new WithdrawalCounter();

//       const nowIST = moment().tz("Asia/Kolkata");

//       // =========================
//       // 📅 DATE RANGES (IST)
//       // =========================

//       // TODAY
//       const startOfToday = nowIST.clone().startOf("day").toDate();
//       const endOfToday = nowIST.clone().endOf("day").toDate();

//       // TOMORROW (ACTUAL TOMORROW ONLY)
//       const startOfTomorrow = nowIST
//         .clone()
//         .add(1, "day")
//         .startOf("day")
//         .toDate();
//       const endOfTomorrow = nowIST.clone().add(1, "day").endOf("day").toDate();

//       // FUTURE (DAY AFTER TOMORROW & BEYOND)
//       const startOfFuture = nowIST
//         .clone()
//         .add(2, "day")
//         .startOf("day")
//         .toDate();

//       // =========================
//       // 🔍 DB QUERIES
//       // =========================

//       const [todayPending, tomorrowPending, futurePending] = await Promise.all([
//         Withdrawal.find({
//           status: "pending",
//           processableAfter: {
//             $gte: startOfToday,
//             $lte: endOfToday,
//           },
//         }),

//         Withdrawal.find({
//           status: "pending",
//           processableAfter: {
//             $gte: startOfTomorrow,
//             $lte: endOfTomorrow,
//           },
//         }),

//         Withdrawal.find({
//           status: "pending",
//           processableAfter: {
//             $gte: startOfFuture,
//           },
//         }),
//       ]);

//       // =========================
//       // 📊 COUNTER CALCULATION
//       // =========================

//       counter.today = {
//         totalAmount: todayPending.reduce((s, w) => s + Number(w.amount), 0),
//         totalCount: todayPending.length,
//         uniqueUsers: new Set(todayPending.map((w) => w.userId.toString())).size,
//         date: startOfToday,
//       };

//       counter.tomorrow = {
//         totalAmount: tomorrowPending.reduce((s, w) => s + Number(w.amount), 0),
//         totalCount: tomorrowPending.length,
//         uniqueUsers: new Set(tomorrowPending.map((w) => w.userId.toString()))
//           .size,
//         date: startOfTomorrow,
//       };

//       counter.future = {
//         totalAmount: futurePending.reduce((s, w) => s + Number(w.amount), 0),
//         totalCount: futurePending.length,
//         uniqueUsers: new Set(futurePending.map((w) => w.userId.toString()))
//           .size,
//         date: startOfFuture,
//       };

//       await counter.save();

//       console.log("✅ Withdrawal counters updated correctly");
//     } catch (err) {
//       console.error("❌ Withdrawal counter cron error:", err);
//     }
//   },
//   {
//     timezone: "Asia/Kolkata",
//   },
// );

// // unblock user withdarawhatwal when time is over

// // cron.schedule("* * * * *", async () => {
// //     console.log("🔁 Running cron job to unblock users...");

// //     try {
// //         const now = new Date();
// //         const usersToUnblock = await UserModel.find({
// //             isWithdrawalBlocked: true,
// //             withdrawalBlockedUntil: { $lte: now },
// //         });

// //         if (usersToUnblock.length > 0) {
// //             for (const user of usersToUnblock) {
// //                 user.isWithdrawalBlocked = false; //                 user.withdrawalBlockedUntil = null;
// //                 await user.save();
// //                 console.log(`✅ Unblocked user: ${user.uuid}`);
// //             }
// //         } else {
// //             console.log("No users to unblock.");
// //         }
// //     } catch (error) {
// //         console.error("❌ Error in unblock cron:", error);
// //     }
// // });

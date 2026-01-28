// import UserModel from "../models/user.model.js";

// export const resetUsersByTimezone = async () => {
//   try {
//     const users = await UserModel.find(
//       {},
//       "_id todayTradeCount dailyRoi lastTradeDate aiAgentDaily additionalAiAgentDailyIncome",
//     );
//     let resetCount = 0;
//     for (let user of users) {
//       user.dailyRoi = 0;
//       user.aiAgentDaily = 0;
//       user.todayLevelIncome = 0;
//       user.todayAdditionalWalletReward = 0;
//       user.todayMainWalletRewards = 0;
//       user.additionalAiAgentDailyIncome = 0;
//       await user.save();
//       resetCount++;
//     }
//     return resetCount;
//   } catch (err) {
//     console.error("❌ Error in resetUsersByTimezone:", err.message);
//     return 0;
//   }
// };

import ResetConfig from "../models/resetConfig.model.js";
import UserModel from "../models/user.model.js";
import moment from "moment-timezone";

// export const resetUsersByTimezone = async () => {
//   try {
//     console.log("🔁 Running resetUsersByTimezone...");
//     const result = await UserModel.updateMany(
//       {},
//       {
//         $set: {
//           dailyRoi: 0,
//           aiAgentDaily: 0,
//           todayLevelIncome: 0,
//           todayAdditionalWalletReward: 0,
//           todayMainWalletRewards: 0,
//           additionalAiAgentDailyIncome: 0,
//         },
//       },
//     );
//     console.log(result.modifiedCount);
//     return result.modifiedCount;
//   } catch (err) {
//     console.error("❌ Error in resetUsersByTimezone:", err.message);
//     return 0;
//   }
// };

// export const resetUsersDaily4AMWindow = async () => {
//   const now = moment().tz("Asia/Kolkata");

//   const today = now.format("YYYY-MM-DD");
//   const hour = now.hour();
//   const minute = now.minute();

//   if (!(hour === 4 && minute >= 0 && minute <= 10)) {
//     return;
//   }

//   // 🔒 ATOMIC CHECK + SET
//   const lock = await ResetConfig.findOneAndUpdate(
//     {
//       key: "DAILY_4AM_RESET",
//       lastResetDate: { $ne: today },
//     },
//     {
//       $set: { lastResetDate: today },
//     },
//     {
//       upsert: true,
//       new: true,
//     },
//   );

//   // ❌ agar null aaya = already reset ho chuka
//   if (lock === null) {
//     return;
//   }

//   console.log("🔁 Running DAILY RESET (4AM window)...");

//   const result = await UserModel.updateMany(
//     {},
//     {
//       $set: {
//         dailyRoi: 0,
//         aiAgentDaily: 0,
//         todayLevelIncome: 0,
//         todayAdditionalWalletReward: 0,
//         todayMainWalletRewards: 0,
//         additionalAiAgentDailyIncome: 0,
//       },
//     },
//   );

//   console.log("✅ Daily reset done:", result.modifiedCount);
// };

export const resetUsersDaily4AM = async () => {
  try {
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("YYYY-MM-DD");

    console.log("⏰ Cron hit at:", now.format());

    const lock = await ResetConfig.findOneAndUpdate(
      {
        key: "DAILY_4AM_RESET",
        lastResetDate: { $ne: today },
      },
      {
        $set: { lastResetDate: today },
      },
      { new: true },
    );

    if (!lock) {
      console.log("⛔ Already reset today");
      return;
    }

    console.log("🔁 Running DAILY RESET (4 AM IST)...");

    const result = await UserModel.updateMany(
      {},
      {
        $set: {
          dailyRoi: 0,
          aiAgentDaily: 0,
          todayLevelIncome: 0,
          todayAdditionalWalletReward: 0,
          todayMainWalletRewards: 0,
          additionalAiAgentDailyIncome: 0,
        },
      },
    );

    console.log("✅ Daily reset done. Modified users:", result.modifiedCount);
  } catch (error) {
    console.error("❌ Daily 4AM Reset Error:", error);
  }
};

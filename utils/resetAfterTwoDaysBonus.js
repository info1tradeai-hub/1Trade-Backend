// import UserModel from "../models/user.model.js";
// import Investment from "../models/investment.model.js";
// import { v4 as uuidv4 } from "uuid";

// export const resetBonusAfter2Days = async () => {
//   try {
//     const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

//     const usersToReset = await UserModel.find({
//       bonusAddedAt: { $lte: twoDaysAgo },
//       BonusCredit: { $gt: 0 },
//     });

//     if (!usersToReset.length) return;

//     await UserModel.updateMany(
//       { _id: { $in: usersToReset.map((u) => u._id) } },
//       { $set: { BonusCredit: 0 } }
//     );

//     const investmentEntries = usersToReset.map((user) => ({
//       userId: user._id,
//       walletAddress: "default-bonus-wallet",
//       type: "Trial Amount",
//       investmentAmount: -200,
//       txResponse: `BONUS-RESET-${uuidv4()}`,
//     }));

//     await Investment.insertMany(investmentEntries);

//     console.log(
//       `✅ Bonus reset (-200) and history added for ${usersToReset.length} users.`
//     );
//   } catch (error) {
//     console.error("❌ Error resetting bonus:", error.message);
//   }
// };

import UserModel from "../models/user.model.js";
import Investment from "../models/investment.model.js";
import { v4 as uuidv4 } from "uuid";

export const resetBonusAfter2Days = async () => {
  try {
    const now = new Date();

    const usersToReset = await UserModel.find({
      BonusCredit: { $gt: 0 },
    });

    if (!usersToReset.length) return;

    const usersForReset = usersToReset.filter((user) => {
      const bonusTime = new Date(user.bonusAddedAt);
      const resetTime = new Date(bonusTime.getTime() + 48 * 60 * 60 * 1000);
      return now >= resetTime; 
    });

    if (!usersForReset.length) return;

    await UserModel.updateMany(
      { _id: { $in: usersForReset.map((u) => u._id) } },
      { $set: { BonusCredit: 0 } }
    );

    const investmentEntries = usersForReset.map((user) => ({
      userId: user._id,
      walletAddress: "default-bonus-wallet",
      type: "Trial Amount",
      investmentAmount: -200,
      txResponse: `BONUS-RESET-${uuidv4()}`,
      investmentDate: new Date(),
    }));

    await Investment.insertMany(investmentEntries);

    console.log(
      `✅ Bonus reset (-200) and history added for ${usersForReset.length} users.`
    );
  } catch (error) {
    console.error("❌ Error resetting bonus:", error.message);
  }
};

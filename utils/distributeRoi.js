import Investment from "../models/investment.model.js";
import UserModel from "../models/user.model.js";
import { calculateTeams } from "./calculateTeam.js";
import RoiLevel from "../models/roiLevel.model.js";
import Roi from "../models/roi.model.js";
import { distributeCommissions } from "./distributeLevelIncomeUpto6LevelBasedOnRoiORAnyIncome.js";

const getRoiPercentageByInvestment = (amount) => {
  if (amount >= 500) return 4;
  if (amount >= 200) return 2;
  if (amount >= 100) return 1;
  if (amount >= 20) return 0.5;
  return 0; // 20 se kam pe ROI hi nahi
};

export const distributeRoi = async () => {
  try {
    const allUsers = await UserModel.find({});

    for (const user of allUsers) {
      const investments = await Investment.find({ userId: user._id });

      if (investments.length === 0) {
        continue;
      }

      const totalInvestmentAmount = investments.reduce(
        (sum, inv) => sum + inv.investmentAmount,
        0
      );

      const { teamA, teamB, teamC } = await calculateTeams(user._id);
      // console.log("👥 Team A:", teamA.length);
      // console.log("👥 Team B:", teamB.length);
      // console.log("👥 Team C:", teamC.length);

      const teamACount = teamA.length;
      const teamBAndCCount = teamB.length + teamC.length;

      const roiLevels = await RoiLevel.find({});
      // console.log("📈 ROI Levels found:", roiLevels.length);

      const eligibleLevels = roiLevels.filter(
        (level) =>
          totalInvestmentAmount >= level.minInvestment &&
          totalInvestmentAmount <= level.maxInvestment &&
          teamACount >= level.teamA &&
          teamBAndCCount >= level.teamBAndC
      );

      // console.log("✅ Eligible ROI Levels:", eligibleLevels.length);

      const applicableLevel = eligibleLevels.length
        ? eligibleLevels[eligibleLevels.length - 1]
        : roiLevels[0];

      // console.log("📌 Applicable Level:", applicableLevel);

      const roiPercentage = applicableLevel.roi;
      const baseAmount = totalInvestmentAmount + user.totalRoi;
      const dailyRoi = (baseAmount * roiPercentage) / 100;

      // console.log("💸 Calculated daily ROI:", dailyRoi);

      const roiEntry = new Roi({
        userId: user._id,
        roiAmount: dailyRoi,
        dayCount: 0,
        investment: totalInvestmentAmount,
        percentage: roiPercentage,
      });

      await roiEntry.save();
      // console.log("📝 ROI entry saved.");

      if (user.level < applicableLevel.level) {
        user.level = applicableLevel.level;
        // console.log("📶 User level updated to:", applicableLevel.level);
      }

      await user.save();
      // console.log("✅ User saved.");

      await distributeCommissions(user, dailyRoi);
      // console.log("💰 Commissions distributed.\n");
    }

    return {
      success: true,
      message: "ROI and Commission Distributed Successfully",
    };
  } catch (error) {
    // console.error("❌ distributeRoi error:", error.message);
    throw new Error(error.message || "Server Error");
  }
};

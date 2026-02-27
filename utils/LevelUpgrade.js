import AiAgentInvestment from "../models/AIAGENTINVESTMENT.model.js";
import LevelRequirementSchema from "../models/LevelrequirementSchema.model.js";
import ReferralTradeCredit from "../models/referralandtradecredit.model.js";
import UserModel from "../models/user.model.js";
import { calculateTeams } from "./calculateTeam.js";
import { sendLevelNotification } from "./sendLevelNotification.js";

const upgradeMessage = (user, newLevel) => `
  <h2>🎉 Congratulations, ${user.name || "User"}! 🎉</h2>
  <p>We are excited to inform you that your account has been <strong>upgraded</strong> to <strong>Level ${newLevel}</strong>.</p>
  <p>Keep up the great work and continue to earn AI credits and grow your team!</p>
  <br/>
  <p><strong>New AI Credits balance:</strong> ${user.aiCredits}</p>
  <p>If you have any questions, feel free to reach out to our support team.</p>
  <br/>
  <p>Best regards,<br/>The Team</p>
`;
const downgradeMessage = (user, newLevel) => `
  <h2>⚠️ Important Notice, ${user.name || "User"} ⚠️</h2>
  <p>We want to inform you that your account has been <strong>downgraded</strong> to <strong>Level ${newLevel}</strong>.</p>
  <p>This happened because some requirements were not met, such as AI credits, investments, or team activity.</p>
  <p>Please review your account and take action to regain your previous level.</p>
  <br/>
  <p>If you need assistance, our support team is here to help.</p>
  <br/>
  <p>Best wishes,<br/>The Team</p>
`;

export const runLevelUpgrades = async () => {
  // console.log("🔄 Running direct level upgrades...");
  const now = new Date();
  const users = await UserModel.find({});
  const requirements = await LevelRequirementSchema.find({});

  for (const user of users) {
    let currentLevel = user.level || 0;
    const maxLevel = Math.max(...requirements.map((r) => r.level));
    let finalLevel = currentLevel;

    while (finalLevel < maxLevel) {
      const nextLevel = finalLevel + 1;
      const req = requirements.find((r) => r.level === nextLevel);
      if (!req) break;

      const totalIncome = Number(user.mainWallet || 0);
      if (totalIncome < req.invest) break;
      const haveCredits = user.aiCredits || 0;
      if (haveCredits < req.aiCredits) break;

      if (req.timelineDays > 0 && user.lastUpgradeAt) {
        const windowEnd = new Date(
          user.lastUpgradeAt.getTime() + req.timelineDays * 24 * 60 * 60 * 1000,
        );
        if (now > windowEnd) break;
      }

      const { teamA, teamB, teamC } = await calculateTeams(user._id);

      const validTeamA = teamA.filter(
        (member) => member.isVerified && member.mainWallet >= 50,
      ).length;

      const validTeamBC = [...teamB, ...teamC].filter(
        (member) => member.isVerified && member.mainWallet >= 50,
      ).length;

      if (validTeamA < req.activeA || validTeamBC < req.activeBC) break;

      switch (nextLevel) {
        case 1:
          if (!user.LevelOneUpgraded) {
            user.LevelOnePopup = true;
            user.LevelOneUpgraded = true;
          }

          // console.log(
          //   `Checking sponsor credit for user ${user._id} → sponsorId: ${user.sponsorId}, user credit flag: ${user.isLevelOneMemberValidAiCredit}`
          // );

          const aiCreditRecord = await ReferralTradeCredit.findOne();
          console.log(aiCreditRecord.referralCredit, "aicredit");
          const aiCreditValue = aiCreditRecord
            ? aiCreditRecord.referralCredit || 0
            : 0;
          const updatedUser = await UserModel.findOneAndUpdate(
            { _id: user._id, isLevelOneMemberValidAiCredit: { $ne: true } },
            { $set: { isLevelOneMemberValidAiCredit: true } },
            { new: true },
          );

          if (user.sponsorId && updatedUser) {
            const sponsor = await UserModel.findById(user.sponsorId);

            if (sponsor && sponsor.level >= 0 && sponsor.level <= 6) {
              sponsor.aiCredits =
                (sponsor.aiCredits || 0) + (aiCreditValue || 4);
              await sponsor.save();

              // console.log(
              //   `✅ Sponsor ${sponsor._id} ko ${
              //     aiCreditValue || 4
              //   } AI credit mila user ${user._id} ke level 1 upgrade ke liye`
              // );
            } else if (!sponsor) {
              // console.log(`❌ Sponsor not found for user ${user._id}`);
            } else {
              // console.log(
              //   `Sponsor ${sponsor._id} ka level ${sponsor.level} hai (AI credit nahi milega)`
              // );
            }
          } else {
            // console.log(
            //   `❌ User ${user._id} ka flag already true hai, dobara sponsor ko AI credit nahi milega`
            // );
          }
          break;

          break;

        case 2:
          if (!user.LevelTwoUpgraded) user.LevelTwoPopup = true;
          user.LevelTwoUpgraded = true;
          break;

        case 3:
          if (!user.LevelThreeUpgraded) user.LevelThreePopup = true;
          user.LevelThreeUpgraded = true;
          break;

        case 4:
          if (!user.LevelFourUpgraded) user.LevelFourPopup = true;
          user.LevelFourUpgraded = true;
          break;

        case 5:
          if (!user.LevelFiveUpgraded) user.LevelFivePopup = true;
          user.LevelFiveUpgraded = true;
          break;

        case 6:
          if (!user.LevelSixUpgraded) user.LevelSixPopup = true;
          user.LevelSixUpgraded = true;
          break;
      }

      finalLevel = nextLevel;
    }

    // --- Final save if upgraded ---
    if (finalLevel > currentLevel) {
      // console.log(
      //   `✅ Upgrading User ${user._id} from Level ${currentLevel} → ${finalLevel}`
      // );
      if (currentLevel === 0 && finalLevel >= 1 && !user.isActivatedOnce) {
        user.activeDate = new Date();
        user.isActivatedOnce = true;
      }
      user.maxLevelAchieved = Math.max(user.maxLevelAchieved || 0, finalLevel);

      user.level = finalLevel;
      user.lastUpgradeAt = now;
      // user.todayTradeCount = 0;
      user.isVerified = true;
      user.levelUpgradeDate = new Date();
      user.tradeLocked = false;
      user.tradeLockUntil = null;

      await user.save();
    }
  }
};

export const runLevelDowngrades = async () => {
  console.log("🔄 Running level downgrades...");
  const users = await UserModel.find({});
  const requirements = await LevelRequirementSchema.find({});
  const now = new Date();

  for (const user of users) {
    const activeAgentsCount = await AiAgentInvestment.countDocuments({
      userId: user._id,
      isActive: true,
    });

    if (activeAgentsCount > 0) {
      console.log(`⏩ Skipping downgrade for ${user._id} (AI agent active)`);
      continue;
    }

    let currentLevel = user.level || 0;
    if (user.isTrading) {
      console.log(`⏩ Skipping downgrade for ${user._id} (Trading active)`);
      continue;
    }
    if (currentLevel === 0) continue;

    let finalLevel = 0;

    for (let lvl = currentLevel; lvl > 0; lvl--) {
      const req = requirements.find((r) => r.level === lvl);
      if (!req) continue;

      const totalIncome = user.mainWallet || 0;
      const investFail = totalIncome < req.invest;

      const aiCredits = user.aiCredits || 0;
      const aiFail = aiCredits < req.aiCredits;

      const { teamA, teamB, teamC } = await calculateTeams(user._id);

      const validTeamA = teamA.filter(
        (m) => m.isVerified && m.mainWallet >= 50,
      ).length;
      const validTeamBC =
        teamB.filter((m) => m.isVerified && m.mainWallet >= 50).length +
        teamC.filter((m) => m.isVerified && m.mainWallet >= 50).length;

      const teamAFail = validTeamA < req.activeA;
      const teamBCFail = validTeamBC < req.activeBC;

      if (!(investFail || aiFail || teamAFail || teamBCFail)) {
        finalLevel = lvl;
        break;
      }
    }

    if (finalLevel !== currentLevel) {
      console.log(
        `❌ Downgrading User ${user._id} from Level ${currentLevel} → ${finalLevel}`,
      );
      user.level = finalLevel;
      user.levelDwongradedAt = now;
      user.tradeLocked = true;
      user.lastDowngradedFrom = currentLevel;
      user.tradeLockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await user.save();
    }
  }
};

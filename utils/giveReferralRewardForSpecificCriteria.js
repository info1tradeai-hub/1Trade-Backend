import AdminReferralRewardSlab from "../models/AdminReferralRewardSlab.model.js";
import UserModel from "../models/user.model.js";
import UserRewardModel from "../models/userReward.model.js";
import Investment from "../models/investment.model.js";

const batchSize = 50;

const processReferralRewardsBatch = async (usersBatch, allSlabs) => {
  for (const user of usersBatch) {
    const previousRewards = await UserRewardModel.find({
      userId: user._id,
      type: "referral",
      isApplied: true,
    });

    const rewardedMap = {};
    previousRewards.forEach((reward) => {
      const slabIdStr = reward.slabId.toString();
      if (!rewardedMap[slabIdStr]) {
        rewardedMap[slabIdStr] = new Set();
      }
      reward.contributors.forEach((id) =>
        rewardedMap[slabIdStr].add(id.toString())
      );
    });

    for (const slab of allSlabs) {
      const slabIdStr = slab._id.toString();
      const alreadyRewarded = rewardedMap[slabIdStr] || new Set();

      let newEligibleUsers = [];

      for (const refUser of user.referedUsers) {
        const deposits = await Investment.aggregate([
          {
            $match: {
              userId: refUser._id,
              type: "Deposit",
              investmentDate: { $gte: new Date(slab.createdAt) },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$investmentAmount" },
            },
          },
        ]);

        const totalDeposit = deposits.length > 0 ? deposits[0].total : 0;

        if (
          totalDeposit >= slab.investmentAmount &&
          !alreadyRewarded.has(refUser._id.toString()) &&
          refUser.isReferralGet === true
        ) {
          newEligibleUsers.push(refUser);
        }
      }

      // ✅ reward calculation
      while (newEligibleUsers.length >= slab.referralsRequired) {
        const contributorsForReward = newEligibleUsers.splice(
          0,
          slab.referralsRequired
        );

        const rewardAmount = slab.rewardAmount;

        const exists = await UserRewardModel.findOne({
          userId: user._id,
          slabId: slab._id,
          type: "referral",
          contributors: { $all: contributorsForReward.map((u) => u._id) },
        });

        if (exists) {
          console.log(
            `⛔ Reward already exists for user ${user._id}, skipping...`
          );
          continue;
        }

        user.mainWallet += rewardAmount;
        user.mainRewards += rewardAmount;
        user.todayMainWalletRewards += rewardAmount;
        await user.save();

        // console.log(
        //   `💳 Wallet updated for user ${user._id}: ${user.mainWallet}`
        // );

        await UserRewardModel.create({
          userId: user._id,
          amount: rewardAmount,
          contributors: contributorsForReward.map((u) => u._id),
          message: `Reward of $${rewardAmount} for ${contributorsForReward.length} referrals with deposit $${slab.investmentAmount}`,
          type: "referral",
          slabId: slab._id,
          isApplied: true,
        });

        // console.log(`🏆 Reward history created for user ${user._id}`);

        if (!rewardedMap[slabIdStr]) rewardedMap[slabIdStr] = new Set();
        contributorsForReward.forEach((u) =>
          rewardedMap[slabIdStr].add(u._id.toString())
        );
      }
    }
  }
};

export const processReferralRewardsForAllUsers = async () => {
  try {
    const allSlabs = await AdminReferralRewardSlab.find().sort({
      referralsRequired: -1,
      investmentAmount: -1,
    });

    if (
      allSlabs.length === 0 ||
      (allSlabs.length === 1 &&
        allSlabs[0].investmentAmount === 0 &&
        allSlabs[0].referralsRequired === 0 &&
        allSlabs[0].rewardAmount === 0)
    ) {
      console.log(
        "🚫 Referral rewards system is disabled (0 0 0 slab). Skipping..."
      );
      return;
    }

    const totalUsers = await UserModel.countDocuments();

    for (let i = 0; i < totalUsers; i += batchSize) {
      const usersBatch = await UserModel.find()
        .skip(i)
        .limit(batchSize)
        .populate("referedUsers");

      await processReferralRewardsBatch(usersBatch, allSlabs);
    }
  } catch (error) {
    console.error("❌ Error in processReferralRewardsForAllUsers:", error);
  }
};

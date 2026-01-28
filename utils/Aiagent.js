import AiAgentInvestment from "../models/AIAGENTINVESTMENT.model.js";
import AIAgentPlan from "../models/AIAgentPlan.model.js";
import AiAgentHistory from "../models/AiAgentRoi.model.js";
import UserModel from "../models/user.model.js";

// export const AiAgentRoi = async () => {
//     try {
//         const now = new Date();
//         const allInvestment = await AiAgentInvestment.find({});

//         if (!allInvestment.length) {
//             // console.log("⚠️ No active investments found.");
//             return;
//         }

//         for (const investment of allInvestment) {
//             const {
//                 _id,
//                 userId,
//                 investedAmount,
//                 expectedReturn,
//                 investedAt,
//                 maturityDate,
//                 isMatured,
//             } = investment;

//             const investedDate = new Date(investedAt);
//             const maturity = new Date(maturityDate);

//             const totalDuration = Math.ceil((maturity - investedDate) / (1000 * 60 * 60 * 24));
//             if (totalDuration <= 0) {
//                 continue;
//             }

//             const dailyROI = (Number(expectedReturn) - Number(investedAmount)) / totalDuration;

//             const creditedDays = await AiAgentHistory.countDocuments({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             });

//             const user = await UserModel.findById(userId);
//             if (!user) {
//                 // console.error(`❌ User ${userId} not found for investment ${_id}. Skipping.`);
//                 continue;
//             }

//             const isMaturedOrPast = now >= maturity;
//             const isFullyCredited = creditedDays >= totalDuration;

//             if (isMaturedOrPast && !isMatured && !isFullyCredited) {
//                 const remainingDays = totalDuration - creditedDays;
//                 const remainingROI = remainingDays * dailyROI;
//                 const totalToAdd = Number(remainingROI) + Number(investedAmount);
//                 await UserModel.findByIdAndUpdate(userId, {
//                     $inc: { aiAgentTotal: totalToAdd },
//                     $set: { aiAgentDaily: dailyROI },
//                 });

//                 if (remainingROI > 0) {
//                     await AiAgentHistory.create({
//                         investmentId: _id,
//                         userId,
//                         actionType: "ROI_CREDITED",
//                         amount: remainingROI,
//                     });
//                 }

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "INVESTMENT_MATURED",
//                     amount: investedAmount,
//                 });

//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     isMatured: true,
//                     maturedAt: now,
//                 });

//                 // console.log(`✅ Final ROI + Invested Amount added for investment ${_id}`);
//                 continue;
//             }

//             if (isFullyCredited || isMaturedOrPast) {
//                 if (!isMatured) {
//                     await AiAgentInvestment.findByIdAndUpdate(_id, { isMatured: true });
//                 }
//                 // console.log(`ℹ️ Investment ${_id} matured or fully credited.`);
//                 continue;
//             }

//             await UserModel.findByIdAndUpdate(userId, {
//                 $inc: { aiAgentTotal: dailyROI },
//                 $set: { aiAgentDaily: dailyROI },
//             });

//             await AiAgentHistory.create({
//                 investmentId: _id,
//                 userId,
//                 actionType: "ROI_CREDITED",
//                 amount: dailyROI,
//             });

//             // console.log(
//             //     `🟢 Daily ROI ${dailyROI.toFixed(2)} credited to user ${userId} (Day ${creditedDays + 1}/${totalDuration})`
//             // );
//         }

//         // console.log("🎉 Daily ROI calculation complete ✅");
//     } catch (error) {
//         // console.error("❌ Error in AiAgentRoi:", error.message);
//     }
// };

// export const AiAgentRoi = async () => {
//     try {
//         const now = new Date();
//         const allInvestment = await AiAgentInvestment.find({});

//         if (!allInvestment.length) return;

//         for (const investment of allInvestment) {
//             const {
//                 _id,
//                 userId,
//                 investedAmount,
//                 expectedReturn,
//                 investedAt,
//                 maturityDate,
//                 isMatured,
//             } = investment;

//             const investedDate = new Date(investedAt);
//             const maturity = new Date(maturityDate);
//             const totalDuration = Math.ceil((maturity - investedDate) / (1000 * 60 * 60 * 24));

//             if (totalDuration <= 0) continue;

//             const dailyTotalReturn = Number(expectedReturn) / totalDuration;

//             const creditedDays = await AiAgentHistory.countDocuments({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             });

//             const user = await UserModel.findById(userId);
//             if (!user) continue;

//             const isMaturedOrPast = now >= maturity;
//             const isFullyCredited = creditedDays >= totalDuration;

//             if (isMaturedOrPast && !isMatured && !isFullyCredited) {
//                 const remainingDays = totalDuration - creditedDays;
//                 const remainingAmount = remainingDays * dailyTotalReturn;

//                 await UserModel.findByIdAndUpdate(userId, {
//                     $inc: { aiAgentTotal: remainingAmount },
//                     $set: { aiAgentDaily: dailyTotalReturn },
//                 });

//                 if (remainingAmount > 0) {
//                     await AiAgentHistory.create({
//                         investmentId: _id,
//                         userId,
//                         actionType: "ROI_CREDITED",
//                         amount: remainingAmount,
//                     });
//                 }

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "INVESTMENT_MATURED",
//                     amount: Number(expectedReturn),
//                 });

//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     isMatured: true,
//                     maturedAt: now,
//                 });

//                 continue;
//             }

//             if (isFullyCredited || isMaturedOrPast) {
//                 if (!isMatured) {
//                     await AiAgentInvestment.findByIdAndUpdate(_id, { isMatured: true });
//                 }
//                 continue;
//             }

//             await UserModel.findByIdAndUpdate(userId, {
//                 $inc: { aiAgentTotal: dailyTotalReturn },
//                 $set: { aiAgentDaily: dailyTotalReturn },
//             });

//             await AiAgentHistory.create({
//                 investmentId: _id,
//                 userId,
//                 actionType: "ROI_CREDITED",
//                 amount: dailyTotalReturn,
//             });
//         }
//     } catch (error) {
//         console.error("❌ Error in AiAgentRoi:", error.message);
//     }
// };

// export const AiAgentRoi = async () => {
//     try {
//         const now = new Date();
//         const allInvestment = await AiAgentInvestment.find({});

//         if (!allInvestment.length) return;

//         for (const investment of allInvestment) {
//             const {
//                 _id,
//                 userId,
//                 investedAmount,
//                 expectedReturn,
//                 investedAt,
//                 maturityDate,
//                 isMatured,
//             } = investment;

//             const investedDate = new Date(investedAt);
//             const maturity = new Date(maturityDate);
//             const totalDuration = Math.ceil((maturity - investedDate) / (1000 * 60 * 60 * 24));
//             if (totalDuration <= 0) continue;

//             const dailyTotalReturn = Number(expectedReturn) / totalDuration;

//             const creditedDays = await AiAgentHistory.countDocuments({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             });

//             const user = await UserModel.findById(userId);
//             if (!user) continue;

//             const isMaturedOrPast = now >= maturity;
//             const isFullyCredited = creditedDays >= totalDuration;

//             // 🛡️ 24-hour Check
//             const lastRoi = await AiAgentHistory.findOne({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             }).sort({ createdAt: -1 });

//             if (lastRoi) {
//                 const diffInMs = now - new Date(lastRoi.createdAt);
//                 const diffInHours = diffInMs / (1000 * 60 * 60);
//                 if (diffInHours < 24) continue; // Skip if ROI was credited less than 24 hours ago
//             }

//             // 🧾 If matured, credit remaining and mark as matured
//             if (isMaturedOrPast && !isMatured && !isFullyCredited) {
//                 const remainingDays = totalDuration - creditedDays;
//                 const remainingAmount = remainingDays * dailyTotalReturn;

//                 await UserModel.findByIdAndUpdate(userId, {
//                     $inc: { aiAgentTotal: remainingAmount },
//                     $set: { aiAgentDaily: dailyTotalReturn },
//                 });

//                 if (remainingAmount > 0) {
//                     await AiAgentHistory.create({
//                         investmentId: _id,
//                         userId,
//                         actionType: "ROI_CREDITED",
//                         amount: remainingAmount,
//                     });
//                 }

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "INVESTMENT_MATURED",
//                     amount: Number(expectedReturn),
//                 });

//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     isMatured: true,
//                     maturedAt: now,
//                 });

//                 continue;
//             }

//             // 🧾 If already matured or fully credited
//             if (isFullyCredited || isMaturedOrPast) {
//                 if (!isMatured) {
//                     await AiAgentInvestment.findByIdAndUpdate(_id, { isMatured: true });
//                 }
//                 continue;
//             }

//             await UserModel.findByIdAndUpdate(userId, {
//                 $inc: { aiAgentTotal: dailyTotalReturn },
//                 $set: { aiAgentDaily: dailyTotalReturn },
//             });

//             await AiAgentHistory.create({
//                 investmentId: _id,
//                 userId,
//                 actionType: "ROI_CREDITED",
//                 amount: dailyTotalReturn,
//             });
//         }
//     } catch (error) {
//         console.error("❌ Error in AiAgentRoi:", error.message);
//     }
// };

// export const AiAgentRoi = async () => {
//     try {
//         const now = new Date();
//         const allInvestments = await AiAgentInvestment.find({});

//         if (!allInvestments.length) return;

//         for (const investment of allInvestments) {
//             const {
//                 _id,
//                 userId,
//                 expectedReturn,
//                 investedAt,
//                 maturityDate
//             } = investment;

//             const investedDate = new Date(investedAt);
//             const maturity = new Date(maturityDate);

//             const totalDuration = Math.ceil((maturity - investedDate) / (1000 * 60 * 60 * 24));
//             if (totalDuration <= 0) continue;

//             const dailyTotalReturn = Number(expectedReturn) / totalDuration;

//             const creditedDays = await AiAgentHistory.countDocuments({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             });

//             const isMaturedOrPast = now >= maturity;
//             const isFullyCredited = creditedDays >= totalDuration;

//             const lastRoi = await AiAgentHistory.findOne({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             }).sort({ createdAt: -1 });

//             if (lastRoi) {
//                 const hoursSinceLast = (now - new Date(lastRoi.createdAt)) / (1000 * 60 * 60);
//                 if (hoursSinceLast < 24) continue;
//             }

//             if (isMaturedOrPast && !isFullyCredited) {
//                 const remainingDays = totalDuration - creditedDays;
//                 const remainingAmount = remainingDays * dailyTotalReturn;

//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     $set: {
//                         dailyProfit: dailyTotalReturn,
//                         isMatured: true,
//                         maturedAt: now,
//                     },
//                     $inc: {
//                         totalProfit: remainingAmount,
//                     },
//                 });

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "ROI_CREDITED",
//                     amount: remainingAmount,
//                 });

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "INVESTMENT_MATURED",
//                     amount: Number(expectedReturn),
//                 });

//                 await UserModel.findByIdAndUpdate(userId, {
//                     $set: {
//                         aiAgentDaily: 0,
//                     },
//                     $inc: {
//                         aiAgentTotal: remainingAmount,
//                     },
//                 });

//                 continue;
//             }

//             // ✅ Daily ROI (if not fully credited and not matured)
//             if (!isFullyCredited) {
//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     $set: {
//                         dailyProfit: dailyTotalReturn,
//                     },
//                     $inc: {
//                         totalProfit: dailyTotalReturn,
//                     },
//                 });

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "ROI_CREDITED",
//                     amount: dailyTotalReturn,
//                 });

//                 await UserModel.findByIdAndUpdate(userId, {
//                     $inc: {
//                         aiAgentDaily: dailyTotalReturn,
//                         aiAgentTotal: dailyTotalReturn,
//                     },
//                 });
//             }

//             if (isMaturedOrPast) {
//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     isMatured: true,
//                     maturedAt: now,
//                 });
//             }
//         }
//     } catch (error) {
//         console.error("❌ Error in AiAgentRoi:", error.message);
//     }
// };

// export const AiAgentRoi = async () => {
//     try {
//         const now = new Date();
//         const allInvestments = await AiAgentInvestment.find({});

//         if (!allInvestments.length) {
//             console.log("🚫 No AI Agent investments found.");
//             return;
//         }

//         for (const investment of allInvestments) {
//             const {
//                 _id,
//                 userId,
//                 investedAmount,
//                 plan,
//                 investedAt,
//                 maturityDate,
//                 isMatured,
//                 walletType,
//             } = investment;

//             // Get plan details
//             const planDetails = await AIAgentPlan.findById(plan);
//             if (!planDetails) {
//                 console.log(`❌ Plan not found for investment ${_id}`);
//                 continue;
//             }

//             const { incomePercent, durationInDays } = planDetails;

//             const dailyROI = (investedAmount * incomePercent) / 100;

//             const creditedDays = await AiAgentHistory.countDocuments({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             });

//             const totalDuration = durationInDays;
//             const isFullyCredited = creditedDays >= totalDuration;
//             const maturity = new Date(maturityDate);
//             const isMaturedOrPast = now >= maturity;

//             const lastRoi = await AiAgentHistory.findOne({
//                 investmentId: _id,
//                 actionType: "ROI_CREDITED",
//             }).sort({ createdAt: -1 });

//             if (lastRoi) {
//                 const hoursSinceLast = (now - new Date(lastRoi.createdAt)) / (1000 * 60 * 60);
//                 if (hoursSinceLast < 24) {
//                     console.log(`⏱ Skipping investment ${_id} for user ${userId} — credited ${hoursSinceLast.toFixed(2)} hrs ago`);
//                     continue;
//                 }
//             }

//             const user = await UserModel.findById(userId);
//             if (!user) {
//                 console.log(`❌ User not found for investment ${_id}`);
//                 continue;
//             }

//             // ✅ Credit Daily ROI
//             if (!isFullyCredited) {
//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     $set: { dailyProfit: dailyROI },
//                     $inc: { totalProfit: dailyROI },
//                 });

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "ROI_CREDITED",
//                     amount: dailyROI,
//                 });

//                 await UserModel.findByIdAndUpdate(userId, {
//                     $inc: {
//                         aiAgentDaily: dailyROI,
//                         aiAgentTotal: dailyROI,
//                     },
//                 });

//                 console.log(`💰 Credited ₹${dailyROI.toFixed(2)} to user ${userId} [ROI]`);
//             }

//             if (isMaturedOrPast && !isMatured) {
//                 if (walletType === "mainWallet") {
//                     user.mainWallet += investedAmount;
//                 } else if (walletType === "additionalWallet") {
//                     user.additionalWallet += investedAmount;
//                 }

//                 await user.save();

//                 await AiAgentInvestment.findByIdAndUpdate(_id, {
//                     isMatured: true,
//                     maturedAt: now,
//                 });

//                 await AiAgentHistory.create({
//                     investmentId: _id,
//                     userId,
//                     actionType: "INVESTMENT_MATURED",
//                     amount: investedAmount,
//                 });

//                 console.log(`🎯 Returned ₹${investedAmount} to ${walletType} of user ${userId} [Matured]`);
//             }
//         }

//         console.log("✅ AiAgentRoi job completed.");
//     } catch (error) {
//         console.error("❌ Error in AiAgentRoi:", error.message);
//     }
// };

// export const AiAgentRoi = async () => {
//   try {
//     const now = new Date();
//     const allInvestments = await AiAgentInvestment.find({});

//     if (!allInvestments.length) {
//       // console.log("🚫 No AI Agent investments found.");
//       return;
//     }

//     for (const investment of allInvestments) {
//       const { _id, userId, investedAmount, plan, isMatured } = investment;

//       const planDetails = await AIAgentPlan.findById(plan);
//       if (!planDetails) continue;

//       const { incomePercent, durationInDays } = planDetails;
//       const dailyROI = (investedAmount * incomePercent) / 100;

//       const creditedDays = await AiAgentHistory.countDocuments({
//         investmentId: _id,
//         actionType: "ROI_CREDITED",
//       });

//       const user = await UserModel.findById(userId);
//       if (!user) continue;

//       // ⏱ Stop if already max ROI given
//       if (creditedDays >= durationInDays) {
//         if (!isMatured) {
//           await AiAgentInvestment.findByIdAndUpdate(_id, {
//             isMatured: true,
//             maturedAt: now,
//           });

//           await AiAgentHistory.create({
//             investmentId: _id,
//             userId,
//             actionType: "INVESTMENT_MATURED",
//             amount: investedAmount,
//           });

//           console.log(`🎯 Marked matured: Investment ${_id} of user ${userId}`);
//         }
//         continue;
//       }

//       // ⏱ Prevent multiple credits within same day (based on 24 hr)
//       const lastRoi = await AiAgentHistory.findOne({
//         investmentId: _id,
//         actionType: "ROI_CREDITED",
//       }).sort({ createdAt: -1 });

//       if (lastRoi) {
//         const hoursSinceLast =
//           (now - new Date(lastRoi.createdAt)) / (1000 * 60 * 60);
//         if (hoursSinceLast < 24) {
//           console.log(
//             `⏱ Skipping ROI for ${_id} — credited ${hoursSinceLast.toFixed(
//               2
//             )} hrs ago`
//           );
//           continue;
//         }
//       }

//       await AiAgentInvestment.findByIdAndUpdate(_id, {
//         $set: { dailyProfit: dailyROI },
//         $inc: { totalProfit: dailyROI },
//       });

//       await AiAgentHistory.create({
//         investmentId: _id,
//         userId,
//         actionType: "ROI_CREDITED",
//         amount: dailyROI,
//       });

//       // await UserModel.findByIdAndUpdate(userId, {
//       //     $inc: {
//       //         aiAgentDaily: dailyROI,
//       //         aiAgentTotal: dailyROI,
//       //     },
//       // });

//       console.log(`💰 ROI $${dailyROI.toFixed(2)} credited to ${userId}`);

//       if (creditedDays === durationInDays) {
//         await AiAgentInvestment.findByIdAndUpdate(_id, {
//           isMatured: true,
//           maturedAt: now,
//         });

//         await AiAgentHistory.create({
//           investmentId: _id,
//           userId,
//           actionType: "INVESTMENT_MATURED",
//           amount: investedAmount,
//         });

//         console.log(
//           `🎯 Final ROI done. Marked matured: Investment ${_id} of user ${userId}`
//         );
//       }
//     }

//     // console.log("✅ AiAgentRoi job completed.");
//   } catch (error) {
//     console.error("❌ Error in AiAgentRoi:", error.message);
//   }
// };

import mongoose from "mongoose";

export const AiAgentRoi = async () => {
  const session = await mongoose.startSession();
  const now = new Date();

  try {
    session.startTransaction();

    // 1️⃣ Load all active investments only
    const investments = await AiAgentInvestment.find(
      { isActive: true },
      "_id userId investedAmount plan isMatured totalProfit"
    ).lean();

    if (!investments.length) return;

    // 2️⃣ Load all plans in one go
    const planIds = [...new Set(investments.map((i) => i.plan))];
    const plans = await AIAgentPlan.find(
      { _id: { $in: planIds } },
      "_id incomePercent durationInDays"
    ).lean();

    const planMap = new Map(plans.map((p) => [String(p._id), p]));

    for (const inv of investments) {
      const plan = planMap.get(String(inv.plan));
      if (!plan) continue;

      const dailyROI = (inv.investedAmount * plan.incomePercent) / 100;

      // 3️⃣ Last ROI (single indexed query)
      const lastRoi = await AiAgentHistory.findOne(
        {
          investmentId: inv._id,
          actionType: "ROI_CREDITED",
        },
        "createdAt"
      )
        .sort({ createdAt: -1 })
        .lean();

      if (lastRoi) {
        const diffHours = (now - new Date(lastRoi.createdAt)) / 36e5;
        if (diffHours < 24) continue;
      }

      // 4️ Count credited days (can be optimized further with field)
      const creditedDays = await AiAgentHistory.countDocuments({
        investmentId: inv._id,
        actionType: "ROI_CREDITED",
      });

      //  If fully completed → mature once
      if (creditedDays >= plan.durationInDays) {
        if (!inv.isMatured) {
          await AiAgentInvestment.updateOne(
            { _id: inv._id },
            { isMatured: true, maturedAt: now },
            { session }
          );

          await AiAgentHistory.create(
            [
              {
                investmentId: inv._id,
                userId: inv.userId,
                actionType: "INVESTMENT_MATURED",
                amount: inv.investedAmount,
              },
            ],
            { session }
          );
        }
        continue;
      }

      // 6️⃣ Credit ROI
      await AiAgentInvestment.updateOne(
        { _id: inv._id },
        {
          $inc: { totalProfit: dailyROI },
          $set: { dailyProfit: dailyROI },
        },
        { session }
      );

      await AiAgentHistory.create(
        [
          {
            investmentId: inv._id,
            userId: inv.userId,
            actionType: "ROI_CREDITED",
            amount: dailyROI,
          },
        ],
        { session }
      );

      // 7️⃣ If last day → mark matured
      if (creditedDays + 1 === plan.durationInDays) {
        await AiAgentInvestment.updateOne(
          { _id: inv._id },
          { isMatured: true, maturedAt: now },
          { session }
        );

        await AiAgentHistory.create(
          [
            {
              investmentId: inv._id,
              userId: inv.userId,
              actionType: "INVESTMENT_MATURED",
              amount: inv.investedAmount,
            },
          ],
          { session }
        );
      }
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ AiAgentRoi Error:", err);
  } finally {
    session.endSession();
  }
};

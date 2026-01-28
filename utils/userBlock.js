import UserModel from "../models/user.model.js";
import AiAgentInvestment from "../models/AIAGENTINVESTMENT.model.js";
import BlockConfig from "../models/BlockConfigsetting.model.js"; // admin-configurable days

// export const blockInactiveUsers = async () => {
//     try {
//         const config = await BlockConfig.findOne();
//         const inactiveDays = config?.inactiveDays || 4;

//         const thresholdDate = new Date();
//         thresholdDate.setDate(thresholdDate.getDate() - inactiveDays);

//         const activeInvestmentUsers = await AiAgentInvestment.distinct("userId", {
//             isActive: true
//         });

//         const result = await UserModel.updateMany(
//             {
//                 lastLoginDate: { $lte: thresholdDate },
//                 isLoginBlocked: false,
//                 _id: { $nin: activeInvestmentUsers },
//                 level: { $gte: 1 }
//             },
//             {
//                 $set: {
//                     isLoginBlocked: true,
//                     isLoginBlockedDate: new Date()
//                 }
//             }
//         );

//         console.log(
//             `${result.modifiedCount} users blocked due to inactivity >${inactiveDays} days (level >= 1).`
//         );
//     } catch (error) {
//         console.error("Error blocking inactive users:", error);
//     }
// };

// export const blockInactiveUsers = async () => {
//   try {
//     const config = await BlockConfig.findOne();
//     const inactiveDays = config?.inactiveDays || 4;

//     const thresholdDate = new Date();
//     thresholdDate.setDate(thresholdDate.getDate() - inactiveDays);

//     const activeInvestmentUsers = await AiAgentInvestment.distinct("userId", {
//       isActive: true,
//     });

//     const result = await UserModel.updateMany(
//       {
//         lastLoginDate: { $lte: thresholdDate },
//         isLoginBlocked: false,
//         _id: { $nin: activeInvestmentUsers },
//         level: { $gte: 1 },
//       },
//       {
//         $set: {
//           isLoginBlocked: true,
//           isLoginBlockedDate: new Date(),
//         },
//       }
//     );

//     console.log(
//       `${result.modifiedCount} users blocked due to inactivity >${inactiveDays} days (level >= 1).`
//     );
//   } catch (error) {
//     console.error("Error blocking inactive users:", error);
//   }
// };

export const blockInactiveUsers = async () => {
  try {
    const config = await BlockConfig.findOne();
    const inactiveDays = config?.inactiveDays || 4;

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - inactiveDays);

    const activeInvestmentUsers = await AiAgentInvestment.distinct("userId", {
      isActive: true,
    });

    const result = await UserModel.updateMany(
      {
        lastLoginDate: { $lte: thresholdDate },
        isLoginBlocked: false,
        isAdminLoginBlock: { $ne: true },
        _id: { $nin: activeInvestmentUsers },
        level: { $gte: 1 },
      },
      {
        $set: {
          isLoginBlocked: true,
          isLoginBlockedDate: new Date(),
        },
      }
    );

    console.log(
      `${result.modifiedCount} users blocked due to inactivity >${inactiveDays} days (level >= 1).`
    );
  } catch (error) {
    console.error("Error blocking inactive users:", error);
  }
};

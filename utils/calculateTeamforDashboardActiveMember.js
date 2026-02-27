// export const calculateTeamsforDashboard = async (userId, startDate = null, endDate = null) => {
//   try {
//     const user = await UserModel.findById(userId);
//     if (!user) throw new Error("User not found");

//     let dateFilter = {};
//     if (startDate && endDate) {
//       const start = moment(startDate).startOf('day').toDate();
//       const end = moment(endDate).endOf('day').toDate();
//       dateFilter.createdAt = { $gte: start, $lte: end };
//     }

//     // ✅ Team A: directly referred users who are verified
//     const teamA = await UserModel.find({
//       _id: { $in: user.referedUsers },
//       isVerified: true,
//       ...dateFilter
//     });

//     let teamB = [];
//     for (let a of teamA) {
//       const referredByA = await UserModel.find({
//         _id: { $in: a.referedUsers },
//         isVerified: true,
//         ...dateFilter
//       });
//       teamB.push(...referredByA);
//     }

//     let teamC = [];
//     for (let b of teamB) {
//       const referredByB = await UserModel.find({
//         _id: { $in: b.referedUsers },
//         isVerified: true,
//         ...dateFilter
//       });
//       teamC.push(...referredByB);
//     }

//     return {
//       teamA,
//       teamB,
//       teamC,
//       totalTeamBC: teamB.length + teamC.length,
//     };
//   } catch (error) {
//     throw error;
//   }
// };

import moment from "moment";
import UserModel from "../models/user.model.js";

const isValidUser = (member) => {
  if (!member) return false;

  return (
    member.isVerified === true &&
    member.isLoginBlocked === false &&
    (member.level > 0 || (member.level === 0 && member.mainWallet >= 50))
  );
};

export const calculateTeamsforDashboard = async (
  userId,
  startDate = null,
  endDate = null,
) => {
  const user = await UserModel.findById(userId).select("referedUsers").lean();

  if (!user) throw new Error("User not found");

  let dateFilter = {};
  if (startDate && endDate) {
    const start = moment(startDate).startOf("day").toDate();
    const end = moment(endDate).endOf("day").toDate();
    dateFilter.createdAt = { $gte: start, $lte: end };
  }

  /* ================= TEAM A ================= */
  const teamA = await UserModel.find({
    _id: { $in: user.referedUsers },
    ...dateFilter,
  })
    .select("referedUsers isVerified isLoginBlocked level mainWallet")
    .lean();

  /* ================= TEAM B ================= */
  const teamBIds = teamA.flatMap((u) => u.referedUsers || []);

  const teamB = teamBIds.length
    ? await UserModel.find({
        _id: { $in: teamBIds },
        ...dateFilter,
      })
        .select("referedUsers isVerified isLoginBlocked level mainWallet")
        .lean()
    : [];

  /* ================= TEAM C ================= */
  const teamCIds = teamB.flatMap((u) => u.referedUsers || []);

  const teamC = teamCIds.length
    ? await UserModel.find({
        _id: { $in: teamCIds },
        ...dateFilter,
      })
        .select("isVerified isLoginBlocked level mainWallet")
        .lean()
    : [];

  /* ================= VALID COUNTS ================= */
  const validTeamA = teamA.filter(isValidUser);
  const validTeamB = teamB.filter(isValidUser);
  const validTeamC = teamC.filter(isValidUser);

  return {
    teamA: validTeamA,
    teamB: validTeamB,
    teamC: validTeamC,
    totalTeamBC: validTeamB.length + validTeamC.length,
  };
};

// export const calculateTeamsforDashboard = async (
//   userId,
//   startDate = null,
//   endDate = null
// ) => {
//   try {
//     const user = await UserModel.findById(userId);
//     if (!user) throw new Error("User not found");

//     let dateFilter = {};
//     if (startDate && endDate) {
//       const start = moment(startDate).startOf("day").toDate();
//       const end = moment(endDate).endOf("day").toDate();
//       dateFilter.createdAt = { $gte: start, $lte: end };
//     }

//     const teamA = await UserModel.find({
//       _id: { $in: user.referedUsers },
//       ...dateFilter,
//     });

//     let teamB = [];
//     for (let a of teamA) {
//       const referredByA = await UserModel.find({
//         _id: { $in: a.referedUsers },
//         ...dateFilter,
//       });
//       teamB.push(...referredByA);
//     }

//     let teamC = [];
//     for (let b of teamB) {
//       const referredByB = await UserModel.find({
//         _id: { $in: b.referedUsers },
//         ...dateFilter,
//       });
//       teamC.push(...referredByB);
//     }

//     const filterActive = (team) =>
//       team.filter(
//         (member) =>
//           member.isVerified &&
//           (member.level > 0 || (member.level === 0 && member.mainWallet >= 30))
//       );

//     return {
//       teamA: filterActive(teamA),
//       teamB: filterActive(teamB),
//       teamC: filterActive(teamC),
//       totalTeamBC: filterActive(teamB).length + filterActive(teamC).length,
//     };
//   } catch (error) {
//     throw error;
//   }
// };

import UserModel from "../models/user.model.js";
import moment from "moment-timezone";

const MIN_USER_FIELDS =
  "_id username email level mainWallet name aiCredits referedUsers activeDate isVerified isLoginBlocked phone createdAt uuid sponsorId profilePicture isAdminLoginBlock";

export const calculateTeams = async (
  userId,
  startDate = null,
  endDate = null
) => {
  try {
    const user = await UserModel.findById(userId)
      .select("referedUsers")
      .populate("sponsorId", "username uuid");
    if (!user) throw new Error("User not found");

    let dateFilter = {};
    if (startDate && endDate) {
      const start = moment(startDate).startOf("day").toDate();
      const end = moment(endDate).endOf("day").toDate();
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    const selectFields =
      "username email level mainWallet aiCredits referedUsers isVerified isLoginBlocked phone createdAt uuid sponsorId profilePicture isAdminLoginBlock";

    const fetchTeam = async (ids) => {
      return UserModel.find({ _id: { $in: ids }, ...dateFilter })
        .select(selectFields)
        .populate({
          path: "sponsorId",
          select: "username uuid",
        })
        .populate({
          path: "referedUsers",
          select: selectFields,
        })
        .sort({ createdAt: -1 });
    };

    // ---- Team A ----
    const teamA = await fetchTeam(user.referedUsers);

    // ---- Team B ----
    const teamBIds = teamA.flatMap((a) => a.referedUsers);
    const teamB = await fetchTeam(teamBIds);

    // ---- Team C ----
    const teamCIds = teamB.flatMap((b) => b.referedUsers);
    const teamC = await fetchTeam(teamCIds);

    return {
      teamA,
      teamB,
      teamC,
      totalTeamBC: teamB.length + teamC.length,
    };
  } catch (error) {
    throw error;
  }
};

const isValidUser = (user) => {
  if (!user) return false;

  return (
    user.isVerified === true &&
    user.isLoginBlocked === false &&
    (user.level > 0 || (user.level === 0 && user.mainWallet >= 30))
  );
};
const sortByLatest = (arr = []) =>
  arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const split = (team, startDate, endDate) => {
  const register =
    startDate && endDate
      ? team.filter((u) => isInRange(u.createdAt, startDate, endDate))
      : team;

  const valid =
    startDate && endDate
      ? team.filter(
          (u) => isValidUser(u) && isInRange(u.activeDate, startDate, endDate)
        )
      : team.filter((u) => isValidUser(u));

  return {
    register: sortByLatest(register),
    valid: sortByLatest(valid),
  };
};

const getFullTreeUpToLevel3 = async (userId) => {
  const user = await UserModel.findById(userId).select("referedUsers").lean();

  if (!user) throw new Error("User not found");

  /* ================= TEAM A ================= */
  const teamA = await UserModel.find(
    { _id: { $in: user.referedUsers } },
    MIN_USER_FIELDS
  )
    .populate({
      path: "referedUsers",
      select: MIN_USER_FIELDS,
      options: { lean: true },
    })
    .lean();

  /* ================= TEAM B ================= */
  const teamBIds = teamA.flatMap(
    (u) => u.referedUsers?.map((r) => r._id) || []
  );

  const teamB = await UserModel.find(
    { _id: { $in: teamBIds } },
    MIN_USER_FIELDS
  )
    .populate({
      path: "referedUsers",
      select: MIN_USER_FIELDS,
      options: { lean: true },
    })
    .lean();

  /* ================= TEAM C ================= */
  const teamCIds = teamB.flatMap(
    (u) => u.referedUsers?.map((r) => r._id) || []
  );

  const teamC = await UserModel.find(
    { _id: { $in: teamCIds } },
    MIN_USER_FIELDS
  )
    .populate({
      path: "referedUsers",
      select: MIN_USER_FIELDS,
      options: { lean: true },
    })
    .lean();

  return { teamA, teamB, teamC };
};
const isInRange = (dateValue, startDate, endDate) => {
  if (!dateValue || !startDate || !endDate) return false;

  const start = moment.tz(startDate, "Asia/Kolkata").startOf("day").toDate();

  const end = moment.tz(endDate, "Asia/Kolkata").endOf("day").toDate();

  const d = new Date(dateValue); // UTC from DB
  return d >= start && d <= end;
};

export const calculateTeamsForDashboardUsers = async (
  userId,
  startDate,
  endDate
) => {
  const { teamA, teamB, teamC } = await getFullTreeUpToLevel3(userId);

  return {
    teamA: split(teamA, startDate, endDate),
    teamB: split(teamB, startDate, endDate),
    teamC: split(teamC, startDate, endDate),
  };
};

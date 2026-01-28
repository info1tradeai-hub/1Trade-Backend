import UserModel from "../models/user.model.js";

export const resetTradeCount = async () => {
  try {
    console.log("🔁 Running resetUsersByTimezone...");
    const result = await UserModel.updateMany(
      {},
      {
        $set: {
          todayTradeCount: 0,
        },
      },
    );
    console.log(result.modifiedCount);
    return result.modifiedCount;
  } catch (err) {
    console.error("❌ Error in resetUsersByTimezone:", err.message);
    return 0;
  }
};

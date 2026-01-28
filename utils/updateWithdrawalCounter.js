// import WithdrawalCounter from "../models/WithdrawalCounter.model.js";

// export const updateWithdrawalCounter = async (
//   withdrawal,
//   source = "manual"
// ) => {
//   try {
//     let counter = await WithdrawalCounter.findOne();
//     if (!counter) {
//       counter = new WithdrawalCounter();
//     }

//     // Extract values
//     const { amount, createdAt, status } = withdrawal;
//     if (status !== "success") return; // only count successful withdrawals

//     const now = new Date();
//     const createdDate = new Date(createdAt);
//     const diffHours = (now - createdDate) / (1000 * 60 * 60); // difference in hours

//     const today = new Date();
//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1);

//     // 🟩 CASE 1: Withdrawal happened today
//     if (diffHours < 24) {
//       if (
//         !counter.today.date ||
//         new Date(counter.today.date).toDateString() !== today.toDateString()
//       ) {
//         counter.today = {
//           totalAmount: amount,
//           totalCount: 1,
//           date: today,
//         };
//       } else {
//         counter.today.totalAmount += amount;
//         counter.today.totalCount += 1;
//       }
//     }

//     // 🟩 CASE 2: Withdrawal older than 96 hours → goes to "tomorrow"
//     else if (diffHours >= 96) {
//       if (
//         !counter.tomorrow.date ||
//         new Date(counter.tomorrow.date).toDateString() !==
//           tomorrow.toDateString()
//       ) {
//         counter.tomorrow = {
//           totalAmount: amount,
//           totalCount: 1,
//           date: tomorrow,
//         };
//       } else {
//         counter.tomorrow.totalAmount += amount;
//         counter.tomorrow.totalCount += 1;
//       }
//     }

//     await counter.save();
//     console.log("✅ Withdrawal counter updated successfully");
//   } catch (err) {
//     console.error("❌ Error updating withdrawal counter:", err.message);
//   }
// };
import WithdrawalCounter from "../models/WithdrawalCounter.model.js";

export const updateWithdrawalCounter = async (
  withdrawal,
  mode = "subtract"
) => {
  try {
    let counter = await WithdrawalCounter.findOne();
    if (!counter) {
      counter = new WithdrawalCounter({
        today: { totalAmount: 0, totalCount: 0, date: new Date() },
        tomorrow: {
          totalAmount: 0,
          totalCount: 0,
          date: new Date(Date.now() + 86400000),
        },
      });
    }

    const amount = Number(withdrawal.amount || withdrawal.netAmountSent || 0);

    if (mode === "subtract") {
      counter.today.totalAmount = Math.max(
        0,
        counter.today.totalAmount - amount
      );
      counter.today.totalCount = Math.max(0, counter.today.totalCount - 1);
    } else if (mode === "add") {
      counter.today.totalAmount += amount;
      counter.today.totalCount += 1;
    }

    await counter.save();
    console.log(`✅ Counter ${mode} success | Amount: ${amount}`);
  } catch (err) {
    console.error("❌ updateWithdrawalCounter error:", err.message);
  }
};

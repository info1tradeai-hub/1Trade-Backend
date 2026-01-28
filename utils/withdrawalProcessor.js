// import mongoose from "mongoose";
// import { parseUnits } from "ethers";
// import { usdtContract, wallet } from "./walletSetup.js";
// import UserModel from "../models/user.model.js";
// import Withdrawal from "../models/withdrawal.model.js";
// import WithdrawalHourConfig from "../models/WithdrawalHourConfig.model.js";
// import WithdrawalCounter from "../models/WithdrawalCounter.model.js";
// import { updateWithdrawalCounter } from "./updateWithdrawalCounter.js";

// const LOGGER = {
//   info: (...args) => console.log("[info]", ...args),
//   warn: (...args) => console.warn("[warn]", ...args),
//   error: (...args) => console.error("[error]", ...args),
//   debug: (...args) => console.debug("[debug]", ...args),
// };

// const DEFAULT_CUTOFF_HOURS = 96;
// const PROCESSING_TIMEOUT_MIN = 15;

// const TX_RETRY_COUNT = 3;
// const TX_RETRY_BASE_MS = 1000;

// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// // Convert various types to bigint safely
// const toBigInt = (v) => {
//   if (typeof v === "bigint") return v;
//   if (v === null || v === undefined) return 0n;
//   try {
//     return BigInt(v.toString());
//   } catch {
//     // fallback
//     return 0n;
//   }
// };

// async function sendTransactionWithRetries(sendFn, retries = TX_RETRY_COUNT) {
//   let attempt = 0;
//   while (true) {
//     try {
//       const tx = await sendFn();
//       return tx;
//     } catch (err) {
//       attempt++;
//       const isLast = attempt > retries;
//       LOGGER.warn(
//         `Transaction attempt ${attempt} failed${isLast ? " (last)" : ""}:`,
//         err?.message || err,
//       );
//       if (isLast) throw err;
//       const backoff = TX_RETRY_BASE_MS * 2 ** (attempt - 1);
//       await sleep(backoff);
//     }
//   }
// }

// export const processWithdrawals = async () => {
//   try {
//     LOGGER.info("Starting withdrawal processor...");
//     const now = new Date();

//     const pendingWithdrawals = await Withdrawal.find({
//       status: "pending",
//       processableAfter: { $lte: now },
//     }).lean();

//     LOGGER.info(
//       `Found ${pendingWithdrawals.length} pending withdrawals to consider.`,
//     );

//     for (const w of pendingWithdrawals) {
//       let claimed;
//       try {
//         claimed = await Withdrawal.findOneAndUpdate(
//           { _id: w._id, status: "pending" },
//           { $set: { status: "processing", processingStartedAt: new Date() } },
//           { new: true },
//         );
//       } catch (claimErr) {
//         LOGGER.error(
//           `Failed to claim withdrawal ${w._id}:`,
//           claimErr?.message || claimErr,
//         );
//         continue;
//       }

//       if (!claimed) {
//         LOGGER.debug(`Withdrawal ${w._id} was not claimable (skipping).`);
//         continue;
//       }

//       // Start a fresh session for this withdrawal (fixes expired session issues)
//       const session = await mongoose.startSession();
//       try {
//         await session.withTransaction(async () => {
//           const withdrawal = await Withdrawal.findById(claimed._id).session(
//             session,
//           );
//           if (!withdrawal) {
//             LOGGER.warn(
//               `Withdrawal ${claimed._id} not found after claiming - skipping.`,
//             );
//             return; // transaction will commit with no changes
//           }

//           const user = await UserModel.findById(withdrawal.userId).session(
//             session,
//           );
//           if (!user) {
//             LOGGER.warn(`User not found for withdrawal ${withdrawal._id}`);
//             // revert to pending for manual review / retry
//             withdrawal.status = "pending";
//             await withdrawal.save({ session });
//             return;
//           }

//           // parseUnits in ethers v6 returns bigint
//           const amountWei = parseUnits(withdrawal.netAmountSent.toString(), 18);

//           let serverBalanceRaw;
//           try {
//             serverBalanceRaw = await usdtContract.balanceOf(wallet.address);
//           } catch (balErr) {
//             LOGGER.error(
//               `balanceOf RPC error for withdrawal ${withdrawal._id}:`,
//               balErr?.message || balErr,
//             );
//             withdrawal.status = "pending";
//             await withdrawal.save({ session });
//             return;
//           }

//           const serverBalance = toBigInt(serverBalanceRaw);
//           const amountWeiBI = toBigInt(amountWei);

//           if (serverBalance < amountWeiBI) {
//             LOGGER.warn(
//               `Insufficient on-server balance for withdrawal ${
//                 withdrawal._id
//               }. Needed ${amountWeiBI.toString()}, have ${serverBalance.toString()}`,
//             );
//             withdrawal.status = "pending";
//             await withdrawal.save({ session });
//             return;
//           }

//           // Estimate gas (ethers v6 returns bigint)
//           let gasLimitToUse;
//           try {
//             const estimated = await usdtContract.estimateGas.transfer(
//               withdrawal.userWalletAddress,
//               amountWei,
//             );
//             const estimatedBI = toBigInt(estimated);
//             gasLimitToUse = (estimatedBI * 110n) / 100n;
//             LOGGER.debug(
//               `Gas estimate for ${
//                 withdrawal._id
//               }: ${estimatedBI.toString()}, using ${gasLimitToUse.toString()}`,
//             );
//           } catch (estErr) {
//             LOGGER.warn(
//               `estimateGas failed for ${
//                 withdrawal._id
//               }, using fallback gasLimit. err=${estErr?.message || estErr}`,
//             );
//             gasLimitToUse = 210000n;
//           }

//           const sendFn = async () => {
//             return usdtContract.transfer(
//               withdrawal.userWalletAddress,
//               amountWei,
//               {
//                 gasLimit: gasLimitToUse,
//               },
//             );
//           };

//           let tx;
//           try {
//             tx = await sendTransactionWithRetries(sendFn, TX_RETRY_COUNT);
//           } catch (txErr) {
//             LOGGER.error(
//               `Final tx failure for withdrawal ${withdrawal._id}:`,
//               txErr?.message || txErr,
//             );
//             withdrawal.status = "failed";
//             withdrawal.transactionHash = null;
//             if (withdrawal.walletType === "mainWallet") {
//               user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;

//               user.withdrawalPendingAmount =
//                 (user.withdrawalPendingAmount || 0) - withdrawal.amount;
//               if (user.withdrawalPendingAmount < 0)
//                 user.withdrawalPendingAmount = 0;
//             } else if (withdrawal.walletType === "additionalWallet") {
//               user.additionalWallet =
//                 (user.additionalWallet || 0) + withdrawal.amount;
//             }
//             user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
//             if (user.totalPayouts < 0) user.totalPayouts = 0;

//             if (user.level < 2) {
//               if (withdrawal.walletType === "mainWallet") {
//                 user.mainWalletPrinciple =
//                   (user.mainWalletPrinciple || 0) + withdrawal.amount;
//                 // user.cycleWithdrawn =
//                 //   (user.cycleWithdrawn || 0) + withdrawal.amount;
//               } else if (withdrawal.walletType === "additionalWallet") {
//                 user.additionalWalletPrinciple =
//                   (user.additionalWalletPrinciple || 0) + withdrawal.amount;
//               }
//             }

//             user.isJoiningBonusGetFirstTime = true;
//             user.isjoiningBonusGiven = true;

//             await withdrawal.save({ session });
//             await user.save({ session });
//             LOGGER.info(
//               `Withdrawal ${withdrawal._id} marked failed due to tx send failure.`,
//             );
//             return;
//           }

//           // wait for receipt
//           let receipt;
//           try {
//             receipt = await tx.wait();
//           } catch (waitErr) {
//             LOGGER.error(
//               `tx.wait failed for withdrawal ${withdrawal._id}:`,
//               waitErr?.message || waitErr,
//             );
//             withdrawal.status = "failed";
//             withdrawal.transactionHash = tx.hash || null;
//             if (withdrawal.walletType === "mainWallet") {
//               user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;
//               user.withdrawalPendingAmount =
//                 (user.withdrawalPendingAmount || 0) - withdrawal.amount;
//               if (user.withdrawalPendingAmount < 0)
//                 user.withdrawalPendingAmount = 0;
//             } else if (withdrawal.walletType === "additionalWallet") {
//               user.additionalWallet =
//                 (user.additionalWallet || 0) + withdrawal.amount;
//             }
//             user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
//             if (user.totalPayouts < 0) user.totalPayouts = 0;

//             if (user.level < 2) {
//               if (withdrawal.walletType === "mainWallet") {
//                 user.mainWalletPrinciple =
//                   (user.mainWalletPrinciple || 0) + withdrawal.amount;
//               } else if (withdrawal.walletType === "additionalWallet") {
//                 user.additionalWalletPrinciple =
//                   (user.additionalWalletPrinciple || 0) + withdrawal.amount;
//               }
//             }

//             user.isJoiningBonusGetFirstTime = true;
//             user.isjoiningBonusGiven = true;

//             await withdrawal.save({ session });
//             await user.save({ session });
//             LOGGER.info(
//               `Withdrawal ${withdrawal._id} marked failed due to missing receipt.`,
//             );
//             return;
//           }

//           // success or failed based on receipt.status
//           if (receipt && receipt.status) {
//             const amt = Number(withdrawal.amount) || 0;
//             const walletType = (withdrawal.walletType || "").toLowerCase();

//             withdrawal.status = "success";
//             withdrawal.transactionHash =
//               receipt.hash || receipt.transactionHash || tx.hash;

//             user.totalPayouts = (user.totalPayouts || 0) + amt;

//             if (walletType === "mainwallet") {
//               user.depositMainWallet = Math.max(
//                 (user.depositMainWallet || 0) - amt,
//                 0,
//               );
//               user.mainWalletPayouts = (user.mainWalletPayouts || 0) + amt;
//               user.withdrawalPendingAmount = Math.max(
//                 (user.withdrawalPendingAmount || 0) - amt,
//                 0,
//               );
//               user.cycleWithdrawn = (user.cycleWithdrawn || 0) + amt;
//             } else if (walletType === "additionalwallet") {
//               user.additionalWalletPayouts =
//                 (user.additionalWalletPayouts || 0) + amt;
//             }

//             user.isJoiningBonusGetFirstTime = true;
//             user.isjoiningBonusGiven = true;

//             await withdrawal.save({ session });
//             await user.save({ session });
//             LOGGER.info(
//               `💰 User ${user._id}: totalPayouts=${user.totalPayouts}, mainWalletPayouts=${user.mainWalletPayouts}`,
//             );

//             // Counter update moved outside transaction (non-blocking)
//             try {
//               await updateWithdrawalCounter(withdrawal, "subtract");
//               LOGGER.info(
//                 `📉 Today counter decreased for withdrawal ${withdrawal._id}`,
//               );
//             } catch (e) {
//               LOGGER.warn(
//                 `updateWithdrawalCounter failed for ${withdrawal._id}: ${e.message}`,
//               );
//             }

//             LOGGER.info(
//               `✅ Withdrawal ${withdrawal._id} processed: success (txHash=${withdrawal.transactionHash})`,
//             );
//             return;
//           } else {
//             // receipt exists but failed
//             const amt = Number(withdrawal.amount) || 0;
//             const walletType = (withdrawal.walletType || "").toLowerCase();

//             withdrawal.status = "failed";
//             withdrawal.transactionHash = receipt
//               ? receipt.hash || receipt.transactionHash
//               : null;

//             if (walletType === "mainwallet") {
//               user.mainWallet = (user.mainWallet || 0) + amt;
//               user.withdrawalPendingAmount = Math.max(
//                 (user.withdrawalPendingAmount || 0) - amt,
//                 0,
//               );
//             } else if (walletType === "additionalwallet") {
//               user.additionalWallet = (user.additionalWallet || 0) + amt;
//             }

//             user.totalPayouts = Math.max((user.totalPayouts || 0) - amt, 0);

//             if (user.level < 2) {
//               if (walletType === "mainwallet") {
//                 user.mainWalletPrinciple =
//                   (user.mainWalletPrinciple || 0) + amt;
//                 // user.cycleWithdrawn =
//                 //   (user.cycleWithdrawn || 0) + withdrawal.amount;
//               } else if (walletType === "additionalwallet") {
//                 user.additionalWalletPrinciple =
//                   (user.additionalWalletPrinciple || 0) + amt;
//               }
//             }

//             user.isJoiningBonusGetFirstTime = true;
//             user.isjoiningBonusGiven = true;

//             await withdrawal.save({ session });
//             await user.save({ session });

//             LOGGER.info(
//               `❌ Withdrawal ${withdrawal._id} processed: failed (txHash=${withdrawal.transactionHash})`,
//             );
//             return;
//           }
//         }); // end withTransaction
//       } catch (perWithdrawErr) {
//         LOGGER.error(
//           `Transaction error while processing withdrawal ${w._id}:`,
//           perWithdrawErr?.message || perWithdrawErr,
//         );
//         // best-effort revert claim to pending for manual retry
//         try {
//           await Withdrawal.findByIdAndUpdate(w._id, {
//             $set: { status: "pending" },
//           });
//         } catch (revertErr) {
//           LOGGER.error(
//             `Failed to revert withdrawal ${w._id} to pending:`,
//             revertErr?.message || revertErr,
//           );
//         }
//       } finally {
//         try {
//           session.endSession();
//         } catch (endErr) {
//           LOGGER.debug("session end error:", endErr?.message || endErr);
//         }
//       }
//     } // end for

//     LOGGER.info("Withdrawal processing run finished.");
//   } catch (err) {
//     LOGGER.error("Withdrawal process error:", err?.message || err);
//   }
// };

import mongoose from "mongoose";
import { parseUnits } from "ethers";
import { usdtContract, wallet } from "./walletSetup.js";
import UserModel from "../models/user.model.js";
import Withdrawal from "../models/withdrawal.model.js";
import { updateWithdrawalCounter } from "./updateWithdrawalCounter.js";

const LOGGER = {
  info: (...args) => console.log("[info]", ...args),
  warn: (...args) => console.warn("[warn]", ...args),
  error: (...args) => console.error("[error]", ...args),
};

const PROCESSING_TIMEOUT_MIN = 15;

/* bigint helper */
const toBigInt = (v) => {
  try {
    return BigInt(v.toString());
  } catch {
    return 0n;
  }
};

export const processWithdrawals = async () => {
  try {
    LOGGER.info("Starting withdrawal processor...");
    const now = new Date();

    /* =================================================
       0️⃣ STUCK PROCESSING RECOVERY (NO LOGIC CHANGE)
    ================================================= */
    const timeoutDate = new Date(
      Date.now() - PROCESSING_TIMEOUT_MIN * 60 * 1000,
    );

    await Withdrawal.updateMany(
      {
        status: "processing",
        processingStartedAt: { $lte: timeoutDate },
        transactionHash: null,
      },
      {
        $set: {
          status: "pending",
          processingStartedAt: null,
        },
      },
    );

    /* =================================================
       1️⃣ FETCH PENDING (SAME)
    ================================================= */
    const pendingWithdrawals = await Withdrawal.find({
      status: "pending",
      processableAfter: { $lte: now },
    }).lean();

    LOGGER.info(
      `Found ${pendingWithdrawals.length} pending withdrawals to consider.`,
    );

    for (const w of pendingWithdrawals) {
      /* =================================================
         2️⃣ CLAIM (SAME)
      ================================================= */
      const claimed = await Withdrawal.findOneAndUpdate(
        { _id: w._id, status: "pending" },
        { $set: { status: "processing", processingStartedAt: new Date() } },
        { new: true },
      );

      if (!claimed) continue;

      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const withdrawal = await Withdrawal.findById(claimed._id).session(
            session,
          );
          if (!withdrawal) return;

          // 🔐 SAFETY: agar txHash hai to dobara tx nahi
          if (withdrawal.transactionHash) {
            LOGGER.warn("Tx already sent, skipping:", withdrawal._id);
            return;
          }

          const user = await UserModel.findById(withdrawal.userId).session(
            session,
          );
          if (!user) {
            withdrawal.status = "pending";
            await withdrawal.save({ session });
            return;
          }
          /* =================================================
             3️⃣ BALANCE CHECK (SAME)
          ================================================= */
          const amountWei = parseUnits(withdrawal.netAmountSent.toString(), 18);

          const serverBalanceRaw = await usdtContract.balanceOf(wallet.address);
          const serverBalance = toBigInt(serverBalanceRaw);

          if (serverBalance < amountWei) {
            withdrawal.status = "pending";
            await withdrawal.save({ session });
            return;
          }

          /* =================================================
             4️⃣ SEND TX (ONLY CHANGE HERE)
             ❌ retry hata diya
             ✅ txHash turant save
          ================================================= */
          let tx;
          try {
            tx = await usdtContract.transfer(
              withdrawal.userWalletAddress,
              amountWei,
            );

            withdrawal.transactionHash = tx.hash; // 🔐 HARD LOCK
            withdrawal.status = "processing";
            await withdrawal.save({ session });
          } catch (txErr) {
            // 🔴 FAILURE LOGIC SAME AS BEFORE
            withdrawal.status = "failed";
            withdrawal.transactionHash = null;

            if (withdrawal.walletType === "mainWallet") {
              user.mainWallet = (user.mainWallet || 0) + withdrawal.amount;
              user.withdrawalPendingAmount =
                (user.withdrawalPendingAmount || 0) - withdrawal.amount;
              if (user.withdrawalPendingAmount < 0)
                user.withdrawalPendingAmount = 0;
            } else if (withdrawal.walletType === "additionalWallet") {
              user.additionalWallet =
                (user.additionalWallet || 0) + withdrawal.amount;
            }

            user.totalPayouts = (user.totalPayouts || 0) - withdrawal.amount;
            if (user.totalPayouts < 0) user.totalPayouts = 0;

            if (user.level < 2) {
              if (withdrawal.walletType === "mainWallet") {
                user.mainWalletPrinciple =
                  (user.mainWalletPrinciple || 0) + withdrawal.amount;
              } else {
                user.additionalWalletPrinciple =
                  (user.additionalWalletPrinciple || 0) + withdrawal.amount;
              }
            }

            user.isJoiningBonusGetFirstTime = true;
            user.isjoiningBonusGiven = true;

            await withdrawal.save({ session });
            await user.save({ session });
            return;
          }

          /* =================================================
             5️⃣ WAIT RECEIPT (LOGIC SAME)
          ================================================= */
          let receipt;
          try {
            receipt = await tx.wait();
          } catch (err) {
            withdrawal.status = "manual_review"; // tx gaya, auto retry nahi
            await withdrawal.save({ session });
            return;
          }

          /* =================================================
             6️⃣ SUCCESS / FAILED (100% SAME LOGIC)
          ================================================= */
          if (receipt && receipt.status) {
            const amt = Number(withdrawal.amount) || 0;
            const walletType = (withdrawal.walletType || "").toLowerCase();

            withdrawal.status = "success";
            withdrawal.transactionHash =
              receipt.hash || receipt.transactionHash || tx.hash;

            user.totalPayouts = (user.totalPayouts || 0) + amt;

            if (walletType === "mainwallet") {
              user.depositMainWallet = Math.max(
                (user.depositMainWallet || 0) - amt,
                0,
              );
              user.mainWalletPayouts = (user.mainWalletPayouts || 0) + amt;
              user.withdrawalPendingAmount = Math.max(
                (user.withdrawalPendingAmount || 0) - amt,
                0,
              );
              user.cycleWithdrawn = (user.cycleWithdrawn || 0) + amt;
            } else if (walletType === "additionalwallet") {
              user.additionalWalletPayouts =
                (user.additionalWalletPayouts || 0) + amt;
            }

            user.isJoiningBonusGetFirstTime = true;
            user.isjoiningBonusGiven = true;

            await withdrawal.save({ session });
            await user.save({ session });

            updateWithdrawalCounter(withdrawal, "subtract").catch(() => {});
          } else {
            // ❌ FAILED BLOCK — SAME AS BEFORE
            const amt = Number(withdrawal.amount) || 0;
            const walletType = (withdrawal.walletType || "").toLowerCase();

            withdrawal.status = "failed";

            if (walletType === "mainwallet") {
              user.mainWallet = (user.mainWallet || 0) + amt;
              user.withdrawalPendingAmount = Math.max(
                (user.withdrawalPendingAmount || 0) - amt,
                0,
              );
            } else {
              user.additionalWallet = (user.additionalWallet || 0) + amt;
            }

            user.totalPayouts = Math.max((user.totalPayouts || 0) - amt, 0);

            if (user.level < 2) {
              if (walletType === "mainwallet") {
                user.mainWalletPrinciple =
                  (user.mainWalletPrinciple || 0) + amt;
              } else {
                user.additionalWalletPrinciple =
                  (user.additionalWalletPrinciple || 0) + amt;
              }
            }

            user.isJoiningBonusGetFirstTime = true;
            user.isjoiningBonusGiven = true;

            await withdrawal.save({ session });
            await user.save({ session });
          }
        });
      } finally {
        session.endSession();
      }
    }

    LOGGER.info("Withdrawal processing run finished.");
  } catch (err) {
    LOGGER.error("Withdrawal process error:", err.message);
  }
};

import axios from "axios";
import Roi from "../models/roi.model.js";
import UserModel from "../models/user.model.js";
import RoiLevel from "../models/roiLevel.model.js";
import ReferralTradeCredit from "../models/referralandtradecredit.model.js";

// export const triggerAITradeRoi = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const userId = req.user._id;
//     const { timer } = req.body;

//     // ---------------- PENDING TRADE CHECK ----------------
//     const pendingTrade = await Roi.findOne({
//       userId,
//       isClaimed: false,
//     }).session(session);

//     if (pendingTrade) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         success: false,
//         message: "Please claim the previous trade before starting a new one.",
//       });
//     }

//     // ---------------- USER + LEVEL CHECK ----------------
//     const user = await UserModel.findById(userId).session(session);
//     if (!user) {
//       await session.abortTransaction();
//       session.endSession();
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     const level = user.level || 0;
//     if (level === 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         success: false,
//         message: "Level 0 cannot trade",
//       });
//     }

//     // ---------------- LEVEL CHANGE → CYCLE RESET ----------------
//     if (user.lastCycleLevel === undefined || user.lastCycleLevel === null) {
//       user.lastCycleLevel = level;
//     } else if (user.lastCycleLevel !== level) {
//       user.cyclePrincipal = 0;
//       user.cycleWithdrawn = 0;
//       user.totalEarningsInCycle = 0;
//       user.pendingLevelIncome = 0;
//       user.cycleTradeCount = 0;
//       user.cycleStartDate = new Date();
//       user.doubleBase = 0;
//       user.doubleTarget = 0;
//       user.block1Fails = 0;
//       user.block2Fails = 0;
//       user.capHit = false;
//       user.remainingTradesAfterCap = 0;
//       user.remainingSuccessNeeded = 0;
//       user.lastCycleLevel = level;
//     }

//     // ---------------- WALLET SNAPSHOT (PRE-TRADE) ----------------
//     const mainWalletBeforeTrade = user.mainWallet || 0;
//     const bonusWalletBeforeTrade = user.BonusCredit || 0;
//     const tradingWallet = Number(
//       (mainWalletBeforeTrade + bonusWalletBeforeTrade).toFixed(2)
//     );

//     if (tradingWallet <= 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         success: false,
//         message: "Wallet empty!",
//       });
//     }

//     // ---------------- LEVEL CONFIG LOAD ----------------
//     const levelConfig = await RoiLevel.findOne({ level }).session(session);
//     if (!levelConfig) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         success: false,
//         message: `ROI config missing for Level ${level}`,
//       });
//     }

//     const { minInvestment, maxInvestment, minPercent } = levelConfig;

//     // ---------------- INIT NULLABLE FIELDS ----------------
//     if (user.totalEarningsInCycle == null) user.totalEarningsInCycle = 0;
//     if (user.pendingLevelIncome == null) user.pendingLevelIncome = 0;
//     if (user.cycleCount == null) user.cycleCount = 0;
//     if (user.cyclePrincipal == null) user.cyclePrincipal = 0;
//     if (user.cycleTradeCount == null) user.cycleTradeCount = 0;
//     if (user.cycleWithdrawn == null) user.cycleWithdrawn = 0;
//     if (!user.cycleStartDate) user.cycleStartDate = new Date();
//     if (user.block1Fails == null) user.block1Fails = 0;
//     if (user.block2Fails == null) user.block2Fails = 0;
//     if (user.capHit == null) user.capHit = false;
//     if (user.remainingTradesAfterCap == null) user.remainingTradesAfterCap = 0;
//     if (user.remainingSuccessNeeded == null) user.remainingSuccessNeeded = 0;

//     // ---------------- HELPER: RECALC DOUBLE BASE/TARGET ----------------
//     const recalcDoubleBaseAndTarget = () => {
//       let base = Number((user.cyclePrincipal || 0).toFixed(2));
//       if (base > maxInvestment) base = maxInvestment;
//       user.cyclePrincipal = base;

//       // LEVEL 2 SPECIAL
//       if (level === 2) {
//         if (base >= 750 && base <= 800) {
//           user.doubleBase = base;
//           user.doubleTarget = 1500;
//         } else if (base >= 1400) {
//           user.doubleBase = base;
//           user.doubleTarget = Number((base * 1.5).toFixed(2));
//         } else {
//           user.doubleBase = base;
//           user.doubleTarget = Number((base * 2).toFixed(2));
//         }
//         return;
//       }

//       // LEVEL 3 SPECIAL:
//       // Stage-1: 1500 -> 3000
//       // Stage-2: 3000 -> 4000
//       // Stage-3 (locked): 4000 -> 6000 (50% profit cycle)
//       if (level === 3) {
//         user.doubleBase = base;

//         const firstStageCap = Math.min(2 * minInvestment, maxInvestment); // 1500*2=3000

//         if (base < firstStageCap) {
//           const target = Math.min(base * 2, firstStageCap);
//           user.doubleTarget = Number(target.toFixed(2));
//         } else if (base < maxInvestment - 0.01) {
//           user.doubleTarget = Number(maxInvestment.toFixed(2));
//         } else {
//           user.doubleBase = Number(maxInvestment.toFixed(2)); // lock 4000
//           const target = maxInvestment * 1.5; // 4000 -> 6000
//           user.doubleTarget = Number(target.toFixed(2));
//         }
//         return;
//       }

//       // LEVEL 4: 4000→8000 (double), then 50% cycle 8000→12000
//       if (level === 4) {
//         user.doubleBase = base;

//         if (base < maxInvestment - 0.01) {
//           const target = maxInvestment; // 8000
//           user.doubleTarget = Number(target.toFixed(2));
//         } else {
//           user.doubleBase = Number(maxInvestment.toFixed(2)); // 8000
//           const target = maxInvestment * 1.5; // 12000
//           user.doubleTarget = Number(target.toFixed(2));
//         }
//         return;
//       }

//       // LEVEL 5: staged double then 50% at maxInvestment
//       if (level === 5) {
//         user.doubleBase = base;
//         const firstStageCap = 2 * minInvestment;

//         if (base < firstStageCap) {
//           let target = base * 2;
//           if (target > maxInvestment) target = maxInvestment;
//           user.doubleTarget = Number(target.toFixed(2));
//         } else if (base < maxInvestment) {
//           let target = base * 2;
//           if (target > maxInvestment) target = maxInvestment;
//           user.doubleTarget = Number(target.toFixed(2));
//         } else {
//           const target = base * 1.5;
//           user.doubleTarget = Number(target.toFixed(2));
//         }
//         return;
//       }

//       // ⭐ LEVEL 6 (FIXED) ⭐
//       // Phase-1: base < maxInvestment → target = maxInvestment (e.g. 30k -> 50k)
//       // Phase-2 (LOCKED): base >= maxInvestment → target = base + 20k (cap)
//       if (level === 6) {
//         let baseL6 = Number((user.cyclePrincipal || 0).toFixed(2));
//         if (baseL6 > maxInvestment) baseL6 = maxInvestment;

//         user.cyclePrincipal = baseL6;

//         // GROWTH PHASE
//         if (baseL6 < maxInvestment - 0.01) {
//           user.doubleBase = baseL6;
//           user.doubleTarget = maxInvestment; // fixed 50k target
//           return;
//         }

//         // LOCKED PHASE: base >= 50k
//         user.doubleBase = Number(maxInvestment.toFixed(2)); // lock at 50k
//         const target = maxInvestment + 20000; // +20k cap
//         user.doubleTarget = Number(target.toFixed(2));
//         return;
//       }

//       // LEVEL 1: 2x
//       user.doubleBase = base;
//       user.doubleTarget = Number((base * 2).toFixed(2));
//     };

//     // -------- WITHDRAW HANDLING + PRINCIPAL SETUP ORDER --------
//     if (user.cycleWithdrawn > 0) {
//       const withdrawAmt = Number(user.cycleWithdrawn.toFixed(2));

//       user.cyclePrincipal = Math.max(
//         Number((user.cyclePrincipal - withdrawAmt).toFixed(2)),
//         0
//       );

//       console.log("📉 Withdrawal applied on principal", {
//         withdrawAmt,
//         newCyclePrincipal: user.cyclePrincipal,
//       });

//       user.cycleWithdrawn = 0;
//     }

//     const walletEffectiveNow = Number(
//       (user.mainWallet + user.BonusCredit).toFixed(2)
//     );
//     if (user.cyclePrincipal > walletEffectiveNow) {
//       user.cyclePrincipal = walletEffectiveNow;
//     }

//     // If principal 0 → pick from MAIN WALLET (but clamp by maxInvestment)
//     if (!user.cyclePrincipal || user.cyclePrincipal <= 0) {
//       let newPrincipal;
//       if (level === 4) {
//         // Level-4: minimum lock rule
//         if (mainWalletBeforeTrade >= minInvestment) {
//           newPrincipal = minInvestment;
//         } else {
//           newPrincipal = mainWalletBeforeTrade;
//         }
//       } else {
//         newPrincipal = Number(mainWalletBeforeTrade.toFixed(2));
//         if (newPrincipal > maxInvestment) newPrincipal = maxInvestment;
//       }

//       user.cyclePrincipal = Number(newPrincipal.toFixed(2));
//       user.totalEarningsInCycle = 0;
//       user.pendingLevelIncome = 0;
//       user.cycleTradeCount = 0;
//       user.cycleStartDate = new Date();
//       user.block1Fails = 0;
//       user.block2Fails = 0;
//       user.capHit = false;
//       user.remainingTradesAfterCap = 0;
//       user.remainingSuccessNeeded = 0;
//     }

//     const principal = Number(user.cyclePrincipal.toFixed(2));

//     recalcDoubleBaseAndTarget();

//     const isLevel3 = level === 3;
//     const isL3LockedStage =
//       isLevel3 && user.doubleBase >= maxInvestment - 0.01; // base=4000 locked

//     const isLevel4 = level === 4;
//     const isL4LockedStage =
//       isLevel4 && user.doubleBase >= maxInvestment - 0.01; // base=8000 locked

//     // ---------------- BASIC DEBUG ----------------
//     console.log("🔹[AI ROI] User:", userId.toString(), {
//       level,
//       principal,
//       doubleBase: user.doubleBase,
//       doubleTarget: user.doubleTarget,
//       mainWalletBeforeTrade,
//       bonusWalletBeforeTrade,
//     });

//     // ---------------- PROFIT USED (ROI + LEVEL) ----------------
//     const roiUsed = Number((user.totalEarningsInCycle || 0).toFixed(2));
//     const levelUsed = Number((user.pendingLevelIncome || 0).toFixed(2));
//     let usedProfit = Number((roiUsed + levelUsed).toFixed(2)); // cap includes levelIncome
//     const prevCycleTrades = user.cycleTradeCount || 0;

//     // ---------------- LEVEL CONFIG ----------------
//     const CYCLE_DAYS = 45;
//     let tradesPerDay = 1;
//     let safetyGap = 0;
//     let enforceTradeTarget = false; // RESET CONCEPT HATA DIYA

//     if (level === 1) {
//       tradesPerDay = 1;
//       safetyGap = 0;
//     } else if (level === 2) {
//       tradesPerDay = 1;
//       safetyGap = 8;
//       enforceTradeTarget = true; // ONLY fail distribution ke liye use hoga
//     } else if (level === 3) {
//       tradesPerDay = 2;
//       safetyGap = 10;
//       enforceTradeTarget = true;
//     } else if (level === 4) {
//       tradesPerDay = 2;
//       safetyGap = 10;
//       enforceTradeTarget = false; // L4 reset only cap se
//     } else if (level === 5 || level === 6) {
//       tradesPerDay = 3;
//       safetyGap = 20;
//       enforceTradeTarget = true; // sirf fail distribution, reset cap se
//     }

//     const cycleTradeTarget = CYCLE_DAYS * tradesPerDay;

//     // ---------------- TRADE AMOUNT (63% RULE + TRADE CAP) ----------------
//     let tradeAmount = 0;
//     if (level === 1) {
//       tradeAmount = Math.min(tradingWallet, maxInvestment);
//     } else {
//       const extra = tradingWallet - minInvestment;
//       if (extra <= 0) {
//         tradeAmount = Math.min(minInvestment, tradingWallet);
//       } else {
//         tradeAmount = minInvestment + extra * 0.63;
//         tradeAmount = Math.min(tradeAmount, tradingWallet, maxInvestment);
//       }
//     }

//     tradeAmount = Number(tradeAmount.toFixed(2));
//     if (tradeAmount <= 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         success: false,
//         message: "Not enough balance to trade",
//       });
//     }

//     // ---------------- ROI PER TRADE ----------------
//     const baseDailyPercent = minPercent;
//     const roiPercentPerTrade = Number(
//       (baseDailyPercent / tradesPerDay).toFixed(4)
//     );
//     let rawProfit = Number(
//       ((tradeAmount * roiPercentPerTrade) / 100).toFixed(2)
//     );

//     // ---------------- PROFIT CAP (ROI + LEVEL) ----------------
//     let profitCap = Number((user.doubleTarget - user.doubleBase).toFixed(2));
//     if (profitCap < 0) profitCap = 0;

//     let allowedProfit = Number((profitCap - safetyGap).toFixed(2));
//     // Level 3+ → full cap, no safety gap
//     if (level >= 3) {
//       allowedProfit = profitCap;
//     }
//     if (allowedProfit < 0) allowedProfit = 0;

//     // Agar kisi wajah se usedProfit > allowedProfit aa gaya hai, toh clamp karo
//     if (usedProfit > allowedProfit) {
//       const overflow = Number((usedProfit - allowedProfit).toFixed(2));
//       let newRoiUsed = roiUsed - overflow;
//       if (newRoiUsed < 0) newRoiUsed = 0;
//       user.totalEarningsInCycle = Number(newRoiUsed.toFixed(2));
//       usedProfit = user.totalEarningsInCycle + (user.pendingLevelIncome || 0);

//       console.log(
//         "⚖️ [CAP CLAMP] usedProfit > allowedProfit tha, adjust kiya",
//         {
//           oldUsedProfit: roiUsed + levelUsed,
//           newUsedProfit: usedProfit,
//           allowedProfit,
//         }
//       );
//     }

//     let remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));

//     console.log("🔹[CAP DEBUG]", {
//       allowedProfit,
//       usedProfit,
//       remainingProfit,
//       profitCap,
//       safetyGap,
//       roiUsed: user.totalEarningsInCycle,
//       levelUsed,
//     });

//     // ================= FAIL LOGIC =================
//     let roiAmount = rawProfit;
//     let failTrade = false;

//     const t = prevCycleTrades + 1;
//     const tradesLeftIncludingThis = cycleTradeTarget - prevCycleTrades;
//     // LEVEL-6 SAFETY MODE  🚫
//     // Prevent early cycle success due ONLY to Level Income
//     let L6_forceFailMode = false;
//     let L6_hardCapLock = false;

//     if (level === 6) {
//       const roiOnlyProfit = user.totalEarningsInCycle || 0;
//       const lvlProfit = user.pendingLevelIncome || 0;

//       const capHitByLevelIncomeOnly =
//         lvlProfit >= allowedProfit - 0.5 &&
//         roiOnlyProfit < allowedProfit * 0.25 &&
//         usedProfit >= allowedProfit - 0.5;

//       if (capHitByLevelIncomeOnly && t < 90) {
//         L6_forceFailMode = true;
//         failTrade = true;
//         roiAmount = 0;
//         console.log(
//           "🚫[L6] Force fail until t>=90 because Level-Income capped early"
//         );
//       }

//       if (
//         !L6_forceFailMode &&
//         usedProfit >= allowedProfit - 0.01 &&
//         prevCycleTrades >= 1 &&
//         prevCycleTrades < 90
//       ) {
//         L6_hardCapLock = true;
//         failTrade = true;
//         roiAmount = 0;
//         console.log(
//           "❌[L6] Hard cap lock active → forcing fails until 90 trades"
//         );
//       }
//     }

//     // ⛔ Block all success override if forced fail mode engaged
//     if (L6_forceFailMode || L6_hardCapLock) {
//       remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));
//     }

//     // ---- STEP 1: BASIC CAP CHECK ----
//     if (!L6_forceFailMode && !L6_hardCapLock) {
//       if (remainingProfit <= 0.01 || allowedProfit === 0) {
//         failTrade = true;
//         roiAmount = 0;
//         console.log("⚠️[FAIL] Cap exhausted, trade:", t);
//       } else {
//         let blockFail = false;

//         // BLOCK 1: trades 1–10 → exactly 3 fails
//         if (t >= 1 && t <= 10) {
//           const blockSize = 10;
//           const maxFails = 3;
//           const usedFails = user.block1Fails || 0;
//           const remainingTradesInBlock = blockSize - t + 1;
//           const remainingFailsToAssign = maxFails - usedFails;

//           if (remainingFailsToAssign > 0) {
//             if (remainingTradesInBlock === remainingFailsToAssign) {
//               blockFail = true;
//             } else {
//               const prob = remainingFailsToAssign / remainingTradesInBlock;
//               if (Math.random() < prob) blockFail = true;
//             }
//           }

//           if (blockFail) {
//             user.block1Fails = usedFails + 1;
//           }

//           console.log("🔸[BLOCK1 DEBUG]", {
//             t,
//             blockFail,
//             usedFailsBefore: usedFails,
//             usedFailsAfter: user.block1Fails,
//             remainingTradesInBlock,
//             remainingFailsToAssign,
//           });
//         }

//         // BLOCK 2: trades 11–20 → exactly 2 fails
//         if (!blockFail && t >= 11 && t <= 20) {
//           const maxFails = 2;
//           const usedFails = user.block2Fails || 0;
//           const tradeIndexInBlock = t - 10; // 1–10
//           const remainingTradesInBlock = 10 - tradeIndexInBlock + 1;
//           const remainingFailsToAssign = maxFails - usedFails;

//           if (remainingFailsToAssign > 0) {
//             if (remainingTradesInBlock === remainingFailsToAssign) {
//               blockFail = true;
//             } else {
//               const prob = remainingFailsToAssign / remainingTradesInBlock;
//               if (Math.random() < prob) blockFail = true;
//             }
//           }

//           if (blockFail) {
//             user.block2Fails = usedFails + 1;
//           }

//           console.log("🔸[BLOCK2 DEBUG]", {
//             t,
//             blockFail,
//             usedFailsBefore: usedFails,
//             usedFailsAfter: user.block2Fails,
//             remainingTradesInBlock,
//             remainingFailsToAssign,
//           });
//         }

//         if (blockFail) {
//           failTrade = true;
//           roiAmount = 0;
//         } else {
//           if (level <= 2) {
//             // ⭐ Level 1–2: old style (random + cap-safe)
//             const neededSuccessTrades =
//               rawProfit > 0 ? remainingProfit / rawProfit : Infinity;
//             const bufferTrades = tradesLeftIncludingThis - neededSuccessTrades;

//             let capSafeFailChance;
//             if (bufferTrades <= 0) {
//               capSafeFailChance = 0;
//             } else {
//               capSafeFailChance = Math.min(
//                 0.8,
//                 bufferTrades / tradesLeftIncludingThis
//               );
//             }

//             let baseFailChance = 0;
//             if (remainingProfit <= rawProfit * 3) {
//               baseFailChance = 0.6;
//             } else if (remainingProfit <= rawProfit * 8) {
//               baseFailChance = 0.35;
//             } else {
//               baseFailChance = 0.15;
//             }

//             let failChance = Math.min(baseFailChance, capSafeFailChance);

//             // Cap ke bilkul paas ho → success enforce
//             if (remainingProfit <= rawProfit + 0.05) {
//               failChance = 0;
//             }

//             console.log("🔹[CAP-FAIL L1/L2 DEBUG]", {
//               t,
//               remainingProfit,
//               rawProfit,
//               tradesLeftIncludingThis,
//               neededSuccessTrades,
//               bufferTrades,
//               capSafeFailChance,
//               baseFailChance,
//               failChance,
//             });

//             if (failChance > 0 && Math.random() < failChance) {
//               failTrade = true;
//               roiAmount = 0;
//             } else {
//               failTrade = false;
//               roiAmount = Number(
//                 Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
//               );
//             }
//           } else {
//             // ⭐ SCHEDULE LOGIC FOR LEVEL 3+ (L3, L4, L5, L6)
//             const expectedProfitPerTrade =
//               cycleTradeTarget > 0 ? allowedProfit / cycleTradeTarget : 0;
//             const expectedProfitSoFar = expectedProfitPerTrade * t;
//             const profitAhead = usedProfit - expectedProfitSoFar;
//             const profitAheadInTrades =
//               expectedProfitPerTrade > 0
//                 ? profitAhead / expectedProfitPerTrade
//                 : 0;

//             let baseFailChance;

//             // ⭐ SCHEDULE LOGIC FOR LEVEL 3+ with tougher Level-6
//             if (level === 6) {
//               if (profitAheadInTrades > 18) {
//                 baseFailChance = 0.9; // 90% fail
//               } else if (profitAheadInTrades > 10) {
//                 baseFailChance = 0.75;
//               } else if (profitAheadInTrades > 4) {
//                 baseFailChance = 0.6;
//               } else if (profitAheadInTrades < -18) {
//                 baseFailChance = 0.12;
//               } else if (profitAheadInTrades < -10) {
//                 baseFailChance = 0.18;
//               } else if (profitAheadInTrades < -4) {
//                 baseFailChance = 0.25;
//               } else {
//                 baseFailChance = 0.4;
//               }
//             } else {
//               if (profitAheadInTrades > 18) {
//                 baseFailChance = 0.8;
//               } else if (profitAheadInTrades > 10) {
//                 baseFailChance = 0.65;
//               } else if (profitAheadInTrades > 4) {
//                 baseFailChance = 0.5;
//               } else if (profitAheadInTrades < -18) {
//                 baseFailChance = 0.08;
//               } else if (profitAheadInTrades < -10) {
//                 baseFailChance = 0.12;
//               } else if (profitAheadInTrades < -4) {
//                 baseFailChance = 0.2;
//               } else {
//                 baseFailChance = 0.3;
//               }
//             }

//             // CAP ke bahut paas jaldi aa gaye ho:
//             if (remainingProfit <= rawProfit * 8 && t < cycleTradeTarget - 20) {
//               baseFailChance = Math.max(baseFailChance, 0.45);
//             }
//             if (remainingProfit <= rawProfit * 3 && t < cycleTradeTarget - 10) {
//               baseFailChance = Math.max(baseFailChance, 0.6);
//             }

//             // Last 15–20 trades: success bias zyda (distribution only)
//             if (t >= cycleTradeTarget - 15) {
//               baseFailChance = Math.min(baseFailChance, 0.4);
//             } else if (t >= cycleTradeTarget - 25) {
//               baseFailChance = Math.min(baseFailChance, 0.5);
//             }

//             let failChance = baseFailChance;
//             failChance = Math.min(Math.max(failChance, 0.05), 0.85);

//             // Agar ye trade hi cap close kar sakta hai → success enforce
//             if (remainingProfit <= rawProfit + 0.05) {
//               failChance = 0;
//             }

//             console.log("🔹[CAP-FAIL L3+ DEBUG]", {
//               t,
//               remainingProfit,
//               rawProfit,
//               tradesLeftIncludingThis,
//               allowedProfit,
//               usedProfit,
//               expectedProfitSoFar,
//               profitAhead,
//               profitAheadInTrades,
//               baseFailChance,
//               failChance,
//             });

//             if (failChance > 0 && Math.random() < failChance) {
//               failTrade = true;
//               roiAmount = 0;
//             } else {
//               failTrade = false;

//               if (level === 3 && user.doubleBase < maxInvestment) {
//                 // ⭐ Level-3 → Stage1 (1500-3000) & Stage2 (3000-4000)
//                 roiAmount = rawProfit;
//               } else {
//                 // L3 locked, L4, L5, L6 → cap-respecting ROI
//                 roiAmount = Number(
//                   Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
//                 );
//               }
//             }
//           }
//         }
//       }
//     }

//     // 🚫 GLOBAL GUARD: max 3 consecutive fails
//     const lastTrades = await Roi.find({ userId })
//       .session(session)
//       .sort({ creditedOn: -1 })
//       .limit(3);

//     const last3Failed =
//       lastTrades.length === 3 &&
//       lastTrades.every((tr) => tr.status === "failed");

//     const allowOverride = !L6_forceFailMode && !L6_hardCapLock;

//     if (allowOverride && last3Failed && failTrade) {
//       const stillRemaining = Number(
//         (
//           allowedProfit -
//           (user.totalEarningsInCycle || 0) -
//           (user.pendingLevelIncome || 0)
//         ).toFixed(2)
//       );

//       if (stillRemaining > 0.01 && rawProfit > 0) {
//         roiAmount = Number(Math.min(rawProfit, stillRemaining).toFixed(2));
//         failTrade = false;

//         console.log(
//           "🚨 [OVERRIDE] Stopping 4th consecutive FAIL → Forced SUCCESS (with ROI)"
//         );
//       } else {
//         console.log(
//           "🚨 [OVERRIDE] 4th FAIL allowed because cap is fully used; no 0-ROI success."
//         );
//       }
//     }

//     // Final guard: never mark success with 0 ROI
//     if (!failTrade && roiAmount <= 0) {
//       failTrade = true;
//       roiAmount = 0;
//     }

//     console.log("✅[TRADE RESULT]", {
//       t,
//       level,
//       failTrade,
//       roiAmount,
//       tradeAmount,
//       usedProfitBefore: usedProfit,
//       levelUsed,
//       roiUsed: user.totalEarningsInCycle,
//       isL3LockedStage,
//       isL4LockedStage,
//     });

//     // ---------------- COIN SPLIT ----------------
//     let coinsMeta = [];
//     try {
//       coinsMeta = await getRandomCoinsWithImages(20);
//     } catch {
//       coinsMeta = Array.from({ length: 20 }).map((_, i) => ({
//         symbol: `COIN${i + 1}`,
//         name: `Coin ${i + 1}`,
//         image: "",
//       }));
//     }

//     const investedSplit = randomSplit(tradeAmount, coinsMeta.length);
//     const profitSplit = failTrade
//       ? Array(coinsMeta.length).fill(0)
//       : randomSplit(roiAmount, coinsMeta.length);

//     const coinResults = coinsMeta.map((c, i) => ({
//       ...c,
//       invested: investedSplit[i],
//       profit: profitSplit[i],
//       returned: investedSplit[i] + profitSplit[i],
//     }));

//     // ---------------- WALLET DEDUCTION ----------------
//     const usedMain = Math.min(user.mainWallet, tradeAmount);
//     const usedBonus = Number((tradeAmount - usedMain).toFixed(2));

//     user.mainWallet = Number((user.mainWallet - usedMain).toFixed(2));
//     user.BonusCredit = Number((user.BonusCredit - usedBonus).toFixed(2));

//     if (!failTrade && roiAmount > 0) {
//       user.totalEarningsInCycle = Number((roiUsed + roiAmount).toFixed(2));
//     }

//     user.cycleTradeCount = prevCycleTrades + 1;

//     const usedProfitAfter =
//       (user.totalEarningsInCycle || 0) + (user.pendingLevelIncome || 0);

//     // ---------------- CYCLE COMPLETE CHECK ----------------
//     let cycleCompleted = false;

//     // Rule-1: Cap must be full hit
//     if (usedProfitAfter >= allowedProfit - 0.01 && allowedProfit > 0) {
//       cycleCompleted = true;
//     }

//     // Rule-2: Level-6 minimum 90 trades required for ANY reset
//     if (level === 6 && user.cycleTradeCount < 90) {
//       cycleCompleted = false;
//     }

//     if (cycleCompleted) {
//       user.cycleCount += 1;

//       // ⭐ EFFECTIVE CAPITAL = walletAfterTrade + tradeAmount
//       const walletAfterTrade = Number(
//         (user.mainWallet + user.BonusCredit).toFixed(2)
//       );
//       const effectiveCapital = Number(
//         (walletAfterTrade + tradeAmount).toFixed(2)
//       );

//       let newPrincipal;

//       if (level === 3) {
//         if (user.doubleBase < minInvestment * 2 - 0.01) {
//           newPrincipal = Math.min(
//             2 * minInvestment,
//             maxInvestment,
//             effectiveCapital
//           );
//         } else if (user.doubleBase < maxInvestment - 0.01) {
//           newPrincipal = Math.min(maxInvestment, effectiveCapital);
//         } else {
//           newPrincipal = Math.min(maxInvestment, effectiveCapital);
//         }
//       } else if (level === 4) {
//         newPrincipal = Math.min(maxInvestment, effectiveCapital);
//       } else if (level === 5) {
//         newPrincipal = Math.min(effectiveCapital, maxInvestment);
//       } else if (level === 6) {
//         newPrincipal = Math.min(effectiveCapital, maxInvestment);
//       } else {
//         newPrincipal = Math.min(effectiveCapital, maxInvestment);
//       }

//       user.cyclePrincipal = Number(newPrincipal.toFixed(2));
//       user.cycleWithdrawn = 0;
//       user.block1Fails = 0;
//       user.block2Fails = 0;
//       user.capHit = false;
//       user.remainingTradesAfterCap = 0;
//       user.remainingSuccessNeeded = 0;

//       recalcDoubleBaseAndTarget();

//       user.cycleStartDate = new Date();
//       user.totalEarningsInCycle = 0;
//       user.pendingLevelIncome = 0;
//       user.cycleTradeCount = 0;
//       user.lastCycleLevel = level;

//       console.log("🔁[CYCLE RESET]", {
//         level,
//         effectiveCapital,
//         newPrincipal: user.cyclePrincipal,
//         doubleBase: user.doubleBase,
//         doubleTarget: user.doubleTarget,
//         cycleCount: user.cycleCount,
//       });
//     }

//     // ---------------- SAVE ROI ENTRY (TRANSACTIONAL) ----------------
//     await Roi.create(
//       [
//         {
//           userId,
//           investment: Number(tradeAmount.toFixed(2)),
//           mainWalletUsed: Number(usedMain.toFixed(2)),
//           bonusWalletUsed: Number(usedBonus.toFixed(2)),
//           compoundInvestmentAmount: principal,
//           roiAmount: Number(roiAmount.toFixed(2)),
//           percentage: roiPercentPerTrade,
//           status: failTrade ? "failed" : "success",
//           coinResults,
//           isClaimed: false,
//           creditedOn: new Date(),
//         },
//       ],
//       { session }
//     );

//     // ---------------- AI CREDITS ----------------
//     const creditConfig = await ReferralTradeCredit.findOne().session(session);
//     const creditValue = creditConfig?.tradeCredit ?? 3;
//     user.aiCredits = (user.aiCredits || 0) + creditValue;

//     // ---------------- STATS UPDATE ----------------
//     user.totalTradeCount = (user.totalTradeCount || 0) + 1;
//     if (failTrade) {
//       user.totalFailedTrades = (user.totalFailedTrades || 0) + 1;
//     } else {
//       user.totalSuccessfulTrades = (user.totalSuccessfulTrades || 0) + 1;
//     }

//     user.lastTradeDate = new Date();
//     user.tradeTimer = timer || "";
//     user.isTrading = true;
//     user.isAiBtnClick = true;

//     // 🔥 SINGLE ATOMIC USER UPDATE INSTEAD OF user.save()
//     const updateData = {
//       mainWallet: user.mainWallet,
//       BonusCredit: user.BonusCredit,
//       totalEarningsInCycle: user.totalEarningsInCycle,
//       pendingLevelIncome: user.pendingLevelIncome,
//       cycleTradeCount: user.cycleTradeCount,
//       cyclePrincipal: user.cyclePrincipal,
//       cycleWithdrawn: user.cycleWithdrawn,
//       cycleStartDate: user.cycleStartDate,
//       block1Fails: user.block1Fails,
//       block2Fails: user.block2Fails,
//       capHit: user.capHit,
//       remainingTradesAfterCap: user.remainingTradesAfterCap,
//       remainingSuccessNeeded: user.remainingSuccessNeeded,
//       doubleBase: user.doubleBase,
//       doubleTarget: user.doubleTarget,
//       cycleCount: user.cycleCount,
//       lastCycleLevel: user.lastCycleLevel,
//       totalTradeCount: user.totalTradeCount,
//       totalSuccessfulTrades: user.totalSuccessfulTrades,
//       totalFailedTrades: user.totalFailedTrades,
//       lastTradeDate: user.lastTradeDate,
//       tradeTimer: user.tradeTimer,
//       isTrading: user.isTrading,
//       isAiBtnClick: user.isAiBtnClick,
//       aiCredits: user.aiCredits,
//     };

//     await UserModel.updateOne(
//       { _id: user._id },
//       { $set: updateData },
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({ success: true });
//   } catch (err) {
//     console.error("AI Trade Error:", err);
//     await session.abortTransaction();
//     session.endSession();
//     return res
//       .status(500)
//       .json({ success: false, message: "Error in trading" });
//   }
// };

const coinNameMap = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "polygon",
  DOT: "polkadot",
  SHIB: "shiba-inu",
  AVAX: "avalanche-2",
  LTC: "litecoin",
  TRX: "tron",
  LINK: "chainlink",
  UNI: "uniswap",
  XLM: "stellar",
  ATOM: "cosmos",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  NEAR: "near",
  FIL: "filecoin",
  ICP: "internet-computer",
  PEPE: "pepe",
  SUI: "sui",
  BONK: "bonk",
  SEI: "sei-network",
  HBAR: "hedera-hashgraph",
  GRT: "the-graph",
  RUNE: "thorchain",
};

function randomSplit(total, parts) {
  if (parts <= 0) return [];
  if (total === 0) return Array(parts).fill(0);
  const w = Array.from({ length: parts }, () => Math.random());
  const s = w.reduce((a, b) => a + b, 0);
  const raw = w.map((v) => (v / s) * total);
  const round = raw.map((v) => parseFloat(v.toFixed(2)));
  const diff = parseFloat(
    (total - round.reduce((a, b) => a + b, 0)).toFixed(2)
  );
  round[0] += diff;
  return round;
}

export async function getRandomCoinsWithImages(count = 20) {
  try {
    const allCoins = Object.entries(coinNameMap).map(([symbol, id]) => ({
      symbol,
      id,
    }));

    const selected = allCoins.sort(() => Math.random() - 0.5).slice(0, count);

    const ids = selected.map((c) => c.id).join(",");

    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
    const { data } = await axios.get(url);

    return selected.map((coin) => {
      const found = data.find((d) => d.id === coin.id);
      return {
        symbol: coin.symbol,
        name: found?.name || coin.id,
        image:
          found?.image ||
          "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
        current_price: found?.current_price || null,
      };
    });
  } catch (err) {
    console.error("Coin fetch error:", err.message);
    return Array.from({ length: count }).map(() => ({
      symbol: "BTC",
      name: "Bitcoin",
      image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      current_price: 0,
    }));
  }
}

export const triggerAITradeRoi = async (req, res) => {
  try {
    const userId = req.user._id;
    const { timer } = req.body;

    // ---------------- PENDING TRADE CHECK ----------------
    const pendingTrade = await Roi.findOne({ userId, isClaimed: false });
    if (pendingTrade) {
      return res.status(400).json({
        success: false,
        message: "Please claim the previous trade before starting a new one.",
      });
    }

    // ---------------- USER + LEVEL CHECK ----------------
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // ⛔ HARD BLOCK AFTER DOWNGRADE
    // ⛔ 24 HOUR COOLDOWN AFTER DOWNGRADE
    if (user.tradeLocked === true) {
      if (
        user.tradeLockUntil &&
        Date.now() < new Date(user.tradeLockUntil).getTime()
      ) {
        return res.status(403).json({
          success: false,
          message: "Account downgraded. Trading locked for 24 hours.",
        });
      }

      user.tradeLocked = false;
      user.tradeLockUntil = null;
      await user.save();
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // if (
    //   user.lastTradeDay &&
    //   new Date(user.lastTradeDay).getTime() === today.getTime()
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: `You already placed a trade today at Level ${user.lastTradeLevel}.
    //    You can trade again tomorrow as per your current level.`,
    //   });
    // }

    const level = user.level || 0;
    if (level === 0) {
      return res.status(400).json({
        success: false,
        message: "Level 0 cannot trade",
      });
    }

    if (user.level === 1 || user.level === 2) {
      if (user.todayTradeCount >= 1) {
        return res.status(400).json({
          success: false,
          message: "You reached your daily limit. Please come back tomorrow.",
        });
      }
    }

    if (user.level === 3 || user.level === 4) {
      if (user.todayTradeCount >= 2) {
        return res.status(400).json({
          success: false,
          message: "You reached your daily limit. Please come back tomorrow.",
        });
      }
    }

    if (user.level === 5 || user.level === 6) {
      if (user.todayTradeCount >= 3) {
        return res.status(400).json({
          success: false,
          message: "You reached your daily limit. Please come back tomorrow.",
        });
      }
    }

    if (user.lastCycleLevel === undefined || user.lastCycleLevel === null) {
      user.lastCycleLevel = level;
    }

    // ✅ ONLY UPGRADE → full reset
    else if (
      level > user.lastCycleLevel &&
      level > (user.maxLevelAchieved || 0)
    ) {
      user.cyclePrincipal = 0;
      user.cycleWithdrawn = 0;
      user.totalEarningsInCycle = 0;
      user.pendingLevelIncome = 0;
      user.cycleTradeCount = 0;
      user.cycleStartDate = new Date();
      user.doubleBase = 0;
      user.doubleTarget = 0;
      user.block1Fails = 0;
      user.block2Fails = 0;
      user.capHit = false;
      user.remainingTradesAfterCap = 0;
      user.remainingSuccessNeeded = 0;
      user.lastCycleLevel = level;
    }

    // ✅ DOWNGRADE → NO RESET, sirf reference update
    else if (level < user.lastCycleLevel) {
      user.lastCycleLevel = level;
    }

    // ---------------- WALLET SNAPSHOT (PRE-TRADE) ----------------
    const mainWalletBeforeTrade = user.mainWallet || 0;
    const bonusWalletBeforeTrade = user.BonusCredit || 0;
    const tradingWallet = Number(
      (mainWalletBeforeTrade + bonusWalletBeforeTrade).toFixed(2)
    );

    if (tradingWallet <= 0) {
      return res.status(400).json({
        success: false,
        message: "Wallet empty!",
      });
    }

    // ---------------- LEVEL CONFIG LOAD ----------------
    const levelConfig = await RoiLevel.findOne({ level });
    if (!levelConfig) {
      return res.status(400).json({
        success: false,
        message: `ROI config missing for Level ${level}`,
      });
    }

    const { minInvestment, maxInvestment, minPercent } = levelConfig;

    // ---------------- INIT NULLABLE FIELDS ----------------
    if (user.totalEarningsInCycle == null) user.totalEarningsInCycle = 0;
    if (user.pendingLevelIncome == null) user.pendingLevelIncome = 0;
    if (user.cycleCount == null) user.cycleCount = 0;
    if (user.cyclePrincipal == null) user.cyclePrincipal = 0;
    if (user.cycleTradeCount == null) user.cycleTradeCount = 0;
    if (user.cycleWithdrawn == null) user.cycleWithdrawn = 0;
    if (!user.cycleStartDate) user.cycleStartDate = new Date();
    if (user.block1Fails == null) user.block1Fails = 0;
    if (user.block2Fails == null) user.block2Fails = 0;
    if (user.capHit == null) user.capHit = false;
    if (user.remainingTradesAfterCap == null) user.remainingTradesAfterCap = 0;
    if (user.remainingSuccessNeeded == null) user.remainingSuccessNeeded = 0;

    // ---------------- HELPER: RECALC DOUBLE BASE/TARGET ----------------
    const recalcDoubleBaseAndTarget = () => {
      let base = Number((user.cyclePrincipal || 0).toFixed(2));
      if (base > maxInvestment) base = maxInvestment;
      user.cyclePrincipal = base;

      // LEVEL 2 SPECIAL
      if (level === 2) {
        if (base >= 750 && base <= 800) {
          user.doubleBase = base;
          user.doubleTarget = 1500;
        } else if (base >= 1400) {
          user.doubleBase = base;
          user.doubleTarget = Number((base * 1.5).toFixed(2));
        } else {
          user.doubleBase = base;
          user.doubleTarget = Number((base * 2).toFixed(2));
        }
        return;
      }

      // LEVEL 3 SPECIAL:
      // Stage-1: 1500 -> 3000
      // Stage-2: 3000 -> 4000
      // Stage-3 (locked): 4000 -> 6000 (50% profit cycle)
      if (level === 3) {
        user.doubleBase = base;

        const firstStageCap = Math.min(2 * minInvestment, maxInvestment); // 1500*2=3000

        if (base < firstStageCap) {
          const target = Math.min(base * 2, firstStageCap);
          user.doubleTarget = Number(target.toFixed(2));
        } else if (base < maxInvestment - 0.01) {
          user.doubleTarget = Number(maxInvestment.toFixed(2));
        } else {
          user.doubleBase = Number(maxInvestment.toFixed(2)); // lock 4000
          const target = maxInvestment * 1.5; // 4000 -> 6000
          user.doubleTarget = Number(target.toFixed(2));
        }
        return;
      }

      // LEVEL 4: 4000→8000 (double), then 50% cycle 8000→12000
      if (level === 4) {
        user.doubleBase = base;

        if (base < maxInvestment - 0.01) {
          const target = maxInvestment; // 8000
          user.doubleTarget = Number(target.toFixed(2));
        } else {
          user.doubleBase = Number(maxInvestment.toFixed(2)); // 8000
          const target = maxInvestment * 1.5; // 12000
          user.doubleTarget = Number(target.toFixed(2));
        }
        return;
      }

      // LEVEL 5: staged double then 50% at maxInvestment
      if (level === 5) {
        user.doubleBase = base;
        const firstStageCap = 2 * minInvestment;

        if (base < firstStageCap) {
          let target = base * 2;
          if (target > maxInvestment) target = maxInvestment;
          user.doubleTarget = Number(target.toFixed(2));
        } else if (base < maxInvestment) {
          let target = base * 2;
          if (target > maxInvestment) target = maxInvestment;
          user.doubleTarget = Number(target.toFixed(2));
        } else {
          const target = base * 1.5;
          user.doubleTarget = Number(target.toFixed(2));
        }
        return;
      }

      // ⭐ LEVEL 6 (FIXED) ⭐
      // Phase-1: base < maxInvestment → target = maxInvestment (e.g. 30k -> 50k)
      // Phase-2 (LOCKED): base >= maxInvestment → target = base + 20k (cap)
      if (level === 6) {
        let baseL6 = Number((user.cyclePrincipal || 0).toFixed(2));
        if (baseL6 > maxInvestment) baseL6 = maxInvestment;

        user.cyclePrincipal = baseL6;

        // GROWTH PHASE
        if (baseL6 < maxInvestment - 0.01) {
          user.doubleBase = baseL6;
          user.doubleTarget = maxInvestment; // fixed 50k target
          return;
        }

        // LOCKED PHASE: base >= 50k
        user.doubleBase = Number(maxInvestment.toFixed(2)); // lock at 50k
        const target = maxInvestment + 20000; // +20k cap
        user.doubleTarget = Number(target.toFixed(2));
        return;
      }

      // LEVEL 1: 2x
      user.doubleBase = base;
      user.doubleTarget = Number((base * 2).toFixed(2));
    };

    // -------- WITHDRAW HANDLING + PRINCIPAL SETUP ORDER --------
    if (user.cycleWithdrawn > 0) {
      const withdrawAmt = Number(user.cycleWithdrawn.toFixed(2));

      // principal ko ghatao based on withdraw taken during cycle
      user.cyclePrincipal = Math.max(
        Number((user.cyclePrincipal - withdrawAmt).toFixed(2)),
        0
      );

      console.log("📉 Withdrawal applied on principal", {
        withdrawAmt,
        newCyclePrincipal: user.cyclePrincipal,
      });

      // withdraw reset
      user.cycleWithdrawn = 0;
    }
    const walletEffectiveNow = Number(
      (user.mainWallet + user.BonusCredit).toFixed(2)
    );
    if (user.cyclePrincipal > walletEffectiveNow) {
      user.cyclePrincipal = walletEffectiveNow;
    }

    //added new for 20k fixed
    if (level === 6) {
      user.cyclePrincipal = 30000; // principal always 30k
      user.doubleBase = 30000; // base also fixed
      user.doubleTarget = 50000; // 20k profit cycle
    }

    // If principal 0 → pick from MAIN WALLET (but clamp by maxInvestment)
    if (!user.cyclePrincipal || user.cyclePrincipal <= 0) {
      let newPrincipal;

      if (level === 1) {
        // ✅ LEVEL-1: sirf MAIN WALLET se principal बनेगा (BONUS ignore)
        newPrincipal = Number(mainWalletBeforeTrade.toFixed(2));
        if (newPrincipal > maxInvestment) newPrincipal = maxInvestment;
      } else if (level === 4) {
        // Level-4: minimum lock rule
        if (mainWalletBeforeTrade >= minInvestment) {
          newPrincipal = minInvestment;
        } else {
          newPrincipal = mainWalletBeforeTrade;
        }
      } else {
        newPrincipal = Number(mainWalletBeforeTrade.toFixed(2));
        if (newPrincipal > maxInvestment) newPrincipal = maxInvestment;
      }

      user.cyclePrincipal = Number(newPrincipal.toFixed(2));
      user.totalEarningsInCycle = 0;
      user.pendingLevelIncome = 0;
      user.cycleTradeCount = 0;
      user.cycleStartDate = new Date();
      user.block1Fails = 0;
      user.block2Fails = 0;
      user.capHit = false;
      user.remainingTradesAfterCap = 0;
      user.remainingSuccessNeeded = 0;
    }

    const principal = Number(user.cyclePrincipal.toFixed(2));

    recalcDoubleBaseAndTarget();

    const isLevel3 = level === 3;
    const isL3LockedStage = isLevel3 && user.doubleBase >= maxInvestment - 0.01; // base=4000 locked

    const isLevel4 = level === 4;
    const isL4LockedStage = isLevel4 && user.doubleBase >= maxInvestment - 0.01; // base=8000 locked

    // ---------------- PROFIT USED (ROI + LEVEL) ----------------
    const roiUsed = Number((user.totalEarningsInCycle || 0).toFixed(2));
    const levelUsed = Number((user.pendingLevelIncome || 0).toFixed(2));
    let usedProfit = Number((roiUsed + levelUsed).toFixed(2)); // cap includes levelIncome
    const prevCycleTrades = user.cycleTradeCount || 0;

    // ---------------- LEVEL CONFIG ----------------
    const CYCLE_DAYS = 45;
    let tradesPerDay = 1;
    let safetyGap = 0;
    let enforceTradeTarget = false; // RESET CONCEPT HATA DIYA

    if (level === 1) {
      tradesPerDay = 1;
      safetyGap = 0;
    } else if (level === 2) {
      tradesPerDay = 1;
      safetyGap = 8;
      enforceTradeTarget = true; // ONLY fail distribution ke liye use hoga
    } else if (level === 3) {
      tradesPerDay = 2;
      safetyGap = 10;
      enforceTradeTarget = true;
    } else if (level === 4) {
      tradesPerDay = 2;
      safetyGap = 10;
      enforceTradeTarget = false; // L4 reset only cap se
    } else if (level === 5 || level === 6) {
      tradesPerDay = 3;
      safetyGap = 20;
      enforceTradeTarget = true; // sirf fail distribution, reset cap se
    }

    const cycleTradeTarget = CYCLE_DAYS * tradesPerDay;

    // ---------------- TRADE AMOUNT (63% RULE + TRADE CAP) ----------------
    let tradeAmount = 0;
    if (level === 1) {
      tradeAmount = Math.min(tradingWallet, maxInvestment);
    } else {
      const extra = tradingWallet - minInvestment;
      if (extra <= 0) {
        tradeAmount = Math.min(minInvestment, tradingWallet);
      } else {
        tradeAmount = minInvestment + extra * 0.63;
        tradeAmount = Math.min(tradeAmount, tradingWallet, maxInvestment);
      }
    }

    tradeAmount = Number(tradeAmount.toFixed(2));
    if (tradeAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Not enough balance to trade",
      });
    }

    // ---------------- ROI PER TRADE ----------------
    const baseDailyPercent = minPercent;
    const roiPercentPerTrade = Number(
      (baseDailyPercent / tradesPerDay).toFixed(4)
    );
    let rawProfit = Number(
      ((tradeAmount * roiPercentPerTrade) / 100).toFixed(2)
    );

    // ---------------- PROFIT CAP (ROI + LEVEL) ----------------
    let profitCap = Number((user.doubleTarget - user.doubleBase).toFixed(2));
    if (profitCap < 0) profitCap = 0;

    let allowedProfit = Number((profitCap - safetyGap).toFixed(2));
    // Level 3+ → full cap, no safety gap
    if (level >= 3) {
      allowedProfit = profitCap;
    }
    if (allowedProfit < 0) allowedProfit = 0;

    // Agar kisi wajah se usedProfit > allowedProfit aa gaya hai, toh clamp karo
    if (usedProfit > allowedProfit) {
      const overflow = Number((usedProfit - allowedProfit).toFixed(2));
      let newRoiUsed = roiUsed - overflow;
      if (newRoiUsed < 0) newRoiUsed = 0;
      user.totalEarningsInCycle = Number(newRoiUsed.toFixed(2));
      usedProfit = user.totalEarningsInCycle + (user.pendingLevelIncome || 0);
    }

    let remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));

    // ================= FAIL LOGIC =================
    let roiAmount = rawProfit;
    let failTrade = false;

    const t = prevCycleTrades + 1;
    const tradesLeftIncludingThis = cycleTradeTarget - prevCycleTrades;
    // LEVEL-6 SAFETY MODE  🚫
    // Prevent early cycle success due ONLY to Level Income
    let L6_forceFailMode = false;
    let L6_hardCapLock = false;

    if (level === 6) {
      const roiOnlyProfit = user.totalEarningsInCycle || 0;
      const lvlProfit = user.pendingLevelIncome || 0;

      const capHitByLevelIncomeOnly =
        lvlProfit >= allowedProfit - 0.5 &&
        roiOnlyProfit < allowedProfit * 0.25 &&
        usedProfit >= allowedProfit - 0.5;

      if (capHitByLevelIncomeOnly && t < 90) {
        L6_forceFailMode = true;
        failTrade = true;
        roiAmount = 0;
        // console.log(
        //   "🚫[L6] Force fail until t>=90 because Level-Income capped early"
        // );
      }

      if (
        !L6_forceFailMode &&
        usedProfit >= allowedProfit - 0.01 &&
        prevCycleTrades >= 1 &&
        prevCycleTrades < 90
      ) {
        L6_hardCapLock = true;
        failTrade = true;
        roiAmount = 0;
        // console.log(
        //   "❌[L6] Hard cap lock active → forcing fails until 90 trades"
        // );
      }
    }

    // ⛔ Block all success override if forced fail mode engaged
    if (L6_forceFailMode || L6_hardCapLock) {
      remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));
    }

    // ---- STEP 1: BASIC CAP CHECK ----
    if (!L6_forceFailMode && !L6_hardCapLock) {
      if (remainingProfit <= 0.01 || allowedProfit === 0) {
        failTrade = true;
        roiAmount = 0;
        console.log("⚠️[FAIL] Cap exhausted, trade:", t);
      } else {
        let blockFail = false;

        // BLOCK 1: trades 1–10 → exactly 3 fails
        if (t >= 1 && t <= 10) {
          const blockSize = 10;
          const maxFails = 3;
          const usedFails = user.block1Fails || 0;
          const remainingTradesInBlock = blockSize - t + 1;
          const remainingFailsToAssign = maxFails - usedFails;

          if (remainingFailsToAssign > 0) {
            if (remainingTradesInBlock === remainingFailsToAssign) {
              blockFail = true;
            } else {
              const prob = remainingFailsToAssign / remainingTradesInBlock;
              if (Math.random() < prob) blockFail = true;
            }
          }

          if (blockFail) {
            user.block1Fails = usedFails + 1;
          }
        }

        // BLOCK 2: trades 11–20 → exactly 2 fails
        if (!blockFail && t >= 11 && t <= 20) {
          const maxFails = 2;
          const usedFails = user.block2Fails || 0;
          const tradeIndexInBlock = t - 10; // 1–10
          const remainingTradesInBlock = 10 - tradeIndexInBlock + 1;
          const remainingFailsToAssign = maxFails - usedFails;

          if (remainingFailsToAssign > 0) {
            if (remainingTradesInBlock === remainingFailsToAssign) {
              blockFail = true;
            } else {
              const prob = remainingFailsToAssign / remainingTradesInBlock;
              if (Math.random() < prob) blockFail = true;
            }
          }

          if (blockFail) {
            user.block2Fails = usedFails + 1;
          }
        }

        if (blockFail) {
          failTrade = true;
          roiAmount = 0;
        } else {
          if (level <= 2) {
            // ⭐ Level 1–2: old style (random + cap-safe)
            const neededSuccessTrades =
              rawProfit > 0 ? remainingProfit / rawProfit : Infinity;
            const bufferTrades = tradesLeftIncludingThis - neededSuccessTrades;

            let capSafeFailChance;
            if (bufferTrades <= 0) {
              capSafeFailChance = 0;
            } else {
              capSafeFailChance = Math.min(
                0.8,
                bufferTrades / tradesLeftIncludingThis
              );
            }

            let baseFailChance = 0;
            if (remainingProfit <= rawProfit * 3) {
              baseFailChance = 0.6;
            } else if (remainingProfit <= rawProfit * 8) {
              baseFailChance = 0.35;
            } else {
              baseFailChance = 0.15;
            }

            let failChance = Math.min(baseFailChance, capSafeFailChance);

            // Cap ke bilkul paas ho → success enforce
            if (remainingProfit <= rawProfit + 0.05) {
              failChance = 0;
            }

            if (failChance > 0 && Math.random() < failChance) {
              failTrade = true;
              roiAmount = 0;
            } else {
              failTrade = false;
              roiAmount = Number(
                Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
              );
            }
          } else {
            // ⭐ SCHEDULE LOGIC FOR LEVEL 3+ (L3, L4, L5, L6)
            const expectedProfitPerTrade =
              cycleTradeTarget > 0 ? allowedProfit / cycleTradeTarget : 0;
            const expectedProfitSoFar = expectedProfitPerTrade * t;
            const profitAhead = usedProfit - expectedProfitSoFar;
            const profitAheadInTrades =
              expectedProfitPerTrade > 0
                ? profitAhead / expectedProfitPerTrade
                : 0;

            let baseFailChance;

            // ⭐ SCHEDULE LOGIC FOR LEVEL 3+ with tougher Level-6
            if (level === 6) {
              if (profitAheadInTrades > 18) {
                baseFailChance = 0.9; // 90% fail
              } else if (profitAheadInTrades > 10) {
                baseFailChance = 0.75;
              } else if (profitAheadInTrades > 4) {
                baseFailChance = 0.6;
              } else if (profitAheadInTrades < -18) {
                baseFailChance = 0.12;
              } else if (profitAheadInTrades < -10) {
                baseFailChance = 0.18;
              } else if (profitAheadInTrades < -4) {
                baseFailChance = 0.25;
              } else {
                baseFailChance = 0.4;
              }
            } else {
              if (profitAheadInTrades > 18) {
                baseFailChance = 0.8;
              } else if (profitAheadInTrades > 10) {
                baseFailChance = 0.65;
              } else if (profitAheadInTrades > 4) {
                baseFailChance = 0.5;
              } else if (profitAheadInTrades < -18) {
                baseFailChance = 0.08;
              } else if (profitAheadInTrades < -10) {
                baseFailChance = 0.12;
              } else if (profitAheadInTrades < -4) {
                baseFailChance = 0.2;
              } else {
                baseFailChance = 0.3;
              }
            }

            // CAP ke bahut paas jaldi aa gaye ho:
            if (remainingProfit <= rawProfit * 8 && t < cycleTradeTarget - 20) {
              baseFailChance = Math.max(baseFailChance, 0.45);
            }
            if (remainingProfit <= rawProfit * 3 && t < cycleTradeTarget - 10) {
              baseFailChance = Math.max(baseFailChance, 0.6);
            }

            // Last 15–20 trades: success bias zyda (distribution only)
            if (t >= cycleTradeTarget - 15) {
              baseFailChance = Math.min(baseFailChance, 0.4);
            } else if (t >= cycleTradeTarget - 25) {
              baseFailChance = Math.min(baseFailChance, 0.5);
            }

            let failChance = baseFailChance;
            failChance = Math.min(Math.max(failChance, 0.05), 0.85);

            // Agar ye trade hi cap close kar sakta hai → success enforce
            if (remainingProfit <= rawProfit + 0.05) {
              failChance = 0;
            }

            if (failChance > 0 && Math.random() < failChance) {
              failTrade = true;
              roiAmount = 0;
            } else {
              failTrade = false;

              if (level === 3 && user.doubleBase < maxInvestment) {
                // ⭐ Level-3 → Stage1 (1500-3000) & Stage2 (3000-4000)
                // Always give FULL ROI on success
                roiAmount = rawProfit;
              } else {
                // L3 locked, L4, L5, L6 → cap-respecting ROI
                roiAmount = Number(
                  Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
                );
              }
            }
          }
        }
      }
    }

    // 🚫 GLOBAL GUARD: max 3 consecutive fails
    const lastTrades = await Roi.find({ userId })
      .sort({ creditedOn: -1 })
      .limit(3);

    const last3Failed =
      lastTrades.length === 3 &&
      lastTrades.every((tr) => tr.status === "failed");

    const allowOverride = !L6_forceFailMode && !L6_hardCapLock;

    if (allowOverride && last3Failed && failTrade) {
      const stillRemaining = Number(
        (
          allowedProfit -
          (user.totalEarningsInCycle || 0) -
          (user.pendingLevelIncome || 0)
        ).toFixed(2)
      );

      if (stillRemaining > 0.01 && rawProfit > 0) {
        // Cap ke andar room hai -> forced success with ROI
        roiAmount = Number(Math.min(rawProfit, stillRemaining).toFixed(2));
        failTrade = false;

        // console.log(
        //   "🚨 [OVERRIDE] Stopping 4th consecutive FAIL → Forced SUCCESS (with ROI)"
        // );
      } else {
        // console.log(
        //   "🚨 [OVERRIDE] 4th FAIL allowed because cap is fully used; no 0-ROI success."
        // );
      }
    }

    // Final guard: never mark success with 0 ROI
    if (!failTrade && roiAmount <= 0) {
      failTrade = true;
      roiAmount = 0;
    }

    // ✅ HARD OVERRIDE: LEVEL-1 ME KABHI FAIL NAHI HOGA
    if (level === 1) {
      failTrade = false;

      // ROI hamesha milega (cap ke andar clamp hoke)
      if (remainingProfit > 0) {
        roiAmount = Number(
          Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
        );
      } else {
        // Cap even agar logically khatam ho jaaye, phir bhi 0 kabhi nahi
        roiAmount = Number(rawProfit.toFixed(2));
      }
    }
    let coinsMeta = [];
    try {
      coinsMeta = await getRandomCoinsWithImages(20);
    } catch {
      coinsMeta = Array.from({ length: 20 }).map((_, i) => ({
        symbol: `COIN${i + 1}`,
        name: `Coin ${i + 1}`,
        image: "",
      }));
    }

    const investedSplit = randomSplit(tradeAmount, coinsMeta.length);
    const profitSplit = failTrade
      ? Array(coinsMeta.length).fill(0)
      : randomSplit(roiAmount, coinsMeta.length);

    const coinResults = coinsMeta.map((c, i) => ({
      ...c,
      invested: investedSplit[i],
      profit: profitSplit[i],
      returned: investedSplit[i] + profitSplit[i],
    }));

    // ---------------- WALLET DEDUCTION ----------------
    const usedMain = Math.min(user.mainWallet, tradeAmount);
    const usedBonus = Number((tradeAmount - usedMain).toFixed(2));

    user.mainWallet = Number((user.mainWallet - usedMain).toFixed(2));
    user.BonusCredit = Number((user.BonusCredit - usedBonus).toFixed(2));

    if (!failTrade && roiAmount > 0) {
      user.totalEarningsInCycle = Number((roiUsed + roiAmount).toFixed(2));
    }

    user.cycleTradeCount = prevCycleTrades + 1;

    const usedProfitAfter =
      (user.totalEarningsInCycle || 0) + (user.pendingLevelIncome || 0);

    // ---------------- CYCLE COMPLETE CHECK ----------------
    let cycleCompleted = false;

    // Rule-1: Cap must be full hit
    if (usedProfitAfter >= allowedProfit - 0.01 && allowedProfit > 0) {
      cycleCompleted = true;
    }

    // Rule-2: Level-6 minimum 90 trades required for ANY reset
    if (level === 6 && user.cycleTradeCount < 90) {
      cycleCompleted = false;
    }

    if (cycleCompleted) {
      user.cycleCount += 1;

      // ⭐ EFFECTIVE CAPITAL = walletAfterTrade + tradeAmount
      const walletAfterTrade = Number(
        (user.mainWallet + user.BonusCredit).toFixed(2)
      );
      const effectiveCapital = Number(
        (walletAfterTrade + tradeAmount).toFixed(2)
      );

      let newPrincipal;

      if (level === 3) {
        if (user.doubleBase < minInvestment * 2 - 0.01) {
          // Stage-1 → Stage-2 target (3000) but clamp by capital
          newPrincipal = Math.min(
            2 * minInvestment,
            maxInvestment,
            effectiveCapital
          );
        } else if (user.doubleBase < maxInvestment - 0.01) {
          // Stage-2 → lock at 4000 but clamp by capital
          newPrincipal = Math.min(maxInvestment, effectiveCapital);
        } else {
          // Locked stage → try to stay at 4000 but clamp by capital
          newPrincipal = Math.min(maxInvestment, effectiveCapital);
        }
      } else if (level === 4) {
        // L4: base ideally 8000, clamp by capital
        newPrincipal = Math.min(maxInvestment, effectiveCapital);
      } else if (level === 5) {
        // L5: always start from maxInvestment but clamp by capital
        newPrincipal = Math.min(effectiveCapital, maxInvestment);
      } else if (level === 6) {
        // L6: same — principal realistic, based on effective capital
        // newPrincipal = Math.min(effectiveCapital, maxInvestment);
        newPrincipal = 30000;
      } else {
        // OTHER LEVELS (1,2): principal purely from effectiveCapital
        newPrincipal = Math.min(effectiveCapital, maxInvestment);
      }

      user.cyclePrincipal = Number(newPrincipal.toFixed(2));
      user.cycleWithdrawn = 0;
      user.block1Fails = 0;
      user.block2Fails = 0;
      user.capHit = false;
      user.remainingTradesAfterCap = 0;
      user.remainingSuccessNeeded = 0;

      recalcDoubleBaseAndTarget();

      user.cycleStartDate = new Date();
      user.totalEarningsInCycle = 0;
      user.pendingLevelIncome = 0;
      user.cycleTradeCount = 0;
      user.lastCycleLevel = level;
    }

    // ---------------- SAVE ROI ENTRY ----------------
    await Roi.create({
      userId,
      investment: Number(tradeAmount.toFixed(2)),
      mainWalletUsed: Number(usedMain.toFixed(2)),
      bonusWalletUsed: Number(usedBonus.toFixed(2)),
      compoundInvestmentAmount: principal,
      roiAmount: Number(roiAmount.toFixed(2)),
      percentage: roiPercentPerTrade,
      status: failTrade ? "failed" : "success",
      coinResults,
      isClaimed: false,
      creditedOn: new Date(),
    });

    // ---------------- AI CREDITS ----------------
    const creditConfig = await ReferralTradeCredit.findOne();
    const creditValue = creditConfig?.tradeCredit ?? 3;
    user.aiCredits = (user.aiCredits || 0) + creditValue;

    // ---------------- STATS UPDATE ----------------
    user.totalTradeCount = (user.totalTradeCount || 0) + 1;
    if (failTrade) {
      user.totalFailedTrades = (user.totalFailedTrades || 0) + 1;
    } else {
      user.totalSuccessfulTrades = (user.totalSuccessfulTrades || 0) + 1;
    }

    user.lastTradeDate = new Date();
    user.tradeTimer = timer || "";
    user.isTrading = true;
    user.isAiBtnClick = true;
    user.todayTradeCount = (user.todayTradeCount || 0) + 1;
    user.lastTradeDay = today;
    user.lastTradeLevel = user.level;
    await user.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("AI Trade Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error in trading" });
  }
};

// export const triggerAITradeRoi = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { timer } = req.body;

//     // ---------------- PENDING TRADE CHECK ----------------
//     const pendingTrade = await Roi.findOne({ userId, isClaimed: false });
//     if (pendingTrade) {
//       return res.status(400).json({
//         success: false,
//         message: "Please claim the previous trade before starting a new one.",
//       });
//     }

//     // ---------------- USER + LEVEL CHECK ----------------
//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     const level = user.level || 0;
//     if (level === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Level 0 cannot trade",
//       });
//     }

//     if (user.level === 1 || user.level === 2) {
//       if (user.todayTradeCount >= 1) {
//         return res.status(400).json({
//           success: false,
//           message: "You reached your daily limit. Please come back tomorrow.",
//         });
//       }
//     }

//     if (user.level === 3 || user.level === 4) {
//       if (user.todayTradeCount >= 2) {
//         return res.status(400).json({
//           success: false,
//           message: "You reached your daily limit. Please come back tomorrow.",
//         });
//       }
//     }

//     if (user.level === 5 || user.level === 6) {
//       if (user.todayTradeCount >= 3) {
//         return res.status(400).json({
//           success: false,
//           message: "You reached your daily limit. Please come back tomorrow.",
//         });
//       }
//     }

//     // ---------------- LEVEL CHANGE → CYCLE RESET ----------------
//     if (user.lastCycleLevel === undefined || user.lastCycleLevel === null) {
//       user.lastCycleLevel = level;
//     } else if (user.lastCycleLevel !== level) {
//       user.cyclePrincipal = 0;
//       user.cycleWithdrawn = 0;
//       user.totalEarningsInCycle = 0;
//       user.pendingLevelIncome = 0;
//       user.cycleTradeCount = 0;
//       user.cycleStartDate = new Date();
//       user.doubleBase = 0;
//       user.doubleTarget = 0;
//       user.block1Fails = 0;
//       user.block2Fails = 0;
//       user.capHit = false;
//       user.remainingTradesAfterCap = 0;
//       user.remainingSuccessNeeded = 0;
//       user.lastCycleLevel = level;
//     }

//     // ---------------- WALLET SNAPSHOT (PRE-TRADE) ----------------
//     const mainWalletBeforeTrade = user.mainWallet || 0;
//     const bonusWalletBeforeTrade = user.BonusCredit || 0;
//     const tradingWallet = Number(
//       (mainWalletBeforeTrade + bonusWalletBeforeTrade).toFixed(2)
//     );

//     if (tradingWallet <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Wallet empty!",
//       });
//     }

//     // ---------------- LEVEL CONFIG LOAD ----------------
//     const levelConfig = await RoiLevel.findOne({ level });
//     if (!levelConfig) {
//       return res.status(400).json({
//         success: false,
//         message: `ROI config missing for Level ${level}`,
//       });
//     }

//     const { minInvestment, maxInvestment, minPercent } = levelConfig;

//     // ---------------- INIT NULLABLE FIELDS ----------------
//     if (user.totalEarningsInCycle == null) user.totalEarningsInCycle = 0;
//     if (user.pendingLevelIncome == null) user.pendingLevelIncome = 0;
//     if (user.cycleCount == null) user.cycleCount = 0;
//     if (user.cyclePrincipal == null) user.cyclePrincipal = 0;
//     if (user.cycleTradeCount == null) user.cycleTradeCount = 0;
//     if (user.cycleWithdrawn == null) user.cycleWithdrawn = 0;
//     if (!user.cycleStartDate) user.cycleStartDate = new Date();
//     if (user.block1Fails == null) user.block1Fails = 0;
//     if (user.block2Fails == null) user.block2Fails = 0;
//     if (user.capHit == null) user.capHit = false;
//     if (user.remainingTradesAfterCap == null) user.remainingTradesAfterCap = 0;
//     if (user.remainingSuccessNeeded == null) user.remainingSuccessNeeded = 0;

//     // ---------------- HELPER: RECALC DOUBLE BASE/TARGET ----------------
//     const recalcDoubleBaseAndTarget = () => {
//       let base = Number((user.cyclePrincipal || 0).toFixed(2));
//       if (base > maxInvestment) base = maxInvestment;
//       user.cyclePrincipal = base;

//       // LEVEL 2 SPECIAL
//       if (level === 2) {
//         if (base >= 750 && base <= 800) {
//           user.doubleBase = base;
//           user.doubleTarget = 1500;
//         } else if (base >= 1400) {
//           user.doubleBase = base;
//           user.doubleTarget = Number((base * 1.5).toFixed(2));
//         } else {
//           user.doubleBase = base;
//           user.doubleTarget = Number((base * 2).toFixed(2));
//         }
//         return;
//       }

//       // LEVEL 3 SPECIAL:
//       // Stage-1: 1500 -> 3000
//       // Stage-2: 3000 -> 4000
//       // Stage-3 (locked): 4000 -> 6000 (50% profit cycle)
//       if (level === 3) {
//         user.doubleBase = base;

//         const firstStageCap = Math.min(2 * minInvestment, maxInvestment); // 1500*2=3000

//         if (base < firstStageCap) {
//           const target = Math.min(base * 2, firstStageCap);
//           user.doubleTarget = Number(target.toFixed(2));
//         } else if (base < maxInvestment - 0.01) {
//           user.doubleTarget = Number(maxInvestment.toFixed(2));
//         } else {
//           user.doubleBase = Number(maxInvestment.toFixed(2)); // lock 4000
//           const target = maxInvestment * 1.5; // 4000 -> 6000
//           user.doubleTarget = Number(target.toFixed(2));
//         }
//         return;
//       }

//       // LEVEL 4: 4000→8000 (double), then 50% cycle 8000→12000
//       if (level === 4) {
//         user.doubleBase = base;

//         if (base < maxInvestment - 0.01) {
//           const target = maxInvestment; // 8000
//           user.doubleTarget = Number(target.toFixed(2));
//         } else {
//           user.doubleBase = Number(maxInvestment.toFixed(2)); // 8000
//           const target = maxInvestment * 1.5; // 12000
//           user.doubleTarget = Number(target.toFixed(2));
//         }
//         return;
//       }

//       // LEVEL 5: staged double then 50% at maxInvestment
//       if (level === 5) {
//         user.doubleBase = base;
//         const firstStageCap = 2 * minInvestment;

//         if (base < firstStageCap) {
//           let target = base * 2;
//           if (target > maxInvestment) target = maxInvestment;
//           user.doubleTarget = Number(target.toFixed(2));
//         } else if (base < maxInvestment) {
//           let target = base * 2;
//           if (target > maxInvestment) target = maxInvestment;
//           user.doubleTarget = Number(target.toFixed(2));
//         } else {
//           const target = base * 1.5;
//           user.doubleTarget = Number(target.toFixed(2));
//         }
//         return;
//       }

//       // ⭐ LEVEL 6 (FIXED) ⭐
//       // Phase-1: base < maxInvestment → target = maxInvestment (e.g. 30k -> 50k)
//       // Phase-2 (LOCKED): base >= maxInvestment → target = base + 20k (cap)
//       if (level === 6) {
//         let baseL6 = Number((user.cyclePrincipal || 0).toFixed(2));
//         if (baseL6 > maxInvestment) baseL6 = maxInvestment;

//         user.cyclePrincipal = baseL6;

//         // GROWTH PHASE
//         if (baseL6 < maxInvestment - 0.01) {
//           user.doubleBase = baseL6;
//           user.doubleTarget = maxInvestment; // fixed 50k target
//           return;
//         }

//         // LOCKED PHASE: base >= 50k
//         user.doubleBase = Number(maxInvestment.toFixed(2)); // lock at 50k
//         const target = maxInvestment + 20000; // +20k cap
//         user.doubleTarget = Number(target.toFixed(2));
//         return;
//       }

//       // LEVEL 1: 2x
//       user.doubleBase = base;
//       user.doubleTarget = Number((base * 2).toFixed(2));
//     };

//     // -------- WITHDRAW HANDLING + PRINCIPAL SETUP ORDER --------
//     // const withdrawInCycle = Number((user.cycleWithdrawn || 0).toFixed(2));
//     // if (withdrawInCycle > 0) {
//     //   user.cyclePrincipal = Math.max(
//     //     Number((user.cyclePrincipal - withdrawInCycle).toFixed(2)),
//     //     0
//     //   );
//     //   user.cycleWithdrawn = 0;
//     // }

//     // // If principal 0 → pick from MAIN WALLET (but clamp by maxInvestment)
//     // if (!user.cyclePrincipal || user.cyclePrincipal <= 0) {
//     //   let newPrincipal;

//     //   if (level === 4) {
//     //     if (mainWalletBeforeTrade >= minInvestment) {
//     //       newPrincipal = minInvestment; // 4000
//     //     } else {
//     //       newPrincipal = mainWalletBeforeTrade;
//     //     }
//     //   } else {
//     //     newPrincipal = Number(mainWalletBeforeTrade.toFixed(2));
//     //     if (newPrincipal > maxInvestment) newPrincipal = maxInvestment;
//     //   }

//     //   user.cyclePrincipal = Number(newPrincipal.toFixed(2));
//     //   user.totalEarningsInCycle = 0;
//     //   user.pendingLevelIncome = 0;
//     //   user.cycleTradeCount = 0;
//     //   user.cycleStartDate = new Date();
//     //   user.block1Fails = 0;
//     //   user.block2Fails = 0;
//     //   user.capHit = false;
//     //   user.remainingTradesAfterCap = 0;
//     //   user.remainingSuccessNeeded = 0;
//     // }

//     // -------- WITHDRAW HANDLING + PRINCIPAL SETUP ORDER --------
//     if (user.cycleWithdrawn > 0) {
//       const withdrawAmt = Number(user.cycleWithdrawn.toFixed(2));

//       // principal ko ghatao based on withdraw taken during cycle
//       user.cyclePrincipal = Math.max(
//         Number((user.cyclePrincipal - withdrawAmt).toFixed(2)),
//         0
//       );

//       console.log("📉 Withdrawal applied on principal", {
//         withdrawAmt,
//         newCyclePrincipal: user.cyclePrincipal,
//       });

//       // withdraw reset
//       user.cycleWithdrawn = 0;
//     }
//     const walletEffectiveNow = Number(
//       (user.mainWallet + user.BonusCredit).toFixed(2)
//     );
//     if (user.cyclePrincipal > walletEffectiveNow) {
//       user.cyclePrincipal = walletEffectiveNow;
//     }

//     //added new for 20k fixed
//     if (level === 6) {
//       user.cyclePrincipal = 30000; // principal always 30k
//       user.doubleBase = 30000; // base also fixed
//       user.doubleTarget = 50000; // 20k profit cycle
//     }

//     // If principal 0 → pick from MAIN WALLET (but clamp by maxInvestment)
//     if (!user.cyclePrincipal || user.cyclePrincipal <= 0) {
//       let newPrincipal;

//       if (level === 1) {
//         // ✅ LEVEL-1: sirf MAIN WALLET se principal बनेगा (BONUS ignore)
//         newPrincipal = Number(mainWalletBeforeTrade.toFixed(2));
//         if (newPrincipal > maxInvestment) newPrincipal = maxInvestment;
//       } else if (level === 4) {
//         // Level-4: minimum lock rule
//         if (mainWalletBeforeTrade >= minInvestment) {
//           newPrincipal = minInvestment;
//         } else {
//           newPrincipal = mainWalletBeforeTrade;
//         }
//       } else {
//         newPrincipal = Number(mainWalletBeforeTrade.toFixed(2));
//         if (newPrincipal > maxInvestment) newPrincipal = maxInvestment;
//       }

//       user.cyclePrincipal = Number(newPrincipal.toFixed(2));
//       user.totalEarningsInCycle = 0;
//       user.pendingLevelIncome = 0;
//       user.cycleTradeCount = 0;
//       user.cycleStartDate = new Date();
//       user.block1Fails = 0;
//       user.block2Fails = 0;
//       user.capHit = false;
//       user.remainingTradesAfterCap = 0;
//       user.remainingSuccessNeeded = 0;
//     }

//     const principal = Number(user.cyclePrincipal.toFixed(2));

//     recalcDoubleBaseAndTarget();

//     const isLevel3 = level === 3;
//     const isL3LockedStage = isLevel3 && user.doubleBase >= maxInvestment - 0.01; // base=4000 locked

//     const isLevel4 = level === 4;
//     const isL4LockedStage = isLevel4 && user.doubleBase >= maxInvestment - 0.01; // base=8000 locked

//     // ---------------- BASIC DEBUG ----------------
//     console.log("🔹[AI ROI] User:", userId.toString(), {
//       level,
//       principal,
//       doubleBase: user.doubleBase,
//       doubleTarget: user.doubleTarget,
//       mainWalletBeforeTrade,
//       bonusWalletBeforeTrade,
//     });

//     // ---------------- PROFIT USED (ROI + LEVEL) ----------------
//     const roiUsed = Number((user.totalEarningsInCycle || 0).toFixed(2));
//     const levelUsed = Number((user.pendingLevelIncome || 0).toFixed(2));
//     let usedProfit = Number((roiUsed + levelUsed).toFixed(2)); // cap includes levelIncome
//     const prevCycleTrades = user.cycleTradeCount || 0;

//     // ---------------- LEVEL CONFIG ----------------
//     const CYCLE_DAYS = 45;
//     let tradesPerDay = 1;
//     let safetyGap = 0;
//     let enforceTradeTarget = false; // RESET CONCEPT HATA DIYA

//     if (level === 1) {
//       tradesPerDay = 1;
//       safetyGap = 0;
//     } else if (level === 2) {
//       tradesPerDay = 1;
//       safetyGap = 8;
//       enforceTradeTarget = true; // ONLY fail distribution ke liye use hoga
//     } else if (level === 3) {
//       tradesPerDay = 2;
//       safetyGap = 10;
//       enforceTradeTarget = true;
//     } else if (level === 4) {
//       tradesPerDay = 2;
//       safetyGap = 10;
//       enforceTradeTarget = false; // L4 reset only cap se
//     } else if (level === 5 || level === 6) {
//       tradesPerDay = 3;
//       safetyGap = 20;
//       enforceTradeTarget = true; // sirf fail distribution, reset cap se
//     }

//     const cycleTradeTarget = CYCLE_DAYS * tradesPerDay;

//     // ---------------- TRADE AMOUNT (63% RULE + TRADE CAP) ----------------
//     let tradeAmount = 0;
//     if (level === 1) {
//       tradeAmount = Math.min(tradingWallet, maxInvestment);
//     } else {
//       const extra = tradingWallet - minInvestment;
//       if (extra <= 0) {
//         tradeAmount = Math.min(minInvestment, tradingWallet);
//       } else {
//         tradeAmount = minInvestment + extra * 0.63;
//         tradeAmount = Math.min(tradeAmount, tradingWallet, maxInvestment);
//       }
//     }

//     tradeAmount = Number(tradeAmount.toFixed(2));
//     if (tradeAmount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Not enough balance to trade",
//       });
//     }

//     // ---------------- ROI PER TRADE ----------------
//     const baseDailyPercent = minPercent;
//     const roiPercentPerTrade = Number(
//       (baseDailyPercent / tradesPerDay).toFixed(4)
//     );
//     let rawProfit = Number(
//       ((tradeAmount * roiPercentPerTrade) / 100).toFixed(2)
//     );

//     // ---------------- PROFIT CAP (ROI + LEVEL) ----------------
//     let profitCap = Number((user.doubleTarget - user.doubleBase).toFixed(2));
//     if (profitCap < 0) profitCap = 0;

//     let allowedProfit = Number((profitCap - safetyGap).toFixed(2));
//     // Level 3+ → full cap, no safety gap
//     if (level >= 3) {
//       allowedProfit = profitCap;
//     }
//     if (allowedProfit < 0) allowedProfit = 0;

//     // Agar kisi wajah se usedProfit > allowedProfit aa gaya hai, toh clamp karo
//     if (usedProfit > allowedProfit) {
//       const overflow = Number((usedProfit - allowedProfit).toFixed(2));
//       let newRoiUsed = roiUsed - overflow;
//       if (newRoiUsed < 0) newRoiUsed = 0;
//       user.totalEarningsInCycle = Number(newRoiUsed.toFixed(2));
//       usedProfit = user.totalEarningsInCycle + (user.pendingLevelIncome || 0);

//       console.log(
//         "⚖️ [CAP CLAMP] usedProfit > allowedProfit tha, adjust kiya",
//         {
//           oldUsedProfit: roiUsed + levelUsed,
//           newUsedProfit: usedProfit,
//           allowedProfit,
//         }
//       );
//     }

//     let remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));

//     console.log("🔹[CAP DEBUG]", {
//       allowedProfit,
//       usedProfit,
//       remainingProfit,
//       profitCap,
//       safetyGap,
//       roiUsed: user.totalEarningsInCycle,
//       levelUsed,
//     });

//     // ================= FAIL LOGIC =================
//     let roiAmount = rawProfit;
//     let failTrade = false;

//     const t = prevCycleTrades + 1;
//     const tradesLeftIncludingThis = cycleTradeTarget - prevCycleTrades;
//     // LEVEL-6 SAFETY MODE  🚫
//     // Prevent early cycle success due ONLY to Level Income
//     let L6_forceFailMode = false;
//     let L6_hardCapLock = false;

//     if (level === 6) {
//       const roiOnlyProfit = user.totalEarningsInCycle || 0;
//       const lvlProfit = user.pendingLevelIncome || 0;

//       const capHitByLevelIncomeOnly =
//         lvlProfit >= allowedProfit - 0.5 &&
//         roiOnlyProfit < allowedProfit * 0.25 &&
//         usedProfit >= allowedProfit - 0.5;

//       if (capHitByLevelIncomeOnly && t < 90) {
//         L6_forceFailMode = true;
//         failTrade = true;
//         roiAmount = 0;
//         console.log(
//           "🚫[L6] Force fail until t>=90 because Level-Income capped early"
//         );
//       }

//       if (
//         !L6_forceFailMode &&
//         usedProfit >= allowedProfit - 0.01 &&
//         prevCycleTrades >= 1 &&
//         prevCycleTrades < 90
//       ) {
//         L6_hardCapLock = true;
//         failTrade = true;
//         roiAmount = 0;
//         console.log(
//           "❌[L6] Hard cap lock active → forcing fails until 90 trades"
//         );
//       }
//     }

//     // ⛔ Block all success override if forced fail mode engaged
//     if (L6_forceFailMode || L6_hardCapLock) {
//       remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));
//     }

//     // ---- STEP 1: BASIC CAP CHECK ----
//     if (!L6_forceFailMode && !L6_hardCapLock) {
//       if (remainingProfit <= 0.01 || allowedProfit === 0) {
//         failTrade = true;
//         roiAmount = 0;
//         console.log("⚠️[FAIL] Cap exhausted, trade:", t);
//       } else {
//         let blockFail = false;

//         // BLOCK 1: trades 1–10 → exactly 3 fails
//         if (t >= 1 && t <= 10) {
//           const blockSize = 10;
//           const maxFails = 3;
//           const usedFails = user.block1Fails || 0;
//           const remainingTradesInBlock = blockSize - t + 1;
//           const remainingFailsToAssign = maxFails - usedFails;

//           if (remainingFailsToAssign > 0) {
//             if (remainingTradesInBlock === remainingFailsToAssign) {
//               blockFail = true;
//             } else {
//               const prob = remainingFailsToAssign / remainingTradesInBlock;
//               if (Math.random() < prob) blockFail = true;
//             }
//           }

//           if (blockFail) {
//             user.block1Fails = usedFails + 1;
//           }

//           console.log("🔸[BLOCK1 DEBUG]", {
//             t,
//             blockFail,
//             usedFailsBefore: usedFails,
//             usedFailsAfter: user.block1Fails,
//             remainingTradesInBlock,
//             remainingFailsToAssign,
//           });
//         }

//         // BLOCK 2: trades 11–20 → exactly 2 fails
//         if (!blockFail && t >= 11 && t <= 20) {
//           const maxFails = 2;
//           const usedFails = user.block2Fails || 0;
//           const tradeIndexInBlock = t - 10; // 1–10
//           const remainingTradesInBlock = 10 - tradeIndexInBlock + 1;
//           const remainingFailsToAssign = maxFails - usedFails;

//           if (remainingFailsToAssign > 0) {
//             if (remainingTradesInBlock === remainingFailsToAssign) {
//               blockFail = true;
//             } else {
//               const prob = remainingFailsToAssign / remainingTradesInBlock;
//               if (Math.random() < prob) blockFail = true;
//             }
//           }

//           if (blockFail) {
//             user.block2Fails = usedFails + 1;
//           }

//           console.log("🔸[BLOCK2 DEBUG]", {
//             t,
//             blockFail,
//             usedFailsBefore: usedFails,
//             usedFailsAfter: user.block2Fails,
//             remainingTradesInBlock,
//             remainingFailsToAssign,
//           });
//         }

//         if (blockFail) {
//           failTrade = true;
//           roiAmount = 0;
//         } else {
//           if (level <= 2) {
//             // ⭐ Level 1–2: old style (random + cap-safe)
//             const neededSuccessTrades =
//               rawProfit > 0 ? remainingProfit / rawProfit : Infinity;
//             const bufferTrades = tradesLeftIncludingThis - neededSuccessTrades;

//             let capSafeFailChance;
//             if (bufferTrades <= 0) {
//               capSafeFailChance = 0;
//             } else {
//               capSafeFailChance = Math.min(
//                 0.8,
//                 bufferTrades / tradesLeftIncludingThis
//               );
//             }

//             let baseFailChance = 0;
//             if (remainingProfit <= rawProfit * 3) {
//               baseFailChance = 0.6;
//             } else if (remainingProfit <= rawProfit * 8) {
//               baseFailChance = 0.35;
//             } else {
//               baseFailChance = 0.15;
//             }

//             let failChance = Math.min(baseFailChance, capSafeFailChance);

//             // Cap ke bilkul paas ho → success enforce
//             if (remainingProfit <= rawProfit + 0.05) {
//               failChance = 0;
//             }

//             console.log("🔹[CAP-FAIL L1/L2 DEBUG]", {
//               t,
//               remainingProfit,
//               rawProfit,
//               tradesLeftIncludingThis,
//               neededSuccessTrades,
//               bufferTrades,
//               capSafeFailChance,
//               baseFailChance,
//               failChance,
//             });

//             if (failChance > 0 && Math.random() < failChance) {
//               failTrade = true;
//               roiAmount = 0;
//             } else {
//               failTrade = false;
//               roiAmount = Number(
//                 Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
//               );
//             }
//           } else {
//             // ⭐ SCHEDULE LOGIC FOR LEVEL 3+ (L3, L4, L5, L6)
//             const expectedProfitPerTrade =
//               cycleTradeTarget > 0 ? allowedProfit / cycleTradeTarget : 0;
//             const expectedProfitSoFar = expectedProfitPerTrade * t;
//             const profitAhead = usedProfit - expectedProfitSoFar;
//             const profitAheadInTrades =
//               expectedProfitPerTrade > 0
//                 ? profitAhead / expectedProfitPerTrade
//                 : 0;

//             let baseFailChance;

//             // ⭐ SCHEDULE LOGIC FOR LEVEL 3+ with tougher Level-6
//             if (level === 6) {
//               if (profitAheadInTrades > 18) {
//                 baseFailChance = 0.9; // 90% fail
//               } else if (profitAheadInTrades > 10) {
//                 baseFailChance = 0.75;
//               } else if (profitAheadInTrades > 4) {
//                 baseFailChance = 0.6;
//               } else if (profitAheadInTrades < -18) {
//                 baseFailChance = 0.12;
//               } else if (profitAheadInTrades < -10) {
//                 baseFailChance = 0.18;
//               } else if (profitAheadInTrades < -4) {
//                 baseFailChance = 0.25;
//               } else {
//                 baseFailChance = 0.4;
//               }
//             } else {
//               if (profitAheadInTrades > 18) {
//                 baseFailChance = 0.8;
//               } else if (profitAheadInTrades > 10) {
//                 baseFailChance = 0.65;
//               } else if (profitAheadInTrades > 4) {
//                 baseFailChance = 0.5;
//               } else if (profitAheadInTrades < -18) {
//                 baseFailChance = 0.08;
//               } else if (profitAheadInTrades < -10) {
//                 baseFailChance = 0.12;
//               } else if (profitAheadInTrades < -4) {
//                 baseFailChance = 0.2;
//               } else {
//                 baseFailChance = 0.3;
//               }
//             }

//             // CAP ke bahut paas jaldi aa gaye ho:
//             if (remainingProfit <= rawProfit * 8 && t < cycleTradeTarget - 20) {
//               baseFailChance = Math.max(baseFailChance, 0.45);
//             }
//             if (remainingProfit <= rawProfit * 3 && t < cycleTradeTarget - 10) {
//               baseFailChance = Math.max(baseFailChance, 0.6);
//             }

//             // Last 15–20 trades: success bias zyda (distribution only)
//             if (t >= cycleTradeTarget - 15) {
//               baseFailChance = Math.min(baseFailChance, 0.4);
//             } else if (t >= cycleTradeTarget - 25) {
//               baseFailChance = Math.min(baseFailChance, 0.5);
//             }

//             let failChance = baseFailChance;
//             failChance = Math.min(Math.max(failChance, 0.05), 0.85);

//             // Agar ye trade hi cap close kar sakta hai → success enforce
//             if (remainingProfit <= rawProfit + 0.05) {
//               failChance = 0;
//             }

//             console.log("🔹[CAP-FAIL L3+ DEBUG]", {
//               t,
//               remainingProfit,
//               rawProfit,
//               tradesLeftIncludingThis,
//               allowedProfit,
//               usedProfit,
//               expectedProfitSoFar,
//               profitAhead,
//               profitAheadInTrades,
//               baseFailChance,
//               failChance,
//             });

//             if (failChance > 0 && Math.random() < failChance) {
//               failTrade = true;
//               roiAmount = 0;
//             } else {
//               failTrade = false;

//               if (level === 3 && user.doubleBase < maxInvestment) {
//                 // ⭐ Level-3 → Stage1 (1500-3000) & Stage2 (3000-4000)
//                 // Always give FULL ROI on success
//                 roiAmount = rawProfit;
//               } else {
//                 // L3 locked, L4, L5, L6 → cap-respecting ROI
//                 roiAmount = Number(
//                   Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
//                 );
//               }
//             }
//           }
//         }
//       }
//     }

//     // 🚫 GLOBAL GUARD: max 3 consecutive fails
//     const lastTrades = await Roi.find({ userId })
//       .sort({ creditedOn: -1 })
//       .limit(3);

//     const last3Failed =
//       lastTrades.length === 3 &&
//       lastTrades.every((tr) => tr.status === "failed");

//     const allowOverride = !L6_forceFailMode && !L6_hardCapLock;

//     if (allowOverride && last3Failed && failTrade) {
//       const stillRemaining = Number(
//         (
//           allowedProfit -
//           (user.totalEarningsInCycle || 0) -
//           (user.pendingLevelIncome || 0)
//         ).toFixed(2)
//       );

//       if (stillRemaining > 0.01 && rawProfit > 0) {
//         // Cap ke andar room hai -> forced success with ROI
//         roiAmount = Number(Math.min(rawProfit, stillRemaining).toFixed(2));
//         failTrade = false;

//         console.log(
//           "🚨 [OVERRIDE] Stopping 4th consecutive FAIL → Forced SUCCESS (with ROI)"
//         );
//       } else {
//         console.log(
//           "🚨 [OVERRIDE] 4th FAIL allowed because cap is fully used; no 0-ROI success."
//         );
//       }
//     }

//     // Final guard: never mark success with 0 ROI
//     if (!failTrade && roiAmount <= 0) {
//       failTrade = true;
//       roiAmount = 0;
//     }

//     // ✅ HARD OVERRIDE: LEVEL-1 ME KABHI FAIL NAHI HOGA
//     if (level === 1) {
//       failTrade = false;

//       // ROI hamesha milega (cap ke andar clamp hoke)
//       if (remainingProfit > 0) {
//         roiAmount = Number(
//           Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
//         );
//       } else {
//         // Cap even agar logically khatam ho jaaye, phir bhi 0 kabhi nahi
//         roiAmount = Number(rawProfit.toFixed(2));
//       }

//       console.log("🟢 [LEVEL-1 HARD OVERRIDE] FAIL BLOCKED", {
//         level,
//         roiAmount,
//         remainingProfit,
//         allowedProfit,
//         failTrade,
//       });
//     }

//     console.log("✅[TRADE RESULT]", {
//       t,
//       level,
//       failTrade,
//       roiAmount,
//       tradeAmount,
//       usedProfitBefore: usedProfit,
//       levelUsed,
//       roiUsed: user.totalEarningsInCycle,
//       isL3LockedStage,
//       isL4LockedStage,
//     });

//     // ---------------- COIN SPLIT ----------------
//     let coinsMeta = [];
//     try {
//       coinsMeta = await getRandomCoinsWithImages(20);
//     } catch {
//       coinsMeta = Array.from({ length: 20 }).map((_, i) => ({
//         symbol: `COIN${i + 1}`,
//         name: `Coin ${i + 1}`,
//         image: "",
//       }));
//     }

//     const investedSplit = randomSplit(tradeAmount, coinsMeta.length);
//     const profitSplit = failTrade
//       ? Array(coinsMeta.length).fill(0)
//       : randomSplit(roiAmount, coinsMeta.length);

//     const coinResults = coinsMeta.map((c, i) => ({
//       ...c,
//       invested: investedSplit[i],
//       profit: profitSplit[i],
//       returned: investedSplit[i] + profitSplit[i],
//     }));

//     // ---------------- WALLET DEDUCTION ----------------
//     const usedMain = Math.min(user.mainWallet, tradeAmount);
//     const usedBonus = Number((tradeAmount - usedMain).toFixed(2));

//     user.mainWallet = Number((user.mainWallet - usedMain).toFixed(2));
//     user.BonusCredit = Number((user.BonusCredit - usedBonus).toFixed(2));

//     if (!failTrade && roiAmount > 0) {
//       user.totalEarningsInCycle = Number((roiUsed + roiAmount).toFixed(2));
//     }

//     user.cycleTradeCount = prevCycleTrades + 1;

//     const usedProfitAfter =
//       (user.totalEarningsInCycle || 0) + (user.pendingLevelIncome || 0);

//     // ---------------- CYCLE COMPLETE CHECK ----------------
//     let cycleCompleted = false;

//     // Rule-1: Cap must be full hit
//     if (usedProfitAfter >= allowedProfit - 0.01 && allowedProfit > 0) {
//       cycleCompleted = true;
//     }

//     // Rule-2: Level-6 minimum 90 trades required for ANY reset
//     if (level === 6 && user.cycleTradeCount < 90) {
//       cycleCompleted = false;
//     }

//     if (cycleCompleted) {
//       user.cycleCount += 1;

//       // ⭐ EFFECTIVE CAPITAL = walletAfterTrade + tradeAmount
//       const walletAfterTrade = Number(
//         (user.mainWallet + user.BonusCredit).toFixed(2)
//       );
//       const effectiveCapital = Number(
//         (walletAfterTrade + tradeAmount).toFixed(2)
//       );

//       let newPrincipal;

//       if (level === 3) {
//         if (user.doubleBase < minInvestment * 2 - 0.01) {
//           // Stage-1 → Stage-2 target (3000) but clamp by capital
//           newPrincipal = Math.min(
//             2 * minInvestment,
//             maxInvestment,
//             effectiveCapital
//           );
//         } else if (user.doubleBase < maxInvestment - 0.01) {
//           // Stage-2 → lock at 4000 but clamp by capital
//           newPrincipal = Math.min(maxInvestment, effectiveCapital);
//         } else {
//           // Locked stage → try to stay at 4000 but clamp by capital
//           newPrincipal = Math.min(maxInvestment, effectiveCapital);
//         }
//       } else if (level === 4) {
//         // L4: base ideally 8000, clamp by capital
//         newPrincipal = Math.min(maxInvestment, effectiveCapital);
//       } else if (level === 5) {
//         // L5: always start from maxInvestment but clamp by capital
//         newPrincipal = Math.min(effectiveCapital, maxInvestment);
//       } else if (level === 6) {
//         // L6: same — principal realistic, based on effective capital
//         // newPrincipal = Math.min(effectiveCapital, maxInvestment);
//         newPrincipal = 30000;
//       } else {
//         // OTHER LEVELS (1,2): principal purely from effectiveCapital
//         newPrincipal = Math.min(effectiveCapital, maxInvestment);
//       }

//       user.cyclePrincipal = Number(newPrincipal.toFixed(2));
//       user.cycleWithdrawn = 0;
//       user.block1Fails = 0;
//       user.block2Fails = 0;
//       user.capHit = false;
//       user.remainingTradesAfterCap = 0;
//       user.remainingSuccessNeeded = 0;

//       recalcDoubleBaseAndTarget();

//       user.cycleStartDate = new Date();
//       user.totalEarningsInCycle = 0;
//       user.pendingLevelIncome = 0;
//       user.cycleTradeCount = 0;
//       user.lastCycleLevel = level;

//       console.log("🔁[CYCLE RESET]", {
//         level,
//         effectiveCapital,
//         newPrincipal: user.cyclePrincipal,
//         doubleBase: user.doubleBase,
//         doubleTarget: user.doubleTarget,
//         cycleCount: user.cycleCount,
//       });
//     }

//     // ---------------- SAVE ROI ENTRY ----------------
//     await Roi.create({
//       userId,
//       investment: Number(tradeAmount.toFixed(2)),
//       mainWalletUsed: Number(usedMain.toFixed(2)),
//       bonusWalletUsed: Number(usedBonus.toFixed(2)),
//       compoundInvestmentAmount: principal,
//       roiAmount: Number(roiAmount.toFixed(2)),
//       percentage: roiPercentPerTrade,
//       status: failTrade ? "failed" : "success",
//       coinResults,
//       isClaimed: false,
//       creditedOn: new Date(),
//     });

//     // ---------------- AI CREDITS ----------------
//     const creditConfig = await ReferralTradeCredit.findOne();
//     const creditValue = creditConfig?.tradeCredit ?? 3;
//     user.aiCredits = (user.aiCredits || 0) + creditValue;

//     // ---------------- STATS UPDATE ----------------
//     user.totalTradeCount = (user.totalTradeCount || 0) + 1;
//     if (failTrade) {
//       user.totalFailedTrades = (user.totalFailedTrades || 0) + 1;
//     } else {
//       user.totalSuccessfulTrades = (user.totalSuccessfulTrades || 0) + 1;
//     }

//     user.lastTradeDate = new Date();
//     user.tradeTimer = timer || "";
//     user.isTrading = true;
//     user.isAiBtnClick = true;
//     user.todayTradeCount = (user.todayTradeCount || 0) + 1;

//     await user.save();

//     return res.status(200).json({ success: true });
//   } catch (err) {
//     console.error("AI Trade Error:", err);
//     return res
//       .status(500)
//       .json({ success: false, message: "Error in trading" });
//   }
// };

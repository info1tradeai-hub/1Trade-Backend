import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import RoiLevel from "../models/roiLevel.model.js";
import Roi from "../models/roi.model.js";
import ReferralTradeCredit from "../models/referralandtradecredit.model.js";
import axios from "axios";

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
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const userId = req.user._id;
    const { timer } = req.body;

    // ---------------- PENDING TRADE CHECK ----------------
    const pendingTrade = await Roi.findOne({
      userId,
      isClaimed: false,
    }).session(session);
    if (pendingTrade) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Please claim the previous trade before starting a new one.",
      });
    }

    // Load user inside transaction
    const user = await UserModel.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const level = user.level || 0;
    if (level === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Level 0 cannot trade",
      });
    }

    // ---------------- LEVEL CHANGE → CYCLE RESET ----------------
    if (user.lastCycleLevel === undefined || user.lastCycleLevel === null) {
      user.lastCycleLevel = level;
    } else if (user.lastCycleLevel !== level) {
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

    const mainWalletBeforeTrade = user.mainWallet || 0;
    const bonusWalletBeforeTrade = user.BonusCredit || 0;
    const tradingWallet = Number(
      (mainWalletBeforeTrade + bonusWalletBeforeTrade).toFixed(2)
    );

    if (tradingWallet <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Wallet empty!",
      });
    }

    const levelConfig = await RoiLevel.findOne({ level }).session(session);
    if (!levelConfig) {
      await session.abortTransaction();
      session.endSession();
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
          // 750–800 → fixed 1500 cap
          user.doubleBase = base;
          user.doubleTarget = 1500;
        } else if (base >= 1400) {
          // 1400+ → 50% profit cap
          user.doubleBase = base;
          user.doubleTarget = Number((base * 1.5).toFixed(2));
        } else {
          // otherwise → normal double
          user.doubleBase = base;
          user.doubleTarget = Number((base * 2).toFixed(2));
        }
        return;
      }

      // LEVEL 3–4
      if (level === 3 || level === 4) {
        if (base > 3000) {
          user.doubleBase = base;
          user.doubleTarget = Number((base * 1.5).toFixed(2));
        } else {
          user.doubleBase = base;
          user.doubleTarget = Number((base * 2).toFixed(2));
        }
        return;
      }

      // LEVEL 5–6 → 1.5x
      if (level === 5 || level === 6) {
        user.doubleBase = base;
        user.doubleTarget = Number((base * 1.5).toFixed(2));
        return;
      }

      // LEVEL 1 → 2x
      user.doubleBase = base;
      user.doubleTarget = Number((base * 2).toFixed(2));
    };

    // -------- FIXED WITHDRAW + PRINCIPAL SETUP ORDER --------
    const withdrawInCycle = Number((user.cycleWithdrawn || 0).toFixed(2));

    if (withdrawInCycle > 0) {
      user.cyclePrincipal = Math.max(
        Number((user.cyclePrincipal - withdrawInCycle).toFixed(2)),
        0
      );
      user.cycleWithdrawn = 0;
    }

    // If principal 0 → pick from MAIN WALLET (not tradingWallet)
    if (!user.cyclePrincipal || user.cyclePrincipal <= 0) {
      let newPrincipal = Number(mainWalletBeforeTrade.toFixed(2));
      if (newPrincipal > maxInvestment) newPrincipal = maxInvestment;

      user.cyclePrincipal = newPrincipal;
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

    // ---------------- BASIC DEBUG ----------------
    console.log("🔹[AI ROI] User:", userId.toString(), {
      level,
      principal,
      doubleBase: user.doubleBase,
      doubleTarget: user.doubleTarget,
      mainWalletBeforeTrade,
      bonusWalletBeforeTrade,
    });

    // ---------------- PROFIT USED (ROI + LEVEL) ----------------
    const roiUsed = Number((user.totalEarningsInCycle || 0).toFixed(2));
    const levelUsed = Number((user.pendingLevelIncome || 0).toFixed(2));
    const usedProfit = Number((roiUsed + levelUsed).toFixed(2));
    const prevCycleTrades = user.cycleTradeCount || 0;

    // ---------------- LEVEL CONFIG ----------------
    const CYCLE_DAYS = 45;
    let tradesPerDay = 1;
    let safetyGap = 0;
    let enforceTradeTarget = false;

    if (level === 1) {
      tradesPerDay = 1;
      safetyGap = 0;
      enforceTradeTarget = false;
    } else if (level === 2) {
      tradesPerDay = 1;
      safetyGap = 8;
      enforceTradeTarget = true;
    } else if (level === 3 || level === 4) {
      tradesPerDay = 2;
      safetyGap = 10;
      enforceTradeTarget = true;
    } else if (level === 5 || level === 6) {
      tradesPerDay = 3;
      safetyGap = 20;
      enforceTradeTarget = true;
    }

    const cycleTradeTarget = CYCLE_DAYS * tradesPerDay;

    // ---------------- TRADE AMOUNT ----------------
    let tradeAmount = 0;
    if (level === 1) {
      tradeAmount = Math.min(tradingWallet, maxInvestment);
    } else {
      const extra = tradingWallet - minInvestment;
      tradeAmount =
        extra <= 0
          ? Math.min(minInvestment, tradingWallet)
          : Math.min(
              minInvestment + extra * 0.63,
              tradingWallet,
              maxInvestment
            );
    }

    tradeAmount = Number(tradeAmount.toFixed(2));
    if (tradeAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Not enough balance to trade",
      });
    }

    // --------------- 🔒 TRADE LOCK (per user) ----------------
    const lockUser = await UserModel.findOneAndUpdate(
      { _id: userId, isTrading: { $ne: true } },
      { $set: { isTrading: true } },
      { new: true, session }
    );

    if (!lockUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Another trade is already in progress. Please wait.",
      });
    }
    // --------------- 🔒 TRADE LOCK END ----------------

    // ---------------- ROI PER TRADE ----------------
    const baseDailyPercent = minPercent;
    let roiPercentPerTrade = Number(
      (baseDailyPercent / tradesPerDay).toFixed(4)
    );
    let rawProfit = Number(
      ((tradeAmount * roiPercentPerTrade) / 100).toFixed(2)
    );

    // ---------------- PROFIT CAP (ROI + LEVEL) ----------------
    let profitCap = Number((user.doubleTarget - user.doubleBase).toFixed(2));
    if (profitCap < 0) profitCap = 0;

    let allowedProfit = Number((profitCap - safetyGap).toFixed(2));
    if (allowedProfit < 0) allowedProfit = 0;

    let remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));

    console.log("🔹[CAP DEBUG]", {
      allowedProfit,
      usedProfit,
      remainingProfit,
      profitCap,
      safetyGap,
      roiUsed,
      levelUsed,
    });

    // ================= FAIL LOGIC =================
    let roiAmount = rawProfit;
    let failTrade = false;

    const t = prevCycleTrades + 1;

    // ---- STEP 1: CHECK / SET CAP HIT (for L2, principal >= 1400) ----
    let capHitActive = user.capHit || false;

    if (
      !capHitActive &&
      level === 2 &&
      principal >= 1400 &&
      usedProfit >= allowedProfit - 0.01
    ) {
      capHitActive = true;
      user.capHit = true;
      user.remainingTradesAfterCap = cycleTradeTarget - prevCycleTrades; // including THIS trade
      user.remainingSuccessNeeded = Math.floor(
        user.remainingTradesAfterCap / 2
      );

      console.log("🔥 CAP HIT SET!", {
        usedProfit,
        allowedProfit,
        remainingTradesAfterCap: user.remainingTradesAfterCap,
        remainingSuccessNeeded: user.remainingSuccessNeeded,
        t,
      });
    }

    // recompute remainingProfit just for reference
    remainingProfit = Number((allowedProfit - usedProfit).toFixed(2));

    const totalTradesIncludingThis = cycleTradeTarget - prevCycleTrades;

    // ---- STEP 2: IF CAP-HIT MODE ACTIVE (ONLY L2 + principal>=1400) ----
    if (capHitActive && level === 2 && principal >= 1400) {
      // Phase-2: 50% of remaining trades success (random), 50% fail
      let forceSuccess = false;

      if (user.remainingSuccessNeeded <= 0) {
        // All required successes done → remaining sab fail
        forceSuccess = false;
      } else if (user.remainingTradesAfterCap <= user.remainingSuccessNeeded) {
        // Jitni trades bachi utni hi success chahiye → force success
        forceSuccess = true;
      } else {
        // Random 50-50 distribution
        forceSuccess = Math.random() < 0.5;
      }

      if (forceSuccess) {
        failTrade = false;
        roiAmount = rawProfit; // full ROI allowed (cap rule yahan break ho raha hai)
        user.remainingSuccessNeeded -= 1;
      } else {
        failTrade = true;
        roiAmount = 0;
      }

      user.remainingTradesAfterCap -= 1;

      console.log("🎯 [CAP-HIT MODE]", {
        t,
        failTrade,
        roiAmount,
        remainingSuccessNeeded: user.remainingSuccessNeeded,
        remainingTradesAfterCap: user.remainingTradesAfterCap,
      });
    } else {
      // ---- STEP 3: NORMAL FAIL LOGIC (BLOCK + CAP DISTANCE) ----
      // If cap fully exhausted and no special CAP-HIT mode → straight fail
      if (remainingProfit <= 0.01 || allowedProfit === 0) {
        failTrade = true;
        roiAmount = 0;
        console.log("⚠️[FAIL] Cap exhausted (normal mode), trade:", t);
      } else {
        let blockFail = false;

        // ----- BLOCK 1: trades 1–10 → exactly 3 fails -----
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

          console.log("🔸[BLOCK1 DEBUG]", {
            t,
            blockFail,
            usedFailsBefore: usedFails,
            usedFailsAfter: user.block1Fails,
            remainingTradesInBlock,
            remainingFailsToAssign,
          });
        }

        // ----- BLOCK 2: trades 11–20 → exactly 2 fails -----
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

          console.log("🔸[BLOCK2 DEBUG]", {
            t,
            blockFail,
            usedFailsBefore: usedFails,
            usedFailsAfter: user.block2Fails,
            remainingTradesInBlock,
            remainingFailsToAssign,
          });
        }

        if (blockFail) {
          failTrade = true;
          roiAmount = 0;
        } else {
          // ----- t > 20 OR non-block fail → CAP DISTANCE LOGIC -----
          const tradesLeftIncludingThis = totalTradesIncludingThis;
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

          // “Cap kitna paas hai” based pattern
          if (remainingProfit <= rawProfit * 3) {
            baseFailChance = 0.6; // cap bahut paas → zyada fail
          } else if (remainingProfit <= rawProfit * 8) {
            baseFailChance = 0.35; // mid
          } else {
            baseFailChance = 0.15; // cap door → kam fail
          }

          let failChance = Math.min(baseFailChance, capSafeFailChance);

          // Agar yahi trade cap close kar sakta hai → success enforce
          if (remainingProfit <= rawProfit + 0.05) {
            failChance = 0;
          }

          // Last trade with enforceTradeTarget → success enforce
          if (enforceTradeTarget && t >= cycleTradeTarget) {
            failChance = 0;
          }

          console.log("🔹[CAP-FAIL DEBUG]", {
            t,
            remainingProfit,
            rawProfit,
            neededSuccessTrades,
            bufferTrades,
            tradesLeftIncludingThis,
            capSafeFailChance,
            baseFailChance,
            failChance,
          });

          if (failChance > 0 && Math.random() < failChance) {
            failTrade = true;
            roiAmount = 0;
          } else {
            failTrade = false;
            roiAmount = Number(
              Math.min(rawProfit, Math.max(remainingProfit, 0)).toFixed(2)
            );
          }
        }
      }
    }

    console.log("✅[TRADE RESULT]", {
      t,
      failTrade,
      roiAmount,
      tradeAmount,
      usedProfitBefore: usedProfit,
      levelUsed,
      roiUsed,
      capHitActive,
      capHit: user.capHit,
    });

    // ================= FAIL LOGIC END =================

    // ---------------- COIN SPLIT ----------------
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
    if (enforceTradeTarget) {
      if (
        usedProfitAfter >= allowedProfit - 0.01 &&
        user.cycleTradeCount >= cycleTradeTarget
      ) {
        cycleCompleted = true;
      }
    } else {
      if (usedProfitAfter >= allowedProfit - 0.01) {
        cycleCompleted = true;
      }
    }

    if (cycleCompleted) {
      user.cycleCount += 1;

      const walletEffective = Number(
        (mainWalletBeforeTrade + (failTrade ? 0 : roiAmount)).toFixed(2)
      );
      let newPrincipal = walletEffective;
      if (walletEffective > maxInvestment) newPrincipal = maxInvestment;

      user.cyclePrincipal = newPrincipal;
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

      console.log("🔁[CYCLE RESET]", {
        newPrincipal,
        doubleBase: user.doubleBase,
        doubleTarget: user.doubleTarget,
        cycleCount: user.cycleCount,
      });
    }

    // ---------------- SAVE ROI ENTRY (IN TRANSACTION) ----------------
    await Roi.create(
      [
        {
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
        },
      ],
      { session }
    );

    // ---------------- AI CREDITS ----------------
    const creditConfig = await ReferralTradeCredit.findOne().session(session);
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

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("AI Trade Error:", err);

    try {
      await session.abortTransaction();
      session.endSession();
    } catch (_) {}

    try {
      await UserModel.updateOne(
        { _id: req.user?._id },
        { $set: { isTrading: false } }
      );
    } catch (e) {
      console.error("Error while unlocking trade flag:", e.message);
    }

    return res
      .status(500)
      .json({ success: false, message: "Error in trading" });
  }
};

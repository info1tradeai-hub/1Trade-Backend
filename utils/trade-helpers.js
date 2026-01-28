// // import axios from "axios";

// // export const SOFT_COMPLETE_FACTOR = 0.98;

// // /* ===================== DAY & TIME ===================== */
// // export function isSameLocalDay(d1, d2) {
// //   if (!d1 || !d2) return false;
// //   const a = new Date(d1),
// //     b = new Date(d2);
// //   return (
// //     a.getFullYear() === b.getFullYear() &&
// //     a.getMonth() === b.getMonth() &&
// //     a.getDate() === b.getDate()
// //   );
// // }

// // export function getRemainingDays(user) {
// //   if (!user.cycleStartDate) return 45;
// //   const diff = Math.floor(
// //     (Date.now() - new Date(user.cycleStartDate).getTime()) / 86400000
// //   );
// //   return Math.max(45 - diff, 0);
// // }

// // export function isWithinFirstNDays(user, n = 3) {
// //   if (!user.cycleStartDate) return true;
// //   const diff = Math.floor(
// //     (Date.now() - new Date(user.cycleStartDate).getTime()) / 86400000
// //   );
// //   return diff < n;
// // }

// // /* ===================== CYCLE BASE MANAGER (with wallet snapshot) ===================== */
// // /*
// //  - Ensures currentCycleBase never becomes null/NaN/0 incorrectly.
// //  - Maintains walletSnapshotAtCycleStart to detect external incoming funds.
// //  - Implements applyDeposit, addEarnings, completeCycle.
// // */
// // export const CycleBaseManager = {
// //   getSafeBase(user) {
// //     let base = Number(user.currentCycleBase);
// //     if (!base || base < 1 || Number.isNaN(base)) {
// //       const principal =
// //         Number(user.mainWalletPrinciple || 0) +
// //         Number(user.additionalWalletPrinciple || 0);
// //       base = principal > 0 ? principal : Number(user.mainWallet || 0);
// //       base = Math.max(0, base);
// //       user.currentCycleBase = +base.toFixed(2);
// //       // ensure cycleStartDate exists if base set
// //       if (!user.cycleStartDate) user.cycleStartDate = new Date();
// //       if (user.totalEarningsInCycle == null) user.totalEarningsInCycle = 0;
// //     }
// //     // ensure wallet snapshot exists at cycle start
// //     if (!user.walletSnapshotAtCycleStart) {
// //       user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(
// //         2
// //       );
// //     }
// //     return +base.toFixed(2);
// //   },

// //   getCycleTarget(user) {
// //     const base = this.getSafeBase(user);
// //     const level = Number(user.level || 1);
// //     let target = level === 5 || level === 6 ? base * 1.5 : base * 2;
// //     if (!target || Number.isNaN(target) || target < 1) target = base * 2;
// //     return +target.toFixed(2);
// //   },

// //   applyDeposit(user, amount) {
// //     const amt = Number(amount) || 0;
// //     if (amt <= 0) return;
// //     const base = this.getSafeBase(user);
// //     user.currentCycleBase = +(base + amt).toFixed(2);
// //     // deposit is external addition to wallet too — but we keep wallet snapshot at cycle start unchanged.
// //     if (!user.cycleStartDate) user.cycleStartDate = new Date();
// //   },

// //   // use when a trade succeeded and we want to increase earningsInCycle
// //   addEarnings(user, roiAmount) {
// //     const amt = Number(roiAmount) || 0;
// //     if (amt <= 0) return;
// //     user.totalEarningsInCycle = +(
// //       Number(user.totalEarningsInCycle || 0) + amt
// //     ).toFixed(2);
// //   },

// //   // complete cycle; note we use SOFT_COMPLETE_FACTOR at controller level to decide completion.
// //   completeCycle(user) {
// //     const target = this.getCycleTarget(user);
// //     user.currentCycleBase = +target.toFixed(2);
// //     user.totalEarningsInCycle = 0;
// //     user.cycleCount = (user.cycleCount || 0) + 1;
// //     user.cycleStartDate = new Date();
// //     // reset snapshot to current mainWallet after cycle completion
// //     user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(2);
// //   },

// //   // helper: mark snapshot if missing (used when cycle start created)
// //   ensureSnapshot(user) {
// //     if (!user.walletSnapshotAtCycleStart) {
// //       user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(
// //         2
// //       );
// //     }
// //   },
// // };

// // /* ===================== DAILY LIMIT ===================== */
// // export function getDailyTradeLimit(level) {
// //   if (level <= 2) return 1;
// //   if (level <= 4) return 2;
// //   return 3;
// // }

// // /* ===================== ROI & SPLITS ===================== */
// // export function randomSplit(total, parts) {
// //   if (parts <= 0) return [];
// //   if (total === 0) return Array(parts).fill(0);
// //   const w = Array.from({ length: parts }, () => Math.random());
// //   const sum = w.reduce((a, b) => a + b, 0) || 1;
// //   const raw = w.map((x) => (x / sum) * total);
// //   const rounded = raw.map((v) => +v.toFixed(2));
// //   const diff = +(total - rounded.reduce((a, b) => a + b, 0)).toFixed(2);
// //   rounded[rounded.length - 1] = +(rounded[rounded.length - 1] + diff).toFixed(
// //     2
// //   );
// //   return rounded;
// // }

// // const coinNameMap = {
// //   BTC: "bitcoin",
// //   ETH: "ethereum",
// //   USDT: "tether",
// //   BNB: "binance-coin",
// //   SOL: "solana",
// //   XRP: "ripple",
// //   ADA: "cardano",
// //   DOGE: "dogecoin",
// //   MATIC: "polygon",
// //   DOT: "polkadot-new",
// //   SHIB: "shiba-inu",
// //   AVAX: "avalanche",
// //   LTC: "litecoin",
// //   TRX: "tron",
// //   LINK: "chainlink",
// //   UNI: "uniswap",
// //   XLM: "stellar",
// //   ATOM: "cosmos",
// // };

// // export async function getRandomCoinsWithImages(count = 6) {
// //   const coinsArray = Object.entries(coinNameMap).map(([symbol, fullName]) => ({
// //     symbol,
// //     fullName,
// //   }));
// //   const selected = coinsArray.sort(() => Math.random() - 0.5).slice(0, count);
// //   try {
// //     const ids = selected.map((c) => coinNameMap[c.symbol]).join(",");
// //     const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
// //     const { data } = await axios.get(url, { timeout: 3000 });
// //     return selected.map((coin) => ({
// //       symbol: coin.symbol,
// //       fullName: coin.fullName,
// //       image: data.find((c) => c.id === coinNameMap[coin.symbol])?.image || "",
// //     }));
// //   } catch {
// //     return selected.map((coin) => ({ ...coin, image: "" }));
// //   }
// // }

// // export function calculateROI(
// //   tradeAmount,
// //   minPercent,
// //   maxPercent,
// //   remainingTarget
// // ) {
// //   const roiPercent = +(
// //     Math.random() * (maxPercent - minPercent) +
// //     minPercent
// //   ).toFixed(2);
// //   let roiAmount = +((tradeAmount * roiPercent) / 100).toFixed(2);
// //   if (roiAmount > remainingTarget) roiAmount = +remainingTarget.toFixed(2);
// //   return { roiPercent, roiAmount };
// // }

// // /* ===================== FAIL CHANCE (earnings-only) ===================== */
// // /* old/new parity: progress is based ONLY on earnings. */
// // export function getFailChance(
// //   earningsInCycle,
// //   /*mainWallet*/ _mw,
// //   cycleTarget,
// //   remainingDays
// // ) {
// //   if (cycleTarget <= 0) return 1;
// //   const progress = Math.min(1, (earningsInCycle || 0) / cycleTarget); // 0..1
// //   let fail = 0.1;

// //   if (progress >= 0.95) fail = 0.9;
// //   else if (progress >= 0.85) fail = 0.65;
// //   else if (progress >= 0.7) fail = 0.45;
// //   else if (progress >= 0.5) fail = 0.3;
// //   else if (progress >= 0.3) fail = 0.18;

// //   const remainingProgress = 1 - progress;
// //   if (remainingDays < remainingProgress * 45)
// //     fail *= 0.55; // time pressure → success bias
// //   else fail *= 1.25;

// //   return Math.max(0, Math.min(1, fail));
// // }

// // /* ===================== TRACKING KEY ===================== */
// // export function resolveTrackingKey(req) {
// //   const hdr = (req.headers["x-trade-key"] || "").toString().trim();
// //   if (hdr) return hdr;
// //   return `TK-${Date.now()}-${Math.random()
// //     .toString(36)
// //     .slice(2, 8)
// //     .toUpperCase()}`;
// // }

// // utils/trade-helpers.js
// import axios from "axios";

// export const SOFT_COMPLETE_FACTOR = 0.98;

// /* ===================== DAY & TIME ===================== */
// export function isSameLocalDay(d1, d2) {
//   if (!d1 || !d2) return false;
//   const a = new Date(d1),
//     b = new Date(d2);
//   return (
//     a.getFullYear() === b.getFullYear() &&
//     a.getMonth() === b.getMonth() &&
//     a.getDate() === b.getDate()
//   );
// }

// export function getRemainingDays(user) {
//   if (!user.cycleStartDate) return 45;
//   const diff = Math.floor(
//     (Date.now() - new Date(user.cycleStartDate).getTime()) / 86400000
//   );
//   return Math.max(45 - diff, 0);
// }

// export function isWithinFirstNDays(user, n = 3) {
//   if (!user.cycleStartDate) return true;
//   const diff = Math.floor(
//     (Date.now() - new Date(user.cycleStartDate).getTime()) / 86400000
//   );
//   return diff < n;
// }

// /* ===================== LEVEL CONFIG (sample - but use DB in controller) ==== */
// export const FALLBACK_LEVEL_CONFIG = {
//   1: {
//     minInvestment: 30,
//     maxInvestment: 1000,
//     minPercent: 1.5,
//     maxPercent: 1.8,
//     dailyTrades: 1,
//   },
//   2: {
//     minInvestment: 400,
//     maxInvestment: 1500,
//     minPercent: 2.0,
//     maxPercent: 2.3,
//     dailyTrades: 1,
//   },
//   3: {
//     minInvestment: 1500,
//     maxInvestment: 3999,
//     minPercent: 2.4,
//     maxPercent: 2.7,
//     dailyTrades: 2,
//   },
//   4: {
//     minInvestment: 4000,
//     maxInvestment: 7999,
//     minPercent: 2.8,
//     maxPercent: 3.1,
//     dailyTrades: 2,
//   },
//   5: {
//     minInvestment: 8000,
//     maxInvestment: 29999,
//     minPercent: 3.3,
//     maxPercent: 3.6,
//     dailyTrades: 3,
//   },
//   6: {
//     minInvestment: 30000,
//     maxInvestment: 50000,
//     minPercent: 3.8,
//     maxPercent: 4.1,
//     dailyTrades: 3,
//   },
// };

// /* ===================== CYCLE BASE MANAGER ===================== */
// /*
//   Key design:
//   - currentCycleBase is the principal eligible for doubling. Set *once* at cycle start.
//   - walletSnapshotAtCycleStart = mainWallet at cycle start. External deposits/withdrawals update mainWallet, but
//     they are tracked separately via walletSnapshotAtCycleStart and do NOT change currentCycleBase.
//   - Use CycleBaseManager.recordExternalDeposit / recordWithdraw to update snapshot and mark flags.
// */
// export const CycleBaseManager = {
//   ensureInitial(user) {
//     // safe initialising of fields
//     if (
//       user.currentCycleBase == null ||
//       Number.isNaN(Number(user.currentCycleBase))
//     ) {
//       user.currentCycleBase = +Number(user.mainWallet || 0).toFixed(2);
//       user.totalEarningsInCycle = +Number(
//         user.totalEarningsInCycle || 0
//       ).toFixed(2);
//       user.cycleStartDate = user.cycleStartDate || new Date();
//       user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(
//         2
//       );
//       user.cycleWithdrawn = user.cycleWithdrawn || false;
//     }
//     if (!user.walletSnapshotAtCycleStart) {
//       user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(
//         2
//       );
//     }
//     if (user.totalEarningsInCycle == null) user.totalEarningsInCycle = 0;
//   },

//   getSafeBase(user) {
//     this.ensureInitial(user);
//     return +Number(user.currentCycleBase || 0).toFixed(2);
//   },

//   getCycleTarget(user, level) {
//     const base = this.getSafeBase(user);
//     if (!level) level = Number(user.level || 1);
//     let target = level === 5 || level === 6 ? base * 1.5 : base * 2;
//     return +target.toFixed(2);
//   },

//   // Called when user makes an on-chain deposit (external)
//   // Policy: do NOT add external deposit to currentCycleBase. Instead update snapshot to track external funds.
//   recordExternalDeposit(user, amount) {
//     if (!amount || amount <= 0) return;
//     user.walletSnapshotAtCycleStart = +(
//       Number(user.walletSnapshotAtCycleStart || 0) + Number(amount)
//     ).toFixed(2);
//     user.lastExternalDepositAt = new Date();
//   },

//   // Called when user withdraws during cycle
//   recordWithdrawal(user, amount) {
//     if (!amount || amount <= 0) return;
//     user.walletSnapshotAtCycleStart = +(
//       Number(user.walletSnapshotAtCycleStart || 0) - Number(amount)
//     ).toFixed(2);
//     user.cycleWithdrawn = true; // flag to penalize
//     user.lastWithdrawalAt = new Date();
//   },

//   // add trade earnings (net after fee)
//   addEarnings(user, roiAmount) {
//     const amt = Number(roiAmount) || 0;
//     if (amt <= 0) return;
//     user.totalEarningsInCycle = +(
//       Number(user.totalEarningsInCycle || 0) + amt
//     ).toFixed(2);
//   },

//   // complete cycle
//   completeCycle(user) {
//     const target = this.getCycleTarget(user, Number(user.level || 1));
//     user.currentCycleBase = +target.toFixed(2);
//     user.totalEarningsInCycle = 0;
//     user.cycleCount = (user.cycleCount || 0) + 1;
//     user.cycleStartDate = new Date();
//     user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(2);
//     user.cycleWithdrawn = false;
//   },
// };

// /* ===================== SPLIT / COINS ===================== */
// export function randomSplit(total, parts) {
//   if (parts <= 0) return [];
//   if (!total) return Array(parts).fill(0);
//   const w = Array.from({ length: parts }, () => Math.random());
//   const sum = w.reduce((a, b) => a + b, 0) || 1;
//   const raw = w.map((x) => (x / sum) * total);
//   const rounded = raw.map((v) => +v.toFixed(2));
//   const diff = +(total - rounded.reduce((a, b) => a + b, 0)).toFixed(2);
//   rounded[rounded.length - 1] = +(rounded[rounded.length - 1] + diff).toFixed(
//     2
//   );
//   return rounded;
// }

// // coins map (same as you used)
// const coinNameMap = {
//   BTC: "bitcoin",
//   ETH: "ethereum",
//   USDT: "tether",
//   BNB: "binance-coin",
//   SOL: "solana",
//   XRP: "ripple",
//   ADA: "cardano",
//   DOGE: "dogecoin",
//   MATIC: "polygon",
//   DOT: "polkadot-new",
//   SHIB: "shiba-inu",
//   AVAX: "avalanche",
//   LTC: "litecoin",
//   TRX: "tron",
//   LINK: "chainlink",
//   UNI: "uniswap",
//   XLM: "stellar",
//   ATOM: "cosmos",
// };

// export async function getRandomCoinsWithImages(count = 6) {
//   const coinsArray = Object.entries(coinNameMap).map(([symbol, fullName]) => ({
//     symbol,
//     fullName,
//   }));
//   const selected = coinsArray.sort(() => Math.random() - 0.5).slice(0, count);
//   try {
//     const ids = selected.map((c) => coinNameMap[c.symbol]).join(",");
//     const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
//     const { data } = await axios.get(url, { timeout: 3000 });
//     return selected.map((coin) => ({
//       symbol: coin.symbol,
//       fullName: coin.fullName,
//       image: data.find((c) => c.id === coinNameMap[coin.symbol])?.image || "",
//     }));
//   } catch {
//     return selected.map((coin) => ({ ...coin, image: "" }));
//   }
// }

// /* ===================== ROI CALC (MIN PERCENT ONLY) ===================== */
// /**
//  * Use minPercent only. Apply capping against remainingTarget.
//  * After computing gross roiAmount, apply 37% deduction => netRoi (this is the amount we count
//  * towards cycle progress).
//  */
// export function calculateROI_MinPercent(
//   tradeAmount,
//   minPercent,
//   remainingTarget,
//   feePercent = 37
// ) {
//   const roiPercent = Number(minPercent) || 0;
//   let grossRoi = +((tradeAmount * roiPercent) / 100).toFixed(2);
//   // if gross would exceed remaining target (target measured in earnings), cap it
//   if (remainingTarget != null && grossRoi > remainingTarget) {
//     grossRoi = +remainingTarget.toFixed(2);
//   }
//   // apply fee % to profit (not capital)
//   const netRoi = +(grossRoi * (1 - feePercent / 100)).toFixed(2);
//   return { roiPercent, grossRoi, netRoi };
// }

// /* ===================== FAIL CHANCE ===================== */
// /**
//  * Fail chance is computed based on earnings progress (NOT including external deposits),
//  * but is *increased* if there are external deposits (walletSnapshot changed) or withdrawals mid-cycle.
//  *
//  * Params:
//  *  - earningsInCycle : number (only earnings generated by trades)
//  *  - walletExternalGain : number (mainWallet - walletSnapshotAtCycleStart, >=0)
//  *  - cycleTarget : number
//  *  - remainingDays : number
//  *  - flags: { cycleWithdrawn: bool }
//  */
// export function getFailChance(
//   earningsInCycle,
//   walletExternalGain,
//   cycleTarget,
//   remainingDays,
//   flags = {}
// ) {
//   if (!cycleTarget || cycleTarget <= 0) return 1;
//   const progress = Math.min(1, Number(earningsInCycle || 0) / cycleTarget); // 0..1
//   let fail = 0.12; // base

//   if (progress >= 0.95) fail = 0.9;
//   else if (progress >= 0.85) fail = 0.65;
//   else if (progress >= 0.7) fail = 0.45;
//   else if (progress >= 0.5) fail = 0.3;
//   else if (progress >= 0.3) fail = 0.18;

//   // time pressure: if remainingDays is smaller than remainingProgress*45 -> success bias
//   const remainingProgress = Math.max(0, 1 - progress);
//   if (remainingDays < remainingProgress * 45) {
//     fail *= 0.55; // less time than required -> bias success
//   } else {
//     fail *= 1.2; // plenty of time -> be stricter
//   }

//   // External top-up increases fail chance (discourage topping up to game doubling)
//   if (walletExternalGain > 0) {
//     const extra = Math.min(0.6, walletExternalGain / cycleTarget); // scaled
//     fail = Math.min(1, fail + extra + 0.15);
//   }

//   // Withdrawal mid-cycle -> penalize
//   if (flags && flags.cycleWithdrawn) {
//     fail = Math.min(1, fail + 0.25);
//   }

//   return Math.max(0, Math.min(1, fail));
// }

// /* ===================== Tracking key ===================== */
// export function resolveTrackingKey(req) {
//   const hdr = (req.headers["x-trade-key"] || req.headers["X-Trade-Key"] || "")
//     .toString()
//     .trim();
//   if (hdr) return hdr;
//   return `TK-${Date.now()}-${Math.random()
//     .toString(36)
//     .slice(2, 8)
//     .toUpperCase()}`;
// }

// export { FALLBACK_LEVEL_CONFIG as LEVEL_CONFIG };

// utils/trade-helpers.js
import axios from "axios";

export const SOFT_COMPLETE_FACTOR = 0.98;

/* ===================== DAY & TIME ===================== */
export function isSameLocalDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1),
    b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getRemainingDays(user) {
  if (!user.cycleStartDate) return 45;
  const diff = Math.floor(
    (Date.now() - new Date(user.cycleStartDate).getTime()) / 86400000
  );
  return Math.max(45 - diff, 0);
}

export function isWithinFirstNDays(user, n = 3) {
  if (!user.cycleStartDate) return true;
  const diff = Math.floor(
    (Date.now() - new Date(user.cycleStartDate).getTime()) / 86400000
  );
  return diff < n;
}

/* ===================== LEVEL CONFIG (sample - but use DB in controller) ==== */
export const FALLBACK_LEVEL_CONFIG = {
  1: {
    minInvestment: 30,
    maxInvestment: 1000,
    minPercent: 1.5,
    maxPercent: 1.8,
    dailyTrades: 1,
  },
  2: {
    minInvestment: 400,
    maxInvestment: 1500,
    minPercent: 2.0,
    maxPercent: 2.3,
    dailyTrades: 1,
  },
  3: {
    minInvestment: 1500,
    maxInvestment: 3999,
    minPercent: 2.4,
    maxPercent: 2.7,
    dailyTrades: 2,
  },
  4: {
    minInvestment: 4000,
    maxInvestment: 7999,
    minPercent: 2.8,
    maxPercent: 3.1,
    dailyTrades: 2,
  },
  5: {
    minInvestment: 8000,
    maxInvestment: 29999,
    minPercent: 3.3,
    maxPercent: 3.6,
    dailyTrades: 3,
  },
  6: {
    minInvestment: 30000,
    maxInvestment: 50000,
    minPercent: 3.8,
    maxPercent: 4.1,
    dailyTrades: 3,
  },
};

/* ===================== CYCLE BASE MANAGER ===================== */
/*
  Key design:
  - currentCycleBase is the principal eligible for doubling. Set *once* at cycle start.
  - walletSnapshotAtCycleStart = mainWallet at cycle start. External deposits/withdrawals update mainWallet, but
    they are tracked separately via walletSnapshotAtCycleStart and do NOT change currentCycleBase.
  - Use CycleBaseManager.recordExternalDeposit / recordWithdraw to update snapshot and mark flags.
*/
export const CycleBaseManager = {
  ensureInitial(user) {
    // safe initialising of fields
    if (
      user.currentCycleBase == null ||
      Number.isNaN(Number(user.currentCycleBase))
    ) {
      user.currentCycleBase = +Number(user.mainWallet || 0).toFixed(2);
      user.totalEarningsInCycle = +Number(
        user.totalEarningsInCycle || 0
      ).toFixed(2);
      user.cycleStartDate = user.cycleStartDate || new Date();
      user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(
        2
      );
      user.cycleWithdrawn = user.cycleWithdrawn || false;
    }
    if (!user.walletSnapshotAtCycleStart) {
      user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(
        2
      );
    }
    if (user.totalEarningsInCycle == null) user.totalEarningsInCycle = 0;
  },

  getSafeBase(user) {
    this.ensureInitial(user);
    return +Number(user.currentCycleBase || 0).toFixed(2);
  },

  getCycleTarget(user, level) {
    const base = this.getSafeBase(user);
    if (!level) level = Number(user.level || 1);
    let target = level === 5 || level === 6 ? base * 1.5 : base * 2;
    return +target.toFixed(2);
  },

  // Called when user makes an on-chain deposit (external)
  // Policy: do NOT add external deposit to currentCycleBase. Instead update snapshot to track external funds.
  recordExternalDeposit(user, amount) {
    if (!amount || amount <= 0) return;
    user.walletSnapshotAtCycleStart = +(
      Number(user.walletSnapshotAtCycleStart || 0) + Number(amount)
    ).toFixed(2);
    user.lastExternalDepositAt = new Date();
  },

  // Called when user withdraws during cycle
  recordWithdrawal(user, amount) {
    if (!amount || amount <= 0) return;
    user.walletSnapshotAtCycleStart = +(
      Number(user.walletSnapshotAtCycleStart || 0) - Number(amount)
    ).toFixed(2);
    user.cycleWithdrawn = true; // flag to penalize
    user.lastWithdrawalAt = new Date();
  },

  // add trade earnings (net after fee)
  addEarnings(user, roiAmount) {
    const amt = Number(roiAmount) || 0;
    if (amt <= 0) return;
    user.totalEarningsInCycle = +(
      Number(user.totalEarningsInCycle || 0) + amt
    ).toFixed(2);
  },

  // complete cycle
  completeCycle(user) {
    const target = this.getCycleTarget(user, Number(user.level || 1));
    user.currentCycleBase = +target.toFixed(2);
    user.totalEarningsInCycle = 0;
    user.cycleCount = (user.cycleCount || 0) + 1;
    user.cycleStartDate = new Date();
    user.walletSnapshotAtCycleStart = +Number(user.mainWallet || 0).toFixed(2);
    user.cycleWithdrawn = false;
  },
};

/* ===================== SPLIT / COINS ===================== */
export function randomSplit(total, parts) {
  if (parts <= 0) return [];
  if (!total) return Array(parts).fill(0);
  const w = Array.from({ length: parts }, () => Math.random());
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const raw = w.map((x) => (x / sum) * total);
  const rounded = raw.map((v) => +v.toFixed(2));
  const diff = +(total - rounded.reduce((a, b) => a + b, 0)).toFixed(2);
  rounded[rounded.length - 1] = +(rounded[rounded.length - 1] + diff).toFixed(
    2
  );
  return rounded;
}

// coins map (same as you used)
const coinNameMap = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binance-coin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "polygon",
  DOT: "polkadot-new",
  SHIB: "shiba-inu",
  AVAX: "avalanche",
  LTC: "litecoin",
  TRX: "tron",
  LINK: "chainlink",
  UNI: "uniswap",
  XLM: "stellar",
  ATOM: "cosmos",
};

export async function getRandomCoinsWithImages(count = 6) {
  const coinsArray = Object.entries(coinNameMap).map(([symbol, fullName]) => ({
    symbol,
    fullName,
  }));
  const selected = coinsArray.sort(() => Math.random() - 0.5).slice(0, count);
  try {
    const ids = selected.map((c) => coinNameMap[c.symbol]).join(",");
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
    const { data } = await axios.get(url, { timeout: 3000 });
    return selected.map((coin) => ({
      symbol: coin.symbol,
      fullName: coin.fullName,
      image: data.find((c) => c.id === coinNameMap[coin.symbol])?.image || "",
    }));
  } catch {
    return selected.map((coin) => ({ ...coin, image: "" }));
  }
}

/* ===================== ROI CALC (MIN PERCENT ONLY) ===================== */
/**
 * Use minPercent only. Apply capping against remainingTarget.
 * After computing gross roiAmount, apply 37% deduction => netRoi (this is the amount we count
 * towards cycle progress).
 */
export function calculateROI_MinPercent(
  tradeAmount,
  minPercent,
  remainingTarget,
  feePercent = 37
) {
  const roiPercent = Number(minPercent) || 0;
  let grossRoi = +((tradeAmount * roiPercent) / 100).toFixed(2);
  // if gross would exceed remaining target (target measured in earnings), cap it
  if (remainingTarget != null && grossRoi > remainingTarget) {
    grossRoi = +remainingTarget.toFixed(2);
  }
  // apply fee % to profit (not capital)
  const netRoi = +(grossRoi * (1 - feePercent / 100)).toFixed(2);
  return { roiPercent, grossRoi, netRoi };
}

/* ===================== FAIL CHANCE ===================== */
/**
 * Fail chance is computed based on earnings progress (NOT including external deposits),
 * but is *increased* if there are external deposits (walletSnapshot changed) or withdrawals mid-cycle.
 *
 * Params:
 *  - earningsInCycle : number (only earnings generated by trades)
 *  - walletExternalGain : number (mainWallet - walletSnapshotAtCycleStart, >=0)
 *  - cycleTarget : number
 *  - remainingDays : number
 *  - flags: { cycleWithdrawn: bool }
 */
export function getFailChance(
  earningsInCycle,
  walletExternalGain,
  cycleTarget,
  remainingDays,
  flags = {}
) {
  if (!cycleTarget || cycleTarget <= 0) return 1;
  const progress = Math.min(1, Number(earningsInCycle || 0) / cycleTarget); // 0..1
  let fail = 0.12; // base

  if (progress >= 0.95) fail = 0.9;
  else if (progress >= 0.85) fail = 0.65;
  else if (progress >= 0.7) fail = 0.45;
  else if (progress >= 0.5) fail = 0.3;
  else if (progress >= 0.3) fail = 0.18;

  // time pressure: if remainingDays is smaller than remainingProgress*45 -> success bias
  const remainingProgress = Math.max(0, 1 - progress);
  if (remainingDays < remainingProgress * 45) {
    fail *= 0.55; // less time than required -> bias success
  } else {
    fail *= 1.2; // plenty of time -> be stricter
  }

  // External top-up increases fail chance (discourage topping up to game doubling)
  if (walletExternalGain > 0) {
    const extra = Math.min(0.6, walletExternalGain / cycleTarget); // scaled
    fail = Math.min(1, fail + extra + 0.15);
  }

  // Withdrawal mid-cycle -> penalize
  if (flags && flags.cycleWithdrawn) {
    fail = Math.min(1, fail + 0.25);
  }

  return Math.max(0, Math.min(1, fail));
}

/* ===================== Tracking key ===================== */
export function resolveTrackingKey(req) {
  const hdr = (req.headers["x-trade-key"] || req.headers["X-Trade-Key"] || "")
    .toString()
    .trim();
  if (hdr) return hdr;
  return `TK-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export { FALLBACK_LEVEL_CONFIG as LEVEL_CONFIG };

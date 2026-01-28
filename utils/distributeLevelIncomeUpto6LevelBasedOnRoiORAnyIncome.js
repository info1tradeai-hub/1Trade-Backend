import LevelPercentage from "../models/LevelIncomePercentage.model.js";
import Commission from "../models/teamIncome.model.js";
import UserModel from "../models/user.model.js";
import addAmount from "../utils/RoundValue.js";
// export const distributeCommissions = async (user, roiAmount) => {
//   console.log(`\n==== DISTRIBUTING COMMISSIONS ====`);
//   console.log(`Source User: ${user._id} | ROI Amount: ${roiAmount}`);

//   try {
//     let currentUser = user;

//     // ✅ Go 3 levels up max
//     for (let i = 0; i < 3; i++) {
//       if (!currentUser.sponsorId) {
//         console.log(`No sponsor found at binary depth ${i + 1}`);
//         break;
//       }

//       // 🧠 Sponsor mil gaya
//       const uplineUser = await UserModel.findById(currentUser.sponsorId).select(
//         "_id sponsorId level currentEarnings mainWallet totalEarnings levelIncome totalEarningsInCycle"
//       );

//       if (!uplineUser) {
//         console.log(`Sponsor not found for ID: ${currentUser.sponsorId}`);
//         break;
//       }

//       // 🧩 Binary depth ke base par Team Type decide kar
//       let commissionType = "A";
//       if (i === 1) commissionType = "B";
//       else if (i === 2) commissionType = "C";

//       console.log(
//         `Found Sponsor (Depth ${i + 1}): ${uplineUser._id} | Rank: ${
//           uplineUser.level
//         } | Team: ${commissionType}`
//       );

//       // 🧾 Rank check — agar sponsor rank 0 ya invalid ho to skip
//       if (!uplineUser.level || uplineUser.level <= 0) {
//         console.log(`🚫 Skipping sponsor ${uplineUser._id} (invalid rank)`);
//         currentUser = uplineUser;
//         continue;
//       }

//       // 📊 Level Percentage nikal
//       const rateDoc = await LevelPercentage.findOne({
//         level: uplineUser.level,
//       });
//       if (!rateDoc) {
//         console.log(`⚠️ No LevelPercentage found for rank ${uplineUser.level}`);
//         currentUser = uplineUser;
//         continue;
//       }

//       // 📈 Team type ke base par % lo
//       const commissionPct = rateDoc[commissionType] || 0;
//       const commissionAmount = (roiAmount * commissionPct) / 100;

//       console.log(`
//       ------ COMMISSION TRACE ------
//       Sponsor ID: ${uplineUser._id}
//       Rank (Level): ${uplineUser.level}
//       Binary Depth: ${i + 1}
//       Team: ${commissionType}
//       Percentage: ${commissionPct}
//       Commission Amount: ${commissionAmount}
//       --------------------------------
//       `);

//       uplineUser.currentEarnings = addAmount(
//         uplineUser.currentEarnings,
//         commissionAmount
//       );
//       uplineUser.mainWallet = addAmount(
//         uplineUser.mainWallet,
//         commissionAmount
//       );
//       uplineUser.totalEarnings = addAmount(
//         uplineUser.totalEarnings,
//         commissionAmount
//       );
//       uplineUser.levelIncome = addAmount(
//         uplineUser.levelIncome,
//         commissionAmount
//       );
//       uplineUser.totalEarningsInCycle = addAmount(
//         uplineUser.totalEarningsInCycle,
//         commissionAmount
//       );
//       await uplineUser.save();

//       // 🧾 Commission Record (🚨 SAME structure rakha gaya)
//       await Commission.create({
//         userId: uplineUser._id,
//         fromUserId: user._id,
//         level: i + 1,
//         commissionType,
//         commissionPercentage: commissionPct,
//         commissionAmount,
//         amount: roiAmount,
//       });

//       console.log(
//         `✅ Commission added for ${uplineUser._id} (${commissionType})`
//       );

//       // 🔁 Go next upline
//       currentUser = uplineUser;
//     }

//     console.log(`==== COMMISSION DISTRIBUTION COMPLETE ====\n`);
//   } catch (error) {
//     console.error("❌ Error distributing commissions:", error);
//   }
// };

// export const distributeCommissions = async (user, roiAmount) => {
//   try {
//     console.log(`\n==== DISTRIBUTING COMMISSIONS ====`);
//     console.log(`Source User: ${user._id} | ROI Amount: ${roiAmount}`);

//     // ✅ STEP 1: Fetch latest source user with ONLY required fields
//     let currentUser = await UserModel.findById(user._id)
//       .select("_id sponsorId")
//       .lean();

//     if (!currentUser) return;

//     // ✅ STEP 2: Cache all Level percentages (1 query only)
//     const levelRates = await LevelPercentage.find({})
//       .select("level A B C")
//       .lean();

//     const levelMap = {};
//     levelRates.forEach((doc) => {
//       levelMap[doc.level] = doc;
//     });

//     // =====  START 3 LEVEL LOOP  =====
//     for (let depth = 0; depth < 3; depth++) {
//       if (!currentUser.sponsorId) break;

//       // 🔥 Fetch upline user with ONLY required fields
//       const uplineUser = await UserModel.findById(currentUser.sponsorId)
//         .select(
//           "_id sponsorId level currentEarnings mainWallet totalEarnings levelIncome totalEarningsInCycle"
//         )
//         .lean();

//       if (!uplineUser) break;

//       // 🔥 Determine commission type based on depth
//       const commissionType = depth === 0 ? "A" : depth === 1 ? "B" : "C";

//       console.log(
//         `Found Sponsor (Depth ${depth + 1}): ${uplineUser._id} | Level: ${
//           uplineUser.level
//         } | Team: ${commissionType}`
//       );

//       // 🚫 Skip if level invalid
//       if (!uplineUser.level || uplineUser.level <= 0) {
//         currentUser = uplineUser;
//         continue;
//       }

//       // 🔥 Fetch percentage from cached data (NO DB CALL)
//       const rateDoc = levelMap[uplineUser.level];
//       if (!rateDoc) {
//         console.log(`⚠️ No commission rate for level ${uplineUser.level}`);
//         currentUser = uplineUser;
//         continue;
//       }

//       const commissionPct = rateDoc[commissionType] || 0;
//       const commissionAmount = (roiAmount * commissionPct) / 100;

//       // 🚫 0% commission? Skip saving
//       if (commissionAmount <= 0) {
//         currentUser = uplineUser;
//         continue;
//       }

//       // 🔥 Update user wallets with atomic update (NO find → save)
//       await UserModel.updateOne(
//         { _id: uplineUser._id },
//         {
//           $inc: {
//             currentEarnings: commissionAmount,
//             mainWallet: commissionAmount,
//             totalEarnings: commissionAmount,
//             levelIncome: commissionAmount,
//             totalEarningsInCycle: commissionAmount,
//           },
//         }
//       );

//       // 🔥 Create commission record
//       await Commission.create({
//         userId: uplineUser._id,
//         fromUserId: user._id,
//         level: depth + 1,
//         commissionType,
//         commissionPercentage: commissionPct,
//         commissionAmount,
//         amount: roiAmount,
//       });

//       console.log(
//         `✅ Commission added → Sponsor: ${uplineUser._id} | Amount: ${commissionAmount}`
//       );

//       // Move to next upline
//       currentUser = uplineUser;
//     }

//     console.log(`==== COMMISSION DISTRIBUTION COMPLETE ====\n`);
//   } catch (error) {
//     console.error("❌ Error distributing commissions:", error);
//   }
// };

// export const distributeCommissions = async (user, roiAmount) => {
//   try {
//     console.log(
//       `\n\n==================== COMMISSION START ====================`
//     );
//     console.log(`SOURCE USER: ${user._id} | ROI: ${roiAmount}`);

//     // STEP 1: Fetch latest source user
//     let currentUser = await UserModel.findById(user._id)
//       .select("_id sponsorId")
//       .lean();

//     if (!currentUser) return;

//     // STEP 2: Cache Level Rates
//     const levelRates = await LevelPercentage.find({})
//       .select("level A B C")
//       .lean();

//     const levelMap = {};
//     levelRates.forEach((doc) => (levelMap[doc.level] = doc));

//     // ================= LOOP 3 LEVELS ===================
//     for (let depth = 0; depth < 3; depth++) {
//       if (!currentUser.sponsorId) {
//         console.log(`NO SPONSOR AT DEPTH: ${depth + 1}`);
//         break;
//       }

//       // FETCH UPLINE
//       const uplineUser = await UserModel.findById(currentUser.sponsorId)
//         .select(
//           "_id sponsorId level currentEarnings mainWallet totalEarnings levelIncome totalEarningsInCycle"
//         )
//         .lean();

//       if (!uplineUser) {
//         console.log(`❌ SPONSOR NOT FOUND: ${currentUser.sponsorId}`);
//         break;
//       }

//       console.log(
//         `\n➡ DEPTH ${depth + 1} | SPONSOR: ${uplineUser._id} | RAW LEVEL: ${
//           uplineUser.level
//         }`
//       );

//       // 🔥 HARD DEBUG: trace if level suddenly dropped
//       if (uplineUser.level < 2) {
//         console.log(
//           `🚨 WARNING: SPONSOR ${uplineUser._id} LEVEL DROPPED TO ${uplineUser.level} (EXPECTED >=2)`
//         );
//       }

//       // TEAM TYPE
//       const commissionType = depth === 0 ? "A" : depth === 1 ? "B" : "C";

//       console.log(
//         `TEAM TYPE: ${commissionType} | USING LEVEL: ${uplineUser.level}`
//       );

//       // SKIP INVALID
//       if (!uplineUser.level || uplineUser.level <= 0) {
//         console.log(`⛔ SKIPPED (INVALID LEVEL): ${uplineUser._id}`);
//         currentUser = uplineUser;
//         continue;
//       }

//       // GET RATE FROM CACHE
//       const rateDoc = levelMap[uplineUser.level];
//       if (!rateDoc) {
//         console.log(
//           `❌ NO LEVEL RATE FOUND FOR LEVEL ${uplineUser.level} — SKIPPING`
//         );
//         currentUser = uplineUser;
//         continue;
//       }

//       const commissionPct = rateDoc[commissionType] || 0;
//       const commissionAmount = (roiAmount * commissionPct) / 100;

//       console.log(
//         `RATE FETCHED → Level: ${uplineUser.level} | %: ${commissionPct} | Amount: ${commissionAmount}`
//       );

//       if (commissionAmount <= 0) {
//         console.log(`⛔ ZERO COMMISSION AMOUNT — SKIPPING`);
//         currentUser = uplineUser;
//         continue;
//       }

//       // UPDATE USER (ATOMIC)
//       await UserModel.updateOne(
//         { _id: uplineUser._id },
//         {
//           $inc: {
//             currentEarnings: commissionAmount,
//             mainWallet: commissionAmount,
//             totalEarnings: commissionAmount,
//             levelIncome: commissionAmount,
//             totalEarningsInCycle: commissionAmount,
//           },
//         }
//       );

//       console.log(
//         `✅ COMMISSION ADDED → ${uplineUser._id} | +${commissionAmount}`
//       );

//       const updatedRank = await UserModel.findById(uplineUser._id)
//         .select("level")
//         .lean();

//       console.log(
//         `🔍 POST-UPDATE CHECK → SPONSOR ${uplineUser._id} LEVEL NOW: ${updatedRank.level}`
//       );

//       await Commission.create({
//         userId: uplineUser._id,
//         fromUserId: user._id,
//         level: depth + 1,
//         commissionType,
//         commissionPercentage: commissionPct,
//         commissionAmount,
//         amount: roiAmount,
//       });

//       currentUser = uplineUser;
//     }

//     console.log(`==================== COMMISSION END ====================\n`);
//   } catch (error) {
//     console.error("❌ ERROR DISTRIBUTING COMMISSIONS:", error);
//   }
// };

// utils
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

export const distributeCommissions = async (user, roiAmount) => {
  try {
    console.log(`\n==================== COMMISSION START ====================`);
    console.log(`SOURCE USER: ${user._id} | ROI: ${roiAmount}`);

    // 1) load fresh source user from PRIMARY
    let currentUser = await UserModel.findById(user._id)
      .read("primary")
      .select("_id sponsorId")
      .lean();

    if (!currentUser) {
      console.log("❌ Source user not found, aborting.");
      return;
    }

    // 2) cache level rates once
    const levelRates = await LevelPercentage.find({})
      .select("level A B C")
      .lean();
    const levelMap = {};
    levelRates.forEach((d) => (levelMap[d.level] = d));

    // Retry config (tune if needed)
    const MAX_VERIFY_ATTEMPTS = 3;
    const VERIFY_DELAY_MS = 120; // small delay between verify reads

    for (let depth = 0; depth < 3; depth++) {
      if (!currentUser.sponsorId) {
        console.log(`NO SPONSOR AT DEPTH ${depth + 1}`);
        break;
      }

      // 3) fetch upline from PRIMARY (single read)
      let upline = await UserModel.findById(currentUser.sponsorId)
        .read("primary")
        .select("_id sponsorId level")
        .lean();

      if (!upline) {
        console.log(`❌ UPLINE NOT FOUND: ${currentUser.sponsorId}`);
        break;
      }

      // 4) double-verify level stability (detect stale read / racing writes)
      let verified = false;
      let attempts = 0;
      while (attempts < MAX_VERIFY_ATTEMPTS && !verified) {
        attempts++;
        // second quick read (primary) to confirm level
        const secondRead = await UserModel.findById(upline._id)
          .read("primary")
          .select("level updatedAt") // get updatedAt to see if writes happened recently
          .lean();

        console.log(
          `VERIFY[${attempts}] → UPLINE ${upline._id} | firstLevel=${upline.level} | secondLevel=${secondRead?.level} | secondUpdatedAt=${secondRead?.updatedAt}`
        );

        if (secondRead && secondRead.level === upline.level) {
          verified = true;
          break;
        }

        // mismatch: wait a tiny bit and re-fetch the primary fresh into upline, then loop
        await wait(VERIFY_DELAY_MS);
        upline = await UserModel.findById(currentUser.sponsorId)
          .read("primary")
          .select("_id sponsorId level")
          .lean();

        // continue loop to re-verify
      }

      if (!verified) {
        // final fallback: use latest primary read value (upline now has latest)
        console.log(
          `⚠️ LEVEL NOT STABLE AFTER ${MAX_VERIFY_ATTEMPTS} ATTEMPTS → USING LATEST: ${upline._id} | level=${upline.level}`
        );
      }

      const commissionType = depth === 0 ? "A" : depth === 1 ? "B" : "C";

      console.log(
        `\n➡ DEPTH ${depth + 1} | SPONSOR: ${upline._id} | LEVEL (used) = ${
          upline.level
        } | TEAM: ${commissionType}`
      );

      // invalid / zero / missing rate checks
      if (!upline.level || upline.level <= 0) {
        console.log(`⛔ SKIPPED (invalid level) for ${upline._id}`);
        currentUser = upline;
        continue;
      }

      const rateDoc = levelMap[upline.level];
      if (!rateDoc) {
        console.log(
          `❌ NO LEVEL RATE FOUND FOR LEVEL ${upline.level} — SKIPPING`
        );
        currentUser = upline;
        continue;
      }

      const commissionPct = rateDoc[commissionType] || 0;
      const commissionAmount = (roiAmount * commissionPct) / 100;

      if (commissionAmount <= 0) {
        console.log(`⛔ ZERO COMMISSION — skipping for ${upline._id}`);
        currentUser = upline;
        continue;
      }

      // 5) perform atomic wallet update (no find→save)
      await UserModel.updateOne(
        { _id: upline._id },
        {
          $inc: {
            currentEarnings: commissionAmount,
            mainWallet: commissionAmount,
            totalEarnings: commissionAmount,
            levelIncome: commissionAmount,
            totalEarningsInCycle: commissionAmount,
            todayLevelIncome: commissionAmount,
          },
        }
      );

      // 6) create commission record
      await Commission.create({
        userId: upline._id,
        fromUserId: user._id,
        level: depth + 1,
        commissionType,
        commissionPercentage: commissionPct,
        commissionAmount,
        amount: roiAmount,
      });

      console.log(`✅ COMMISSION ADDED → ${upline._id} | +${commissionAmount}`);

      // Optional: post-update read to confirm level still same (debug)
      const after = await UserModel.findById(upline._id)
        .read("primary")
        .select("level updatedAt")
        .lean();
      console.log(
        `POST-UPDATE CHECK → ${upline._id} | level=${after.level} | updatedAt=${after.updatedAt}`
      );

      // move up
      currentUser = upline;
    }

    console.log(`==================== COMMISSION END ====================\n`);
  } catch (err) {
    console.error("❌ Error in distributeCommissions:", err);
  }
};

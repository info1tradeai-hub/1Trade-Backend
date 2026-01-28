const minPercent = 2; // example Level-2 min%
const minInvestment = 400;
const maxInvestment = 1500;
const safetyGap = 8;

const simulate = (startingWallet) => {
  let cyclePrincipal = Math.min(startingWallet, maxInvestment);
  let doubleBase = cyclePrincipal;
  let doubleTarget = cyclePrincipal * 1.5;

  let usedProfit = 0;
  let tradeNumber = 0;
  let totalFailed = 0;
  let totalSuccess = 0;

  console.log(`\n=== SIMULATION START: Wallet = ${startingWallet} ===`);
  console.log(`Cycle Base: ${doubleBase}, Target: ${doubleTarget}\n`);

  const rawProfitCalc = () =>
    parseFloat(((cyclePrincipal * minPercent) / 100).toFixed(2));

  while (usedProfit < doubleTarget - doubleBase - safetyGap) {
    tradeNumber++;
    let rawProfit = rawProfitCalc();
    let remaining = doubleTarget - doubleBase - safetyGap - usedProfit;
    let fail = false;
    let roiAmount = rawProfit;

    // --- Smart Fail Logic Similar To Live Backend ---
    const remainingTradesIfSuccess = Math.ceil(remaining / rawProfit) - 1;
    const CAP_NEAR = remainingTradesIfSuccess <= 3;
    const levelIncomeUsed = 0;

    if (remaining <= rawProfit + 0.05) fail = false;
    else if (!CAP_NEAR) {
      const failRanges = [
        { start: 1, end: 5 },
        { start: 6, end: 10 },
        { start: 11, end: 15 },
        { start: 16, end: 19 },
      ];
      const currentRange = failRanges.find(
        (r) => tradeNumber >= r.start && tradeNumber <= r.end
      );
      if (currentRange) {
        const prob = 1 / (currentRange.end - currentRange.start + 1);
        if (Math.random() < prob) {
          fail = true;
          roiAmount = 0;
        }
      }
    }
    if (
      !fail &&
      levelIncomeUsed > 0 &&
      remaining <= levelIncomeUsed + rawProfit
    ) {
      fail = true;
      roiAmount = 0;
    }
    // ----------------------------------------------------

    if (fail) {
      totalFailed++;
      console.log(`Trade ${tradeNumber}: ❌ FAILED`);
    } else {
      totalSuccess++;
      usedProfit += roiAmount;
      console.log(
        `Trade ${tradeNumber}: ✔ SUCCESS +${roiAmount} (Total ROI: ${usedProfit.toFixed(
          2
        )})`
      );
    }

    if (tradeNumber > 200) {
      // safety
      console.log("⛔ Simulation aborted. Trades too high!");
      break;
    }
  }

  const finalWallet = parseFloat((startingWallet + usedProfit).toFixed(2));

  console.log("\n===== CYCLE COMPLETE =====");
  console.log(`Trades: ${tradeNumber}`);
  console.log(`Success: ${totalSuccess}`);
  console.log(`Fails: ${totalFailed}`);
  console.log(`ROI Earned: ${usedProfit.toFixed(2)}`);
  console.log(`Final Wallet: ${finalWallet}\n`);

  return finalWallet;
};

// RUN TEST with input
import readline from "readline";
const r = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
r.question("Enter starting wallet amount: ", (amt) => {
  simulate(parseFloat(amt));
  r.close();
});

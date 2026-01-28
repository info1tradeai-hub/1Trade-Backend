import JoiningBonusReward from "../models/joiningBonusReward.model.js";

const joiningBonusSlab = await JoiningBonusReward.findOne({
  depositAmount: amount,
});

if (joiningBonusSlab) {
  if (joiningBonusSlab.bonusAmount > 0) {
    user.mainWallet += joiningBonusSlab.bonusAmount;
    await user.save();

    await UserReward.create({
      userId: user._id,
      amount: joiningBonusSlab.bonusAmount,
      message: `Joining bonus of $${joiningBonusSlab.bonusAmount} for deposit of $${amount}`,
    });

    console.log(
      `✅ Joining bonus $${joiningBonusSlab.bonusAmount} credited to ${user._id}`
    );
  } else {
    console.log(
      `ℹ️ Joining bonus slab found for $${amount} but bonusAmount is 0, skipping.`
    );
  }
} else {
  console.log(`❌ No joining bonus slab found for deposit $${amount}`);
}

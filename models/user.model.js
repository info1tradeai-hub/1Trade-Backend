import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    referralCode: {
      type: String,
      unique: true,
    },
    mainWallet: {
      type: Number,
      default: 0,
    },
    mainWalletPayouts: {
      type: Number,
      default: 0,
    },
    doubleBase: { type: Number, default: 0 },
    doubleTarget: { type: Number, default: 0 },

    walletSnapshotAtCycleStart: { type: Number, default: 0 },
    additionalWalletPayouts: {
      type: Number,
      default: 0,
    },
    currentCycleBase: { type: Number },
    totalEarningsInCycle: { type: Number, default: 0 },
    cycleCount: { type: Number, default: 0 },
    cycleStartDate: { type: Date, default: Date.now },

    walletBalance: { type: Number, default: 0 },
    withdrawnTotal: { type: Number, default: 0 },
    additionalFund: {
      type: Number,
      default: 0,
    },
    mainFund: {
      type: Number,
      default: 0,
    },
    principleAmount: {
      type: Number,
      default: 0,
    },
    currentToken: String,
    additionalWallet: {
      type: Number,
      default: 0,
    },
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      default: null,
    },
    todayLevelIncome: {
      type: Number,
      default: 0,
    },
    roiMaxEligibleInvestment: {
      type: Number,
      default: 0,
    },
    roiInvestedLevel2: {
      type: Number,
      default: 0,
    },
    username: {
      type: String,
      unique: true,
    },
    twoFactorAuthVerified: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
    },
    parentReferedCode: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: true,
      // unique: true,
    },
    aiCredits: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      default: null,
    },
    left: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      default: null,
    },
    isTrading: {
      type: Boolean,
      default: false,
    },
    right: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      default: null,
    },
    position: { type: String, default: null },
    referedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserModel" }],
    totalEarnings: { type: Number, default: 0 },
    currentEarnings: { type: Number, default: 0 },
    walletAddress: {
      type: String,
      sparse: true,
    },
    isjoiningBonusGiven: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"] },
    status: { type: Boolean, default: false },
    activeDate: { type: Date, default: null },
    totalPayouts: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 0,
    },
    BonusCredit: {
      type: Number,
      default: 0,
    },
    isJoiningBonusGetFirstTime: {
      type: Boolean,
      default: false,
    },
    lastUpgradeAt: {
      type: Date,
      default: null,
    },
    stakeAmount: {
      type: Number,
      default: 0,
    },
    bonusAddedAt: {
      type: Date,
      default: null,
    },
    phone: {
      type: Number,
    },
    otp: {
      type: String,
      default: "",
    },
    otpExpire: {
      type: Date,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    transferCount: {
      type: Number,
      default: 0,
    },
    mainWalletPrinciple: {
      type: Number,
      default: 0,
    },
    additionalAiAgentDailyIncome: {
      type: Number,
      default: 0,
    },
    additionalAiAgentTotalIncome: {
      type: Number,
      default: 0,
    },
    additionalWalletPrinciple: {
      type: Number,
      default: 0,
    },
    withdrawalPendingAmount: {
      type: Number,
      default: 0,
    },
    isTransferActive: {
      type: Boolean,
      default: 0,
    },
    depositMainWallet: {
      type: Number,
      default: 0,
    },
    timelineStart: { type: Date, default: null },
    timelineEnd: { type: Date, default: null },
    trailFund: { type: Number, default: 0 },

    investments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Investment" }],
    totalInvestment: {
      type: Number,
      default: 0,
    },
    dailyRoi: {
      type: Number,
      default: 0,
    },
    countryName: {
      type: String,
      default: "",
    },
    additionalAirdrop: {
      type: Number,
      default: 0,
    },
    additionalReward: {
      type: Number,
      default: 0,
    },
    additionalSystemGift: {
      type: Number,
      default: 0,
    },
    lastTradeLimitTime: {
      type: Date,
      default: null,
    },
    countryCode: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    totalRoi: {
      type: Number,
      default: 0,
    },
    createdByAdmin: {
      type: Boolean,
      default: false,
    },
    bonusTrade: {
      type: Number,
      default: 0,
    },
    totalBonusTrade: {
      type: Number,
      default: 0,
    },
    totalWithdrawals: {
      type: Number,
      default: 0,
    },
    lastTradeDate: {
      type: Date,
      default: null,
    },
    todayTradeCount: {
      type: Number,
      default: 0,
    },
    mainRewards: {
      type: Number,
      default: 0,
    },
    totalSuccessfulTrades: {
      type: Number,
      default: 0,
    },
    totalFailedTrades: {
      type: Number,
      default: 0,
    },
    totalTradeCount: {
      type: Number,
      default: 0,
    },
    lastLoginDate: {
      type: Date,
      default: null,
    },
    levelUpgradeDate: {
      type: Date,
      default: null,
    },
    lastTradeDay: {
      type: Date,
      default: null,
    },

    maxLevelAchieved: {
      type: Number,
      default: 0,
    },
    lastTradeLevel: {
      type: Number,
      default: null,
    },
    isLoginBlocked: {
      type: Boolean,
      default: false,
    },
    isLoginBlockedDate: {
      type: Date,
      default: null,
    },
    levelIncome: {
      type: Number,
      default: 0,
    },
    directReferalAmount: {
      type: Number,
      default: 0,
    },
    withdrawalCount: {
      type: Number,
      default: 0,
    },
    lastWithdrawalDate: {
      type: Date,
    },

    withdrawalBlockedUntil: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    lastEditDate: {
      type: Date,
      default: null,
    },
    aiAgentDaily: {
      type: Number,
      default: 0,
    },
    aiAgentTotal: {
      type: Number,
      default: 0,
    },
    isUpgraded: {
      type: Boolean,
      default: false,
    },
    twoFASecret: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    macAddress: {
      type: String,
      default: "",
    },
    bep20Address: {
      type: String,
      unique: true,
      sparse: true,
    },
    isAdminLoginBlock: {
      type: Boolean,
      default: false,
    },
    isAiBtnClick: {
      type: Boolean,
      defaul: false,
    },
    tradeTimer: {
      type: String,
      default: null,
    },
    depositPrivateKey: {
      type: String,
      default: null,
    },
    isActivatedOnce: {
      type: Boolean,
      default: false,
    },
    uuid: {
      type: String,
      unique: true,
    },
    todayMainWalletRewards: {
      type: Number,
      default: 0,
    },
    additionalWalletReward: {
      type: Number,
      default: 0,
    },
    todayAdditionalWalletReward: {
      type: Number,
      default: 0,
    },
    todayAdditionalWallet: {
      type: Number,
      default: 0,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    isWithdrawalBlocked: {
      type: Boolean,
      default: false,
    },
    adminWithdrawalBlock: {
      type: Boolean,
      defaault: false,
    },
    depositWalletAddress: {
      type: String,
      default: null,
    },
    LevelOnePopup: {
      type: Boolean,
      default: false,
    },
    LevelTwoPopup: {
      type: Boolean,
      default: false,
    },
    LevelThreePopup: {
      type: Boolean,
      default: false,
    },
    airdrop: {
      type: Number,
      default: 0,
    },
    systemGift: {
      type: Number,
      default: 0,
    },
    reward: {
      type: Number,
      default: 0,
    },
    LevelFourPopup: {
      type: Boolean,
      default: false,
    },
    LevelFivePopup: {
      type: Boolean,
      default: false,
    },
    cycleTradeCount: { type: Number, default: 0 },
    LevelSixPopup: {
      type: Boolean,
      default: false,
    },
    cyclePrincipal: {
      type: Number,
      default: 0,
    },
    tradeLocked: {
      type: Boolean,
      default: false,
    },

    lastDowngradedFrom: {
      type: Number,
      default: 0,
    },
    cycleWithdrawn: { type: Number, default: 0 },
    cycleWithdrawnPending: { type: Number, default: 0 },

    pendingLevelIncome: {
      type: Number,
      default: 0,
    },
    trc20Address: {
      type: String,
      unique: true,
      sparse: true,
    },
    LevelOneUpgraded: {
      type: Boolean,
      default: false,
    },
    lastCycleLevel: {
      type: Number,
      default: 0,
    },
    block1Fails: { type: Number, default: 0 },
    block2Fails: { type: Number, default: 0 },

    LevelTwoUpgraded: {
      type: Boolean,
      default: false,
    },
    LevelThreeUpgraded: {
      type: Boolean,
      default: false,
    },
    LevelFourUpgraded: {
      type: Boolean,
      default: false,
    },
    LevelFiveUpgraded: {
      type: Boolean,
      default: false,
    },
    LevelSixUpgraded: {
      type: Boolean,
      default: false,
    },
    transferBlock: {
      type: Boolean,
      default: 0,
    },
    aiTradeFreez: {
      type: Boolean,
      default: false,
    },
    levelDwongradedAt: {
      type: Date,
      default: null,
    },
    isReferralGet: {
      type: Boolean,
      default: false,
    },
    isLevelOneMemberValidAiCredit: {
      type: Boolean,
      default: false,
    },
    capHit: { type: Boolean, default: false },
    remainingSuccessNeeded: { type: Number, default: 0 },
    remainingTradesAfterCap: { type: Number, default: 0 },
  },

  { timestamps: true }
);
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ uuid: 1 }, { unique: true });
userSchema.index({ mainWallet: 1, additionalWallet: 1 });
userSchema.index({ sponsorId: 1 });
userSchema.index({ createdAt: -1 });
const UserModel = mongoose.model("UserModel", userSchema);
export default UserModel;

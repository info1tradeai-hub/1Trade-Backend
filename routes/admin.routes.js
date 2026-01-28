import express from "express";
import {
  activeOrDeactiveBannerStatus,
  activeUser,
  addAiCredit,
  addLevelCommission,
  adminforgotPassword,
  adminLogin,
  adminLogout,
  adminPasswordLogin,
  adminRegister,
  adminSendRewards,
  allHistory,
  allroiIncomeHistory,
  blockUsers,
  blockUserWithdrawal,
  changeDepositAmount,
  changeReferralPercentage,
  changeReferralTradeCredit,
  changeWithdrawalLimit,
  changeWithdrawalStatus,
  connectGoogleAuthenticator,
  createAgentPlan,
  createJoiningBonusSlab,
  createLevelRequirement,
  createOrUpdateRoiLevel,
  createReferRewardSlab,
  createRoiLevel,
  dashboardBannerActive,
  deductAdditionalWallet,
  deductAiCredit,
  deductMainWallet,
  deleteDashboardBanner,
  deleteJoiningBonusSlab,
  deleteManyUserById,
  deleteNotification,
  deleteReferRewardSlab,
  deleteUserById,
  deleteUsers,
  depositLimitAmount,
  editAccountRecoveryFee,
  editAiAgentFee,
  editDashboardBanner,
  getAllUsersForChat,
  editedUserByAdmin,
  editProfileById,
  editTransferFee,
  editWithdrawalFee,
  filterUserByMemberandLevel,
  getAdminInfo,
  getAdminReferralRewardSlab,
  getAiAgentPlans,
  getAiTradeCounter,
  getAllActivity,
  getAllBanners,
  getAllDepositChangeHistory,
  getAllIncomes,
  getAllInvestedUsers,
  getAllLevelAchivment,
  getAllLevelIncomeHistory,
  getAllLevelPercentage,
  getAllNotificationbanner,
  getAllReferalBonusHistory,
  getAllUserCreatedByAdmin,
  getAllUsers,
  getAllUsersLevelCount,
  getAllWithdrawalBlockUsers,
  getAllWithdrawalLimits,
  getAnnoucement,
  getDashboardBanner,
  getDashboardStats,
  getDepositAmount,
  getEditedUserHistory,
  getInactiveBlockDays,
  getJoiningBonusSlabs,
  getLevelPercentage,
  getLiveTransactionHistory,
  getMonthlyStats,
  getPdfs,
  getProfile,
  getReferalRewardSlab,
  getReferralAndTradeCredit,
  getReferralTradeCredit,
  getSystemHealth,
  getUsersByCountry,
  getUserTeamById,
  getUserTransactionHistory,
  getWithdrawalCounters,
  getWithdrawalFee,
  getWithdrawalLimit,
  investmentAndDepositHistory,
  notificationPopupCreate,
  notificationToggle,
  PlanvalueUpdateOfAgent,
  registerUserByAdmin,
  saveAdminInfo,
  sendOtpForAdminPaswordReset,
  sendOTPForEmailAdmin,
  setAuth,
  setInactiveBlockDays,
  setOrUpdateReferralSlab,
  setWalletAddress,
  setWithdrawalHourForWithdrawal,
  toggleNotification,
  UnblockblockUsers,
  unblockUserLogin,
  updateAgentPlan,
  updateAiTradeCounter,
  updateLevelRequirement,
  updateMultipleAiCredits,
  updateMultipleLevels,
  updateNotificationPopup,
  updateReferralAmount,
  updateUserProfile,
  uploadDashboardBanner,
  uploadPdfs,
  upsertWithdrawalLimit,
  userTopupAdditionalWallet,
  userTopupMainWallet,
  withdrawalBlockByUUID,
  withdrawalUnBlockByUUID,
  getAllTicketHistory,
  approveTicket,
  rejecteTicket,
  deleteSupportById,
  addLevelIncomeInmainWalletAndPendingWallet,
} from "../controllers/admin.controller.js";

import { isAdminAuthenticated } from "../middlewares/adminMiddleware.js";
import {
  getAllAnoucement,
  getDeductionHistory,
  uploadImageOfChat,
} from "../controllers/user.controller.js";
import upload from "../utils/upload.js";
import {
  approveWithdrawalByAdmin,
  rejectWithdrawalByAdmin,
} from "../controllers/withdrwal.controller.js";
import bannerUpload from "../utils/multer.js";
import {
  deleteUserChatByAdmin,
  getMessages,
} from "../controllers/message.controller.js";
import chatUpload from "../utils/multer2.js";

const router = express.Router();

/* =========================================================================
   🔐 AUTHENTICATION
   ========================================================================= */
router.post("/master-control-x9k7", adminLogin);
// router.post("/login", adminLogin);
// router.post("/register", adminRegister);
router.post(
  "/send-otp-for-admin-reset",
  // loginRateLimiter,
  sendOtpForAdminPaswordReset
);
router.post("/admin-password-reset", adminforgotPassword);
router.post("/admin-password-login", adminPasswordLogin);
router.get("/admin-logout", isAdminAuthenticated, adminLogout);
/* =========================================================================
   👤 PROFILE & BASIC INFO
   ========================================================================= */
router.get("/getProfile", isAdminAuthenticated, getProfile);
router.get("/get-adminInfo", isAdminAuthenticated, getAdminInfo);
router.post("/update-footer", isAdminAuthenticated, saveAdminInfo);
router.post("/verify-auth", isAdminAuthenticated, setAuth);
router.post("/set-address", isAdminAuthenticated, setWalletAddress);
router.get("/get-agent-plan", isAdminAuthenticated, getAiAgentPlans);
router.get(
  "/send-otp",
  // loginRateLimiter,
  isAdminAuthenticated,
  sendOTPForEmailAdmin
);

/* =========================================================================
   👥 USER MANAGEMENT
   ========================================================================= */
router.get("/getAllUsers", isAdminAuthenticated, getAllUsers);
router.get("/get-all-users", isAdminAuthenticated, getAllUsers);
router.get("/get-all-users-level", isAdminAuthenticated, getAllUsersLevelCount);
router.get("/get-users-by-country", isAdminAuthenticated, getUsersByCountry);
router.get(
  "/get-users-createdby-admin",
  isAdminAuthenticated,
  getAllUserCreatedByAdmin
);
router.post(
  "/register-user",
  isAdminAuthenticated,
  upload.single("profileImage"),
  registerUserByAdmin
);
router.post("/delete/:userId", isAdminAuthenticated, deleteUserById);
router.post("/delete-users", isAdminAuthenticated, deleteUsers);
router.post("/delete-selected-users", isAdminAuthenticated, deleteManyUserById);
router.post("/edit-profile", isAdminAuthenticated, editProfileById);
router.get("/get-edited-users", isAdminAuthenticated, editedUserByAdmin);
router.post(
  "/get-edited-user-history",
  isAdminAuthenticated,
  getEditedUserHistory
);
router.post("/block-users", isAdminAuthenticated, blockUsers);
router.post("/unblock-users", isAdminAuthenticated, UnblockblockUsers);
router.post("/unblock-login-user/:id", unblockUserLogin);
router.post("/active-user", isAdminAuthenticated, activeUser);
router.post("/filter-user", isAdminAuthenticated, filterUserByMemberandLevel);

/* =========================================================================
   💰 WALLET & DEPOSITS
   ========================================================================= */
router.post("/deposit", isAdminAuthenticated, depositLimitAmount);
router.post("/change-deposit", isAdminAuthenticated, changeDepositAmount);
router.get("/get-deposit", isAdminAuthenticated, getDepositAmount);
router.get("/get-credit", isAdminAuthenticated, getReferralAndTradeCredit);
router.post(
  "/change-referral-trade-aicredits",
  isAdminAuthenticated,
  changeReferralTradeCredit
);
router.post(
  "/get-referral-trade-aicredits",
  isAdminAuthenticated,
  getReferralTradeCredit
);
router.get(
  "/main-wallet-deposit-set-history",
  isAdminAuthenticated,
  getAllDepositChangeHistory
);
router.get("/deduction-history", isAdminAuthenticated, getDeductionHistory);
router.post(
  "/user-topup-mainWallet",
  isAdminAuthenticated,
  userTopupMainWallet
);
router.post(
  "/user-topup-additionalWallet",
  isAdminAuthenticated,
  userTopupAdditionalWallet
);
router.post("/deduct-mainWallet", isAdminAuthenticated, deductMainWallet);
router.post(
  "/deduct-additionalWallet",
  isAdminAuthenticated,
  deductAdditionalWallet
);
router.post("/add-aicredit", isAdminAuthenticated, addAiCredit);
router.post("/deduct-aicredit", isAdminAuthenticated, deductAiCredit);
router.post("/update-aicredit", isAdminAuthenticated, updateMultipleAiCredits);

/* =========================================================================
   📈 ROI / LEVEL / COMMISSION
   ========================================================================= */
router.post("/roi-create", isAdminAuthenticated, createRoiLevel);
router.post("/roi-update", isAdminAuthenticated, createOrUpdateRoiLevel);
router.post("/level-income", isAdminAuthenticated, addLevelCommission);
router.post(
  "/level-reuirement-schema",
  isAdminAuthenticated,
  createLevelRequirement
);
router.patch(
  "/level-reuirement-update",
  isAdminAuthenticated,
  updateLevelRequirement
);
router.get("/get-levels", isAdminAuthenticated, getAllLevelPercentage);
router.get("/get-level-percent", isAdminAuthenticated, getLevelPercentage);
router.get(
  "/get-level-requirement",
  isAdminAuthenticated,
  getAllLevelAchivment
);
router.post(
  "/update-multiple-levels",
  isAdminAuthenticated,
  updateMultipleLevels
);
router.post(
  "/direct-percentage-change",
  isAdminAuthenticated,
  changeReferralPercentage
);
router.put(
  "/change-referral-percentage",
  isAdminAuthenticated,
  changeReferralPercentage
);
router.post("/change-referral", isAdminAuthenticated, updateReferralAmount);

/* =========================================================================
   🎁 REWARDS / BONUS / SLABS
   ========================================================================= */
router.post("/create-reward-slab", isAdminAuthenticated, createReferRewardSlab);
router.post("/delete-reward-slab", isAdminAuthenticated, deleteReferRewardSlab);
router.post(
  "/create-joining-bonus-slab",
  isAdminAuthenticated,
  createJoiningBonusSlab
);
router.post(
  "/delete-joining-slab",
  isAdminAuthenticated,
  deleteJoiningBonusSlab
);
router.get("/get-referral-slabs", isAdminAuthenticated, getReferalRewardSlab);
router.get("/get-joining-slabs", isAdminAuthenticated, getJoiningBonusSlabs);
router.post(
  "/set-referral-slab",
  isAdminAuthenticated,
  setOrUpdateReferralSlab
);
router.post("/reward-given", isAdminAuthenticated, adminSendRewards);
router.get(
  "/get-multireferral",
  isAdminAuthenticated,
  getAdminReferralRewardSlab
);

/* =========================================================================
   🏦 WITHDRAWALS
   ========================================================================= */
router.post(
  "/create-withdrwal-limit",
  isAdminAuthenticated,
  upsertWithdrawalLimit
);
router.get(
  "/getAll-withdrwal-limit",
  isAdminAuthenticated,
  getAllWithdrawalLimits
);
router.get(
  "/change-withdrwal-limit",
  isAdminAuthenticated,
  changeWithdrawalLimit
);
router.get("/get-withdrawal-limit", isAdminAuthenticated, getWithdrawalLimit);
router.get(
  "/get-withdrawal-block-users",
  isAdminAuthenticated,
  getAllWithdrawalBlockUsers
);
router.post(
  "/block-user-withdarawal",
  isAdminAuthenticated,
  blockUserWithdrawal
);
router.post("/withdrawal-block", isAdminAuthenticated, withdrawalBlockByUUID);
router.post(
  "/withdrawal-unblock",
  isAdminAuthenticated,
  withdrawalUnBlockByUUID
);
router.post(
  "/transaction-status-change",
  isAdminAuthenticated,
  changeWithdrawalStatus
);
router.get("/all-fee", isAdminAuthenticated, getWithdrawalFee);
router.post("/withdrawal-fee-edit", isAdminAuthenticated, editWithdrawalFee);
router.post("/ai-agent-fee-edit", isAdminAuthenticated, editAiAgentFee);
router.post("/transfer-fee-edit", isAdminAuthenticated, editTransferFee);
router.post("/recovery-fee-edit", isAdminAuthenticated, editAccountRecoveryFee);
router.post(
  "/set-withdrawal-hour",
  isAdminAuthenticated,
  setWithdrawalHourForWithdrawal
);

/* =========================================================================
   📊 DASHBOARD & ANALYTICS
   ========================================================================= */
router.get("/get-dashboard-data", isAdminAuthenticated, getDashboardStats);
router.post("/monthly-deposit-withdraw", isAdminAuthenticated, getMonthlyStats);
router.get(
  "/get-deposit-history",
  isAdminAuthenticated,
  investmentAndDepositHistory
);
router.get(
  "/get-liveTransaction-history",
  isAdminAuthenticated,
  getLiveTransactionHistory
);
router.get(
  "/get-transaction-history",
  isAdminAuthenticated,
  getUserTransactionHistory
);
router.get("/get-all-activity", isAdminAuthenticated, getAllActivity);
router.get("/get-system-health", isAdminAuthenticated, getSystemHealth);

/* =========================================================================
   🖼️ BANNERS & NOTIFICATIONS
   ========================================================================= */
router.post(
  "/upload-dashboard-banner",
  upload.single("file"),
  isAdminAuthenticated,
  uploadDashboardBanner
);
router.post(
  "/update-dashboard-banner",
  upload.single("file"),
  isAdminAuthenticated,
  editDashboardBanner
);
router.post(
  "/delete-dashboard-banner",
  isAdminAuthenticated,
  deleteDashboardBanner
);
router.post(
  "/active-dashboard-banner",
  isAdminAuthenticated,
  dashboardBannerActive
);
router.post(
  "/active-banner",
  isAdminAuthenticated,
  activeOrDeactiveBannerStatus
);
router.get("/get-dashboard", isAdminAuthenticated, getDashboardBanner);
router.get(
  "/get-notification-banner",
  isAdminAuthenticated,
  getAllNotificationbanner
);
router.post(
  "/notification-popup",
  upload.single("file"),
  isAdminAuthenticated,
  notificationPopupCreate
);
router.post(
  "/toggle-notification-status",
  isAdminAuthenticated,
  toggleNotification
);
router.post(
  "/update-notification",
  upload.single("file"),
  isAdminAuthenticated,
  updateNotificationPopup
);
router.post("/notification-toggle", isAdminAuthenticated, notificationToggle);
router.post("/delete-notification", isAdminAuthenticated, deleteNotification);

/* =========================================================================
   📚 PDFs & MEDIA
   ========================================================================= */
router.get("/get-pdfs", getPdfs);
router.post(
  "/upload-pdfs",
  isAdminAuthenticated,
  bannerUpload.fields([
    { name: "learnMore", maxCount: 1 },
    { name: "presentation", maxCount: 1 },
    { name: "whitepaper", maxCount: 1 },
    { name: "lightpaper", maxCount: 1 },
  ]),
  uploadPdfs
);

/* =========================================================================
   🧠 MISC / SYSTEM
   ========================================================================= */
router.post("/announement", isAdminAuthenticated, getAnnoucement);
router.get("/get-all-announcement", getAllAnoucement);
router.post("/update-agent-plan", isAdminAuthenticated, PlanvalueUpdateOfAgent);
router.post(
  "/update-aitradeCountDown",
  isAdminAuthenticated,
  updateAiTradeCounter
);
router.get("/get-trade-counter", isAdminAuthenticated, getAiTradeCounter);
router.post("/user-inactivity-day", isAdminAuthenticated, setInactiveBlockDays);
router.get("/get-inactivity-day", isAdminAuthenticated, getInactiveBlockDays);
router.post("/get-withdrawal-history", isAdminAuthenticated, allHistory);
router.post("/get-team-by-id", isAdminAuthenticated, getUserTeamById);
router.get("/connect-google", isAdminAuthenticated, connectGoogleAuthenticator);
router.get("/withdrawal/counters", isAdminAuthenticated, getWithdrawalCounters);
router.get("/get-other-user-history", isAdminAuthenticated, getAllUsersForChat);
router.route("/upload").post(chatUpload.single("file"), uploadImageOfChat);
router.route("/message/:id").get(isAdminAuthenticated, getMessages);
router.route("/delete-chat").post(isAdminAuthenticated, deleteUserChatByAdmin);
router.route("/approve-ticket").post(isAdminAuthenticated, approveTicket);
router.route("/reject-ticket").post(isAdminAuthenticated, rejecteTicket);
router.route("/delete-ticket").post(isAdminAuthenticated, deleteSupportById);
router
  .route("/add-level-income")
  .post(isAdminAuthenticated, addLevelIncomeInmainWalletAndPendingWallet);
router
  .route("/get-all-admin-ticket")
  .get(isAdminAuthenticated, getAllTicketHistory);
export default router;

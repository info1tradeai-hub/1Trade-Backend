import express from "express";
import {
  aiAgentInvestment,
  allHistory,
  cancleWithdrawal,
  changePassword,
  changePasswordOfUser,
  claimAITradeProfit,
  closeLevelAchievement,
  connectGoogleAuthenticator,
  depositHistory,
  disableGoogleAuthenticator,
  emailUpdate,
  generate2FAHandler,
  getAdminInfo,
  getAiAgentInvestmentsForActive,
  getAllAiPlans,
  getAllAiPlansById,
  getAllAnoucement,
  getAllFundTransferHistory,
  getAllLevelAchivment,
  getAllRebets,
  getAllSuppoertMessages,
  getAllTradeHistory,
  getAllTypeOfRewardForUser,
  getDashboardBanner,
  getDepositAddress,
  getDownLines,
  getFees,
  getMainWalletAndAdditionalWalletTopupHistory,
  getMemeberAndTeamData,
  getMemeberAndTeamDataforDashboard,
  getProfile,
  getTeamCount,
  getTodayandTotalIncome,
  getUserMessageOfSupportTicket,
  getUserProfile,
  getUsersCountByLevel,
  inActiveday,
  initialInvestment,
  isReadTrueOfNotification,
  LevelIncomeHistory,
  profilePhotoUpload,
  ReferralIncomeHistory,
  reset2FAHandler,
  sendInvitation,
  sendOTPForBep20Address,
  sendOTPForChangeAddress,
  sendOtpForGoogleAuthenticator,
  sendOtpForMoneyTransfer,
  sendOtpForPasswordReset,
  sendOtpToChangeEmail,
  sendOtpToEmailRegistartion,
  setBep20,
  setTrc20,
  setWalletAddress,
  supportMessage,
  swapAmount,
  transferAiAgentToMainWallet,
  transferAmountToAnotherUser,
  uploadImageOfChat,
  userLogin,
  userLogout,
  userRegisterWithEmail,
  verify2FAHandler,
  verifyGoogleAuthenticator,
  verifyOTP,
  verifyOtpForPassword,
  withdrawalHistory,
  zeroTradeCount,
} from "../controllers/user.controller.js";
import { triggerAITradeRoi } from "../utils/triggerAITradeRoi.js";
import { processWithdrawal } from "../controllers/withdrwal.controller.js";
import upload from "../utils/upload.js";
import { bonusTrade } from "../utils/bonusTrade.js";
import { IsAuthenticated } from "../middlewares/IsAuthenticated.js";
import { deleteAccount } from "../controllers/user.controller.js";
import {
  filterUserByMemberandLevel,
  getAiTradeCounter,
  getNotificationPopup,
  getPdfs,
} from "../controllers/admin.controller.js";
import chatUpload from "../utils/multer2.js";
import { getMessagesForUser } from "../controllers/message.controller.js";

const router = express.Router();

router.route("/register").post(userRegisterWithEmail);
router.route("/login").post(userLogin);
router.route("/get-downlines").get(IsAuthenticated, getDownLines);
router.route("/get-level-users").get(IsAuthenticated, getUsersCountByLevel);
// router.route("/invest").post(IsAuthenticated, initialInvestment);
router.route("/get-Profile").get(IsAuthenticated, getProfile);
router.route("/verify-otp").post(verifyOTP);
router.route("/place-trade").post(IsAuthenticated, triggerAITradeRoi);
router.route("/get-all-announcement").post(getAllAnoucement);
router
  .route("/sendOtp-forWalletAddress")
  .post(IsAuthenticated, sendOTPForChangeAddress);
router
  .route("/sendOtp-forGoogleAuthenticator")
  .post(IsAuthenticated, sendOtpForGoogleAuthenticator);
router
  .route("/change-walletAddress")
  .post(IsAuthenticated, sendOTPForChangeAddress);
router.route("/invest").post(IsAuthenticated, initialInvestment);
router.route("/swap-amount").post(IsAuthenticated, swapAmount);
router.route("/withdraw-history").get(IsAuthenticated, withdrawalHistory);
router.route("/deposit-history").get(IsAuthenticated, depositHistory);
router.route("/levelIncome-history").get(IsAuthenticated, LevelIncomeHistory);
router
  .route("/referalIncome-history")
  .get(IsAuthenticated, ReferralIncomeHistory);
router.route("/withdraw-request").post(IsAuthenticated, processWithdrawal);
router
  .route("/fund-transfer-history")
  .get(IsAuthenticated, getAllFundTransferHistory);
router.route("/send-otp-for-password-reset").post(sendOtpForPasswordReset);
router.route("/otp-verify-for-reset-password").post(verifyOtpForPassword);
router.route("/get-member-data").post(IsAuthenticated, getMemeberAndTeamData);
router
  .route("/get-member-data-dashboard")
  .post(IsAuthenticated, getMemeberAndTeamDataforDashboard);
router
  .route("/transfer-funds-otp")
  .post(IsAuthenticated, sendOtpForMoneyTransfer);
router
  .route("/transfer-funds")
  .post(IsAuthenticated, transferAmountToAnotherUser);
router.route("/generate-2fa").post(IsAuthenticated, generate2FAHandler);
router.route("/verify-2fa").post(IsAuthenticated, verify2FAHandler);
router.route("/send-invitation").post(IsAuthenticated, sendInvitation);
router.route("/reset-2fa").post(IsAuthenticated, reset2FAHandler);
router.post("/support-message", upload.array("files", 5), supportMessage);
router.post("/get-support-history", getUserMessageOfSupportTicket);
router.get("/get-message-history", getAllSuppoertMessages);
router.post("/updateAccount", IsAuthenticated, setWalletAddress);
router.post("/set-bep20-address", IsAuthenticated, setBep20);
router.get(
  "/send-otp-for-wallet-change",
  IsAuthenticated,
  sendOTPForBep20Address,
);
router.post("/set-trc20-address", IsAuthenticated, setTrc20);
router.get("/get-all-plans", IsAuthenticated, getAllAiPlans);
router.get("/plan/:id", IsAuthenticated, getAllAiPlansById);
// router.post('/ai-agent-investment', IsAuthenticated, aiAgentInvestment);
router.post("/ai-agent-investment", IsAuthenticated, aiAgentInvestment);
router.route("/investmentDetails").post(IsAuthenticated, aiAgentInvestment);
router.route("/get-otp-for-registration").post(sendOtpToEmailRegistartion);
router
  .route("/ai-agent-history")
  .get(IsAuthenticated, getAiAgentInvestmentsForActive);
router
  .route("/connect-google")
  .get(IsAuthenticated, connectGoogleAuthenticator);
router
  .route("/verify-authenticator")
  .post(IsAuthenticated, verifyGoogleAuthenticator);
router.get("/get-team", IsAuthenticated, getTeamCount);
router.post(
  "/redeem-aiagent-amount",
  IsAuthenticated,
  transferAiAgentToMainWallet,
);
router.post("/bonus-trade", IsAuthenticated, bonusTrade);
router.get("/logout", IsAuthenticated, userLogout);
router.post("/disable-google", IsAuthenticated, disableGoogleAuthenticator);
router.get("/getProfile", IsAuthenticated, getUserProfile);
router.post("/get-all-rebets", IsAuthenticated, getAllRebets);
router.post("/email-Update", IsAuthenticated, emailUpdate);
router.post("/change-password", changePassword);
router.post("/delete-account", IsAuthenticated, deleteAccount);
router.get("/all-history", IsAuthenticated, allHistory);
router.post("/cancel-transaction", IsAuthenticated, cancleWithdrawal);
router.get("/get-income", IsAuthenticated, getTodayandTotalIncome);
router.get("/get-level-income", IsAuthenticated, getAllLevelAchivment);
router.get("/get-trade-history", IsAuthenticated, getAllTradeHistory);
router.post(
  "/send-otp-for-email-change",
  IsAuthenticated,
  sendOtpToChangeEmail,
);
router.post("/change-password-of-user", IsAuthenticated, changePasswordOfUser);
router
  .route("/update-profile")
  .post(IsAuthenticated, upload.single("file"), profilePhotoUpload);
router.get("/claim", IsAuthenticated, claimAITradeProfit);
router.get("/reset", IsAuthenticated, zeroTradeCount);
router.get("/close-popup", IsAuthenticated, closeLevelAchievement);
router.get("/get-fees", getFees);
router.get(
  "/get-history-topup-by-admin",
  getMainWalletAndAdditionalWalletTopupHistory,
);
router.get("/get-notification", getNotificationPopup);
router.get("/get-aitradeCountDown", IsAuthenticated, getAiTradeCounter);
router.get("/get-dashboard-banner", getDashboardBanner);
router.get("/get-adminInfo", getAdminInfo);
router.get("/get-pdfs", getPdfs);
router.get("/is-read-notification", isReadTrueOfNotification);
router.get("/inactive-day", inActiveday);
router.get("/total-reward", IsAuthenticated, getAllTypeOfRewardForUser);
router.get("/get-deposit-address", IsAuthenticated, getDepositAddress);
router.route("/upload").post(chatUpload.single("file"), uploadImageOfChat);
router.route("/message").get(IsAuthenticated, getMessagesForUser);

export default router;

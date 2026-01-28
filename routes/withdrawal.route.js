import express from "express";
import { isAdminAuthenticated } from "../middlewares/adminMiddleware.js";
import {
  approveWithdrawalByAdmin,
  rejectWithdrawalByAdmin,
} from "../controllers/withdrwal.controller.js";

const router = express.Router();

router.post(
  "/reject-withdrawal",
  isAdminAuthenticated,
  rejectWithdrawalByAdmin
);
router.post(
  "/approve-withdrawal",
  isAdminAuthenticated,
  approveWithdrawalByAdmin
);
export default router;

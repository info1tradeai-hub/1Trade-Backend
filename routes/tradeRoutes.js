import express from "express";
import {
  getDeposits,
  getOrders,
  placeOrder,
  withdraw,
} from "../controllers/tradeController.js";
import { IsAuthenticated } from "../middlewares/IsAuthenticated.js";

const router = express.Router();

router.get("/deposits", IsAuthenticated, getDeposits);
router.get("/orders", IsAuthenticated, getOrders);
router.post("/order", IsAuthenticated, placeOrder);
router.post("/withdraw", IsAuthenticated, withdraw);

export default router;

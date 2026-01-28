export const bookAiTradeProfit = async (req, res) => {
    try {
        const userId = req.user._id;

        const pendingRoi = await Roi.findOne({
            userId,
            isClaimed: false,
            status: { $in: ['success', 'failed'] }
        }).sort({ createdAt: -1 });

        if (!pendingRoi) {
            return res.status(404).json({ success: false, message: "No pending ROI trade found." });
        }

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const { roiAmount, status, message } = pendingRoi;

        pendingRoi.isClaimed = true;
        await pendingRoi.save();

        if (status !== "failed" && roiAmount > 0) {
            user.totalRoi += roiAmount;
            user.dailyRoi = (user.dailyRoi || 0) + roiAmount;
            user.currentEarnings += roiAmount;
            user.mainWallet += roiAmount;
            user.totalSuccessfulTrades += 1;
            await distributeCommissions(user, roiAmount);
        } else {
            user.totalFailedTrades += 1;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: message || "✅ Profit booked successfully!",
            roiAmount,
            tradeStatus: status,
            currentWallet: user.mainWallet,
            roiId: pendingRoi._id,
        });

    } catch (error) {
        console.error("🚨 bookAiTradeProfit Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

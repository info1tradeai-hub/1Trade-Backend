import AutoReplyLog from "../models/autoReplyLog.model.js";
import { sendMessage } from "../controllers/message.controller.js";
import { io } from "../server.js";

// 🔥 future-proof: can come from DB / admin panel later
const AUTO_REPLY_MESSAGES = `🙂Thank you for contacting 1Trade.
Your message has been received and forwarded to our support team.
You will receive a response within 24 hours.`;

const HOURS_24 = 24 * 60 * 60 * 1000;

export const handleAutoReply = async ({ senderId, receiverId }) => {
  const now = Date.now();

  const log = await AutoReplyLog.findOne({ userId: senderId });

  if (log) {
    const diff = now - new Date(log.lastSentAt).getTime();
    if (diff < HOURS_24) {
      return;
    }
    log.lastSentAt = new Date();
    await log.save();
  } else {
    await AutoReplyLog.create({
      userId: senderId,
      lastSentAt: new Date(),
    });
  }

  // ✅ SEND MESSAGE (DB)
  const autoReplyMessage = await sendMessage({
    senderId: receiverId, // admin
    receiverId: senderId, // user
    message: AUTO_REPLY_MESSAGES,
    type: "text",
    isAutoReply: true,
    createdAt: new Date(),
  });

  // ✅ REALTIME EMIT (THIS FIXES YOUR ISSUE)
  io.to(senderId.toString()).emit("receiveMessage", autoReplyMessage);

  console.log("✅ Dynamic auto reply sent + realtime emitted");
};

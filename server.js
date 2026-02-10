import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import UserRouter from "./routes/user.routes.js";
import AdminRouter from "./routes/admin.routes.js";
import WithdrawalRouter from "./routes/withdrawal.route.js";
import connectToDB from "./DB/DB/DB.js";
import { sendMessage } from "./controllers/message.controller.js";
import UserModel from "./models/user.model.js";
import Admin from "./models/admin.model.js";
import { handleAutoReply } from "./utils/autoReply.js";
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(compression());
app.use(morgan("dev"));

const allowedOrigins = [
  "https://1trade.ai",
  "https://www.1trade.ai",
  "http://localhost:6083",
  "http://192.168.1.16:6083",
  "http://192.168.1.2:6083",
  "http://192.168.1.13:6083",
  "http://192.168.1.15:6083",
  "http://192.168.1.16:6083",
  "http://192.168.1.9:6083",
  "http://192.168.29.128:6083",
  "http://localhost:6083",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use("/api/users", UserRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/withdrawal", WithdrawalRouter);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

// =========== SOCKET EVENTS ===========
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join", (userId) => socket.join(userId));

  socket.on("typing", ({ senderId, receiverId }) =>
    io.to(receiverId).emit("typing", { senderId }),
  );

  socket.on("stopTyping", ({ senderId, receiverId }) =>
    io.to(receiverId).emit("stopTyping", { senderId }),
  );

  socket.on("offer", (payload) => io.to(payload.to).emit("offer", payload));

  socket.on("answer", (payload) => io.to(payload.to).emit("answer", payload));

  socket.on("candidate", (payload) =>
    io.to(payload.to).emit("candidate", payload),
  );
  socket.on("sendMessage", (data) => {
    setImmediate(async () => {
      try {
        const newMessage = await sendMessage(data);

        io.to(data.receiverId).emit("receiveMessage", newMessage);
        io.to(data.senderId).emit("receiveMessage", newMessage);

        const user = await UserModel.findById(data.senderId);
        const receiver = await Admin.findById(data.receiverId);

        if (!user || !receiver) return;

        if (
          user.role?.toLowerCase() === "user" &&
          receiver.role?.toLowerCase() === "admin"
        ) {
          await handleAutoReply({
            senderId: user._id,
            receiverId: receiver._id,
          });
        }
      } catch (err) {
        console.error("❌ save failed:", err.message);
      }
    });
  });

  socket.on("disconnect", () => console.log("🔴 Disconnected:", socket.id));
});

const startServer = async () => {
  await connectToDB();

  console.log("🔥 DB READY");
  setTimeout(() => import("./utils/cronJobs.js"), 15000);

  const PORT = process.env.PORT || 8000;
  server.listen(PORT, () => {
    console.log(`🚀 Running on port ${PORT}`);
  });
};

startServer();

export { io };

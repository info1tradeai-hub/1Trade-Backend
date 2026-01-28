// socket.js
import { Server } from "socket.io";
import Support from "./models/support.model.js";

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("joinTicket", async (ticketId) => {
      const ticket = await Support.findById(ticketId);
      if (!ticket || ticket.status === "Closed") {
        return socket.emit("error", "Ticket not found or closed");
      }
      socket.join(ticketId);
    });

    socket.on("sendMessage", async ({ ticketId, sender, message }) => {
      const ticket = await Support.findById(ticketId);
      if (!ticket || ticket.status === "Closed") {
        return socket.emit("error", "Cannot send message to closed ticket");
      }

      io.to(ticketId).emit("receiveMessage", {
        sender,
        message,
        createdAt: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });
};

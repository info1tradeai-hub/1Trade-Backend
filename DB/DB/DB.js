import mongoose from "mongoose";

mongoose.set("strictQuery", true);

let isConnected = false;

const connectToDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // ===============================
      // M10 → M30 AUTO-SCALE FRIENDLY
      // ===============================
      maxPoolSize: 80, // M10 ke liye safe, M30 tak smooth
      minPoolSize: 5,

      // ===============================
      // FINANCIAL / WALLET SAFETY
      // ===============================
      readPreference: "primary", // balance, orders, ROI
      w: "majority",
      retryWrites: true,

      // ===============================
      // FAILOVER + NETWORK STABILITY
      // ===============================
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      heartbeatFrequencyMS: 10000,
    });

    isConnected = true;
    console.log("🟢 MongoDB Connected (M10 → M30 Auto-Scale Ready)");
  } catch (err) {
    console.error("🔴 MongoDB Connection Error:", err.message);
    setTimeout(connectToDB, 5000); // retry safely
  }
};

// ===============================
// ATLAS FAILOVER HANDLING
// ===============================
mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.log("⚠️ MongoDB Disconnected → Waiting for Atlas...");
});

mongoose.connection.on("reconnected", () => {
  console.log("♻️ MongoDB Reconnected (New Primary Elected)");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB Runtime Error:", err.message);
});

export default connectToDB;

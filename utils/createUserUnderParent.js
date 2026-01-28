import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import UserModel from "../models/user.model.js";

dotenv.config();

const parentUserId = "688220ae5b0c0e634b538b08";

const levelsConfig = [
  {
    level: 1,
    invest: 30,
    aiCredits: 0,
    activeA: 0,
    activeBC: 0,
    timelineDays: 0,
    tradeCount: 1,
  },
  {
    level: 2,
    invest: 400,
    aiCredits: 100,
    activeA: 2,
    activeBC: 5,
    timelineDays: 30,
    tradeCount: 1,
  },
  {
    level: 3,
    invest: 1500,
    aiCredits: 200,
    activeA: 5,
    activeBC: 18,
    timelineDays: 90,
    tradeCount: 2,
  },
  {
    level: 4,
    invest: 4000,
    aiCredits: 400,
    activeA: 12,
    activeBC: 30,
    timelineDays: 150,
    tradeCount: 2,
  },
  {
    level: 5,
    invest: 8000,
    aiCredits: 600,
    activeA: 22,
    activeBC: 60,
    timelineDays: 225,
    tradeCount: 3,
  },
  {
    level: 6,
    invest: 30000,
    aiCredits: 800,
    activeA: 30,
    activeBC: 150,
    timelineDays: 285,
    tradeCount: 3,
  },
];

const createUser = async (parentId, config) => {
  const timestamp = Date.now();

  const newUser = await UserModel.create({
    uuid: uuidv4(),
    referralCode: `REF-${config.level}-${timestamp}`,
    username: `user_${config.level}_${timestamp}`,
    email: `user${config.level}_${timestamp}@test.com`,
    password: "hashedpassword",
    parentId: parentId,
    sponsorId: parentId,
    level: config.level,
    totalInvestment: config.invest,
    aiCredits: config.aiCredits,
    activeA: config.activeA,
    activeBC: config.activeBC,
    timelineDays: config.timelineDays,
    todayTradeCount: config.tradeCount,
    status: true,
    isVerified: true,
  });

  // Push new user into parent’s referedUsers array
  await UserModel.findByIdAndUpdate(parentId, {
    $push: { referedUsers: newUser._id },
  });

  return newUser;
};

const seedLimitedTeam = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("DB Connected");

    let teamAUsers = [];
    for (let i = 0; i < 30; i++) {
      const config = levelsConfig[0];
      const newUser = await createUser(parentUserId, config);
      teamAUsers.push(newUser);
    }

    let teamBUsers = [];
    for (const userA of teamAUsers) {
      for (let i = 0; i < 5; i++) {
        const config = levelsConfig[1];
        const newUser = await createUser(userA._id, config);
        teamBUsers.push(newUser);
      }
    }
    console.log(
      `Created ${teamAUsers.length} Team A users and ${
        teamBUsers.length
      } Team B users (Total: ${30 + 150})`
    );
    process.exit();
  } catch (error) {
    console.error("Error creating limited team structure:", error);
    process.exit(1);
  }
};

seedLimitedTeam();

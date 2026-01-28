import UserModel from "../models/user.model.js";

export const generateReferralCode = () => {
  const namePart = "1T";
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomPart += characters[randomIndex];
  }

  return `${namePart}${randomPart}`;
};

export const randomUsername = () => {
  const characters = "0123456789";
  let result = "";
  const length = 8;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return `1T${result}`;
};
export const generateSequentialUsername = async () => {
  const lastUser = await UserModel.findOne({
    username: { $regex: /^\d+$/ },
  }).sort({ createdAt: -1 });

  let nextNumber = 1001001;

  if (lastUser && lastUser.username) {
    const match = lastUser.username.match(/^FUTURE(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `FUTURE${nextNumber}`;
};
export const generateRandomTxResponse = () => {
  const randomPrefix = ["TX", "TXN", "TRX", "T-RX"];
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const randomString =
    randomPrefix[Math.floor(Math.random() * randomPrefix.length)];

  const txResponse = `${randomString}-${randomSuffix}-${Date.now()}`;

  if (!txResponse) {
    console.error("Generated txResponse is invalid:", txResponse);
    return "defaultTxResponse";
  }
  return txResponse;
};
export const generate9DigitUUID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let uuid = '';
  for (let i = 0; i < 9; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    uuid += chars[randomIndex];
  }
  return uuid;
};


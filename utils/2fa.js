import speakeasy from "speakeasy";
import qrcode from "qrcode";
import UserModel from "../models/user.model.js";

export const generate2FA = async (email, force = false) => {
  const user = await UserModel.findOne({ email });

  if (!user) {
    return {
      message: "User not found",
      qrCode: null,
      secret: null,
    };
  }

  if (!force && user.twoFASecret) {
    return {
      message: "2FA is already enabled for this wallet.",
      qrCode: null,
      secret: null,
    };
  }

  const secret = speakeasy.generateSecret({
    name: `1Trade (${email})`,
  });

  const qrCode = await qrcode.toDataURL(secret.otpauth_url);

  user.twoFASecret = secret.base32;
  await user.save();

  return {
    secret: secret.base32,
    qrCode,
  };
};

export const verify2FA = async (email, otp) => {
  const user = await UserModel.findOne({ email });

  if (!user || !user.twoFASecret) {
    console.log("❌ No user or no 2FA secret found");
    return false;
  }

  const currentToken = speakeasy.totp({
    secret: user.twoFASecret,
    encoding: "base32",
  });
  console.log("Expected TOTP (now):", currentToken, "| Provided:", otp);

  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token: otp,
    window: 2,
  });

  console.log(
    verified ? "✅ 2FA verified successfully." : "❌ 2FA verification failed."
  );
  return verified;
};

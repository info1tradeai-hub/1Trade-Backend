import nodemailer from "nodemailer";
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (email, otp, username) => {
  console.log(process.env.EMAIL, process.env.EMAIL_PASSWORD);
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `1Trade <${process.env.EMAIL}>`,
      to: email,
      subject: "Your One-Time Password (OTP)",
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "high",
      },
      html: `
        <div style="max-width: 400px; margin: auto; padding: 20px; text-align: center; font-family: Arial, sans-serif;
                    border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); background: #fff;">
          
          <h2 style="color: #007bff;">🔐 Secure OTP</h2>
          <p style="font-size: 16px;">Dear ${username || "User"},</p>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background: #f3f3f3; padding: 12px 24px; font-size: 22px; font-weight: bold;
                      display: inline-block; border-radius: 8px; letter-spacing: 2px; margin: 10px 0;
                      user-select: all;">
              ${otp}
          </div>

          <p style="font-size: 12px; color: #888;">Tap & Hold to Copy</p>
          <p style="font-size: 12px; color: gray;">Your OTP will expire in 10 minutes.</p>
          <p>For queries, contact <a href="mailto:support@1Trade.ai">support@1Trade.ai</a></p>
          <p style="font-weight: bold; color: #007bff;">- 1Trade Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("❌ Error sending OTP:", error.message);
    return false;
  }
};

export const sendEmailForWithdrawalAmount = async (message) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `1Trade <${process.env.EMAIL}>`,
      to: "support@1Trade.ai",
      subject: "Withdrawal Request",
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "high",
      },
      html: message,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("❌ Error sending OTP:", error.message);
    return false;
  }
};

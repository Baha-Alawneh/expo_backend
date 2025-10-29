import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Temporary in-memory storage (for production, use Redis or database)
let codes = {};

// Clean up expired codes every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const email in codes) {
    if (now > codes[email].expires) {
      delete codes[email];
    }
  }
}, 10 * 60 * 1000);

export const sendVerificationCode = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });

  const code = Math.floor(100000 + Math.random() * 900000);

  codes[email] = { code, expires: Date.now() + 5 * 60 * 1000 };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Verification Code",
    text: `Your verification code is ${code}. This code will expire in 5 minutes.`,
  };

  try {
    console.log(`Sending code ${code} to ${email}`);
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Error sending email:", error.response || error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send verification code" });
  }
};

export const verifyCode = (req, res) => {
  const { email, code } = req.body;

  const stored = codes[email];
  if (!stored)
    return res.json({
      success: false,
      message: "No code found for this email",
    });

  if (Date.now() > stored.expires) {
    delete codes[email];
    return res.json({ success: false, message: "Code expired" });
  }

  if (parseInt(code) === stored.code) {
    delete codes[email];
    return res.json({ success: true, message: "Code verified successfully" });
  }

  res.json({ success: false, message: "Invalid verification code" });
};

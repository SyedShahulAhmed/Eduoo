import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: ENV.EMAIL.USER,
    pass: ENV.EMAIL.PASS,
  },
});

export const sendOTPEmail = async (to, otp) => {
  try {
    if (!ENV.EMAIL.USER || !ENV.EMAIL.PASS) {
      console.error("❌ Missing email credentials in env config");
      throw new Error("Email credentials missing");
    }

    const mailOptions = {
      from: ENV.EMAIL.FROM,
      to,
      subject: "Your AICOO Verification Code",
      html: `
        <div style="font-family: Arial; line-height: 1.6;">
          <h2>🔐 AICOO Verification</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="color: #2E86DE;">${otp}</h1>
          <p>This code expires in ${ENV.OTP_EXPIRY_MINUTES} minutes.</p>
          <hr/>
          <p>If you didn’t request this, ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📩 OTP email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw new Error("Failed to send OTP email.");
  }
};

export const sendWeeklySummaryEmail = async (to, data) => {
  const html = `
    <h2>Hey ${data.fullName} 👋</h2>
    <p>Here’s your <b>AICOO Weekly Report</b>:</p>
    <ul>
      <li><b>Completed Goals:</b> ${data.completedGoals}</li>
      <li><b>Active Goals:</b> ${data.activeGoals}</li>
      <li><b>Current Streak:</b> ${data.streak} days</li>
    </ul>
    <h3>🤖 AI Suggestions for Next Week</h3>
    <ul>${data.suggestions.map(g => `<li>${g}</li>`).join("")}</ul>
    <p><i>${data.motivation}</i></p>
    <p>Keep building brilliance,<br/>— The AICOO Team 🤖</p>
  `;

  await transporter.sendMail({
    from: `"AICOO" <${ENV.EMAIL_FROM}>`,
    to,
    subject: "🌟 Your Weekly AICOO Progress Report",
    html,
  });

  console.log(`✅ Weekly summary sent to ${to}`);
};
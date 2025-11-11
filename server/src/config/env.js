import dotenv from "dotenv";
dotenv.config(); // ✅ Loads .env once globally

// Validate required envs (optional but good practice)
const required = ["MONGO_URI", "JWT_SECRET", "EMAIL_USER", "EMAIL_PASS"];
required.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️  Missing environment variable: ${key}`);
  }
});

export const ENV = {
  // App
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4000,

  // Database
  MONGO_URI: process.env.MONGO_URI,
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,

  // Cloudinary
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
  SERVER_URL: process.env.SERVER_URL,
  // Email (Nodemailer)
  EMAIL: {
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS,
    FROM: process.env.EMAIL_FROM || `"AICOO" <${process.env.EMAIL_USER}>`,
  },
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
  SPOTIFY_SCOPE: process.env.SPOTIFY_SCOPE,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN : process.env.DISCORD_BOT_TOKEN,
  DISCORD_PUBLIC_KEY : process.env.DISCORD_PUBLIC_KEY,
  // OTP
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || "5"),
  OTP_RESEND_LIMIT: parseInt(process.env.OTP_RESEND_LIMIT || "3"),

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Redis (optional)
  REDIS_URL: process.env.REDIS_URL || null,
  //GEMINI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // Google OAuth
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  },
};

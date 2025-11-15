import express from "express";
import helmet from "helmet";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import goalsRoutes from "./routes/goals.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import connectionsRoutes from "./routes/connection.routes.js";
import discordInteractions from "./routes/discord.interactions.js";
import notionTestRoutes from "./routes/test/notion.test.routes.js"
import { authMiddleware } from "./middlewares/auth.middleware.js";
// 🧩 Load Hooks + Cron BEFORE routes
import "./events/goals.hooks.js"; 
import "./cron/notionSync.cron.js";

const app = express();

// CORS + security
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(helmet());

// Discord interactions BEFORE json parser
app.use(
  "/api/discord/interactions",
  express.raw({ type: "application/json" }),
  discordInteractions
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.send("✅ AICOO Server is Running");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/connections", connectionsRoutes);
//Testing routes for notion
app.use("/api/notion",authMiddleware, notionTestRoutes);
export default app;

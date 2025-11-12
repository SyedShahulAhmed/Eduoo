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

const app = express();

// ===============================
// 🧱 Global middleware
// ===============================
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(helmet());

// ===============================
// ⚙️ Discord interaction route (RAW BODY)
// Must be mounted *before* express.json()
// ===============================
app.use(
  "/api/discord/interactions",
  express.raw({ type: "application/json" }),
  discordInteractions
);

// ===============================
// ⚙️ Normal JSON parser for all other routes
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// 🚀 Health route
// ===============================
app.get("/", (req, res) => {
  res.send("✅ AICOO Server is Running");
});

// ===============================
// 🔗 API routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/connections", connectionsRoutes);

// ❌ DO NOT re-mount Discord routes here!
// app.use("/api/discord", express.json(), discordInteractions); ← REMOVE THIS

export default app;

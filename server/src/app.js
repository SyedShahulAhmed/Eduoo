import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import goalsRoutes from "./routes/goals.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import connectionsRoutes from "./routes/connection.routes.js";
import discordInteractions from "./routes/discord.interactions.js";

import cors from "cors";
const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(helmet());

// ✅ Keep body raw for Discord signature verification
app.use(
  "/api/discord/interactions",
  express.raw({ type: "application/json" }),
  discordInteractions
);
// ✅ Apply JSON middleware to everything EXCEPT Discord interactions
app.use((req, res, next) => {
  if (req.originalUrl === "/api/discord/interactions") {
    next(); // skip express.json() for Discord verification
  } else {
    express.json()(req, res, next);
  }
});
app.get("/", (req, res) => {
  res.send("AICOO SERVER WORKING");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/discord", express.json(), discordInteractions);

export default app;

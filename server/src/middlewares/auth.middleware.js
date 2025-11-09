import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export const authMiddleware = (req, res, next) => {
  try {
    // ✅ Check Authorization header first
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // ✅ If not in header, check ?token= query param (useful for browser redirects)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    // ❌ No token found at all
    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.error("❌ authMiddleware Error:", error.message);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

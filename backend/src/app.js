import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import { sessionMiddleware } from "./middleware/session.js";
import adminRoutes from "./routes/admin.js";
import skillsRoutes from "./routes/skills.js";
import eventsRoutes from "./routes/events.js";
import analyticsRoutes from "./routes/analytics.js";
import mediaRoutes from "./routes/media.js";
import contactRoutes from "./routes/contact.js";
import profileRoutes from "./routes/profile.js";

const app = express();

app.use(helmet());
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(sessionMiddleware());

// Basic rate limit for auth endpoints (MVP)
app.use(
  "/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(healthRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(skillsRoutes);
app.use("/events", eventsRoutes);
app.use(analyticsRoutes);
app.use(mediaRoutes);
app.use(contactRoutes);
app.use(profileRoutes);

app.get("/api/hello", (req, res) =>
  res.json({
    message: "Hello from 1community backend up 👋",
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
  }),
);

export default app;

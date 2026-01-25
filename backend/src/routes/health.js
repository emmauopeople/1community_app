// src/routes/health.js
const express = require("express");
const db = require("../../db"); 

const router = express.Router();

// Liveness (no DB dependency)
router.get("/healthz", (req, res) => res.status(200).json({ ok: true }));

// Readiness (DB check)
router.get("/health/db", async (req, res) => {
  try {
    await db.query("SELECT 1");
    return res.status(200).json({ ok: true, db: "up" });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      db: "down",
      error: err?.message || "DB check failed",
    });
  }
});

module.exports = router;

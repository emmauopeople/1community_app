// src/app.js
const express = require("express");

const healthRoutes = require("./routes/health");

const app = express();
app.use(express.json());

// Routes
app.use(healthRoutes);

app.get("/api/hello", (req, res) =>
  res.json({
    message: "Hello from 1community backend up 👋",
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
  })
);

module.exports = app;

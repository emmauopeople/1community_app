// server.js
require("dotenv").config();
const app = require("./src/app");
const db = require("./db");
const PORT = process.env.PORT || 3000;

app.get("/healthz", (req, res) => res.status(200).json({ ok: true }));
app.get("/api/hello", (req, res) =>
  res.json({
    message: "Hello from 1community backend up 👋",
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
  })
);

app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));

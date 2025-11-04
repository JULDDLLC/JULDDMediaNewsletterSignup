/**
 * JULDD Media Newsletter Signup Server
 * Clean restore version (Resend API only, no confetti)
 */

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { processFormSubmission } = require("./utils/workflows");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server running fine" });
});

// Form submission route
app.post("/api/signup", async (req, res) => {
  console.log("📩 /api/signup request received");

  try {
    const result = await processFormSubmission(req.body);
    console.log("✅ Form submission successful:", result);
    res.status(200).json({ success: true, message: "Signup successful!" });
  } catch (error) {
    console.error("❌ Form submit error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JULDD Media Newsletter server running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const {
  processFormSubmission,
  generateDailyReport,
  sendTestReport
} = require('./workflows');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from repo root (so favicon + images work)
app.use(express.static(__dirname));

// Root => index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Favicon fallbacks
app.get(['/favicon.ico', '/favicon.png'], (req, res) => {
  const file = req.path.endsWith('.png') ? 'juldd_media_logo.png' : 'juldd_media_logo.ico';
  res.sendFile(path.join(__dirname, file));
});

// Accept form POSTs (support a few common paths)
app.post(['/submit', '/signup', '/api/submit', '/api/signup'], async (req, res) => {
  try {
    const { parentName, parentEmail, childrenNames } = req.body;
    const result = await processFormSubmission({ parentName, parentEmail, childrenNames });
    res.json({ ok: true, result });
  } catch (err) {
    console.error('Form submit error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Optional healthcheck
app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;

// On Vercel, export the app; locally, start a server
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

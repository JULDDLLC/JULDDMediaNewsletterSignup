const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { processFormSubmission } = require('./workflow');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the root directory (for index.html, CSS, images)
app.use(express.static(__dirname));

// Root route to serve the main signup page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Favicon fallback routes
app.get(['/favicon.ico', '/favicon.png'], (req, res) => {
  const file = req.path.endsWith('.png') ? 'juldd_media_logo.png' : 'juldd_media_logo.ico';
  res.sendFile(path.join(__dirname, file), (err) => {
    if (err) {
      res.status(404).send("Not found");
    }
  });
});

// Main newsletter signup handler
app.post('/api/signup', async (req, res) => {
  console.log('Received signup request:', req.body);
  try {
    const result = await processFormSubmission(req.body);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'An internal server error occurred.' });
  }
});

// Health check endpoint (optional but good practice)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Start the server if not running on a serverless environment like Vercel
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`🚀 Server running locally at http://localhost:${port}`);
  });
}

// Export the app for serverless deployment
module.exports = app;

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const workflows = require('./workflows');

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

// Endpoint to get signups since a specific time (for daily reports)
app.get('/api/signups/since/:timestamp', (req, res) => {
    const timestamp = parseInt(req.params.timestamp);
    const recentSignups = signups.filter(signup => {
        const signupTime = new Date(signup.date).getTime();
        return signupTime >= timestamp;
    });

    res.json({
        total: recentSignups.length,
        signups: recentSignups
    });
});

// Endpoint to send test report
app.post('/api/test-report', async (req, res) => {
    try {
        console.log('📧 Sending test report...');
        const result = await workflows.sendTestReport();
        res.json({
            success: true,
            message: 'Test report sent to julie@juldd.com',
            result
        });
    } catch (error) {
        console.error('Error sending test report:', error);
        res.status(500).json({ error: 'Failed to send test report' });
    }
});

// Endpoint to trigger morning report
app.post('/api/reports/morning', async (req, res) => {
    try {
        const result = await workflows.generateMorningReport();
        res.json({
            success: true,
            message: 'Morning report generated',
            result
        });
    } catch (error) {
        console.error('Error generating morning report:', error);
        res.status(500).json({ error: 'Failed to generate morning report' });
    }
});

// Endpoint to trigger evening report
app.post('/api/reports/evening', async (req, res) => {
    try {
        const result = await workflows.generateEveningReport();
        res.json({
            success: true,
            message: 'Evening report generated',
            result
        });
    } catch (error) {
        console.error('Error generating evening report:', error);
        res.status(500).json({ error: 'Failed to generate evening report' });
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

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const workflows = require('./workflows');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Serve index.html when someone visits the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Store signups in memory (will be synced to Google Sheets)
let signups = [];

// API endpoint to handle form submissions
app.post('/api/signup', async (req, res) => {
    try {
        const { parentName, parentEmail, childrenNames, signupDate, status } = req.body;

        // Validate required fields
        if (!parentName || !parentEmail || !childrenNames) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create signup record
        const signup = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            parentName,
            parentEmail,
            childrenNames,
            status: 'active',
            signupSource: 'web_form'
        };

        // Add to signups array
        signups.push(signup);

        // Log to file for debugging
        const logEntry = `${new Date().toISOString()} - New signup: ${parentName} (${parentEmail})\n`;
        fs.appendFileSync(path.join(__dirname, 'signups.log'), logEntry);

        // Process through workflows
        try {
            await workflows.processFormSubmission({
                parentName,
                parentEmail,
                childrenNames
            });
        } catch (workflowError) {
            console.error('Workflow error:', workflowError);
            // Don't fail the signup if workflow has issues
        }

        // Return success response
        res.json({
            success: true,
            message: 'Signup successful',
            signup
        });

    } catch (error) {
        console.error('Error processing signup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to get all signups (for testing)
app.get('/api/signups', (req, res) => {
    res.json({
        total: signups.length,
        signups
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Newsletter signup server running on port ${PORT}`);
    console.log(`Form available at http://localhost:${PORT}`);
    console.log(`\n📊 API Endpoints:`);
    console.log(`  POST /api/signup - Submit form`);
    console.log(`  GET /api/signups - Get all signups`);
    console.log(`  POST /api/test-report - Send test report`);
    console.log(`  POST /api/reports/morning - Generate morning report`);
    console.log(`  POST /api/reports/evening - Generate evening report`);
});

module.exports = app;

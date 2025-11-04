const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const port = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the repo root (so index.html, favicon and images are reachable)
app.use(express.static(__dirname));

// Root route – send the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Favicon fallbacks
app.get(['/favicon.ico', '/favicon.png'], (req, res) => {
  const file = req.path.endsWith('.png') ? 'juldd_media_logo.png' : 'juldd_media_logo.ico';
  res.sendFile(path.join(__dirname, file));
});

// Newsletter signup handler – adjust fields as needed
app.post(['/submit','/signup','/api/submit','/api/signup'], async (req, res) => {
  const { name, email } = req.body;
  try {
    await resend.emails.send({
      from: 'JULDD Media <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to JULDD Media!',
      html: `<h2>Welcome to JULDD Media!</h2><p>Hi ${name},</p><p>Thanks for signing up.</p>`
    });
    res.status(200).json({ message: 'Signup successful. Email sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending email.' });
  }
});

// Health check (optional)
app.get('/health', (req, res) => res.json({ ok: true }));

// Export for Vercel; start a local server when not on Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}

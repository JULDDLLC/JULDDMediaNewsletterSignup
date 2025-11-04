const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const port = process.env.PORT || 3000;

const resend = new Resend('YOUR_RESEND_API_KEY'); // Replace with your actual API key

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/signup', async (req, res) => {
  const { name, email } = req.body;

  try {
    const data = await resend.emails.send({
      from: 'JULDD Media <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to JULDD Media! 🎉',
      html: `
        <h2>Welcome to JULDD Media! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Thank you for signing up for the JULDD Media Kids' AI Newsletter! We're excited to have you and your family join our community.</p>
        <h3>Your Free Trial</h3>
        <p>✅ <strong>1 Month Free Access</strong> – No credit card required!</p>
        <p>You'll receive our latest content featuring audio and animation designed specifically for kids.</p>
        <h3>What to Expect</h3>
        <ul>
          <li>📚 Educational content with AI-powered learning</li>
          <li>🎨 Engaging animations and audio stories</li>
          <li>👨‍👩‍👧‍👦 Age-appropriate material for your children</li>
          <li>📧 Regular newsletter updates (frequency TBD)</li>
        </ul>
        <h3>Next Steps</h3>
        <p>Your free trial will begin immediately. Look for our first newsletter in your inbox soon!</p>
        <p>If you have any questions, reach us at <a href="mailto:support@julddmedia.com">support@julddmedia.com</a></p>
        <p>Best regards,<br/>The JULDD Media Team</p>
      `,
    });

    console.log('Email sent:', data);
    res.status(200).json({ message: 'Signup successful. Email sent.' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Error sending email.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

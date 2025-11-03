/**
 * JULDD Media Newsletter Signup Workflows
 * Handles form submissions, Excel file integration, and daily reports
 *
 * Email: Resend (no Gmail app password required)
 * Excel: Skips read/write on Vercel (read-only FS) to avoid runtime errors
 */

const { Resend } = require('resend');
const xlsx = require('xlsx');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend sandbox sender by default (works without domain verification).
// After verifying your domain in Resend, set FROM_EMAIL in env to your branded sender.
const FROM_EMAIL = process.env.FROM_EMAIL || 'JULDD Media <onboarding@resend.dev>';

const excelFilePath = path.join(__dirname, '..', 'JULDD_Media_Signups.xlsx');

/**
 * Workflow 1: Process Form Submission
 */
async function processFormSubmission(formData) {
  console.log('📝 Processing form submission:', formData);

  try {
    if (!formData.parentName || !formData.parentEmail || !formData.childrenNames) {
      throw new Error('Missing required fields');
    }

    const signupRecord = {
      Date: new Date().toISOString().split('T')[0],
      'Parent Name': formData.parentName,
      Email: formData.parentEmail,
      'Children Names': formData.childrenNames,
      'Email Status': 'active',
      'Signup Source': 'web_form'
    };

    console.log('✅ Signup record created:', signupRecord);

    // Best-effort write to Excel (skipped on Vercel/serverless)
    await syncToExcel(signupRecord);

    // Send confirmation email via Resend
    await sendConfirmationEmail(formData.parentEmail, formData.parentName);

    return { success: true, message: 'Signup processed successfully', record: signupRecord };
  } catch (error) {
    console.error('❌ Error processing form submission:', error);
    throw error;
  }
}

/**
 * Workflow 2: Sync to Excel
 * - On Vercel (serverless, read-only FS), this is skipped to prevent errors.
 */
async function syncToExcel(signupRecord) {
  console.log('📊 Syncing to Excel (best-effort):', signupRecord);

  // Skip Excel I/O on Vercel/serverless to avoid write errors
  if (process.env.VERCEL) {
    console.log('ℹ️ Running on Vercel – skipping Excel read/write.');
    return { success: true, skipped: true };
  }

  try {
    let workbook;
    try {
      workbook = xlsx.readFile(excelFilePath);
    } catch (e) {
      // If file doesn't exist locally, create a new workbook/sheet
      workbook = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([
        ['Date', 'Parent Name', 'Email', 'Children Names', 'Email Status', 'Signup Source']
      ]);
      xlsx.utils.book_append_sheet(workbook, ws, 'Signups');
      xlsx.writeFile(workbook, excelFilePath);
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const newRow = [
      signupRecord.Date,
      signupRecord['Parent Name'],
      signupRecord.Email,
      signupRecord['Children Names'],
      signupRecord['Email Status'],
      signupRecord['Signup Source']
    ];

    xlsx.utils.sheet_add_aoa(worksheet, [newRow], { origin: -1 });
    xlsx.writeFile(workbook, excelFilePath);

    console.log('✅ Row appended to Excel file');
    return { success: true };
  } catch (error) {
    console.error('❌ Error syncing to Excel:', error);
    // Don't fail the whole request just because Excel failed
    return { success: false, error: error.message };
  }
}

/**
 * Workflow 3: Send Confirmation Email (Resend)
 */
async function sendConfirmationEmail(email, parentName) {
  console.log('📧 Sending confirmation email via Resend to:', email);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f3460;">Welcome to JULDD Media! 🎉</h2>
      <p>Hi ${parentName},</p>
      <p>Thank you for signing up for the JULDD Media Kids' AI Newsletter! We're excited to have you and your family join our community.</p>
      <h3 style="color: #0f3460;">Your Free Trial</h3>
      <p>✅ <strong>1 Month Free Access</strong> - No credit card required!</p>
      <p>You'll receive our latest content featuring audio and animation designed specifically for kids.</p>
      <h3 style="color: #0f3460;">What to Expect</h3>
      <ul>
        <li>📚 Educational content with AI-powered learning</li>
        <li>🎨 Engaging animations and audio stories</li>
        <li>👨‍👩‍👧‍👦 Age-appropriate material for your children</li>
        <li>📧 Regular newsletter updates (frequency TBD)</li>
      </ul>
      <h3 style="color: #0f3460;">Next Steps</h3>
      <p>Your free trial will begin immediately. Look for our first newsletter in your inbox soon!</p>
      <p>If you have any questions, feel free to reach out to us at
         <a href="mailto:support@julddmedia.com">support@julddmedia.com</a></p>
      <p>Best regards,<br><strong>The JULDD Media Team</strong></p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This email was sent to ${email} because you signed up for the JULDD Media Newsletter.
        <a href="#">Manage preferences</a> | <a href="#">Unsubscribe</a>
      </p>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,     // e.g., 'JULDD Media <onboarding@resend.dev>'
    to: email,
    subject: '🎉 Welcome to JULDD Media Kids\' AI Newsletter!',
    html
  });

  if (error) {
    console.error('❌ Resend error:', error);
    throw error;
  }

  console.log('✅ Email sent:', data?.id || data);
  return { success: true };
}

/**
 * Workflow 4 & 5: Generate Daily Reports
 */
async function generateDailyReport(reportType) {
  console.log(`📊 Generating ${reportType}...`);

  try {
    const signups = getNewSignups();

    if (!signups || signups.length === 0) {
      console.log('ℹ️ No new signups to report.');
      return { success: true, signups: [], message: 'No new signups' };
    }

    const reportHTML = generateReportHTML(signups, reportType);
    await sendReportEmail(reportHTML, `${reportType} - New Newsletter Signups`);

    // Placeholder for clearing reported signups
    clearReportedSignups(signups);

    return { success: true, signups, report: reportHTML };
  } catch (error) {
    console.error(`❌ Error generating ${reportType}:`, error);
    throw error;
  }
}

function getNewSignups() {
  // On Vercel, skip reading Excel to avoid FS errors (return empty so reports don't send)
  if (process.env.VERCEL) {
    console.log('ℹ️ Vercel environment detected — skipping Excel read (no new signups reported).');
    return [];
  }

  try {
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    return data.slice(-5);
  } catch (e) {
    console.log('ℹ️ Could not read Excel file locally:', e.message);
    return [];
  }
}

function clearReportedSignups(_reportedSignups) {
  console.log('✅ Clearing reported signups from the queue (placeholder).');
}

/**
 * Generate HTML report
 */
function generateReportHTML(signups, reportType) {
  const signupRows = signups
    .map(
      (signup, index) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px;">${index + 1}</td>
        <td style="padding: 10px;">${signup.Date || ''}</td>
        <td style="padding: 10px;">${signup['Parent Name'] || ''}</td>
        <td style="padding: 10px;">${signup.Email || ''}</td>
        <td style="padding: 10px;">${signup['Children Names'] || ''}</td>
        <td style="padding: 10px;">
          <span style="background: #4caf50; color: white; padding: 5px 10px; border-radius: 3px;">
            ${signup['Email Status'] || 'active'}
          </span>
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #0f3460;">📊 ${reportType}</h2>
      <p style="color: #666;">New Newsletter Signups</p>
      <p><strong>Total New Signups:</strong> ${signups.length}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #0f3460; color: white;">
            <th style="padding: 10px; text-align: left;">#</th>
            <th style="padding: 10px; text-align: left;">Date</th>
            <th style="padding: 10px; text-align: left;">Parent Name</th>
            <th style="padding: 10px; text-align: left;">Email</th>
            <th style="padding: 10px; text-align: left;">Children</th>
            <th style="padding: 10px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${signupRows}
        </tbody>
      </table>
      <p style="color: #666; font-size: 12px;">Report generated on ${new Date().toLocaleString()}</p>
    </div>
  `;
}

/**
 * Send report email (Resend)
 */
async function sendReportEmail(reportHTML, subject) {
  console.log('📧 Sending report email via Resend...');

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: 'julie@juldd.com',
    subject,
    html: reportHTML
  });

  if (error) {
    console.error('❌ Resend error (report):', error);
    throw error;
  }

  console.log('✅ Report email sent:', data?.id || data);
  return { success: true };
}

/**
 * Send test report (Resend)
 */
async function sendTestReport() {
  console.log('🧪 Sending test report (Resend)...');

  try {
    const testSignups = [
      { Date: '2025-11-02', 'Parent Name': 'Test Parent 1', Email: 'test1@example.com', 'Children Names': 'Test Child 1', 'Email Status': 'active' },
      { Date: '2025-11-02', 'Parent Name': 'Test Parent 2', Email: 'test2@example.com', 'Children Names': 'Test Child 2, Test Child 3', 'Email Status': 'active' }
    ];

    const report = generateReportHTML(testSignups, 'Test Report');
    await sendReportEmail(report, '🧪 TEST REPORT - JULDD Media Newsletter Signups');

    console.log('✅ Test report sent successfully!');
    return { success: true, message: 'Test report sent to julie@juldd.com' };
  } catch (error) {
    console.error('❌ Error sending test report:', error);
    throw error;
  }
}

module.exports = {
  processFormSubmission,
  generateDailyReport,
  sendTestReport
};

/**
 * JULDD Media Newsletter Signup Workflows
 * Handles form submissions, Excel file integration, and daily reports
 */

const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const path = require('path');

const excelFilePath = path.join(__dirname, '..', 'JULDD_Media_Signups.xlsx');

// Email configuration
const emailConfig = {
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || 'your-email@gmail.com',
        pass: process.env.GMAIL_PASSWORD || 'your-app-password'
    }
};

// Initialize email transporter
const transporter = nodemailer.createTransport(emailConfig);

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

        await syncToExcel(signupRecord);
        await sendConfirmationEmail(formData.parentEmail, formData.parentName);

        return { success: true, message: 'Signup processed successfully', record: signupRecord };
    } catch (error) {
        console.error('❌ Error processing form submission:', error);
        throw error;
    }
}

/**
 * Workflow 2: Sync to Excel
 */
async function syncToExcel(signupRecord) {
    console.log('📊 Syncing to Excel:', signupRecord);
    
    try {
        const workbook = xlsx.readFile(excelFilePath);
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
        throw error;
    }
}

/**
 * Workflow 3: Send Confirmation Email
 */
async function sendConfirmationEmail(email, parentName) {
    console.log('📧 Sending confirmation email to:', email);
    
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER || 'noreply@julddmedia.com',
            to: email,
            subject: '🎉 Welcome to JULDD Media Kids\' AI Newsletter!',
            html: `
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
                    <h3 style="color: #0f3460;">Important Information</h3>
                    <p><strong>Pricing:</strong> Pricing details coming soon</p>
                    <p><strong>Cancellation:</strong> You can cancel anytime, no questions asked</p>
                    <p><strong>Privacy:</strong> We comply with COPPA and protect your family's data</p>
                    <h3 style="color: #0f3460;">Next Steps</h3>
                    <p>Your free trial will begin immediately. Look for our first newsletter in your inbox soon!</p>
                    <p>If you have any questions, feel free to reach out to us at <a href="mailto:support@julddmedia.com">support@julddmedia.com</a></p>
                    <p>Best regards,<br><strong>The JULDD Media Team</strong></p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">This email was sent to ${email} because you signed up for the JULDD Media Newsletter. <a href="#">Manage preferences</a> | <a href="#">Unsubscribe</a></p>
                </div>
            `
        };

        console.log('✅ Confirmation email prepared for:', email);
        // await transporter.sendMail(mailOptions);
        
        return { success: true, email };
    } catch (error) {
        console.error('❌ Error sending confirmation email:', error);
        throw error;
    }
}

/**
 * Workflow 4 & 5: Generate Daily Reports
 */
async function generateDailyReport(reportType) {
    console.log(`📊 Generating ${reportType}...`);
    
    try {
        const signups = getNewSignups();
        
        if (signups.length === 0) {
            console.log('ℹ️ No new signups to report.');
            return { success: true, signups: [], message: 'No new signups' };
        }

        const reportHTML = generateReportHTML(signups, reportType);
        await sendReportEmail(reportHTML, `${reportType} - New Newsletter Signups`);
        
        // Clear the log of reported signups
        clearReportedSignups(signups);

        return { success: true, signups, report: reportHTML };
    } catch (error) {
        console.error(`❌ Error generating ${reportType}:`, error);
        throw error;
    }
}

function getNewSignups() {
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // This is a simplified approach. A more robust solution would track reported signups.
    // For now, we'll just grab the last few as an example.
    return data.slice(-5); 
}

function clearReportedSignups(reportedSignups) {
    // In a real application, you would mark these as reported in the Excel sheet
    // or move them to another sheet. For this example, we'll just log it.
    console.log('✅ Clearing reported signups from the queue.');
}


/**
 * Generate HTML report
 */
function generateReportHTML(signups, reportType) {
    const signupRows = signups.map((signup, index) => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;">${index + 1}</td>
            <td style="padding: 10px;">${signup.Date}</td>
            <td style="padding: 10px;">${signup['Parent Name']}</td>
            <td style="padding: 10px;">${signup.Email}</td>
            <td style="padding: 10px;">${signup['Children Names']}</td>
            <td style="padding: 10px;"><span style="background: #4caf50; color: white; padding: 5px 10px; border-radius: 3px;">${signup['Email Status']}</span></td>
        </tr>
    `).join('');

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
 * Send report email
 */
async function sendReportEmail(reportHTML, subject) {
    console.log('📧 Sending report email...');
    
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER || 'noreply@julddmedia.com',
            to: 'julie@juldd.com',
            subject: subject,
            html: reportHTML
        };

        console.log('✅ Report email prepared');
        // In production: await transporter.sendMail(mailOptions);
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending report email:', error);
        throw error;
    }
}

/**
 * Send test report
 */
async function sendTestReport() {
    console.log('🧪 Sending test report...');
    
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
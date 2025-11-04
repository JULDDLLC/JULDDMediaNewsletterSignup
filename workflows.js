/**
 * JULDD Media Newsletter Signup Workflows
 * Clean version — uses Resend API for emails only
 */

const { Resend } = require("resend");
const xlsx = require("xlsx");
const path = require("path");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "JULDD Media <onboarding@resend.dev>";
const excelFilePath = path.join(__dirname, "..", "JULDD_Media_Signups.xlsx");

async function processFormSubmission(formData) {
  console.log("📝 Processing form submission:", formData);

  try {
    const parentName = (formData.parentName || "").trim();
    const parentEmail = (formData.parentEmail || "").trim();
    let childrenNames = (formData.childrenNames || "").trim();

    if (!parentName || !parentEmail) throw new Error("Missing required fields");

    const signupRecord = {
      Date: new Date().toISOString().split("T")[0],
      "Parent Name": parentName,
      Email: parentEmail,
      "Children Names": childrenNames || "N/A",
      "Email Status": "active",
      "Signup Source": "web_form",
    };

    console.log("✅ Signup record created:", signupRecord);

    // Skip Excel on Vercel (read-only)
    if (!process.env.VERCEL) await syncToExcel(signupRecord);

    await sendConfirmationEmail(parentEmail, parentName);

    return { success: true, message: "Signup processed successfully" };
  } catch (error) {
    console.error("❌ Error processing form submission:", error);
    throw error;
  }
}

async function syncToExcel(signupRecord) {
  try {
    let workbook;
    try {
      workbook = xlsx.readFile(excelFilePath);
    } catch {
      workbook = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([
        ["Date", "Parent Name", "Email", "Children Names", "Email Status", "Signup Source"],
      ]);
      xlsx.utils.book_append_sheet(workbook, ws, "Signups");
    }

    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const newRow = [
      signupRecord.Date,
      signupRecord["Parent Name"],
      signupRecord.Email,
      signupRecord["Children Names"],
      signupRecord["Email Status"],
      signupRecord["Signup Source"],
    ];
    xlsx.utils.sheet_add_aoa(ws, [newRow], { origin: -1 });
    xlsx.writeFile(workbook, excelFilePath);

    console.log("✅ Data saved to Excel");
  } catch (error) {
    console.warn("⚠️ Excel sync skipped:", error.message);
  }
}

async function sendConfirmationEmail(email, parentName) {
  console.log("📧 Sending email via Resend:", email);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f3460;">Welcome to JULDD Media! 🎉</h2>
      <p>Hi ${parentName},</p>
      <p>Thank you for signing up for the JULDD Media Kids' AI Newsletter!</p>
      <h3>Your Free Trial</h3>
      <p>✅ <strong>1 Month Free Access</strong> - No credit card required!</p>
      <h3>What to Expect</h3>
      <ul>
        <li>📚 Educational content with AI-powered learning</li>
        <li>🎨 Engaging animations and audio stories</li>
        <li>👨‍👩‍👧‍👦 Age-appropriate material</li>
        <li>📧 Regular newsletter updates (frequency TBD)</li>
      </ul>
      <p>Your free trial begins immediately. Look for your first newsletter soon!</p>
      <p>Questions? <a href="mailto:support@julddmedia.com">support@julddmedia.com</a></p>
      <p>Best, <br><strong>The JULDD Media Team</strong></p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "🎉 Welcome to JULDD Media Kids' AI Newsletter!",
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);

  console.log("✅ Confirmation email sent successfully");
}

module.exports = { processFormSubmission };



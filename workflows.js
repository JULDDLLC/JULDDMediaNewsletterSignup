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

    if (!parentName || !parentEmail) {
      throw new Error("Missing required fields: parent name and email");
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail)) {
      throw new Error("Invalid email format");
    }

    const signupRecord = {
      Date: new Date().toISOString().split("T")[0],
      "Parent Name": parentName,
      Email: parentEmail,
      "Children Names": childrenNames || "N/A",
      "Email Status": "active",
      "Signup Source": "web_form",
    };

    console.log("✅ Signup record created:", signupRecord);
    console.log("👨‍👩‍👧‍👦 Children names logged:", childrenNames);

    // Skip Excel on Vercel (read-only filesystem)
    if (!process.env.VERCEL) {
      await syncToExcel(signupRecord);
    } else {
      console.log("ℹ️ Vercel detected: Skipping Excel sync (read-only FS)");
    }

    await sendConfirmationEmail(parentEmail, parentName, childrenNames);

    return { success: true, message: "Signup processed successfully" };
  } catch (error) {
    console.error("❌ Error processing form submission:", error.message);
    throw error;
  }
}

async function syncToExcel(signupRecord) {
  try {
    let workbook;
    try {
      workbook = xlsx.readFile(excelFilePath);
    } catch (fileError) {
      console.log("📄 Creating new Excel file");
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

    console.log("✅ Data saved to Excel:", excelFilePath);
  } catch (error) {
    console.warn("⚠️ Excel sync failed (continuing without it):", error.message);
  }
}

async function sendConfirmationEmail(email, parentName, childrenNames = "N/A") {
  console.log("📧 Sending detailed confirmation email via Resend to:", email);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="color: #0f3460;">Welcome to JULDD Media! 🎉</h2>
      <p>Hi ${parentName},</p>
      <p>Thank you for signing up for the JULDD Media Kids' AI Newsletter! We're excited to bring educational AI-powered content to your family.</p>
      <h3>Your Free Trial</h3>
      <p>✅ <strong>1 Month Free Access</strong> - No credit card required! Your trial starts immediately.</p>
      <h3>Family Details</h3>
      <p>Children: ${childrenNames !== "N/A" ? childrenNames : "Not specified (you can update this later)"}</p>
      <h3>What to Expect</h3>
      <ul style="color: #333;">
        <li>📚 Educational content with AI-powered learning tools</li>
        <li>🎨 Engaging animations and audio stories for kids</li>
        <li>👨‍👩‍👧‍👦 Age-appropriate, family-friendly material</li>
        <li>📧 Regular newsletter updates (bi-weekly to start)</li>
      </ul>
      <p>Look for your first newsletter in your inbox soon. If you don't see it, check your spam folder (Gmail users: add onboarding@res

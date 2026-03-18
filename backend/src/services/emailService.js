import nodemailer from "nodemailer";

function smtpConfigured() {
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export async function sendOtpEmail({ to, otp }) {
  // If SMTP not configured, log OTP (dev fallback)
  if (!smtpConfigured()) {
    console.log(`[DEV OTP] Email to ${to}: ${otp}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // STARTTLS on 587
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "no-reply@1community.org",
    to,
    subject: "Your 1Community registration code",
    text: `Your registration code is: ${otp}\n\nIt expires in 15 minutes.`,
  });
}

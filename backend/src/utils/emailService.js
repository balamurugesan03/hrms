const nodemailer = require('nodemailer');

const createTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
};

const sendPasswordResetEmail = async (email, resetToken, name) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'Password Reset Request - HRMS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">HRMS Password Reset</h2>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1976d2;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;margin:16px 0;">
          Reset Password
        </a>
        <p>This link expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr />
        <p style="color:#888;font-size:12px;">HRMS System - Human Resource Management</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendPasswordResetEmail };

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(to: string, code: string, name: string): Promise<boolean> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured, skipping verification email');
    return false;
  }

  const mailOptions = {
    from: `"AnatomLabs+" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your AnatomLabs+ account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #e74c3c; margin: 0; font-size: 28px;">AnatomLabs+</h1>
        </div>
        <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 8px;">Hey ${name},</h2>
        <p style="color: #999; font-size: 15px; line-height: 1.5;">Use this code to verify your email address:</p>
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #e74c3c;">${code}</span>
        </div>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">This code expires in 15 minutes. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, code: string, name: string): Promise<boolean> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured');
    return false;
  }

  const mailOptions = {
    from: `"AnatomLabs+" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your AnatomLabs+ password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #e74c3c; margin: 0; font-size: 28px;">AnatomLabs+</h1>
        </div>
        <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 8px;">Hey ${name},</h2>
        <p style="color: #999; font-size: 15px; line-height: 1.5;">Use this code to reset your password:</p>
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #e74c3c;">${code}</span>
        </div>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

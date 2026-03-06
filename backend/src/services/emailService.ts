const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not configured');
    return false;
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'AnatomLabs+', email: process.env.EMAIL_FROM || 'anatomlabsplus@gmail.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Brevo API error: ${response.status} ${err}`);
  }

  return true;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(to: string, code: string, name: string): Promise<boolean> {
  try {
    return await sendEmail(to, 'Verify your AnatomLabs+ account', `
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
    `);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, code: string, name: string): Promise<boolean> {
  try {
    return await sendEmail(to, 'Reset your AnatomLabs+ password', `
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
    `);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

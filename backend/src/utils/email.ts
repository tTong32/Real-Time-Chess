import nodemailer from 'nodemailer';
import { config } from '../config/environment';

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize the email transporter
 * Returns null if email service is not configured
 */
function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  // If email service is not configured, return null (email sending will be skipped)
  if (!config.emailService.host || !config.emailService.user || !config.emailService.pass) {
    console.warn('Email service not configured. Email verification will be skipped.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.emailService.host,
    port: config.emailService.port,
    secure: config.emailService.port === 465, // true for 465, false for other ports
    auth: {
      user: config.emailService.user,
      pass: config.emailService.pass,
    },
  });

  return transporter;
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<void> {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    // In development, log the verification link instead of sending email
    const verificationUrl = `${config.corsOrigin}/verify/${verificationToken}`;
    console.log(`[DEV MODE] Verification email for ${email}: ${verificationUrl}`);
    return;
  }

  const verificationUrl = `${config.corsOrigin}/verify/${verificationToken}`;

  try {
    await emailTransporter.sendMail({
      from: `"Real-Time Chess" <${config.emailService.user}>`,
      to: email,
      subject: 'Verify your email address',
      html: `
        <h2>Welcome to Real-Time Chess!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>If you did not create an account, please ignore this email.</p>
      `,
      text: `
        Welcome to Real-Time Chess!
        
        Please verify your email address by visiting: ${verificationUrl}
        
        If you did not create an account, please ignore this email.
      `,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't throw - allow user creation even if email fails
    console.log(`[FALLBACK] Verification URL for ${email}: ${verificationUrl}`);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    // In development, log the reset link instead of sending email
    const resetUrl = `${config.corsOrigin}/reset-password/${resetToken}`;
    console.log(`[DEV MODE] Password reset email for ${email}: ${resetUrl}`);
    return;
  }

  const resetUrl = `${config.corsOrigin}/reset-password/${resetToken}`;

  try {
    await emailTransporter.sendMail({
      from: `"Real-Time Chess" <${config.emailService.user}>`,
      to: email,
      subject: 'Reset your password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `,
      text: `
        Password Reset Request
        
        You requested to reset your password. Visit this link to reset it: ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you did not request a password reset, please ignore this email.
      `,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    console.log(`[FALLBACK] Password reset URL for ${email}: ${resetUrl}`);
  }
}


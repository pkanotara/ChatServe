const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
};

const loadTemplate = (templateName) => {
  const filePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  return fs.readFileSync(filePath, 'utf-8');
};

const renderTemplate = (template, variables) => {
  const escapeHtml = (str) =>
    String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  return Object.entries(variables).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, escapeHtml(value)),
    template,
  );
};

/**
 * Send a password-reset notification email to a restaurant owner.
 * Silently skips if SMTP is not configured.
 */
const sendPasswordResetEmail = async ({ ownerName, ownerEmail, restaurantName, newPassword, adminName }) => {
  const transporter = createTransporter();
  if (!transporter) {
    logger.warn('Email service not configured (SMTP_HOST/USER/PASS missing) – skipping password reset email');
    return;
  }

  const dashboardUrl = process.env.DASHBOARD_URL || 'https://app.chatserve.in';
  const resetTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const html = renderTemplate(loadTemplate('passwordReset'), {
    ownerName,
    ownerEmail,
    restaurantName,
    adminName,
    dashboardUrl,
    resetTime,
  });

  try {
    await transporter.sendMail({
      from: `"ChatServe" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: ownerEmail,
      subject: '🔐 Your ChatServe Dashboard Password Has Been Reset',
      html,
    });
    logger.info(`Password reset email sent to ${ownerEmail}`);
  } catch (err) {
    logger.error(`Failed to send password reset email to ${ownerEmail}:`, err.message);
    // Non-fatal – do not re-throw so the password reset itself still succeeds
  }
};

module.exports = { sendPasswordResetEmail };

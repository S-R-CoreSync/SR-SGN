import nodemailer from "nodemailer";
import { getApiMessage } from './api-messages';
import { SITE_URL } from './site';
import type { AuditReport } from './audit-duplicates';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fromName = process.env.SMTP_FROM_NAME;
const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || "";
const isConfigured = () => !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

function t(locale: string, key: string, vars?: Record<string, string>) {
  return getApiMessage(locale, key, vars);
}

export async function sendPasswordResetEmail(email: string, token: string, locale = 'ar') {
  if (!isConfigured()) return;
  const senderName = fromName || t(locale, 'emailTemplates.senderName');
  const resetUrl = `${SITE_URL}/reset-password/${token}`;
  await transporter.sendMail({
    from: `"${senderName}" <${fromAddr}>`,
    to: email,
    subject: t(locale, 'emailTemplates.resetPasswordSubject'),
    html: `
      <div style="font-family: Arial; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <img src="${SITE_URL}/logo.png" style="width: 48px; height: 48px;" />
        <h2 style="color: #1a5632;">${t(locale, 'emailTemplates.resetPasswordHeading')}</h2>
        <p>${t(locale, 'emailTemplates.resetPasswordBody')}</p>
        <a href="${resetUrl}" style="display: inline-block; background: #1a5632; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          ${t(locale, 'emailTemplates.resetPasswordBtn')}
        </a>
        <p style="color: #6b7280; font-size: 12px;">${t(locale, 'emailTemplates.resetPasswordFooter')}</p>
      </div>
    `,
  });
}

export async function sendMemberConfirmationEmail(email: string | undefined, nameAr: string, locale = 'ar') {
  if (!isConfigured() || !email) return;
  const senderName = fromName || t(locale, 'emailTemplates.senderName');
  await transporter.sendMail({
    from: `"${senderName}" <${fromAddr}>`,
    to: email,
    subject: t(locale, 'emailTemplates.memberConfirmSubject'),
    html: `
      <div style="font-family: Arial; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <img src="${SITE_URL}/logo.png" style="width: 48px; height: 48px;" />
        <h2 style="color: #1a5632;">${t(locale, 'emailTemplates.memberConfirmGreeting', { name: nameAr })}</h2>
        <p>${t(locale, 'emailTemplates.memberConfirmBody')}</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">${t(locale, 'emailTemplates.memberConfirmFooter')}</p>
      </div>
    `,
  });
}

export async function sendAdminNotificationEmail(nameAr: string, nameNl: string, whatsapp: string, originCity: string, locale = 'ar') {
  if (!isConfigured()) return;
  const senderName = fromName || t(locale, 'emailTemplates.senderName');
  const dashboardUrl = `${SITE_URL}/dashboard/members`;
  if (!fromAddr) return;
  await transporter.sendMail({
    from: `"${senderName}" <${fromAddr}>`,
    to: fromAddr,
    subject: t(locale, 'emailTemplates.adminNewSubject', { name: nameAr }),
    html: `
      <div style="font-family: Arial; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #1a5632;">${t(locale, 'emailTemplates.adminNewHeading')}</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${t(locale, 'emailTemplates.adminNameLabel')}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${nameAr}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${t(locale, 'emailTemplates.adminNameNlLabel')}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;" dir="ltr">${nameNl}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${t(locale, 'emailTemplates.adminWhatsappLabel')}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;" dir="ltr">${whatsapp}</td></tr>
          <tr><td style="padding: 8px; color: #6b7280;">${t(locale, 'emailTemplates.adminOriginLabel')}</td><td style="padding: 8px;">${originCity}</td></tr>
        </table>
        <a href="${dashboardUrl}" style="display: inline-block; background: #1a5632; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          ${t(locale, 'emailTemplates.adminViewDashboard')}
        </a>
      </div>
    `,
  });
}

export async function sendStatusChangeEmail(email: string, nameAr: string, status: string, memberId: string, notes?: string | null, locale = 'ar') {
  if (!isConfigured() || !email) return;
  const senderName = fromName || t(locale, 'emailTemplates.senderName');
  const isAccepted = status === "accepted";
  const subject = isAccepted ? t(locale, 'emailTemplates.statusAcceptedSubject') : t(locale, 'emailTemplates.statusUpdatedSubject');
  const headline = isAccepted
    ? t(locale, 'emailTemplates.statusAcceptedGreeting', { name: nameAr })
    : t(locale, 'emailTemplates.statusRejectedGreeting', { name: nameAr });
  const body = isAccepted
    ? t(locale, 'emailTemplates.statusAcceptedBody')
    : t(locale, 'emailTemplates.statusRejectedBody');
  const profileUrl = `${SITE_URL}/member/${memberId}`;

  await transporter.sendMail({
    from: `"${senderName}" <${fromAddr}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <img src="${SITE_URL}/logo.png" style="width: 48px; height: 48px;" />
        <h2 style="color: #1a5632;">${headline}</h2>
        <p>${body}</p>
        ${notes ? `<div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 16px 0; color: #92400e; font-size: 13px;"><strong>${t(locale, 'emailTemplates.notesLabel')}</strong> ${notes}</div>` : ""}
        ${isAccepted ? `<a href="${profileUrl}" style="display: inline-block; background: #1a5632; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">${t(locale, 'emailTemplates.viewProfileBtn')}</a>` : ""}
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">${t(locale, 'emailTemplates.footerTagline')}</p>
      </div>
    `,
  });
}

/** دعوة عضو مجلس الإدارة لتفعيل حسابه — تُرسل من لوحة إدارة المجلس. */
export async function sendBoardInviteEmail(email: string, name: string, locale = 'ar') {
  if (!isConfigured()) return false;
  const senderName = fromName || t(locale, 'emailTemplates.senderName');
  const loginUrl = `${SITE_URL}/${locale === 'ar' ? 'login' : `${locale}/login`}`;
  const step = (n: string, text: string) => `<li style="margin: 8px 0;">${n}. ${text}</li>`;

  await transporter.sendMail({
    from: `"${senderName}" <${fromAddr}>`,
    to: email,
    subject: t(locale, 'boardAdmin.inviteEmailSubject', { name }),
    html: `
      <div dir="${locale === 'ar' ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <img src="${SITE_URL}/logo.png" style="width: 48px; height: 48px;" alt="" />
        <h2 style="color: #1a5632;">${t(locale, 'boardAdmin.inviteEmailHeading', { name })}</h2>
        <p style="color: #374151; line-height: 1.8;">${t(locale, 'boardAdmin.inviteEmailIntro')}</p>
        <ol style="color: #374151; line-height: 1.9; padding-inline-start: 20px;">
          ${step(t(locale, 'boardAdmin.stepOne'), t(locale, 'boardAdmin.inviteEmailStep1'))}
          ${step(t(locale, 'boardAdmin.stepTwo'), t(locale, 'boardAdmin.inviteEmailStep2'))}
          ${step(t(locale, 'boardAdmin.stepThree'), t(locale, 'boardAdmin.inviteEmailStep3'))}
        </ol>
        <a href="${loginUrl}" style="display: inline-block; background: #1a5632; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          ${t(locale, 'boardAdmin.inviteEmailButton')}
        </a>
        <p style="color: #6b7280; font-size: 12px; line-height: 1.7;">${t(locale, 'boardAdmin.inviteEmailPrivacy')}</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">${t(locale, 'emailTemplates.footerTagline')}</p>
      </div>
    `,
  });
  return true;
}

/** Internal admin report — intentionally English so it never touches the /ar, /en and /nl language isolation. */
export async function sendAuditReportEmail(report: AuditReport): Promise<boolean> {
  const to = (process.env.AUDIT_EMAIL_TO || fromAddr || "").trim();
  if (!isConfigured() || !to) return false;

  const esc = (value: string) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const clean = report.problems === 0;
  const subject = clean
    ? "SGN duplicate audit: clean"
    : `SGN duplicate audit: ${report.problems} problem(s)`;
  const row = (label: string, value: number) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${label}</td>` +
    `<td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${value}</td></tr>`;

  const details: string[] = [];
  if (report.missingKey.length) {
    details.push("<h3>Posts without a stable key</h3><ul>");
    for (const post of report.missingKey.slice(0, 10)) {
      details.push(`<li>${esc(post.locale)} — ${esc(String(post.title).slice(0, 80))}</li>`);
    }
    details.push("</ul>");
  }
  if (report.duplicateKeys.length) {
    details.push("<h3>Duplicate identities</h3><ul>");
    for (const { key, posts } of report.duplicateKeys.slice(0, 10)) {
      details.push(`<li><code>${esc(key)}</code> x ${posts.length}: ${esc(posts.map((p) => String(p.title).slice(0, 45)).join(" | "))}</li>`);
    }
    details.push("</ul>");
  }
  if (report.sharedImages.length) {
    details.push("<h3>Images shared by different posts</h3><ul>");
    for (const { image, owners, samples } of report.sharedImages.slice(0, 10)) {
      details.push(`<li>${esc(image.slice(0, 100))} — ${owners}: ${esc(samples.join(" | "))}</li>`);
    }
    details.push("</ul>");
  }

  const text = [
    subject,
    `Total posts: ${report.total}`,
    `Without stable key: ${report.missingKey.length}`,
    `Duplicate identities: ${report.duplicateKeys.length}`,
    `Shared images: ${report.sharedImages.length}`,
  ].join("\n");

  await transporter.sendMail({
    from: `"${fromName || "SGN Audit"}" <${fromAddr}>`,
    to,
    subject,
    text,
    html: `
      <div dir="ltr" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#1a5632;">${esc(subject)}</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${row("Total posts", report.total)}
          ${row("Without stable key", report.missingKey.length)}
          ${row("Duplicate identities", report.duplicateKeys.length)}
          ${row("Shared images", report.sharedImages.length)}
        </table>
        ${clean ? '<p style="color:#15803d;">No problems found.</p>' : details.join("")}
        <p style="color:#6b7280;font-size:12px;">Automated weekly report — SGN production database.</p>
      </div>
    `,
  });
  return true;
}

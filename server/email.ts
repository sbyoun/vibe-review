import nodemailer from "nodemailer";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailDelivery = {
  configured: boolean;
  delivered: boolean;
};

let transport: nodemailer.Transporter | null = null;

function smtpTransport() {
  const host = process.env.SMTP_HOST;

  if (!host) {
    return null;
  }

  if (transport) {
    return transport;
  }

  transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "1",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });

  return transport;
}

export function publicOrigin() {
  const configured =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${publicOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendMail(input: MailInput): Promise<MailDelivery> {
  const tx = smtpTransport();

  if (!tx) {
    console.log(`[email][dev] ${input.to} -> ${input.subject}`);
    return { configured: false, delivered: false };
  }

  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? "vibearchive <no-reply@auth.foldalpha.com>",
      ...input,
    });

    return { configured: true, delivered: true };
  } catch (error) {
    console.error("[email] SMTP delivery failed:", error);
    return { configured: true, delivered: false };
  }
}

export async function sendEmailVerificationMail(email: string, link: string) {
  return sendMail({
    to: email,
    subject: "Verify your vibearchive email",
    text:
      "Open this link to verify your vibearchive email address. The link is valid for 24 hours.\n\n" +
      `${link}\n\nIf you did not create this account, you can ignore this email.`,
    html:
      `<p>Open this link to verify your vibearchive email address. The link is valid for 24 hours.</p>` +
      `<p><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">Verify email</a></p>` +
      `<p style="color:#64748b;font-size:12px">If you did not create this account, you can ignore this email.</p>`,
  });
}

export async function sendPasswordResetMail(email: string, link: string) {
  return sendMail({
    to: email,
    subject: "Reset your vibearchive password",
    text:
      "Open this link to set a new vibearchive password. The link is valid for 30 minutes.\n\n" +
      `${link}\n\nIf you did not request this, your password has not been changed.`,
    html:
      `<p>Open this link to set a new vibearchive password. The link is valid for 30 minutes.</p>` +
      `<p><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">Reset password</a></p>` +
      `<p style="color:#64748b;font-size:12px">If you did not request this, your password has not been changed.</p>`,
  });
}

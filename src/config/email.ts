import { Resend } from 'resend';
import {
  broadcastEmailHtml,
  invitationEmailHtml,
  parentProgressInviteEmailHtml,
  passwordResetEmailHtml,
  subscriptionConfirmationHtml,
  trialExpiryWarningHtml,
  verificationEmailHtml,
  welcomeEmailHtml,
} from './emailTemplates';

const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - emails will be logged only');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!resendClient) {
    resendClient = getResend();
  }
  return resendClient;
};

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const resend = getResendClient();
  if (!resend) {
    console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}`);
    return { id: 'mock-id' };
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@mujam.com',
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Email service error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  return data;
};

export { broadcastEmailHtml };

export const sendVerificationEmail = async (email: string, code: string) => {
  await sendEmail({
    to: email,
    subject: 'كود التحقق من البريد الإلكتروني - معجَم',
    html: verificationEmailHtml(code),
  });
};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  await sendEmail({
    to: email,
    subject: 'إعادة تعيين كلمة المرور - معجَم',
    html: passwordResetEmailHtml(resetLink),
  });
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  await sendEmail({
    to: email,
    subject: 'مرحباً بك في معجَم - منصة تعلم اللغة الإنجليزية',
    html: welcomeEmailHtml(name),
  });
};

export const sendSubscriptionConfirmation = async (email: string, plan: string) => {
  await sendEmail({
    to: email,
    subject: 'تم تأكيد اشتراكك - معجَم',
    html: subscriptionConfirmationHtml(plan),
  });
};

export const sendTrialExpiryWarning = async (email: string, name: string, daysLeft: number) => {
  await sendEmail({
    to: email,
    subject: `تنبيه: تبقى ${daysLeft} يوم على تجربتك المجانية - معجَم`,
    html: trialExpiryWarningHtml(name, daysLeft),
  });
};

export const sendInvitationEmail = async (
  email: string,
  invitationLink: string,
  expiresAt: Date,
  access: 'MOAJAM' | 'KIDS' | 'BOTH' = 'MOAJAM'
) => {
  await sendEmail({
    to: email,
    subject: 'دعوة للانضمام إلى معجَم',
    html: invitationEmailHtml(email, invitationLink, expiresAt, access),
  });
};

/** Notify parent that they can view a child's Kids progress after login. */
export const sendParentProgressInviteEmail = async (
  parentEmail: string,
  childEmail: string,
  childName?: string
) => {
  await sendEmail({
    to: parentEmail,
    subject: 'متابعة تقدّم طفلك على معجم الصغار',
    html: parentProgressInviteEmailHtml(childEmail, childName),
  });
};

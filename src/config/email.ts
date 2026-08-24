import { Resend } from 'resend';

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

export const sendVerificationEmail = async (email: string, code: string) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تحقق من البريد الإلكتروني</title>
    </head>
    <body style="font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; text-align: center;">مرحباً بك في معجَم</h2>
        <p style="color: #333; font-size: 16px;">شكراً لتسجيلك في منصة معجَم</p>
        <p style="color: #333; font-size: 16px;">كود التحقق الخاص بك:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">
          ${code}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">هذا الكود صالح لمدة 10 دقائق</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'كود التحقق من البريد الإلكتروني - معجَم',
    html,
  });
};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>إعادة تعيين كلمة المرور</title>
    </head>
    <body style="font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; text-align: center;">معجَم - إعادة تعيين كلمة المرور</h2>
        <p style="color: #333; font-size: 16px;">اضغط على الرابط التالي لإعادة تعيين كلمة المرور:</p>
        <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0;">إعادة تعيين كلمة المرور</a>
        <p style="color: #666; font-size: 14px;">هذا الرابط صالح لمدة ساعة واحدة</p>
        <p style="color: #999; font-size: 12px;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'إعادة تعيين كلمة المرور - معجَم',
    html,
  });
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>مرحباً في معجَم</title>
    </head>
    <body style="font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; text-align: center;">مرحباً ${name} في معجَم! 🎉</h2>
        <p style="color: #333; font-size: 16px;">شكراً لانضمامك إلى منصة معجَم لتعلم اللغة الإنجليزية</p>
        <p style="color: #666; font-size: 14px;">نحن متحمسون لمساعدتك في رحلة تعلمك</p>
        <ul style="color: #333; font-size: 14px; line-height: 1.8;">
          <li>تعلم الجمل الإنجليزية بطريقة ممتعة</li>
          <li>ممارسة المحادثات مع الذكاء الاصطناعي</li>
          <li>تتبع تقدمك والفوز بالإنجازات</li>
        </ul>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'مرحباً بك في معجَم - منصة تعلم اللغة الإنجليزية',
    html,
  });
};

export const sendSubscriptionConfirmation = async (email: string, plan: string) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تأكيد الاشتراك</title>
    </head>
    <body style="font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #10b981; text-align: center;">تم ترقية اشتراكك بنجاح! ✅</h2>
        <p style="color: #333; font-size: 16px;">تم تفعيل خطة <strong>${plan === 'PREMIUM' ? 'المميزة' : plan}</strong> لديك</p>
        <p style="color: #666; font-size: 14px;">الآن يمكنك الاستمتاع بجميع مميزات الخطة المميزة</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'تم تأكيد اشتراكك - معجَم',
    html,
  });
};

export const sendTrialExpiryWarning = async (email: string, name: string, daysLeft: number) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تنبيه انتهاء التجربة المجانية</title>
    </head>
    <body style="font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #f59e0b; text-align: center;">⚠️ تنبيه مهم</h2>
        <p style="color: #333; font-size: 16px;">مرحباً ${name}،</p>
        <p style="color: #333; font-size: 14px;">نذكرك أن فترة التجربة المجانية ستنتهي خلال <strong>${daysLeft} أيام</strong></p>
        <p style="color: #666; font-size: 14px;">لمشتركتك المميزة بـ 9.99$/شهر، ستحصل على:</p>
        <ul style="color: #333; font-size: 14px; text-align: right; padding-right: 20px;">
          <li>✅ جميع المستويات (1-7)</li>
          <li>✅ محادثات غير محدودة مع الذكاء الاصطناعي</li>
          <li>✅ تمارين الظل (Shadowing)</li>
          <li>✅ الشهادة النهائية</li>
        </ul>
        <a href="${process.env.FRONTEND_URL}/subscribe" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0; text-align: center;">اشترك الآن وحصل على شهر مجاني!</a>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `تنبيه: تبقى ${daysLeft} يوم على تجربتك المجانية - معجَم`,
    html,
  });
};

export const sendInvitationEmail = async (
  email: string,
  invitationLink: string,
  expiresAt: Date,
  access: 'MOAJAM' | 'KIDS' | 'BOTH' = 'MOAJAM'
) => {
  const expiresLabel = expiresAt.toLocaleDateString('ar-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const accessLabel =
    access === 'KIDS'
      ? 'معجم الصغار'
      : access === 'BOTH'
        ? 'معجم + معجم الصغار'
        : 'منصة معجم';
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>دعوة للانضمام إلى معجَم</title>
    </head>
    <body style="font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; text-align: center;">دعوة للانضمام إلى معجَم</h2>
        <p style="color: #333; font-size: 16px;">تمت دعوتك لإنشاء حساب على: <strong>${accessLabel}</strong>.</p>
        <p style="color: #333; font-size: 14px;">اضغط الزر أدناه لإكمال التسجيل باستخدام هذا البريد: <strong dir="ltr">${email}</strong></p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${invitationLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">إنشاء حسابي</a>
        </div>
        <p style="color: #666; font-size: 13px;">الدعوة صالحة حتى ${expiresLabel} ويمكن استخدامها مرة واحدة فقط.</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">إذا لم يعمل الزر، انسخ الرابط:<br/>${invitationLink}</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'دعوة للانضمام إلى معجَم',
    html,
  });
};

/** Notify parent that they can view a child's Kids progress after login. */
export const sendParentProgressInviteEmail = async (
  parentEmail: string,
  childEmail: string,
  childName?: string
) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const parentLink = `${frontendUrl}/kids/parent`;
  const loginLink = `${frontendUrl}/login`;
  const label = childName || childEmail;
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"><title>متابعة تقدّم طفلك — معجَم</title></head>
    <body style="font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px;">
        <h2 style="color: #2563eb; text-align: center;">متابعة تقدّم طفلك</h2>
        <p style="color: #333; font-size: 15px;">تم ربط بريدك كوليّ أمر لحساب الطفل المرتبط بـ <strong dir="ltr">${label}</strong> في معجم الصغار.</p>
        <p style="color: #333; font-size: 14px;">سجّل الدخول بنفس هذا البريد (أو أنشئ حساباً بدعوة إن لزم) ثم افتح لوحة الوالدين لعرض التقدّم.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">تسجيل الدخول</a>
        </div>
        <p style="color: #666; font-size: 13px; word-break: break-all;">لوحة الوالدين: ${parentLink}</p>
      </div>
    </body>
    </html>
  `;
  await sendEmail({
    to: parentEmail,
    subject: 'متابعة تقدّم طفلك على معجم الصغار',
    html,
  });
};


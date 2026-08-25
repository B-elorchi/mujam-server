/**
 * Shared Moajam HTML email layout + per-template bodies.
 *
 * Logo URL (absolute, email-client safe):
 *   `${FRONTEND_URL}/imgs/moajaam.png`
 * Prefer the cream/white mark on the navy header. Fallback production host:
 *   https://app.moajam-sa.com/imgs/moajaam.png
 *
 * Brand palette (landing-aligned, navy / blue / gold — not purple-on-white):
 *   navy #1A2648 · soft surface #F3F5F9 · gold #C9A227 · CTA blue #24408E · text #1E293B
 */

export const getFrontendBaseUrl = (): string => {
  const raw = process.env.FRONTEND_URL || 'https://app.moajam-sa.com';
  return raw.split(',')[0].trim().replace(/\/$/, '');
};

/** Absolute HTTPS/HTTP URL to the logo used in email headers. */
export const getEmailLogoUrl = (): string =>
  `${getFrontendBaseUrl()}/imgs/moajaam.png`;

const SUPPORT_EMAIL = 'support@moajam-sa.com';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type EmailShellOptions = {
  title: string;
  preheader?: string;
  bodyHtml: string;
};

/**
 * Shared RTL email shell: navy header + logo, white body card, branded footer.
 * Table-based + inline CSS for client reliability. Max-width ~580px.
 */
export const renderEmailShell = ({ title, preheader, bodyHtml }: EmailShellOptions): string => {
  const logoUrl = getEmailLogoUrl();
  const siteUrl = getFrontendBaseUrl();
  const safeTitle = escapeHtml(title);
  const safePreheader = preheader ? escapeHtml(preheader) : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#E8ECF2;font-family:Tahoma,Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${safePreheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${safePreheader}</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#E8ECF2;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="580" style="width:100%;max-width:580px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #D5DCE8;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#1A2648;padding:28px 24px 24px;">
              <a href="${siteUrl}" style="text-decoration:none;">
                <img src="${logoUrl}" alt="معجَم" width="168" style="display:block;width:168px;max-width:70%;height:auto;border:0;outline:none;" />
              </a>
              <div style="height:3px;width:56px;background-color:#C9A227;margin:18px auto 0;border-radius:2px;"></div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 28px;background-color:#ffffff;color:#1E293B;font-size:15px;line-height:1.75;text-align:right;direction:rtl;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F3F5F9;padding:22px 28px;border-top:1px solid #E2E8F0;text-align:center;direction:rtl;">
              <p style="margin:0 0 6px;font-size:13px;color:#1A2648;font-weight:bold;">معجَم — تعلّم الإنجليزية من حياتك اليومية</p>
              <p style="margin:0 0 10px;font-size:12px;color:#64748B;line-height:1.6;">
                للدعم: <a href="mailto:${SUPPORT_EMAIL}" style="color:#24408E;text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                <a href="${siteUrl}" style="color:#64748B;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a>
                &nbsp;·&nbsp; © معجَم ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const heading = (text: string, color = '#1A2648') =>
  `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:${color};font-weight:bold;text-align:center;">${text}</h1>`;

const paragraph = (text: string, muted = false) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:${muted ? '#64748B' : '#334155'};">${text}</p>`;

const primaryButton = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto;">
    <tr>
      <td align="center" bgcolor="#24408E" style="border-radius:10px;background-color:#24408E;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;font-family:Tahoma,Arial,sans-serif;">${label}</a>
      </td>
    </tr>
  </table>`;

const codeBox = (code: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0;">
    <tr>
      <td align="center" style="background-color:#F3F5F9;border:1px solid #D5DCE8;border-radius:12px;padding:18px 16px;">
        <span style="font-size:30px;font-weight:bold;letter-spacing:10px;color:#24408E;font-family:Consolas,'Courier New',monospace;direction:ltr;unicode-bidi:bidi-override;">${escapeHtml(code)}</span>
      </td>
    </tr>
  </table>`;

const listItems = (items: string[]) =>
  `<ul style="margin:0 0 16px;padding:0 22px 0 0;color:#334155;font-size:14px;line-height:1.9;text-align:right;">
    ${items.map((item) => `<li style="margin-bottom:4px;">${item}</li>`).join('')}
  </ul>`;

export const verificationEmailHtml = (code: string): string =>
  renderEmailShell({
    title: 'تحقق من البريد الإلكتروني',
    preheader: 'كود التحقق الخاص بك في معجَم',
    bodyHtml: [
      heading('مرحباً بك في معجَم'),
      paragraph('شكراً لتسجيلك في منصة معجَم'),
      paragraph('كود التحقق الخاص بك:'),
      codeBox(code),
      paragraph('هذا الكود صالح لمدة 10 دقائق', true),
    ].join(''),
  });

export const passwordResetEmailHtml = (resetLink: string): string =>
  renderEmailShell({
    title: 'إعادة تعيين كلمة المرور',
    preheader: 'رابط إعادة تعيين كلمة المرور — معجَم',
    bodyHtml: [
      heading('إعادة تعيين كلمة المرور'),
      paragraph('اضغط على الزر التالي لإعادة تعيين كلمة المرور:'),
      primaryButton(resetLink, 'إعادة تعيين كلمة المرور'),
      paragraph('هذا الرابط صالح لمدة ساعة واحدة', true),
      paragraph('إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.', true),
      `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#94A3B8;word-break:break-all;direction:ltr;text-align:center;">${escapeHtml(resetLink)}</p>`,
    ].join(''),
  });

export const welcomeEmailHtml = (name: string): string =>
  renderEmailShell({
    title: 'مرحباً في معجَم',
    preheader: 'مرحباً بك في منصة معجَم لتعلم اللغة الإنجليزية',
    bodyHtml: [
      heading(`مرحباً ${escapeHtml(name)} في معجَم`),
      paragraph('شكراً لانضمامك إلى منصة معجَم لتعلم اللغة الإنجليزية'),
      paragraph('نحن متحمسون لمساعدتك في رحلة تعلمك', true),
      listItems([
        'تعلم الجمل الإنجليزية بطريقة ممتعة',
        'ممارسة المحادثات مع الذكاء الاصطناعي',
        'تتبع تقدمك والفوز بالإنجازات',
      ]),
      primaryButton(getFrontendBaseUrl(), 'ابدأ التعلم'),
    ].join(''),
  });

export const subscriptionConfirmationHtml = (plan: string): string => {
  const planLabel = plan === 'PREMIUM' ? 'المميزة' : escapeHtml(plan);
  return renderEmailShell({
    title: 'تأكيد الاشتراك',
    preheader: 'تم تفعيل اشتراكك بنجاح — معجَم',
    bodyHtml: [
      heading('تم ترقية اشتراكك بنجاح', '#1A7A4C'),
      paragraph(`تم تفعيل خطة <strong>${planLabel}</strong> لديك`),
      paragraph('الآن يمكنك الاستمتاع بجميع مميزات الخطة المميزة', true),
      primaryButton(`${getFrontendBaseUrl()}/dashboard`, 'الذهاب إلى لوحة التحكم'),
    ].join(''),
  });
};

export const trialExpiryWarningHtml = (name: string, daysLeft: number): string =>
  renderEmailShell({
    title: 'تنبيه انتهاء التجربة المجانية',
    preheader: `تبقى ${daysLeft} يوم على تجربتك المجانية`,
    bodyHtml: [
      heading('تنبيه مهم', '#B45309'),
      paragraph(`مرحباً ${escapeHtml(name)}،`),
      paragraph(
        `نذكرك أن فترة التجربة المجانية ستنتهي خلال <strong>${daysLeft} أيام</strong>`
      ),
      paragraph('لمشتركتك المميزة بـ 9.99$/شهر، ستحصل على:', true),
      listItems([
        'جميع المستويات (1-7)',
        'محادثات غير محدودة مع الذكاء الاصطناعي',
        'تمارين الظل (Shadowing)',
        'الشهادة النهائية',
      ]),
      primaryButton(`${getFrontendBaseUrl()}/subscribe`, 'اشترك الآن وحصل على شهر مجاني!'),
    ].join(''),
  });

export const invitationEmailHtml = (
  email: string,
  invitationLink: string,
  expiresAt: Date,
  access: 'MOAJAM' | 'KIDS' | 'BOTH' = 'MOAJAM'
): string => {
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

  return renderEmailShell({
    title: 'دعوة للانضمام إلى معجَم',
    preheader: 'تمت دعوتك لإنشاء حساب على معجَم',
    bodyHtml: [
      heading('دعوة للانضمام إلى معجَم'),
      paragraph(`تمت دعوتك لإنشاء حساب على: <strong>${accessLabel}</strong>.`),
      paragraph(
        `اضغط الزر أدناه لإكمال التسجيل باستخدام هذا البريد: <strong dir="ltr">${escapeHtml(email)}</strong>`
      ),
      primaryButton(invitationLink, 'إنشاء حسابي'),
      paragraph(`الدعوة صالحة حتى ${expiresLabel} ويمكن استخدامها مرة واحدة فقط.`, true),
      `<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#94A3B8;word-break:break-all;direction:ltr;text-align:center;">إذا لم يعمل الزر، انسخ الرابط:<br/>${escapeHtml(invitationLink)}</p>`,
    ].join(''),
  });
};

export const parentProgressInviteEmailHtml = (
  childEmail: string,
  childName?: string
): string => {
  const frontendUrl = getFrontendBaseUrl();
  const parentLink = `${frontendUrl}/kids/parent`;
  const loginLink = `${frontendUrl}/login`;
  const label = escapeHtml(childName || childEmail);

  return renderEmailShell({
    title: 'متابعة تقدّم طفلك — معجَم',
    preheader: 'تم ربط بريدك كوليّ أمر — معجم الصغار',
    bodyHtml: [
      heading('متابعة تقدّم طفلك'),
      paragraph(
        `تم ربط بريدك كوليّ أمر لحساب الطفل المرتبط بـ <strong dir="ltr">${label}</strong> في معجم الصغار.`
      ),
      paragraph(
        'سجّل الدخول بنفس هذا البريد (أو أنشئ حساباً بدعوة إن لزم) ثم افتح لوحة الوالدين لعرض التقدّم.'
      ),
      primaryButton(loginLink, 'تسجيل الدخول'),
      `<p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#64748B;word-break:break-all;direction:ltr;text-align:center;">لوحة الوالدين: <a href="${parentLink}" style="color:#24408E;text-decoration:none;">${escapeHtml(parentLink)}</a></p>`,
    ].join(''),
  });
};

/** Wrap admin broadcast title/body in the shared shell (keeps subject = title). */
export const broadcastEmailHtml = (title: string, body: string, actionUrl?: string): string =>
  renderEmailShell({
    title,
    preheader: title,
    bodyHtml: [
      heading(escapeHtml(title)),
      paragraph(escapeHtml(body).replace(/\n/g, '<br/>')),
      actionUrl ? primaryButton(actionUrl, 'عرض التفاصيل') : '',
    ].join(''),
  });

import prisma from '../config/database';
import { uploadFile } from './storage';
import { notify } from './notification.service';
import puppeteer from 'puppeteer';
import crypto from 'crypto';

function generateVerifyCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g., "A3F2B8C1"
}

export async function generateCertificate(userId: string): Promise<string> {
  // Check if user has completed all 7 levels
  const completions = await prisma.userLevelCompletion.count({
    where: { userId, completed: true },
  });

  if (completions < 7) {
    throw new Error('User has not completed all levels');
  }

  // Check if certificate already exists
  const existing = await prisma.certificate.findUnique({ where: { userId } });
  if (existing) {
    return existing.verifyCode;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const verifyCode = generateVerifyCode();
  const issuedDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate HTML for certificate
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Tajawal', sans-serif;
      width: 1200px;
      height: 850px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .certificate {
      width: 1100px;
      height: 800px;
      background: white;
      border: 20px solid #667eea;
      border-radius: 20px;
      padding: 60px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .logo {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    
    .title {
      font-size: 56px;
      font-weight: bold;
      color: #333;
      margin-bottom: 20px;
    }
    
    .subtitle {
      font-size: 28px;
      color: #666;
      margin-bottom: 50px;
    }
    
    .content {
      text-align: center;
      margin: 60px 0;
    }
    
    .recipient {
      font-size: 32px;
      color: #666;
      margin-bottom: 20px;
    }
    
    .name {
      font-size: 64px;
      font-weight: bold;
      color: #667eea;
      margin: 30px 0;
      text-decoration: underline;
      text-decoration-color: #764ba2;
    }
    
    .achievement {
      font-size: 28px;
      color: #333;
      line-height: 1.8;
      margin: 40px 0;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 80px;
      padding-top: 30px;
      border-top: 3px solid #667eea;
    }
    
    .date, .verify {
      font-size: 20px;
      color: #666;
    }
    
    .verify-code {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
      margin-top: 5px;
    }
    
    .seal {
      position: absolute;
      bottom: 40px;
      left: 80px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 48px;
      font-weight: bold;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">📚 مُعْجَم</div>
      <div class="title">شهادة إتمام</div>
      <div class="subtitle">Certificate of Completion</div>
    </div>
    
    <div class="content">
      <div class="recipient">هذه الشهادة تُمنح إلى</div>
      <div class="name">${user.name}</div>
      <div class="achievement">
        لإتمامه بنجاح جميع المستويات السبعة<br>
        في منصة مُعْجَم لتعلم اللغة الإنجليزية<br>
        وإتقانه 175 جملة أساسية
      </div>
    </div>
    
    <div class="footer">
      <div class="date">
        <div>تاريخ الإصدار</div>
        <div class="verify-code">${issuedDate}</div>
      </div>
      <div class="verify">
        <div>رمز التحقق</div>
        <div class="verify-code">${verifyCode}</div>
      </div>
    </div>
    
    <div class="seal">✓</div>
  </div>
</body>
</html>
  `;

  // Generate PDF using Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 1200, height: 850 });

  const pdfBuffer = await page.pdf({
    width: '1200px',
    height: '850px',
    printBackground: true,
  });

  await browser.close();

  // Upload to MinIO
  const pdfUrl = await uploadFile(
    'certificates',
    pdfBuffer,
    `certificate-${userId}-${Date.now()}.pdf`,
    'application/pdf'
  );

  // Save certificate record
  await prisma.certificate.create({
    data: {
      userId,
      verifyCode,
      pdfUrl,
    },
  });

  // Send notification
  await notify.certificateReady(userId);

  return verifyCode;
}

export async function getCertificate(userId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  if (!certificate) {
    throw new Error('Certificate not found');
  }

  return certificate;
}

export async function verifyCertificate(verifyCode: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { verifyCode },
    include: {
      user: {
        select: { name: true, currentLevel: true },
      },
    },
  });

  if (!certificate) {
    return null;
  }

  return {
    valid: true,
    userName: certificate.user.name,
    issuedAt: certificate.issuedAt,
    verifyCode: certificate.verifyCode,
  };
}

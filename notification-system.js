const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');

// Initialize Telegram Bot
const telegramBot = process.env.TELEGRAM_BOT_TOKEN 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
  : null;

// Initialize Email Transporter
const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  : null;

/**
 * Send notification via Telegram and Email
 * @param {string} postId - Facebook post ID
 * @param {string} pageName - Facebook page name
 * @param {string} message - Custom message (optional)
 */
async function sendNotification(postId, pageName = "IT-Solutions", message = null) {
  const postUrl = `https://www.facebook.com/${postId}`;
  const notificationMessage = message || `✅ تم نشر بوست جديد على صفحة ${pageName}!\n\n🔗 الرابط: ${postUrl}\n\nشاركه دلوقتي في الجروبات يدويًا 🚀`;

  // Send to Telegram
  if (telegramBot && process.env.TELEGRAM_CHAT_ID) {
    try {
      await telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, notificationMessage, { 
        disable_web_page_preview: true,
        parse_mode: 'HTML'
      });
      console.log('✅ Telegram notification sent!');
    } catch (err) {
      console.error('❌ Telegram error:', err.message);
    }
  }

  // Send to Email
  if (transporter && process.env.EMAIL_USER) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background: #0a0a0a; padding: 20px; border-radius: 10px;">
          <h2 style="color: #00d0ff; margin-top: 0;">🚀 تم نشر بوست جديد!</h2>
          <p style="color: #888; font-size: 14px;"><strong>الصفحة:</strong> ${pageName}</p>
          <p style="margin: 20px 0;">
            <a href="${postUrl}" style="display: inline-block; background: #1877f2; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">👉 اضغط هنا لفتح البوست</a>
          </p>
          <p style="color: #888; font-size: 12px; margin-bottom: 0;">شاركه في الجروبات دلوقتي! 📤</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `🔔 بوست جديد على ${pageName}`,
        html: htmlContent
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email notification sent!');
    } catch (err) {
      console.error('❌ Email error:', err.message);
    }
  }
}

/**
 * Send test notification
 */
async function sendTestNotification() {
  const testMessage = `🧪 اختبار نظام الإشعارات!\n\n✅ Telegram متصل\n✅ Gmail متصل\n\nالنظام يعمل بكفاءة! 🚀`;
  
  if (telegramBot && process.env.TELEGRAM_CHAT_ID) {
    try {
      await telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, testMessage, { 
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    } catch (err) {
      console.error('❌ Telegram test error:', err.message);
    }
  }

  if (transporter && process.env.EMAIL_USER) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: center; background: linear-gradient(135deg, #1a1a1a, #0a0a0a); padding: 30px; border-radius: 10px; border: 2px solid #00ffd5;">
          <h1 style="color: #00d0ff; margin-top: 0;">🧪 اختبار النظام</h1>
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #00ffd5; font-size: 18px; margin: 10px 0;"><strong>✅ Telegram متصل</strong></p>
            <p style="color: #00ffd5; font-size: 18px; margin: 10px 0;"><strong>✅ Gmail متصل</strong></p>
          </div>
          <p style="color: #888; font-size: 14px; margin-bottom: 0;">النظام يعمل بكفاءة عالية! 🚀</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: '🧪 اختبار نظام الإشعارات',
        html: htmlContent
      });
    } catch (err) {
      console.error('❌ Email test error:', err.message);
    }
  }
}

module.exports = {
  sendNotification,
  sendTestNotification
};

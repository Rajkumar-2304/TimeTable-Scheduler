require('dotenv').config();
const nodemailer = require('nodemailer');
async function test() {
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false }
  });
  try { await t.verify(); console.log('OK'); } catch(e) { console.error('FAIL', e); }
}
test();

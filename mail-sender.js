const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, text, attachmentPath) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    attachments: attachmentPath ? [{
      path: attachmentPath
    }] : []
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
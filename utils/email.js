const nodemailer = require("nodemailer");

const sendMail = async (option) => {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  var message = {
    from: `'NESTME' <${process.env.EMAIL_USER}>`,
    to: option.mailto,
    subject: option.subject,
    text: option.emailMessage,
  };

  if (option.html) {
    message.html = option.html;
  }

  if (option.attachment) {
    message.attachment = option.attachment;
  }

  await transporter.sendMail(message);
};

module.exports = sendMail;

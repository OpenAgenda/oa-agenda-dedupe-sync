'use strict';

const nodemailer = require('nodemailer');

module.exports = async (mailgun, to, report) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.mailgun.org",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: mailgun,
    maxMessages: Infinity,
    maxConnections: 1
  });

  await transporter.sendMail({
    from: 'admin@openagenda.com',
    to,
    subject: 'Rapport de script de copie et de dédoublonnage de lieux',
    text: ['Heure d\'execution:' + JSON.stringify(new Date()), 'Ouvrir la pièce jointe avec MS Excel ou LibreOffice'].join('\n'),
    attachments: [{
      filename: 'report.csv',
      content: new Buffer(report,'utf-8')
    }]
  });
}

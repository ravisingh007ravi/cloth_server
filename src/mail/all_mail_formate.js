// config/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure:true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"E-Shop" <noreply@eshop.com>',
            to,
            subject,
            text: text || '',
            html: html || '',
        });
        return info;
    } catch (error) {
        console.error('Email sending error:', error);
        throw error;
    }
};

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOTPEmailTemplate = async(name,email, otp) => {
    try {
  const info = await transporter.sendMail({
    from: '"Example Team" <team@example.com>', // sender address
    to: email, // list of recipients
    subject: "Hello", // subject line
    text: "Hello world?", // plain text body
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to E-Shop!</h2>
            <p>Hello ${name},</p>
            <p>Your OTP for verification is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
                ${otp}
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <br>
            <p>Best regards,<br>E-Shop Team</p>
        </div>`
  });

  console.log("Message sent: %s", info.messageId);
} catch (err) {
  console.error("Error while sending mail:", err);
}
};


 

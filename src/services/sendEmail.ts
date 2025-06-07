import nodemailer, { Transporter } from "nodemailer";
import "dotenv/config";

const transporter: Transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // Replace with your SMTP server
  port: 587, // Typically 587 or 465 for secure SMTP
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your email username
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

// The mailService with sendEmail function
interface EmailOptions {
  emailFrom: string;
  emailTo: string;
  emailSubject: string;
  emailText: string;
}

const mailService = {
  async sendEmail({
    emailFrom,
    emailTo,
    emailSubject,
    emailText,
  }: EmailOptions): Promise<boolean|null> {
    const mailOptions = {
      from: emailFrom,
      to: emailTo,
      subject: emailSubject,
      text: emailText,
    };

    await transporter.sendMail(mailOptions);
    return true;
  },
};

export default mailService;

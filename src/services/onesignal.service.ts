import axios from "axios";
import { injectable } from "inversify";

@injectable()
export class OneSignalService {
  private readonly APP_ID = process.env.ONESIGNAL_APP_ID || "";
  private readonly REST_API_KEY = process.env.ONESIGNAL_API_KEY || "";
  private readonly BASE_URL = "https://onesignal.com/api/v1/notifications";

  async sendEmail(toEmail: string, subject: string, bodyHtml: string): Promise<boolean> {
    if (!this.APP_ID || !this.REST_API_KEY) {
      console.warn("OneSignal credentials missing, skipping email sending.");
      return false;
    }

    try {
      const payload = {
        app_id: this.APP_ID,
        include_email_tokens: [toEmail],
        email_subject: subject,
        email_body: bodyHtml,
      };

      const response = await axios.post(this.BASE_URL, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.REST_API_KEY}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error("Error sending OneSignal email:", error);
      return false;
    }
  }

  async sendMagicLink(toEmail: string, resetToken: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const magicLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
    
    const subject = "Reset Your Password - HLS";
    const bodyHtml = `
      <h2>Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the link below to securely log in and change your password.</p>
      <p><a href="${magicLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>Alternatively, you can copy and paste this link in your browser: <br/>${magicLink}</p>
    `;

    return this.sendEmail(toEmail, subject, bodyHtml);
  }
}

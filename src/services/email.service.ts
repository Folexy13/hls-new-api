import { injectable } from "inversify";
import { Resend } from "resend";
import axios from "axios";
import { config } from "../config/config";

@injectable()
export class EmailService {
  private resend: Resend;
  private readonly fromEmail = config.email.from || "admin@hlsnigeria.com";

  // Additional fallback API Keys
  private readonly ONE_SIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "";
  private readonly ONE_SIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || "";
  
  // Could add variables for Mailgun / Mailtrap here
  private readonly MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || "";
  private readonly MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "";

  constructor() {
    // Default to the provided resend key if none provided in env
    const resendKey = process.env.RESEND_API_KEY || "";
    this.resend = new Resend(resendKey);
  }

  /**
   * Sends an email, attempting Resend first, then falling back to other providers
   */
  async sendEmail(toEmail: string, subject: string, htmlBody: string): Promise<boolean> {
    console.log(`[EmailService] Attempting to send email to ${toEmail}`);
    
    // 1. Try Resend
    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: subject,
        html: htmlBody,
      });

      if (response.data) {
        console.log("[EmailService] Successfully sent via Resend", response.data.id);
        return true;
      }
      
      console.warn("[EmailService] Resend returned no data but no error either. Falling back.");
    } catch (error) {
      console.error("[EmailService] Failed to send via Resend:", error);
    }

    // 2. Fallback to OneSignal
    console.log("[EmailService] Falling back to OneSignal");
    if (await this.sendViaOneSignal(toEmail, subject, htmlBody)) {
      return true;
    }

    // 3. Fallback to Mailgun
    console.log("[EmailService] Falling back to Mailgun");
    if (await this.sendViaMailgun(toEmail, subject, htmlBody)) {
      return true;
    }

    console.error("[EmailService] All email providers failed.");
    return false;
  }

  private async sendViaOneSignal(toEmail: string, subject: string, htmlBody: string): Promise<boolean> {
    if (!this.ONE_SIGNAL_APP_ID || !this.ONE_SIGNAL_API_KEY) {
      console.warn("OneSignal credentials missing, skipping OneSignal fallback.");
      return false;
    }

    try {
      const payload = {
        app_id: this.ONE_SIGNAL_APP_ID,
        include_email_tokens: [toEmail],
        email_subject: subject,
        email_body: htmlBody,
      };

      const response = await axios.post("https://onesignal.com/api/v1/notifications", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.ONE_SIGNAL_API_KEY}`,
        },
      });

      if (response.status === 200) {
        console.log("[EmailService] Successfully sent via OneSignal");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error sending OneSignal email:", error);
      return false;
    }
  }

  private async sendViaMailgun(toEmail: string, subject: string, htmlBody: string): Promise<boolean> {
    if (!this.MAILGUN_API_KEY || !this.MAILGUN_DOMAIN) {
      console.warn("Mailgun credentials missing, skipping Mailgun fallback.");
      return false;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("from", this.fromEmail);
      formData.append("to", toEmail);
      formData.append("subject", subject);
      formData.append("html", htmlBody);

      const auth = Buffer.from(`api:${this.MAILGUN_API_KEY}`).toString("base64");

      const response = await axios.post(
        `https://api.mailgun.net/v3/${this.MAILGUN_DOMAIN}/messages`,
        formData,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.status === 200) {
        console.log("[EmailService] Successfully sent via Mailgun");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error sending Mailgun email:", error);
      return false;
    }
  }

  /**
   * Generates a generic nice HTML template for admin notifications
   */
  private getAdminEmailTemplate(title: string, details: {label: string, value: any}[]): string {
    const detailsHtml = details
      .filter(d => d.value !== undefined && d.value !== null && d.value !== "")
      .map(d => `<p style="margin: 10px 0; padding: 10px; border-bottom: 1px solid #eee;"><strong style="color: #555; display: inline-block; width: 150px;">${d.label}:</strong> <span style="color: #333;">${d.value}</span></p>`)
      .join("");

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; color: #333; background-color: #f4f7f6; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0056b3; margin: 0; padding-bottom: 10px; border-bottom: 2px solid #0056b3;">${title}</h2>
        </div>
        <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          ${detailsHtml}
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
          <p>This is an automated notification from the HLS Nigeria system.</p>
          <p>&copy; ${new Date().getFullYear()} HLS Nigeria.</p>
        </div>
      </div>
    `;
  }

  /**
   * Sends an admin notification email using the standardized template
   */
  async notifyAdmin(subject: string, title: string, details: {label: string, value: any}[]): Promise<boolean> {
    const htmlBody = this.getAdminEmailTemplate(title, details);
    return this.sendEmail("admin@hlsnigeria.com", subject, htmlBody);
  }

  async notifyRecipient(toEmail: string, subject: string, title: string, details: {label: string, value: any}[]): Promise<boolean> {
    const htmlBody = this.getAdminEmailTemplate(title, details);
    return this.sendEmail(toEmail, subject, htmlBody);
  }

  /**
   * Magic Link template for Forgot Password / Reset Password
   */
  async sendMagicLink(toEmail: string, resetToken: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const magicLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
    
    const subject = "Reset Your Password - HLS";
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #007bff; text-align: center;">Reset Your Password</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the secure magic link below to instantly log in and set your new password.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Reset Password Securely
          </a>
        </div>
        
        <p style="font-size: 14px; color: #555;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${magicLink}" style="color: #007bff;">${magicLink}</a>
        </p>
      </div>
    `;

    return this.sendEmail(toEmail, subject, bodyHtml);
  }
}

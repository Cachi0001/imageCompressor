import nodemailer from 'nodemailer';
import { ConfigurationManager } from './ConfigurationManager';

export class NotificationService {
  private transporter: nodemailer.Transporter;
  private config: ConfigurationManager;
  private adminEmail: string;

  constructor(config: ConfigurationManager) {
    this.config = config;
    const emailConfig = this.config.getEmailConfig();
    
    this.adminEmail = emailConfig.adminEmail || emailConfig.user; // Default to sender if admin not specified

    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.port === 465, // true for 465, false for other ports
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });
  }

  public async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.getEmailConfig().from || 'Image Optimizer'}" <${this.config.getEmailConfig().user}>`,
        to,
        subject,
        html,
      });
      console.log('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw, just log. Notification failure shouldn't stop the pipeline unless critical.
    }
  }

  public async sendAlert(subject: string, error: Error | string, context?: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : '';
    
    const html = `
      <h2>System Alert: ${subject}</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p><strong>Error:</strong> ${errorMessage}</p>
      ${stack ? `<pre>${stack}</pre>` : ''}
      ${context ? `<h3>Context:</h3><pre>${JSON.stringify(context, null, 2)}</pre>` : ''}
    `;

    await this.sendEmail(this.adminEmail, `[ALERT] ${subject}`, html);
  }

  public async sendLimitAlert(provider: string, usage: number, limit: number): Promise<void> {
    const usagePercent = (usage / limit) * 100;
    const subject = `Service Limit Warning: ${provider}`;
    const html = `
      <h2>Service Limit Warning</h2>
      <p>The <strong>${provider}</strong> service is approaching its usage limit.</p>
      <ul>
        <li><strong>Current Usage:</strong> ${usage} / ${limit}</li>
        <li><strong>Percentage:</strong> ${usagePercent.toFixed(2)}%</li>
      </ul>
      <p>Please take action to avoid service interruption.</p>
    `;

    await this.sendEmail(this.adminEmail, subject, html);
  }
}

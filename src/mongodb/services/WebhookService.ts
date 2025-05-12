// src/mongodb/services/WebhookService.ts
import axios from 'axios';
import crypto from 'crypto';

// Get webhook URL from env or use default
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/database-event';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-secret-change-me';

export default class WebhookService {
  /**
   * Send a webhook notification for a badge mint event
   */
  static async sendBadgeMintEvent(address: string, data: any): Promise<void> {
    try {
      await this.sendWebhook('badge-mint', [address], data);
    } catch (error) {
      console.error('Error sending badge mint webhook:', error);
    }
  }
  
  /**
   * Send a webhook notification for a checkin event
   */
  static async sendCheckinEvent(address: string, data: any): Promise<void> {
    try {
      await this.sendWebhook('checkin', [address], data);
    } catch (error) {
      console.error('Error sending checkin webhook:', error);
    }
  }
  
  /**
   * Send a webhook notification for a referral event
   */
  static async sendReferralEvent(referrer: string, referee: string, data: any): Promise<void> {
    try {
      await this.sendWebhook('referral', [referrer, referee], data);
    } catch (error) {
      console.error('Error sending referral webhook:', error);
    }
  }
  
  /**
   * Send a webhook notification for a username event
   */
  static async sendUsernameEvent(address: string, data: any): Promise<void> {
    try {
      await this.sendWebhook('username-change', [address], data);
    } catch (error) {
      console.error('Error sending username webhook:', error);
    }
  }
  
  /**
   * Generate signature for webhook payload
   */
  private static generateSignature(payload: string): string {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    return hmac.update(payload).digest('hex');
  }
  
  /**
   * Send webhook with authentication
   */
  private static async sendWebhook(
    eventType: string, 
    addresses: string[], 
    data: any
  ): Promise<void> {
    // Skip if no webhook URL is configured
    if (!WEBHOOK_URL || WEBHOOK_URL === 'http://localhost:3000/api/webhooks/database-event') {
      return;
    }
    
    const payload = {
      eventType,
      addresses,
      data,
      timestamp: new Date().toISOString()
    };
    
    const stringifiedPayload = JSON.stringify(payload);
    const signature = this.generateSignature(stringifiedPayload);
    
    try {
      await axios.post(WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        timeout: 5000 // 5 second timeout
      });
    } catch (error) {
      // Log error but don't throw to prevent blocking the main operation
      console.error('Error sending webhook:', error);
    }
  }
}
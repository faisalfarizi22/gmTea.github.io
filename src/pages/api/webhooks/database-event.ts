// src/pages/api/webhooks/database-event.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { emitUserUpdate, emitGlobalUpdate } from '../socket';
import crypto from 'crypto';

// Secret key to authenticate webhook calls
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-secret-change-me';

/**
 * Verify webhook signature
 */
function verifySignature(signature: string, body: string): boolean {
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const expectedSignature = hmac.update(body).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get raw body string for signature verification
  const rawBody = JSON.stringify(req.body);
  
  // Validate webhook signature
  const signature = req.headers['x-webhook-signature'] as string;
  if (!signature || !verifySignature(signature, rawBody)) {
    console.warn('Invalid webhook signature detected');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { eventType, addresses, data } = req.body;

    if (!eventType || !data) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Handle different event types
    switch (eventType) {
      case 'checkin':
        // Notify the user who checked in
        if (addresses && addresses.length > 0) {
          addresses.forEach((address: string) => {
            emitUserUpdate(address, 'new-checkin', data);
          });
        }
        
        // Also notify all clients for leaderboard updates
        emitGlobalUpdate('new-checkin', {
          address: data.address,
          timestamp: data.blockTimestamp,
          checkinNumber: data.checkinNumber
        });
        break;

      case 'badge-mint':
        // Notify the user who minted a badge
        if (addresses && addresses.length > 0) {
          addresses.forEach((address: string) => {
            emitUserUpdate(address, 'new-badge', data);
          });
        }
        
        // Global notification for badge mint
        emitGlobalUpdate('new-badge', {
          address: data.owner,
          tier: data.tier,
          timestamp: data.mintedAt
        });
        break;

      case 'referral':
        // Notify both referrer and referee
        if (addresses && addresses.length > 0) {
          addresses.forEach((address: string) => {
            emitUserUpdate(address, 'new-referral', data);
          });
        }
        break;

      case 'username-change':
        // Notify the user who changed their username
        if (addresses && addresses.length > 0) {
          addresses.forEach((address: string) => {
            emitUserUpdate(address, 'username-update', data);
          });
        }
        
        // Global notification for username changes
        emitGlobalUpdate('username-update', {
          address: data.address,
          username: data.username
        });
        break;

      default:
        console.warn(`Unknown event type: ${eventType}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
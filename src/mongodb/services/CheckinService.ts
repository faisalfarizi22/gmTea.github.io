// src/mongodb/services/CheckinService.ts
import dbConnect from '../connection';
import Checkin from '../models/Checkin';
import User from '../models/User';
import PointsHistory from '../models/PointsHistory';
import WebhookService from './WebhookService';

export default class CheckinService {
  /**
   * Get all checkins for a user
   */
  static async getUserCheckins(
    address: string, 
    limit: number = 20, 
    skip: number = 0
  ) {
    await dbConnect();
    
    return Checkin.find({ address: address.toLowerCase() })
      .sort({ blockTimestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);
  }

  /**
   * Get latest checkins for all users
   */
  static async getLatestCheckins(limit: number = 20, skip: number = 0) {
    await dbConnect();
    
    // Find checkins and join with user collection to get usernames
    const checkins = await Checkin.aggregate([
      { $sort: { blockTimestamp: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Join with users collection to get usernames
      {
        $lookup: {
          from: 'users',
          let: { userAddress: '$address' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$address', '$$userAddress'] }
              }
            },
            {
              $project: {
                username: 1,
                _id: 0
              }
            }
          ],
          as: 'user'
        }
      },
      // Convert user array to single object (or null)
      {
        $addFields: {
          user: { $arrayElemAt: ['$user', 0] }
        }
      }
    ]);
    
    return checkins;
  }

  /**
   * Save a new checkin from blockchain data
   */
  static async saveCheckin(checkinData: {
    address: string;
    checkinNumber: number;
    blockNumber: number;
    blockTimestamp: Date;
    transactionHash: string;
    points: number;
    boost: number;
    message?: string; // Add message field
  }) {
    await dbConnect();
    
    const address = checkinData.address.toLowerCase();
    
    // Check if this checkin already exists
    const existing = await Checkin.findOne({ 
      transactionHash: checkinData.transactionHash 
    });
    
    if (existing) {
      return existing;
    }
    
    // Create the checkin
    const checkin = await Checkin.create({
      ...checkinData,
      address,
      message: checkinData.message || '' // Ensure message is included
    });
    
    // Update user data
    await User.findOneAndUpdate(
      { address },
      { 
        $inc: { checkinCount: 1, points: checkinData.points },
        $set: { lastCheckin: checkinData.blockTimestamp }
      },
      { upsert: true }
    );
    
    // Record points history
    await PointsHistory.create({
      address,
      points: checkinData.points,
      reason: `Check-in #${checkinData.checkinNumber}`,
      source: 'checkin',
      timestamp: checkinData.blockTimestamp
    });
    
    // Send webhook event
    await WebhookService.sendCheckinEvent(address, {
      address,
      checkinNumber: checkinData.checkinNumber,
      blockTimestamp: checkinData.blockTimestamp,
      points: checkinData.points,
      transactionHash: checkinData.transactionHash,
      message: checkinData.message || '' // Include message in webhook
    });
    
    return checkin;
  }

  /**
   * Get checkin count for a user
   */
  static async getUserCheckinCount(address: string): Promise<number> {
    await dbConnect();
    
    return Checkin.countDocuments({ address: address.toLowerCase() });
  }

  /**
   * Get total checkin count across all users
   */
  static async getTotalCheckinCount(): Promise<number> {
    await dbConnect();
    
    return Checkin.countDocuments();
  }

  /**
   * Get a user's checkin streak (consecutive days)
   */
  static async getUserCheckinStreak(address: string): Promise<number> {
    await dbConnect();
    
    // Get user's checkins sorted by date (most recent first)
    const checkins = await Checkin.find({ address: address.toLowerCase() })
      .sort({ blockTimestamp: -1 })
      .select('blockTimestamp');
    
    if (checkins.length === 0) return 0;
    
    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Start with the most recent checkin date
    let currentDate = new Date(checkins[0].blockTimestamp);
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Check for consecutive days
    for (let i = 1; i < checkins.length; i++) {
      const prevDate = new Date(checkins[i].blockTimestamp);
      prevDate.setHours(0, 0, 0, 0); // Normalize to start of day
      
      // Check if this checkin was on the previous day
      const expectedPrevDate = new Date(currentDate.getTime() - oneDayMs);
      
      if (prevDate.getTime() === expectedPrevDate.getTime()) {
        streak++;
        currentDate = prevDate;
      } else {
        // Streak broken
        break;
      }
    }
    
    return streak;
  }

  /**
   * Get top checkins (most recent by different users)
   */
  static async getTopCheckins(limit: number = 10): Promise<any[]> {
    await dbConnect();
    
    // Group by address and get most recent checkin for each user
    const topCheckins = await Checkin.aggregate([
      // Sort by timestamp descending
      { $sort: { blockTimestamp: -1 } },
      
      // Group by address and get most recent checkin
      {
        $group: {
          _id: "$address",
          checkinId: { $first: "$_id" },
          checkinNumber: { $first: "$checkinNumber" },
          blockTimestamp: { $first: "$blockTimestamp" },
          transactionHash: { $first: "$transactionHash" },
          points: { $first: "$points" },
          boost: { $first: "$boost" },
          message: { $first: "$message" }
        }
      },
      
      // Sort by timestamp again to get most recent first
      { $sort: { blockTimestamp: -1 } },
      
      // Limit to requested number
      { $limit: limit },
      
      // Join with users to get usernames
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'address',
          as: 'user'
        }
      },
      
      // Reshape for output
      {
        $project: {
          _id: 0,
          address: "$_id",
          checkinNumber: 1,
          blockTimestamp: 1,
          transactionHash: 1,
          points: 1,
          boost: 1,
          message: 1,
          username: { $arrayElemAt: ["$user.username", 0] }
        }
      }
    ]);
    
    return topCheckins;
  }
}
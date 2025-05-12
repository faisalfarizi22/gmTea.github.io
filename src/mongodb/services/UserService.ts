// src/mongodb/services/UserService.ts
import dbConnect from '../connection';
import { docVal } from '../utils/documentHelper';
import User from '../models/User';
type IUser = InstanceType<typeof User>;

export default class UserService {
  /**
   * Get a user by their wallet address
   */
  static async getUserByAddress(address: string): Promise<IUser | null> {
    await dbConnect();
    return User.findOne({ address: address.toLowerCase() });
  }

  /**
   * Get a user by their username
   */
  static async getUserByUsername(username: string): Promise<IUser | null> {
    await dbConnect();
    return User.findOne({ username: username.toLowerCase() });
  }

  /**
   * Create a new user or update if exists
   */
  static async createOrUpdateUser(userData: {
    address: string;
    username?: string | null;
    highestBadgeTier?: number;
    checkinCount?: number;
    points?: number;
    referrer?: string;
    lastCheckin?: Date;
  }): Promise<IUser> {
    await dbConnect();
    
    const address = userData.address.toLowerCase();
    
    // Format username to lowercase if it exists
    const formattedData = {
      ...userData,
      address,
      username: userData.username ? userData.username.toLowerCase() : undefined
    };
    
    // Use findOneAndUpdate with upsert to create if not exists
    return User.findOneAndUpdate(
      { address },
      { $set: formattedData },
      { 
        upsert: true, 
        new: true, // Return the updated document
        runValidators: true // Validate the update against the schema
      }
    );
  }

  /**
   * Increment user's check-in count
   */
  static async incrementCheckinCount(address: string, points: number): Promise<IUser | null> {
    await dbConnect();
    return User.findOneAndUpdate(
      { address: address.toLowerCase() },
      { 
        $inc: { checkinCount: 1, points },
        $set: { lastCheckin: new Date() }
      },
      { new: true }
    );
  }

  /**
   * Update user's highest badge tier
   */
  static async updateHighestBadgeTier(address: string, tier: number): Promise<IUser | null> {
    await dbConnect();
    return User.findOneAndUpdate(
      { 
        address: address.toLowerCase(),
        $or: [
          { highestBadgeTier: { $lt: tier } },
          { highestBadgeTier: -1 }
        ]
      },
      { $set: { highestBadgeTier: tier } },
      { new: true }
    );
  }
  
  /**
   * Get top users by points (leaderboard)
   */
  static async getLeaderboard(limit: number = 10, skip: number = 0): Promise<IUser[]> {
    await dbConnect();
    return User.find()
      .sort({ points: -1 })
      .skip(skip)
      .limit(limit);
  }
  
  /**
   * Get user count
   */
  static async getUserCount(p0: { hasBadge: boolean | undefined; hasUsername: boolean | undefined; search: string | undefined; }): Promise<number> {
    await dbConnect();
    return User.countDocuments();
  }
  
  /**
   * Get user rank based on points
   */
  static async getUserRank(address: string): Promise<number> {
    await dbConnect();
    
    const user = await User.findOne({ address: address.toLowerCase() });
    if (!user) return 0;
    
    // Count users with more points than this user
    const usersWithMorePoints = await User.countDocuments({
      points: { $gt: docVal(user, 'points', 0) }
    });
    
    // Rank is 1-based, so add 1 to the count
    return usersWithMorePoints + 1;
  }

  /**
   * Get highest badge tier for a user
   */
  static async getHighestBadgeTier(address: string): Promise<number> {
    await dbConnect();
    
    const user = await User.findOne({ address: address.toLowerCase() });
    return docVal(user, 'highestBadgeTier', -1);
  }
  
  /**
   * Update user's checkin count
   */
  static async updateCheckinCount(address: string, count: number): Promise<void> {
    await dbConnect();
    
    await User.updateOne(
      { address: address.toLowerCase() },
      { $set: { checkinCount: count } }
    );
  }
  
  /**
   * Get users with filters
   */
  static async getUsers({
    hasBadge,
    hasUsername,
    search,
    limit = 20,
    skip = 0
  }: {
    hasBadge?: boolean;
    hasUsername?: boolean;
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    await dbConnect();
    
    // Build filter
    const filter: any = {};
    
    if (hasBadge) {
      filter.highestBadgeTier = { $gte: 0 };
    }
    
    if (hasUsername) {
      filter.username = { $exists: true, $ne: null };
    }
    
    if (search) {
      if (search.startsWith('0x')) {
        // Search by address
        filter.address = { $regex: search, $options: 'i' };
      } else {
        // Search by username
        filter.username = { $regex: search, $options: 'i' };
      }
    }
    
    return User.find(filter)
      .sort({ points: -1 }) // Sort by points descending
      .skip(skip)
      .limit(limit);
  }
  
}
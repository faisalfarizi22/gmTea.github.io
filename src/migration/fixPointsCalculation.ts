// src/migration/fixPointsCalculation.ts
/**
 * Migration script to fix points calculation in the database
 * This script will:
 * 1. Go through all checkin records and make sure the tierAtCheckin field is correctly set
 * 2. Recalculate points for all checkins based on the tier at the time of the checkin
 * 3. Update the points field in the Checkin collection
 * 4. Update the points field in the PointsHistory collection for checkin entries
 * 5. Recalculate total points for all users
 */

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './dbUtils';
import User from '../mongodb/models/User';
import Badge from '../mongodb/models/Badge';
import Checkin from '../mongodb/models/Checkin';
import PointsHistory from '../mongodb/models/PointsHistory';
import { getCheckInBoost } from '../utils/pointCalculation';

// Main migration function
async function migratePoints() {
  console.log('Starting points calculation migration...');
  
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);
    
    // Process each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`Processing user ${i + 1}/${users.length}: ${user.address}`);
      
      await fixUserPointsCalculation(user.address);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Disconnect from MongoDB
    await disconnectDB();
  }
}

// Fix points calculation for a single user
async function fixUserPointsCalculation(address: string) {
  try {
    // Normalize address
    const normalizedAddress = address.toLowerCase();
    
    // Get all badges for this user sorted by mintedAt date
    const badges = await Badge.find({ owner: normalizedAddress })
      .sort({ mintedAt: 1 });
    
    // Create a timeline of badge tier changes
    const tierTimeline: { date: Date; tier: number }[] = [];
    
    // Start with no badge (-1)
    tierTimeline.push({ date: new Date(0), tier: -1 });
    
    // Add each badge mint event
    badges.forEach(badge => {
      // Only add if it's a higher tier than the previous one
      const prevTier = tierTimeline[tierTimeline.length - 1].tier;
      if (badge.tier > prevTier) {
        tierTimeline.push({ date: badge.mintedAt, tier: badge.tier });
      }
    });
    
    // Get all checkins for this user sorted by date
    const checkinRecords = await Checkin.find({ address: normalizedAddress })
      .sort({ blockTimestamp: 1 });
    
    // Track total points for this user
    let totalPoints = 0;
    
    // Process each checkin
    for (const checkin of checkinRecords) {
      // Find the badge tier at the time of checkin
      let tierAtCheckin = -1;
      for (let i = tierTimeline.length - 1; i >= 0; i--) {
        if (checkin.blockTimestamp >= tierTimeline[i].date) {
          tierAtCheckin = tierTimeline[i].tier;
          break;
        }
      }
      
      // Calculate points with the correct boost
      const boost = getCheckInBoost(tierAtCheckin);
      const basePoints = 10; // Base points for each checkin
      const points = Math.floor(basePoints * boost);
      
      // Update checkin record with correct tier and points
      await Checkin.updateOne(
        { _id: checkin._id },
        { 
          $set: { 
            tierAtCheckin, 
            boost,
            points 
          } 
        }
      );
      
      // Update corresponding points history entry
      await PointsHistory.updateOne(
        { 
          address: normalizedAddress,
          source: 'checkin',
          reason: `Check-in #${checkin.checkinNumber}`
        },
        {
          $set: {
            tierAtEvent: tierAtCheckin,
            points
          }
        }
      );
      
      // Add to total
      totalPoints += points;
    }
    
    // Get badge points
    let badgePoints = 0;
    const highestBadge = await Badge.findOne({ owner: normalizedAddress })
      .sort({ tier: -1 })
      .limit(1);
      
    if (highestBadge) {
      const tierPoints = [20, 30, 50, 70, 100]; // Updated badge points values
      badgePoints = highestBadge.tier >= 0 && highestBadge.tier < tierPoints.length 
        ? tierPoints[highestBadge.tier] 
        : 0;
    }
    
    // Add badge points to total
    totalPoints += badgePoints;
    
    // Get points from other sources (achievements, referrals)
    const otherPointsHistory = await PointsHistory.find({
      address: normalizedAddress,
      source: { $ne: 'checkin' }
    });
    
    for (const entry of otherPointsHistory) {
      totalPoints += entry.points;
    }
    
    // Update user's total points
    await User.updateOne(
      { address: normalizedAddress },
      { $set: { points: totalPoints } }
    );
    
    console.log(`Fixed points for ${normalizedAddress}: ${totalPoints}`);
    
    return totalPoints;
  } catch (error) {
    console.error(`Error fixing points for ${address}:`, error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migratePoints()
    .then(() => {
      console.log('Points calculation migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export { migratePoints, fixUserPointsCalculation };
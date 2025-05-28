// src/migration/fixPointsCalculation.ts
/**
 * Migration script to fix points calculation in the database
 * This script will:
 * 1. Go through all checkin records and make sure the tierAtCheckin field is correctly set
 * 2. Recalculate points for all checkins based on the tier at the time of the checkin
 * 3. Update the points field in the Checkin collection
 * 4. Update the points field in the PointsHistory collection for checkin entries
 * 5. Recalculate total points for all users and update them in the User collection
 */

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './dbUtils';
import User from '../mongodb/models/User';
import Badge from '../mongodb/models/Badge';
import Checkin from '../mongodb/models/Checkin';
import PointsHistory from '../mongodb/models/PointsHistory';
import { getCheckInBoost, calculateAchievementPoints } from '../utils/pointCalculation';

// Main migration function
async function migratePoints() {
  console.log('Starting points calculation migration...');
  
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);
    
    // Track migration statistics
    let updatedUsers = 0;
    let totalPointsUpdated = 0;
    
    // Process each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`Processing user ${i + 1}/${users.length}: ${user.address}`);
      
      // Get previous points value for logging
      const previousPoints = user.points || 0;
      
      // Fix points calculation for this user
      const newPoints = await fixUserPointsCalculation(user.address);
      
      // Calculate difference for logging
      const pointsDifference = newPoints - previousPoints;
      if (pointsDifference !== 0) {
        updatedUsers++;
        totalPointsUpdated += Math.abs(pointsDifference);
        console.log(`Points changed from ${previousPoints} to ${newPoints} (${pointsDifference > 0 ? '+' : ''}${pointsDifference})`);
      }
    }
    
    // After updating all users, recompute ranks for consistency
    console.log('\nRecalculating ranks for all users to ensure consistency...');
    await recalculateAllRanks();
    
    console.log('Migration completed successfully');
    console.log(`Updated points for ${updatedUsers} users`);
    console.log(`Total points difference: ${totalPointsUpdated}`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Disconnect from MongoDB
    await disconnectDB();
  }
}

/**
 * Recalculate rankings for all users to ensure consistency
 * This function assigns a rank field to each user document based on their points
 */
async function recalculateAllRanks() {
  try {
    // Get all users sorted by points in descending order
    const sortedUsers = await User.find({})
      .sort({ points: -1, checkinCount: -1, lastCheckin: -1 })
      .lean();
    
    console.log(`Recalculating ranks for ${sortedUsers.length} users...`);
    
    // Track updated users
    let updatedCount = 0;
    
    // Assign rank to each user (1-based)
    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      const rank = i + 1; // 1-based ranking
      
      // Update user with rank field
      const updateResult = await User.updateOne(
        { address: user.address },
        { $set: { rank } }
      );
      
      if (updateResult.modifiedCount > 0) {
        updatedCount++;
      }
    }
    
    console.log(`Updated ranks for ${updatedCount} users`);
    
    // Create indexes on rank field if they don't exist
    await User.collection.createIndex({ rank: 1 });
    await User.collection.createIndex({ points: -1, rank: 1 });
    
    console.log('Rank indexes created/verified');
    
    return updatedCount;
  } catch (error) {
    console.error('Error recalculating ranks:', error);
    throw error;
  }
}

// Fix points calculation for a single user
async function fixUserPointsCalculation(address: string) {
  try {
    // Normalize address
    const normalizedAddress = address.toLowerCase();
    
    console.log(`\n===== DETAILED POINT ANALYSIS FOR ${normalizedAddress} =====`);
    
    // Get all badges for this user sorted by mintedAt date
    const badges = await Badge.find({ owner: normalizedAddress })
      .sort({ mintedAt: 1 });
    
    console.log(`Found ${badges.length} badges for this user`);
    
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
        console.log(`Badge tier ${badge.tier} obtained on ${badge.mintedAt}`);
      }
    });
    
    // Get all checkins for this user sorted by date
    const checkinRecords = await Checkin.find({ address: normalizedAddress })
      .sort({ blockTimestamp: 1 });
    
    console.log(`Found ${checkinRecords.length} check-ins for this user`);
    
    // Track checkin points for this user
    let checkinPoints = 0;
    
    // Process each checkin
    console.log("\nCHECK-IN POINTS BREAKDOWN:");
    console.log("---------------------------");
    console.log("CheckinID | Date | Tier | Boost | Points");
    console.log("---------------------------");
    
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
      
      console.log(`#${checkin.checkinNumber} | ${checkin.blockTimestamp.toISOString().split('T')[0]} | ${tierAtCheckin} | ${boost}x | ${points}`);
      
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
      
      // Add to checkin points
      checkinPoints += points;
    }
    
    console.log(`Total points from check-ins: ${checkinPoints}`);
    
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
      console.log(`\nBADGE POINTS: ${badgePoints} (from highest tier ${highestBadge.tier})`);
    } else {
      console.log("\nBADGE POINTS: 0 (no badges)");
    }
    
    // Get points from other sources (achievements, referrals)
    const otherPointsHistory = await PointsHistory.find({
      address: normalizedAddress,
      source: { $ne: 'checkin' }
    });
    
    // Display all other points for reference
    let referralPoints = 0;
    let oldAchievementPoints = 0;
    console.log("\nOTHER POINTS FROM DATABASE (FOR REFERENCE):");
    console.log("---------------------------");
    console.log("Source | Reason | Points | Counted");
    console.log("---------------------------");
    
    for (const entry of otherPointsHistory) {
      const isReferral = entry.source === 'referral';
      if (isReferral) {
        referralPoints += entry.points;
      } else if (entry.source === 'achievement') {
        oldAchievementPoints += entry.points;
      }
      
      console.log(`${entry.source} | ${entry.reason} | ${entry.points} | ${isReferral ? 'NO' : 'YES'}`);
    }
    
    // Calculate achievement points based on check-in count using the proper function
    const achievementPoints = calculateAchievementPoints(checkinRecords.length);
    
    console.log(`\nACHIEVEMENT POINTS CALCULATION:`);
    console.log(`Check-in count: ${checkinRecords.length}`);
    console.log(`Achievement points from milestones: ${achievementPoints}`);
    console.log(`Old achievement points from DB: ${oldAchievementPoints}`);
    console.log(`Referral points (NOT COUNTED): ${referralPoints}`);
    
    // Calculate total points - Include achievement points but not referrals
    const otherPoints = achievementPoints; // Only count achievement points
    const totalPoints = checkinPoints + badgePoints + otherPoints;
    console.log(`\nTOTAL POINTS BREAKDOWN:`);
    console.log(`Check-in points: ${checkinPoints}`);
    console.log(`Badge points: ${badgePoints}`);
    console.log(`Other points: ${otherPoints}`);
    console.log(`GRAND TOTAL: ${totalPoints}`);
    
    // Also check the current points in the DB for this user
    const currentUser = await User.findOne({ address: normalizedAddress });
    if (currentUser) {
      console.log(`\nCURRENT POINTS IN DATABASE: ${currentUser.points}`);
      if (currentUser.points !== totalPoints) {
        console.log(`DISCREPANCY DETECTED: Database has ${currentUser.points}, calculated ${totalPoints}`);
      } else {
        console.log(`NO DISCREPANCY: Database and calculation match`);
      }
    }
    
    console.log(`\n===== END OF ANALYSIS FOR ${normalizedAddress} =====\n`);
    
    // Update user document with points breakdown for better tracking
    try {
      console.log(`Attempting to update user ${normalizedAddress} in MongoDB...`);
      console.log(`Current points: ${(await User.findOne({ address: normalizedAddress }))?.points || 'unknown'}`);
      console.log(`New calculated points: ${totalPoints}`);
      
      // Force update by using findOneAndUpdate instead of updateOne for better error visibility
      const updateResult = await User.findOneAndUpdate(
        { address: normalizedAddress },
        { 
          $set: { 
            points: totalPoints,
            checkinPoints, // Optional: track points from different sources
            badgePoints,
            otherPoints,
            lastPointsUpdate: new Date()
          },
          $currentDate: { updatedAt: true } // Update the updatedAt timestamp
        },
        { new: true, runValidators: true } // Return the updated document and run validators
      );
      
      if (!updateResult) {
        console.error(`ERROR: User ${normalizedAddress} not found during update!`);
        // Try to directly insert/create if not found
        const newUser = new User({
          address: normalizedAddress,
          points: totalPoints,
          checkinPoints,
          badgePoints, 
          otherPoints,
          lastPointsUpdate: new Date()
        });
        await newUser.save();
        console.log(`Created new user document for ${normalizedAddress}`);
      } else {
        console.log(`User ${normalizedAddress} successfully updated in DB with points: ${updateResult.points}`);
        
        // Double check if points were actually updated
        const verifyUser = await User.findOne({ address: normalizedAddress });
        console.log(`Verification check - user's points in DB now: ${verifyUser?.points}`);
        
        if (verifyUser && verifyUser.points !== totalPoints) {
          console.error(`ERROR: Points mismatch after update! DB has ${verifyUser.points} but should be ${totalPoints}`);
          
          // Force a direct update with low-level MongoDB driver as last resort
          console.log('Attempting direct MongoDB update as fallback...');
          const db = mongoose.connection.db;
          const result = await db.collection('users').updateOne(
            { address: normalizedAddress },
            { $set: { points: totalPoints } }
          );
          console.log(`Direct MongoDB update result: ${JSON.stringify(result)}`);
        }
      }
    } catch (error) {
      console.error(`Error updating user ${normalizedAddress} in database:`, error);
      throw error;
    }
    
    return totalPoints;
  } catch (error) {
    console.error(`Error fixing points for ${address}:`, error);
    throw error;
  }
}

// Add a function to fix a single user's points by address
async function fixUserPointsByAddress(address: string) {
  try {
    console.log(`Starting points calculation fix for user: ${address}`);
    await connectDB();
    
    const oldUser = await User.findOne({ address: address.toLowerCase() });
    if (!oldUser) {
      console.log(`User ${address} not found in database`);
      return null;
    }
    
    const oldPoints = oldUser.points || 0;
    const newPoints = await fixUserPointsCalculation(address);
    
    console.log(`Fixed points for ${address}:`);
    console.log(`- Old points: ${oldPoints}`);
    console.log(`- New points: ${newPoints}`);
    console.log(`- Difference: ${newPoints - oldPoints}`);
    
    // After updating single user, make sure to update the rank
    console.log(`Calculating new rank for user ${address}...`);
    
    // Count users with more points to get rank (1-based)
    const usersWithMorePoints = await User.countDocuments({
      points: { $gt: newPoints }
    });
    const newRank = usersWithMorePoints + 1;
    
    // Update the user's rank field
    await User.updateOne(
      { address: address.toLowerCase() },
      { $set: { rank: newRank } }
    );
    
    console.log(`Updated user's rank to #${newRank}`);
    
    return newPoints;
  } catch (error) {
    console.error(`Error during migration for ${address}:`, error);
    return null;
  } finally {
    await disconnectDB();
  }
}

// Run the migration
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // If an address is provided, fix only that user
  if (args.length > 0 && args[0].startsWith('0x')) {
    fixUserPointsByAddress(args[0])
      .then(() => {
        console.log('Single user points calculation fix completed');
        process.exit(0);
      })
      .catch(err => {
        console.error('Fix failed:', err);
        process.exit(1);
      });
  } else {
    // Otherwise run the full migration
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
}

export { migratePoints, fixUserPointsCalculation, fixUserPointsByAddress };
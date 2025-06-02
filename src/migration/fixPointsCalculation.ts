import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './dbUtils';
import User from '../mongodb/models/User';
import Badge from '../mongodb/models/Badge';
import Checkin from '../mongodb/models/Checkin';
import PointsHistory from '../mongodb/models/PointsHistory';
import { getCheckInBoost, calculateAchievementPoints } from '../utils/pointCalculation';

async function migratePoints() {
  console.log('Starting points calculation migration...');
  
  try {
    await connectDB();
    
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);
    
    let updatedUsers = 0;
    let totalPointsUpdated = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`Processing user ${i + 1}/${users.length}: ${user.address}`);
      
      const previousPoints = user.points || 0;
      
      const newPoints = await fixUserPointsCalculation(user.address);
      
      const pointsDifference = newPoints - previousPoints;
      if (pointsDifference !== 0) {
        updatedUsers++;
        totalPointsUpdated += Math.abs(pointsDifference);
        console.log(`Points changed from ${previousPoints} to ${newPoints} (${pointsDifference > 0 ? '+' : ''}${pointsDifference})`);
      }
    }
    
    console.log('\nRecalculating ranks for all users to ensure consistency...');
    await recalculateAllRanks();
    
    console.log('Migration completed successfully');
    console.log(`Updated points for ${updatedUsers} users`);
    console.log(`Total points difference: ${totalPointsUpdated}`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await disconnectDB();
  }
}

async function recalculateAllRanks() {
  try {
    const sortedUsers = await User.find({})
      .sort({ points: -1, checkinCount: -1, lastCheckin: -1 })
      .lean();
    
    console.log(`Recalculating ranks for ${sortedUsers.length} users...`);
    
    let updatedCount = 0;
    
    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      const rank = i + 1; 
      
      const updateResult = await User.updateOne(
        { address: user.address },
        { $set: { rank } }
      );
      
      if (updateResult.modifiedCount > 0) {
        updatedCount++;
      }
    }
    
    console.log(`Updated ranks for ${updatedCount} users`);
    
    await User.collection.createIndex({ rank: 1 });
    await User.collection.createIndex({ points: -1, rank: 1 });
    
    console.log('Rank indexes created/verified');
    
    return updatedCount;
  } catch (error) {
    console.error('Error recalculating ranks:', error);
    throw error;
  }
}

async function fixUserPointsCalculation(address: string) {
  try {
    const normalizedAddress = address.toLowerCase();
    
    console.log(`\n===== DETAILED POINT ANALYSIS FOR ${normalizedAddress} =====`);
    
    const badges = await Badge.find({ owner: normalizedAddress })
      .sort({ mintedAt: 1 });
    
    console.log(`Found ${badges.length} badges for this user`);
    
    const tierTimeline: { date: Date; tier: number }[] = [];
    
    tierTimeline.push({ date: new Date(0), tier: -1 });
    
    badges.forEach(badge => {
      const prevTier = tierTimeline[tierTimeline.length - 1].tier;
      if (badge.tier > prevTier) {
        tierTimeline.push({ date: badge.mintedAt, tier: badge.tier });
        console.log(`Badge tier ${badge.tier} obtained on ${badge.mintedAt}`);
      }
    });
    
    const checkinRecords = await Checkin.find({ address: normalizedAddress })
      .sort({ blockTimestamp: 1 });
    
    console.log(`Found ${checkinRecords.length} check-ins for this user`);
    
    let checkinPoints = 0;
    
    console.log("\nCHECK-IN POINTS BREAKDOWN:");
    console.log("---------------------------");
    console.log("CheckinID | Date | Tier | Boost | Points");
    console.log("---------------------------");
    
    for (const checkin of checkinRecords) {
      let tierAtCheckin = -1;
      for (let i = tierTimeline.length - 1; i >= 0; i--) {
        if (checkin.blockTimestamp >= tierTimeline[i].date) {
          tierAtCheckin = tierTimeline[i].tier;
          break;
        }
      }
      
      const boost = getCheckInBoost(tierAtCheckin);
      const basePoints = 10; 
      const points = Math.floor(basePoints * boost);
      
      console.log(`#${checkin.checkinNumber} | ${checkin.blockTimestamp.toISOString().split('T')[0]} | ${tierAtCheckin} | ${boost}x | ${points}`);
      
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
      
      checkinPoints += points;
    }
    
    console.log(`Total points from check-ins: ${checkinPoints}`);
    
    let badgePoints = 0;
    const highestBadge = await Badge.findOne({ owner: normalizedAddress })
      .sort({ tier: -1 })
      .limit(1);
      
    if (highestBadge) {
      const tierPoints = [20, 30, 50, 70, 100]; 
      badgePoints = highestBadge.tier >= 0 && highestBadge.tier < tierPoints.length 
        ? tierPoints[highestBadge.tier] 
        : 0;
      console.log(`\nBADGE POINTS: ${badgePoints} (from highest tier ${highestBadge.tier})`);
    } else {
      console.log("\nBADGE POINTS: 0 (no badges)");
    }
    
    const otherPointsHistory = await PointsHistory.find({
      address: normalizedAddress,
      source: { $ne: 'checkin' }
    });
    
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
    
    const achievementPoints = calculateAchievementPoints(checkinRecords.length);
    
    console.log(`\nACHIEVEMENT POINTS CALCULATION:`);
    console.log(`Check-in count: ${checkinRecords.length}`);
    console.log(`Achievement points from milestones: ${achievementPoints}`);
    console.log(`Old achievement points from DB: ${oldAchievementPoints}`);
    console.log(`Referral points (NOT COUNTED): ${referralPoints}`);
    
    const otherPoints = achievementPoints; 
    const totalPoints = checkinPoints + badgePoints + otherPoints;
    console.log(`\nTOTAL POINTS BREAKDOWN:`);
    console.log(`Check-in points: ${checkinPoints}`);
    console.log(`Badge points: ${badgePoints}`);
    console.log(`Other points: ${otherPoints}`);
    console.log(`GRAND TOTAL: ${totalPoints}`);
    
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
    
    try {
      console.log(`Attempting to update user ${normalizedAddress} in MongoDB...`);
      console.log(`Current points: ${(await User.findOne({ address: normalizedAddress }))?.points || 'unknown'}`);
      console.log(`New calculated points: ${totalPoints}`);
      
      const updateResult = await User.findOneAndUpdate(
        { address: normalizedAddress },
        { 
          $set: { 
            points: totalPoints,
            checkinPoints, 
            badgePoints,
            otherPoints,
            lastPointsUpdate: new Date()
          },
          $currentDate: { updatedAt: true } 
        },
        { new: true, runValidators: true } 
      );
      
      if (!updateResult) {
        console.error(`ERROR: User ${normalizedAddress} not found during update!`);
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
        
        const verifyUser = await User.findOne({ address: normalizedAddress });
        console.log(`Verification check - user's points in DB now: ${verifyUser?.points}`);
        
        if (verifyUser && verifyUser.points !== totalPoints) {
          console.error(`ERROR: Points mismatch after update! DB has ${verifyUser.points} but should be ${totalPoints}`);
          
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
    
    console.log(`Calculating new rank for user ${address}...`);
    
    const usersWithMorePoints = await User.countDocuments({
      points: { $gt: newPoints }
    });
    const newRank = usersWithMorePoints + 1;
    
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

if (require.main === module) {
  const args = process.argv.slice(2);
  
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
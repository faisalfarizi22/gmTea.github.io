import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './dbUtils';
import PointsHistory from '../mongodb/models/PointsHistory';
import User from '../mongodb/models/User';
import Badge from '../mongodb/models/Badge';
import PointsService from '../mongodb/services/PointsService';


async function cleanupBadgePoints() {
  console.log('Starting points history cleanup for badge-related entries...');
  
  try {
    await connectDB();
    
    const badgeEntries = await PointsHistory.find({
      source: 'achievement',
      $or: [
        { reason: { $regex: /Minted .* Badge/ } },
        { reason: { $regex: /Badge Tier \d+ Earned/ } }
      ]
    });
    
    console.log(`Found ${badgeEntries.length} badge-related achievement entries in the history`);
    
    const affectedAddressesMap: {[key: string]: boolean} = {};
    badgeEntries.forEach(entry => {
      affectedAddressesMap[entry.address] = true;
    });
    const affectedAddresses = Object.keys(affectedAddressesMap);
    
    console.log(`Total affected users: ${affectedAddresses.length}`);
    
    const deleteResult = await PointsHistory.deleteMany({
      source: 'achievement',
      $or: [
        { reason: { $regex: /Minted .* Badge/ } },
        { reason: { $regex: /Badge Tier \d+ Earned/ } }
      ]
    });
    
    console.log(`Deleted ${deleteResult.deletedCount} problematic badge achievement entries`);
    
    console.log('Recreating correct badge achievement entries...');
    let countCreated = 0;
    
    for (const address of affectedAddresses) {
      try {
        const highestBadge = await Badge.findOne({ owner: address })
          .sort({ tier: -1 })
          .limit(1);
        
        if (highestBadge) {
          await PointsHistory.create({
            address,
            points: highestBadge.tier >= 0 && highestBadge.tier < 5 ? [20, 30, 50, 70, 100][highestBadge.tier] : 0,
            reason: `Badge Tier ${highestBadge.tier} Earned`,
            source: 'achievement',
            timestamp: highestBadge.mintedAt || new Date(),
            tierAtEvent: highestBadge.tier
          });
          
          countCreated++;
        }
      } catch (err) {
        console.error(`Error processing address ${address}:`, err);
      }
    }
    
    console.log(`Created ${countCreated} corrected badge achievement entries`);
    
    console.log('Recalculating points for all affected users...');
    let recalculated = 0;
    
    for (const address of affectedAddresses) {
      try {
        const user = await User.findOne({ address });
        const oldPoints = user ? user.points : 0;
        
        await PointsService.recalculateSingleUserPoints(address);
        
        const updatedUser = await User.findOne({ address });
        const newPoints = updatedUser ? updatedUser.points : 0;
        
        console.log(`User ${address}: points changed from ${oldPoints} to ${newPoints}`);
        recalculated++;
      } catch (err) {
        console.error(`Error recalculating points for ${address}:`, err);
      }
    }
    
    console.log(`Successfully recalculated points for ${recalculated} users`);
    
    console.log('Updating ranks for all users...');
    const ranksUpdated = await PointsService.recalculateAllRanks();
    console.log(`Updated ranks for ${ranksUpdated} users`);
    
    console.log('Points history cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  cleanupBadgePoints()
    .then(() => {
      console.log('Cleanup process completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Cleanup process failed:', err);
      process.exit(1);
    });
}

export { cleanupBadgePoints };
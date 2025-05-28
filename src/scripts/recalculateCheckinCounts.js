// src/scripts/recalculateCheckinCounts.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// MongoDB connection
async function connectToDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Define User model for script
const UserSchema = new mongoose.Schema({
  address: String,
  username: String,
  highestBadgeTier: Number,
  checkinCount: Number,
  points: Number,
  lastCheckin: Date,
});

// Define Checkin model for script
const CheckinSchema = new mongoose.Schema({
  address: String,
  checkinNumber: Number,
  blockNumber: Number,
  blockTimestamp: Date,
  transactionHash: String,
  points: Number,
  boost: Number,
  message: String,
});

// Register models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Checkin = mongoose.models.Checkin || mongoose.model('Checkin', CheckinSchema);

/**
 * Main function to recalculate checkin counts for all users
 */
async function recalculateCheckinCounts() {
  try {
    await connectToDB();
    
    console.log('Starting recalculation of checkin counts...');
    
    // Get all users with checkin count > 0
    const users = await User.find({ checkinCount: { $gt: 0 } });
    console.log(`Found ${users.length} users with non-zero checkin count`);
    
    let updated = 0;
    let unchanged = 0;
    let discrepancies = [];
    
    // Process each user
    for (const user of users) {
      // Get actual checkin count from Checkin collection
      const actualCheckinCount = await Checkin.countDocuments({ address: user.address.toLowerCase() });
      
      // If counts don't match, update the user
      if (user.checkinCount !== actualCheckinCount) {
        const difference = user.checkinCount - actualCheckinCount;
        
        discrepancies.push({
          address: user.address,
          username: user.username || 'No username',
          storedCount: user.checkinCount,
          actualCount: actualCheckinCount,
          difference: difference
        });
        
        // Update the user record
        await User.updateOne(
          { _id: user._id },
          { $set: { checkinCount: actualCheckinCount } }
        );
        
        console.log(`Updated ${user.address} (${user.username || 'No username'}): ${user.checkinCount} -> ${actualCheckinCount} (diff: ${difference})`);
        updated++;
      } else {
        unchanged++;
      }
    }
    
    // Print summary
    console.log('\n===== RECALCULATION SUMMARY =====');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Users updated: ${updated}`);
    console.log(`Users unchanged: ${unchanged}`);
    
    if (discrepancies.length > 0) {
      console.log('\n===== DISCREPANCIES FOUND =====');
      // Sort by difference (largest first)
      discrepancies.sort((a, b) => b.difference - a.difference);
      
      discrepancies.forEach(d => {
        console.log(`${d.address} (${d.username}): Stored ${d.storedCount}, Actual ${d.actualCount}, Diff ${d.difference}`);
      });
    }
    
    console.log('\nRecalculation completed successfully.');
  } catch (error) {
    console.error('Error during recalculation:', error);
  } finally {
    // Close the mongoose connection
    try {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
    }
  }
}

// Run the script
recalculateCheckinCounts();
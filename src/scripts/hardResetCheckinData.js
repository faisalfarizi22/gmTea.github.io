// src/scripts/hardResetCheckinData.js
const mongoose = require('mongoose');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Import CheckinIndexer (you may need to adjust the path)
const CheckinIndexer = require('../mongodb/indexers/CheckinIndexer').default;

// Get provider URL from environment
const PROVIDER_URL = process.env.PROVIDER_URL || process.env.NEXT_PUBLIC_TEA_SEPOLIA_RPC_URL;

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

// Define models for script
const UserSchema = new mongoose.Schema({
  address: String,
  username: String,
  highestBadgeTier: Number,
  checkinCount: Number,
  points: Number,
  lastCheckin: Date,
});

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

const PointsHistorySchema = new mongoose.Schema({
  address: String,
  points: Number,
  reason: String,
  source: String,
  timestamp: Date,
});

const SyncStatusSchema = new mongoose.Schema({
  contractAddress: String,
  lastProcessedBlock: Number,
  lastSyncTimestamp: Date,
  isCurrentlySyncing: Boolean,
});

// Register models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Checkin = mongoose.models.Checkin || mongoose.model('Checkin', CheckinSchema);
const PointsHistory = mongoose.models.PointsHistory || mongoose.model('PointsHistory', PointsHistorySchema);
const SyncStatus = mongoose.models.SyncStatus || mongoose.model('SyncStatus', SyncStatusSchema);

/**
 * Main function to hard reset checkin data and reindex
 */
async function hardResetCheckinData() {
  try {
    console.log('Starting hard reset of check-in data...');
    
    // Connect to MongoDB
    await connectToDB();
    
    // Backup user data before reset
    console.log('Creating backup of user data...');
    const allUsers = await User.find({ checkinCount: { $gt: 0 } });
    const backupData = allUsers.map(user => ({
      address: user.address,
      username: user.username,
      checkinCount: user.checkinCount,
      points: user.points,
      lastCheckin: user.lastCheckin,
    }));
    
    console.log(`Backup created for ${backupData.length} users`);
    
    // Save backup to a file
    const fs = require('fs');
    const backupFile = path.join(process.cwd(), 'checkin-backup.json');
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`Backup saved to ${backupFile}`);
    
    // Confirm with user
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('This will reset all check-in data. Are you sure you want to continue? (yes/no): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('Operation aborted.');
      process.exit(0);
    }
    
    console.log('\n===== STARTING HARD RESET =====');
    
    // 1. Reset User check-in fields
    console.log('Resetting User checkin fields...');
    const userResult = await User.updateMany(
      {},
      { 
        $set: { 
          checkinCount: 0
        }
      }
    );
    console.log(`Updated ${userResult.modifiedCount} users`);
    
    // 2. Clear existing Checkin data
    console.log('Clearing Checkin collection...');
    const checkinResult = await Checkin.deleteMany({});
    console.log(`Deleted ${checkinResult.deletedCount} check-ins`);
    
    // 3. Clear PointsHistory data related to check-ins
    console.log('Clearing check-in PointsHistory records...');
    const pointsResult = await PointsHistory.deleteMany({ source: 'checkin' });
    console.log(`Deleted ${pointsResult.deletedCount} points history records`);
    
    // 4. Reset sync status
    console.log('Resetting sync status...');
    await SyncStatus.updateMany(
      {},
      { 
        $set: { 
          isCurrentlySyncing: false
        }
      }
    );
    
    console.log('\n===== HARD RESET COMPLETED =====');
    console.log('You can now run the CheckinIndexer to reindex the data.');
    
    // Option to reindex immediately
    const reindexAnswer = await new Promise(resolve => {
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl2.question('Do you want to start reindexing now? (yes/no): ', (answer) => {
        rl2.close();
        resolve(answer);
      });
    });
    
    if (reindexAnswer.toLowerCase() === 'yes') {
      console.log('\n===== STARTING REINDEXING =====');
      
      // Create provider
      if (!PROVIDER_URL) {
        console.error('PROVIDER_URL not set. Cannot start indexer.');
        process.exit(1);
      }
      
      const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
      const indexer = new CheckinIndexer(provider);
      
      // Start indexing
      await indexer.reindexAll();
      
      console.log('\n===== REINDEXING COMPLETED =====');
    }
    
  } catch (error) {
    console.error('Error during hard reset:', error);
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
hardResetCheckinData();
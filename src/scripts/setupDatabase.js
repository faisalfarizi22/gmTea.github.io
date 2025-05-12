// src/scripts/setupDatabase.js
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Constants
const DEPLOY_BLOCK = parseInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "1155300", 10);
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const BADGE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GMTEABADGE_ADDRESS || "0x3008E2AB11193C92DE8a1c3b9314e69342EdAFD2";
const USERNAME_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_GMTEAUSERNAME_ADDRESS || "0x0000000000000000000000000000000000000000";
const REFERRAL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GMTEAREFERRAL_ADDRESS || "0x0000000000000000000000000000000000000000";

// Define schemas here for setup
const UserSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  username: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true,
    index: true
  },
  highestBadgeTier: {
    type: Number,
    default: -1
  },
  checkinCount: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  referrer: {
    type: String,
    sparse: true
  },
  lastCheckin: {
    type: Date,
    sparse: true
  }
}, { timestamps: true });

const BadgeSchema = new mongoose.Schema({
  tokenId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  owner: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  tier: {
    type: Number,
    required: true,
    index: true
  },
  mintedAt: {
    type: Date,
    required: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  }
}, { timestamps: true });

const CheckinSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  checkinNumber: {
    type: Number,
    required: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  blockTimestamp: {
    type: Date,
    required: true,
    index: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  points: {
    type: Number,
    default: 10
  },
  boost: {
    type: Number,
    default: 1.0
  }
});

// Compound index for user + checkin number
CheckinSchema.index({ address: 1, checkinNumber: 1 }, { unique: true });

const ReferralSchema = new mongoose.Schema({
  referrer: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  referee: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    index: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  rewardsClaimed: {
    type: Boolean,
    default: false
  },
  rewardsAmount: {
    type: String,
    default: "0"
  }
}, { timestamps: true });

const PointsHistorySchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  points: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['checkin', 'achievement', 'referral', 'other'],
    default: 'other',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

const SyncStatusSchema = new mongoose.Schema({
  contractAddress: {
    type: String,
    required: true,
    unique: true
  },
  lastProcessedBlock: {
    type: Number,
    required: true,
    default: 0
  },
  lastSyncTimestamp: {
    type: Date,
    default: Date.now
  },
  isCurrentlySyncing: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

/**
 * Setup and verify MongoDB connection and indexes
 */
async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Define models
    const User = mongoose.model('User', UserSchema);
    const Badge = mongoose.model('Badge', BadgeSchema);
    const Checkin = mongoose.model('Checkin', CheckinSchema);
    const Referral = mongoose.model('Referral', ReferralSchema);
    const PointsHistory = mongoose.model('PointsHistory', PointsHistorySchema);
    const SyncStatus = mongoose.model('SyncStatus', SyncStatusSchema);
    
    // Create initial sync status documents if they don't exist
    console.log('Setting up initial sync status...');
    
    // Checkin contract
    await SyncStatus.findOneAndUpdate(
      { contractAddress: CONTRACT_ADDRESS },
      { 
        $setOnInsert: { 
          lastProcessedBlock: DEPLOY_BLOCK - 1,
          lastSyncTimestamp: new Date(),
          isCurrentlySyncing: false
        } 
      },
      { upsert: true }
    );
    
    // Badge contract
    await SyncStatus.findOneAndUpdate(
      { contractAddress: BADGE_CONTRACT_ADDRESS },
      { 
        $setOnInsert: { 
          lastProcessedBlock: DEPLOY_BLOCK - 1,
          lastSyncTimestamp: new Date(),
          isCurrentlySyncing: false
        } 
      },
      { upsert: true }
    );
    
    // Username registry contract
    await SyncStatus.findOneAndUpdate(
      { contractAddress: USERNAME_REGISTRY_ADDRESS },
      { 
        $setOnInsert: { 
          lastProcessedBlock: DEPLOY_BLOCK - 1,
          lastSyncTimestamp: new Date(),
          isCurrentlySyncing: false
        } 
      },
      { upsert: true }
    );
    
    // Referral contract
    await SyncStatus.findOneAndUpdate(
      { contractAddress: REFERRAL_CONTRACT_ADDRESS },
      { 
        $setOnInsert: { 
          lastProcessedBlock: DEPLOY_BLOCK - 1,
          lastSyncTimestamp: new Date(),
          isCurrentlySyncing: false
        } 
      },
      { upsert: true }
    );
    
    console.log('Database setup complete');
    
    // Log some diagnostics
    const userCount = await User.countDocuments();
    const badgeCount = await Badge.countDocuments();
    const checkinCount = await Checkin.countDocuments();
    const referralCount = await Referral.countDocuments();
    
    console.log('Current database stats:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Badges: ${badgeCount}`);
    console.log(`- Checkins: ${checkinCount}`);
    console.log(`- Referrals: ${referralCount}`);
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup function
setupDatabase();
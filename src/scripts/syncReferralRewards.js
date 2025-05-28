// scripts/syncReferralRewards.js
require('dotenv').config();
const mongoose = require('mongoose');
const { ethers } = require('ethers');

// Connect to MongoDB
async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Models
const User = mongoose.model('User', new mongoose.Schema({
  address: { type: String, required: true, lowercase: true, unique: true },
  pendingRewards: { type: Number, default: 0 },
  claimedRewards: { type: Number, default: 0 },
  totalReferralRewards: { type: Number, default: 0 },
  lastRewardSync: Date
}, { timestamps: true }));

const Referral = mongoose.model('Referral', new mongoose.Schema({
  referrer: { type: String, required: true, lowercase: true, index: true },
  referee: { type: String, required: true, lowercase: true, index: true },
  rewardsClaimed: { type: Boolean, default: false },
  rewardsAmount: { type: String, default: "0" },
  timestamp: Date
}, { timestamps: true }));

// Sync all user rewards
async function syncAllRewards() {
  try {
    console.log('Starting reward sync for all users');
    
    // Get all users with at least one referral
    const referrers = await Referral.distinct('referrer');
    console.log(`Found ${referrers.length} users with referrals`);
    
    // Process each referrer
    for (const referrer of referrers) {
      console.log(`Processing ${referrer}...`);
      
      try {
        // Get all referrals for this user
        const referrals = await Referral.find({ referrer });
        
        // Calculate total pending and claimed rewards
        const pendingRewards = referrals
          .filter(ref => !ref.rewardsClaimed)
          .reduce((total, ref) => total + parseFloat(ref.rewardsAmount || "0"), 0);
          
        const claimedRewards = referrals
          .filter(ref => ref.rewardsClaimed)
          .reduce((total, ref) => total + parseFloat(ref.rewardsAmount || "0"), 0);
        
        // Update user document
        await User.findOneAndUpdate(
          { address: referrer },
          {
            $set: {
              pendingRewards,
              claimedRewards,
              totalReferralRewards: pendingRewards + claimedRewards,
              lastRewardSync: new Date()
            }
          },
          { upsert: true }
        );
        
        console.log(`Updated ${referrer}: pending=${pendingRewards.toFixed(6)}, claimed=${claimedRewards.toFixed(6)}`);
      } catch (error) {
        console.error(`Error processing ${referrer}:`, error);
      }
    }
    
    console.log('Reward sync completed');
  } catch (error) {
    console.error('Error syncing rewards:', error);
  }
}

// Main function
async function main() {
  await connectDatabase();
  await syncAllRewards();
  
  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
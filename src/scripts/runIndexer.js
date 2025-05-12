// src/scripts/runIndexer.js
const dotenv = require('dotenv');
const path = require('path');
const indexerController = require('../mongodb/indexers').default;

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set up error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Parse command line arguments
const args = process.argv.slice(2);
const reindex = args.includes('--reindex');
const syncRewards = args.includes('--sync-rewards');
const syncAddress = args.find(arg => arg.startsWith('--address='));
const addressValue = syncAddress ? syncAddress.split('=')[1] : null;
const frequency = args.find(arg => arg.startsWith('--frequency='));
const frequencyValue = frequency ? parseFloat(frequency.split('=')[1]) : 5; 
const fixBadges = args.includes('--fix-badges');

// Display startup information
console.log('===============================');
console.log('Blockchain Indexer Service');
console.log('===============================');
console.log('Indexing frequency:', frequencyValue, 'minutes');
console.log('Reindexing enabled:', reindex ? 'Yes' : 'No');
console.log('Rewards sync enabled:', syncRewards ? 'Yes' : 'No');
console.log('Fix badges enabled:', fixBadges ? 'Yes' : 'No');
if (addressValue) {
  console.log('Target address:', addressValue);
}
console.log('===============================');

// Configure indexer
indexerController.setIndexFrequency(frequencyValue);

// Async function to handle different operations
async function run() {
  try {
    // If fix badges is requested
    if (fixBadges) {
      console.log('Running badge fix utility...');
      
      // Run the badge fix operation
      const results = await indexerController.fixBadgeReferrers();
      
      console.log(`Badge fix complete. Fixed ${results.fixed} out of ${results.total} badges.`);
      
      // If fix-only flag is provided, exit after fix
      if (args.includes('--fix-only')) {
        console.log('Fix completed. Exiting...');
        process.exit(0);
      }
    }
    
    // If sync rewards for specific address is requested
    if (syncRewards && addressValue) {
      console.log(`Syncing rewards for address: ${addressValue}`);
      await indexerController.syncAddressRewards(addressValue);
      console.log(`Rewards sync complete for ${addressValue}`);
      
      // Continue with regular indexing unless --sync-only flag is provided
      if (!args.includes('--sync-only')) {
        console.log('Starting regular indexing...');
        indexerController.startIndexing();
      } else {
        console.log('Sync completed. Exiting...');
        process.exit(0);
      }
    }
    // If sync all rewards is requested
    else if (syncRewards) {
      console.log('Syncing all user rewards...');
      
      // Connect to MongoDB
      const mongoose = require('mongoose');
      const uri = process.env.MONGODB_URI;
      
      if (!uri) {
        throw new Error('MONGODB_URI environment variable not set');
      }
      
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      // Get Badge model to find badges with referrers
      const Badge = mongoose.model('Badge');
      const referrers = await Badge.distinct('referrer', { referrer: { $ne: null } });
      
      console.log(`Found ${referrers.length} users with referrals`);
      
      // Sync rewards for each user
      for (const referrer of referrers) {
        console.log(`Syncing rewards for: ${referrer}`);
        await indexerController.syncAddressRewards(referrer);
      }
      
      console.log('All rewards synced successfully');
      
      // Disconnect from MongoDB if sync-only
      if (args.includes('--sync-only')) {
        await mongoose.disconnect();
        console.log('Sync completed. Exiting...');
        process.exit(0);
      }
    }
    // If full reindexing is requested
    else if (reindex) {
      console.log('Starting full reindexing...');
      await indexerController.reindexAll();
      console.log('Reindexing complete, continuing with regular indexing');
      indexerController.startIndexing();
    } 
    // Otherwise, start regular indexing
    else {
      console.log('Starting regular indexing...');
      indexerController.startIndexing();
    }
  } catch (error) {
    console.error('Error during indexer operations:', error);
    process.exit(1);
  }
}

// Run the async function
run();

console.log('Indexer process running. Press Ctrl+C to stop.');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down indexer...');
  
  // Stop the indexer controller
  indexerController.stopIndexing();
  
  // Allow some time for cleanup
  setTimeout(() => {
    console.log('Indexer shutdown complete.');
    process.exit(0);
  }, 1000);
});
// src/scripts/runIndexer.js
const dotenv = require('dotenv');
const path = require('path');
const indexerController = require('../mongodb/indexers').default;
// Import fungsi dbConnect dari connection
const { dbConnect } = require('../mongodb/connection');

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
        // Clean shutdown before exit
        await indexerController.shutdown();
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
        // Clean shutdown before exit
        await indexerController.shutdown();
        process.exit(0);
      }
    }
    // If sync all rewards is requested
    else if (syncRewards) {
      console.log('Syncing all user rewards...');
      
      // Gunakan dbConnect standar bukannya koneksi mongoose langsung
      await dbConnect();
      
      // Get Badge model to find badges with referrers
      const mongoose = require('mongoose');
      const Badge = mongoose.model('Badge');
      const referrers = await Badge.distinct('referrer', { referrer: { $ne: null } });
      
      console.log(`Found ${referrers.length} users with referrals`);
      
      // Sync rewards for each user
      for (const referrer of referrers) {
        console.log(`Syncing rewards for: ${referrer}`);
        await indexerController.syncAddressRewards(referrer);
      }
      
      console.log('All rewards synced successfully');
      
      // Jika sync-only, lakukan shutdown yang bersih bukannya disconnect langsung
      if (args.includes('--sync-only')) {
        console.log('Sync completed. Exiting...');
        await indexerController.shutdown();
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
    // Pastikan kita melakukan shutdown yang bersih sebelum error exit
    try {
      await indexerController.shutdown();
    } catch (shutdownError) {
      console.error('Error during shutdown after operation error:', shutdownError);
    }
    process.exit(1);
  }
}

// Run the async function
run();

console.log('Indexer process running. Press Ctrl+C to stop.');

// Handle graceful shutdown - dimodifikasi untuk menggunakan shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down indexer...');
  
  try {
    // Gunakan metode shutdown yang baru untuk menutup koneksi database
    await indexerController.shutdown();
    console.log('Indexer shutdown process complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
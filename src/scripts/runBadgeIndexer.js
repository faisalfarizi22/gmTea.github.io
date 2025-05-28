// src/scripts/runBadgeIndexer.js
// This is a JavaScript file designed to be run with ts-node
const dotenv = require('dotenv');
const path = require('path');
const { ethers } = require('ethers');
const mongoose = require('mongoose');
const { dbConnect, dbDisconnect } = require('../mongodb/connection');
const BadgeIndexer = require('../mongodb/indexers/BadgeIndexer').default;
const { TEA_SEPOLIA_RPC_URL, BADGE_CONTRACT_ADDRESS } = require('../utils/constants');

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
const fixReferrers = args.includes('--fix-referrers');
const batchSize = args.find(arg => arg.startsWith('--batch-size='));
const batchSizeValue = batchSize ? parseInt(batchSize.split('=')[1]) : 2000;
const testConnection = args.includes('--test-connection');
const customRpcArg = args.find(arg => arg.startsWith('--rpc='));
const customRpcUrl = customRpcArg ? customRpcArg.split('=')[1] : null;
const maxRetries = args.find(arg => arg.startsWith('--retries='));
const maxRetriesValue = maxRetries ? parseInt(maxRetries.split('=')[1]) : 3;

// Set the specific starting block (overriding the default)
const START_BLOCK = 1764912;

// Get RPC URL (prefer command line arg over constant)
const rpcUrl = customRpcUrl || process.env.TEA_SEPOLIA_RPC_URL || TEA_SEPOLIA_RPC_URL;

// Display startup information
console.log('===============================');
console.log('Badge Indexer Service');
console.log('===============================');
console.log('RPC URL:', rpcUrl ? `${rpcUrl.substring(0, 20)}...${rpcUrl.substring(rpcUrl.length - 10)}` : 'Not configured');
console.log('Batch size:', batchSizeValue, 'blocks');
console.log('Max retries:', maxRetriesValue);
console.log('Reindexing enabled:', reindex ? 'Yes' : 'No');
console.log('Fix referrers enabled:', fixReferrers ? 'Yes' : 'No');
console.log('Starting block:', START_BLOCK);
console.log('Test connection only:', testConnection ? 'Yes' : 'No');
console.log('Running with ts-node');
console.log('===============================');

// Helper function to test RPC connection
async function testRpcConnection(url) {
  console.log('Testing RPC connection...');
  try {
    if (!url) {
      throw new Error('No RPC URL provided. Check your environment variables or use --rpc=URL');
    }
    
    const provider = new ethers.providers.JsonRpcProvider(url);
    // Try to get the network info
    const network = await provider.getNetwork();
    console.log('Successfully connected to network:');
    console.log('  - Name:', network.name);
    console.log('  - Chain ID:', network.chainId);
    
    // Try to get the current block
    const blockNumber = await provider.getBlockNumber();
    console.log('  - Current block:', blockNumber);
    
    // Try to get some gas info
    const gasPrice = await provider.getGasPrice();
    console.log('  - Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
    
    return true;
  } catch (error) {
    console.error('RPC connection test failed:', error.message);
    if (error.code === 'NETWORK_ERROR') {
      console.error('This typically means:');
      console.error('  1. The RPC URL is incorrect');
      console.error('  2. The RPC endpoint is down or not responding');
      console.error('  3. There might be network connectivity issues');
      console.error('\nTry using a different RPC URL with --rpc=URL');
    }
    return false;
  }
}

// Initialize provider with retry logic
async function createProviderWithRetry(url, maxRetries) {
  if (!url) {
    throw new Error('No RPC URL provided. Check your environment variables or use --rpc=URL');
  }
  
  let retries = 0;
  let provider = null;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Connecting to RPC (attempt ${retries + 1}/${maxRetries + 1})...`);
      provider = new ethers.providers.JsonRpcProvider(url);
      
      // Test connection by getting network
      const network = await provider.getNetwork();
      console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
      
      return provider;
    } catch (error) {
      retries++;
      console.error(`RPC connection attempt ${retries}/${maxRetries + 1} failed:`, error.message);
      
      if (retries <= maxRetries) {
        // Exponential backoff
        const delay = 1000 * Math.pow(2, retries - 1);
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed to connect to RPC after ${maxRetries + 1} attempts`);
      }
    }
  }
}

// Helper function to update the sync status to start from our specified block
async function setStartingBlock(contractAddress, startBlock) {
  console.log(`Setting starting block for indexing to ${startBlock}...`);
  try {
    // Get the SyncStatus model
    // This is a safer way to access the model since we're using ts-node with a JS file
    let SyncStatus;
    try {
      SyncStatus = mongoose.model('SyncStatus');
    } catch (error) {
      // If the model doesn't exist yet, try to require it
      console.log('SyncStatus model not registered, attempting to load it...');
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
        isCurrentlySyncing: {
          type: Boolean,
          default: false
        },
        lastSyncTimestamp: {
          type: Date,
          default: Date.now
        }
      });
      
      // Create and register the model
      SyncStatus = mongoose.model('SyncStatus', SyncStatusSchema);
    }
    
    // Update or create the sync status document
    await SyncStatus.findOneAndUpdate(
      { contractAddress },
      { 
        $set: { 
          lastProcessedBlock: startBlock - 1, 
          isCurrentlySyncing: false,
          lastSyncTimestamp: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log(`Sync status updated, will start indexing from block ${startBlock}`);
    return true;
  } catch (error) {
    console.error('Failed to update sync status:', error);
    return false;
  }
}

// Async function to handle different operations
async function run() {
  let provider = null;
  
  try {
    // Connect to MongoDB
    await dbConnect();
    console.log('Connected to MongoDB successfully.');

    // If test connection flag is set, only test the connection and exit
    if (testConnection) {
      const success = await testRpcConnection(rpcUrl);
      if (success) {
        console.log('RPC connection test succeeded. Exiting.');
      } else {
        console.error('RPC connection test failed. Exiting.');
        await dbDisconnect();
        process.exit(1);
      }
      await dbDisconnect();
      process.exit(0);
    }

    // Create provider with retry logic
    provider = await createProviderWithRetry(rpcUrl, maxRetriesValue);
    
    // Create badge indexer
    const badgeIndexer = new BadgeIndexer(provider);
    
    // Set custom batch size if provided
    if (batchSizeValue && typeof badgeIndexer.chunkSize !== 'undefined') {
      console.log(`Setting batch size to ${batchSizeValue} blocks`);
      badgeIndexer.chunkSize = batchSizeValue;
    }

    // If fix referrers is requested
    if (fixReferrers) {
      console.log('Running badge referrer fix utility...');
      
      // We need to access the BadgeService directly
      const BadgeService = require('../mongodb/services/BadgeService').default;
      const results = await BadgeService.fixBadgeReferrers();
      
      console.log(`Badge referrer fix complete. Fixed ${results.fixed} out of ${results.total} badges.`);
      
      // If fix-only flag is provided, exit after fix
      if (args.includes('--fix-only')) {
        console.log('Fix completed. Exiting.');
        await dbDisconnect();
        process.exit(0);
      }
    }
    
    // If full reindexing is requested
    if (reindex) {
      console.log('Starting full badge reindexing from block', START_BLOCK);
      
      // Update the sync status to start from our specified block
      await setStartingBlock(BADGE_CONTRACT_ADDRESS, START_BLOCK);
      
      // Then run the reindex process
      await badgeIndexer.reindexAll();
      console.log('Badge reindexing complete.');
    } else {
      // Set the starting block
      console.log(`Setting starting block to ${START_BLOCK} before indexing...`);
      await setStartingBlock(BADGE_CONTRACT_ADDRESS, START_BLOCK);
      
      // Run a single indexing cycle
      console.log('Starting badge indexing cycle...');
      await badgeIndexer.startIndexing();
      console.log('Badge indexing cycle complete.');
    }
    
    console.log('Badge indexer operations completed successfully.');
    await dbDisconnect();
    
  } catch (error) {
    console.error('Error during badge indexer operations:', error);
    
    // Provide more helpful error messages
    if (error.code === 'NETWORK_ERROR') {
      console.error('\nNETWORK ERROR DETECTED:');
      console.error('The RPC connection is failing. Please check:');
      console.error('  1. Is your RPC URL correct? Current URL:', rpcUrl ? `${rpcUrl.substring(0, 15)}...` : 'Not set');
      console.error('  2. Does your RPC provider require an API key?');
      console.error('  3. Try a different RPC provider with: --rpc=https://alternate-rpc.io');
      console.error('  4. Run with --test-connection to diagnose network issues');
    }
    
    try {
      await dbDisconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError);
    }
    process.exit(1);
  }
}

// Run the async function
run().then(() => {
  console.log('Badge indexer process completed. Exiting.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down badge indexer...');
  
  try {
    await dbDisconnect();
    console.log('Database connection closed. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
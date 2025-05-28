// src/scripts/testMint.js
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const readline = require('readline');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("Starting badge minting test with improved debugging...");
  
  // Connect to the network
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_TEA_SEPOLIA_RPC_URL || "https://tea-sepolia.g.alchemy.com/public"
  );
  
  if (!process.env.TEST_PRIVATE_KEY) {
    throw new Error("Please set TEST_PRIVATE_KEY in your .env.local file");
  }
  
  const privateKey = process.env.TEST_PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = wallet.address;
  
  console.log(`Testing with address: ${address}`);
  console.log(`Wallet balance: ${ethers.utils.formatEther(await provider.getBalance(address))} ETH`);
  
  // Get network info
  const network = await provider.getNetwork();
  console.log(`Connected to network with chainId: ${network.chainId} (${network.name})`);
  
  // Define contract addresses
  const badgeContractAddress = process.env.NEXT_PUBLIC_GMTEABADGE_ADDRESS || "0x3008E2AB11193C92DE8a1c3b9314e69342EdAFD2";
  const usernameContractAddress = process.env.NEXT_PUBLIC_GMTEAUSERNAME_ADDRESS || "0x8836af57116261063a06C9865970d011B29cdC1d";
  const referralContractAddress = process.env.NEXT_PUBLIC_GMTEAREFERRAL_ADDRESS || "0xfcf3934f7268Dc2CF39a62bca9B39271a6d26A24";
  
  console.log(`Badge contract: ${badgeContractAddress}`);
  console.log(`Username contract: ${usernameContractAddress}`);
  console.log(`Referral contract: ${referralContractAddress}`);
  
  // First check if user has a username - this might be required
  const usernameABI = [
    "function getUsernameByAddress(address user) external view returns (string memory)",
    "function registerUsername(string memory username) external",
    "function isUsernameAvailable(string memory username) external view returns (bool)"
  ];
  
  const usernameContract = new ethers.Contract(
    usernameContractAddress,
    usernameABI,
    wallet
  );
  
  let hasUsername = false;
  
  try {
    const username = await usernameContract.getUsernameByAddress(address);
    if (username && username !== "") {
      console.log(`Username found: ${username}`);
      hasUsername = true;
    } else {
      console.log(`No username found. This may be required before minting.`);
      
      // Uncomment to register a username if needed
      // console.log("Attempting to register a username...");
      // const testUsername = "testUser" + Math.floor(Math.random() * 10000);
      // 
      // // Check if username is available first
      // const isAvailable = await usernameContract.isUsernameAvailable(testUsername);
      // if (!isAvailable) {
      //   console.log(`Username ${testUsername} is not available. Please try another.`);
      //   return;
      // }
      //
      // const registerTx = await usernameContract.registerUsername(testUsername, {
      //   gasLimit: 200000
      // });
      // console.log(`Username registration tx: ${registerTx.hash}`);
      // await registerTx.wait();
      // console.log("Username registered");
      // hasUsername = true;
    }
  } catch (error) {
    console.error("Error checking username:", error.message);
    console.log("Continuing anyway...");
  }
  
  // Check referral system
  const referralABI = [
    "function getReferrer(address user) external view returns (address)",
    "function registerWithReferral(string memory referrerUsername) external"
  ];
  
  const referralContract = new ethers.Contract(
    referralContractAddress,
    referralABI,
    wallet
  );
  
  let hasReferrer = false;
  
  try {
    const referrer = await referralContract.getReferrer(address);
    if (referrer && referrer !== ethers.constants.AddressZero) {
      console.log(`Referrer found: ${referrer}`);
      hasReferrer = true;
    } else {
      console.log(`No referrer found. This may be required before minting.`);
      
      // Uncomment to register with a referral if needed
      // if (hasUsername) {
      //   console.log("Attempting to register with a referral...");
      //   // You need a valid referrer username here
      //   const referrerUsername = "some_existing_username"; 
      //   const referralTx = await referralContract.registerWithReferral(referrerUsername, {
      //     gasLimit: 200000
      //   });
      //   console.log(`Referral registration tx: ${referralTx.hash}`);
      //   await referralTx.wait();
      //   console.log("Referral registered");
      //   hasReferrer = true;
      // } else {
      //   console.log("Cannot register referral without username first");
      // }
    }
  } catch (error) {
    console.error("Error checking referrer:", error.message);
    console.log("Continuing anyway...");
  }
  
  // Badge contract interface
  const badgeABI = [
    "function mintBadge(address to, uint256 tier) external payable",
    "function hasMintedTier(address user, uint256 tier) external view returns (bool)",
    "function getHighestTier(address user) external view returns (uint256)",
    "function tierPrices(uint256 tier) external view returns (uint256)",
    "function tierCurrentSupplies(uint256 tier) external view returns (uint256)",
    "function tierMaxSupplies(uint256 tier) external view returns (uint256)"
  ];
  
  const badgeContract = new ethers.Contract(
    badgeContractAddress,
    badgeABI,
    wallet
  );
  
  try {
    // Check contract state first
    console.log("\nChecking tier prices and supplies...");
    
    const tiers = [];
    const tierNames = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];
    
    for (let i = 0; i < 5; i++) {
      try {
        const price = await badgeContract.tierPrices(i);
        const currentSupply = await badgeContract.tierCurrentSupplies(i);
        const maxSupply = await badgeContract.tierMaxSupplies(i);
        
        const tierInfo = {
          name: tierNames[i],
          price: ethers.utils.formatEther(price),
          currentSupply: currentSupply.toNumber(),
          maxSupply: maxSupply.toNumber()
        };
        
        tiers.push(tierInfo);
        
        console.log(`Tier ${i} (${tierInfo.name}): Price=${tierInfo.price} ETH, Supply=${tierInfo.currentSupply}/${tierInfo.maxSupply}`);
      } catch (error) {
        console.log(`Error getting tier ${i} info: ${error.message}`);
      }
    }
    
    // Try to check if user has minted any tier
    console.log("\nChecking if user has minted any badges...");
    
    let highestMintedTier = -1;
    
    for (let i = 0; i < 5; i++) {
      try {
        const result = await badgeContract.hasMintedTier(address, i);
        console.log(`Has minted tier ${i} (${tiers[i]?.name}): ${result}`);
        if (result) {
          highestMintedTier = i;
        }
      } catch (error) {
        console.log(`Error checking tier ${i}: ${error.message}`);
      }
    }
    
    // Try calling getHighestTier if any badges minted
    if (highestMintedTier >= 0) {
      try {
        const tier = await badgeContract.getHighestTier(address);
        console.log(`Highest tier from contract: ${tier} (${tiers[tier.toNumber()]?.name})`);
      } catch (error) {
        console.log(`Error getting highest tier: ${error.message}`);
      }
    }
    
    // Check if username and referrer are required
    if (!hasUsername) {
      console.log("\n⚠️ WARNING: You don't have a username. This may be required to mint badges!");
    }
    
    if (!hasReferrer) {
      console.log("\n⚠️ WARNING: You don't have a referrer. This may be required to mint badges!");
    }
    
    // Determine which tier to mint
    const tierToMint = highestMintedTier >= 0 ? highestMintedTier + 1 : 0;
    if (tierToMint > 4) {
      console.log("All tiers already minted!");
      return;
    }
    
    // Get price from contract
    const price = await badgeContract.tierPrices(tierToMint);
    
    console.log(`\nAttempting to mint ${tiers[tierToMint]?.name} badge (tier ${tierToMint})...`);
    console.log(`Price: ${ethers.utils.formatEther(price)} ETH`);
    
    // Ask for confirmation before proceeding
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirmation = await new Promise(resolve => {
      rl.question('Continue with minting? (y/n): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
    
    if (!confirmation) {
      console.log("Minting cancelled");
      return;
    }
    
    // Send transaction
    console.log("Sending transaction...");
    const tx = await badgeContract.mintBadge(address, tierToMint, {
      value: price,
      gasLimit: 300000
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`Transaction mined: ${receipt.transactionHash}`);
    console.log(`Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
    
    // Verify the badge was minted
    try {
      const hasTierNow = await badgeContract.hasMintedTier(address, tierToMint);
      console.log(`Now has ${tiers[tierToMint]?.name} badge: ${hasTierNow}`);
    } catch (error) {
      console.log(`Error verifying badge: ${error.message}`);
    }
    
  } catch (error) {
    console.error("Error:", error.message);
    
    // Additional debugging info
    if (error.transaction) {
      console.log("\nTransaction details:", {
        from: error.transaction.from,
        to: error.transaction.to,
        data: error.transaction.data?.substring(0, 66) + "...",
        value: error.transaction.value?.toString()
      });
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
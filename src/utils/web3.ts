import { ethers } from "ethers";
import GMOnchainABI from "../abis/GMOnchainABI.json";
import { CONTRACT_ADDRESS, TEA_SEPOLIA_CHAIN, TEA_SEPOLIA_CHAIN_ID } from "./constants";
import { getUserLeaderboardRank } from "./leaderboradUtils";

const DEPLOY_BLOCK = 1155300;

const isBrowser = typeof window !== "undefined";

export const getProvider = () => {
  if (!isBrowser) return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  
  return new ethers.providers.Web3Provider(ethereum, "any"); 
};


export const connectWallet = async () => {
  try {
    if (!isBrowser) throw new Error("Cannot connect wallet server-side");
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("No Ethereum provider found. Please install MetaMask.");
    
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from wallet");
    }
    
    const provider = new ethers.providers.Web3Provider(ethereum, "any");
    
    const signer = provider.getSigner();
    const address = accounts[0]; 
    
    const network = await provider.getNetwork();
    const chainId = network.chainId;
    
    return { signer, address, chainId, provider };
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

export const switchToTeaSepolia = async () => {
  try {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("No Ethereum provider found");
    
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TEA_SEPOLIA_CHAIN.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [TEA_SEPOLIA_CHAIN],
        });
      } else {
        throw switchError;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error switching network:", error);
    throw error;
  }
};

export const getContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, GMOnchainABI, signerOrProvider);
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const fullAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address}`;
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "Available now";
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const format = (num: number) => num.toString().padStart(2, '0');
  
  if (days > 0) {
    return `${days}d ${format(hours)}:${format(minutes)}:${format(remainingSeconds)}`;
  } else {
    return `${format(hours)}:${format(minutes)}:${format(remainingSeconds)}`;
  }
};

export const isWalletConnected = async (): Promise<boolean> => {
  try {
    const provider = getProvider();
    if (!provider) return false;
    
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch (error) {
    console.error("Error checking wallet connection:", error);
    return false;
  }
};

export const getWalletBalance = async (address: string): Promise<string> => {
  try {
    const provider = getProvider();
    if (!provider || !address) return "0.0";
    
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    return "0.0";
  }
};

export const isTeaSepoliaNetwork = async (): Promise<boolean> => {
  try {
    const provider = getProvider();
    if (!provider) return false;
    
    const network = await provider.getNetwork();
    return network.chainId === TEA_SEPOLIA_CHAIN_ID;
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
};

export const getTotalCheckins = async (contract: ethers.Contract): Promise<number> => {
  try {
    const provider = contract.provider;
    if (!provider) return 0;
    
    const eventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");
    
    const currentBlock = await provider.getBlockNumber();
    console.log(`Scanning from block ${DEPLOY_BLOCK} to ${currentBlock}`);
    
    const CHUNK_SIZE = 10000;
    let totalCount = 0;
    
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1);
      
      try {
        const logs = await provider.getLogs({
          address: contract.address,
          topics: [eventSignature],
          fromBlock,
          toBlock
        });
        
        totalCount += logs.length;
        console.log(`Processed blocks ${fromBlock}-${toBlock}: Found ${logs.length} events (Running total: ${totalCount})`);
      } catch (error) {
        console.warn(`Error querying logs for blocks ${fromBlock}-${toBlock}:`, error);
        
        if (CHUNK_SIZE > 1000) {
          const smallerChunkSize = CHUNK_SIZE / 5;
          
          for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
            const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1);
            
            try {
              const smallerLogs = await provider.getLogs({
                address: contract.address,
                topics: [eventSignature],
                fromBlock: smallFromBlock,
                toBlock: smallToBlock
              });
              
              totalCount += smallerLogs.length;
              console.log(`Processed smaller chunk ${smallFromBlock}-${smallToBlock}: Found ${smallerLogs.length} events`);
            } catch (smallerError) {
              console.error(`Failed to process smaller chunk ${smallFromBlock}-${smallToBlock}:`, smallerError);
            }
          }
        }
      }
    }
    if (totalCount === 0) {
      try {
        const recentGMs = await contract.getRecentGMs();
        if (recentGMs && recentGMs.length > 0) {
          console.log(`No events found, using recentGMs length as minimum: ${recentGMs.length}`);
          return recentGMs.length;
        }
      } catch (recentError) {
        console.warn("Error getting recent GMs:", recentError);
      }
    }
    return totalCount;
  } catch (error) {
    console.error("Error in getTotalCheckins:", error);
    return 0;
  }
};

export const getUserRankData = async (contract: ethers.Contract, address: string) => {
  try {
    let checkinCount;
    try {
      checkinCount = await contract.getCheckinCount(address);
    } catch (e) {
      try {
        const userData = await contract.userCheckins(address);
        checkinCount = userData.checkinCount || ethers.BigNumber.from(0);
      } catch (mappingError) {
        checkinCount = ethers.BigNumber.from(0);
      }
    }
    
    const count = ethers.BigNumber.isBigNumber(checkinCount) 
      ? checkinCount.toNumber() 
      : Number(checkinCount);
    
    let userRank = 0;
    try {
      const rank = await getUserLeaderboardRank(contract, address);
      userRank = rank !== null ? rank : 0;
    } catch (error) {
      console.warn("Error getting user leaderboard rank:", error);
      
      if (count > 0) {
        const estimatedRank = Math.max(1, Math.floor(100 / (count + 1)));
        userRank = estimatedRank;
      }
    }
    
    let points = count * 10;
    
    if (count >= 50) points += 500;
    else if (count >= 25) points += 250;
    else if (count >= 10) points += 100;
    else if (count >= 5) points += 50;
    
    if (userRank > 0 && userRank <= 10) {
      points += 1000 - ((userRank - 1) * 100);
    } else if (userRank > 10 && userRank <= 50) {
      points += 100;
    }
    
    return {
      rank: ethers.BigNumber.from(userRank),
      points: ethers.BigNumber.from(points),
      checkinCount: ethers.BigNumber.from(count)
    };
  } catch (error) {
    console.error("Error getting user rank data:", error);
    return {
      rank: ethers.BigNumber.from(0),
      points: ethers.BigNumber.from(0),
      checkinCount: ethers.BigNumber.from(0)
    };
  }
};
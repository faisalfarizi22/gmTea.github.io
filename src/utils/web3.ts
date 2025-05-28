import { ethers } from "ethers";
import GMOnchainABI from "../abis/GMOnchainABI.json";
import { 
  SUPPORTED_CHAINS, 
  getChainConfig, 
  getContractAddress,
  isChainSupported,
  TEA_SEPOLIA_CHAIN_ID,
  DEPLOY_BLOCK,
  CHECKIN_FEE
} from "./constants";

/**
 * Checks if code is running in browser environment
 * Used to prevent SSR issues with window object
 */
const isBrowser = typeof window !== "undefined";

/**
 * Get Ethereum provider from window object
 * @returns Web3Provider or null if not available
 */
export const getProvider = () => {
  if (!isBrowser) return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  
  return new ethers.providers.Web3Provider(ethereum, "any");
};

/**
 * Connect to wallet and request account access
 * @returns Object containing signer, address and chainId
 */
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

/**
 * Switch to a specific chain
 * @param chainId Target chain ID
 */
export const switchToChain = async (chainId: number) => {
  try {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("No Ethereum provider found");
    
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) throw new Error(`Unsupported chain ID: ${chainId}`);
    
    // Buat objek baru dengan hanya properti standar EIP-3085
    const standardChainConfig = {
      chainId: chainConfig.chainId,
      chainName: chainConfig.chainName,
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: chainConfig.rpcUrls,
      blockExplorerUrls: chainConfig.blockExplorerUrls
    };
    
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainConfig.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Chain not added yet, add it
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [standardChainConfig], // Gunakan config yang sudah difilter
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

/**
 * Switch to Tea Sepolia network (legacy function for backward compatibility)
 */
export const switchToTeaSepolia = async () => {
  return switchToChain(TEA_SEPOLIA_CHAIN_ID);
};

/**
 * Get contract instance for specific chain
 * @param signerOrProvider Signer or Provider to use with contract
 * @param chainId Chain ID to get contract for
 * @returns Contract instance
 */
export const getContract = (
  signerOrProvider: ethers.Signer | ethers.providers.Provider, 
  chainId?: number
) => {
  let contractAddress;
  
  if (chainId) {
    contractAddress = getContractAddress(chainId);
  } else {
    // Try to get chainId from provider
    if ('provider' in signerOrProvider && signerOrProvider.provider) {
      // For signers, get the provider's network
      const provider = signerOrProvider.provider as ethers.providers.Provider;
      provider.getNetwork().then(network => {
        contractAddress = getContractAddress(network.chainId);
      }).catch(() => {
        contractAddress = getContractAddress(TEA_SEPOLIA_CHAIN_ID); // fallback
      });
    } else {
      contractAddress = getContractAddress(TEA_SEPOLIA_CHAIN_ID); // fallback
    }
  }
  
  contractAddress = contractAddress || getContractAddress(TEA_SEPOLIA_CHAIN_ID);
  
  return new ethers.Contract(contractAddress, GMOnchainABI, signerOrProvider);
};

/**
 * Helper function for delaying execution
 * @param ms Milliseconds to delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Format timestamp to human-readable date
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
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

/**
 * Format Ethereum address to shorter version
 * @param address Full Ethereum address
 * @returns Shortened address with format "0x1234...5678"
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format Ethereum address to full version
 * @param address Full Ethereum address
 * @returns Full address
 */
export const fullAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address}`;
};

/**
 * Format seconds to readable time string
 * @param seconds Time in seconds
 * @returns Formatted time string (e.g. "1d 12:34:56" or "00:45:30")
 */
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

/**
 * Check if wallet is connected
 * @returns Promise<boolean> True if wallet is connected
 */
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

/**
 * Get wallet balance
 * @param address Wallet address
 * @returns Promise<string> Formatted balance in ETH
 */
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

/**
 * Check if current network is supported
 * @returns Promise<boolean> True if on supported network
 */
export const isSupportedNetwork = async (): Promise<boolean> => {
  try {
    const provider = getProvider();
    if (!provider) return false;
    
    const network = await provider.getNetwork();
    return isChainSupported(network.chainId);
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
};

/**
 * Check if network is Tea Sepolia Testnet (legacy function)
 * @returns Promise<boolean> True if on Tea Sepolia network
 */
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

/**
 * Get current chain ID
 * @returns Promise<number | null> Current chain ID or null if not available
 */
export const getCurrentChainId = async (): Promise<number | null> => {
  try {
    const provider = getProvider();
    if (!provider) return null;
    
    const network = await provider.getNetwork();
    return network.chainId;
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return null;
  }
};

/**
 * Get total global checkins directly from blockchain
 * @param contract The contract instance
 * @returns Promise<number> Total global check-ins
 */
export const getTotalCheckins = async (contract: ethers.Contract): Promise<number> => {
  try {
    const provider = contract.provider;
    if (!provider) return 0;
    
    // Use the new event signature from the updated contract
    const eventSignature = ethers.utils.id("BeaconActivated(address,uint256,uint256,uint256,uint256,uint256)");
    
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
        // Try to get system metrics if available
        const systemMetrics = await contract.getSystemMetrics();
        if (systemMetrics && systemMetrics.totalCrystalCount) {
          console.log(`No events found, using totalCrystalCount: ${systemMetrics.totalCrystalCount}`);
          return parseInt(systemMetrics.totalCrystalCount.toString());
        }
      } catch (systemError) {
        console.warn("Error getting system metrics:", systemError);
      }
    }
    
    return totalCount;
  } catch (error) {
    console.error("Error in getTotalCheckins:", error);
    return 0;
  }
};

/**
 * Perform checkin (activateBeacon) on the contract
 * @param contract Contract instance
 * @param chainId Current chain ID
 * @returns Promise<ethers.ContractTransaction>
 */
export const performCheckin = async (
  contract: ethers.Contract, 
  chainId: number
): Promise<ethers.ContractTransaction> => {
  try {
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    
    // Get the current fee from the contract
    let currentTax;
    try {
      const systemMetrics = await contract.getSystemMetrics();
      currentTax = systemMetrics.currentTax;
    } catch (metricsError) {
      console.error("Error getting system metrics:", metricsError);
      // Fallback ke nilai default jika getSystemMetrics gagal
      currentTax = ethers.utils.parseEther(CHECKIN_FEE);
    }
    
    // Call activateBeacon with the required fee
    const tx = await contract.activateBeacon({
      value: currentTax
    });
    
    return tx;
  } catch (error) {
    console.error("Error performing checkin:", error);
    throw error;
  }
};

export { isChainSupported, getChainConfig };
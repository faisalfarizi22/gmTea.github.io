import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaLeaf, FaSpinner, FaCheckCircle, FaClock, FaWallet, 
  FaExclamationTriangle, FaStar, FaRegStar, FaFilter, FaTimes,
  FaExchangeAlt, FaMoon
} from 'react-icons/fa';
import { 
  CHECKIN_FEE,
  SUPPORTED_CHAINS, 
  getSupportedChainIds,
  getContractAddress,
  isChainSupported 
} from '@/utils/constants';
import { 
  performCheckin, 
  switchToChain, 
  getContract, 
  getProvider,
  delay
} from '@/utils/web3';
import { ethers } from 'ethers';

// Define types
type NetworkType = 'all' | 'mainnet' | 'testnet';
type FilterType = 'all' | 'available' | 'checked' | 'favorites';
type SortOptionType = 'name' | 'status';

interface ChainCheckinStatus {
  canCheckin: boolean;
  lastCheckin: number | null;
  timeUntilNextCheckin: number;
}

interface Chain {
  id: number;
  chainName: string;
  logo: string;
  status: ChainCheckinStatus;
  chainId: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  contractAddress?: string;
  [key: string]: any; // For any other properties
}

interface MultiChainCheckinGridProps {
  isConnected: boolean;
  currentChainId?: number | null;
  address?: string | null;
  signer?: ethers.Signer | null;
  provider?: ethers.providers.Web3Provider | null;
  onCheckinSuccess?: (chainId: number, txHash: string) => void;
  networkType?: NetworkType;
}

const MultiChainCheckinGrid: React.FC<MultiChainCheckinGridProps> = ({
  isConnected,
  currentChainId,
  address,
  signer,
  provider,
  onCheckinSuccess,
  networkType = 'all' // Default value
}) => {
  // States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingChainId, setProcessingChainId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successChainId, setSuccessChainId] = useState<number | null>(null);
  const [favoriteChains, setFavoriteChains] = useState<number[]>([]);
  const [chainStatusMap, setChainStatusMap] = useState<Record<number, ChainCheckinStatus>>({});
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOptionType>('name');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const [networkSwitchingChainId, setNetworkSwitchingChainId] = useState<number | null>(null);
  
  // Load favorites from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('favoriteChains');
      if (savedFavorites) {
        setFavoriteChains(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.error('Error parsing favorite chains', e);
      setFavoriteChains([]);
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favoriteChains', JSON.stringify(favoriteChains));
  }, [favoriteChains]);

  // Clear success message after timeout
  useEffect(() => {
    if (successChainId) {
      const timer = setTimeout(() => setSuccessChainId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successChainId]);

  // Clear error message after timeout
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Update timers every second
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setChainStatusMap(prevMap => {
        const newMap = { ...prevMap };
        let updated = false;

        Object.keys(newMap).forEach(chainIdStr => {
          const chainId = parseInt(chainIdStr);
          const status = newMap[chainId];
          
          if (status.timeUntilNextCheckin > 0) {
            newMap[chainId] = {
              ...status,
              timeUntilNextCheckin: status.timeUntilNextCheckin - 1
            };
            
            // If timer reached zero, update canCheckin
            if (newMap[chainId].timeUntilNextCheckin === 0) {
              newMap[chainId].canCheckin = true;
              updated = true;
            }
          }
        });

        return updated ? newMap : prevMap;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Check chain status whenever the connection state changes
  useEffect(() => {
    if (isConnected && address && signer) {
      checkAllChainsStatus();
    } else {
      // Reset statuses when disconnected
      setChainStatusMap({});
    }
  }, [isConnected, address, signer]);

  // Toggle favorite status for a chain
  const toggleFavorite = useCallback((chainId: number): void => {
    setFavoriteChains(prev => {
      if (prev.includes(chainId)) {
        return prev.filter(id => id !== chainId);
      } else {
        return [...prev, chainId];
      }
    });
  }, []);

  // Check status for all chains
  const checkAllChainsStatus = async (): Promise<void> => {
    if (!isConnected || !signer || !address) {
      console.log("Not connected or missing signer/address");
      return;
    }

    setIsLoading(true);
    const supportedChainIds = getSupportedChainIds();
    const statusMap: Record<number, ChainCheckinStatus> = {};

    try {
      // For each chain, set a default status (assuming they can check in)
      // This ensures buttons are enabled by default until we know otherwise
      supportedChainIds.forEach(chainId => {
        statusMap[chainId] = {
          canCheckin: true,
          lastCheckin: null,
          timeUntilNextCheckin: 0
        };
      });
      
      // Update the status map with these default values first
      setChainStatusMap(statusMap);

      // Proses chain dalam batch untuk menghindari rate limiting
      const BATCH_SIZE = 3;
      const DELAY_BETWEEN_REQUESTS = 500; // ms
      
      for (let i = 0; i < supportedChainIds.length; i += BATCH_SIZE) {
        const batchChainIds = supportedChainIds.slice(i, i + BATCH_SIZE);
        
        // Proses batch secara paralel
        const batchPromises = batchChainIds.map(async (chainId) => {
          try {
            // Tambahkan jeda kecil antar permintaan dalam batch
            await delay(Math.random() * 200);
            
            const contractAddress = getContractAddress(chainId);
            const abi = require("../abis/GMOnchainABI.json");
            
            const provider = new ethers.providers.JsonRpcProvider(SUPPORTED_CHAINS[chainId].rpcUrls[0]);
            const contract = new ethers.Contract(contractAddress, abi, provider);
            
            // Cek status
            let canActivate = true;
            let lastBeacon = null;
            let timeRemaining = 0;
            
            try {
              canActivate = await contract.canActivateToday(address);
              
              try {
                const metrics = await contract.getNavigatorMetrics(address);
                lastBeacon = metrics.lastBeacon.toNumber() || null;
                
                if (!canActivate) {
                  const nextResetTime = metrics.nextResetTime.toNumber();
                  const currentTime = Math.floor(Date.now() / 1000);
                  timeRemaining = Math.max(0, nextResetTime - currentTime);
                }
              } catch (metricsError) {
                console.warn(`Couldn't get detailed metrics for chain ${chainId}:`, metricsError);
              }
            } catch (error) {
              console.error(`Error checking status for chain ${chainId}:`, error);
              // Untuk chain yang tidak bisa diperiksa, gunakan nilai default
            }
            
            return {
              chainId,
              status: {
                canCheckin: canActivate,
                lastCheckin: lastBeacon,
                timeUntilNextCheckin: timeRemaining
              }
            };
          } catch (error) {
            console.error(`Error checking status for chain ${chainId}:`, error);
            return { chainId, status: statusMap[chainId] };
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Update statusMap dengan hasil batch
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            statusMap[result.value.chainId] = result.value.status;
          }
        });
        
        // Update UI setelah setiap batch
        setChainStatusMap({...statusMap});
        
        // Tambahkan jeda antar batch untuk menghindari rate limiting
        if (i + BATCH_SIZE < supportedChainIds.length) {
          await delay(DELAY_BETWEEN_REQUESTS);
        }
      }
    } catch (error) {
      console.error("Error checking chain statuses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle checkin for a specific chain
  const handleCheckin = async (chainId: number): Promise<void> => {
    // Cek apakah kita bisa melakukan transaksi
    if (!isConnected || !signer || processingChainId !== null) {
      console.log("Not connected, missing signer, or already processing");
      return;
    }
    
    try {
      // Set state untuk menunjukkan proses sedang berjalan
      setProcessingChainId(chainId);
      setErrorMessage(null);
      
      // Cek apakah perlu switch network
      if (currentChainId !== chainId) {
        try {
          setNetworkSwitchingChainId(chainId);
          console.log(`Switching to chain ${chainId} from ${currentChainId}`);
          
          // Switch network
          await switchToChain(chainId);
          
          // Tunggu sebentar agar wallet benar-benar berpindah
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
        } catch (switchError: any) {
          console.error("Error switching network:", switchError);
          setErrorMessage(`Failed to switch to ${SUPPORTED_CHAINS[chainId].chainName}: ${switchError.message}`);
          setProcessingChainId(null);
          setNetworkSwitchingChainId(null);
          return;
        } finally {
          setNetworkSwitchingChainId(null);
        }
      }
      
      // Dapatkan provider dan signer yang fresh setelah switch network
      const updatedProvider = getProvider();
      if (!updatedProvider) {
        throw new Error("Provider not available after network switch");
      }
      
      const updatedSigner = updatedProvider.getSigner();
      
      // Dapatkan contract untuk chain ini
      const contract = getContract(updatedSigner, chainId);
      
      console.log(`Performing checkin on chain ${chainId}`);
      
      // Log parameter-parameter penting untuk debugging
      console.log("Before performCheckin:", { 
        contract, 
        chainId, 
        checkinFee: CHECKIN_FEE
      });
      
      // Kirim transaksi
      const tx = await performCheckin(contract, chainId);
      console.log("Transaction sent:", tx.hash);
      
      // Segera anggap sebagai sukses setelah hash transaksi diterima
      // Tidak perlu menunggu konfirmasi untuk update UI
      if (tx.hash) {
        console.log("Transaction hash received:", tx.hash);
        
        // Update success state
        setSuccessChainId(chainId);
        
        // Update chain status
        setChainStatusMap(prev => ({
          ...prev,
          [chainId]: {
            ...prev[chainId],
            canCheckin: false,
            lastCheckin: Math.floor(Date.now() / 1000),
            timeUntilNextCheckin: 24 * 60 * 60 // Approximate 24 hours
          }
        }));
        
        // Panggil callback onCheckinSuccess
        if (onCheckinSuccess) {
          onCheckinSuccess(chainId, tx.hash);
        }
        
        // Tunggu konfirmasi di background tanpa blocking UI
        tx.wait()
          .then(receipt => {
            console.log("Transaction confirmed:", receipt);
          })
          .catch(error => {
            console.warn("Error waiting for receipt, but transaction was sent:", error);
          });
      } else {
        throw new Error("Failed to get transaction hash");
      }
    } catch (error: any) {
      console.error("Error performing checkin:", error);
      setErrorMessage(error.message || "Failed to send GM");
    } finally {
      // Selalu reset processing state
      setProcessingChainId(null);
    }
  };

  // Format time string
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "Available";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  // Check if a chain is testnet or mainnet
  const isTestnet = (chain: Chain): boolean => {
    return chain.chainName.toLowerCase().includes('testnet') || 
           chain.chainName.toLowerCase().includes('sepolia') ||
           chain.chainName.toLowerCase().includes('goerli') ||
           chain.chainName.toLowerCase().includes('mumbai') ||
           chain.chainName.toLowerCase().includes('alfajores') ||
           chain.chainName.toLowerCase().includes('fuji') ||
           chain.chainName.toLowerCase().includes('holesky') ||
           chain.id === 11155111 || // Sepolia
           chain.id === 5 ||       // Goerli
           chain.id === 80001 ||   // Mumbai
           chain.id === 43113 ||   // Fuji
           chain.id === 17000;     // Holesky
  };
  
  // Get all supported chains
  const supportedChains: Chain[] = getSupportedChainIds().map(id => ({
    id,
    ...SUPPORTED_CHAINS[id],
    status: chainStatusMap[id] || {
      canCheckin: true,
      lastCheckin: null,
      timeUntilNextCheckin: 0
    }
  }));

  // Filter and sort chains
  const getFilteredAndSortedChains = (): Chain[] => {
    let filteredChains = [...supportedChains];
    
    // Filter berdasarkan tipe jaringan (mainnet/testnet)
    if (networkType !== 'all') {
      filteredChains = filteredChains.filter(chain => {
        if (networkType === 'testnet') {
          return isTestnet(chain);
        } else {
          return !isTestnet(chain);
        }
      });
    }
    
    // Apply filters
    switch (filter) {
      case 'available':
        filteredChains = filteredChains.filter(chain => 
          chain.status.canCheckin && chain.status.timeUntilNextCheckin === 0
        );
        break;
      case 'checked':
        filteredChains = filteredChains.filter(chain => 
          !chain.status.canCheckin || chain.status.timeUntilNextCheckin > 0
        );
        break;
      case 'favorites':
        filteredChains = filteredChains.filter(chain => 
          favoriteChains.includes(chain.id)
        );
        break;
    }
    
    // Apply sorting
    switch (sortOption) {
      case 'name':
        filteredChains.sort((a, b) => a.chainName.localeCompare(b.chainName));
        break;
      case 'status':
        filteredChains.sort((a, b) => {
          // Available chains first
          if (a.status.canCheckin && !b.status.canCheckin) return -1;
          if (!a.status.canCheckin && b.status.canCheckin) return 1;
          
          // Then sort by time remaining
          return a.status.timeUntilNextCheckin - b.status.timeUntilNextCheckin;
        });
        break;
    }
    
    return filteredChains;
  };
  
  const filteredChains = getFilteredAndSortedChains();

  // Count available chains
  const availableChainCount = filteredChains.filter(
    chain => chain.status.canCheckin && chain.status.timeUntilNextCheckin === 0
  ).length;

  // Get network icon and colors based on network type
  const getNetworkConfig = () => {
    switch (networkType) {
      case 'testnet':
        return {
          icon: FaLeaf,
          gradient: 'from-blue-500/10 to-emerald-500/10',
          textColor: 'text-blue-600 dark:text-blue-400',
          badgeColor: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
        };
      case 'mainnet':
        return {
          icon: FaLeaf,
          gradient: 'from-emerald-500/10 to-blue-500/10',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          badgeColor: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
        };
      default:
        return {
          icon: FaLeaf,
          gradient: 'from-blue-500/8 to-emerald-500/8',
          textColor: 'text-slate-700 dark:text-slate-300',
          badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        };
    }
  };

  const networkConfig = getNetworkConfig();
  const NetworkIcon = networkConfig.icon;

  return (
    <div className="w-full pt-10">
      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mr-3">
              <NetworkIcon className="text-white" size={16} />
            </div> 
            {networkType === 'testnet' ? 'Testnet Networks' : networkType === 'mainnet' ? 'Mainnet Networks' : 'All Networks'}
            <div className={`ml-3 ${networkConfig.badgeColor} text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm border border-current/20`}>
              {availableChainCount} Available
            </div>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Say GM across multiple blockchain networks daily</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative">
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700/60 transition-all duration-200 shadow-sm"
            >
              <FaFilter className="text-slate-500" size={14} />
              <span>Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
            </button>
            
            <AnimatePresence>
              {isFilterMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-44 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-xl shadow-lg z-20"
                >
                  <div className="py-2">
                    {['all', 'available', 'checked', 'favorites'].map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setFilter(option as FilterType);
                          setIsFilterMenuOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2.5 text-sm transition-all duration-200 ${
                          filter === option 
                            ? `${networkConfig.badgeColor} font-medium` 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOptionType)}
            className="px-4 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200 shadow-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
          </select>
          
          <button 
            onClick={checkAllChainsStatus}
            disabled={isLoading || !isConnected}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm ${
              isLoading 
                ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700' 
                : 'bg-gradient-to-r from-blue-500/10 to-emerald-500/10 backdrop-blur-xl text-slate-700 dark:text-slate-300 hover:from-blue-500/20 hover:to-emerald-500/20 border border-blue-200/50 dark:border-emerald-400/30'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <FaSpinner className="animate-spin" size={14} />
                Refreshing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </span>
            )}
          </button>
        </motion.div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-6 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10 backdrop-blur-xl border border-red-200/50 dark:border-red-700/30 rounded-2xl p-4 text-red-600 dark:text-red-300 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <FaExclamationTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm">{errorMessage}</div>
              <button 
                onClick={() => setErrorMessage(null)}
                className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/30 transition-all duration-200"
              >
                <FaTimes size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not Connected Message */}
      {!isConnected && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-blue-50/50 to-emerald-50/50 dark:from-blue-900/10 dark:to-emerald-900/10 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-xl p-6 mb-8 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <FaWallet className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Wallet Required</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Connect your wallet to say GM on multiple blockchain networks and start your daily journey.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* No Results Message */}
      {isConnected && filteredChains.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12 px-6 bg-white/40 dark:bg-slate-800/20 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center">
            <FaMoon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            {filter === 'favorites' 
              ? "No favorite chains yet. Add some by clicking the star icon." 
              : filter === 'available' 
                ? `No available chains to say GM right now in ${networkType === 'testnet' ? 'testnet' : networkType === 'mainnet' ? 'mainnet' : 'any'} networks.`
                : filter === 'checked'
                  ? "You haven't said GM on any chains yet."
                  : "No chains match your filters."}
          </p>
        </motion.div>
      )}

      {/* Chain Grid - 5 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredChains.map((chain, index) => {
          const chainStatus = chain.status;
          const isCurrentChain = currentChainId === chain.id;
          const isProcessing = processingChainId === chain.id;
          const isSuccess = successChainId === chain.id;
          const isFavorite = favoriteChains.includes(chain.id);
          const canActivateNow = chainStatus.canCheckin && chainStatus.timeUntilNextCheckin === 0;
          const isSwitchingToThisChain = networkSwitchingChainId === chain.id;
          
          return (
            <motion.div 
              key={chain.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className={`rounded-xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${
                isCurrentChain 
                  ? 'border border-blue-200 dark:border-blue-400/50 bg-gradient-to-br from-blue-50/60 to-emerald-50/60 dark:from-blue-900/70 dark:to-emerald-900/70 shadow-md'
                  : 'border border-gray-200/60 dark:border-slate-700/60 bg-emerald-50/30 dark:bg-cyan-900/30 hover:shadow-md shadow-sm'
              } ${isSuccess ? 'ring-2 ring-emerald-400/40' : ''}`}
            >
              <div className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                        isCurrentChain 
                          ? 'bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900 dark:to-emerald-900/30' 
                          : 'bg-gray-100 dark:bg-slate-700/50'
                      } transition-all duration-300`}>
                        <span className="text-lg">{chain.logo}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">{chain.chainName}</h3>
                        <div className="flex items-center mt-1">
                          {chainStatus.timeUntilNextCheckin > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/30 flex items-center gap-1">
                              <FaClock className="w-2 h-2" />
                              {formatTime(chainStatus.timeUntilNextCheckin)}
                            </span>
                          ) : chainStatus.canCheckin ? (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/30">
                              Ready
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/30">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(chain.id)}
                      className="text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400 transition-all duration-200 p-1 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                      aria-label={`Toggle favorite for ${chain.chainName}`}
                    >
                      {isFavorite ? (
                        <FaStar className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      ) : (
                        <FaRegStar className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isConnected && canActivateNow && !isProcessing && !isLoading) {
                      handleCheckin(chain.id);
                    }
                  }}
                  className={`w-full mt-3 py-3 px-4 text-sm font-medium flex items-center justify-center transition-all duration-300 rounded-xl shadow-md ${
                    !isConnected || !canActivateNow || processingChainId !== null || isLoading
                      ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-400/80 to-emerald-400 hover:from-blue-600 hover:to-emerald-600 text-white shadow-md hover:shadow-md'
                  }`}
                  disabled={!isConnected || !canActivateNow || processingChainId !== null || isLoading}
                >
                  {isProcessing || isSwitchingToThisChain ? (
                    <>
                      <FaSpinner className="animate-spin h-4 w-4 mr-2" />
                      <span>{isSwitchingToThisChain ? 'Switching...' : 'Sending...'}</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <FaCheckCircle className="h-4 w-4 mr-2" />
                      <span>GM Sent!</span>
                    </>
                  ) : !isConnected ? (
                    <>
                      <FaWallet className="h-4 w-4 mr-2" />
                      <span>Connect Wallet</span>
                    </>
                  ) : chainStatus.timeUntilNextCheckin > 0 ? (
                    <>
                      <FaClock className="h-4 w-4 mr-2" />
                      <span>Wait {formatTime(chainStatus.timeUntilNextCheckin)}</span>
                    </>
                  ) : canActivateNow ? (
                    <>
                      <span>GM on {chain.chainName}</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="h-4 w-4 mr-2" />
                      <span>Already GM'd</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MultiChainCheckinGrid;
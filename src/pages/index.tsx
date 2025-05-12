import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers, BigNumber } from 'ethers';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import CountdownTimer from '@/components/CountdownTimer';
import CheckinButton from '@/components/CheckinButton';
import GMMessageList from '@/components/GMMessageList';
import WalletRequired from '@/components/WalletRequired';
import ForumOverlay from '@/components/ForumOverlay';
import Leaderboard from '@/components/Leaderboard';
import { useEthereumEvents } from '@/hooks/useEthereumEvents';
import { GMMessage, Web3State, CheckinStats } from '@/types';
import { getUserHighestTier, getUserBadges } from '@/utils/badgeWeb3';
import { 
  connectWallet, 
  getProvider, 
  getContract, 
  switchToTeaSepolia,
  getTotalCheckins
} from '@/utils/web3';
import { CHECKIN_FEE, TEA_SEPOLIA_CHAIN_ID } from '@/utils/constants';
import { 
  FaLeaf, 
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
  FaNetworkWired,
  FaTrophy,
  FaMedal
} from 'react-icons/fa';

import BadgeMintSection from '@/components/BadgeMintSection';
import { useRouter } from 'next/router';
import AudioPlayer from '@/components/AudioPlayer';
import Footer from '@/components/Footer';



// Notification type
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UserBadge {
  tokenId: number;
  tier: number;
  mintedAt: number;
  transactionHash?: string; // optional jika kadang-kadang ada
}

export default function Home() {
  // Web3 state
  const [web3State, setWeb3State] = useState<Web3State>({
    isConnected: false,
    address: null,
    provider: null,
    signer: null,
    contract: null,
    isLoading: false,
    error: null,
    chainId: null,
  });

  // UI state
  const [checkinStats, setCheckinStats] = useState<CheckinStats>({
    userCheckinCount: 0,
    timeUntilNextCheckin: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<GMMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isCheckinLoading, setIsCheckinLoading] = useState<boolean>(false);
  const [showNetworkAlert, setShowNetworkAlert] = useState<boolean>(false);
  const [globalCheckinCount, setGlobalCheckinCount] = useState<number>(0);
  const [isLoadingGlobalCount, setIsLoadingGlobalCount] = useState<boolean>(false);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);

  // Forum state - keep for future implementation but removed floating button
  const [isForumOpen, setIsForumOpen] = useState(false);
  
  // Reference to leaderboard section for scrolling
  const leaderboardRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll to leaderboard
  const scrollToLeaderboard = () => {
    if (leaderboardRef.current) {
      // Add a small delay to ensure smooth scrolling after any state changes
      setTimeout(() => {
        leaderboardRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  };

  const badgeMintSectionRef = useRef<HTMLDivElement>(null);

// Function to scroll to the badge mint section
const scrollToMintSection = useCallback(() => {
  if (badgeMintSectionRef.current) {
    // Add a small delay to ensure smooth scrolling after any state changes
    setTimeout(() => {
      const navbarHeight = 80; // Approximate height of navbar
      const yOffset = -navbarHeight; // Account for fixed navbar
      
      // Safe check if the element is still available
      if (badgeMintSectionRef.current) {
        const element = badgeMintSectionRef.current;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
      }
    }, 100);
  }
}, []);

useEffect(() => {
  const loadBadgeData = async () => {
    if (web3State.address) {
      try {
        const badges = await getUserBadges(web3State.address);
        setUserBadges(badges);
        console.log("Loaded user badges:", badges);
      } catch (error) {
        console.error("Error loading user badges:", error);
        setUserBadges([]);
      }
    }
  };
  
  if (web3State.isConnected && web3State.address) {
    loadBadgeData();
  }
}, [web3State.isConnected, web3State.address]);
  

  // Inside your Home component
const router = useRouter();

const handleMintClick = () => {
  router.push('/mint'); // Navigate to your mint page
};


  // Notification functions
  const addNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Load user data
  const loadUserData = useCallback(async (address: string, contract: ethers.Contract) => {
    try {
      let count: number | BigNumber = 0;
      try {
        count = await contract.getCheckinCount(address);
      } catch (e) {
        console.warn("Error calling getCheckinCount with address", e);
        
        try {
          const userData = await contract.userCheckins(address);
          if (userData && userData.checkinCount) {
            count = userData.checkinCount;
          }
        } catch (mappingError) {
          console.warn("Error accessing userCheckins mapping", mappingError);
          count = 0;
        }
      }
      
      // Get time until next checkin
      let timeRemaining: number | BigNumber = 0;
      try {
        timeRemaining = await contract.timeUntilNextCheckin(address);
      } catch (e) {
        console.warn("Error calling timeUntilNextCheckin", e);
        
        try {
          const userData = await contract.userCheckins(address);
          if (userData && userData.lastCheckinTime) {
            const lastCheckinTime = BigNumber.isBigNumber(userData.lastCheckinTime) 
              ? userData.lastCheckinTime.toNumber() 
              : Number(userData.lastCheckinTime);
            
            if (lastCheckinTime > 0) {
              const nextCheckinTime = lastCheckinTime + 24 * 60 * 60; 
              const currentTime = Math.floor(Date.now() / 1000); 
              
              if (currentTime < nextCheckinTime) {
                timeRemaining = nextCheckinTime - currentTime;
              } else {
                timeRemaining = 0;
              }
            } else {
              timeRemaining = 0;
            }
          }
        } catch (mappingError) {
          console.warn("Error calculating timeRemaining", mappingError);
          timeRemaining = 0;
        }
      }
      
      setCheckinStats({
        userCheckinCount: BigNumber.isBigNumber(count) ? count.toNumber() : Number(count),
        timeUntilNextCheckin: BigNumber.isBigNumber(timeRemaining) ? timeRemaining.toNumber() : Number(timeRemaining),
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setCheckinStats({
        userCheckinCount: 0,
        timeUntilNextCheckin: 0,
      });
    }
  }, []);

  // Load recent messages
  const loadRecentMessages = useCallback(async (contract: ethers.Contract) => {
    try {
      setIsLoadingMessages(true);
      
      // First check if we have cached messages
      const cachedMessages = localStorage.getItem('gmtea_recentMessages');
      let parsedMessages: GMMessage[] = [];
      let cacheValid = false;
      
      if (cachedMessages) {
        try {
          const parsed = JSON.parse(cachedMessages);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 10 * 60 * 1000) { // 10 minute cache
            parsedMessages = parsed.data;
            cacheValid = true;
            
            // Show cached messages immediately
            setMessages(parsedMessages);
            setIsLoadingMessages(false);
          }
        } catch (e) {
          console.warn("Error parsing cached messages:", e);
        }
      }
      
      // Set up a timeout for the fetch operation
      const messagesPromise = contract.getRecentGMs();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Loading messages timeout")), 15000)
      );
      
      // Try to fetch fresh data
      try {
        const recentGMs = await Promise.race([messagesPromise, timeoutPromise]);
        
        if (Array.isArray(recentGMs)) {
          const formattedMessages = recentGMs.map(msg => ({
            user: msg.user,
            timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : 
                      msg.timestamp?.toNumber() || 0,
            message: msg.message || 'GM!'
          }));
            
          setMessages(formattedMessages);
          
          // Cache the messages
          localStorage.setItem('gmtea_recentMessages', JSON.stringify({
            data: formattedMessages,
            timestamp: Date.now()
          }));
        } else {
          console.error("Invalid messages format:", recentGMs);
          // Keep using cached messages if available
          if (!cacheValid) {
            setMessages([]);
          }
        }
      } catch (error) {
        console.error('Error loading recent messages:', error);
        
        // If timeout occurred but we have cached messages, keep showing them
        if (cacheValid) {
          // Just keep the cached messages visible and show a subtle notification
          const timeoutNotification = document.getElementById('timeout-notification');
          if (timeoutNotification) {
            timeoutNotification.classList.remove('hidden');
            setTimeout(() => {
              timeoutNotification.classList.add('hidden');
            }, 5000);
          }
        } else {
          // If no cache is available, show fallback messages
          if (web3State.isConnected) {
            setMessages([
              {
                user: "0x1234567890123456789012345678901234567890",
                timestamp: Math.floor(Date.now() / 1000) - 3600,
                message: "GM from the Tea community! 🍵"
              },
              {
                user: "0x0987654321098765432109876543210987654321",
                timestamp: Math.floor(Date.now() / 1000) - 7200,
                message: "Starting the day with a fresh cup of Tea! ☕"
              }
            ]);
          } else {
            setMessages([]);
          }
        }
      } finally {
        setIsLoadingMessages(false);
      }
    } catch (error) {
      console.error('Error in loadRecentMessages:', error);
      setIsLoadingMessages(false);
      setMessages([]);
    }
  }, [web3State.isConnected]);

  // Load global count
  const loadGlobalCount = useCallback(async () => {
    if (!web3State.contract) return;
    
    try {
      setIsLoadingGlobalCount(true);
      
      console.log("Loading global check-in count...");
      const count = await getTotalCheckins(web3State.contract);
      console.log("Global check-in count:", count);
      
      if (count > 0) {
        setGlobalCheckinCount(count);
      }
    } catch (error) {
      console.error("Error loading global check-in count:", error);
    } finally {
      setIsLoadingGlobalCount(false);
    }
  }, [web3State.contract]);

  // Connect wallet function
  const handleConnectWallet = useCallback(async () => {
    if (web3State.isLoading) return;
    
    try {
      console.log("handleConnectWallet called - starting wallet connection");
      setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }));
    
      // Check if already connected through ThirdwebProvider
      const ethereum = (window as any).ethereum;
      let address, provider, signer, chainId;
      
      if (ethereum && ethereum.selectedAddress) {
        // Wallet already connected through ThirdwebProvider
        address = ethereum.selectedAddress;
        provider = new ethers.providers.Web3Provider(ethereum);
        signer = provider.getSigner();
        chainId = parseInt(ethereum.chainId, 16); // Convert from hex
        
        console.log("Using already connected wallet:", address);
      } else {
        // Not connected, use normal connectWallet function
        const result = await connectWallet();
        
        if (!result || !result.address) {
          throw new Error("Failed to connect: No address returned");
        }
        
        ({ signer, address, chainId, provider } = result);
      }
      
      console.log("Wallet connected successfully:", address);
      
      const isCorrectNetwork = chainId === TEA_SEPOLIA_CHAIN_ID;
      setShowNetworkAlert(!isCorrectNetwork);
    
      const contract = getContract(signer);
      
      // Update state
      setWeb3State({
        isConnected: true,
        address,
        provider,
        signer,
        contract,
        isLoading: false,
        error: null,
        chainId,
      });
      
      console.log("Web3 state updated - isConnected:", true);
      
      // Set to localStorage for persistence
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAddress', address);
      
      // Load user data
      if (isCorrectNetwork) {
        await Promise.all([
          loadUserData(address, contract),
          loadRecentMessages(contract)
        ]);
      }
      
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      setWeb3State((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error.message || 'Failed to connect wallet',
      }));
      
      // Clear any stored connection data
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('walletAddress');
    }
  }, [web3State.isLoading, loadUserData, loadRecentMessages]);

  // Disconnect wallet function
  const handleDisconnectWallet = useCallback(() => {
    // Reset web3 state
    setWeb3State({
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      contract: null,
      isLoading: false,
      error: null,
      chainId: null,
    });
    
    // Reset UI state
    setCheckinStats({
      userCheckinCount: 0,
      timeUntilNextCheckin: 0,
    });
    setMessages([]);
    setShowNetworkAlert(false);
    
    // Clear local storage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    
    console.log('Wallet disconnected');
  }, []);

  // Handle checkin
  const handleCheckin = async (message: string) => {
    if (!web3State.contract || !web3State.isConnected) return;
    
    try {
      setIsCheckinLoading(true);
      
      const provider = getProvider();
      if (!provider) throw new Error("Provider not found");
      
      const signer = provider.getSigner();
      const contract = getContract(signer);
      
      const gasLimit = await contract.estimateGas.checkIn(message, {
        value: ethers.utils.parseEther(CHECKIN_FEE),
      });
      
      const bufferedGasLimit = gasLimit.mul(120).div(100);
      
      addNotification("Sending your GM to the blockchain...", "info");
      
      const tx = await contract.checkIn(message, {
        value: ethers.utils.parseEther(CHECKIN_FEE),
        gasLimit: bufferedGasLimit,
      });

      console.log("Transaction sent:", tx.hash);
      
      addNotification("Transaction sent! Waiting for confirmation...", "info");
      
      await tx.wait();
      
      console.log("Transaction confirmed");
      
      if (web3State.address) {
        // Reload user data and recent messages
        await Promise.all([
          loadUserData(web3State.address, contract),
          loadRecentMessages(contract)
        ]);
        
        // Update global checkin count after a successful checkin
        // Increment the current count by 1 for immediate feedback
        setGlobalCheckinCount(prevCount => prevCount + 1);
        
        // Also trigger a refresh of the actual count from blockchain
        // but don't await it so UI stays responsive
        setTimeout(() => {
          loadGlobalCount();
        }, 2000);
        
        addNotification("GM successfully posted! ☀️ Have a tea-riffic day!", "success");
      }
      
    } catch (error: any) {
      console.error('Error checking in:', error);
      
      // Handle error
      let errorMessage = "Failed to check in";
      
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Transaction taking too long. Check network status.";
      } else if (error.message.includes("gas")) {
        errorMessage = "Gas estimation failed. The network might be congested.";
      }
      
      addNotification(errorMessage, "error");
    } finally {
      setIsCheckinLoading(false);
    }
  };

  // Switch network function
  const handleSwitchNetwork = useCallback(async () => {
    try {
      setWeb3State(prev => ({ ...prev, isLoading: true }));
      
      await switchToTeaSepolia();
      setShowNetworkAlert(false);
      
      // Reconnect with correct network
      await handleConnectWallet();
    } catch (error) {
      console.error('Error switching network:', error);
      setWeb3State(prev => ({ ...prev, isLoading: false }));
    }
  }, [handleConnectWallet]);

  // Forum handlers - kept for future implementation
  const openForum = useCallback(() => {
    setIsForumOpen(true);
  }, []);
  
  const closeForum = useCallback(() => {
    setIsForumOpen(false);
  }, []);
  
  // For debugging
  useEffect(() => {
    console.log("Web3 state updated:", {
      isConnected: web3State.isConnected,
      address: web3State.address,
      chainId: web3State.chainId
    });
  }, [web3State.isConnected, web3State.address, web3State.chainId]);

  // Attempt to reconnect wallet on page load
  useEffect(() => {
    const checkPreviousConnection = async () => {
      try {
        const wasConnected = localStorage.getItem('walletConnected') === 'true';
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (wasConnected && storedAddress && !web3State.isConnected && !web3State.isLoading) {
          const ethereum = (window as any).ethereum;
          if (!ethereum) return;
          
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0 && accounts.includes(storedAddress.toLowerCase())) {
            await handleConnectWallet();
          } else {
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
          }
        }
      } catch (error) {
        console.error('Error checking previous connection:', error);
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
      }
    };
    
    const timer = setTimeout(() => {
      checkPreviousConnection();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [handleConnectWallet, web3State.isConnected, web3State.isLoading]);

  // Ensure contract is properly initialized
  useEffect(() => {
    if (web3State.isConnected && web3State.address && !web3State.contract) {
      try {
        const provider = getProvider();
        if (provider) {
          const signer = provider.getSigner();
          const contract = getContract(signer);
          
          setWeb3State(prev => ({
            ...prev,
            contract,
            signer,
            provider
          }));
        }
      } catch (error) {
        console.error("Error initializing contract:", error);
      }
    }
  }, [web3State.isConnected, web3State.address, web3State.contract]);

  // Use Ethereum Events hook
  useEthereumEvents({
    accountsChanged: (accounts) => {
      if (accounts.length === 0) {
        handleDisconnectWallet();
      } else if (web3State.address !== accounts[0] && web3State.isConnected) {
        handleConnectWallet();
      }
    },
    chainChanged: () => {
      window.location.reload();
    },
    disconnect: () => {
      handleDisconnectWallet();
    },
  });

  // Load user data and recent messages
  useEffect(() => {
    if (!web3State.isConnected || !web3State.address || !web3State.contract) return;
    
    console.log("Setting up user data refresh interval");
    
    // Initial data load
    const loadInitialUserData = async () => {
      try {
        await Promise.all([
          loadUserData(web3State.address as string, web3State.contract),
          loadRecentMessages(web3State.contract)
        ]);
      } catch (error) {
        console.error("Error loading initial user data:", error);
      }
    };
    
    // Execute initial load
    loadInitialUserData();
    
    // Set up refresh interval for user data
    const userDataInterval = setInterval(() => {
      if (web3State.address && web3State.contract) {
        loadUserData(web3State.address, web3State.contract);
        loadRecentMessages(web3State.contract);
      }
    }, 30000); // Refresh user data every 30 seconds
    
    // Clean up interval when component unmounts or deps change
    return () => {
      clearInterval(userDataInterval);
    };
  }, [web3State.isConnected, web3State.address, web3State.contract, loadUserData, loadRecentMessages]);

  // Separate useEffect for global count refresh
  useEffect(() => {
    if (!web3State.contract) return;
    
    console.log("Setting up global count refresh interval");
    
    // Initial global count load
    loadGlobalCount();
    
    // Set up refresh interval for global count
    const globalCountInterval = setInterval(() => {
      if (web3State.contract) {
        loadGlobalCount();
      }
    }, 5 * 60 * 1000); // Refresh global count every 5 minutes
    
    // Clean up interval when component unmounts or deps change
    return () => {
      clearInterval(globalCountInterval);
    };
  }, [web3State.contract, loadGlobalCount]);

  return (
    <div className="min-h-screen tea-leaf-pattern">
      <Navbar 
        address={web3State.address} 
        connectWallet={handleConnectWallet}
        disconnectWallet={handleDisconnectWallet}
        isConnecting={web3State.isLoading}
        scrollToLeaderboard={scrollToLeaderboard}
        scrollToMintSection={scrollToMintSection}
      />
      
      <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Network alert */}
        {showNetworkAlert && (
          <div className="mb-6 rounded-xl overflow-hidden">
            <div className="bg-yellow-500 bg-gradient-to-r from-yellow-500 to-amber-500 p-4 border-l-4 border-yellow-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaNetworkWired className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-white">
                    Please switch to the Tea Sepolia Testnet to continue using this application.
                  </p>
                </div>
                <div>
                  <button
                    onClick={handleSwitchNetwork}
                    className="px-4 py-1.5 rounded-lg bg-white text-yellow-700 text-sm font-medium hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Switch Network
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <WalletRequired 
          isConnected={web3State.isConnected}
          connectWallet={handleConnectWallet}
          isConnecting={web3State.isLoading}
        >
          {/* Original layout - Stats on left, Activity feed on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stats Section */}
            <div className="lg:col-span-5 space-y-6">
              <StatsCard 
                address={web3State.address}
                timeUntilNextCheckin={checkinStats.timeUntilNextCheckin}
              />
              
              <CountdownTimer 
                initialSeconds={checkinStats.timeUntilNextCheckin} 
                onComplete={() => {
                  if (web3State.address && web3State.contract) {
                    loadUserData(web3State.address, web3State.contract);
                  }
                }}
              />
              
              <CheckinButton 
                canCheckin={checkinStats.timeUntilNextCheckin <= 0}
                onCheckin={handleCheckin}
                isLoading={isCheckinLoading}
              />
            </div>
            
            {/* Activity Feed Section */}
            <div className="lg:col-span-7">
              <GMMessageList 
                messages={messages}
                isLoading={isLoadingMessages}
                onRefresh={() => web3State.contract && loadRecentMessages(web3State.contract)}
              />
            </div>
          </div>
          
          {/* Badge Mint Section */}
          {web3State.isConnected && (
            <div ref={badgeMintSectionRef} className="badge-mint-section" data-section="badge-mint">
              <div className="pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 flex items-center">
                     
                  </h2>
                  <div className="flex-1 mx-4 relative">
                    <div className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-70"></div>
                    {/* Animated light effect */}
                    <div 
                      className="absolute top-0 h-px w-20 bg-emerald-300 animate-gradient-x" 
                      style={{
                        boxShadow: '0 0 8px 1px rgba(16, 185, 129, 0.6)',
                        background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent)'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Contracts section with Coming Soon overlay */}
                <div className="relative">
                  {/* Coming Soon Overlay for Contracts */}
                  <div className="absolute inset-0 z-10 backdrop-blur-lg bg-emerald-900/40 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <h2 className="text-emerald-300 text-xl font-bold tracking-wider">COMING SOON</h2>
                      <p className="text-emerald-200/80 mt-1 text-sm">under development</p>
                    </div>
                  </div>
                
                <BadgeMintSection 
                  address={web3State.address || ''} 
                  signer={web3State.signer}
                  badges={userBadges} // Tambahkan prop badges
                  onMintComplete={async () => {
                    // Refresh data after successful mint
                    if (web3State.contract) {
                      // Refresh global count data
                      loadGlobalCount();
                      
                      // Refresh user data if available
                      if (web3State.address) {
                        // Refresh basic user data
                        loadUserData(web3State.address, web3State.contract);
                        
                        // Specifically refresh badge ownership data
                        try {
                          // Refresh highest tier data
                          const newHighestTier = await getUserHighestTier(web3State.address);
                          console.log("Updated highest badge tier:", newHighestTier);
                          
                          // Refresh user badges collection
                          const updatedBadges = await getUserBadges(web3State.address);
                          console.log("Updated badge collection:", updatedBadges);
                          
                          // Update user badges state
                          setUserBadges(updatedBadges);
                          
                          // Update any cached badge data
                          localStorage.removeItem(`gmtea_highestTier_${web3State.address.toLowerCase()}`);
                          localStorage.removeItem(`gmtea_userBadges_${web3State.address.toLowerCase()}`);
                          
                          // Dispatch a custom event that other components can listen for
                          const badgeUpdateEvent = new CustomEvent('badgeUpdate', { 
                            detail: { 
                              address: web3State.address,
                              highestTier: newHighestTier,
                              badges: updatedBadges
                            } 
                          });
                          window.dispatchEvent(badgeUpdateEvent);
                        } catch (error) {
                          console.error("Error refreshing badge data:", error);
                        }
                      }
                      
                      // Reload recent messages to show any mint events
                      loadRecentMessages(web3State.contract);
                      
                      console.log("Dashboard data and badge ownership refreshed after successful mint");
                    }
                  }}
                />
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Section - with ref for scrolling */}
          {/* Leaderboard Section - with ref for scrolling */}
            <div ref={leaderboardRef} className="mt-8 pt-4 scroll-mt-28">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 flex items-center">
                  <div className="relative">
                    <FaTrophy className="mr-2 text-emerald-500" /> 
                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
                  </div>  
                  Community Leaderboard
                </h2>
              </div>
              
              <Leaderboard 
                currentUserAddress={web3State.address}
              />
            </div>

          {/* Audio Player - Fixed position */}
          <AudioPlayer initialVolume={0.3} />

        </WalletRequired>
      </main>
      
      <Footer/>

      {/* Forum Overlay - kept for future implementation */}
      <ForumOverlay 
        isOpen={isForumOpen}
        onClose={closeForum}
      /> 

      {/* Notification container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 flex flex-col items-end">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`max-w-md rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
              notification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500' :
              notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500' :
              notification.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' :
              'bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500'
            }`}
          >
            <div className="p-4 flex">
              <div className="flex-shrink-0">
                {notification.type === 'success' && <FaCheckCircle className="h-5 w-5 text-emerald-500" />}
                {notification.type === 'error' && <FaExclamationCircle className="h-5 w-5 text-red-500" />}
                {notification.type === 'info' && <FaInfoCircle className="h-5 w-5 text-blue-500" />}
                {notification.type === 'warning' && <FaExclamationCircle className="h-5 w-5 text-orange-500" />}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                  notification.type === 'error' ? 'text-red-700 dark:text-red-300' :
                  notification.type === 'info' ? 'text-blue-700 dark:text-blue-300' :
                  'text-orange-700 dark:text-orange-300'
                }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-4 inline-flex text-gray-400 focus:outline-none focus:text-gray-500 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-emerald-500 dark:bg-emerald-600 animate-[progress_5s_linear_forwards]"></div>
          </div>
        ))}
      </div>
    </div>
  );
}


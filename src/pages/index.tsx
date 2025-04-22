import React, { useState, useEffect, useCallback } from 'react';
import { ethers, BigNumber } from 'ethers';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import CountdownTimer from '@/components/CountdownTimer';
import CheckinButton from '@/components/CheckinButton';
import GMMessageList from '@/components/GMMessageList';
import WalletRequired from '@/components/WalletRequired';
import { useEthereumEvents } from '@/hooks/useEthereumEvents';
import { GMMessage, Web3State, CheckinStats } from '@/types';
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
  FaWallet, 
  FaExchangeAlt, 
  FaSignOutAlt, 
  FaChevronDown,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
  FaNetworkWired
} from 'react-icons/fa';

// Notification type
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
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
      const messagesPromise = contract.getRecentGMs();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Loading messages timeout")), 15000)
      );
      
      const recentGMs = await Promise.race([messagesPromise, timeoutPromise]);
      
      if (Array.isArray(recentGMs)) {
        const formattedMessages = recentGMs.map(msg => ({
          user: msg.user,
          timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : 
                    msg.timestamp?.toNumber() || 0,
          message: msg.message || 'GM!'
        }));
          
        setMessages(formattedMessages);
      } else {
        console.error("Invalid messages format:", recentGMs);
        setMessages([]);
      }

    } catch (error) {
      console.error('Error loading recent messages:', error);
      setMessages([]);
      
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
      }
    } finally {
      setIsLoadingMessages(false);
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
      setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }));
    
      const result = await connectWallet();
      
      if (!result || !result.address) {
        throw new Error("Failed to connect: No address returned");
      }
      
      const { signer, address, chainId, provider } = result;
      
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stats Section */}
            <div className="lg:col-span-5 space-y-6">
              <StatsCard 
                checkinCount={checkinStats.userCheckinCount}
                timeUntilNextCheckin={checkinStats.timeUntilNextCheckin}
                isLoading={web3State.isLoading}
                globalCheckinCount={globalCheckinCount}
                isLoadingGlobalCount={isLoadingGlobalCount}
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
            
            {/* Messages Section */}
            <div className="lg:col-span-7">
              <GMMessageList 
                messages={messages}
                isLoading={isLoadingMessages}
                onRefresh={() => web3State.contract && loadRecentMessages(web3State.contract)}
              />
            </div>
          </div>
        </WalletRequired>
      </main>
      
      <footer className="mt-auto py-6 border-t border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-2">
              <FaLeaf className="h-5 w-5 text-emerald-500" />
              <p className="text-sm text-gray-500">
                GM Onchain — Built for the Tea Sepolia Testnet
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                <span>Daily GM check-ins on the blockchain</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

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
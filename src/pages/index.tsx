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
  switchToTeaSepolia 
} from '@/utils/web3';
import { CHECKIN_FEE, TEA_SEPOLIA_CHAIN_ID } from '@/utils/constants';
import { FaLeaf, FaNetworkWired } from 'react-icons/fa';

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
  const [messages, setMessages] = useState<GMMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isCheckinLoading, setIsCheckinLoading] = useState<boolean>(false);
  const [showNetworkAlert, setShowNetworkAlert] = useState<boolean>(false);

  // Connect wallet function
  const handleConnectWallet = useCallback(async () => {
    if (web3State.isLoading) return; // Prevent multiple clicks
    
    try {
      setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }));
      
      // Connect wallet
      const result = await connectWallet();
      
      if (!result || !result.address) {
        throw new Error("Failed to connect: No address returned");
      }
      
      const { signer, address, chainId, provider } = result;
      
      // Check if on correct network
      const isCorrectNetwork = chainId === TEA_SEPOLIA_CHAIN_ID;
      setShowNetworkAlert(!isCorrectNetwork);
      
      // Get contract instance
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
  }, [web3State.isLoading]); // Only recompute if isLoading changes

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

  // Load user data
  const loadUserData = async (address: string, contract: ethers.Contract) => {
    try {
      // Check if the function exists in the contract
      let count: number | BigNumber = 0;
      try {
        // First try with address parameter
        count = await contract.getCheckinCount(address);
      } catch (e) {
        console.warn("Error calling getCheckinCount with address", e);
        
        try {
          // Try getting user info from the mapping directly
          const userData = await contract.userCheckins(address);
          if (userData && userData.checkinCount) {
            count = userData.checkinCount;
          }
        } catch (mappingError) {
          console.warn("Error accessing userCheckins mapping", mappingError);
          count = 0; // Default to 0 if we can't get the count
        }
      }
      
      // Get time until next checkin
      let timeRemaining: number | BigNumber = 0;
      try {
        timeRemaining = await contract.timeUntilNextCheckin(address);
      } catch (e) {
        console.warn("Error calling timeUntilNextCheckin", e);
        
        try {
          // Try getting user info from the mapping directly
          const userData = await contract.userCheckins(address);
          if (userData && userData.lastCheckinTime) {
            const lastCheckinTime = BigNumber.isBigNumber(userData.lastCheckinTime) 
              ? userData.lastCheckinTime.toNumber() 
              : Number(userData.lastCheckinTime);
            
            if (lastCheckinTime > 0) {
              const nextCheckinTime = lastCheckinTime + 24 * 60 * 60; // 24 hours in seconds
              const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
              
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
      // Set default values
      setCheckinStats({
        userCheckinCount: 0,
        timeUntilNextCheckin: 0,
      });
    }
  };

  // Load recent messages
  const loadRecentMessages = async (contract: ethers.Contract) => {
    try {
      setIsLoadingMessages(true);
      const recentGMs = await contract.getRecentGMs();
      setMessages(recentGMs);
    } catch (error) {
      console.error('Error loading recent messages:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Handle checkin function
  const handleCheckin = async (message: string) => {
    if (!web3State.contract || !web3State.isConnected) return;
    
    try {
      setIsCheckinLoading(true);
      
      // Call contract function
      const tx = await web3State.contract.checkIn(message, {
        value: ethers.utils.parseEther(CHECKIN_FEE),
      });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Reload data
      if (web3State.address && web3State.contract) {
        await loadUserData(web3State.address, web3State.contract);
        await loadRecentMessages(web3State.contract);
      }
      
    } catch (error) {
      console.error('Error checking in:', error);
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
      
      // Reconnect dengan network yang benar
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
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            // User has previously connected their wallet and it's still authorized
            handleConnectWallet();
          }
        }
      } catch (error) {
        console.error('Error checking previous connection:', error);
      }
    };
    
    checkPreviousConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ethereum = (window as any).ethereum;
      
      if (!ethereum) {
        console.log("No ethereum provider found");
        return;
      }
      
      // Clean way to handle account changes
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet from provider
          handleDisconnectWallet();
        } else if (web3State.address !== accounts[0] && web3State.isConnected) {
          // Account changed, reconnect with new account
          handleConnectWallet();
        }
      };

      const handleChainChanged = () => {
        // Reload page on chain change
        window.location.reload();
      };

      const handleConnect = () => {
        console.log("Provider connected event");
      };

      const handleDisconnect = () => {
        console.log("Provider disconnected event");
        handleDisconnectWallet();
      };

      // Add listeners
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);
      ethereum.on('connect', handleConnect);
      ethereum.on('disconnect', handleDisconnect);

      // Clean up listeners
      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
        ethereum.removeListener('connect', handleConnect);
        ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [web3State.address, web3State.isConnected, handleConnectWallet, handleDisconnectWallet]);
  
  useEthereumEvents({
    accountsChanged: (accounts) => {
      if (accounts.length === 0) {
        // User disconnected wallet from provider
        handleDisconnectWallet();
      } else if (web3State.address !== accounts[0] && web3State.isConnected) {
        // Account changed, reconnect with new account
        handleConnectWallet();
      }
    },
    chainChanged: () => {
      // Reload page on chain change
      window.location.reload();
    },
    disconnect: () => {
      handleDisconnectWallet();
    },
  });

  // Refresh data on interval
  useEffect(() => {
    if (web3State.isConnected && web3State.address && web3State.contract) {
      // Initial load
      loadUserData(web3State.address, web3State.contract);
      loadRecentMessages(web3State.contract);
      
      // Set up refresh interval
      const refreshInterval = setInterval(() => {
        if (web3State.address && web3State.contract) {
          loadUserData(web3State.address, web3State.contract);
        }
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [web3State.isConnected, web3State.address, web3State.contract]);

  useEffect(() => {
    const attemptReconnect = async () => {
      const wasConnected = localStorage.getItem('walletConnected') === 'true';
      const storedAddress = localStorage.getItem('walletAddress');
      
      if (wasConnected && storedAddress && !web3State.isConnected && !web3State.isLoading) {
        try {
          // Check if provider and accounts are available before reconnecting
          const ethereum = (window as any).ethereum;
          if (!ethereum) return;
          
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0 && accounts.includes(storedAddress)) {
            // Only reconnect if the stored address is still available
            await handleConnectWallet();
          } else {
            // Clear stored connection if account is no longer available
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
          }
        } catch (error) {
          console.error("Error auto-reconnecting:", error);
          // Clear stored connection on error
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('walletAddress');
        }
      }
    };

    // Wait a bit for the page to fully load before attempting to reconnect
    const timer = setTimeout(() => {
      attemptReconnect();
    }, 500);

    return () => clearTimeout(timer);
  }, [handleConnectWallet, web3State.isConnected, web3State.isLoading]);

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
    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { useWalletState } from '@/hooks/useWalletState';
import FixedMultiChainCheckinGrid from '@/components/MultiChainCheckinGrid';
import Notification from '@/components/Notification';
import { 
  FaInfoCircle, 
  FaGlobe,
  FaFlask,
  FaLayerGroup
} from 'react-icons/fa';
import { getTotalCheckins } from '@/utils/web3';
import { LOADING_STATES, getChainConfig } from '@/utils/constants';
import { motion } from 'framer-motion';
import AudioPlayer from '@/components/AudioPlayer';

// Type definitions
type NetworkTabType = 'all' | 'mainnet' | 'testnet';

// SVG Patterns for animation
const BlobPatternBottomLeft: React.FC = () => (
  <div className="fixed bottom-0 left-0 w-64 h-64 -mb-32 -ml-32 opacity-10 dark:opacity-5 pointer-events-none z-0">
    <motion.svg 
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ scale: 0.8, rotate: 0 }}
      animate={{ 
        scale: [0.8, 1.1, 0.8], 
        rotate: [0, 10, 0] 
      }}
      transition={{ 
        duration: 20, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      <path fill="#10b981" d="M44.5,-76.3C56.9,-69.1,65.8,-55.3,71.3,-41.1C76.8,-26.9,78.9,-12.1,76.5,1.4C74.1,14.9,67.1,27.2,58.1,37.8C49.1,48.4,38.2,57.2,25.8,63.5C13.5,69.8,-0.3,73.5,-14.2,71.5C-28.1,69.5,-42.1,61.8,-52.9,50.8C-63.8,39.9,-71.4,25.7,-75.6,9.7C-79.8,-6.3,-80.5,-24.1,-73.6,-38.4C-66.6,-52.6,-52,-63.4,-37.2,-69.7C-22.4,-76,-11.2,-78,2.9,-82.6C17,-87.2,32.1,-83.5,44.5,-76.3Z" transform="translate(100 100)" />
    </motion.svg>
  </div>
);

const SquigglyPatternTopRight: React.FC = () => (
  <div className="fixed top-0 right-0 w-96 h-96 -mt-16 -mr-16 opacity-10 dark:opacity-5 pointer-events-none z-0 overflow-hidden">
    <motion.svg 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      initial={{ scale: 0.9, rotate: -10, y: -20 }}
      animate={{ 
        scale: [0.9, 1.2, 0.9], 
        rotate: [-10, 5, -10],
        y: [-20, 10, -20] 
      }}
      transition={{ 
        duration: 25, 
        repeat: Infinity, 
        ease: "easeInOut",
        times: [0, 0.5, 1]
      }}
    >
      <path fill="#06b6d4" d="M31.9,-52.2C45.3,-45.7,62.3,-43.2,70.8,-33.5C79.2,-23.8,79.1,-6.9,75.3,8.5C71.5,23.9,64.1,37.9,53.3,47.8C42.4,57.8,28.2,63.7,13.2,68.3C-1.7,72.9,-17.4,76.1,-28.9,70.8C-40.4,65.6,-47.7,51.9,-54,38.6C-60.4,25.3,-65.8,12.7,-67.6,-1.1C-69.5,-14.8,-67.7,-29.7,-59.7,-40C-51.7,-50.2,-37.4,-56,-24.9,-62.2C-12.5,-68.4,-1.2,-75.1,7.4,-72.3C16,-69.5,18.6,-58.8,31.9,-52.2Z" transform="translate(100 100)" />
    </motion.svg>
  </div>
);

const CheckinPageIntegration: React.FC = () => {
  // State management
  const { 
    web3State, 
    connectWallet: rawConnectWallet, 
    disconnectWallet, 
    switchNetwork, 
    isOnSupportedNetwork,
    getCurrentChainInfo 
  } = useWalletState();
  
  // Wrap connectWallet to return void instead of boolean
  const connectWallet = useCallback(async (): Promise<void> => {
    await rawConnectWallet();
    // Return type is void
  }, [rawConnectWallet]);
  
  const [totalGlobalCheckins, setTotalGlobalCheckins] = useState<number>(0);
  const [userTotalCheckins, setUserTotalCheckins] = useState<number>(0);
  const [loadingState, setLoadingState] = useState<string>(LOADING_STATES.IDLE);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastCheckinChainId, setLastCheckinChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCheckinTutorial, setShowCheckinTutorial] = useState<boolean>(false);
  
  // New states for notifications and tabs
  const [showSuccessNotification, setShowSuccessNotification] = useState<boolean>(false);
  const [showErrorNotification, setShowErrorNotification] = useState<boolean>(false);
  const [networkTab, setNetworkTab] = useState<NetworkTabType>('testnet');

  // Fetch total checkins data
  useEffect(() => {
    const fetchTotalCheckins = async (): Promise<void> => {
      if (!web3State.isConnected || !web3State.contract) return;
      
      try {
        setLoadingState(LOADING_STATES.LOADING);
        
        // Get global checkin count
        const totalCount = await getTotalCheckins(web3State.contract);
        setTotalGlobalCheckins(totalCount);
        
        // Get user total checkins
        if (web3State.address) {
          try {
            const metrics = await web3State.contract.getNavigatorMetrics(web3State.address);
            setUserTotalCheckins(metrics.crystalCount.toNumber());
          } catch (error) {
            console.error("Error getting user metrics:", error);
          }
        }
        
        setLoadingState(LOADING_STATES.SUCCESS);
      } catch (error) {
        console.error("Error fetching total checkins:", error);
        setLoadingState(LOADING_STATES.ERROR);
      }
    };

    fetchTotalCheckins();
  }, [web3State.isConnected, web3State.contract, web3State.address]);

  // Handle checkin success
  const handleCheckinSuccess = useCallback((chainId: number, txHash: string): void => {
    setLastTxHash(txHash);
    setLastCheckinChainId(chainId);
    setUserTotalCheckins(prev => prev + 1);
    setTotalGlobalCheckins(prev => prev + 1);
    setShowSuccessNotification(true);
  }, []);

  // Handle error
  const handleError = useCallback((errorMessage: string): void => {
    setError(errorMessage);
    setShowErrorNotification(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50/70 dark:from-emerald-800 dark:via-gray-900 dark:to-black relative overflow-hidden">
      <BlobPatternBottomLeft />
      <SquigglyPatternTopRight />
      <AudioPlayer />
      
      {/* Success Notification */}
      <Notification
        isOpen={showSuccessNotification}
        onClose={() => setShowSuccessNotification(false)}
        type="success"
        title="GM Sent Successfully!"
        message="Your daily GM has been recorded on the blockchain. Keep coming back daily to increase your crystal balance."
        txHash={lastTxHash}
        chainId={lastCheckinChainId}
      />
      
      {/* Error Notification */}
      <Notification
        isOpen={showErrorNotification}
        onClose={() => setShowErrorNotification(false)}
        type="error"
        title="Operation Failed"
        message={error || "An unknown error occurred. Please try again."}
      />
      
      {/* Main Content */}
      <div className="pt-32 max-w-7xl mx-auto px-4 py-6 relative z-10">
        <div className="flex justify-center mb-8">
          <div className="flex bg-white dark:bg-gray-800/80 px-2 py-1 rounded-full backdrop-blur-sm shadow-md">
            <button
              onClick={() => setNetworkTab('all')}
              className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
                networkTab === 'all' 
                  ? 'bg-emerald-100/70 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm transform scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/30 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className="flex items-center">
                <FaLayerGroup className="mr-2 h-4 w-4" />
                All
              </div>
            </button>
            
            <button
              onClick={() => setNetworkTab('mainnet')}
              className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
                networkTab === 'mainnet' 
                  ? 'bg-emerald-100/70 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm transform scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/30 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className="flex items-center">
                <FaGlobe className="mr-2 h-4 w-4" />
                Mainnet
              </div>
            </button>
            
            <button
              onClick={() => setNetworkTab('testnet')}
              className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
                networkTab === 'testnet' 
                  ? 'bg-emerald-100/70 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm transform scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/30 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className="flex items-center">
                <FaFlask className="mr-2 h-4 w-4" />
                Testnet
              </div>
            </button>
          </div>
        </div>
        
        {/* Main Checkin Grid */}
        <FixedMultiChainCheckinGrid
          isConnected={web3State.isConnected}
          currentChainId={web3State.chainId}
          address={web3State.address}
          signer={web3State.signer}
          provider={web3State.provider}
          onCheckinSuccess={handleCheckinSuccess}
          networkType={networkTab}
        />
      </div>
    </div>
  );
};

export default CheckinPageIntegration;
import React, { createContext, useContext, useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaSync } from 'react-icons/fa';
import { getProvider } from '@/utils/web3';

interface ConnectionStatusContextType {
  status: 'initializing' | 'unstable' | 'stable';
  isStable: boolean;
  networkLatency: number;
  blockNumber: number | null;
  isRefreshing: boolean;
  refreshConnection: () => void;  
}

const defaultContext: ConnectionStatusContextType = {
  status: 'initializing',
  isStable: false,
  networkLatency: 0,
  blockNumber: null,
  isRefreshing: false,
  refreshConnection: () => {} 
};

const ConnectionStatusContext = createContext<ConnectionStatusContextType>(defaultContext);

export const useConnectionStatus = () => useContext(ConnectionStatusContext);

export const ConnectionStatusIndicator: React.FC = () => {
  const { status, networkLatency, blockNumber, isRefreshing, refreshConnection } = useConnectionStatus();
  
  const handleRefreshClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.reload();
  };
  
  return (
    <div className="fixed bottom-8 right-8 z-50 p-2 rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center">
      <div className="mr-2">
        {status === 'stable' ? (
          <FaCheckCircle className="text-green-500" />
        ) : status === 'unstable' ? (
          <FaExclamationTriangle className="text-yellow-500" />
        ) : (
          <FaHourglassHalf className="text-blue-500 animate-pulse" />
        )}
      </div>
      <div>
        <p className="text-xs font-medium">
          {status === 'stable' 
            ? 'Connection Stable' 
            : status === 'unstable' 
              ? 'Connection Unstable' 
              : 'Connecting...'}
        </p>
        <p className="text-xs text-gray-500">
          {status !== 'initializing' && `Latency: ${networkLatency}ms`}
          {blockNumber && ` • Block: ${blockNumber}`}
        </p>
      </div>
      
      {(status === 'initializing' || status === 'unstable' || networkLatency > 10) && (
        <button 
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="ml-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
          title="Refresh page"
        >
          <FaSync className={`text-gray-600 dark:text-gray-300 w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};

export const ConnectionStatusProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [status, setStatus] = useState<'initializing' | 'unstable' | 'stable'>('initializing');
  const [networkLatency, setNetworkLatency] = useState<number>(0);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isStable, setIsStable] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [stuckDetected, setStuckDetected] = useState<boolean>(false);
  const [lastBlockNumber, setLastBlockNumber] = useState<number | null>(null);
  const [blockStagnantCount, setBlockStagnantCount] = useState<number>(0);
  
  const checkNetworkStatus = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }
      
      const startTime = performance.now();
      const provider = getProvider();
      
      if (!provider) {
        setStatus('unstable');
        setIsStable(false);
        setConsecutiveSuccesses(0);
        setNetworkLatency(0);
        setBlockNumber(null);
        return;
      }
      
      let currentBlock: number | null = null;
      try {
        currentBlock = await provider.getBlockNumber();
      } catch (blockError) {
        console.warn("Error getting block number:", blockError);
        currentBlock = null;
      }
      
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      setNetworkLatency(latency);
      
      if (currentBlock !== null) {
        if (lastBlockNumber === currentBlock) {
          setBlockStagnantCount(prev => prev + 1);
        } else {
          setBlockStagnantCount(0);
          setLastBlockNumber(currentBlock);
        }
      }
      
      setBlockNumber(currentBlock);
      setLastUpdateTime(Date.now());
      
      const isStuck = (latency > 10 || (blockStagnantCount > 3 && currentBlock !== null));
      
      if (isStuck) {
        setStuckDetected(true);
        setStatus('unstable');
        setIsStable(false);
        setConsecutiveSuccesses(0);
        return;
      }
      
      if (latency < 10 && currentBlock !== null && currentBlock !== lastBlockNumber) {
        setStuckDetected(false);
      }
      
      if (latency === 0 && currentBlock === null) {
        setStatus('unstable');
        setIsStable(false);
        setConsecutiveSuccesses(0);
        return;
      }
      
      if (latency < 10 && currentBlock !== null && !stuckDetected) {
        setConsecutiveSuccesses(prev => prev + 1);
        if (consecutiveSuccesses >= 2 || isManualRefresh) {
          setStatus('stable');
          setIsStable(true);
        } else if (status === 'initializing') {
          setStatus('unstable');
        }
      } else {
        setStatus('unstable');
        setIsStable(false);
        setConsecutiveSuccesses(0);
      }
    } catch (error) {
      console.warn("Error checking network status:", error);
      setStatus('unstable');
      setIsStable(false);
      setConsecutiveSuccesses(0);
      setNetworkLatency(0);
      setBlockNumber(null);
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  };
  
  const refreshConnection = () => {
    window.location.reload();
  };
  
  useEffect(() => {
    let mounted = true;
    
    checkNetworkStatus();
    
    const interval = setInterval(() => {
      if (mounted) {
        checkNetworkStatus();
      }
    }, 2000); 
    const forceStableTimeout = setTimeout(() => {
      if (mounted && status !== 'stable') {
        if (blockNumber !== null && networkLatency > 0 && networkLatency < 10 && !stuckDetected) {
          console.log("Forcing stable status after timeout with valid block number");
          setStatus('stable');
          setIsStable(true);
        } else {
          console.log("Not forcing stable status - no valid block number or high latency");
          checkNetworkStatus();
        }
      }
    }, 10000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(forceStableTimeout);
    };
  }, [status, consecutiveSuccesses, blockNumber, networkLatency, stuckDetected]);
  
  const contextValue: ConnectionStatusContextType = {
    status,
    isStable,
    networkLatency,
    blockNumber,
    isRefreshing,
    refreshConnection
  };
  
  return (
    <ConnectionStatusContext.Provider value={contextValue}>
      {children}
      <ConnectionStatusIndicator />
    </ConnectionStatusContext.Provider>
  );
};

export default ConnectionStatusProvider;
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaTimes,
  FaExternalLinkAlt,
  FaArrowRight
} from 'react-icons/fa';
import { getChainConfig } from '@/utils/constants';

interface NotificationProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
  txHash?: string | null;
  chainId?: number | null;
}

// Fixed Notification Component with proper centering
const Notification: React.FC<NotificationProps> = ({ 
  isOpen, 
  onClose, 
  type, 
  title, 
  message, 
  txHash = null, 
  chainId = null 
}) => {
  // Get explorer URL for transaction
  const getTxExplorerUrl = (): string | null => {
    if (!txHash || !chainId) return null;
    
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig || !chainConfig.blockExplorerUrls || chainConfig.blockExplorerUrls.length === 0) {
      return null;
    }
    
    return `${chainConfig.blockExplorerUrls[0]}/tx/${txHash}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full screen backdrop with higher z-index */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          
          {/* Modal container - perfectly centered */}
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-md w-full p-6 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700
                         bg-white dark:bg-gray-800 backdrop-filter backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-full ${
                  type === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {type === 'success' ? (
                    <FaCheckCircle className="h-6 w-6" />
                  ) : (
                    <FaExclamationTriangle className="h-6 w-6" />
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 
                             transition-colors p-2"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <h3 className={`text-xl font-bold mb-2 ${
                type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {message}
              </p>
              
              {txHash && (
                <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Transaction Hash:</span>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-300">
                        {txHash.substring(0, 8)}...{txHash.substring(txHash.length - 8)}
                      </span>
                    </div>
                    
                    {getTxExplorerUrl() && (
                      <a 
                        href={getTxExplorerUrl() || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-center py-2 px-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 
                                   text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/30
                                   transition-colors flex items-center justify-center"
                      >
                        <span>View on Explorer</span>
                        <FaExternalLinkAlt className="ml-2 h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className={`py-2 px-4 rounded-lg text-white transition-colors flex items-center ${
                    type === 'success'
                      ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                      : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                  }`}
                >
                  <span>{type === 'success' ? 'Awesome!' : 'Dismiss'}</span>
                  <FaArrowRight className="ml-2 h-3 w-3" />
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Notification;
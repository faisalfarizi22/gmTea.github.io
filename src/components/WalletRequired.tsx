import React, { useState } from 'react';
import { FaWallet, FaLeaf } from 'react-icons/fa';
import { motion } from 'framer-motion';
import CustomConnectModal from './CustomConnectModal';

interface WalletRequiredProps {
  children: React.ReactNode;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  isConnecting: boolean;
}

const WalletRequired: React.FC<WalletRequiredProps> = ({
  children,
  isConnected,
  connectWallet,
  isConnecting
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  if (isConnected) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="card max-w-md mx-auto p-10 text-center space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <div className="relative h-full w-full flex items-center justify-center">
            <FaLeaf className="text-5xl text-emerald-500" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-emerald-700">Welcome to GM Onchain</h2>
        
        <p className="text-gray-600">
          Start your day with a friendly GM on the Tea blockchain. Connect your wallet to check-in daily and join the community.
        </p>
        
        <div className="flex justify-center">
          <motion.button
            whileHover={{ 
              scale: 1.02, 
              boxShadow: "0px 0px 20px #10b981",
              backgroundColor: "#059669"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="w-auto px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center"
          >
            <FaWallet className="inline-block mr-2" /> Connect Wallet
          </motion.button>
        </div>
        
        <CustomConnectModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          connectWallet={connectWallet}
        />
        
        <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
          <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></div>
          <span>Powered by Tea Sepolia Testnet</span>
        </div>
      </div>
      
      <div className="absolute -z-10 left-1/4 top-1/4 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -z-10 right-1/4 bottom-1/4 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -z-10 left-1/3 bottom-1/3 w-64 h-64 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>
  );
};

export default WalletRequired;
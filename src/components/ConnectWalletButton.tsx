import React, { useState } from 'react';
import { FaWallet } from 'react-icons/fa';
import { motion } from 'framer-motion';
import CustomConnectModal from './CustomConnectModal';

interface ConnectWalletButtonProps {
  connectWallet: () => Promise<void>;
}

const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({ 
  connectWallet 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <motion.button
        whileHover={{ 
          scale: 1.02, 
          boxShadow: "0px 0px 20px #10b981",
          backgroundColor: "#059669"
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsModalOpen(true)}
        className="w-auto px-6 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center"
      >
        <FaWallet className="inline-block mr-2" /> Connect Wallet
      </motion.button>
      
      <CustomConnectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        connectWallet={connectWallet}
      />
    </>
  );
};

export default ConnectWalletButton;
import React from 'react';
import { FaWallet, FaLeaf } from 'react-icons/fa';

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
        
        <button 
          onClick={connectWallet}
          disabled={isConnecting}
          className="btn-primary w-full group"
        >
          <FaWallet className={`mr-2 ${isConnecting ? 'animate-spin' : 'group-hover:rotate-12 transition-transform duration-300'}`} />
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
        
        <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
          <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></div>
          <span>Powered by Tea Sepolia Testnet</span>
        </div>
      </div>
      
      {/* Animated background shapes */}
      <div className="absolute -z-10 left-1/4 top-1/4 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -z-10 right-1/4 bottom-1/4 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -z-10 left-1/3 bottom-1/3 w-64 h-64 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>
  );
};

export default WalletRequired;
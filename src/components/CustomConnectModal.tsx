// components/CustomConnectModal.tsx
import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { createWallet } from "thirdweb/wallets";
import { client } from "../client";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface CustomConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectWallet: () => Promise<void>;
}

const CustomConnectModal: React.FC<CustomConnectModalProps> = ({
  isOpen,
  onClose,
  connectWallet
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState<string | null>(null);
  
  const wallets = [
    {
      id: "metamask",
      name: "MetaMask",
      description: "Connect to your MetaMask Wallet",
      iconSvg: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.83 470.86" className="w-8 h-8">
          <polygon className="fill-[#e2761b] stroke-[#e2761b]" points="482.09 0.5 284.32 147.38 320.9 60.72 482.09 0.5"/>
          <polygon className="fill-[#e4761b] stroke-[#e4761b]" points="25.54 0.5 221.72 148.77 186.93 60.72 25.54 0.5"/>
          <polygon className="fill-[#e4761b] stroke-[#e4761b]" points="410.93 340.97 358.26 421.67 470.96 452.67 503.36 342.76 410.93 340.97"/>
          <polygon className="fill-[#e4761b] stroke-[#e4761b]" points="4.67 342.76 36.87 452.67 149.57 421.67 96.9 340.97 4.67 342.76"/>
          <polygon className="fill-[#e4761b] stroke-[#e4761b]" points="143.21 204.62 111.8 252.13 223.7 257.1 219.73 136.85 143.21 204.62"/>
          <polygon className="fill-[#e4761b] stroke-[#e4761b]" points="364.42 204.62 286.91 135.46 284.32 257.1 396.03 252.13 364.42 204.62"/>
          <polygon className="fill-[#e4761b] stroke-[#e4761b]" points="149.57 421.67 216.75 388.87 158.71 343.55 149.57 421.67"/>
          <polygon className="fill-[#e4761b] stroke-[#e4761b]" points="290.88 388.87 358.26 421.67 348.92 343.55 290.88 388.87"/>
          <polygon className="fill-[#d7c1b3] stroke-[#d7c1b3]" points="358.26 421.67 290.88 388.87 296.25 432.8 295.65 451.28 358.26 421.67"/>
          <polygon className="fill-[#d7c1b3] stroke-[#d7c1b3]" points="149.57 421.67 212.18 451.28 211.78 432.8 216.75 388.87 149.57 421.67"/>
          <polygon className="fill-[#233447] stroke-[#233447]" points="213.17 314.54 157.12 298.04 196.67 279.95 213.17 314.54"/>
          <polygon className="fill-[#233447] stroke-[#233447]" points="294.46 314.54 310.96 279.95 350.71 298.04 294.46 314.54"/>
          <polygon className="fill-[#cd6116] stroke-[#cd6116]" points="149.57 421.67 159.11 340.97 96.9 342.76 149.57 421.67"/>
          <polygon className="fill-[#cd6116] stroke-[#cd6116]" points="348.72 340.97 358.26 421.67 410.93 342.76 348.72 340.97"/>
          <polygon className="fill-[#cd6116] stroke-[#cd6116]" points="396.03 252.13 284.32 257.1 294.66 314.54 311.16 279.95 350.91 298.04 396.03 252.13"/>
          <polygon className="fill-[#cd6116] stroke-[#cd6116]" points="157.12 298.04 196.87 279.95 213.17 314.54 223.7 257.1 111.8 252.13 157.12 298.04"/>
          <polygon className="fill-[#e4751f] stroke-[#e4751f]" points="111.8 252.13 158.71 343.55 157.12 298.04 111.8 252.13"/>
          <polygon className="fill-[#e4751f] stroke-[#e4751f]" points="350.91 298.04 348.92 343.55 396.03 252.13 350.91 298.04"/>
          <polygon className="fill-[#e4751f] stroke-[#e4751f]" points="223.7 257.1 213.17 314.54 226.29 382.31 229.27 293.07 223.7 257.1"/>
          <polygon className="fill-[#e4751f] stroke-[#e4751f]" points="284.32 257.1 278.96 292.87 281.34 382.31 294.66 314.54 284.32 257.1"/>
          <polygon className="fill-[#f6851b] stroke-[#f6851b]" points="294.66 314.54 281.34 382.31 290.88 388.87 348.92 343.55 350.91 298.04 294.66 314.54"/>
          <polygon className="fill-[#f6851b] stroke-[#f6851b]" points="157.12 298.04 158.71 343.55 216.75 388.87 226.29 382.31 213.17 314.54 157.12 298.04"/>
          <polygon className="fill-[#c0ad9e] stroke-[#c0ad9e]" points="295.65 451.28 296.25 432.8 291.28 428.42 216.35 428.42 211.78 432.8 212.18 451.28 149.57 421.67 171.43 439.55 215.75 470.36 291.88 470.36 336.4 439.55 358.26 421.67 295.65 451.28"/>
          <polygon className="fill-[#161616] stroke-[#161616]" points="290.88 388.87 281.34 382.31 226.29 382.31 216.75 388.87 211.78 432.8 216.35 428.42 291.28 428.42 296.25 432.8 290.88 388.87"/>
          <polygon className="fill-[#763d16] stroke-[#763d16]" points="490.44 156.92 507.33 75.83 482.09 0.5 290.88 142.41 364.42 204.62 468.37 235.03 491.43 208.2 481.49 201.05 497.39 186.54 485.07 177 500.97 164.87 490.44 156.92"/>
          <polygon className="fill-[#763d16] stroke-[#763d16]" points="0.5 75.83 17.39 156.92 6.66 164.87 22.56 177 10.44 186.54 26.34 201.05 16.4 208.2 39.26 235.03 143.21 204.62 216.75 142.41 25.54 0.5 0.5 75.83"/>
          <polygon className="fill-[#f6851b] stroke-[#f6851b]" points="468.37 235.03 364.42 204.62 396.03 252.13 348.92 343.55 410.93 342.76 503.36 342.76 468.37 235.03"/>
          <polygon className="fill-[#f6851b] stroke-[#f6851b]" points="143.21 204.62 39.26 235.03 4.67 342.76 96.9 342.76 158.71 343.55 111.8 252.13 143.21 204.62"/>
          <polygon className="fill-[#f6851b] stroke-[#f6851b]" points="284.32 257.1 290.88 142.41 321.1 60.72 186.93 60.72 216.75 142.41 223.7 257.1 226.09 293.27 226.29 382.31 281.34 382.31 281.74 293.27 284.32 257.1"/>
        </svg>
      ),
      wallet: createWallet("io.metamask")
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      description: "Connect to your Coinbase Wallet",
      iconSvg: (
        <svg width="32" height="32" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" fill="#0052FF"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M152 512C152 710.823 313.177 872 512 872C710.823 872 872 710.823 872 512C872 313.177 710.823 152 512 152C313.177 152 152 313.177 152 512ZM420 396C406.745 396 396 406.745 396 420V604C396 617.255 406.745 628 420 628H604C617.255 628 628 617.255 628 604V420C628 406.745 617.255 396 604 396H420Z" fill="white"/>
        </svg>
      ),
      wallet: createWallet("com.coinbase.wallet")
    },
    {
      id: "okx",
      name: "OKX Wallet",
      description: "Connect to your OKX Wallet",
      iconSvg: (
        <svg height="32" viewBox="0 -.00141495 157.427 44.18641495" width="100" xmlns="http://www.w3.org/2000/svg" className="scale-[1.2]">
          <path d="m46.17 0h-45.12c-.28 0-.547.103-.744.288a.951.951 0 0 0 -.306.694v42.22c0 .26.11.51.307.694s.464.288.742.288h45.121c.279 0 .545-.104.743-.288a.952.952 0 0 0 .307-.694v-42.22c0-.26-.11-.51-.307-.694a1.088 1.088 0 0 0 -.743-.288zm-14.69 28.474c0 .26-.11.51-.308.694a1.087 1.087 0 0 1 -.741.288h-13.642c-.278 0-.545-.104-.742-.288a.951.951 0 0 1 -.307-.694v-12.764c0-.26.11-.51.307-.694.197-.185.464-.288.742-.288h13.642c.278 0 .545.103.741.288a.95.95 0 0 1 .308.694zm109.15-13.744h-13.642c-.58 0-1.05.44-1.05.982v12.764c0 .542.47.982 1.05.982h13.641c.58 0 1.05-.44 1.05-.982v-12.764c0-.543-.47-.982-1.05-.982zm-15.737-14.73h-13.641c-.58 0-1.05.44-1.05.983v12.764c0 .542.47.982 1.05.982h13.64c.58 0 1.05-.44 1.05-.982v-12.764c0-.543-.47-.982-1.05-.982zm31.485 0h-13.642c-.579 0-1.049.44-1.049.983v12.764c0 .542.47.982 1.05.982h13.64c.58 0 1.05-.44 1.05-.982v-12.764c0-.543-.47-.982-1.05-.982zm-31.485 29.457h-13.641c-.58 0-1.05.44-1.05.982v12.765c0 .542.47.981 1.05.981h13.64c.58 0 1.05-.44 1.05-.981v-12.765c0-.542-.47-.982-1.05-.982zm31.485 0h-13.642c-.579 0-1.049.44-1.049.982v12.765c0 .542.47.981 1.05.981h13.64c.58 0 1.05-.44 1.05-.981v-12.765c0-.542-.47-.982-1.05-.982zm-55.114-29.457h-13.64c-.58 0-1.05.44-1.05.983v12.764c0 .542.47.982 1.05.982h13.64c.58 0 1.05-.44 1.05-.982v-12.764c0-.543-.47-.982-1.05-.982zm0 29.457h-13.64c-.58 0-1.05.44-1.05.982v12.765c0 .542.47.981 1.05.981h13.64c.58 0 1.05-.44 1.05-.981v-12.765c0-.542-.47-.982-1.05-.982zm-14.694-13.758c0-.26-.112-.51-.308-.695a1.087 1.087 0 0 0 -.742-.287h-14.691v-13.735c0-.26-.11-.51-.307-.694a1.087 1.087 0 0 0 -.742-.288h-13.641c-.279 0-.546.103-.743.288a.951.951 0 0 0 -.307.694v42.198c0 .26.11.51.307.694s.464.288.743.288h13.64c.279 0 .546-.104.743-.288s.307-.434.307-.694v-13.735h14.69c.279 0 .546-.104.743-.288a.952.952 0 0 0 .307-.694z"/>
        </svg>
      ),
      wallet: createWallet("com.okex.wallet")
    }
  ];
  
  const handleConnectClick = async (walletType: string) => {
    try {
      setIsConnecting(true);
      setSelectedWalletType(walletType);
      
      const selectedWallet = wallets.find(w => w.id === walletType);
      if (!selectedWallet) return;
      
      // For MetaMask and other injected wallets, use window.ethereum directly
      if (walletType === "metamask" && window.ethereum) {
        try {
          // Force confirmation by requesting permissions
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          });
          
          // Then get accounts
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          if (accounts && accounts.length > 0) {
            console.log("Connected account:", accounts[0]);
          }
        } catch (error) {
          console.error("Error using direct ethereum request:", error);
          // Fallback to thirdweb connect method
        }
      }
      
      // Connect with thirdweb (standard, without custom options that are not supported)
      await selectedWallet.wallet.connect({ client });
      
      // After the user confirms in the wallet, update app state
      await connectWallet();
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
      setSelectedWalletType(null);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 15 }}
        className="bg-white dark:bg-gray-900/90 backdrop-blur-md rounded-2xl border border-emerald-500/20 p-6 max-w-md w-full shadow-2xl shadow-emerald-500/10"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              Connect Wallet
            </h2>
            <div className="h-1 w-16 bg-emerald-500 rounded-full mt-1"></div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>
        
        <p className="mb-6 text-gray-600 dark:text-gray-400 text-sm">
          Connect your crypto wallet to interact with GM Tea and join the Tea Sepolia community
        </p>
        
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <motion.button
              key={wallet.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isConnecting}
              onClick={() => handleConnectClick(wallet.id)}
              className="w-full flex items-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600/30 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 mr-4 p-2 shadow-sm">
                {wallet.iconSvg}
              </div>
              
              <div className="text-left flex-1">
                <span className="font-medium text-emerald-800 dark:text-emerald-300 block">{wallet.name}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{wallet.description}</span>
              </div>
              
              {isConnecting && wallet.id === selectedWalletType ? (
                <div className="ml-2 p-1 rounded-full bg-emerald-100 dark:bg-emerald-800/50">
                  <svg className="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="ml-2 p-1 rounded-full bg-emerald-100 dark:bg-emerald-800/50 text-emerald-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}
            </motion.button>
          ))}
        </div>
        
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomConnectModal;
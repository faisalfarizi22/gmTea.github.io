import React, { useState } from 'react';
import { FaTimes, FaEnvelope, FaPhone, FaDiscord, FaSun, FaMoon, FaWallet } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "../client";
import WalletLogo from './WalletLogo';
import { RiFingerprintFill } from "react-icons/ri";
import { FcGoogle } from "react-icons/fc";
import { SiFarcaster } from "react-icons/si";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ThemeToggleProps {
  className?: string;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  forceTheme?: 'light' | 'dark' | null;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  onThemeChange,
  forceTheme = null
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return forceTheme 
        ? forceTheme === 'dark'
        : savedTheme === 'dark' || (!savedTheme && prefersDark);
    }
    return false;
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  React.useEffect(() => {
    if (forceTheme !== null) {
      const newDarkMode = forceTheme === 'dark';
      if (isDarkMode !== newDarkMode) {
        setIsDarkMode(newDarkMode);
        document.documentElement.classList.toggle('dark', newDarkMode);
      }
    }
  }, [forceTheme, isDarkMode]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    document.documentElement.classList.toggle('dark', newTheme);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    }
    
    if (onThemeChange) {
      onThemeChange(newTheme ? 'dark' : 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        <FaSun
          className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-0 rotate-90 scale-75' 
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        
        <FaMoon
          className={`absolute inset-0 w-5 h-5 text-gray-600 dark:text-gray-300 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
      
      <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${
        isDarkMode 
          ? 'bg-blue-500/10 shadow-inner' 
          : 'bg-yellow-500/10'
      }`} />
    </button>
  );
};

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
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  
  const socialIconsRow = [
    {
      id: "google",
      name: "Google",
      icon: <FcGoogle className="text-4xl text-[#4285f4] dark:text-[#4285f4]" />
    },
    {
      id: "x",
      name: "X",
      icon: <FaXTwitter className="text-3xl text-gray-800 dark:text-gray-200" />
    },
    {
      id: "discord",
      name: "Discord",
      icon: <FaDiscord className="text-4xl text-[#5865f2]" />
    },
    {
      id: "farcaster",
      name: "Farcaster",
      icon: <SiFarcaster className="text-4xl text-purple-700/70" />
    }
  ];

  const otherAuthOptions = [
    {
      id: "email",
      name: "Continue with Email",
      icon: <FaEnvelope className="text-cyan-500" />
    },
    {
      id: "phone",
      name: "Continue with Phone",
      icon: <FaPhone className="text-emerald-500" />
    },
    {
      id: "passkey",
      name: "Continue with Passkey",
      icon: <RiFingerprintFill className="text-2xl text-blue-500"/>
    }
  ];

  const externalWallets = [
    {
      id: "metamask",
      name: "MetaMask",
      logoUrl: "/assets/wallets/metamask.png",
      fallbackIcon: "🦊",
      wallet: createWallet("io.metamask")
    },
    {
      id: "okx",
      name: "OKX Wallet",
      logoUrl: "/assets/wallets/okx.png",
      fallbackIcon: "⚫",
      wallet: createWallet("com.okex.wallet")
    },
    {
      id: "bitget",
      name: "Bitget Wallet",
      logoUrl: "/assets/wallets/bitget.png",
      fallbackIcon: "🔵",
      wallet: createWallet("com.bitget.web3")
    },
    {
      id: "binance",
      name: "Binance Wallet",
      logoUrl: "/assets/wallets/binance.png",
      fallbackIcon: "🟡",
      wallet: createWallet("com.binance.wallet")
    },
    {
      id: "ronin",
      name: "Ronin Wallet",
      logoUrl: "/assets/wallets/ronin.png",
      fallbackIcon: "⚔️",
      wallet: createWallet("com.roninchain.wallet")
    }
  ];

  const inAppWalletInstance = inAppWallet({
    auth: {
      options: [
        "google",
        "email",
        "passkey", 
        "phone",
        "discord",
        "farcaster",
        "x",
      ],
    },
  });
  
  const handleConnectWalletClick = () => {
    setShowWalletOptions(true);
  };

  const handleInAppAuthClick = async (authType: string) => {
    try {
      setIsConnecting(true);
      setSelectedWalletType(`inapp-${authType}`);
      
      await inAppWalletInstance.connect({ 
        client,
        strategy: authType as any
      });
      
      await connectWallet();
      onClose();
    } catch (error) {
      console.error('Error connecting with in-app wallet:', error);
    } finally {
      setIsConnecting(false);
      setSelectedWalletType(null);
    }
  };
  
  const handleExternalWalletClick = async (walletType: string) => {
    try {
      setIsConnecting(true);
      setSelectedWalletType(walletType);
      
      const selectedWallet = externalWallets.find(w => w.id === walletType);
      if (!selectedWallet) return;
      
      if (walletType === "metamask" && window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          });
          
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          if (accounts && accounts.length > 0) {
            console.log("Connected account:", accounts[0]);
          }
        } catch (error) {
          console.error("Error using direct ethereum request:", error);
        }
      }
      
      await selectedWallet.wallet.connect({ client });
      await connectWallet();
      onClose();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
      setSelectedWalletType(null);
    }
  };

  const handleBack = () => {
    setShowWalletOptions(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, rotateX: 15 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.8, opacity: 0, rotateX: 15 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative bg-white dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-gray-900/95 dark:to-slate-800/95 backdrop-blur-2xl rounded-3xl border border-gray-200 dark:border-cyan-500/20 shadow-2xl shadow-gray-500/10 dark:shadow-cyan-500/5 w-full max-w-sm max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent dark:from-cyan-500/5 dark:via-transparent dark:to-emerald-500/5"></div>
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-transparent to-transparent dark:from-cyan-400/10 dark:to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-transparent to-transparent dark:from-emerald-400/10 dark:to-transparent rounded-full blur-2xl"></div>
          
          <div className="relative flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              {showWalletOptions && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handleBack}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700/60 transition-all duration-200"
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>
              )}
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-cyan-300 dark:to-emerald-300 bg-clip-text text-transparent">
                  {showWalletOptions ? "Select Wallet" : "Connect"}
                </h2>
                <div className="h-0.5 w-12 bg-gradient-to-r from-gray-400 to-gray-600 dark:from-cyan-400 dark:to-emerald-400 rounded-full mt-1"></div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 hover:bg-red-50 dark:hover:bg-red-500/20 hover:border-red-200 dark:hover:border-red-500/30 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-300 transition-all duration-200"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
          </div>
          
          <div className="relative px-6 pb-6">
            <AnimatePresence mode="wait">
              {showWalletOptions ? (
                <motion.div
                  key="wallets"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {externalWallets.map((wallet, index) => (
                    <motion.button
                      key={wallet.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isConnecting}
                      onClick={() => handleExternalWalletClick(wallet.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 hover:border-gray-300 dark:hover:border-slate-600/50 hover:bg-gray-100 dark:hover:bg-slate-700/40 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 group-hover:bg-gray-50 dark:group-hover:bg-slate-700/60">
                        {isConnecting && wallet.id === selectedWalletType ? (
                          <svg className="animate-spin h-5 w-5 text-blue-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <WalletLogo 
                            logoUrl={wallet.logoUrl}
                            altText={wallet.name}
                            size="md"
                            fallbackIcon={wallet.fallbackIcon}
                          />
                        )}
                      </div>
                      
                      <span className="flex-1 text-left font-medium text-gray-800 dark:text-gray-200 text-sm">{wallet.name}</span>
                      
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-4 gap-3">
                    {socialIconsRow.map((social, index) => (
                      <motion.button
                        key={social.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isConnecting}
                        onClick={() => handleInAppAuthClick(social.id)}
                        className="aspect-square rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 hover:border-gray-300 dark:hover:border-slate-600/50 hover:bg-gray-100 dark:hover:bg-slate-700/40 transition-all duration-200 flex items-center justify-center group"
                      >
                        {isConnecting && `inapp-${social.id}` === selectedWalletType ? (
                          <svg className="animate-spin h-5 w-5 text-blue-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          social.icon
                        )}
                      </motion.button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {otherAuthOptions.map((auth, index) => (
                      <motion.button
                        key={auth.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (index + 4) * 0.1 }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isConnecting}
                        onClick={() => handleInAppAuthClick(auth.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 hover:border-gray-300 dark:hover:border-slate-600/50 hover:bg-gray-100 dark:hover:bg-slate-700/40 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 group-hover:bg-gray-50 dark:group-hover:bg-slate-700/60">
                          {auth.icon}
                        </div>
                        
                        <span className="flex-1 text-left font-medium text-gray-800 dark:text-gray-200 text-sm">{auth.name}</span>
                        
                        {isConnecting && `inapp-${auth.id}` === selectedWalletType ? (
                          <div className="w-5 h-5">
                            <svg className="animate-spin h-5 w-5 text-blue-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/30 rounded-full">or</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent"></div>
                  </div>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConnectWalletClick}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-50 dark:from-cyan-500/10 dark:via-emerald-500/10 dark:to-cyan-500/10 border border-emerald-200 dark:border-cyan-500/20 hover:border-blue-300 dark:hover:border-cyan-400/30 p-4 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 dark:from-cyan-500/0 dark:via-cyan-500/5 dark:to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-cyan-500/20 dark:to-emerald-500/20 border border-blue-200 dark:border-cyan-500/30">
                        <FaWallet className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">Connect a Wallet</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Use your crypto wallet</div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700/30"
            >
              <div className="flex items-center justify-center gap-1 mb-2">
                <div className="w-1 h-1 rounded-full bg-blue-400 dark:bg-cyan-400"></div>
                <div className="w-1 h-1 rounded-full bg-purple-400 dark:bg-emerald-400"></div>
                <div className="w-1 h-1 rounded-full bg-blue-400 dark:bg-cyan-400"></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                Secure connection via Web3 standards
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomConnectModal;
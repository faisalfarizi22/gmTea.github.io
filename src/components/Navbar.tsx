// components/Navbar.tsx (update)
import React, { useState, useRef, useEffect } from 'react';
import { formatAddress } from '@/utils/web3';
import ThemeToggle from './ThemeToggle';
import Link from 'next/link';
import { FaLeaf, FaWallet, FaSignOutAlt, FaChevronDown, FaComments, FaEnvelope } from 'react-icons/fa';
import ConnectWalletButton from './ConnectWalletButton';
import PrivateMessageDrawer from './PrivateMessageDrawer';
import { useGMTeaChat } from '@/hooks/useGMTeaChat';

interface NavbarProps {
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  address, 
  connectWallet, 
  disconnectWallet,
  isConnecting 
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-10 transition-all duration-500 ${
      scrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="relative">
                <FaLeaf className="h-8 w-8 text-emerald-500" />
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
              </div>
              <span className="ml-2 text-xl font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                GM <span className="text-emerald-500">TEA</span>
                <span className="absolute top-6 ml-1 text-gray-500 dark:text-gray-300 text-xs font-medium bg-emerald-100/50 dark:bg-emerald-50/10 px-1.5 py-0.5 rounded-md align-middle shadow-md">
                Testnet
                </span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Forum Link - now active */}
            {/* {address && (
              <Link href="/forum">
                <div className="p-2 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer">
                  <FaComments className="h-5 w-5" />
                </div>
              </Link>
            )} */}

            {/* Messages - now active */}
            {/* {address && (
              <div className="relative">
                <button 
                  onClick={() => setMessageDrawerOpen(true)}
                  className="p-2 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer"
                >
                  <FaEnvelope className="h-5 w-5" />
                </button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            )} */}

            {/* Theme Toggle Button */}
            <ThemeToggle />
            
            {/* Wallet Connection */}
            {!address ? (
              <ConnectWalletButton connectWallet={connectWallet} />
            ) : (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/30 transition-colors"
                >
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {formatAddress(address)}
                  </span>
                  <FaChevronDown className={`h-3 w-3 text-emerald-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setDropdownOpen(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        role="menuitem"
                      >
                        <FaSignOutAlt className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Private Message Drawer */}
      {/* <PrivateMessageDrawer 
        isOpen={messageDrawerOpen} 
        onClose={() => setMessageDrawerOpen(false)} 
      /> */}
    </nav>
  );
};

export default Navbar;
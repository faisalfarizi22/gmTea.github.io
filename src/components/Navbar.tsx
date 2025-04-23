// components/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { formatAddress } from '@/utils/web3';
import ThemeToggle from './ThemeToggle';
import { FaLeaf, FaWallet, FaExchangeAlt, FaSignOutAlt, FaChevronDown, FaComments, FaEnvelope } from 'react-icons/fa';
import ConnectWalletButton from './ConnectWalletButton';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  console.log("Navbar - address:", address, "isConnected:", !!address);

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
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Forum (coming soon) */}
            <div className="relative group">
              <button disabled className="p-2 rounded-lg cursor-not-allowed">
                <FaComments className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </button>
              <div className="absolute top-full mb-2 w-56 p-2 text-xs text-white text-center bg-emerald-600/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <strong>Forum (Coming Soon):</strong> 
                <p> You can create discussion forums and interact with the community.</p>
              </div>
            </div>

            {/* Messages (coming soon) */}
            <div className="relative group">
              <button disabled className="p-2 rounded-lg cursor-not-allowed">
                <FaEnvelope className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </button>
              <div className="absolute top-full mb-2 w-48 p-2 text-xs text-white text-center bg-emerald-600/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <strong>Messages (Coming Soon):</strong>
                <p> You will be able to send private messages to others.</p>
              </div>
            </div>

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
    </nav>
  );
};

export default Navbar;

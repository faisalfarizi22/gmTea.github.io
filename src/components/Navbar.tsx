import React, { useState, useRef, useEffect } from 'react';
import { formatAddress } from '@/utils/web3';
import ThemeToggle from './ThemeToggle';
import { FaLeaf, FaWallet, FaExchangeAlt, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';

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

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
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
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />
            
            {/* Wallet Connection */}
            {!address ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary glow-effect group"
              >
                <FaWallet className={`mr-2 transition-all duration-300 ${isConnecting ? 'animate-spin' : 'group-hover:rotate-12'}`} />
                <span>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </span>
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-gray-600 shadow-sm hover:shadow transition-all duration-300 text-emerald-700 dark:text-emerald-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-medium">{formatAddress(address)}</span>
                  </div>
                  <FaChevronDown className={`transition-transform duration-300 text-sm ${dropdownOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-emerald-100 dark:ring-gray-700 overflow-hidden z-20 border border-emerald-50 dark:border-gray-700 backdrop-blur-lg">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button
                        onClick={() => {
                          connectWallet();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                      >
                        <FaExchangeAlt className="mr-3 text-emerald-500" />
                        <span>Change Wallet</span>
                      </button>
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                      >
                        <FaSignOutAlt className="mr-3 text-emerald-500" />
                        <span>Disconnect Wallet</span>
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
import React, { useState, useRef, useEffect } from 'react';
import { formatAddress } from '@/utils/web3';
import ThemeToggle from './ThemeToggle';
import Link from 'next/link';
import { 
  FaLeaf, 
  FaWallet, 
  FaSignOutAlt, 
  FaChevronDown, 
  FaComments, 
  FaEnvelope,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import ConnectWalletButton from './ConnectWalletButton';

interface NavbarProps {
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  openForum?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  address, 
  connectWallet, 
  disconnectWallet,
  isConnecting,
  openForum
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
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
      
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when screen size increases
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tooltip toggle functions
  const showComingSoonTooltip = (feature: string) => {
    setShowTooltip(feature);
  };

  const hideTooltip = () => {
    setShowTooltip(null);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-10 transition-all duration-500 ${
      scrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="relative">
                <FaLeaf className="h-6 w-6 md:h-8 md:w-8 text-emerald-500" />
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
              </div>
              <span className="ml-2 text-lg md:text-xl font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                GM <span className="text-emerald-500">TEA</span>
                <span className="absolute top-5 md:top-6 ml-1 text-gray-500 dark:text-gray-300 text-xs font-medium bg-emerald-100/50 dark:bg-emerald-50/10 px-1 py-0.5 rounded-md align-middle shadow-sm">
                Testnet
                </span>
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Forum Button - Coming Soon */}
            {address && (
              <div className="relative">
                <button 
                  className="p-2 rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed transition-colors"
                  onMouseEnter={() => showComingSoonTooltip('forum')}
                  onMouseLeave={hideTooltip}
                >
                  <FaComments className="h-5 w-5" />
                </button>
                {showTooltip === 'forum' && (
                  <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap">
                    Coming Soon
                  </div>
                )}
              </div>
            )}

            {/* Messages - Coming Soon */}
            {address && (
              <div className="relative">
                <button 
                  className="p-2 rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed transition-colors"
                  onMouseEnter={() => showComingSoonTooltip('messages')}
                  onMouseLeave={hideTooltip}
                >
                  <FaEnvelope className="h-5 w-5" />
                </button>
                {showTooltip === 'messages' && (
                  <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap">
                    Coming Soon
                  </div>
                )}
              </div>
            )} 

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
          
          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <FaTimes className="block h-5 w-5" aria-hidden="true" />
              ) : (
                <FaBars className="block h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div 
        ref={mobileMenuRef}
        className={`fixed inset-0 top-16 bg-white dark:bg-gray-900 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-4 pt-4 pb-6 space-y-6">
          <div className="flex flex-col space-y-4">
            {/* Show address or connect button */}
            {!address ? (
              <div className="px-2 py-2">
                <ConnectWalletButton connectWallet={connectWallet} />
              </div>
            ) : (
              <div className="px-2 py-2 flex flex-col space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      {formatAddress(address)}
                    </span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="ml-4 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FaSignOutAlt className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Mobile Menu Items - Coming Soon */}
                <div className="grid grid-cols-1 gap-2">
                  {/* Forum Button - Coming Soon */}
                  <div className="flex items-center justify-between space-x-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <div className="flex items-center space-x-3">
                      <FaComments className="h-5 w-5" />
                      <span className="font-medium">Community Forum</span>
                    </div>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Coming Soon</span>
                  </div>
                  
                  {/* Messages - Coming Soon */}
                  <div className="flex items-center justify-between space-x-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <div className="flex items-center space-x-3">
                      <FaEnvelope className="h-5 w-5" />
                      <span className="font-medium">Messages</span>
                    </div>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Coming Soon</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
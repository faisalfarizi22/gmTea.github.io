import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  FaLeaf, 
  FaTwitter, 
  FaDiscord, 
  FaGlobe, 
  FaEnvelope, 
  FaArrowRight, 
  FaChevronDown, 
  FaChevronUp, 
  FaFlask,
  FaGithub,
  FaRocket,
  FaUsers
} from 'react-icons/fa';
import { 
  CONTRACT_ADDRESS, 
  USERNAME_REGISTRY_ADDRESS, 
  REFERRAL_CONTRACT_ADDRESS, 
  BADGE_CONTRACT_ADDRESS, 
  MESSAGE_CONTRACT_ADDRESS,
  TEA_SEPOLIA_CHAIN
} from '@/utils/constants';

interface FooterProps {
  scrollToLeaderboard?: () => void;
  scrollToMintSection?: () => void;
  activeMenu?: string;
}

const Footer: React.FC<FooterProps> = ({ 
  scrollToLeaderboard, 
  scrollToMintSection,
  activeMenu = "dashboard" 
}) => {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  // Handle navigation
  const handleNav = (menu: string) => {
    if (menu === "dashboard") {
      // If already on home page, scroll to top smoothly
      if (router.pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Navigate to home page and then scroll to top
        router.push("/").then(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    } else if (menu === "leaderboard") {
      // Navigate to home if not there, then scroll to leaderboard
      if (router.pathname !== "/") {
        router.push("/").then(() => {
          if (scrollToLeaderboard) {
            setTimeout(() => {
              scrollToLeaderboard();
            }, 500); // Increased timeout for better reliability
          } else {
            // Fallback ke implementasi lokal jika prop tidak tersedia
            setTimeout(() => {
              scrollToLeaderboardSection();
            }, 500);
          }
        });
      } else if (scrollToLeaderboard) {
        // If already on home page, scroll directly to leaderboard
        scrollToLeaderboard();
      } else {
        // Fallback ke implementasi lokal jika prop tidak tersedia
        scrollToLeaderboardSection();
      }
    } else if (menu === "profile") {
      // Navigate to profile page
      router.push("/profile");
    } else if (menu === "mint") {
      // If on home page, scroll to mint section with smooth behavior
      if (router.pathname === "/") {
        // Use the scrollToMintSection function as the primary method
        if (scrollToMintSection) {
          scrollToMintSection();
        } else {
          // Fallback to direct element selection if function not available
          scrollToBadgeSection();
        }
      } else {
        // Navigate to home page then scroll to mint section
        router.push("/").then(() => {
          // Use a longer timeout to ensure the page is fully loaded
          setTimeout(() => {
            if (scrollToMintSection) {
              scrollToMintSection();
            } else {
              // Fallback to direct element selection
              scrollToBadgeSection();
            }
          }, 600); // Increased timeout for more reliable scrolling after navigation
        });
      }
    }
  };

  const scrollToBadgeSection = () => {
    let headingElement = Array.from(document.querySelectorAll('h2, h3, h4'))
      .find(el => el.textContent?.includes('Digital Badge Collection'));
    
    let badgeSection: Element | null = null;
    
    if (headingElement) {
      const closestDiv = headingElement.closest('div');
      if (closestDiv) {
        badgeSection = closestDiv;
      }
    }
    if (!badgeSection) {
      badgeSection = document.querySelector('.badge-mint-section') || 
                      document.querySelector('[data-section="badge-mint"]');
    }
    if (!badgeSection) {
      badgeSection = document.querySelector('div.mb-8.mt-8:has(.text-emerald-500)');
    }
    if (!badgeSection) {
      badgeSection = document.querySelector('div:has(h2):has(.text-emerald-500)');
    }

    if (badgeSection) {
      const navbarHeight = 80; // Approximate height of navbar
      const badgeSectionPosition = badgeSection.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
      
      window.scrollTo({
        top: badgeSectionPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollToLeaderboardSection = () => {
    let headingElement = Array.from(document.querySelectorAll('h2, h3, h4'))
      .find(el => el.textContent?.includes('Leaderboard') || el.textContent?.includes('Top Users'));
    
    let leaderboardSection: Element | null = null;
    
    if (headingElement) {
      const closestDiv = headingElement.closest('div');
      if (closestDiv) {
        leaderboardSection = closestDiv;
      }
    }
    
    if (!leaderboardSection) {
      leaderboardSection = document.querySelector('.leaderboard-section') || 
                          document.querySelector('[data-section="leaderboard"]');
    }
    
    if (!leaderboardSection) {
      leaderboardSection = document.querySelector('table.leaderboard') ||
                          document.querySelector('.leaderboard-table') ||
                          document.querySelector('.ranking-table');
    }
    
    if (!leaderboardSection) {
      leaderboardSection = document.querySelector('div:has(table):has(th)');
    }
  
    if (leaderboardSection) {
      const navbarHeight = 80; // Approximate height of navbar
      const leaderboardPosition = leaderboardSection.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
      
      window.scrollTo({
        top: leaderboardPosition,
        behavior: 'smooth'
      });
    }
  };

  // Contract information for Tea Protocol
  const contracts = [
    {
      id: 'main',
      name: 'Main Contract',
      icon: <FaLeaf />,
      address: CONTRACT_ADDRESS,
    },
    {
      id: 'username',
      name: 'Username Registry',
      icon: <FaUsers />,
      address: USERNAME_REGISTRY_ADDRESS,
    },
    {
      id: 'referral',
      name: 'Referral System',
      icon: <FaRocket />,
      address: REFERRAL_CONTRACT_ADDRESS,
    },
    {
      id: 'badge',
      name: 'Badge NFT',
      icon: <FaFlask />,
      address: BADGE_CONTRACT_ADDRESS,
    },
    {
      id: 'message',
      name: 'Message System',
      icon: <FaEnvelope />,
      address: MESSAGE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    }
  ];

  return (
    <footer className="relative bg-gradient-to-b from-emerald-900/90 to-black overflow-hidden py-16">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 pointer-events-none"></div>
      
      {/* Glowing elements */}
      <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-40 left-20 w-80 h-80 rounded-full bg-emerald-600/10 blur-xl animate-pulse pointer-events-none"></div>
      
      {/* Footer top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
      <div className="absolute top-1 left-0 w-full h-px bg-emerald-400/20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-white/90">
          {/* Logo and main info section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="relative">
                <FaLeaf className="h-8 w-8 text-emerald-500" />
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
              </div>
              <span className="ml-2 text-xl font-bold text-emerald-300 tracking-tight">
                GM <span className="text-emerald-500">TEA</span>
              </span>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed">
              GMTea is an advanced on-chain platform that transforms blockchain interactions through innovative daily engagement protocols ensuring secure and seamless user experiences.
            </p>
            
            <div className="pt-2">
              <h4 className="text-emerald-400 font-medium mb-3">Why GMTea?</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                  <span>OnChain & Optimized</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                  <span>Scalable Architecture</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                  <span>Growing Community</span>
                </li>
              </ul>
            </div>
            
            <div className="flex space-x-4 pt-2">
              <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                <FaTwitter className="transform group-hover:-translate-y-1 transition-transform duration-300" />
              </div>
              <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                <FaDiscord className="transform group-hover:-translate-y-1 transition-transform duration-300" />
              </div>
              <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                <FaGlobe className="transform group-hover:-translate-y-1 transition-transform duration-300" />
              </div>
              <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                <FaGithub className="transform group-hover:-translate-y-1 transition-transform duration-300" />
              </div>
              <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                <FaEnvelope className="transform group-hover:-translate-y-1 transition-transform duration-300" />
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="lg:ml-auto">
            <h4 className="text-emerald-400 font-semibold mb-6 relative inline-block">
              Navigation
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500/50"></span>
            </h4>
            <ul className="space-y-3">
              {/* Dashboard */}
              <li>
                <button
                  onClick={() => handleNav("dashboard")}
                  className={`relative  font-medium px-1 transition-colors ${
                    activeMenu === "dashboard"
                      ? "text-emerald-400"
                      : "text-gray-300 hover:text-emerald-300"
                  }`}
                >
                  Dashboard
                </button>
              </li>
              
              {/* Mint */}
              <li>
                <button
                  onClick={() => handleNav("mint")}
                  className={`relative text-md font-medium px-1 transition-colors ${
                    activeMenu === "mint"
                      ? "text-emerald-400"
                      : "text-gray-300 hover:text-emerald-300"
                  }`}
                >
                  Mint
                </button>
              </li>
              
              {/* Leaderboard */}
              <li>
                <button
                  onClick={() => handleNav("leaderboard")}
                  className={`relative text-md font-medium px-1 transition-colors ${
                    activeMenu === "leaderboard"
                      ? "text-emerald-400"
                      : "text-gray-300 hover:text-emerald-300"
                  }`}
                >
                  Leaderboard
                </button>
              </li>

              {/* Deploy */}
              <li>
              <button className={`relative text-sm font-medium px-1 py-2 transition-colors ${
                    activeMenu === "leaderboard"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400"
                  }`}
                >
                  Deploy
                </button>
              </li>
              
              {/* Profile */}
              <li>
                <button
                  onClick={() => handleNav("profile")}
                  className={`relative text-md font-medium px-1 transition-colors ${
                    activeMenu === "profile"
                      ? "text-emerald-400"
                      : "text-gray-300 hover:text-emerald-300"
                  }`}
                >
                  Profile
                  {activeMenu === "profile" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></span>
                  )}
                </button>
              </li>
              
              {/* Referrals -> Redirect to Profile */}
              <li>
                <button
                  onClick={() => handleNav("profile")}
                  className="relative text-dm font-medium px-1 transition-colors text-gray-300 hover:text-emerald-300"
                >
                  Referrals
                </button>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="lg:ml-auto">
            <h4 className="text-emerald-400 font-semibold mb-6 relative inline-block">
              Resources
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500/50"></span>
            </h4>
            <ul className="space-y-3">
              <li>
                <div className="text-gray-300 hover:text-emerald-300 transition-colors group flex items-center cursor-pointer">
                  <span className="group-hover:text-emerald-300 transition-all duration-300">Documentation</span>
                  <div className="ml-2 w-0 group-hover:w-5 h-px bg-emerald-500 transition-all duration-300"></div>
                  <FaArrowRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs" />
                </div>
              </li>
              <li>
                <div className="text-gray-300 hover:text-emerald-300 transition-colors group flex items-center cursor-pointer">
                  <span className="group-hover:text-emerald-300 transition-all duration-300">Whitepaper</span>
                  <div className="ml-2 w-0 group-hover:w-5 h-px bg-emerald-500 transition-all duration-300"></div>
                  <FaArrowRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs" />
                </div>
              </li>
              <li>
                <div className="text-gray-300 hover:text-emerald-300 transition-colors group flex items-center cursor-pointer">
                  <span className="group-hover:text-emerald-300 transition-all duration-300">Blog</span>
                  <div className="ml-2 w-0 group-hover:w-5 h-px bg-emerald-500 transition-all duration-300"></div>
                  <FaArrowRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs" />
                </div>
              </li>
              <li>
                <div className="text-gray-300 hover:text-emerald-300 transition-colors group flex items-center cursor-pointer">
                  <span className="group-hover:text-emerald-300 transition-all duration-300">FAQ</span>
                  <div className="ml-2 w-0 group-hover:w-5 h-px bg-emerald-500 transition-all duration-300"></div>
                  <FaArrowRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs" />
                </div>
              </li>
              <li>
                <div className="text-gray-300 hover:text-emerald-300 transition-colors group flex items-center cursor-pointer">
                  <span className="group-hover:text-emerald-300 transition-all duration-300">Events</span>
                  <div className="ml-2 w-0 group-hover:w-5 h-px bg-emerald-500 transition-all duration-300"></div>
                  <FaArrowRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs" />
                </div>
              </li>
            </ul>
          </div>
          
          {/* Contracts Section */}
          <div>
            <h4 className="text-emerald-400 font-semibold mb-6 relative inline-block">
              Tea Protocol Contracts
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500/50"></span>
            </h4>
            <div className="space-y-4">
              {expandedSection === 'contracts' ? (
                <div className="bg-emerald-900/40 rounded-lg border border-emerald-700/30 backdrop-blur-sm shadow-lg p-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('contracts')}
                  >
                    <div className="flex items-center gap-2">
                      <FaLeaf className="text-emerald-400" />
                      <div>
                        <span className="text-emerald-300 font-medium">Tea Protocol</span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Testnet</span>
                      </div>
                    </div>
                    <FaChevronUp className="text-emerald-400" />
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="bg-emerald-900/40 p-3 rounded border border-emerald-700/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-emerald-400">{contract.icon}</div>
                          <span className="text-sm text-gray-300">{contract.name}</span>
                        </div>
                        <div 
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(contract.address);
                            alert("Contract address copied to clipboard!");
                          }}
                        >
                          {contract.address.substring(0, 6)}...{contract.address.substring(contract.address.length - 4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div 
                  className="bg-emerald-900/40 rounded-lg border border-emerald-700/30 backdrop-blur-sm shadow-lg p-4 cursor-pointer hover:bg-emerald-800/30 transition-colors"
                  onClick={() => toggleSection('contracts')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaLeaf className="text-emerald-400" />
                      <div>
                        <span className="text-emerald-300 font-medium">Tea Protocol</span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Testnet</span>
                      </div>
                    </div>
                    <FaChevronDown className="text-emerald-400" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contracts.slice(0, 3).map((contract) => (
                      <div key={contract.id} className="bg-emerald-900/60 px-2 py-1 rounded border border-emerald-700/20 text-xs text-gray-300 flex items-center gap-1">
                        <div className="text-emerald-400">{contract.icon}</div>
                        {contract.name}
                      </div>
                    ))}
                    {contracts.length > 3 && (
                      <div className="bg-emerald-900/60 px-2 py-1 rounded border border-emerald-700/20 text-xs text-gray-300">
                        +{contracts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-emerald-900/40 rounded-lg border border-emerald-700/30 backdrop-blur-sm shadow-lg p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('community')}
                >
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-emerald-400" />
                    <span className="text-emerald-300 font-medium">Community Stats</span>
                  </div>
                  {expandedSection === 'community' ? (
                    <FaChevronUp className="text-emerald-400" />
                  ) : (
                    <FaChevronDown className="text-emerald-400" />
                  )}
                </div>
                
                {expandedSection === 'community' && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-emerald-900/40 p-3 rounded border border-emerald-700/20">
                      <div className="text-gray-300 text-sm flex justify-between">
                        <span>Total Users</span>
                        <span className="text-emerald-300 font-medium">12,450+</span>
                      </div>
                    </div>
                    <div className="bg-emerald-900/40 p-3 rounded border border-emerald-700/20">
                      <div className="text-gray-300 text-sm flex justify-between">
                        <span>Daily Active Users</span>
                        <span className="text-emerald-300 font-medium">3,200+</span>
                      </div>
                    </div>
                    <div className="bg-emerald-900/40 p-3 rounded border border-emerald-700/20">
                      <div className="text-gray-300 text-sm flex justify-between">
                        <span>Total Transactions</span>
                        <span className="text-emerald-300 font-medium">1.2M+</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Bottom Section */}
        <div className="mt-16 relative">
          {/* Futuristic glowing separator with moving light effect */}
          <div className="flex-1 relative h-px w-full mb-8">
            {/* Base gradient line */}
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-70"></div>
            
            {/* Moving light effect - persis seperti contoh */}
            <div 
              className="absolute top-0 h-px w-20 animate-gradient-x" 
              style={{
                boxShadow: '0 0 8px 1px rgba(16, 185, 129, 0.6)',
                background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent)'
              }}
            >
            </div>
          </div>
          
          {/* Footer content grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-4">
            {/* Left - Logo and social */}
            <div className="flex flex-col items-center md:items-start space-y-3">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <FaLeaf className="h-5 w-5 text-emerald-500" />
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
                </div>
                <span className="text-emerald-400 font-semibold tracking-wide text-lg">
                  GM <span className="text-emerald-500">TEA</span>
                </span>
              </div>
      
            {/* Social icons with subtle hover effect */}
            <div className="flex space-x-3">
                <div className="w-7 h-7 rounded-full bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-800/30 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-all duration-300 cursor-pointer group">
                  <div className="transform group-hover:-translate-y-0.5 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M19.633 7.997c.013.175.013.349.013.523 0 5.325-4.053 11.461-11.46 11.461-2.282 0-4.402-.661-6.186-1.809.324.037.636.05.973.05a8.07 8.07 0 0 0 5.001-1.721 4.036 4.036 0 0 1-3.767-2.793c.249.037.499.062.761.062.361 0 .724-.05 1.061-.137a4.027 4.027 0 0 1-3.23-3.953v-.05c.537.299 1.16.486 1.82.511a4.022 4.022 0 0 1-1.796-3.354c0-.748.199-1.434.548-2.032a11.457 11.457 0 0 0 8.306 4.215c-.062-.3-.1-.599-.1-.899a4.026 4.026 0 0 1 4.028-4.028c1.16 0 2.207.486 2.943 1.272a7.957 7.957 0 0 0 2.556-.973 4.02 4.02 0 0 1-1.771 2.22 8.073 8.073 0 0 0 2.319-.624 8.645 8.645 0 0 1-2.019 2.083z"></path>
                    </svg>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-800/30 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-all duration-300 cursor-pointer group">
                  <div className="transform group-hover:-translate-y-0.5 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M14.82 4.26a10.14 10.14 0 0 0-.53 1.1 14.66 14.66 0 0 0-4.58 0 10.14 10.14 0 0 0-.53-1.1 16 16 0 0 0-4.13 1.3 17.33 17.33 0 0 0-3 11.59 16.6 16.6 0 0 0 5.07 2.59A12.89 12.89 0 0 0 8.23 18a9.65 9.65 0 0 1-1.71-.83 3.39 3.39 0 0 0 .42-.33 11.66 11.66 0 0 0 10.12 0q.21.18.42.33a10.84 10.84 0 0 1-1.71.84 12.41 12.41 0 0 0 1.08 1.78 16.44 16.44 0 0 0 5.06-2.59 17.22 17.22 0 0 0-3-11.59 16.09 16.09 0 0 0-4.09-1.35zM8.68 14.81a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.93 1.93 0 0 1 1.8 2 1.93 1.93 0 0 1-1.8 2zm6.64 0a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.92 1.92 0 0 1 1.8 2 1.92 1.92 0 0 1-1.8 2z"></path>
                    </svg>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-800/30 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-all duration-300 cursor-pointer group">
                  <div className="transform group-hover:-translate-y-0.5 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Middle - Copyright with animated accent */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="text-gray-400 text-sm">© 2025 GM TEA. All rights reserved.</div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-px bg-emerald-400 animate-pulse-width"></div>
              </div>
              
              {/* Testnet badge */}
              <div className="mt-2 px-2 py-0.5 rounded-full bg-emerald-900/30 border border-emerald-700/20 text-emerald-400 text-xs font-medium">
                Tea Protocol Testnet
              </div>
            </div>
            
            {/* Right - links with hover effects */}
            <div className="flex justify-center md:justify-end gap-6">
              <div className="text-gray-400 hover:text-emerald-300 text-sm transition-colors cursor-pointer relative group">
                Terms
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </div>
              <div className="text-gray-400 hover:text-emerald-300 text-sm transition-colors cursor-pointer relative group">
                Privacy
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </div>
              <div className="text-gray-400 hover:text-emerald-300 text-sm transition-colors cursor-pointer relative group">
                Support
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
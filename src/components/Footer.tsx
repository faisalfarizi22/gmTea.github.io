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
  FaUsers,
  FaYoutube,
  FaTelegram
} from 'react-icons/fa';
import { IoIosStats } from "react-icons/io";
import { TfiStatsUp } from "react-icons/tfi";
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

  const handleNav = (menu: string) => {
    if (menu === "dashboard") {
      if (router.pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push("/").then(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    } else if (menu === "leaderboard") {
      if (router.pathname !== "/") {
        router.push("/").then(() => {
          if (scrollToLeaderboard) {
            setTimeout(() => {
              scrollToLeaderboard();
            }, 500);
          } else {
            setTimeout(() => {
              scrollToLeaderboardSection();
            }, 500);
          }
        });
      } else if (scrollToLeaderboard) {
        scrollToLeaderboard();
      } else {
        scrollToLeaderboardSection();
      }
    } else if (menu === "profile") {
      router.push("/profile");
    } else if (menu === "mint") {
      if (router.pathname === "/") {
        if (scrollToMintSection) {
          scrollToMintSection();
        } else {
          scrollToBadgeSection();
        }
      } else {
        router.push("/").then(() => {
          setTimeout(() => {
            if (scrollToMintSection) {
              scrollToMintSection();
            } else {
              scrollToBadgeSection();
            }
          }, 600);
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
      const navbarHeight = 80;
      const badgeSectionPosition = badgeSection.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
      
      window.scrollTo({
        top: badgeSectionPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleReferralNavigation = () => {
    if (router.pathname !== "/profile") {
      router.push("/profile").then(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("navigate", { 
            detail: { 
              tab: "profile", 
              subtab: "referrals" 
            } 
          }));
        }, 300);
      });
    } else {
      window.dispatchEvent(new CustomEvent("navigate", { 
        detail: { 
          tab: "profile", 
          subtab: "referrals" 
        } 
      }));
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
      const navbarHeight = 80;
      const leaderboardPosition = leaderboardSection.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
      
      window.scrollTo({
        top: leaderboardPosition,
        behavior: 'smooth'
      });
    }
  };

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
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 pointer-events-none"></div>
      
      <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-40 left-20 w-80 h-80 rounded-full bg-emerald-600/10 blur-xl animate-pulse pointer-events-none"></div>
      
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
      <div className="absolute top-1 left-0 w-full h-px bg-emerald-400/20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-white/90">
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
              <Link href="https://x.com/multichain_gm" target="_blank" rel="noopener noreferrer">
                <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                  <FaTwitter className="transform group-hover:-translate-y-1 transition-transform duration-300" />
                </div>
              </Link>
                <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                  <FaDiscord className="transform group-hover:-translate-y-1 transition-transform duration-300" />
                </div>
                <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                  <FaTelegram className="transform group-hover:-translate-y-1 transition-transform duration-300" />
                </div>
              <Link href="https://youtube.com/@multichaingm?si=nc7TYJx_APQiTDXA" target="_blank" rel="noopener noreferrer">
                <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                  <FaYoutube className="transform group-hover:-translate-y-1 transition-transform duration-300" />
                </div>
              </Link>
              <Link href="mailto:David-dvd@multichaingm.com" target="_blank" rel="noopener noreferrer">
                <div className="group bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border border-emerald-700/30 cursor-pointer">
                  <FaEnvelope className="transform group-hover:-translate-y-1 transition-transform duration-300" />
                </div>
              </Link>
            </div>
          </div>
          
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
            </div>
          </div>
          
          <div>
            <h4 className="text-emerald-400 font-semibold mb-6 relative inline-block">
              Community Stats
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500/50"></span>
            </h4>
            <div className="bg-emerald-900/40 rounded-lg border border-emerald-700/30 backdrop-blur-sm shadow-lg p-4">
                <div className="flex items-center gap-2">
                  <TfiStatsUp className="text-emerald-400" />
                  <span className="text-emerald-300 font-medium">Platform Statistics</span>
                </div>
             
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="bg-emerald-900/60 px-2 py-1 rounded border border-emerald-700/20 text-xs text-gray-300 flex items-center gap-1">
                    <div className="text-emerald-400"><FaUsers className="h-3 w-3" /></div>
                    1,850+ Users
                  </div>
                  <div className="bg-emerald-900/60 px-2 py-1 rounded border border-emerald-700/20 text-xs text-gray-300 flex items-center gap-1">
                    <div className="text-emerald-400"><FaRocket className="h-3 w-3" /></div>
                    400+ Daily Active
                  </div>
                  <div className="bg-emerald-900/60 px-2 py-1 rounded border border-emerald-700/20 text-xs text-gray-300 flex items-center gap-1">
                    <div className="text-emerald-400"><IoIosStats className="h-3 w-3" /></div>
                    15K+ Transactions
                  </div>
                </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 relative">
          <div className="flex-1 relative h-px w-full mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-70"></div>
            
            <div 
              className="absolute top-0 h-px w-20 animate-gradient-x" 
              style={{
                boxShadow: '0 0 8px 1px rgba(16, 185, 129, 0.6)',
                background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent)'
              }}
            >
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-4">
            <div className="flex flex-col items-center md:items-start space-y-3">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <FaLeaf className="h-8 w-8 text-emerald-500 mr-2" />
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
                </div>
                <span className="text-emerald-400 font-semibold tracking-wide text-2xl">
                  GM <span className="text-emerald-500">TEA</span>
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="text-gray-400 text-sm">© 2025 GM TEA. All rights reserved.</div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-px bg-emerald-400 animate-pulse-width"></div>
              </div>
              
              <div className="mt-2 px-2 py-0.5 rounded-full bg-emerald-900/30 border border-emerald-700/20 text-emerald-400 text-xs font-medium">
                Tea Protocol Testnet
              </div>
            </div>
            
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